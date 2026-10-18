import { faker } from "@faker-js/faker";
import { AdminRole, OrderStatus, UserRole } from "@tranche/shared";
import { runSeeders } from "@/database/seeders/seed-runner";
import { AdminSeeder } from "@/database/seeders/admin.seeder";
import { PlatformSettingSeeder, PLATFORM_SETTINGS_KEY } from "@/database/seeders/platform-setting.seeder";
import { DEMO_PASSWORD, SEED_EMAIL_DOMAIN } from "@/database/seeders/user.seeder";
import {
  AuditLog,
  DeviceToken,
  Installment,
  LedgerAccount,
  LedgerEntry,
  Merchant,
  Notification,
  Order,
  Payment,
  PaymentMethod,
  Payout,
  PlatformSetting,
  Product,
  User,
  WebhookEvent,
} from "@/database/entities";
import { api, dataSource, start, stop } from "./harness";

beforeAll(async () => {
  await start();
  faker.seed(42);
});
afterAll(stop);

it("admin seeder creates super admins once and promotes existing users", async () => {
  const users = dataSource.getRepository(User);
  await users.save(
    users.create({
      email: "later@example.com",
      passwordHash: "x",
      firstName: "Later",
      lastName: "User",
      role: UserRole.CUSTOMER,
    }),
  );
  const seeder = new AdminSeeder(["Owner@Example.com", "later@example.com"], "Password123");
  await seeder.run(dataSource);
  await seeder.run(dataSource);

  expect(await users.findOneByOrFail({ email: "owner@example.com" })).toMatchObject({
    role: UserRole.ADMIN,
    adminRole: AdminRole.SUPER_ADMIN,
  });
  expect(await users.findOneByOrFail({ email: "later@example.com" })).toMatchObject({ adminRole: AdminRole.SUPER_ADMIN });
  expect(await users.count({ where: { email: "owner@example.com" } })).toBe(1);
});

it("platform settings are created once and never overwrite an admin change", async () => {
  const repo = dataSource.getRepository(PlatformSetting);
  await new PlatformSettingSeeder().run(dataSource);
  const row = await repo.findOneByOrFail({ key: PLATFORM_SETTINGS_KEY });
  await repo.update(row.id, { value: { ...(row.value as object), graceDays: 9 } });
  await new PlatformSettingSeeder().run(dataSource);
  expect(await repo.count()).toBe(1);
  expect((await repo.findOneByOrFail({ key: PLATFORM_SETTINGS_KEY })).value).toMatchObject({ graceDays: 9 });
});

it("without fake data only settings, ledger accounts and admins are seeded", async () => {
  await runSeeders(dataSource, { fake: false });
  const fakeUsers = await dataSource
    .getRepository(User)
    .createQueryBuilder("u")
    .where("u.email LIKE :p", { p: `%@${SEED_EMAIL_DOMAIN}` })
    .getCount();
  expect(fakeUsers).toBe(0);
  expect(await dataSource.getRepository(LedgerAccount).count()).toBe(3);
});

it("fake data fills every table", async () => {
  await runSeeders(dataSource, { fake: true });
  for (const entity of [
    User,
    Merchant,
    Product,
    PaymentMethod,
    DeviceToken,
    Order,
    Installment,
    Payment,
    Payout,
    LedgerEntry,
    WebhookEvent,
    Notification,
    AuditLog,
  ]) {
    expect(await dataSource.getRepository(entity).count()).toBeGreaterThan(0);
  }
  const statuses = (await dataSource.getRepository(Order).find()).map((o) => o.status);
  expect(statuses).toEqual(expect.arrayContaining([OrderStatus.ACTIVE, OrderStatus.COMPLETED]));
});

it("seeded books balance and no cached balance drifts", async () => {
  const [row] = await dataSource.query(`
    SELECT SUM(CASE WHEN direction = 'debit' THEN amount_kobo ELSE 0 END)::bigint AS d,
           SUM(CASE WHEN direction = 'credit' THEN amount_kobo ELSE 0 END)::bigint AS c
      FROM ledger_entries`);
  expect(row.d).toBe(row.c);
  const drifted = await dataSource.query(`
    SELECT a.code FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_id = a.id
     GROUP BY a.id
    HAVING a.balance_kobo <> COALESCE(SUM(CASE WHEN e.direction = a.normal_balance THEN e.amount_kobo ELSE -e.amount_kobo END), 0)`);
  expect(drifted).toEqual([]);
});

it("seeded data is usable through the real API", async () => {
  const login = async (email: string) =>
    ({ token: (await api(null, "POST", "/auth/login", { email, password: DEMO_PASSWORD })).body.response.accessToken }) as any;

  const shopper = await login("customer@tranche.ng");
  const orders = (await api(shopper, "GET", "/customer/orders")).body.response;
  expect(orders.data.length).toBe(4);
  expect((await api(shopper, "GET", "/customer/summary")).body.response.creditLimitKobo).toBeGreaterThan(0);

  const merchant = await login("merchant@tranche.ng");
  const dashboard = (await api(merchant, "GET", "/merchant/dashboard?days=90")).body.response;
  expect(dashboard.balance.lifetimeGmvKobo).toBeGreaterThan(0);

  const support = await login("support@tranche.ng");
  const trial = (await api(support, "GET", "/admin/ledger/trial-balance")).body.response;
  expect(trial.balanced).toBe(true);
});

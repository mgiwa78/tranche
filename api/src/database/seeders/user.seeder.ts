import { DataSource } from "typeorm";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { AccountStatus, AdminRole, UserRole, toKobo } from "@tranche/shared";
import { User } from "@/database/entities";

export const SEED_EMAIL_DOMAIN = "tranche.test";

/** Password for every seeded login (demo accounts and fake users). */
export const DEMO_PASSWORD = "Tranche123!";

// Hashed once: bcrypt per row would make a seed run take minutes.
let demoHash: string | null = null;
export const demoPasswordHash = () => (demoHash ??= bcrypt.hashSync(DEMO_PASSWORD, 10));

const STAFF: [string, AdminRole][] = [
  ["support@tranche.ng", AdminRole.SUPPORT],
  [`ops@${SEED_EMAIL_DOMAIN}`, AdminRole.ADMIN],
];

/** Active shoppers: the people the order, notification and device seeders build data around. */
export const seededCustomers = (dataSource: DataSource) =>
  dataSource.getRepository(User).find({
    where: { role: UserRole.CUSTOMER, status: AccountStatus.ACTIVE },
    order: { createdAt: "ASC" },
  });

export const seededStaff = (dataSource: DataSource) =>
  dataSource.getRepository(User).find({ where: { role: UserRole.ADMIN } });

export class UserSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    const repo = dataSource.getRepository(User);
    const passwordHash = demoPasswordHash();
    const users: Partial<User>[] = [];

    for (const [email, adminRole] of STAFF) {
      const [firstName, lastName] = [faker.person.firstName(), faker.person.lastName()];
      users.push({
        email,
        passwordHash,
        firstName,
        lastName,
        role: UserRole.ADMIN,
        adminRole,
        status: AccountStatus.ACTIVE,
        creditLimitKobo: 0,
        createdAt: faker.date.past({ years: 1 }),
      });
    }

    // The demo shopper used in the README and the app's "Use demo shopper" button.
    users.push({
      email: "customer@tranche.ng",
      passwordHash,
      firstName: "Ada",
      lastName: "Okafor",
      phone: "+2348012345678",
      role: UserRole.CUSTOMER,
      status: AccountStatus.ACTIVE,
      creditLimitKobo: toKobo(3_000_000),
      createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 160 }) }),
    });

    for (let i = 1; i <= 40; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const suspended = i === 7 || i === 23;
      users.push({
        email: `user${i}@${SEED_EMAIL_DOMAIN}`,
        passwordHash,
        firstName,
        lastName,
        phone: faker.helpers.maybe(() => `+23480${faker.string.numeric(8)}`, { probability: 0.8 }) ?? null,
        role: UserRole.CUSTOMER,
        status: suspended ? AccountStatus.SUSPENDED : AccountStatus.ACTIVE,
        creditLimitKobo: faker.helpers.weightedArrayElement([
          { weight: 6, value: toKobo(500_000) },
          { weight: 3, value: toKobo(1_000_000) },
          { weight: 1, value: toKobo(2_000_000) },
        ]),
        sessionsRevokedAt: suspended ? faker.date.recent({ days: 14 }) : null,
        lastLoginAt: faker.date.recent({ days: 20 }),
        createdAt: faker.date.past({ years: 1, refDate: faker.date.recent({ days: 160 }) }),
      });
    }

    await repo.save(repo.create(users));
  }
}

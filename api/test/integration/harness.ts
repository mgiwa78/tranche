import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import request from "supertest";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { AccountStatus, AdminRole, MerchantStatus, PlanCode, ProductCategory, UserRole } from "@tranche/shared";
import { AppModule } from "@/app.module";
import { configureApp } from "@/app.setup";
import { dataSourceOptions } from "@/config/data-source";
import { JwtService } from "@/common/auth/jwt";
import { RedisClient } from "@/common/redis/client";
import { Merchant, Product, User } from "@/database/entities";
import { PAYMENT_PROVIDER } from "@/core/payments/payment-provider.interface";
import { FakePaymentProvider } from "@/core/payments/fake.provider";
import { PUSH_PROVIDER, RecordingPushProvider } from "@/core/push/expo-push.provider";

export const fake = new FakePaymentProvider();
export const push = new RecordingPushProvider();

let app: INestApplication;
export let dataSource: DataSource;

export interface Actor {
  user: User;
  token: string;
}

/** Fresh schema from the real migrations (so the ledger triggers are present), then a full Nest app. */
export const start = async () => {
  const admin = new DataSource({ ...dataSourceOptions, synchronize: false });
  await admin.initialize();
  await admin.dropDatabase();
  await admin.runMigrations();
  await admin.destroy();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PAYMENT_PROVIDER)
    .useValue(fake)
    .overrideProvider(PUSH_PROVIDER)
    .useValue(push)
    .compile();

  app = moduleRef.createNestApplication({ rawBody: true, logger: false });
  configureApp(app, { logRequests: false });
  await app.init();
  dataSource = app.get(DataSource);
  return app;
};

export const stop = async () => {
  const redis = app.get(RedisClient);
  await redis.deleteByPattern("*").catch(() => undefined);
  await app.close();
};

export const get = <T>(token: any): T => app.get<T>(token, { strict: false });

const sign = (user: User) => get<JwtService>(JwtService).sign({ userId: user.id, role: user.role }, "15m");

const saveUser = async (data: Partial<User>) => {
  const repo = dataSource.getRepository(User);
  const user = await repo.save(
    repo.create({
      email: `${randomUUID().slice(0, 8)}@test.tranche.ng`,
      passwordHash: await bcrypt.hash("Password123", 4),
      firstName: "Test",
      lastName: "User",
      status: AccountStatus.ACTIVE,
      creditLimitKobo: 0,
      ...data,
    }),
  );
  return { user, token: sign(user) };
};

export const makeCustomer = (over: Partial<User> = {}) =>
  saveUser({ role: UserRole.CUSTOMER, creditLimitKobo: 1_000_000_00, firstName: "Chidi", lastName: "Eze", ...over });

export const makeAdmin = (adminRole: AdminRole = AdminRole.SUPER_ADMIN) =>
  saveUser({ role: UserRole.ADMIN, adminRole, firstName: "Staff" });

export const makeMerchant = async (over: Partial<Merchant> = {}) => {
  const repo = dataSource.getRepository(Merchant);
  const merchant = await repo.save(
    repo.create({
      name: `Store ${randomUUID().slice(0, 6)}`,
      slug: `store-${randomUUID().slice(0, 8)}`,
      status: MerchantStatus.ACTIVE,
      feeBps: 500,
      settlementBankCode: "058",
      settlementAccountNumber: "0123456789",
      settlementAccountName: "TEST STORE",
      ...over,
    }),
  );
  const owner = await saveUser({ role: UserRole.MERCHANT, merchantId: merchant.id, firstName: "Owner" });
  await repo.update(merchant.id, { ownerUserId: owner.user.id });
  return { ...owner, merchant };
};

export const makeProduct = async (merchantId: string, over: Partial<Product> = {}) => {
  const repo = dataSource.getRepository(Product);
  return repo.save(
    repo.create({
      merchantId,
      name: "Test product",
      description: "",
      priceKobo: 100_000_00,
      category: ProductCategory.ELECTRONICS,
      stock: 10,
      isActive: true,
      ...over,
    }),
  );
};

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/** `api(actor, "POST", "/customer/checkout", body)` -> `{ status, body }` through Supertest. */
export const api = async (who: Actor | null, method: Method, path: string, body?: unknown) => {
  const server = app.getHttpServer();
  const url = `/api/v1${path}`;
  let req = {
    GET: () => request(server).get(url),
    POST: () => request(server).post(url),
    PATCH: () => request(server).patch(url),
    PUT: () => request(server).put(url),
    DELETE: () => request(server).delete(url),
  }[method]();
  if (who) req = req.set("Authorization", `Bearer ${who.token}`);
  const res = body === undefined ? await req : await req.send(body as object);
  return { status: res.status, body: res.body };
};

export const rawPost = (path: string, raw: string, headers: Record<string, string>) => {
  let req = request(app.getHttpServer()).post(`/api/v1${path}`).set("Content-Type", "application/json");
  for (const [k, v] of Object.entries(headers)) req = req.set(k, v);
  return req.send(raw);
};

/** Checkout through hosted payment, complete it on the fake gateway, verify like the app does. */
export const checkoutAndPay = async (
  customer: Actor,
  productId: string,
  planCode = PlanCode.PAY_IN_4,
  quantity = 1,
) => {
  const checkout = await api(customer, "POST", "/customer/checkout", { items: [{ productId, quantity }], planCode });
  if (checkout.status !== 201) throw new Error(`checkout failed: ${JSON.stringify(checkout.body)}`);
  const reference = checkout.body.response.payment.reference as string;
  fake.complete(reference, true);
  const verify = await api(customer, "GET", `/customer/payments/verify/${reference}`);
  return { checkout: checkout.body.response, verify: verify.body.response, reference };
};

export const trialBalance = async () => {
  const admin = await makeAdmin();
  return (await api(admin, "GET", "/admin/ledger/trial-balance")).body.response;
};

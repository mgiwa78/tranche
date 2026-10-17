import { AccountStatus, MerchantStatus, UserRole } from "@tranche/shared";
import { User } from "@/database/entities";
import { api, dataSource, makeCustomer, start, stop } from "./harness";

const password = "Password123";

beforeAll(start);
afterAll(stop);

describe("auth", () => {
  it("registers a shopper with the default credit limit and returns a session", async () => {
    const res = await api(null, "POST", "/auth/register", {
      firstName: "Ada",
      lastName: "Okafor",
      email: "  ADA@example.com ",
      password,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      message: "Welcome to Tranche",
      response: {
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: { email: "ada@example.com", role: UserRole.CUSTOMER, creditLimitKobo: 500_000_00 },
      },
    });
    const me = await api({ token: res.body.response.accessToken } as any, "GET", "/auth/me");
    expect(me.body.response.email).toBe("ada@example.com");
  });

  it("rejects duplicate emails and invalid input with the shared error envelope", async () => {
    const dup = await api(null, "POST", "/auth/register", {
      firstName: "A",
      lastName: "B",
      email: "ada@example.com",
      password,
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("CONFLICT");

    const bad = await api(null, "POST", "/auth/register", {
      firstName: "",
      lastName: "B",
      email: "nope",
      password: "short",
    });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } });
    expect(bad.body.error.details.map((d: any) => d.path)).toEqual(
      expect.arrayContaining(["firstName", "email", "password"]),
    );
  });

  it("registers a merchant as pending with an owner login", async () => {
    const res = await api(null, "POST", "/auth/register/merchant", {
      firstName: "Bola",
      lastName: "Ade",
      email: "bola@store.ng",
      password,
      businessName: "Bola's Store",
    });
    expect(res.status).toBe(201);
    expect(res.body.response.user).toMatchObject({
      role: UserRole.MERCHANT,
      merchant: { name: "Bola's Store", slug: "bola-s-store", status: MerchantStatus.PENDING },
    });
  });

  it("logs in, rotates refresh tokens and rejects reuse", async () => {
    const wrong = await api(null, "POST", "/auth/login", { email: "ada@example.com", password: "Wrong1234" });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS");

    const login = await api(null, "POST", "/auth/login", { email: "ada@example.com", password });
    expect(login.status).toBe(200);
    const { refreshToken } = login.body.response;

    const rotated = await api(null, "POST", "/auth/refresh", { refreshToken });
    expect(rotated.status).toBe(200);
    expect(rotated.body.response.refreshToken).not.toBe(refreshToken);

    const reused = await api(null, "POST", "/auth/refresh", { refreshToken });
    expect(reused.status).toBe(401);

    // A refresh token is not an access token.
    const misuse = await api({ token: rotated.body.response.refreshToken } as any, "GET", "/auth/me");
    expect(misuse.status).toBe(401);

    await api(null, "POST", "/auth/logout", { refreshToken: rotated.body.response.refreshToken });
    const afterLogout = await api(null, "POST", "/auth/refresh", { refreshToken: rotated.body.response.refreshToken });
    expect(afterLogout.status).toBe(401);
  });

  it("requires a token and blocks suspended users immediately", async () => {
    expect((await api(null, "GET", "/auth/me")).status).toBe(401);
    const shopper = await makeCustomer();
    expect((await api(shopper, "GET", "/auth/me")).status).toBe(200);
    await dataSource.getRepository(User).update(shopper.user.id, { status: AccountStatus.SUSPENDED });
    const blocked = await api(shopper, "GET", "/auth/me");
    expect(blocked.status).toBe(401);
    expect(blocked.body.error.message).toMatch(/suspended/);
  });

  it("changing the password revokes existing sessions", async () => {
    const login = await api(null, "POST", "/auth/login", { email: "ada@example.com", password });
    const session = { token: login.body.response.accessToken } as any;
    const changed = await api(session, "POST", "/auth/change-password", {
      currentPassword: password,
      newPassword: "NewPassword456",
    });
    expect(changed.status).toBe(200);
    expect((await api(session, "GET", "/auth/me")).status).toBe(401);
    expect((await api({ token: changed.body.response.accessToken } as any, "GET", "/auth/me")).status).toBe(200);
  });

  it("serves health and public app config", async () => {
    const health = await api(null, "GET", "/health");
    expect(health.status).toBe(200);
    expect(health.body.status).toBe("healthy");
    const config = await api(null, "GET", "/app-config");
    expect(config.body.response.plans.map((p: any) => p.code)).toEqual(["pay_in_4", "monthly_3", "monthly_6"]);
  });

  it("returns the envelope for unknown routes", async () => {
    const res = await api(null, "GET", "/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
  });
});

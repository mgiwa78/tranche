import { ExecutionContext, HttpException, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { QueryFailedError } from "typeorm";
import { z, ZodError } from "zod";
import { AdminRole, UserRole, loginSchema } from "@tranche/shared";
import { ZodValidationPipe } from "./pipes/zod-validation.pipe";
import { RolesGuard } from "./guards/roles.guard";
import { AllExceptionsFilter } from "./errors/all-exceptions.filter";
import { ForbiddenError, NotFoundError, ValidationError } from "./errors";
import { ADMIN_ROLE_KEY, IS_PUBLIC_KEY, ROLES_KEY } from "./decorators";
import { createReference, decryptSecret, encryptSecret, randomCode } from "./crypto";
import { durationToSeconds } from "./helpers/duration";
import { buildListFilter, buildMeta } from "./helpers/list-filter";
import { getFilterOptions } from "./types";
import { todayIso } from "./helpers/dates";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(loginSchema);

  it("returns parsed, normalised data", () => {
    expect(pipe.transform({ email: " A@B.CO ", password: "x" })).toEqual({ email: "a@b.co", password: "x" });
  });

  it("throws a ValidationError with one entry per issue", () => {
    try {
      pipe.transform({ email: "nope" });
      fail("expected to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details).toEqual([
        { path: "email", message: "Enter a valid email address" },
        { path: "password", message: expect.any(String) },
      ]);
    }
  });

  it("treats a missing body as an empty object", () => {
    expect(new ZodValidationPipe(z.object({ a: z.string().default("x") })).transform(undefined)).toEqual({ a: "x" });
  });
});

const contextFor = (user: unknown, meta: Record<string, unknown>) => {
  const reflector = { getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector;
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), ctx };
};

describe("RolesGuard", () => {
  const customer = { role: UserRole.CUSTOMER };
  const support = { role: UserRole.ADMIN, adminRole: AdminRole.SUPPORT };
  const superAdmin = { role: UserRole.ADMIN, adminRole: AdminRole.SUPER_ADMIN };

  it("allows routes with no role metadata and public routes", () => {
    expect(contextFor(customer, {}).guard.canActivate(contextFor(customer, {}).ctx)).toBe(true);
    const { guard, ctx } = contextFor(undefined, { [IS_PUBLIC_KEY]: true, [ROLES_KEY]: [UserRole.ADMIN] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("rejects the wrong role", () => {
    const { guard, ctx } = contextFor(customer, { [ROLES_KEY]: [UserRole.MERCHANT] });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenError);
  });

  it("applies the staff hierarchy", () => {
    const meta = { [ROLES_KEY]: [UserRole.ADMIN], [ADMIN_ROLE_KEY]: AdminRole.ADMIN };
    expect(() => contextFor(support, meta).guard.canActivate(contextFor(support, meta).ctx)).toThrow(ForbiddenError);
    expect(contextFor(superAdmin, meta).guard.canActivate(contextFor(superAdmin, meta).ctx)).toBe(true);
  });
});

describe("AllExceptionsFilter", () => {
  const run = (error: unknown) => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), headersSent: false };
    const req = {
      path: "/x",
      method: "GET",
      get: () => undefined,
      body: { password: "secret" },
      query: {},
      params: {},
    };
    const host = { switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }) } as any;
    new AllExceptionsFilter().catch(error, host);
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
  };

  it("maps AppErrors to their status and code", () => {
    const { status, body } = run(new NotFoundError("Order not found"));
    expect(status).toBe(404);
    expect(body).toMatchObject({ success: false, error: { message: "Order not found", code: "NOT_FOUND" } });
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it("maps ZodErrors to VALIDATION_ERROR", () => {
    const zodError = (() => {
      try {
        z.object({ a: z.string() }).parse({});
      } catch (e) {
        return e as ZodError;
      }
    })();
    expect(run(zodError)).toMatchObject({ status: 400, body: { error: { code: "VALIDATION_ERROR" } } });
  });

  it("maps unique violations to 409 DUPLICATE_RESOURCE", () => {
    const err = new QueryFailedError("insert", [], Object.assign(new Error("dup"), { code: "23505" }));
    (err as any).code = "23505";
    expect(run(err)).toMatchObject({ status: 409, body: { error: { code: "DUPLICATE_RESOURCE" } } });
  });

  it("maps Nest HttpExceptions (e.g. unknown routes)", () => {
    expect(run(new NotFoundException("Cannot GET /nope"))).toMatchObject({
      status: 404,
      body: { error: { code: "NOT_FOUND" } },
    });
    expect(run(new HttpException("Payload too large", 413)).status).toBe(413);
  });

  it("hides internal error messages outside development", () => {
    const { status, body } = run(new Error("db password is hunter2"));
    expect(status).toBe(500);
    expect(body.error.message).toBe("Internal server error");
  });
});

describe("crypto", () => {
  it("round-trips secrets and uses a fresh IV each time", () => {
    const a = encryptSecret("AUTH_abc123");
    const b = encryptSecret("AUTH_abc123");
    expect(a).not.toEqual(b);
    expect(decryptSecret(a)).toBe("AUTH_abc123");
  });

  it("detects tampering", () => {
    const [v, iv, tag, data] = encryptSecret("AUTH_abc123").split(":");
    const flipped = Buffer.from(data, "base64");
    flipped[0] ^= 0xff;
    expect(() => decryptSecret([v, iv, tag, flipped.toString("base64")].join(":"))).toThrow();
    expect(() => decryptSecret("garbage")).toThrow("Unrecognised secret format");
  });

  it("makes unambiguous codes and prefixed references", () => {
    expect(randomCode(32)).toMatch(/^[2-9A-HJ-NP-Z]{32}$/);
    expect(createReference("TRP")).toMatch(/^TRP_[a-z0-9]+[2-9A-HJ-NP-Z]{6}$/);
  });
});

describe("helpers", () => {
  it("parses durations", () => {
    expect(durationToSeconds("15m")).toBe(900);
    expect(durationToSeconds("30d")).toBe(2_592_000);
    expect(() => durationToSeconds("soon")).toThrow();
  });

  it("only lets allow-listed filters and sorts through, and forces server-side scope", () => {
    const filter = buildListFilter(
      getFilterOptions({ status: "active", customerId: "someone-else", sort: "password:asc" }),
      { filters: ["status", "customerId"], sorts: ["createdAt"], force: { customerId: "me" } },
    );
    expect(filter.options?.where).toEqual({ status: "active", customerId: "me" });
    expect(filter.options?.order).toEqual({ createdAt: "DESC" });
  });

  it("builds page meta", () => {
    expect(buildMeta(41, 2, 20)).toEqual({ total: 41, page: 2, limit: 20, totalPages: 3, hasMore: true });
  });

  it("uses the Lagos calendar day", () => {
    // 23:30 UTC on Jan 1 is already Jan 2 in Lagos (UTC+1).
    expect(todayIso(new Date("2026-01-01T23:30:00Z"))).toBe("2026-01-02");
  });
});

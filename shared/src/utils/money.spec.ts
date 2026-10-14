import { formatNaira, fromKobo, percentOfKobo, splitKobo, sumKobo, toKobo } from "./money";
import { validateWith, fieldErrorsFromApi } from "./validation";
import { checkoutSchema } from "../schemas/checkout.schema";
import { registerCustomerSchema } from "../schemas/auth.schema";
import { reviewPayoutSchema } from "../schemas/merchant.schema";
import { PlanCode } from "../enums/tranche.enums";

describe("money", () => {
  it("converts between naira and kobo without float drift", () => {
    expect(toKobo(19.99)).toBe(1999);
    expect(toKobo(0.1 + 0.2)).toBe(30);
    expect(fromKobo(1999)).toBe(19.99);
  });

  it("sums and splits exactly", () => {
    expect(sumKobo([1, 2, 3])).toBe(6);
    expect(splitKobo(10, 3)).toEqual([4, 3, 3]);
    expect(splitKobo(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("refuses to split invalid inputs", () => {
    expect(() => splitKobo(10.5, 2)).toThrow(RangeError);
    expect(() => splitKobo(10, 0)).toThrow(RangeError);
    expect(() => splitKobo(-1, 2)).toThrow(RangeError);
  });

  it("computes basis point fees rounded to the kobo", () => {
    expect(percentOfKobo(100_000_00, 450)).toBe(4_500_00);
    expect(percentOfKobo(333, 150)).toBe(5);
  });

  it("formats naira, dropping decimals for whole amounts", () => {
    expect(formatNaira(1_234_500)).toMatch(/12,345$/);
    expect(formatNaira(1_234_550)).toMatch(/12,345\.50$/);
    expect(formatNaira(1_234_500, { exact: true })).toMatch(/12,345\.00$/);
  });
});

describe("shared schemas", () => {
  const productId = "4f6c1a2e-9b7d-4c1e-8a3f-2d5b6c7e8f90";

  it("accepts a valid checkout", () => {
    const parsed = checkoutSchema.parse({ items: [{ productId, quantity: 1 }], planCode: PlanCode.PAY_IN_4 });
    expect(parsed.planCode).toBe("pay_in_4");
  });

  it("returns one message per field", () => {
    const result = validateWith(registerCustomerSchema, {
      firstName: "",
      lastName: "Okafor",
      email: "not-an-email",
      password: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.firstName).toBe("First name is required");
      expect(result.errors.email).toBe("Enter a valid email address");
      expect(result.errors.password).toBe("Use at least 8 characters");
    }
  });

  it("normalises email case and whitespace", () => {
    const result = validateWith(registerCustomerSchema, {
      firstName: "Ada",
      lastName: "Okafor",
      email: "  Ada@Example.COM ",
      password: "password1",
    });
    expect(result.ok && result.data.email).toBe("ada@example.com");
  });

  it("requires a reason to reject a payout", () => {
    expect(reviewPayoutSchema.safeParse({ decision: "reject" }).success).toBe(false);
    expect(reviewPayoutSchema.safeParse({ decision: "approve" }).success).toBe(true);
  });

  it("maps api field errors", () => {
    expect(
      fieldErrorsFromApi([
        { path: "email", message: "taken" },
        { path: "email", message: "second" },
      ]),
    ).toEqual({ email: "taken" });
  });
});

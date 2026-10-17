import { creditCheck } from "./checkout.service";

describe("creditCheck", () => {
  it("only counts the financed part against the limit", () => {
    // ₦100k basket on Pay in 4: ₦25k today, ₦75k financed.
    const result = creditCheck({
      creditLimitKobo: 80_000_00,
      outstandingKobo: 0,
      totalKobo: 100_000_00,
      firstInstallmentKobo: 25_000_00,
    });
    expect(result).toEqual({ ok: true, financedKobo: 75_000_00, availableKobo: 80_000_00 });
  });

  it("subtracts what the shopper already owes", () => {
    const result = creditCheck({
      creditLimitKobo: 80_000_00,
      outstandingKobo: 10_000_00,
      totalKobo: 100_000_00,
      firstInstallmentKobo: 25_000_00,
    });
    expect(result.ok).toBe(false);
    expect(result.availableKobo).toBe(70_000_00);
  });

  it("never reports negative available credit", () => {
    const result = creditCheck({
      creditLimitKobo: 100,
      outstandingKobo: 500,
      totalKobo: 400,
      firstInstallmentKobo: 100,
    });
    expect(result.availableKobo).toBe(0);
    expect(result.ok).toBe(false);
  });
});

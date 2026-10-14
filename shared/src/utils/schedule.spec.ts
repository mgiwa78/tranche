import { PlanCode } from "../enums/tranche.enums";
import { buildInstallmentSchedule, BNPL_PLANS } from "./schedule";
import { addMonths, daysBetween, parseIsoDate, toIsoDate } from "./dates";

describe("buildInstallmentSchedule", () => {
  it("splits Pay in 4 into four biweekly installments starting today", () => {
    const schedule = buildInstallmentSchedule(100_000_00, PlanCode.PAY_IN_4, "2026-01-01");
    expect(schedule).toEqual([
      { sequence: 1, amountKobo: 25_000_00, dueDate: "2026-01-01" },
      { sequence: 2, amountKobo: 25_000_00, dueDate: "2026-01-15" },
      { sequence: 3, amountKobo: 25_000_00, dueDate: "2026-01-29" },
      { sequence: 4, amountKobo: 25_000_00, dueDate: "2026-02-12" },
    ]);
  });

  it("puts the remainder on the first installment so the total is exact", () => {
    const schedule = buildInstallmentSchedule(100_01, PlanCode.MONTHLY_3, "2026-03-10");
    expect(schedule.map((s) => s.amountKobo)).toEqual([33_35, 33_33, 33_33]);
    expect(schedule.reduce((t, s) => t + s.amountKobo, 0)).toBe(100_01);
  });

  it("clamps monthly due dates to the end of shorter months", () => {
    const schedule = buildInstallmentSchedule(600_00, PlanCode.MONTHLY_6, "2026-01-31");
    expect(schedule.map((s) => s.dueDate)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
      "2026-06-30",
    ]);
  });

  it("creates as many installments as the plan says for every plan", () => {
    for (const plan of Object.values(BNPL_PLANS)) {
      const schedule = buildInstallmentSchedule(123_456_78, plan.code, new Date("2026-05-05T22:30:00Z"));
      expect(schedule).toHaveLength(plan.installmentCount);
      expect(schedule[0].dueDate).toBe("2026-05-05");
      expect(schedule.reduce((t, s) => t + s.amountKobo, 0)).toBe(123_456_78);
    }
  });

  it("rejects unknown plans", () => {
    expect(() => buildInstallmentSchedule(100, "weekly_52" as PlanCode, "2026-01-01")).toThrow(RangeError);
  });
});

describe("dates", () => {
  it("round-trips ISO dates in UTC", () => {
    expect(toIsoDate(parseIsoDate("2026-12-31"))).toBe("2026-12-31");
  });

  it("handles leap years when adding months", () => {
    expect(toIsoDate(addMonths(parseIsoDate("2028-01-31"), 1))).toBe("2028-02-29");
  });

  it("counts days between dates, negative for the past", () => {
    expect(daysBetween("2026-01-01", "2026-01-15")).toBe(14);
    expect(daysBetween("2026-01-15", "2026-01-01")).toBe(-14);
  });
});

import { LedgerDirection, LedgerTransactionKind, PlatformAccount } from "@tranche/shared";
import { LedgerUnbalancedError } from "@/common/errors";
import {
  assertBalanced,
  balanceDelta,
  installmentCollectedPosting,
  lateFeePosting,
  orderFinancedPosting,
  payoutPaidPosting,
  PostingLine,
} from "./postings";
import { PLATFORM_ACCOUNTS, customerReceivableAccount, merchantPayableAccount } from "./chart-of-accounts";

const sum = (lines: PostingLine[], direction: LedgerDirection) =>
  lines.filter((l) => l.direction === direction).reduce((t, l) => t + l.amountKobo, 0);

/** Applies postings to an in-memory book so the whole lifecycle can be asserted end to end. */
const book = () => {
  const balances = new Map<string, number>();
  return {
    apply(lines: PostingLine[]) {
      assertBalanced(lines);
      for (const line of lines) {
        balances.set(line.account.code, (balances.get(line.account.code) ?? 0) + balanceDelta(line.account, line));
      }
    },
    get: (code: string) => balances.get(code) ?? 0,
  };
};

describe("ledger postings", () => {
  const customerId = "c1";
  const merchantId = "m1";

  it("finances an order: receivable = total, payable = total - fee, fee revenue = fee", () => {
    const posting = orderFinancedPosting({
      orderId: "o1",
      orderReference: "TR-1",
      customerId,
      merchantId,
      totalKobo: 100_000_00,
      feeKobo: 4_500_00,
    });
    expect(posting.kind).toBe(LedgerTransactionKind.ORDER_FINANCED);
    expect(posting.reference).toBe("o1");
    expect(sum(posting.lines, LedgerDirection.DEBIT)).toBe(sum(posting.lines, LedgerDirection.CREDIT));
    expect(posting.lines.find((l) => l.account.code === merchantPayableAccount(merchantId).code)?.amountKobo).toBe(
      95_500_00,
    );
  });

  it("drops zero legs when the merchant pays no fee", () => {
    const posting = orderFinancedPosting({
      orderId: "o2",
      orderReference: "TR-2",
      customerId,
      merchantId,
      totalKobo: 50_00,
      feeKobo: 0,
    });
    expect(posting.lines).toHaveLength(2);
    expect(() => assertBalanced(posting.lines)).not.toThrow();
  });

  it("runs a full order lifecycle and nets the books correctly", () => {
    const b = book();
    const total = 120_000_00;
    const fee = 5_400_00;
    b.apply(
      orderFinancedPosting({
        orderId: "o",
        orderReference: "TR",
        customerId,
        merchantId,
        totalKobo: total,
        feeKobo: fee,
      }).lines,
    );
    for (let i = 0; i < 4; i++) {
      b.apply(
        installmentCollectedPosting({
          paymentId: `p${i}`,
          paymentReference: `ref${i}`,
          orderId: "o",
          installmentId: `i${i}`,
          customerId,
          amountKobo: total / 4,
        }).lines,
      );
    }
    b.apply(lateFeePosting({ installmentId: "i3", orderId: "o", customerId, amountKobo: 1_000_00 }).lines);
    b.apply(payoutPaidPosting({ payoutId: "po", payoutReference: "PO", merchantId, amountKobo: total - fee }).lines);

    expect(b.get(customerReceivableAccount(customerId).code)).toBe(1_000_00); // only the late fee left
    expect(b.get(merchantPayableAccount(merchantId).code)).toBe(0);
    expect(b.get(PlatformAccount.FEE_REVENUE)).toBe(fee);
    expect(b.get(PlatformAccount.LATE_FEE_REVENUE)).toBe(1_000_00);
    expect(b.get(PlatformAccount.CLEARING)).toBe(fee); // cash kept = our fee
  });

  it("rejects unbalanced, fractional, non-positive or one-legged postings", () => {
    const clearing = PLATFORM_ACCOUNTS[PlatformAccount.CLEARING];
    const fees = PLATFORM_ACCOUNTS[PlatformAccount.FEE_REVENUE];
    expect(() =>
      assertBalanced([
        { account: clearing, direction: LedgerDirection.DEBIT, amountKobo: 100 },
        { account: fees, direction: LedgerDirection.CREDIT, amountKobo: 99 },
      ]),
    ).toThrow(LedgerUnbalancedError);
    expect(() =>
      assertBalanced([
        { account: clearing, direction: LedgerDirection.DEBIT, amountKobo: 1.5 },
        { account: fees, direction: LedgerDirection.CREDIT, amountKobo: 1.5 },
      ]),
    ).toThrow(LedgerUnbalancedError);
    expect(() =>
      assertBalanced([
        { account: clearing, direction: LedgerDirection.DEBIT, amountKobo: 0 },
        { account: fees, direction: LedgerDirection.CREDIT, amountKobo: 0 },
      ]),
    ).toThrow(LedgerUnbalancedError);
    expect(() => assertBalanced([{ account: clearing, direction: LedgerDirection.DEBIT, amountKobo: 1 }])).toThrow(
      LedgerUnbalancedError,
    );
  });

  it("moves balances in each account's normal direction", () => {
    const payable = merchantPayableAccount(merchantId);
    expect(balanceDelta(payable, { direction: LedgerDirection.CREDIT, amountKobo: 10 })).toBe(10);
    expect(balanceDelta(payable, { direction: LedgerDirection.DEBIT, amountKobo: 10 })).toBe(-10);
  });
});

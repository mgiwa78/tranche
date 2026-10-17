import { LedgerDirection, LedgerTransactionKind, PlatformAccount } from "@tranche/shared";
import { LedgerUnbalancedError } from "@/common/errors";
import { AccountSpec, PLATFORM_ACCOUNTS, customerReceivableAccount, merchantPayableAccount } from "./chart-of-accounts";

export interface PostingLine {
  account: AccountSpec;
  direction: LedgerDirection;
  amountKobo: number;
}

export interface Posting {
  kind: LedgerTransactionKind;
  reference: string;
  description: string;
  lines: PostingLine[];
  metadata?: Record<string, unknown>;
}

const debit = (account: AccountSpec, amountKobo: number): PostingLine => ({
  account,
  direction: LedgerDirection.DEBIT,
  amountKobo,
});

const credit = (account: AccountSpec, amountKobo: number): PostingLine => ({
  account,
  direction: LedgerDirection.CREDIT,
  amountKobo,
});

/** Zero-amount legs (e.g. a 0% fee merchant) are dropped rather than posted. */
const nonZero = (lines: PostingLine[]) => lines.filter((l) => l.amountKobo !== 0);

/**
 * Throws unless every leg is a positive whole kobo amount and debits equal credits.
 * The database enforces the same rule with a deferred constraint trigger.
 */
export const assertBalanced = (lines: PostingLine[]): void => {
  if (lines.length < 2) throw new LedgerUnbalancedError("A posting needs at least two legs");
  let debits = 0;
  let credits = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.amountKobo) || line.amountKobo <= 0) {
      throw new LedgerUnbalancedError("Ledger amounts must be positive whole kobo", { line });
    }
    if (line.direction === LedgerDirection.DEBIT) debits += line.amountKobo;
    else credits += line.amountKobo;
  }
  if (debits !== credits) {
    throw new LedgerUnbalancedError("Debits and credits must be equal", { debits, credits });
  }
};

/** Signed effect on an account's running balance (positive = grows in its normal direction). */
export const balanceDelta = (account: AccountSpec, line: Pick<PostingLine, "direction" | "amountKobo">) =>
  line.direction === account.normalBalance ? line.amountKobo : -line.amountKobo;

/**
 * First installment collected -> the order is financed: the shopper now owes the full total,
 * and we owe the merchant the total less our fee.
 */
export const orderFinancedPosting = (o: {
  orderId: string;
  orderReference: string;
  customerId: string;
  customerName?: string;
  merchantId: string;
  merchantName?: string;
  totalKobo: number;
  feeKobo: number;
}): Posting => ({
  kind: LedgerTransactionKind.ORDER_FINANCED,
  reference: o.orderId,
  description: `Order ${o.orderReference} financed`,
  metadata: { orderId: o.orderId },
  lines: nonZero([
    debit(customerReceivableAccount(o.customerId, o.customerName), o.totalKobo),
    credit(merchantPayableAccount(o.merchantId, o.merchantName), o.totalKobo - o.feeKobo),
    credit(PLATFORM_ACCOUNTS[PlatformAccount.FEE_REVENUE], o.feeKobo),
  ]),
});

/** Money landed in Paystack: clearing up, receivable down. */
export const installmentCollectedPosting = (p: {
  paymentId: string;
  paymentReference: string;
  orderId: string;
  installmentId: string;
  customerId: string;
  customerName?: string;
  amountKobo: number;
}): Posting => ({
  kind: LedgerTransactionKind.INSTALLMENT_COLLECTED,
  reference: p.paymentId,
  description: `Installment collected (${p.paymentReference})`,
  metadata: { orderId: p.orderId, installmentId: p.installmentId, paymentReference: p.paymentReference },
  lines: [
    debit(PLATFORM_ACCOUNTS[PlatformAccount.CLEARING], p.amountKobo),
    credit(customerReceivableAccount(p.customerId, p.customerName), p.amountKobo),
  ],
});

export const lateFeePosting = (f: {
  installmentId: string;
  orderId: string;
  customerId: string;
  customerName?: string;
  amountKobo: number;
}): Posting => ({
  kind: LedgerTransactionKind.LATE_FEE,
  reference: f.installmentId,
  description: "Late fee charged",
  metadata: { orderId: f.orderId, installmentId: f.installmentId },
  lines: [
    debit(customerReceivableAccount(f.customerId, f.customerName), f.amountKobo),
    credit(PLATFORM_ACCOUNTS[PlatformAccount.LATE_FEE_REVENUE], f.amountKobo),
  ],
});

/** Transfer to the merchant succeeded: we owe them less, and the cash left clearing. */
export const payoutPaidPosting = (p: {
  payoutId: string;
  payoutReference: string;
  merchantId: string;
  merchantName?: string;
  amountKobo: number;
}): Posting => ({
  kind: LedgerTransactionKind.PAYOUT,
  reference: p.payoutId,
  description: `Payout ${p.payoutReference}`,
  metadata: { payoutId: p.payoutId },
  lines: [
    debit(merchantPayableAccount(p.merchantId, p.merchantName), p.amountKobo),
    credit(PLATFORM_ACCOUNTS[PlatformAccount.CLEARING], p.amountKobo),
  ],
});

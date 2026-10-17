import { LedgerAccountType, LedgerDirection, LedgerOwnerType, PlatformAccount } from "@tranche/shared";

export interface AccountSpec {
  code: string;
  name: string;
  type: LedgerAccountType;
  ownerType: LedgerOwnerType;
  ownerId: string | null;
  normalBalance: LedgerDirection;
}

/**
 * Tranche's books, from the platform's point of view:
 *
 *   platform:clearing            ASSET      cash collected through Paystack, not yet paid out
 *   customer_receivable:<id>     ASSET      what a shopper still owes us
 *   merchant_payable:<id>        LIABILITY  what we owe a merchant for financed orders
 *   platform:fee_revenue         REVENUE    merchant discount rate we keep
 *   platform:late_fee_revenue    REVENUE    late fees charged to shoppers
 */
export const PLATFORM_ACCOUNTS: Record<PlatformAccount, AccountSpec> = {
  [PlatformAccount.CLEARING]: {
    code: PlatformAccount.CLEARING,
    name: "Paystack clearing",
    type: LedgerAccountType.ASSET,
    ownerType: LedgerOwnerType.PLATFORM,
    ownerId: null,
    normalBalance: LedgerDirection.DEBIT,
  },
  [PlatformAccount.FEE_REVENUE]: {
    code: PlatformAccount.FEE_REVENUE,
    name: "Merchant fee revenue",
    type: LedgerAccountType.REVENUE,
    ownerType: LedgerOwnerType.PLATFORM,
    ownerId: null,
    normalBalance: LedgerDirection.CREDIT,
  },
  [PlatformAccount.LATE_FEE_REVENUE]: {
    code: PlatformAccount.LATE_FEE_REVENUE,
    name: "Late fee revenue",
    type: LedgerAccountType.REVENUE,
    ownerType: LedgerOwnerType.PLATFORM,
    ownerId: null,
    normalBalance: LedgerDirection.CREDIT,
  },
};

export const merchantPayableAccount = (merchantId: string, merchantName?: string): AccountSpec => ({
  code: `merchant_payable:${merchantId}`,
  name: `Payable to ${merchantName ?? "merchant"}`,
  type: LedgerAccountType.LIABILITY,
  ownerType: LedgerOwnerType.MERCHANT,
  ownerId: merchantId,
  normalBalance: LedgerDirection.CREDIT,
});

export const customerReceivableAccount = (customerId: string, customerName?: string): AccountSpec => ({
  code: `customer_receivable:${customerId}`,
  name: `Receivable from ${customerName ?? "customer"}`,
  type: LedgerAccountType.ASSET,
  ownerType: LedgerOwnerType.CUSTOMER,
  ownerId: customerId,
  normalBalance: LedgerDirection.DEBIT,
});

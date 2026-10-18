/** Enums and label maps are shared with the api and the app; re-exported so imports stay local. */
export {
  UserRole,
  AdminRole,
  ADMIN_ROLE_RANK,
  ADMIN_ROLE_LABELS,
  hasAdminRole,
  AccountStatus,
  MerchantStatus,
  ProductCategory,
  PRODUCT_CATEGORY_LABELS,
  PlanCode,
  OrderStatus,
  ORDER_STATUS_LABELS,
  InstallmentStatus,
  INSTALLMENT_STATUS_LABELS,
  PaymentStatus,
  PaymentChannel,
  PayoutStatus,
  PAYOUT_STATUS_LABELS,
  LedgerAccountType,
  LedgerDirection,
  LedgerOwnerType,
  LedgerTransactionKind,
  WebhookEventStatus,
  BNPL_PLANS,
  PLAN_LIST,
} from "@tranche/shared";

import { LedgerTransactionKind, MerchantStatus, PlanCode } from "@tranche/shared";

export const MERCHANT_STATUS_LABELS: Record<MerchantStatus, string> = {
  [MerchantStatus.PENDING]: "Pending review",
  [MerchantStatus.ACTIVE]: "Active",
  [MerchantStatus.SUSPENDED]: "Suspended",
};

export const LEDGER_KIND_LABELS: Record<LedgerTransactionKind, string> = {
  [LedgerTransactionKind.ORDER_FINANCED]: "Order financed",
  [LedgerTransactionKind.INSTALLMENT_COLLECTED]: "Installment collected",
  [LedgerTransactionKind.LATE_FEE]: "Late fee",
  [LedgerTransactionKind.PAYOUT]: "Payout",
  [LedgerTransactionKind.ORDER_REVERSED]: "Order reversed",
};

export const PLAN_LABELS: Record<PlanCode, string> = {
  [PlanCode.PAY_IN_4]: "Pay in 4",
  [PlanCode.MONTHLY_3]: "3 months",
  [PlanCode.MONTHLY_6]: "6 months",
};

/** Nigerian banks for settlement accounts (Paystack bank codes). */
export const BANKS: { code: string; name: string }[] = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
  { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank For Africa" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

/* -------------------------------- people -------------------------------- */

export enum UserRole {
  CUSTOMER = "customer",
  MERCHANT = "merchant",
  ADMIN = "admin",
}

/** Staff hierarchy for `role = admin` users. Higher rank can do everything lower ranks can. */
export enum AdminRole {
  SUPPORT = "support",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

export const ADMIN_ROLE_RANK: AdminRole[] = [AdminRole.SUPPORT, AdminRole.ADMIN, AdminRole.SUPER_ADMIN];

export const hasAdminRole = (role: AdminRole | null | undefined, minimum: AdminRole): boolean => {
  if (!role) return false;
  return ADMIN_ROLE_RANK.indexOf(role) >= ADMIN_ROLE_RANK.indexOf(minimum);
};

export enum AccountStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

export enum MerchantStatus {
  PENDING = "pending",
  ACTIVE = "active",
  SUSPENDED = "suspended",
}

export enum DevicePlatform {
  IOS = "ios",
  ANDROID = "android",
}

/* -------------------------------- catalog ------------------------------- */

export enum ProductCategory {
  ELECTRONICS = "electronics",
  FASHION = "fashion",
  HOME = "home",
  BEAUTY = "beauty",
  SPORTS = "sports",
  TRAVEL = "travel",
  OTHER = "other",
}

/* --------------------------------- plans -------------------------------- */

export enum PlanCode {
  PAY_IN_4 = "pay_in_4",
  MONTHLY_3 = "monthly_3",
  MONTHLY_6 = "monthly_6",
}

export enum PlanInterval {
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
}

/* ----------------------------- orders & money ---------------------------- */

export enum OrderStatus {
  PENDING_PAYMENT = "pending_payment",
  ACTIVE = "active",
  OVERDUE = "overdue",
  COMPLETED = "completed",
  DEFAULTED = "defaulted",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum InstallmentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  OVERDUE = "overdue",
  CANCELLED = "cancelled",
}

export enum PaymentStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  ABANDONED = "abandoned",
}

export enum PaymentProviderName {
  PAYSTACK = "paystack",
  FAKE = "fake",
}

/** How a payment was collected: hosted checkout page, or a silent charge on a saved card. */
export enum PaymentChannel {
  CHECKOUT = "checkout",
  CARD_ON_FILE = "card_on_file",
}

export enum PayoutStatus {
  REQUESTED = "requested",
  APPROVED = "approved",
  PROCESSING = "processing",
  PAID = "paid",
  FAILED = "failed",
  REJECTED = "rejected",
}

/* --------------------------------- ledger -------------------------------- */

export enum LedgerAccountType {
  ASSET = "asset",
  LIABILITY = "liability",
  EQUITY = "equity",
  REVENUE = "revenue",
  EXPENSE = "expense",
}

export enum LedgerDirection {
  DEBIT = "debit",
  CREDIT = "credit",
}

export enum LedgerOwnerType {
  PLATFORM = "platform",
  MERCHANT = "merchant",
  CUSTOMER = "customer",
}

export enum LedgerTransactionKind {
  ORDER_FINANCED = "order_financed",
  INSTALLMENT_COLLECTED = "installment_collected",
  LATE_FEE = "late_fee",
  PAYOUT = "payout",
  ORDER_REVERSED = "order_reversed",
}

/** Fixed platform account codes. Merchant and customer sub-accounts are derived from these. */
export enum PlatformAccount {
  CLEARING = "platform:clearing",
  FEE_REVENUE = "platform:fee_revenue",
  LATE_FEE_REVENUE = "platform:late_fee_revenue",
}

/* ------------------------------ notifications ---------------------------- */

export enum NotificationType {
  PAYMENT_RECEIVED = "payment_received",
  PAYMENT_FAILED = "payment_failed",
  INSTALLMENT_DUE_SOON = "installment_due_soon",
  INSTALLMENT_DUE_TODAY = "installment_due_today",
  INSTALLMENT_OVERDUE = "installment_overdue",
  ORDER_COMPLETED = "order_completed",
  PAYOUT_PAID = "payout_paid",
  GENERAL = "general",
}

export enum WebhookEventStatus {
  RECEIVED = "received",
  PROCESSED = "processed",
  IGNORED = "ignored",
  FAILED = "failed",
}

export enum AppearanceMode {
  SYSTEM = "system",
  LIGHT = "light",
  DARK = "dark",
}

/* --------------------------------- labels -------------------------------- */

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: "Awaiting first payment",
  [OrderStatus.ACTIVE]: "Active",
  [OrderStatus.OVERDUE]: "Overdue",
  [OrderStatus.COMPLETED]: "Paid off",
  [OrderStatus.DEFAULTED]: "Defaulted",
  [OrderStatus.CANCELLED]: "Cancelled",
  [OrderStatus.REFUNDED]: "Refunded",
};

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: "Upcoming",
  [InstallmentStatus.PAID]: "Paid",
  [InstallmentStatus.FAILED]: "Payment failed",
  [InstallmentStatus.OVERDUE]: "Overdue",
  [InstallmentStatus.CANCELLED]: "Cancelled",
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  [PayoutStatus.REQUESTED]: "Requested",
  [PayoutStatus.APPROVED]: "Approved",
  [PayoutStatus.PROCESSING]: "Processing",
  [PayoutStatus.PAID]: "Paid",
  [PayoutStatus.FAILED]: "Failed",
  [PayoutStatus.REJECTED]: "Rejected",
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.ELECTRONICS]: "Electronics",
  [ProductCategory.FASHION]: "Fashion",
  [ProductCategory.HOME]: "Home",
  [ProductCategory.BEAUTY]: "Beauty",
  [ProductCategory.SPORTS]: "Sports",
  [ProductCategory.TRAVEL]: "Travel",
  [ProductCategory.OTHER]: "Other",
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.SUPPORT]: "Support",
  [AdminRole.ADMIN]: "Admin",
  [AdminRole.SUPER_ADMIN]: "Super admin",
};

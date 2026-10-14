import type {
  AccountStatus,
  AdminRole,
  DevicePlatform,
  InstallmentStatus,
  LedgerAccountType,
  LedgerDirection,
  LedgerOwnerType,
  LedgerTransactionKind,
  MerchantStatus,
  NotificationType,
  OrderStatus,
  PaymentChannel,
  PaymentProviderName,
  PaymentStatus,
  PayoutStatus,
  PlanCode,
  ProductCategory,
  UserRole,
  WebhookEventStatus,
} from "../enums/tranche.enums";
import type { PlatformSettingsDTO } from "../schemas/admin.schema";
import type { BnplPlan } from "../utils/schedule";
import type { IsoDate, Uuid } from "./api";

/* ------------------------------ auth/user ----------------------------- */

export interface MerchantSummary {
  id: Uuid;
  name: string;
  slug: string;
  status: MerchantStatus;
}

/** The signed-in user. Merchants carry `merchant`, staff carry `adminRole`. */
export interface MeView {
  id: Uuid;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  adminRole: AdminRole | null;
  status: AccountStatus;
  creditLimitKobo: number;
  merchant: MerchantSummary | null;
  createdAt: IsoDate;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: MeView;
}

/* ------------------------------- merchants ------------------------------ */

export interface MerchantView extends MerchantSummary {
  feeBps: number;
  supportEmail: string | null;
  settlementBankCode: string | null;
  /** Masked, e.g. `******4821`. */
  settlementAccountNumber: string | null;
  settlementAccountName: string | null;
  createdAt: IsoDate;
}

export interface AdminMerchantView extends MerchantView {
  ownerEmail: string | null;
  ordersCount: number;
  gmvKobo: number;
  availableKobo: number;
}

export interface MerchantBalanceView {
  /** Owed to the merchant and not yet paid out (ledger: merchant payable minus requested payouts). */
  availableKobo: number;
  pendingPayoutKobo: number;
  /** Still owed by shoppers on this merchant's orders. Tranche carries this risk, not the merchant. */
  outstandingKobo: number;
  lifetimeGmvKobo: number;
  lifetimePaidOutKobo: number;
}

/* -------------------------------- catalog ------------------------------- */

export interface ProductView {
  id: Uuid;
  merchantId: Uuid;
  merchantName: string | null;
  name: string;
  description: string;
  priceKobo: number;
  imageUrl: string | null;
  category: ProductCategory;
  stock: number;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/* ------------------------------ orders/money ----------------------------- */

export interface OrderItemView {
  id: Uuid;
  productId: Uuid;
  name: string;
  imageUrl: string | null;
  unitPriceKobo: number;
  quantity: number;
  lineTotalKobo: number;
}

export interface InstallmentView {
  id: Uuid;
  orderId: Uuid;
  sequence: number;
  amountKobo: number;
  dueDate: string;
  status: InstallmentStatus;
  paidAt: IsoDate | null;
  attemptCount: number;
}

export interface PaymentView {
  id: Uuid;
  reference: string;
  orderId: Uuid;
  installmentId: Uuid | null;
  amountKobo: number;
  status: PaymentStatus;
  channel: PaymentChannel;
  provider: PaymentProviderName;
  cardLast4: string | null;
  failureReason: string | null;
  paidAt: IsoDate | null;
  createdAt: IsoDate;
}

export interface OrderView {
  id: Uuid;
  reference: string;
  customerId: Uuid;
  customerName: string | null;
  merchantId: Uuid;
  merchantName: string | null;
  planCode: PlanCode;
  totalKobo: number;
  feeKobo: number;
  paidKobo: number;
  outstandingKobo: number;
  status: OrderStatus;
  installmentCount: number;
  installmentsPaid: number;
  nextDueDate: string | null;
  nextDueKobo: number | null;
  createdAt: IsoDate;
}

export interface OrderDetailView extends OrderView {
  items: OrderItemView[];
  installments: InstallmentView[];
  payments: PaymentView[];
}

export interface PaymentMethodView {
  id: Uuid;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  bank: string | null;
  isDefault: boolean;
  createdAt: IsoDate;
}

export interface PaymentAttemptView {
  reference: string;
  status: PaymentStatus;
  /** Hosted checkout page to open when the payment needs the shopper. Null for card-on-file charges. */
  authorizationUrl: string | null;
}

export interface CheckoutResponse {
  order: OrderDetailView;
  payment: PaymentAttemptView;
}

export interface PaymentVerificationView {
  reference: string;
  status: PaymentStatus;
  order: OrderView;
}

export interface CustomerSummaryView {
  creditLimitKobo: number;
  availableCreditKobo: number;
  outstandingKobo: number;
  activeOrders: number;
  completedOrders: number;
  nextDue: {
    orderId: Uuid;
    installmentId: Uuid;
    merchantName: string | null;
    amountKobo: number;
    dueDate: string;
    status: InstallmentStatus;
  } | null;
}

export interface PayoutView {
  id: Uuid;
  merchantId: Uuid;
  merchantName: string | null;
  amountKobo: number;
  status: PayoutStatus;
  reference: string;
  failureReason: string | null;
  createdAt: IsoDate;
  processedAt: IsoDate | null;
}

export interface OutstandingBalanceView {
  orderId: Uuid;
  reference: string;
  customerName: string | null;
  customerEmail: string | null;
  totalKobo: number;
  outstandingKobo: number;
  overdueKobo: number;
  nextDueDate: string | null;
  status: OrderStatus;
}

/* -------------------------------- analytics ------------------------------ */

export interface SeriesPoint {
  date: string;
  gmvKobo: number;
  collectedKobo: number;
  orders: number;
}

export interface MerchantDashboardView {
  balance: MerchantBalanceView;
  activeOrders: number;
  completedOrders: number;
  overdueOrders: number;
  periodGmvKobo: number;
  periodOrders: number;
  averageOrderKobo: number;
  series: SeriesPoint[];
}

export interface AdminDashboardView {
  gmvKobo: number;
  collectedKobo: number;
  outstandingKobo: number;
  overdueKobo: number;
  feeRevenueKobo: number;
  activeOrders: number;
  customers: number;
  merchants: number;
  pendingPayouts: number;
  defaultRate: number;
  series: SeriesPoint[];
}

export interface AdminCustomerView {
  id: Uuid;
  email: string;
  name: string;
  phone: string | null;
  status: AccountStatus;
  creditLimitKobo: number;
  ordersCount: number;
  outstandingKobo: number;
  createdAt: IsoDate;
}

/* ---------------------------------- ledger -------------------------------- */

export interface LedgerAccountView {
  id: Uuid;
  code: string;
  name: string;
  type: LedgerAccountType;
  ownerType: LedgerOwnerType;
  ownerId: Uuid | null;
  normalBalance: LedgerDirection;
  /** Signed in the account's normal direction: positive = normal balance. */
  balanceKobo: number;
}

export interface LedgerEntryView {
  id: Uuid;
  accountId: Uuid;
  accountCode: string;
  accountName: string;
  direction: LedgerDirection;
  amountKobo: number;
}

export interface LedgerTransactionView {
  id: Uuid;
  kind: LedgerTransactionKind;
  reference: string;
  description: string;
  entries: LedgerEntryView[];
  createdAt: IsoDate;
}

export interface TrialBalanceRow {
  code: string;
  name: string;
  type: LedgerAccountType;
  debitKobo: number;
  creditKobo: number;
}

export interface TrialBalanceView {
  rows: TrialBalanceRow[];
  totalDebitKobo: number;
  totalCreditKobo: number;
  balanced: boolean;
}

/* ------------------------------ notifications ---------------------------- */

export interface NotificationView {
  id: Uuid;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  readAt: IsoDate | null;
  createdAt: IsoDate;
}

export interface DeviceTokenView {
  id: Uuid;
  platform: DevicePlatform;
  createdAt: IsoDate;
}

export interface WebhookEventView {
  id: Uuid;
  provider: PaymentProviderName;
  event: string;
  reference: string | null;
  status: WebhookEventStatus;
  attempts: number;
  error: string | null;
  createdAt: IsoDate;
  processedAt: IsoDate | null;
}

/* -------------------------------- app config ------------------------------ */

export type PlatformSettingsView = PlatformSettingsDTO;

export interface AppConfigView {
  plans: BnplPlan[];
  maintenanceMode: boolean;
  minAppVersion: string;
  reminderDaysBefore: number;
}

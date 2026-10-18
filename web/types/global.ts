/**
 * Every api shape comes from @tranche/shared, so the dashboard can't drift from the api.
 * Only web-specific shapes are declared here.
 */
export type {
  Uuid,
  IsoDate,
  ApiEnvelope,
  ApiErrorEnvelope,
  ErrorCode,
  FieldError,
  PageMeta,
  PaginatedResponse,
  PaginationParams,
  MeView as Me,
  AuthResponse,
  AuthTokens,
  MerchantView,
  AdminMerchantView,
  MerchantBalanceView,
  MerchantDashboardView,
  ProductView,
  OrderView,
  OrderDetailView,
  OrderItemView,
  InstallmentView,
  PaymentView,
  PayoutView,
  OutstandingBalanceView,
  AdminDashboardView,
  AdminCustomerView,
  LedgerAccountView,
  LedgerTransactionView,
  LedgerEntryView,
  TrialBalanceView,
  WebhookEventView,
  NotificationView,
  PlatformSettingsView,
  SeriesPoint,
} from "@tranche/shared";

export interface AuditLogView {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type TrialBalanceResponse = import("@tranche/shared").TrialBalanceView & {
  driftedAccounts: string[];
};

/** Every api shape comes from @tranche/shared, the same contract the api and web use. */
export type {
  Uuid,
  IsoDate,
  ApiEnvelope,
  ApiErrorEnvelope,
  FieldError,
  PageMeta,
  PaginatedResponse,
  PaginationParams,
  MeView,
  AuthResponse,
  AuthTokens,
  ProductView,
  OrderView,
  OrderDetailView,
  OrderItemView,
  InstallmentView,
  PaymentView,
  PaymentMethodView,
  PaymentAttemptView,
  CheckoutResponse,
  PaymentVerificationView,
  CustomerSummaryView,
  NotificationView,
  AppConfigView,
} from '@tranche/shared';

export interface Store {
  id: string;
  name: string;
  slug: string;
}

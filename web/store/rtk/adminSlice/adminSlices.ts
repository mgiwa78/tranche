import type {
  ListCustomersQueryDTO,
  ListLedgerAccountsQueryDTO,
  ListLedgerTransactionsQueryDTO,
  ListMerchantsQueryDTO,
  ListOrdersQueryDTO,
  ListPayoutsQueryDTO,
  ListWebhookEventsQueryDTO,
  PaginationQueryDTO,
  ReviewPayoutDTO,
  UpdateCustomerDTO,
  UpdateMerchantStatusDTO,
  UpdatePlatformSettingsDTO,
} from "@tranche/shared";
import type {
  AdminCustomerView,
  AdminDashboardView,
  AdminMerchantView,
  AuditLogView,
  LedgerAccountView,
  LedgerTransactionView,
  OrderDetailView,
  OrderView,
  PaginatedResponse,
  PayoutView,
  PlatformSettingsView,
  TrialBalanceResponse,
  WebhookEventView,
} from "@/types/global";
import { ADMIN_TAGS, adminApiSlice } from "./adminApiSlice";

type Params<T> = Partial<T>;
const unwrap = <T>(res: { response: T }) => res.response;

export const adminApi = adminApiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<AdminDashboardView, { days: number }>({
      query: (params) => ({ url: "/dashboard", method: "GET", params }),
      providesTags: [{ type: ADMIN_TAGS.DASHBOARD }],
      transformResponse: unwrap<AdminDashboardView>,
    }),

    /* -------------------------------- merchants ------------------------------ */
    listAdminMerchants: builder.query<PaginatedResponse<AdminMerchantView>, Params<ListMerchantsQueryDTO> | void>({
      query: (params) => ({ url: "/merchants", method: "GET", params: params ?? {} }),
      providesTags: [{ type: ADMIN_TAGS.MERCHANTS }],
      transformResponse: unwrap<PaginatedResponse<AdminMerchantView>>,
    }),
    getAdminMerchant: builder.query<AdminMerchantView, string>({
      query: (id) => ({ url: `/merchants/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: ADMIN_TAGS.MERCHANT, id }],
      transformResponse: unwrap<AdminMerchantView>,
    }),
    updateMerchantStatus: builder.mutation<AdminMerchantView, { id: string; body: UpdateMerchantStatusDTO }>({
      query: ({ id, body }) => ({ url: `/merchants/${id}/status`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ADMIN_TAGS.MERCHANTS }, { type: ADMIN_TAGS.MERCHANT, id }],
      transformResponse: unwrap<AdminMerchantView>,
    }),
    updateMerchantFee: builder.mutation<AdminMerchantView, { id: string; feeBps: number }>({
      query: ({ id, feeBps }) => ({ url: `/merchants/${id}/fee`, method: "PATCH", body: { feeBps } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: ADMIN_TAGS.MERCHANTS }, { type: ADMIN_TAGS.MERCHANT, id }],
      transformResponse: unwrap<AdminMerchantView>,
    }),

    /* -------------------------------- customers ------------------------------ */
    listAdminCustomers: builder.query<PaginatedResponse<AdminCustomerView>, Params<ListCustomersQueryDTO> | void>({
      query: (params) => ({ url: "/customers", method: "GET", params: params ?? {} }),
      providesTags: [{ type: ADMIN_TAGS.CUSTOMERS }],
      transformResponse: unwrap<PaginatedResponse<AdminCustomerView>>,
    }),
    updateAdminCustomer: builder.mutation<AdminCustomerView, { id: string; body: UpdateCustomerDTO }>({
      query: ({ id, body }) => ({ url: `/customers/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: ADMIN_TAGS.CUSTOMERS }],
      transformResponse: unwrap<AdminCustomerView>,
    }),

    /* --------------------------------- orders -------------------------------- */
    listAdminOrders: builder.query<PaginatedResponse<OrderView>, Params<ListOrdersQueryDTO> | void>({
      query: (params) => ({ url: "/orders", method: "GET", params: params ?? {} }),
      providesTags: [{ type: ADMIN_TAGS.ORDERS }],
      transformResponse: unwrap<PaginatedResponse<OrderView>>,
    }),
    getAdminOrder: builder.query<OrderDetailView, string>({
      query: (id) => ({ url: `/orders/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: ADMIN_TAGS.ORDER, id }],
      transformResponse: unwrap<OrderDetailView>,
    }),
    cancelAdminOrder: builder.mutation<OrderDetailView, string>({
      query: (id) => ({ url: `/orders/${id}/cancel`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: ADMIN_TAGS.ORDERS }, { type: ADMIN_TAGS.ORDER, id }],
      transformResponse: unwrap<OrderDetailView>,
    }),

    /* --------------------------------- payouts ------------------------------- */
    listAdminPayouts: builder.query<PaginatedResponse<PayoutView>, Params<ListPayoutsQueryDTO> | void>({
      query: (params) => ({ url: "/payouts", method: "GET", params: params ?? {} }),
      providesTags: [{ type: ADMIN_TAGS.PAYOUTS }],
      transformResponse: unwrap<PaginatedResponse<PayoutView>>,
    }),
    reviewPayout: builder.mutation<PayoutView, { id: string; body: ReviewPayoutDTO }>({
      query: ({ id, body }) => ({ url: `/payouts/${id}/review`, method: "POST", body }),
      invalidatesTags: [{ type: ADMIN_TAGS.PAYOUTS }, { type: ADMIN_TAGS.DASHBOARD }, { type: ADMIN_TAGS.LEDGER }],
      transformResponse: unwrap<PayoutView>,
    }),

    /* --------------------------------- ledger -------------------------------- */
    listLedgerAccounts: builder.query<PaginatedResponse<LedgerAccountView>, Params<ListLedgerAccountsQueryDTO> | void>({
      query: (params) => ({ url: "/ledger/accounts", method: "GET", params: params ?? {} }),
      providesTags: [{ type: ADMIN_TAGS.LEDGER }],
      transformResponse: unwrap<PaginatedResponse<LedgerAccountView>>,
    }),
    listLedgerTransactions: builder.query<
      PaginatedResponse<LedgerTransactionView>,
      Params<ListLedgerTransactionsQueryDTO> | void
    >({
      query: (params) => ({ url: "/ledger/transactions", method: "GET", params: params ?? {} }),
      providesTags: [{ type: ADMIN_TAGS.LEDGER }],
      transformResponse: unwrap<PaginatedResponse<LedgerTransactionView>>,
    }),
    getTrialBalance: builder.query<TrialBalanceResponse, void>({
      query: () => ({ url: "/ledger/trial-balance", method: "GET" }),
      providesTags: [{ type: ADMIN_TAGS.LEDGER }],
      transformResponse: unwrap<TrialBalanceResponse>,
    }),

    /* --------------------------------- system -------------------------------- */
    getPlatformSettings: builder.query<PlatformSettingsView, void>({
      query: () => ({ url: "/settings", method: "GET" }),
      providesTags: [{ type: ADMIN_TAGS.SETTINGS }],
      transformResponse: unwrap<PlatformSettingsView>,
    }),
    updatePlatformSettings: builder.mutation<PlatformSettingsView, UpdatePlatformSettingsDTO>({
      query: (body) => ({ url: "/settings", method: "PATCH", body }),
      invalidatesTags: [{ type: ADMIN_TAGS.SETTINGS }],
      transformResponse: unwrap<PlatformSettingsView>,
    }),
    listWebhookEvents: builder.query<PaginatedResponse<WebhookEventView>, Params<ListWebhookEventsQueryDTO> | void>({
      query: (params) => ({ url: "/webhooks", method: "GET", params: params ?? {} }),
      providesTags: [{ type: ADMIN_TAGS.WEBHOOKS }],
      transformResponse: unwrap<PaginatedResponse<WebhookEventView>>,
    }),
    replayWebhookEvent: builder.mutation<{ queued: boolean }, string>({
      query: (id) => ({ url: `/webhooks/${id}/replay`, method: "POST" }),
      invalidatesTags: [{ type: ADMIN_TAGS.WEBHOOKS }],
      transformResponse: unwrap<{ queued: boolean }>,
    }),
    listAuditLogs: builder.query<PaginatedResponse<AuditLogView>, Params<PaginationQueryDTO> | void>({
      query: (params) => ({ url: "/audit-logs", method: "GET", params: params ?? {} }),
      providesTags: [{ type: ADMIN_TAGS.AUDIT_LOGS }],
      transformResponse: unwrap<PaginatedResponse<AuditLogView>>,
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useListAdminMerchantsQuery,
  useGetAdminMerchantQuery,
  useUpdateMerchantStatusMutation,
  useUpdateMerchantFeeMutation,
  useListAdminCustomersQuery,
  useUpdateAdminCustomerMutation,
  useListAdminOrdersQuery,
  useGetAdminOrderQuery,
  useCancelAdminOrderMutation,
  useListAdminPayoutsQuery,
  useReviewPayoutMutation,
  useListLedgerAccountsQuery,
  useListLedgerTransactionsQuery,
  useGetTrialBalanceQuery,
  useGetPlatformSettingsQuery,
  useUpdatePlatformSettingsMutation,
  useListWebhookEventsQuery,
  useReplayWebhookEventMutation,
  useListAuditLogsQuery,
} = adminApi;

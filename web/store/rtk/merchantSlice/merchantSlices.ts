import type {
  CreateProductDTO,
  ListOrdersQueryDTO,
  ListPayoutsQueryDTO,
  ListProductsQueryDTO,
  PaginationQueryDTO,
  UpdateMerchantProfileDTO,
  UpdateProductDTO,
} from "@tranche/shared";
import type {
  MerchantBalanceView,
  MerchantDashboardView,
  MerchantView,
  OrderDetailView,
  OrderView,
  OutstandingBalanceView,
  PaginatedResponse,
  PayoutView,
  ProductView,
} from "@/types/global";
import { MERCHANT_TAGS, merchantApiSlice } from "./merchantApiSlice";

type Params<T> = Partial<T>;
const unwrap = <T>(res: { response: T }) => res.response;

export const merchantApi = merchantApiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    /* ------------------------------- dashboard ------------------------------ */
    getMerchantDashboard: builder.query<MerchantDashboardView, { days: number }>({
      query: (params) => ({ url: "/dashboard", method: "GET", params }),
      providesTags: [{ type: MERCHANT_TAGS.DASHBOARD }],
      transformResponse: unwrap<MerchantDashboardView>,
    }),

    /* -------------------------------- products ------------------------------ */
    listMerchantProducts: builder.query<PaginatedResponse<ProductView>, Params<ListProductsQueryDTO> | void>({
      query: (params) => ({ url: "/products", method: "GET", params: params ?? {} }),
      providesTags: [{ type: MERCHANT_TAGS.PRODUCTS }],
      transformResponse: unwrap<PaginatedResponse<ProductView>>,
    }),
    createMerchantProduct: builder.mutation<ProductView, CreateProductDTO>({
      query: (body) => ({ url: "/products", method: "POST", body }),
      invalidatesTags: [{ type: MERCHANT_TAGS.PRODUCTS }],
      transformResponse: unwrap<ProductView>,
    }),
    updateMerchantProduct: builder.mutation<ProductView, { id: string; body: UpdateProductDTO }>({
      query: ({ id, body }) => ({ url: `/products/${id}`, method: "PATCH", body }),
      invalidatesTags: [{ type: MERCHANT_TAGS.PRODUCTS }],
      transformResponse: unwrap<ProductView>,
    }),
    deleteMerchantProduct: builder.mutation<{ deleted: boolean }, string>({
      query: (id) => ({ url: `/products/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: MERCHANT_TAGS.PRODUCTS }],
      transformResponse: unwrap<{ deleted: boolean }>,
    }),

    /* --------------------------------- orders ------------------------------- */
    listMerchantOrders: builder.query<PaginatedResponse<OrderView>, Params<ListOrdersQueryDTO> | void>({
      query: (params) => ({ url: "/orders", method: "GET", params: params ?? {} }),
      providesTags: [{ type: MERCHANT_TAGS.ORDERS }],
      transformResponse: unwrap<PaginatedResponse<OrderView>>,
    }),
    getMerchantOrder: builder.query<OrderDetailView, string>({
      query: (id) => ({ url: `/orders/${id}`, method: "GET" }),
      providesTags: (_r, _e, id) => [{ type: MERCHANT_TAGS.ORDER, id }],
      transformResponse: unwrap<OrderDetailView>,
    }),
    listOutstanding: builder.query<PaginatedResponse<OutstandingBalanceView>, Params<PaginationQueryDTO> | void>({
      query: (params) => ({ url: "/outstanding", method: "GET", params: params ?? {} }),
      providesTags: [{ type: MERCHANT_TAGS.OUTSTANDING }],
      transformResponse: unwrap<PaginatedResponse<OutstandingBalanceView>>,
    }),

    /* -------------------------------- payouts ------------------------------- */
    getMerchantBalance: builder.query<MerchantBalanceView, void>({
      query: () => ({ url: "/balance", method: "GET" }),
      providesTags: [{ type: MERCHANT_TAGS.BALANCE }],
      transformResponse: unwrap<MerchantBalanceView>,
    }),
    listMerchantPayouts: builder.query<PaginatedResponse<PayoutView>, Params<ListPayoutsQueryDTO> | void>({
      query: (params) => ({ url: "/payouts", method: "GET", params: params ?? {} }),
      providesTags: [{ type: MERCHANT_TAGS.PAYOUTS }],
      transformResponse: unwrap<PaginatedResponse<PayoutView>>,
    }),
    requestPayout: builder.mutation<PayoutView, { amountKobo: number }>({
      query: (body) => ({ url: "/payouts", method: "POST", body }),
      invalidatesTags: [
        { type: MERCHANT_TAGS.PAYOUTS },
        { type: MERCHANT_TAGS.BALANCE },
        { type: MERCHANT_TAGS.DASHBOARD },
      ],
      transformResponse: unwrap<PayoutView>,
    }),

    /* -------------------------------- profile ------------------------------- */
    getMerchantProfile: builder.query<MerchantView, void>({
      query: () => ({ url: "/profile", method: "GET" }),
      providesTags: [{ type: MERCHANT_TAGS.PROFILE }],
      transformResponse: unwrap<MerchantView>,
    }),
    updateMerchantProfile: builder.mutation<MerchantView, UpdateMerchantProfileDTO>({
      query: (body) => ({ url: "/profile", method: "PATCH", body }),
      invalidatesTags: [{ type: MERCHANT_TAGS.PROFILE }],
      transformResponse: unwrap<MerchantView>,
    }),
  }),
});

export const {
  useGetMerchantDashboardQuery,
  useListMerchantProductsQuery,
  useCreateMerchantProductMutation,
  useUpdateMerchantProductMutation,
  useDeleteMerchantProductMutation,
  useListMerchantOrdersQuery,
  useGetMerchantOrderQuery,
  useListOutstandingQuery,
  useGetMerchantBalanceQuery,
  useListMerchantPayoutsQuery,
  useRequestPayoutMutation,
  useGetMerchantProfileQuery,
  useUpdateMerchantProfileMutation,
} = merchantApi;

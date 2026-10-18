import type { CheckoutDTO, ListOrdersQueryDTO, ListPaymentsQueryDTO } from '@tranche/shared';

import type {
  CheckoutResponse,
  CustomerSummaryView,
  OrderDetailView,
  OrderView,
  PaginatedResponse,
  PaymentAttemptView,
  PaymentMethodView,
  PaymentVerificationView,
  PaymentView,
} from '../../../types/api';
import { unwrap } from '../unwrap';
import { CUSTOMER_TAGS, customerApiSlice } from './customerApiSlice';

/** Anything that moves money refreshes every money view. */
const MONEY_TAGS = [
  CUSTOMER_TAGS.SUMMARY,
  CUSTOMER_TAGS.ORDERS,
  CUSTOMER_TAGS.ORDER,
  CUSTOMER_TAGS.PAYMENTS,
  CUSTOMER_TAGS.PAYMENT_METHODS,
  CUSTOMER_TAGS.PRODUCTS,
];

export const orderApi = customerApiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getSummary: builder.query<CustomerSummaryView, void>({
      query: () => ({ url: '/summary', method: 'GET' }),
      providesTags: [CUSTOMER_TAGS.SUMMARY],
      transformResponse: unwrap<CustomerSummaryView>,
    }),
    listOrders: builder.query<PaginatedResponse<OrderView>, Partial<ListOrdersQueryDTO> | void>({
      query: (params) => ({ url: '/orders', method: 'GET', params: params ?? {} }),
      providesTags: [CUSTOMER_TAGS.ORDERS],
      transformResponse: unwrap<PaginatedResponse<OrderView>>,
    }),
    getOrder: builder.query<OrderDetailView, string>({
      query: (id) => ({ url: `/orders/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: CUSTOMER_TAGS.ORDER, id }],
      transformResponse: unwrap<OrderDetailView>,
    }),
    checkout: builder.mutation<CheckoutResponse, CheckoutDTO>({
      query: (body) => ({ url: '/checkout', method: 'POST', body }),
      invalidatesTags: MONEY_TAGS,
      transformResponse: unwrap<CheckoutResponse>,
    }),
    payInstallment: builder.mutation<PaymentAttemptView, { installmentId: string; paymentMethodId?: string }>({
      query: ({ installmentId, paymentMethodId }) => ({
        url: `/installments/${installmentId}/pay`,
        method: 'POST',
        body: paymentMethodId ? { paymentMethodId } : {},
      }),
      invalidatesTags: MONEY_TAGS,
      transformResponse: unwrap<PaymentAttemptView>,
    }),
    verifyPayment: builder.mutation<PaymentVerificationView, string>({
      query: (reference) => ({ url: `/payments/verify/${encodeURIComponent(reference)}`, method: 'GET' }),
      invalidatesTags: MONEY_TAGS,
      transformResponse: unwrap<PaymentVerificationView>,
    }),
    listPayments: builder.query<PaginatedResponse<PaymentView>, Partial<ListPaymentsQueryDTO> | void>({
      query: (params) => ({ url: '/payments', method: 'GET', params: params ?? {} }),
      providesTags: [CUSTOMER_TAGS.PAYMENTS],
      transformResponse: unwrap<PaginatedResponse<PaymentView>>,
    }),
    listPaymentMethods: builder.query<PaymentMethodView[], void>({
      query: () => ({ url: '/payment-methods', method: 'GET' }),
      providesTags: [CUSTOMER_TAGS.PAYMENT_METHODS],
      transformResponse: unwrap<PaymentMethodView[]>,
    }),
    setDefaultPaymentMethod: builder.mutation<PaymentMethodView[], string>({
      query: (id) => ({ url: `/payment-methods/${id}/default`, method: 'PATCH' }),
      invalidatesTags: [CUSTOMER_TAGS.PAYMENT_METHODS],
      transformResponse: unwrap<PaymentMethodView[]>,
    }),
    removePaymentMethod: builder.mutation<PaymentMethodView[], string>({
      query: (id) => ({ url: `/payment-methods/${id}`, method: 'DELETE' }),
      invalidatesTags: [CUSTOMER_TAGS.PAYMENT_METHODS],
      transformResponse: unwrap<PaymentMethodView[]>,
    }),
  }),
});

export const {
  useGetSummaryQuery,
  useListOrdersQuery,
  useGetOrderQuery,
  useCheckoutMutation,
  usePayInstallmentMutation,
  useVerifyPaymentMutation,
  useListPaymentsQuery,
  useListPaymentMethodsQuery,
  useSetDefaultPaymentMethodMutation,
  useRemovePaymentMethodMutation,
} = orderApi;

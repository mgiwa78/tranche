import { createApi } from '@reduxjs/toolkit/query/react';

import { generateCustomBaseQuery } from '../base-query';

export const CUSTOMER_TAGS = {
  PRODUCTS: 'Products',
  STORES: 'Stores',
  SUMMARY: 'Summary',
  ORDERS: 'Orders',
  ORDER: 'Order',
  PAYMENTS: 'Payments',
  PAYMENT_METHODS: 'PaymentMethods',
} as const;

type CustomerTag = (typeof CUSTOMER_TAGS)[keyof typeof CUSTOMER_TAGS];

export const customerApiSlice = createApi({
  reducerPath: 'customerApi',
  baseQuery: generateCustomBaseQuery('/customer'),
  tagTypes: Object.values(CUSTOMER_TAGS) as CustomerTag[],
  endpoints: () => ({}),
});

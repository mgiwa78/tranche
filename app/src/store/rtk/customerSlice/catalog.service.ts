import type { ListProductsQueryDTO } from '@tranche/shared';

import type { PaginatedResponse, ProductView, Store } from '../../../types/api';
import { unwrap } from '../unwrap';
import { CUSTOMER_TAGS, customerApiSlice } from './customerApiSlice';

export const catalogApi = customerApiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    listProducts: builder.query<PaginatedResponse<ProductView>, Partial<ListProductsQueryDTO>>({
      query: (params) => ({ url: '/products', method: 'GET', params }),
      providesTags: [CUSTOMER_TAGS.PRODUCTS],
      transformResponse: unwrap<PaginatedResponse<ProductView>>,
    }),
    getProduct: builder.query<ProductView, string>({
      query: (id) => ({ url: `/products/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: CUSTOMER_TAGS.PRODUCTS, id }],
      transformResponse: unwrap<ProductView>,
    }),
    listStores: builder.query<Store[], void>({
      query: () => ({ url: '/stores', method: 'GET' }),
      providesTags: [CUSTOMER_TAGS.STORES],
      transformResponse: unwrap<Store[]>,
    }),
  }),
});

export const { useListProductsQuery, useGetProductQuery, useListStoresQuery } = catalogApi;

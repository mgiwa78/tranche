import { createApi } from "@reduxjs/toolkit/query/react";
import { generateCustomBaseQuery } from "@/store/rtk/base-query";

export const MERCHANT_TAGS = {
  DASHBOARD: "MerchantDashboard",
  PRODUCTS: "MerchantProducts",
  PRODUCT: "MerchantProduct",
  ORDERS: "MerchantOrders",
  ORDER: "MerchantOrder",
  OUTSTANDING: "MerchantOutstanding",
  PAYOUTS: "MerchantPayouts",
  BALANCE: "MerchantBalance",
  PROFILE: "MerchantProfile",
} as const;

type MerchantTag = (typeof MERCHANT_TAGS)[keyof typeof MERCHANT_TAGS];

export const merchantApiSlice = createApi({
  reducerPath: "merchantApi",
  baseQuery: generateCustomBaseQuery("/merchant"),
  tagTypes: Object.values(MERCHANT_TAGS) as MerchantTag[],
  endpoints: () => ({}),
});

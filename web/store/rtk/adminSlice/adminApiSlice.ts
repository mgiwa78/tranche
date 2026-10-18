import { createApi } from "@reduxjs/toolkit/query/react";
import { generateCustomBaseQuery } from "@/store/rtk/base-query";

export const ADMIN_TAGS = {
  DASHBOARD: "AdminDashboard",
  MERCHANTS: "AdminMerchants",
  MERCHANT: "AdminMerchant",
  CUSTOMERS: "AdminCustomers",
  CUSTOMER: "AdminCustomer",
  ORDERS: "AdminOrders",
  ORDER: "AdminOrder",
  PAYOUTS: "AdminPayouts",
  LEDGER: "AdminLedger",
  WEBHOOKS: "AdminWebhooks",
  AUDIT_LOGS: "AdminAuditLogs",
  SETTINGS: "AdminSettings",
} as const;

type AdminTag = (typeof ADMIN_TAGS)[keyof typeof ADMIN_TAGS];

export const adminApiSlice = createApi({
  reducerPath: "adminApi",
  baseQuery: generateCustomBaseQuery("/admin"),
  tagTypes: Object.values(ADMIN_TAGS) as AdminTag[],
  endpoints: () => ({}),
});

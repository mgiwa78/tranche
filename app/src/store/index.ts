export { store, resetApiState } from './store';
export type { RootState, AppDispatch } from './store';
export { useAppDispatch, useAppSelector } from './hooks';
export { generateCustomBaseQuery, type CustomBaseQuery, type CustomError } from './rtk/base-query';

export { setSession, setTokens, setUser, setSeenOnboarding, hydrateAuth, logOut, loadPersistedAuth } from './slices/authSlice';

export {
  setAppearance,
  setPushEnabled,
  hydrateSettings,
  loadPersistedSettings,
  APPEARANCE_OPTIONS,
  type AppearanceMode,
} from './slices/settingsSlice';

export {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useLogoutMutation,
} from './rtk/authSlice/auth.service';

export { useListProductsQuery, useGetProductQuery, useListStoresQuery } from './rtk/customerSlice/catalog.service';

export {
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
} from './rtk/customerSlice/order.service';

export {
  useGetAppConfigQuery,
  useRegisterDeviceTokenMutation,
  useUnregisterDeviceTokenMutation,
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
} from './rtk/appSlice/app.service';

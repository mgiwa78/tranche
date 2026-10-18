import type { AppConfigView, NotificationView, PaginatedResponse } from '../../../types/api';
import { unwrap } from '../unwrap';
import { APP_TAGS, appApiSlice } from './appApiSlice';

export type NotificationPage = PaginatedResponse<NotificationView> & { unreadCount: number };

export const appApi = appApiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getAppConfig: builder.query<AppConfigView, void>({
      query: () => ({ url: '/app-config', method: 'GET' }),
      providesTags: [APP_TAGS.CONFIG],
      transformResponse: unwrap<AppConfigView>,
    }),
    registerDeviceToken: builder.mutation<{ registered: boolean }, { platform: 'ios' | 'android'; token: string }>({
      query: (body) => ({ url: '/notifications/device-tokens', method: 'POST', body }),
      transformResponse: unwrap<{ registered: boolean }>,
    }),
    unregisterDeviceToken: builder.mutation<{ unregistered: boolean }, string>({
      query: (token) => ({ url: `/notifications/device-tokens/${encodeURIComponent(token)}`, method: 'DELETE' }),
      transformResponse: unwrap<{ unregistered: boolean }>,
    }),
    listNotifications: builder.query<NotificationPage, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/notifications', method: 'GET', params: params ?? {} }),
      providesTags: [APP_TAGS.NOTIFICATIONS],
      transformResponse: unwrap<NotificationPage>,
    }),
    markAllNotificationsRead: builder.mutation<{ unreadCount: number }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: [APP_TAGS.NOTIFICATIONS],
      transformResponse: unwrap<{ unreadCount: number }>,
    }),
  }),
});

export const {
  useGetAppConfigQuery,
  useRegisterDeviceTokenMutation,
  useUnregisterDeviceTokenMutation,
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
} = appApi;

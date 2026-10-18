import { createApi } from '@reduxjs/toolkit/query/react';

import { generateCustomBaseQuery } from '../base-query';

export const APP_TAGS = {
  CONFIG: 'AppConfig',
  NOTIFICATIONS: 'Notifications',
} as const;

type AppTag = (typeof APP_TAGS)[keyof typeof APP_TAGS];

export const appApiSlice = createApi({
  reducerPath: 'appApi',
  baseQuery: generateCustomBaseQuery(''),
  tagTypes: Object.values(APP_TAGS) as AppTag[],
  endpoints: () => ({}),
});

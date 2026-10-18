import { createApi } from '@reduxjs/toolkit/query/react';

import { generateCustomBaseQuery } from '../base-query';

export const AUTH_TAGS = {
  SESSION: 'AuthSession',
} as const;

type AuthTag = (typeof AUTH_TAGS)[keyof typeof AUTH_TAGS];

export const authApiSlice = createApi({
  reducerPath: 'authApi',
  baseQuery: generateCustomBaseQuery('/auth'),
  tagTypes: Object.values(AUTH_TAGS) as AuthTag[],
  endpoints: () => ({}),
});

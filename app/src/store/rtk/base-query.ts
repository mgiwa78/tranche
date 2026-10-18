import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

import { API_ROOT } from '../../config/env';
import type { AuthResponse as RefreshResponse } from '../../types/api';
import { logOut, setTokens } from '../slices/authSlice';
import type { RootState } from '../store';

export type CustomError = FetchBaseQueryError;
export type CustomBaseQuery = BaseQueryFn<string | FetchArgs, unknown, CustomError>;

type Dispatch = (action: unknown) => unknown;

function prepareHeaders(headers: Headers, { getState }: { getState: () => unknown }) {
  const token = (getState() as RootState).auth.accessToken;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

let inFlightRefresh: Promise<string | null> | null = null;

async function requestRefresh(refreshToken: string): Promise<RefreshResponse | null | 'rejected'> {
  try {
    const res = await fetch(`${API_ROOT}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (res.status >= 400 && res.status < 500) return 'rejected';
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: RefreshResponse };
    return json.response ?? null;
  } catch {
    return null;
  }
}

export function refreshAccessToken(getState: () => unknown, dispatch: Dispatch): Promise<string | null> {
  if (!inFlightRefresh) {
    const refreshToken = (getState() as RootState).auth.refreshToken;
    inFlightRefresh = (async () => {
      if (!refreshToken) {
        dispatch(logOut());
        return null;
      }
      const result = await requestRefresh(refreshToken);
      if (result === 'rejected') {
        dispatch(logOut());
        return null;
      }
      if (!result) return null;
      dispatch(setTokens(result));
      return result.accessToken;
    })().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

export function generateCustomBaseQuery(prefix: string): CustomBaseQuery {
  const rawBaseQuery = fetchBaseQuery({ baseUrl: `${API_ROOT}${prefix}`, prepareHeaders });

  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401 && (api.getState() as RootState).auth.refreshToken) {
      const token = await refreshAccessToken(api.getState, api.dispatch);
      if (token) result = await rawBaseQuery(args, api, extraOptions);
    }

    return result;
  };
}

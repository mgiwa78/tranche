import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store/store";
import { logOut, setTokens } from "@/store/slices/authSlice";
import type { AuthResponse as RefreshResponse } from "@/types/global";

const API_ROOT = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export type CustomError = FetchBaseQueryError;
export type CustomBaseQuery = BaseQueryFn<string | FetchArgs, unknown, CustomError>;

function prepareHeaders(headers: Headers, { getState }: { getState: () => unknown }) {
  const token = (getState() as RootState).auth.accessToken;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

let inFlightRefresh: Promise<RefreshResponse | null> | null = null;

async function refreshTokens(refreshToken: string): Promise<RefreshResponse | null> {
  try {
    const res = await fetch(`${API_ROOT}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: RefreshResponse };
    return json.response ?? null;
  } catch {
    return null;
  }
}

function forceLogout() {
  if (typeof window === "undefined") return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.assign(`/auth/login?reason=session_timeout&next=${next}`);
}

/**
 * `generateCustomBaseQuery(prefix)`: one base query per RTK Query domain, sharing the auth header
 * and the 401 refresh-and-retry.
 */
export function generateCustomBaseQuery(prefix: string): CustomBaseQuery {
  const rawBaseQuery = fetchBaseQuery({ baseUrl: `${API_ROOT}${prefix}`, prepareHeaders });

  return async (args, api, extraOptions) => {
    let result = await rawBaseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
      const state = api.getState() as RootState;
      const refreshToken = state.auth.refreshToken;

      if (!refreshToken) {
        api.dispatch(logOut());
        forceLogout();
        return result;
      }

      if (!inFlightRefresh) {
        inFlightRefresh = refreshTokens(refreshToken).finally(() => {
          inFlightRefresh = null;
        });
      }

      const refreshed = await inFlightRefresh;

      if (refreshed) {
        api.dispatch(setTokens(refreshed));
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logOut());
        forceLogout();
      }
    }

    return result;
  };
}

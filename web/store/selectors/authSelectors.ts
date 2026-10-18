import { UserRole } from "@tranche/shared";
import type { RootState } from "@/store/store";

export const selectAuth = (state: RootState) => state.auth;
export const selectAccessToken = (state: RootState) => state.auth.accessToken;
export const selectRefreshToken = (state: RootState) => state.auth.refreshToken;
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => Boolean(state.auth.accessToken && state.auth.user);
export const selectRole = (state: RootState) => state.auth.user?.role ?? null;
export const selectIsAdmin = (state: RootState) =>
  state.auth.user?.role === UserRole.ADMIN && Boolean(state.auth.user?.adminRole);
export const selectIsMerchant = (state: RootState) => state.auth.user?.role === UserRole.MERCHANT;
export const selectAuthHydrated = (state: RootState) => state.auth.hydrated;
export const selectAdminRole = (state: RootState) => state.auth.user?.adminRole ?? null;
export const selectMerchant = (state: RootState) => state.auth.user?.merchant ?? null;

/** Where a signed-in user lands. */
export const homeFor = (role: UserRole | null | undefined) =>
  role === UserRole.ADMIN ? "/admin/dashboard" : role === UserRole.MERCHANT ? "/merchant/dashboard" : "/";

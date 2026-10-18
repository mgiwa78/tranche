import type { ChangePasswordDTO, LoginDTO, RegisterMerchantDTO, UpdateProfileDTO } from "@tranche/shared";
import type { AuthResponse, Me } from "@/types/global";
import { AUTH_TAGS, authApiSlice } from "./authApiSlice";

export const authApi = authApiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginDTO>({
      query: (body) => ({ url: "/login", method: "POST", body }),
      transformResponse: (res: { response: AuthResponse }) => res.response,
    }),
    registerMerchant: builder.mutation<AuthResponse, RegisterMerchantDTO>({
      query: (body) => ({ url: "/register/merchant", method: "POST", body }),
      transformResponse: (res: { response: AuthResponse }) => res.response,
    }),
    getMe: builder.query<Me, void>({
      query: () => ({ url: "/me", method: "GET" }),
      providesTags: [{ type: AUTH_TAGS.SESSION }],
      transformResponse: (res: { response: Me }) => res.response,
    }),
    updateMe: builder.mutation<Me, UpdateProfileDTO>({
      query: (body) => ({ url: "/me", method: "PATCH", body }),
      invalidatesTags: [{ type: AUTH_TAGS.SESSION }],
      transformResponse: (res: { response: Me }) => res.response,
    }),
    changePassword: builder.mutation<AuthResponse, ChangePasswordDTO>({
      query: (body) => ({ url: "/change-password", method: "POST", body }),
      transformResponse: (res: { response: AuthResponse }) => res.response,
    }),
    logout: builder.mutation<{ loggedOut: boolean }, { refreshToken: string }>({
      query: (body) => ({ url: "/logout", method: "POST", body }),
      transformResponse: (res: { response: { loggedOut: boolean } }) => res.response,
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMerchantMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApi;

import type { ChangePasswordDTO, LoginDTO, RegisterCustomerDTO, UpdateProfileDTO } from '@tranche/shared';

import type { AuthResponse, MeView } from '../../../types/api';
import { unwrap } from '../unwrap';
import { AUTH_TAGS, authApiSlice } from './authApiSlice';

export const authApi = authApiSlice.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, RegisterCustomerDTO>({
      query: (body) => ({ url: '/register', method: 'POST', body }),
      transformResponse: unwrap<AuthResponse>,
    }),
    login: builder.mutation<AuthResponse, LoginDTO>({
      query: (body) => ({ url: '/login', method: 'POST', body }),
      transformResponse: unwrap<AuthResponse>,
    }),
    getMe: builder.query<MeView, void>({
      query: () => ({ url: '/me', method: 'GET' }),
      providesTags: [AUTH_TAGS.SESSION],
      transformResponse: unwrap<MeView>,
    }),
    updateMe: builder.mutation<MeView, UpdateProfileDTO>({
      query: (body) => ({ url: '/me', method: 'PATCH', body }),
      invalidatesTags: [AUTH_TAGS.SESSION],
      transformResponse: unwrap<MeView>,
    }),
    changePassword: builder.mutation<AuthResponse, ChangePasswordDTO>({
      query: (body) => ({ url: '/change-password', method: 'POST', body }),
      transformResponse: unwrap<AuthResponse>,
    }),
    logout: builder.mutation<{ loggedOut: boolean }, { refreshToken: string }>({
      query: (body) => ({ url: '/logout', method: 'POST', body }),
      transformResponse: unwrap<{ loggedOut: boolean }>,
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApi;

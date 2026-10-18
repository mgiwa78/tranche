import { unregisterPush } from '../lib/push';
import { authApi } from '../store/rtk/authSlice/auth.service';
import { logOut } from '../store/slices/authSlice';
import { resetApiState, type AppDispatch, type RootState } from '../store/store';

export async function signOut(dispatch: AppDispatch, getState: () => RootState) {
  const { refreshToken } = getState().auth;
  await unregisterPush(dispatch);
  if (refreshToken) {
    try {
      await dispatch(authApi.endpoints.logout.initiate({ refreshToken })).unwrap();
    } catch {}
  }
  dispatch(logOut());
  resetApiState();
}

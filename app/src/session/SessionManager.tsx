import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onPushOpened, onPushReceived, registerForPush, unregisterPush } from '../lib/push';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { APP_TAGS, appApiSlice } from '../store/rtk/appSlice/appApiSlice';
import { authApi } from '../store/rtk/authSlice/auth.service';
import { CUSTOMER_TAGS, customerApiSlice } from '../store/rtk/customerSlice/customerApiSlice';
import { setUser } from '../store/slices/authSlice';

/**
 * Renders nothing. While a shopper is signed in it keeps the profile fresh, registers the
 * device for payment reminders, routes notification taps to the right order, and refreshes
 * money views when a push arrives or the app returns to the foreground.
 */
export function SessionManager() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const pushEnabled = useAppSelector((s) => s.settings.pushEnabled);
  const userId = useAppSelector((s) => (s.auth.isAuthenticated && s.auth.accessToken ? s.auth.userId : null));

  useEffect(() => {
    if (!hydrated || !userId) return;
    let cancelled = false;

    void dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }))
      .unwrap()
      .then((me) => {
        if (!cancelled) dispatch(setUser(me));
      })
      .catch(() => {});

    const refreshMoney = () => {
      dispatch(
        customerApiSlice.util.invalidateTags([CUSTOMER_TAGS.SUMMARY, CUSTOMER_TAGS.ORDERS, CUSTOMER_TAGS.ORDER, CUSTOMER_TAGS.PAYMENTS]),
      );
      dispatch(appApiSlice.util.invalidateTags([APP_TAGS.NOTIFICATIONS]));
    };

    const stopOpened = onPushOpened((data) => {
      refreshMoney();
      if (data.orderId) router.push({ pathname: '/order/[id]', params: { id: data.orderId } });
    });
    const stopReceived = onPushReceived(refreshMoney);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshMoney();
    });

    return () => {
      cancelled = true;
      stopOpened();
      stopReceived();
      appState.remove();
    };
  }, [hydrated, userId, dispatch, router]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    if (pushEnabled) void registerForPush(dispatch);
    else void unregisterPush(dispatch);
  }, [hydrated, userId, pushEnabled, dispatch]);

  return null;
}

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { appApi } from '../store/rtk/appSlice/app.service';
import type { AppDispatch } from '../store/store';
import { isExpoGo } from './runtime';

let registeredToken: string | null = null;

// Show reminders and receipts even when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('payments', {
    name: 'Payments and reminders',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#C8F531',
  });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

export async function pushPermissionGranted(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Asks for permission, gets an Expo push token and registers it with the api. Never throws:
 * simulators, Expo Go on Android and builds without an EAS project id just skip push and
 * rely on the in-app inbox.
 */
export async function registerForPush(dispatch: AppDispatch): Promise<'registered' | 'denied' | 'unavailable'> {
  try {
    if (!Device.isDevice || (isExpoGo && Platform.OS === 'android')) return 'unavailable';
    await ensureChannel();
    const existing = await Notifications.getPermissionsAsync();
    const status = existing.status === 'granted' ? 'granted' : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return 'denied';

    const id = projectId();
    if (!id) return 'unavailable';
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await dispatch(
      appApi.endpoints.registerDeviceToken.initiate({ platform: Platform.OS === 'ios' ? 'ios' : 'android', token }),
    ).unwrap();
    registeredToken = token;
    return 'registered';
  } catch {
    return 'unavailable';
  }
}

export async function unregisterPush(dispatch: AppDispatch) {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  try {
    await dispatch(appApi.endpoints.unregisterDeviceToken.initiate(token)).unwrap();
  } catch {}
}

export type PushData = { type?: string; orderId?: string; installmentId?: string };

/** Calls `handler` when the user taps a notification (including the one that launched the app). */
export function onPushOpened(handler: (data: PushData) => void): () => void {
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) handler((response.notification.request.content.data ?? {}) as PushData);
  });
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    handler((response.notification.request.content.data ?? {}) as PushData);
  });
  return () => sub.remove();
}

/** Calls `handler` when a notification arrives while the app is in the foreground. */
export function onPushReceived(handler: (data: PushData) => void): () => void {
  const sub = Notifications.addNotificationReceivedListener((n) => handler((n.request.content.data ?? {}) as PushData));
  return () => sub.remove();
}

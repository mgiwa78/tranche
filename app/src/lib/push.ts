import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { appApi } from '../store/rtk/appSlice/app.service';
import type { AppDispatch } from '../store/store';
import { isExpoGo } from './runtime';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Expo Go on Android has no remote-push native module since SDK 53, and importing
 * expo-notifications there throws at load time. So the module is required lazily, only where
 * it exists (development/production builds, and Expo Go on iOS). Elsewhere push is a no-op
 * and reminders still arrive in the Activity inbox.
 */
export const pushSupported = !(isExpoGo && Platform.OS === 'android');

let cached: NotificationsModule | null | undefined;

function notifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (!pushSupported) return (cached = null);
  try {
    const mod = require('expo-notifications') as NotificationsModule;
    // Show reminders and receipts even when the app is open.
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch {
    cached = null;
  }
  return cached;
}

let registeredToken: string | null = null;

async function ensureChannel(n: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await n.setNotificationChannelAsync('payments', {
    name: 'Payments and reminders',
    importance: n.AndroidImportance.HIGH,
    lightColor: '#C8F531',
  });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

export async function pushPermissionGranted(): Promise<boolean> {
  const n = notifications();
  if (!n) return false;
  try {
    const { status } = await n.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Asks for permission, gets an Expo push token and registers it with the api. Never throws:
 * simulators, Expo Go on Android and builds without an EAS project id just skip push and
 * rely on the in-app inbox.
 */
export async function registerForPush(dispatch: AppDispatch): Promise<'registered' | 'denied' | 'unavailable'> {
  const n = notifications();
  if (!n || !Device.isDevice) return 'unavailable';
  try {
    await ensureChannel(n);
    const existing = await n.getPermissionsAsync();
    const status = existing.status === 'granted' ? 'granted' : (await n.requestPermissionsAsync()).status;
    if (status !== 'granted') return 'denied';

    const id = projectId();
    if (!id) return 'unavailable';
    const { data: token } = await n.getExpoPushTokenAsync({ projectId: id });
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
  const n = notifications();
  if (!n) return () => {};
  void n
    .getLastNotificationResponseAsync()
    .then((response) => {
      if (response) handler((response.notification.request.content.data ?? {}) as PushData);
    })
    .catch(() => {});
  const sub = n.addNotificationResponseReceivedListener((response) => {
    handler((response.notification.request.content.data ?? {}) as PushData);
  });
  return () => sub.remove();
}

/** Calls `handler` when a notification arrives while the app is in the foreground. */
export function onPushReceived(handler: (data: PushData) => void): () => void {
  const n = notifications();
  if (!n) return () => {};
  const sub = n.addNotificationReceivedListener((notification) =>
    handler((notification.request.content.data ?? {}) as PushData),
  );
  return () => sub.remove();
}

import Constants from 'expo-constants';
import React, { type ReactNode } from 'react';
import { Linking, View } from 'react-native';

import { EmptyState } from '../components/EmptyState';
import { STORE_URL } from '../config/env';
import { useGetAppConfigQuery } from '../store/rtk/appSlice/app.service';
import { Button, Screen } from '../ui';

function versionBelow(current: string, minimum: string | null | undefined): boolean {
  if (!minimum) return false;
  const a = current.split('.').map((n) => parseInt(n, 10) || 0);
  const b = minimum.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return false;
}

/** Forced update and maintenance screens, driven by GET /app-config (polled every 5 minutes). */
export function AppConfigGate({ children }: { children: ReactNode }) {
  const { data: config, refetch, isFetching } = useGetAppConfigQuery(undefined, {
    pollingInterval: 5 * 60 * 1000,
    refetchOnReconnect: true,
  });
  const version = Constants.expoConfig?.version ?? '0.0.0';

  if (config && versionBelow(version, config.minAppVersion)) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="alert"
            title="Update Tranche"
            body="This version is no longer supported. Update to keep paying and shopping."
            actions={<Button label="Update" onPress={() => void Linking.openURL(STORE_URL)} />}
          />
        </View>
      </Screen>
    );
  }

  if (config?.maintenanceMode) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="info"
            title="Back soon"
            body="Tranche is down for scheduled maintenance. No payment will be taken until we're back, and nothing becomes overdue."
            actions={<Button label="Try again" variant="secondary" loading={isFetching} onPress={() => void refetch()} />}
          />
        </View>
      </Screen>
    );
  }

  return <>{children}</>;
}

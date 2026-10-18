import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { TabBar, type TabBarProps } from '../../src/components/TabBar';
import { useAppSelector } from '../../src/store/hooks';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function TabLayout() {
  const { colors } = useTheme();
  const signedIn = useAppSelector((s) => s.auth.isAuthenticated && !!s.auth.accessToken);

  if (!signedIn) return <Redirect href="/auth/login" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="plans" options={{ title: 'Plans' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}

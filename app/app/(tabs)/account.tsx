import { formatNaira } from '@tranche/shared';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Linking, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useStore } from 'react-redux';

import { SUPPORT_EMAIL } from '../../src/config/env';
import { signOut } from '../../src/session/signOut';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { useGetSummaryQuery, useListPaymentMethodsQuery } from '../../src/store/rtk/customerSlice/order.service';
import { APPEARANCE_OPTIONS } from '../../src/store/slices/settingsSlice';
import type { RootState } from '../../src/store/store';
import { gutter } from '../../src/theme/tokens';
import { Avatar, LargeTitle, ListGroup, ListRow, Screen, TabHeader, Text } from '../../src/ui';

export default function AccountScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const user = useAppSelector((s) => s.auth.user);
  const appearance = useAppSelector((s) => s.settings.appearance);
  const pushEnabled = useAppSelector((s) => s.settings.pushEnabled);
  const { data: summary } = useGetSummaryQuery();
  const { data: cards } = useListPaymentMethodsQuery();
  const name = user ? `${user.firstName} ${user.lastName}` : '';

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'Your plans keep running and reminders still arrive by email.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut(dispatch, store.getState);
          router.replace('/auth/login');
        },
      },
    ]);

  return (
    <Screen>
      <TabHeader title="Account" scrollY={scrollY} />
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 32 }}>
        <LargeTitle>Account</LargeTitle>
        <View style={{ paddingHorizontal: gutter }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <Avatar name={name || 'You'} seed={user?.id ?? 'me'} size={56} />
            <View style={{ flex: 1 }}>
              <Text variant="title3">{name}</Text>
              <Text variant="subhead" color="ink3">
                {user?.email}
              </Text>
            </View>
          </View>

          <ListGroup header="Spending" footer="Only what you haven't paid yet counts against your limit.">
            <ListRow label="Spending limit" value={summary ? formatNaira(summary.creditLimitKobo) : '…'} icon="shield" />
            <ListRow label="Available" value={summary ? formatNaira(summary.availableCreditKobo) : '…'} icon="wallet" />
          </ListGroup>

          <ListGroup header="Payments" inset={60}>
            <ListRow
              label="Cards"
              icon="card"
              value={cards?.length ? `${cards.length} saved` : 'None yet'}
              onPress={() => router.push('/settings/payment-methods')}
            />
          </ListGroup>

          <ListGroup header="Preferences" inset={60}>
            <ListRow
              label="Notifications"
              icon="bell"
              value={pushEnabled ? 'On' : 'Off'}
              onPress={() => router.push('/settings/notifications')}
            />
            <ListRow
              label="Appearance"
              icon="moon"
              value={APPEARANCE_OPTIONS.find((o) => o.key === appearance)?.label}
              onPress={() => router.push('/settings/appearance')}
            />
            <ListRow label="Profile" icon="user" onPress={() => router.push('/settings/profile')} />
          </ListGroup>

          <ListGroup header="Help" inset={60}>
            <ListRow label="Contact support" icon="mail" onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
            <ListRow label="Terms" icon="doc" onPress={() => router.push('/settings/terms')} />
            <ListRow label="Privacy" icon="shield" onPress={() => router.push('/settings/privacy')} />
          </ListGroup>

          <ListGroup>
            <ListRow label="Sign out" tone="danger" icon="logout" onPress={confirmSignOut} accessory={{ type: 'none' }} />
          </ListGroup>
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}

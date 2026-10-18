import { formatNaira, NotificationType, PaymentStatus } from '@tranche/shared';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { EmptyState } from '../../src/components/EmptyState';
import { useTabBarBottomInset } from '../../src/components/FloatingTabBar';
import { cardLabel, shortDate, timeAgo } from '../../src/lib/format';
import { useListNotificationsQuery, useMarkAllNotificationsReadMutation } from '../../src/store/rtk/appSlice/app.service';
import { useListPaymentsQuery } from '../../src/store/rtk/customerSlice/order.service';
import { useTheme } from '../../src/theme/ThemeProvider';
import { gutter } from '../../src/theme/tokens';
import { Icon, type IconName, IconButton, LargeTitle, ListGroup, ListRow, Screen, Segmented, Spinner, TabHeader, Text } from '../../src/ui';

type Tab = 'inbox' | 'payments';

const NOTIFICATION_ICON: Partial<Record<NotificationType, IconName>> = {
  [NotificationType.PAYMENT_RECEIVED]: 'check',
  [NotificationType.ORDER_COMPLETED]: 'check',
  [NotificationType.PAYMENT_FAILED]: 'alert',
  [NotificationType.INSTALLMENT_OVERDUE]: 'alert',
  [NotificationType.INSTALLMENT_DUE_SOON]: 'calendar',
  [NotificationType.INSTALLMENT_DUE_TODAY]: 'calendar',
};

export default function ActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bottom = useTabBarBottomInset();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const [tab, setTab] = useState<Tab>('inbox');
  const inbox = useListNotificationsQuery({ limit: 50 });
  const payments = useListPaymentsQuery({ limit: 50 });
  const [markAll] = useMarkAllNotificationsReadMutation();
  const unread = inbox.data?.unreadCount ?? 0;
  const active = tab === 'inbox' ? inbox : payments;

  return (
    <Screen>
      <TabHeader
        title="Activity"
        scrollY={scrollY}
        actions={
          tab === 'inbox' && unread > 0 ? (
            <IconButton icon="check" label="Mark all as read" onPress={() => void markAll()} />
          ) : undefined
        }
      />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottom + 16 }}
        refreshControl={
          <RefreshControl refreshing={active.isFetching && !active.isLoading} onRefresh={() => void active.refetch()} tintColor={colors.ink3} />
        }
      >
        <LargeTitle subtitle={unread ? <Text color="ink3">{unread} new</Text> : undefined}>Activity</LargeTitle>
        <View style={{ paddingHorizontal: gutter, marginBottom: 18 }}>
          <Segmented
            options={[
              { key: 'inbox', label: 'Updates' },
              { key: 'payments', label: 'Payments' },
            ]}
            selected={tab}
            onSelect={setTab}
          />
        </View>

        <View style={{ paddingHorizontal: gutter }}>
          {active.isLoading ? (
            <View style={{ paddingTop: 40, alignItems: 'center' }}>
              <Spinner />
            </View>
          ) : tab === 'inbox' ? (
            (inbox.data?.data ?? []).length === 0 ? (
              <EmptyState icon="bell" title="No updates yet" body="Reminders before each payment and receipts after land here." />
            ) : (
              <ListGroup inset={60}>
                {(inbox.data?.data ?? []).map((n) => (
                  <ListRow
                    key={n.id}
                    label={n.title}
                    hint={`${n.body}\n${timeAgo(n.createdAt)}`}
                    leading={
                      <View style={{ width: 30, alignItems: 'center' }}>
                        <Icon
                          name={NOTIFICATION_ICON[n.type] ?? 'bell'}
                          size={19}
                          color={n.type === NotificationType.PAYMENT_FAILED || n.type === NotificationType.INSTALLMENT_OVERDUE ? colors.warn : colors.accentInk}
                        />
                        {!n.readAt ? <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 }} /> : null}
                      </View>
                    }
                    onPress={n.data?.orderId ? () => router.push({ pathname: '/order/[id]', params: { id: n.data!.orderId } }) : undefined}
                  />
                ))}
              </ListGroup>
            )
          ) : (payments.data?.data ?? []).length === 0 ? (
            <EmptyState icon="receipt" title="No payments yet" body="Every payment you make shows up here." />
          ) : (
            <ListGroup>
              {(payments.data?.data ?? []).map((p) => (
                <ListRow
                  key={p.id}
                  label={formatNaira(p.amountKobo, { exact: true })}
                  hint={`${p.cardLast4 ? cardLabel('card', p.cardLast4) : 'Checkout'} · ${shortDate(p.paidAt ?? p.createdAt)}`}
                  value={p.status === PaymentStatus.SUCCESS ? 'Paid' : p.status === PaymentStatus.FAILED ? 'Failed' : p.status === PaymentStatus.PENDING ? 'Pending' : 'Not completed'}
                  onPress={() => router.push({ pathname: '/order/[id]', params: { id: p.orderId } })}
                />
              ))}
            </ListGroup>
          )}
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}

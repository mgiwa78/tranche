import { formatNaira, OrderStatus } from '@tranche/shared';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { EmptyState } from '../../src/components/EmptyState';
import { useTabBarBottomInset } from '../../src/components/FloatingTabBar';
import { OrderCard } from '../../src/components/money/OrderCard';
import { dueLabel } from '../../src/lib/format';
import { useGetSummaryQuery, useListOrdersQuery } from '../../src/store/rtk/customerSlice/order.service';
import { brand } from '../../src/theme/colors';
import { ThemeScope, useTheme } from '../../src/theme/ThemeProvider';
import { gutter, radius } from '../../src/theme/tokens';
import { Button, LargeTitle, Screen, Segmented, Spinner, TabHeader, Text } from '../../src/ui';

type Filter = 'active' | 'done';

export default function PlansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const bottom = useTabBarBottomInset();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const [filter, setFilter] = useState<Filter>('active');
  const summary = useGetSummaryQuery();
  const orders = useListOrdersQuery({ limit: 50 });

  const all = orders.data?.data ?? [];
  const live = all.filter((o) => [OrderStatus.ACTIVE, OrderStatus.OVERDUE, OrderStatus.PENDING_PAYMENT].includes(o.status));
  const done = all.filter((o) => !live.includes(o));
  const shown = filter === 'active' ? live : done;
  const next = summary.data?.nextDue;

  return (
    <Screen>
      <TabHeader title="Plans" scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottom + 16 }}
        refreshControl={
          <RefreshControl
            refreshing={(orders.isFetching || summary.isFetching) && !orders.isLoading}
            onRefresh={() => {
              void orders.refetch();
              void summary.refetch();
            }}
            tintColor={colors.ink3}
          />
        }
      >
        <LargeTitle>Plans</LargeTitle>

        <ThemeScope scheme="dark">
          <View
            style={{
              marginHorizontal: gutter,
              marginBottom: 24,
              borderRadius: radius.panel,
              backgroundColor: brand.navy,
              padding: 22,
            }}
          >
            <Text variant="subhead" color="rgba(239,244,250,0.6)">
              {next ? 'Next payment' : 'You owe'}
            </Text>
            <Text variant="display" color={brand.paper} tabular style={{ marginTop: 4 }}>
              {formatNaira(next ? next.amountKobo : summary.data?.outstandingKobo ?? 0)}
            </Text>
            <Text variant="subhead" color={next?.status === 'overdue' ? '#F2B95A' : 'rgba(239,244,250,0.72)'} style={{ marginTop: 2 }}>
              {next ? `${dueLabel(next.dueDate)} · ${next.merchantName ?? ''}` : 'Nothing due. Nice.'}
            </Text>
            {summary.data ? (
              <View style={{ flexDirection: 'row', marginTop: 20, gap: 24 }}>
                <View>
                  <Text variant="caption" color="rgba(239,244,250,0.55)">
                    Outstanding
                  </Text>
                  <Text variant="callout" weight="semibold" color={brand.paper} tabular>
                    {formatNaira(summary.data.outstandingKobo)}
                  </Text>
                </View>
                <View>
                  <Text variant="caption" color="rgba(239,244,250,0.55)">
                    Available
                  </Text>
                  <Text variant="callout" weight="semibold" color={brand.paper} tabular>
                    {formatNaira(summary.data.availableCreditKobo)}
                  </Text>
                </View>
              </View>
            ) : null}
            {next ? (
              <Button
                label="Pay now"
                variant="accent"
                size="md"
                style={{ marginTop: 20 }}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: next.orderId } })}
              />
            ) : null}
          </View>
        </ThemeScope>

        <View style={{ paddingHorizontal: gutter, marginBottom: 16 }}>
          <Segmented
            options={[
              { key: 'active', label: `Active${live.length ? ` · ${live.length}` : ''}` },
              { key: 'done', label: 'Finished' },
            ]}
            selected={filter}
            onSelect={setFilter}
          />
        </View>

        {orders.isLoading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Spinner />
          </View>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="layers"
            title={filter === 'active' ? 'No plans running' : 'Nothing finished yet'}
            body={filter === 'active' ? 'Pick something in Shop and split it into four.' : 'Paid-off plans show up here.'}
            actions={
              filter === 'active' ? <Button label="Browse the shop" variant="secondary" onPress={() => router.push('/(tabs)/shop')} /> : undefined
            }
          />
        ) : (
          <View style={{ paddingHorizontal: gutter, gap: 12 }}>
            {shown.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </Screen>
  );
}

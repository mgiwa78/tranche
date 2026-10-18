import { formatNaira, InstallmentStatus, OrderStatus, PLAN_LIST } from '@tranche/shared';
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { Tappable, Text } from '../../ui';
import { dueLabel } from '../../lib/format';
import type { OrderView } from '../../types/api';
import { ProgressSegments } from './Schedule';

const STATUS_COPY: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.PENDING_PAYMENT]: 'Waiting for first payment',
  [OrderStatus.COMPLETED]: 'Paid off',
  [OrderStatus.CANCELLED]: 'Cancelled',
  [OrderStatus.DEFAULTED]: 'In collections',
  [OrderStatus.REFUNDED]: 'Refunded',
};

/** Builds the per-segment statuses from counts the list view returns. */
export function segmentsFor(order: OrderView): InstallmentStatus[] {
  return Array.from({ length: order.installmentCount }, (_, i) =>
    i < order.installmentsPaid
      ? InstallmentStatus.PAID
      : i === order.installmentsPaid && order.status === OrderStatus.OVERDUE
        ? InstallmentStatus.OVERDUE
        : InstallmentStatus.PENDING,
  );
}

export function OrderCard({ order, onPress }: { order: OrderView; onPress: () => void }) {
  const { colors } = useTheme();
  const plan = PLAN_LIST.find((p) => p.code === order.planCode);
  const live = order.status === OrderStatus.ACTIVE || order.status === OrderStatus.OVERDUE;
  const subtitle = live && order.nextDueDate ? dueLabel(order.nextDueDate) : STATUS_COPY[order.status] ?? '';

  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${order.merchantName ?? 'Order'} ${order.reference}, ${order.installmentsPaid} of ${order.installmentCount} paid`}
      style={{
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
        paddingVertical: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="callout" weight="semibold" numberOfLines={1}>
            {order.merchantName ?? 'Order'}
          </Text>
          <Text variant="footnote" color="ink3">
            {plan?.label} · {order.reference}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="callout" weight="semibold" tabular>
            {live ? formatNaira(order.nextDueKobo ?? 0) : formatNaira(order.totalKobo)}
          </Text>
          <Text variant="footnote" color={order.status === OrderStatus.OVERDUE ? 'warn' : 'ink3'}>
            {subtitle}
          </Text>
        </View>
      </View>
      <ProgressSegments statuses={segmentsFor(order)} />
      <Text variant="footnote" color="ink3" tabular>
        {order.installmentsPaid} of {order.installmentCount} paid · {formatNaira(order.outstandingKobo)} left
      </Text>
    </Tappable>
  );
}

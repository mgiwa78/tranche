import { BNPL_PLANS, formatNaira, InstallmentStatus, OrderStatus, PaymentStatus } from '@tranche/shared';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, RefreshControl, View } from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { ProgressSegments, Schedule } from '../../src/components/money/Schedule';
import { usePayFlow } from '../../src/hooks/usePayFlow';
import { errorMessage } from '../../src/lib/apiError';
import { cardLabel, dueLabel, shortDate } from '../../src/lib/format';
import { useGetOrderQuery, useListPaymentMethodsQuery, usePayInstallmentMutation } from '../../src/store/rtk/customerSlice/order.service';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radius } from '../../src/theme/tokens';
import { Button, ListGroup, ListRow, SectionHeader, Spinner, StackPage, Text, haptic } from '../../src/ui';

const PAYABLE = [InstallmentStatus.PENDING, InstallmentStatus.FAILED, InstallmentStatus.OVERDUE];

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: order, isLoading, isFetching, refetch, isError } = useGetOrderQuery(id);
  const { data: cards } = useListPaymentMethodsQuery();
  const [payInstallment, { isLoading: paying }] = usePayInstallmentMutation();
  const { complete, busy } = usePayFlow();
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <StackPage title="Plan">
        <View style={{ paddingTop: 80, alignItems: 'center' }}>
          <Spinner />
        </View>
      </StackPage>
    );
  }
  if (isError || !order) {
    return (
      <StackPage title="Plan">
        <EmptyState icon="alert" title="We couldn't load this plan" actions={<Button label="Retry" variant="secondary" onPress={() => void refetch()} />} />
      </StackPage>
    );
  }

  const next = order.installments.find((i) => PAYABLE.includes(i.status));
  const canPay = next && [OrderStatus.PENDING_PAYMENT, OrderStatus.ACTIVE, OrderStatus.OVERDUE].includes(order.status);
  const defaultCard = cards?.find((c) => c.isDefault) ?? cards?.[0];

  async function payNow(useCard: boolean) {
    if (!next) return;
    setError(null);
    try {
      const attempt = await payInstallment({ installmentId: next.id, paymentMethodId: useCard ? defaultCard?.id : undefined }).unwrap();
      const outcome = await complete(attempt);
      if (outcome.kind === 'paid') haptic.success();
      else if (outcome.kind === 'failed') setError(outcome.message);
      else if (outcome.kind === 'cancelled') setError("Checkout wasn't finished. You haven't been charged.");
      void refetch();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function choosePayment() {
    if (!defaultCard) return void payNow(false);
    Alert.alert(`Pay ${formatNaira(next!.amountKobo)} now?`, undefined, [
      { text: `Use ${cardLabel(defaultCard.brand, defaultCard.last4)}`, onPress: () => void payNow(true) },
      { text: 'Use another card', onPress: () => void payNow(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <StackPage
      title={order.merchantName ?? 'Plan'}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} tintColor={colors.ink3} />}
      footer={
        canPay ? (
          <View style={{ gap: 8 }}>
            {error ? (
              <Text variant="footnote" color="danger" align="center">
                {error}
              </Text>
            ) : null}
            <Button
              label={`Pay ${formatNaira(next!.amountKobo)} now`}
              variant={next!.status === InstallmentStatus.PENDING ? 'primary' : 'accent'}
              block
              loading={paying || busy}
              onPress={choosePayment}
            />
          </View>
        ) : undefined
      }
    >
      <Text variant="footnote" color="ink3">
        {BNPL_PLANS[order.planCode].label} · {order.reference}
      </Text>
      <Text variant="display" tabular style={{ marginTop: 6 }}>
        {formatNaira(order.outstandingKobo)}
      </Text>
      <Text variant="subhead" color={order.status === OrderStatus.OVERDUE ? 'warn' : 'ink3'}>
        {order.status === OrderStatus.COMPLETED
          ? 'Paid off. It’s all yours.'
          : next
            ? `left to pay · next ${dueLabel(next.dueDate).toLowerCase()}`
            : 'left to pay'}
      </Text>

      <View style={{ marginTop: 20, marginBottom: 28, gap: 8 }}>
        <ProgressSegments statuses={order.installments.map((i) => i.status)} height={8} />
        <Text variant="footnote" color="ink3" tabular>
          {order.installmentsPaid} of {order.installmentCount} paid · {formatNaira(order.paidKobo)} of {formatNaira(order.paidKobo + order.outstandingKobo)}
        </Text>
      </View>

      <SectionHeader>Schedule</SectionHeader>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.hairline, paddingVertical: 16, marginBottom: 28 }}>
        <Schedule installments={order.installments} />
      </View>

      <ListGroup header="Items" inset={78}>
        {order.items.map((item) => (
          <ListRow
            key={item.id}
            label={item.name}
            hint={item.quantity > 1 ? `${item.quantity} × ${formatNaira(item.unitPriceKobo)}` : undefined}
            value={formatNaira(item.lineTotalKobo)}
            leading={
              <View style={{ width: 46, height: 46, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.fill }}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} /> : null}
              </View>
            }
          />
        ))}
      </ListGroup>

      {order.payments.length ? (
        <ListGroup header="Payments">
          {order.payments.map((p) => (
            <ListRow
              key={p.id}
              label={formatNaira(p.amountKobo, { exact: true })}
              hint={`${p.cardLast4 ? cardLabel('card', p.cardLast4) : 'Checkout'} · ${shortDate(p.paidAt ?? p.createdAt)}${p.failureReason ? ` · ${p.failureReason}` : ''}`}
              value={p.status === PaymentStatus.SUCCESS ? 'Paid' : p.status === PaymentStatus.FAILED ? 'Failed' : p.status === PaymentStatus.PENDING ? 'Pending' : 'Not completed'}
            />
          ))}
        </ListGroup>
      ) : null}
    </StackPage>
  );
}

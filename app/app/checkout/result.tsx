import { formatNaira } from '@tranche/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressSegments } from '../../src/components/money/Schedule';
import { dueLabel } from '../../src/lib/format';
import { useGetOrderQuery } from '../../src/store/rtk/customerSlice/order.service';
import { useTheme } from '../../src/theme/ThemeProvider';
import { duration, easeOut, gutter } from '../../src/theme/tokens';
import { Button, haptic, Icon, Screen, Spinner, Text } from '../../src/ui';

type Outcome = 'paid' | 'failed' | 'pending' | 'cancelled';

const COPY: Record<Outcome, { title: string; body: string }> = {
  paid: { title: "You're all set", body: 'Your first payment went through and the store has been paid.' },
  pending: { title: 'Payment processing', body: "We'll let you know as soon as it's confirmed. This usually takes a minute." },
  cancelled: { title: 'Checkout not finished', body: "You haven't been charged. Your order is saved for 24 hours; pay from Plans to confirm it." },
  failed: { title: "Payment didn't go through", body: "You haven't been charged. Try another card from Plans." },
};

export default function CheckoutResultScreen() {
  const { orderId, outcome = 'pending', message } = useLocalSearchParams<{ orderId: string; outcome?: Outcome; message?: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: order } = useGetOrderQuery(orderId, { pollingInterval: outcome === 'pending' ? 4000 : 0 });
  const paid = outcome === 'paid' || (order?.installmentsPaid ?? 0) > 0;
  const copy = COPY[paid ? 'paid' : outcome];
  const next = order?.installments.find((i) => i.status !== 'paid');

  useEffect(() => {
    if (paid) haptic.success();
    else if (outcome === 'failed') haptic.warning();
  }, [paid, outcome]);

  return (
    <Screen>
      <View style={{ flex: 1, paddingHorizontal: gutter, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 16 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View
            entering={ZoomIn.duration(duration.slow).easing(easeOut)}
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: paid ? colors.accentWash : outcome === 'failed' ? colors.dangerWash : colors.fill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {outcome === 'pending' && !paid ? (
              <Spinner />
            ) : (
              <Icon
                name={paid ? 'check' : outcome === 'failed' ? 'close' : 'info'}
                size={34}
                color={paid ? colors.accentInk : outcome === 'failed' ? colors.danger : colors.ink2}
                strokeWidth={2.2}
              />
            )}
          </Animated.View>
          <Text variant="title1" align="center" style={{ marginTop: 22 }}>
            {copy.title}
          </Text>
          <Text variant="callout" color="ink2" align="center" style={{ marginTop: 8, maxWidth: 320 }}>
            {message || copy.body}
          </Text>

          {order && paid ? (
            <View style={{ alignSelf: 'stretch', marginTop: 36, gap: 12 }}>
              <ProgressSegments statuses={order.installments.map((i) => i.status)} height={8} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="subhead" color="ink3">
                  {order.installmentsPaid} of {order.installmentCount} paid
                </Text>
                {next ? (
                  <Text variant="subhead" tabular>
                    Next {formatNaira(next.amountKobo)} · {dueLabel(next.dueDate).replace('Due ', '')}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 10 }}>
          <Button label="View plan" block onPress={() => router.replace({ pathname: '/order/[id]', params: { id: orderId } })} />
          <Button label="Keep shopping" variant="quiet" block onPress={() => router.replace('/(tabs)/shop')} />
        </View>
      </View>
    </Screen>
  );
}

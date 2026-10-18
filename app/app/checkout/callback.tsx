import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { useVerifyPaymentMutation } from '../../src/store/rtk/customerSlice/order.service';
import { Screen, Spinner, Text } from '../../src/ui';

/**
 * `tranche://checkout/callback?reference=...` lands here when Paystack hands back to the app
 * outside an auth session (e.g. the app was killed while the browser was open).
 */
export default function CheckoutCallbackScreen() {
  const { reference, trxref } = useLocalSearchParams<{ reference?: string; trxref?: string }>();
  const router = useRouter();
  const [verify] = useVerifyPaymentMutation();
  const ref = reference ?? trxref;

  useEffect(() => {
    if (!ref) {
      router.replace('/(tabs)/plans');
      return;
    }
    verify(ref)
      .unwrap()
      .then((v) =>
        router.replace({
          pathname: '/checkout/result',
          params: { orderId: v.order.id, outcome: v.status === 'success' ? 'paid' : v.status === 'pending' ? 'pending' : 'failed' },
        }),
      )
      .catch(() => router.replace('/(tabs)/plans'));
  }, [ref, verify, router]);

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <Spinner />
        <Text variant="subhead" color="ink3">
          Confirming your payment…
        </Text>
      </View>
    </Screen>
  );
}

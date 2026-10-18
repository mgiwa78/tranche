import { BNPL_PLANS, buildInstallmentSchedule, checkoutSchema, formatNaira, PlanCode, validateWith } from '@tranche/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';

import { Schedule } from '../../src/components/money/Schedule';
import { usePayFlow } from '../../src/hooks/usePayFlow';
import { errorCode, errorMessage } from '../../src/lib/apiError';
import { cardLabel, localToday } from '../../src/lib/format';
import { useGetProductQuery } from '../../src/store/rtk/customerSlice/catalog.service';
import {
  useCheckoutMutation,
  useGetSummaryQuery,
  useListPaymentMethodsQuery,
} from '../../src/store/rtk/customerSlice/order.service';
import { useTheme } from '../../src/theme/ThemeProvider';
import { radius } from '../../src/theme/tokens';
import { Button, ListGroup, ListRow, SectionHeader, Spinner, StackPage, Text } from '../../src/ui';

const NEW_CARD = 'new';

export default function CheckoutScreen() {
  const { productId, plan: planParam } = useLocalSearchParams<{ productId: string; plan?: PlanCode }>();
  const router = useRouter();
  const { colors } = useTheme();
  const plan = Object.values(PlanCode).includes(planParam as PlanCode) ? (planParam as PlanCode) : PlanCode.PAY_IN_4;
  const { data: product } = useGetProductQuery(productId);
  const { data: cards } = useListPaymentMethodsQuery();
  const { data: summary } = useGetSummaryQuery();
  const [checkout, { isLoading }] = useCheckoutMutation();
  const { complete, busy } = usePayFlow();
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<string>(NEW_CARD);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const preferred = cards?.find((c) => c.isDefault) ?? cards?.[0];
    if (preferred) setMethod(preferred.id);
  }, [cards]);

  if (!product) {
    return (
      <StackPage title="Checkout">
        <View style={{ paddingTop: 80, alignItems: 'center' }}>
          <Spinner />
        </View>
      </StackPage>
    );
  }

  const totalKobo = product.priceKobo * quantity;
  const schedule = buildInstallmentSchedule(totalKobo, plan, localToday());
  const financed = totalKobo - schedule[0].amountKobo;
  const overLimit = summary ? financed > summary.availableCreditKobo : false;

  async function pay() {
    setError(null);
    const body = {
      items: [{ productId, quantity }],
      planCode: plan,
      ...(method !== NEW_CARD ? { paymentMethodId: method } : {}),
    };
    const valid = validateWith(checkoutSchema, body);
    if (!valid.ok) return setError(Object.values(valid.errors)[0] ?? 'Check your order');
    try {
      const res = await checkout(valid.data).unwrap();
      const outcome = await complete(res.payment);
      router.replace({
        pathname: '/checkout/result',
        params: {
          orderId: res.order.id,
          outcome: outcome.kind,
          message: outcome.kind === 'failed' ? outcome.message : '',
        },
      });
    } catch (e) {
      setError(
        errorCode(e) === 'INSUFFICIENT_CREDIT'
          ? errorMessage(e)
          : errorMessage(e, "We couldn't start the checkout. Try again."),
      );
    }
  }

  return (
    <StackPage
      title="Checkout"
      footer={
        <View style={{ gap: 8 }}>
          {error ? (
            <Text variant="footnote" color="danger" align="center">
              {error}
            </Text>
          ) : null}
          <Button
            label={`Pay ${formatNaira(schedule[0].amountKobo)} today`}
            block
            loading={isLoading || busy}
            disabled={overLimit}
            onPress={pay}
          />
          <Text variant="footnote" color="ink3" align="center">
            {BNPL_PLANS[plan].label} · then {schedule.length - 1} more payment{schedule.length === 2 ? '' : 's'}
          </Text>
        </View>
      }
    >
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 24 }}>
        <View style={{ width: 64, height: 64, borderRadius: radius.tile, overflow: 'hidden', backgroundColor: colors.fill }}>
          {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="callout" weight="semibold" numberOfLines={2}>
            {product.name}
          </Text>
          <Text variant="footnote" color="ink3">
            {product.merchantName}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Button label="−" variant="secondary" size="sm" disabled={quantity <= 1} onPress={() => setQuantity((q) => q - 1)} />
          <Text variant="callout" weight="semibold" tabular>
            {quantity}
          </Text>
          <Button
            label="+"
            variant="secondary"
            size="sm"
            disabled={quantity >= Math.min(10, product.stock)}
            onPress={() => setQuantity((q) => q + 1)}
          />
        </View>
      </View>

      <SectionHeader right={<Text variant="callout" weight="semibold" tabular>{formatNaira(totalKobo)}</Text>}>
        Payment schedule
      </SectionHeader>
      <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.hairline, paddingVertical: 16, marginBottom: 8 }}>
        <Schedule preview={schedule} highlightFirst />
      </View>
      {overLimit && summary ? (
        <Text variant="footnote" color="danger" style={{ paddingHorizontal: 4, marginBottom: 20 }}>
          This needs {formatNaira(financed)} of credit and you have {formatNaira(summary.availableCreditKobo)} available. Pay off
          a plan or choose a cheaper item.
        </Text>
      ) : (
        <Text variant="footnote" color="ink3" style={{ paddingHorizontal: 4, marginBottom: 24 }}>
          Interest-free. Uses {formatNaira(financed)} of your {formatNaira(summary?.availableCreditKobo ?? 0)} available.
        </Text>
      )}

      <ListGroup header="Pay with" footer="Your card is saved securely with Paystack and charged on each due date.">
        {(cards ?? []).map((c) => (
          <ListRow
            key={c.id}
            label={cardLabel(c.brand, c.last4)}
            hint={`Expires ${c.expMonth}/${c.expYear.slice(-2)}`}
            icon="card"
            accessory={{ type: 'radio', selected: method === c.id }}
            onPress={() => setMethod(c.id)}
          />
        ))}
        <ListRow
          label="New card"
          hint="Opens secure Paystack checkout"
          icon="plus"
          accessory={{ type: 'radio', selected: method === NEW_CARD }}
          onPress={() => setMethod(NEW_CARD)}
        />
      </ListGroup>
    </StackPage>
  );
}

import React from 'react';
import { Alert } from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { errorMessage } from '../../src/lib/apiError';
import { cardLabel } from '../../src/lib/format';
import {
  useListPaymentMethodsQuery,
  useRemovePaymentMethodMutation,
  useSetDefaultPaymentMethodMutation,
} from '../../src/store/rtk/customerSlice/order.service';
import { ListGroup, ListRow, Spinner, StackPage, Text } from '../../src/ui';

export default function PaymentMethodsScreen() {
  const { data: cards, isLoading } = useListPaymentMethodsQuery();
  const [setDefault] = useSetDefaultPaymentMethodMutation();
  const [remove] = useRemovePaymentMethodMutation();

  const manage = (id: string, label: string, isDefault: boolean) =>
    Alert.alert(label, undefined, [
      ...(!isDefault
        ? [
            {
              text: 'Use for future payments',
              onPress: () => setDefault(id).unwrap().catch((e) => Alert.alert("Couldn't update", errorMessage(e))),
            },
          ]
        : []),
      {
        text: 'Remove card',
        style: 'destructive' as const,
        onPress: () => remove(id).unwrap().catch((e) => Alert.alert("Couldn't remove", errorMessage(e))),
      },
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  return (
    <StackPage title="Cards" intro="Cards are saved when you pay with them. Tranche charges your default card on each due date.">
      {isLoading ? (
        <Spinner />
      ) : !cards?.length ? (
        <EmptyState icon="card" title="No saved cards" body="Your card is saved securely with Paystack the first time you pay." />
      ) : (
        <ListGroup footer="Removing a card doesn't cancel your plans; we'll ask you to pay by checkout instead.">
          {cards.map((c) => (
            <ListRow
              key={c.id}
              icon="card"
              label={cardLabel(c.brand, c.last4)}
              hint={`${c.bank ?? 'Card'} · expires ${c.expMonth}/${c.expYear.slice(-2)}`}
              accessory={{
                type: 'custom',
                node: c.isDefault ? (
                  <Text variant="footnote" weight="semibold" color="accentInk">
                    Default
                  </Text>
                ) : null,
              }}
              onPress={() => manage(c.id, cardLabel(c.brand, c.last4), c.isDefault)}
            />
          ))}
        </ListGroup>
      )}
    </StackPage>
  );
}

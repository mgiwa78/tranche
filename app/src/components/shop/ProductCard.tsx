import { formatNaira, PlanCode, buildInstallmentSchedule } from '@tranche/shared';
import React from 'react';
import { Image, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { Tappable, Text } from '../../ui';
import { localToday } from '../../lib/format';
import type { ProductView } from '../../types/api';

export function ProductCard({ product, onPress, width }: { product: ProductView; onPress: () => void; width: number }) {
  const { colors } = useTheme();
  const perPayment = buildInstallmentSchedule(product.priceKobo, PlanCode.PAY_IN_4, localToday())[1].amountKobo;
  return (
    <Tappable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatNaira(product.priceKobo)}, or 4 payments of ${formatNaira(perPayment)}`}
      style={{ width }}
    >
      <View style={{ width, height: width, borderRadius: radius.tile, overflow: 'hidden', backgroundColor: colors.fill }}>
        {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} /> : null}
      </View>
      <Text variant="footnote" color="ink3" numberOfLines={1} style={{ marginTop: 10 }}>
        {product.merchantName ?? ' '}
      </Text>
      <Text variant="subhead" weight="medium" numberOfLines={2} style={{ marginTop: 2, minHeight: 40 }}>
        {product.name}
      </Text>
      <Text variant="callout" weight="semibold" tabular style={{ marginTop: 4 }}>
        {formatNaira(product.priceKobo)}
      </Text>
      <Text variant="footnote" color="accentInk" tabular>
        or 4 × {formatNaira(perPayment)}
      </Text>
    </Tappable>
  );
}

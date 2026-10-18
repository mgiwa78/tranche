import { BNPL_PLANS, buildInstallmentSchedule, formatNaira, PlanCode, PRODUCT_CATEGORY_LABELS } from '@tranche/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';

import { EmptyState } from '../../src/components/EmptyState';
import { PlanPicker } from '../../src/components/money/PlanPicker';
import { Schedule } from '../../src/components/money/Schedule';
import { localToday } from '../../src/lib/format';
import { useGetAppConfigQuery } from '../../src/store/rtk/appSlice/app.service';
import { useGetProductQuery } from '../../src/store/rtk/customerSlice/catalog.service';
import { useTheme } from '../../src/theme/ThemeProvider';
import { gutter, radius } from '../../src/theme/tokens';
import { Button, SectionHeader, Spinner, StackPage, Text } from '../../src/ui';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { data: product, isLoading, isError } = useGetProductQuery(id);
  const { data: config } = useGetAppConfigQuery();
  const plans = config?.plans.map((p) => p.code) ?? Object.values(PlanCode);
  const [plan, setPlan] = useState<PlanCode>(PlanCode.PAY_IN_4);

  if (isLoading) {
    return (
      <StackPage title="">
        <View style={{ paddingTop: 80, alignItems: 'center' }}>
          <Spinner />
        </View>
      </StackPage>
    );
  }
  if (isError || !product) {
    return (
      <StackPage title="">
        <EmptyState icon="alert" title="This product isn't available" body="It may have sold out or been removed by the store." />
      </StackPage>
    );
  }

  const schedule = buildInstallmentSchedule(product.priceKobo, plan, localToday());

  return (
    <StackPage
      title={product.merchantName ?? 'Product'}
      footer={
        <Button
          label={`Continue with ${BNPL_PLANS[plan].label}`}
          block
          onPress={() => router.push({ pathname: '/checkout/[productId]', params: { productId: product.id, plan } })}
        />
      }
    >
      <View
        style={{
          width: width - gutter * 2,
          height: width - gutter * 2,
          borderRadius: radius.panel,
          overflow: 'hidden',
          backgroundColor: colors.fill,
          marginBottom: 20,
        }}
      >
        {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={{ width: '100%', height: '100%' }} /> : null}
      </View>
      <Text variant="footnote" color="ink3">
        {PRODUCT_CATEGORY_LABELS[product.category]} · {product.merchantName}
      </Text>
      <Text variant="title1" style={{ marginTop: 4 }}>
        {product.name}
      </Text>
      <Text variant="title2" tabular style={{ marginTop: 10 }}>
        {formatNaira(product.priceKobo)}
      </Text>
      {product.description ? (
        <Text variant="callout" color="ink2" style={{ marginTop: 12 }}>
          {product.description}
        </Text>
      ) : null}

      <View style={{ marginTop: 28 }}>
        <SectionHeader>Choose how to pay</SectionHeader>
        <PlanPicker totalKobo={product.priceKobo} plans={plans} selected={plan} onSelect={setPlan} />
      </View>

      <View style={{ marginTop: 28 }}>
        <SectionHeader>Your schedule</SectionHeader>
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.hairline, paddingVertical: 16 }}>
          <Schedule preview={schedule} highlightFirst />
        </View>
        <Text variant="footnote" color="ink3" style={{ marginTop: 8, paddingHorizontal: 4 }}>
          No interest. Pay early anytime. We remind you before every payment.
        </Text>
      </View>
    </StackPage>
  );
}

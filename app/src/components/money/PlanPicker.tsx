import { BNPL_PLANS, buildInstallmentSchedule, formatNaira, type PlanCode } from '@tranche/shared';
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radius } from '../../theme/tokens';
import { haptic, Tappable, Text } from '../../ui';
import { localToday } from '../../lib/format';

/** One tile per enabled plan, each showing what you'd pay per installment for this total. */
export function PlanPicker({
  totalKobo,
  plans,
  selected,
  onSelect,
}: {
  totalKobo: number;
  plans: PlanCode[];
  selected: PlanCode;
  onSelect: (plan: PlanCode) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup">
      {plans.map((code) => {
        const plan = BNPL_PLANS[code];
        const schedule = buildInstallmentSchedule(totalKobo, code, localToday());
        const active = code === selected;
        return (
          <Tappable
            key={code}
            onPress={() => {
              haptic.select();
              onSelect(code);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${plan.label}, ${plan.installmentCount} payments of ${formatNaira(schedule[1]?.amountKobo ?? totalKobo)}`}
            style={{
              borderRadius: radius.tile,
              borderWidth: active ? 2 : 1,
              borderColor: active ? colors.accent : colors.hairline,
              backgroundColor: active ? colors.accentWash : colors.raised,
              paddingHorizontal: 16,
              paddingVertical: active ? 13 : 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text variant="callout" weight="semibold" color={active ? 'accentInk' : 'ink'}>
                {plan.label}
              </Text>
              <Text variant="footnote" color="ink3">
                {plan.description}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="callout" weight="semibold" tabular>
                {formatNaira(schedule[1]?.amountKobo ?? totalKobo)}
              </Text>
              <Text variant="footnote" color="ink3">
                {plan.interval === 'monthly' ? 'per month' : 'per payment'}
              </Text>
            </View>
          </Tappable>
        );
      })}
    </View>
  );
}

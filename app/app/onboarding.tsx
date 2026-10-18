import { buildInstallmentSchedule, formatNaira, PlanCode, toKobo } from '@tranche/shared';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressSegments } from '../src/components/money/Schedule';
import { localToday } from '../src/lib/format';
import { useAppDispatch } from '../src/store/hooks';
import { setSeenOnboarding } from '../src/store/slices/authSlice';
import { brand } from '../src/theme/colors';
import { ThemeScope } from '../src/theme/ThemeProvider';
import { duration, easeOut, gutter, radius } from '../src/theme/tokens';
import { BrandMark, Button, Screen, Text } from '../src/ui';
import { InstallmentStatus } from '@tranche/shared';

const EXAMPLE = buildInstallmentSchedule(toKobo(420_000), PlanCode.PAY_IN_4, localToday());
const LABELS = ['Today', '2 weeks', '4 weeks', '6 weeks'];

export default function OnboardingScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const go = (path: '/auth/register' | '/auth/login') => {
    dispatch(setSeenOnboarding());
    router.replace(path);
  };

  return (
    <ThemeScope scheme="dark">
      <Screen style={{ backgroundColor: brand.ink }}>
        <View style={{ flex: 1, paddingHorizontal: gutter, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}>
          <BrandMark size={26} color={brand.paper} />

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Animated.View entering={FadeInDown.duration(duration.slow).easing(easeOut)}>
              <Text variant="display" color={brand.paper} style={{ fontSize: 40, lineHeight: 46 }}>
                Get it today.{'\n'}Pay in four.
              </Text>
              <Text variant="body" color="rgba(245,245,240,0.72)" style={{ marginTop: 14, maxWidth: 320 }}>
                Split any purchase into four interest-free payments, two weeks apart. We remind you before each one.
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(120).duration(duration.slow).easing(easeOut)}
              style={{
                marginTop: 36,
                borderRadius: radius.panel,
                backgroundColor: 'rgba(245,245,240,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(245,245,240,0.1)',
                padding: 20,
                gap: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="subhead" color="rgba(245,245,240,0.6)">
                  Headphones
                </Text>
                <Text variant="title3" color={brand.paper} tabular>
                  {formatNaira(toKobo(420_000))}
                </Text>
              </View>
              <ProgressSegments statuses={[InstallmentStatus.PAID, InstallmentStatus.PENDING, InstallmentStatus.PENDING, InstallmentStatus.PENDING]} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {EXAMPLE.map((s, i) => (
                  <View key={s.sequence}>
                    <Text variant="caption" color={i === 0 ? brand.lime : 'rgba(245,245,240,0.55)'}>
                      {LABELS[i]}
                    </Text>
                    <Text variant="footnote" weight="semibold" color={brand.paper} tabular>
                      {formatNaira(s.amountKobo)}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          </View>

          <View style={{ gap: 10 }}>
            <Button label="Create an account" variant="accent" block onPress={() => go('/auth/register')} />
            <Button label="I already have an account" variant="quiet" block onPress={() => go('/auth/login')} />
          </View>
        </View>
      </Screen>
    </ThemeScope>
  );
}

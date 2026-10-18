import { useRouter } from 'expo-router';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useAppSelector } from '../src/store/hooks';
import { brand } from '../src/theme/colors';
import { ThemeScope } from '../src/theme/ThemeProvider';
import { duration, easeOut } from '../src/theme/tokens';
import { BrandMark, Screen } from '../src/ui';

const HOLD_MS = 650;

export default function Launch() {
  const router = useRouter();
  const hydrated = useAppSelector((s) => s.auth.hydrated);
  const signedIn = useAppSelector((s) => s.auth.isAuthenticated && !!s.auth.accessToken);
  const seenOnboarding = useAppSelector((s) => s.auth.hasSeenOnboarding);

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});
    if (!hydrated) return;
    const t = setTimeout(() => {
      router.replace(signedIn ? '/(tabs)/shop' : seenOnboarding ? '/auth/login' : '/onboarding');
    }, HOLD_MS);
    return () => clearTimeout(t);
  }, [hydrated, signedIn, seenOnboarding, router]);

  return (
    <ThemeScope scheme="dark">
      <Screen style={{ backgroundColor: brand.navy }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View entering={FadeIn.duration(duration.slow).easing(easeOut)}>
            <BrandMark size={40} color={brand.paper} />
          </Animated.View>
        </View>
      </Screen>
    </ThemeScope>
  );
}

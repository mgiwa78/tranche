import { useFocusEffect, useRouter } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import React, { useCallback, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { gutter } from '../theme/tokens';
import { IconButton } from './IconButton';
import { Text } from './Text';

type ScreenProps = {
  children: ReactNode;

  style?: StyleProp<ViewStyle>;

  padTop?: boolean;
  padBottom?: boolean;
};

export function useScreenStatusBar() {
  const { colors } = useTheme();
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(colors.statusBar, true);
    }, [colors.statusBar]),
  );
}

export function Screen({ children, style, padTop = false, padBottom = false }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  useScreenStatusBar();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.canvas },
        padTop ? { paddingTop: insets.top } : null,
        padBottom ? { paddingBottom: insets.bottom } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type NavBarProps = {
  title?: string;

  center?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;

  hideBack?: boolean;

  backIcon?: 'back' | 'close';

  divider?: boolean;
};

export function NavBar({ title, center, right, onBack, hideBack, backIcon = 'back', divider = false }: NavBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/shop')));

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: colors.canvas,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.hairline,
      }}
    >
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <View style={{ width: 88, alignItems: 'flex-start' }}>
          {hideBack ? null : <IconButton icon={backIcon} label={backIcon === 'close' ? 'Close' : 'Back'} onPress={back} iconSize={backIcon === 'close' ? 22 : 24} color={colors.ink} />}
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          {center ??
            (title ? (
              <Text variant="callout" weight="semibold" numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
            ) : null)}
        </View>
        <View style={{ width: 88, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>{right}</View>
      </View>
    </View>
  );
}

type TabHeaderProps = {
  title: string;
  scrollY: SharedValue<number>;
  actions?: ReactNode;
};

export function TabHeader({ title, scrollY, actions }: TabHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [28, 52], [0, 1], 'clamp'),
  }));
  const lineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 64], [0, 1], 'clamp'),
  }));

  return (
    <View style={{ paddingTop: insets.top, backgroundColor: colors.canvas, zIndex: 2 }}>
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: gutter - 8 }}>
        <View style={{ flex: 1 }} />
        <Animated.View
          style={[{ position: 'absolute', left: 0, right: 0, alignItems: 'center' }, titleStyle]}
          pointerEvents="none"
        >
          <Text variant="callout" weight="semibold">
            {title}
          </Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>{actions}</View>
      </View>
      <Animated.View style={[{ height: 1, backgroundColor: colors.hairline }, lineStyle]} />
    </View>
  );
}

export function LargeTitle({ children, subtitle }: { children: string; subtitle?: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: gutter, paddingTop: 2, paddingBottom: 14 }}>
      <Text variant="display" accessibilityRole="header">
        {children}
      </Text>
      {subtitle ? <View style={{ marginTop: 4 }}>{subtitle}</View> : null}
    </View>
  );
}

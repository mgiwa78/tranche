import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useListNotificationsQuery } from '../store/rtk/appSlice/app.service';
import { brand } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { duration, easeOut, radius } from '../theme/tokens';
import { haptic, Icon, type IconName, Text } from '../ui';

const BAR_HEIGHT = 64;
const SIDE = 20;

export function useTabBarBottomInset() {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + 16 + Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 12);
}

type TabRoute = { key: string; name: string; params?: object };

export type FloatingTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { title?: string; tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const ICONS: Record<string, IconName> = { shop: 'bag', plans: 'layers', activity: 'bell', account: 'user' };

export function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [barWidth, setBarWidth] = useState(0);
  const count = state.routes.length;
  const itemWidth = barWidth > 0 ? (barWidth - 12) / count : 0;
  const x = useSharedValue(0);
  const unread = useListNotificationsQuery({ limit: 1 }).data?.unreadCount ?? 0;

  useEffect(() => {
    x.value = withTiming(state.index * itemWidth, { duration: duration.base, easing: easeOut });
  }, [state.index, itemWidth, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: SIDE, paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 12) }}
    >
      <View
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
        style={{
          height: BAR_HEIGHT,
          maxWidth: 440,
          width: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          padding: 6,
          borderRadius: radius.pill,
          backgroundColor: colors.tabBar,
          borderWidth: 1,
          borderColor: colors.tabBarBorder,
          ...(isDark
            ? {}
            : Platform.select({
                ios: { shadowColor: brand.ink, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 20 },
                android: { elevation: 10 },
              })),
        }}
      >
        {itemWidth > 0 ? (
          <Animated.View
            style={[
              { position: 'absolute', top: 6, bottom: 6, left: 6, width: itemWidth, borderRadius: radius.pill, backgroundColor: 'rgba(245, 245, 240, 0.11)' },
              pill,
            ]}
          />
        ) : null}

        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const tint = focused ? brand.lime : 'rgba(245, 245, 240, 0.58)';
          const badge = route.name === 'activity' && unread > 0 ? unread : 0;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptic.select();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${label}, ${badge} unread` : options.tabBarAccessibilityLabel ?? label}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              <View>
                <Icon name={ICONS[route.name] ?? 'bag'} size={21} color={tint} strokeWidth={focused ? 2 : 1.8} />
                {badge ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -5,
                      left: 13,
                      minWidth: 18,
                      height: 18,
                      paddingHorizontal: 5,
                      borderRadius: 9,
                      backgroundColor: colors.accent,
                      borderWidth: 2,
                      borderColor: colors.tabBar,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text variant="micro" color={colors.onAccent} tabular style={{ fontSize: 10, lineHeight: 12 }}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="micro" color={tint} weight={focused ? 'semibold' : 'medium'}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useListNotificationsQuery } from '../store/rtk/appSlice/app.service';
import { useTheme } from '../theme/ThemeProvider';
import { haptic, Icon, type IconName, Text } from '../ui';

type TabRoute = { key: string; name: string; params?: object };

export type TabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { title?: string; tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit: (event: { type: string; target?: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
  };
};

const ICONS: Record<string, IconName> = { shop: 'bag', plans: 'layers', activity: 'bell', account: 'user' };

/** Docked to the bottom edge on the canvas, one hairline above it. The active tab gets a lime rule. */
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const unread = useListNotificationsQuery({ limit: 1 }).data?.unreadCount ?? 0;

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: colors.canvas,
        borderTopWidth: 1,
        borderTopColor: colors.hairline,
        paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 10),
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const tint = focused ? colors.ink : colors.ink4;
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
            style={{ flex: 1, alignItems: 'center', paddingTop: 10, gap: 3 }}
          >
            <View
              style={{ position: 'absolute', top: -1, height: 2, width: 28, backgroundColor: focused ? colors.accent : 'transparent' }}
            />
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
                    borderColor: colors.canvas,
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
  );
}

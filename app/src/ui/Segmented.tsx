import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { duration, easeOut, radius } from '../theme/tokens';
import { haptic } from './haptics';
import { Text } from './Text';

type Option<T extends string> = { key: T; label: string };

export function Segmented<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: Option<T>[];
  selected: T;
  onSelect: (key: T) => void;
}) {
  const { colors, isDark } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === selected));
  const segment = width > 0 ? (width - 8) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withTiming(index * segment, { duration: duration.base, easing: easeOut });
  }, [index, segment, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      style={{ height: 40, borderRadius: radius.pill, backgroundColor: colors.sunken, padding: 4, flexDirection: 'row' }}
    >
      {segment > 0 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 4,
              bottom: 4,
              width: segment,
              borderRadius: radius.pill,
              backgroundColor: isDark ? colors.fillStrong : colors.raised,
              borderWidth: isDark ? 0 : 1,
              borderColor: colors.hairline,
            },
            thumb,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.key === selected;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              if (!active) haptic.select();
              onSelect(o.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text variant="subhead" weight={active ? 'semibold' : 'medium'} color={active ? 'ink' : 'ink3'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

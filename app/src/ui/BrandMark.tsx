import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

type Props = {
  size?: number;
  wordmark?: boolean;
  color?: string;
};

/** The Tranche mark: one bar in four segments, the first one paid. */
export function BrandMark({ size = 28, wordmark = true, color }: Props) {
  const { colors } = useTheme();
  const solid = color ?? colors.accent;
  const soft = color ? `${color}66` : colors.fillStrong;
  const width = Math.round(size * 1.6);
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.32) }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Tranche"
    >
      <Svg width={width} height={size} viewBox="0 0 40 24">
        <Rect x="0" y="4" width="10" height="16" rx="3" fill={solid} />
        <Rect x="10.5" y="4" width="9" height="16" rx="3" fill={soft} />
        <Rect x="20" y="4" width="9" height="16" rx="3" fill={soft} />
        <Rect x="29.5" y="4" width="10.5" height="16" rx="3" fill={soft} />
      </Svg>
      {wordmark ? (
        <Text
          weight="semibold"
          color={color}
          style={{ fontSize: Math.round(size * 0.66), lineHeight: Math.round(size * 0.84), letterSpacing: -0.5 }}
        >
          tranche
        </Text>
      ) : null}
    </View>
  );
}

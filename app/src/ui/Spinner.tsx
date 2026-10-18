import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';

type Props = {
  size?: number;
  /** Defaults to the secondary ink colour. */
  color?: string;

  trackOpacity?: number;
};

export function Spinner({ size = 18, color: colorProp, trackOpacity = 0.22 }: Props) {
  const { colors } = useTheme();
  const color = colorProp ?? colors.ink3;
  const turn = useSharedValue(0);
  const stroke = Math.max(2, size / 9);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
  }, [turn]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]} accessibilityRole="progressbar">
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeOpacity={trackOpacity} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference * 0.28} ${circumference}`}
        />
      </Svg>
    </Animated.View>
  );
}

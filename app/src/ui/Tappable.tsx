import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { duration, easeOut } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TappableProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;

  pressScale?: number;

  pressedColor?: string;
};

export function Tappable({
  style,
  pressScale = 0.97,
  pressedColor,
  onPressIn,
  onPressOut,
  disabled,
  accessibilityState,
  ...rest
}: TappableProps) {
  const pressed = useSharedValue(0);
  const [isPressed, setIsPressed] = useState(false);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressScale) * pressed.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: duration.press, easing: easeOut });
        if (pressedColor) setIsPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: duration.fast, easing: easeOut });
        if (pressedColor) setIsPressed(false);
        onPressOut?.(e);
      }}
      style={[style, pressScale !== 1 ? animated : null, pressedColor && isPressed ? { backgroundColor: pressedColor } : null]}
    />
  );
}

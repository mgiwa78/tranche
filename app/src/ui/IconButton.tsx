import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { hit } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Tappable } from './Tappable';

type Variant = 'plain' | 'tinted' | 'accent' | 'ink';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: Variant;

  size?: number;
  iconSize?: number;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'plain',
  size = hit,
  iconSize,
  color,
  disabled,
  style,
}: Props) {
  const { colors } = useTheme();
  const bg =
    variant === 'tinted' ? colors.fill : variant === 'accent' ? colors.accent : variant === 'ink' ? colors.ink : 'transparent';
  const fg =
    color ?? (variant === 'accent' ? colors.onAccent : variant === 'ink' ? colors.onInk : variant === 'tinted' ? colors.ink : colors.ink2);
  const slop = size < hit ? (hit - size) / 2 : 0;

  return (
    <Tappable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={slop}
      pressScale={0.92}
      style={[{ opacity: disabled ? 0.38 : 1 }, style]}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} color={fg} strokeWidth={variant === 'accent' ? 2.2 : 1.85} />
      </View>
    </Tappable>
  );
}

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Spinner } from './Spinner';
import { Tappable } from './Tappable';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'quiet' | 'danger' | 'dangerQuiet';
type Size = 'lg' | 'md' | 'sm';

const HEIGHT: Record<Size, number> = { lg: 52, md: 44, sm: 36 };

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;

  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  block = false,
  style,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();

  const palette: Record<ButtonVariant, { bg: string; fg: string }> = {
    primary: { bg: colors.ink, fg: colors.onInk },
    accent: { bg: colors.accent, fg: colors.onAccent },
    secondary: { bg: colors.fill, fg: colors.ink },
    quiet: { bg: 'transparent', fg: colors.accentInk },
    danger: { bg: colors.dangerFill, fg: colors.onAccent },
    dangerQuiet: { bg: 'transparent', fg: colors.danger },
  };
  const { bg, fg } = palette[variant];
  const inactive = disabled || loading;
  const height = HEIGHT[size];

  return (
    <Tappable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading }}
      hitSlop={height < 44 ? (44 - height) / 2 : undefined}
      style={[
        {
          height,
          borderRadius: radius.pill,
          backgroundColor: bg,
          paddingHorizontal: size === 'sm' ? 14 : 22,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: block ? 'stretch' : 'flex-start',
          opacity: disabled && !loading ? 0.38 : 1,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {loading ? (
          <Spinner size={size === 'sm' ? 14 : 18} color={fg} />
        ) : icon ? (
          <Icon name={icon} size={size === 'sm' ? 16 : 19} color={fg} strokeWidth={2} />
        ) : null}
        <Text variant={size === 'sm' ? 'footnote' : 'callout'} weight="semibold" color={fg} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Tappable>
  );
}

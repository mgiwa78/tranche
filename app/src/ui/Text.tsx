import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { ThemeColors } from '../theme/colors';
import { fonts, type, type FontWeight, type TypeVariant } from '../theme/tokens';

type InkColor = 'ink' | 'ink2' | 'ink3' | 'ink4' | 'accentInk' | 'danger' | 'warn' | 'success' | 'onInk' | 'onAccent';

export type AppTextProps = TextProps & {
  variant?: TypeVariant;

  weight?: FontWeight;
  color?: InkColor | (string & {});
  align?: TextStyle['textAlign'];

  tabular?: boolean;
};

function resolveColor(colors: ThemeColors, color: AppTextProps['color']) {
  if (!color) return colors.ink;
  return (colors as unknown as Record<string, string>)[color] ?? color;
}

export function Text({ variant = 'body', weight, color, align, tabular, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        weight ? { fontFamily: fonts[weight] } : null,
        { color: resolveColor(colors, color) },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}

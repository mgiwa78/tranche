import { Easing } from 'react-native-reanimated';

export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

export const type = {
  display: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -1 },
  title1: { fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, letterSpacing: -0.7 },
  title2: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  title3: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  callout: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, letterSpacing: -0.05 },
  subhead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: 0.05 },
  micro: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13, letterSpacing: 0.1 },
} as const;

export type TypeVariant = keyof typeof type;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const gutter = 20;

export const radius = {
  tile: 14,
  panel: 28,
  pill: 999,
} as const;

export const avatarRadius = (size: number) => Math.round(size * 0.3);

export const hit = 44;

export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

export const duration = {
  press: 140,
  fast: 180,
  base: 240,
  slow: 360,
} as const;

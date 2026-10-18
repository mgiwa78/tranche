
export type ColorScheme = 'light' | 'dark';

export type AvatarTone = { bg: string; fg: string };

export type ThemeColors = {
  canvas: string;

  raised: string;

  sunken: string;

  fill: string;

  fillStrong: string;
  hairline: string;

  ink: string;
  ink2: string;
  ink3: string;

  ink4: string;

  onInk: string;

  accent: string;
  onAccent: string;

  accentInk: string;
  accentWash: string;

  danger: string;

  dangerFill: string;
  dangerWash: string;
  warn: string;
  warnWash: string;
  success: string;

  successFill: string;

  scrim: string;

  tabBar: string;
  tabBarBorder: string;

  avatarTones: AvatarTone[];
  statusBar: 'light' | 'dark';
};

export const brand = {
  navy: '#0A1B3D',
  green: '#0F7B5B',
  greenBright: '#2BB784',
  paper: '#EFF4FA',
} as const;

export const lightColors: ThemeColors = {
  canvas: '#F7FAFE',
  raised: '#FDFEFF',
  sunken: '#EAF1FA',
  fill: '#E3EBF6',
  fillStrong: '#C7D5EC',
  hairline: '#D7DEEA',

  ink: '#071530',
  ink2: '#31405A',
  ink3: '#53617A',
  ink4: '#818DA2',
  onInk: '#F7FAFE',

  accent: brand.green,
  onAccent: '#FDFEFF',
  accentInk: '#0C6A4E',
  accentWash: '#DDF3EA',

  danger: '#C22826',
  dangerFill: '#C22826',
  dangerWash: '#FFE9E6',
  warn: '#AA5F04',
  warnWash: '#FDECD1',
  success: '#187C49',
  successFill: '#187C49',

  scrim: 'rgba(7, 21, 48, 0.42)',
  tabBar: brand.navy,
  tabBarBorder: 'rgba(239, 244, 250, 0.06)',

  avatarTones: [
    { bg: '#D5E2F9', fg: '#2A416D' },
    { bg: '#CBE6F4', fg: '#004964' },
    { bg: '#C8E9E8', fg: '#004F4F' },
    { bg: '#D2E8D5', fg: '#1D4E2B' },
    { bg: '#EFDFC8', fg: '#5B3B00' },
    { bg: '#F8DAD2', fg: '#663124' },
    { bg: '#ECDAF0', fg: '#55335D' },
  ],
  statusBar: 'dark',
};

export const darkColors: ThemeColors = {
  canvas: '#030B1F',
  raised: '#071533',
  sunken: '#020617',
  fill: '#0F2144',
  fillStrong: '#1D3259',
  hairline: '#182846',

  ink: '#EFF4FA',
  ink2: '#B2BFD1',
  ink3: '#8696AE',
  ink4: '#61738C',
  onInk: '#030B1F',

  accent: brand.greenBright,
  onAccent: '#03140E',
  accentInk: '#7FDDB6',
  accentWash: '#0B3326',

  danger: '#F97770',
  dangerFill: '#D0302B',
  dangerWash: '#401312',
  warn: '#F2B95A',
  warnWash: '#362207',
  success: '#63D18F',
  successFill: '#1B8550',

  scrim: 'rgba(2, 6, 23, 0.66)',
  tabBar: '#0F2144',
  tabBarBorder: 'rgba(239, 244, 250, 0.08)',

  avatarTones: [
    { bg: '#23334F', fg: '#CCDFFF' },
    { bg: '#0D3849', fg: '#BDE5F9' },
    { bg: '#003B3B', fg: '#B8E9E8' },
    { bg: '#1C3B24', fg: '#C8E8CD' },
    { bg: '#432E0E', fg: '#F2DABA' },
    { bg: '#4B281F', fg: '#FDD3C8' },
    { bg: '#3F2944', fg: '#EDD4F3' },
  ],
  statusBar: 'light',
};

export function getColorsForScheme(scheme: ColorScheme): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}

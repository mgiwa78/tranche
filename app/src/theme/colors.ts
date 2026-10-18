
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


  avatarTones: AvatarTone[];
  statusBar: 'light' | 'dark';
};

export const brand = {
  ink: '#0B0B10',
  lime: '#C8F531',
  violet: '#8B5CF6',
  paper: '#F5F5F0',
} as const;

export const lightColors: ThemeColors = {
  canvas: '#FAFAF7',
  raised: '#FFFFFF',
  sunken: '#F1F1EB',
  fill: '#EDEDE6',
  fillStrong: '#D8D8CF',
  hairline: '#E5E5DE',

  ink: brand.ink,
  ink2: '#3A3A44',
  ink3: '#5C5C67',
  ink4: '#8E8E98',
  onInk: '#FAFAF7',

  // Lime is a fill. Text that needs the accent on a light background uses accentInk (olive).
  accent: brand.lime,
  onAccent: brand.ink,
  accentInk: '#4D6B00',
  accentWash: '#F0FAD2',

  danger: '#C8102E',
  dangerFill: '#C8102E',
  dangerWash: '#FFE8EA',
  warn: '#B45309',
  warnWash: '#FEF0D7',
  success: '#15803D',
  successFill: '#15803D',

  scrim: 'rgba(11, 11, 16, 0.45)',

  avatarTones: [
    { bg: '#EAF8C4', fg: '#3D5600' },
    { bg: '#E9E1FF', fg: '#4C2A9E' },
    { bg: '#FFE2D6', fg: '#7A2E10' },
    { bg: '#D9F2EC', fg: '#0E5245' },
    { bg: '#FCEFC7', fg: '#6B4A00' },
    { bg: '#FBDDEA', fg: '#7A1E46' },
    { bg: '#E3E8F0', fg: '#2F3A4D' },
  ],
  statusBar: 'dark',
};

export const darkColors: ThemeColors = {
  canvas: brand.ink,
  raised: '#16161D',
  sunken: '#060609',
  fill: '#1F1F28',
  fillStrong: '#2E2E39',
  hairline: '#24242D',

  ink: brand.paper,
  ink2: '#C6C6CE',
  ink3: '#9A9AA5',
  ink4: '#6B6B76',
  onInk: brand.ink,

  accent: brand.lime,
  onAccent: brand.ink,
  accentInk: brand.lime,
  accentWash: '#222A0B',

  danger: '#FF6B7A',
  dangerFill: '#E11D48',
  dangerWash: '#3A1018',
  warn: '#FBBF24',
  warnWash: '#33240A',
  success: '#4ADE80',
  successFill: '#16A34A',

  scrim: 'rgba(0, 0, 0, 0.66)',

  avatarTones: [
    { bg: '#2B3510', fg: '#D9F77A' },
    { bg: '#2A2145', fg: '#D4C6FF' },
    { bg: '#3B2218', fg: '#FFC9B3' },
    { bg: '#123029', fg: '#A8E8DA' },
    { bg: '#33290F', fg: '#F7DE9A' },
    { bg: '#371A28', fg: '#F7C2DA' },
    { bg: '#232733', fg: '#CBD3E1' },
  ],
  statusBar: 'light',
};

export function getColorsForScheme(scheme: ColorScheme): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useAppSelector } from '../store/hooks';
import type { AppearanceMode } from '../store/slices/settingsSlice';
import { getColorsForScheme, type ColorScheme, type ThemeColors } from './colors';

type ThemeContextValue = {
  scheme: ColorScheme;
  appearance: AppearanceMode;
  isDark: boolean;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(appearance: AppearanceMode, system: ColorScheme | null | undefined): ColorScheme {
  if (appearance === 'dark') return 'dark';
  if (appearance === 'light') return 'light';
  return system === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const appearance = useAppSelector((s) => s.settings.appearance);
  const systemScheme = useColorScheme();
  const scheme = resolveScheme(appearance, systemScheme as ColorScheme | null | undefined);

  const value = useMemo(
    () => ({ scheme, appearance, isDark: scheme === 'dark', colors: getColorsForScheme(scheme) }),
    [appearance, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeScope({ scheme, children }: { scheme: ColorScheme; children: React.ReactNode }) {
  const parent = useTheme();
  const value = useMemo(
    () => ({ ...parent, scheme, isDark: scheme === 'dark', colors: getColorsForScheme(scheme) }),
    [parent, scheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

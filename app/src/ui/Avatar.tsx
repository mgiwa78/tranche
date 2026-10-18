import React from 'react';
import { Image, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { avatarRadius } from '../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  name: string;

  seed: string;
  size?: number;
  uri?: string | null;
};

export function initialsOf(name: string) {
  const parts = name.replace(/[.,#'"()_\-?!]/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toneIndex(seed: string, count: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % count;
}

export function Avatar({ name, seed, size = 48, uri }: Props) {
  const { colors } = useTheme();
  const tone = colors.avatarTones[toneIndex(seed, colors.avatarTones.length)];
  const r = avatarRadius(size);
  const initials = initialsOf(name);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: r,
        backgroundColor: tone.bg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : initials === '?' ? (
        <Icon name="user" size={Math.round(size * 0.42)} color={tone.fg} strokeWidth={1.6} />
      ) : (
        <Text
          weight="semibold"
          color={tone.fg}
          style={{ fontSize: Math.round(size * 0.36), lineHeight: Math.round(size * 0.44), letterSpacing: -0.2 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

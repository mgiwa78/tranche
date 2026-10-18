import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useTheme } from '../theme/ThemeProvider';
import { duration } from '../theme/tokens';
import { Icon, type IconName, Text } from '../ui';

type Props = {
  icon: IconName;
  title: string;
  body?: string;
  actions?: ReactNode;
};

export function EmptyState({ icon, title, body, actions }: Props) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(duration.base)} style={{ paddingHorizontal: 28, paddingTop: 40, paddingBottom: 24, alignItems: 'center' }}>
      <View style={{ width: 56, height: 56, borderRadius: 17, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={26} color={colors.ink2} strokeWidth={1.7} />
      </View>
      <Text variant="title3" align="center" style={{ marginTop: 18 }}>
        {title}
      </Text>
      {body ? (
        <Text variant="subhead" color="ink3" align="center" style={{ marginTop: 6, maxWidth: 300 }}>
          {body}
        </Text>
      ) : null}
      {actions ? <View style={{ marginTop: 22, gap: 6, alignItems: 'center' }}>{actions}</View> : null}
    </Animated.View>
  );
}

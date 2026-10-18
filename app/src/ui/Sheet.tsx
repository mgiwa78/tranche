import React, { type ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';
import { duration, easeOut, gutter, radius } from '../theme/tokens';
import { Text } from './Text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Sheet({ visible, onClose, title, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim }}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <Animated.View
          entering={SlideInDown.duration(duration.slow).easing(easeOut)}
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.raised,
            borderTopLeftRadius: radius.panel,
            borderTopRightRadius: radius.panel,
            paddingHorizontal: gutter,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}
        >
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.fillStrong, alignSelf: 'center', marginBottom: 16 }} />
          {title ? (
            <Text variant="title3" style={{ marginBottom: 8 }} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

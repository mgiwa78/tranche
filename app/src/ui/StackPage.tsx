import React, { type ReactElement, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControlProps, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gutter } from '../theme/tokens';
import { NavBar, Screen } from './Screen';
import { Text } from './Text';

type Props = {
  title: string;
  children: ReactNode;
  heading?: string;
  intro?: string;
  right?: ReactNode;
  footer?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
};

export function StackPage({ title, children, heading, intro, right, footer, refreshControl }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <NavBar title={heading ? undefined : title} right={right} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: heading ? 4 : 12, paddingBottom: footer ? 24 : insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {heading ? (
            <View style={{ marginBottom: 24 }}>
              <Text variant="title1" accessibilityRole="header">
                {heading}
              </Text>
              {intro ? (
                <Text variant="callout" color="ink2" style={{ marginTop: 8 }}>
                  {intro}
                </Text>
              ) : null}
            </View>
          ) : intro ? (
            <Text variant="callout" color="ink2" style={{ marginBottom: 20, paddingHorizontal: 4 }}>
              {intro}
            </Text>
          ) : null}
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingHorizontal: gutter, paddingTop: 12, paddingBottom: insets.bottom + 12 }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

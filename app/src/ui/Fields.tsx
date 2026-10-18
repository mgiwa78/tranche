import React, { forwardRef, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { fonts, radius } from '../theme/tokens';
import { Icon } from './Icon';
import { Tappable } from './Tappable';
import { Text } from './Text';

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hint?: string;
  error?: string | null;

  meta?: string;
  multiline?: boolean;
};

export const TextField = forwardRef<TextInput, FieldProps>(function TextField(
  { label, hint, error, meta, multiline, onFocus, onBlur, ...input },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.accentInk : colors.hairline;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 }}>
        <Text variant="subhead" weight="medium" color="ink2">
          {label}
        </Text>
        {meta ? (
          <Text variant="footnote" color="ink3" tabular>
            {meta}
          </Text>
        ) : null}
      </View>
      <TextInput
        ref={ref}
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.ink4}
        selectionColor={colors.accent}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          minHeight: multiline ? 112 : 52,
          borderRadius: radius.tile,
          borderWidth: focused || error ? 1.5 : 1,
          borderColor,
          backgroundColor: focused ? colors.raised : colors.sunken,
          paddingHorizontal: 16,
          paddingTop: multiline ? 14 : 0,
          paddingBottom: multiline ? 14 : 0,
          textAlignVertical: multiline ? 'top' : 'center',
          fontFamily: fonts.regular,
          fontSize: 16,
          lineHeight: multiline ? 23 : undefined,
          color: colors.ink,
        }}
      />
      {error || hint ? (
        <Text variant="footnote" color={error ? 'danger' : 'ink3'} style={{ marginTop: 8, paddingHorizontal: 2 }}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
});

type SearchProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: SearchProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.pill,
        backgroundColor: colors.sunken,
        paddingLeft: 14,
        paddingRight: 6,
        gap: 8,
      }}
    >
      <Icon name="search" size={18} color={colors.ink3} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink4}
        selectionColor={colors.accent}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={{ flex: 1, height: 44, fontFamily: fonts.regular, fontSize: 16, color: colors.ink }}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.ink4, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={11} color={colors.canvas} strokeWidth={3} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

type Chip<T extends string> = { key: T; label: string; count?: number };

export function Chips<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: Chip<T>[];
  selected: T;
  onSelect: (key: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === selected;
        return (
          <Tappable
            key={o.key}
            onPress={() => onSelect(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.count != null ? `${o.label}, ${o.count}` : o.label}
            hitSlop={{ top: 6, bottom: 6 }}
            style={{
              height: 34,
              paddingHorizontal: 14,
              borderRadius: radius.pill,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: active ? colors.accentWash : 'transparent',
              borderWidth: 1,
              borderColor: active ? colors.accentWash : colors.hairline,
            }}
          >
            <Text variant="subhead" weight="medium" color={active ? 'accentInk' : 'ink2'}>
              {o.label}
            </Text>
            {o.count != null ? (
              <Text variant="footnote" color={active ? 'accentInk' : 'ink3'} tabular style={{ opacity: active ? 0.75 : 1 }}>
                {o.count}
              </Text>
            ) : null}
          </Tappable>
        );
      })}
    </View>
  );
}

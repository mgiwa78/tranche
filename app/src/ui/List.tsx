import React, { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { Icon, type IconName } from './Icon';
import { Tappable } from './Tappable';
import { Text } from './Text';

export function SectionHeader({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 8 }}>
      <Text variant="footnote" weight="medium" color="ink3" accessibilityRole="header">
        {children}
      </Text>
      {right}
    </View>
  );
}

export function SectionFooter({ children }: { children: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 4, marginTop: 8 }}>
      {typeof children === 'string' ? (
        <Text variant="footnote" color="ink3">
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

type GroupProps = {
  children: ReactNode;
  header?: string;
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;

  inset?: number;
};

export function ListGroup({ children, header, footer, style, inset = 16 }: GroupProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[{ marginBottom: 28 }, style]}>
      {header ? <SectionHeader>{header}</SectionHeader> : null}
      <View
        style={{
          backgroundColor: colors.raised,
          borderRadius: radius.tile,
          borderWidth: 1,
          borderColor: colors.hairline,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {row}
            {i < rows.length - 1 ? <View style={{ height: 1, marginLeft: inset, backgroundColor: colors.hairline }} /> : null}
          </Fragment>
        ))}
      </View>
      {footer ? <SectionFooter>{footer}</SectionFooter> : null}
    </View>
  );
}

type RowAccessory =
  | { type: 'chevron' }
  | { type: 'toggle'; value: boolean; onChange: (v: boolean) => void }
  | { type: 'radio'; selected: boolean }
  | { type: 'none' }
  | { type: 'custom'; node: ReactNode };

type RowProps = {
  label: string;
  hint?: string;

  value?: string;
  icon?: IconName;
  tone?: 'default' | 'danger';
  onPress?: () => void;
  accessory?: RowAccessory;
  disabled?: boolean;
  leading?: ReactNode;
};

export function ListRow({ label, hint, value, icon, tone = 'default', onPress, accessory, disabled, leading }: RowProps) {
  const { colors } = useTheme();
  const acc: RowAccessory = accessory ?? (onPress ? { type: 'chevron' } : { type: 'none' });
  const labelColor = tone === 'danger' ? colors.danger : colors.ink;

  const toggle = acc.type === 'toggle' ? acc : null;
  const press = onPress ?? (toggle ? () => toggle.onChange(!toggle.value) : undefined);

  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, gap: 14 }}>
      {leading}
      {icon ? (
        <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: tone === 'danger' ? colors.dangerWash : colors.fill, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={17} color={tone === 'danger' ? colors.danger : colors.ink2} strokeWidth={1.9} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="callout" color={labelColor} numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text variant="footnote" color="ink3" style={{ marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="callout" color="ink3" numberOfLines={1} tabular style={{ maxWidth: '45%' }}>
          {value}
        </Text>
      ) : null}
      {acc.type === 'chevron' ? <Icon name="chevronRight" size={18} color={colors.ink4} strokeWidth={2} /> : null}
      {acc.type === 'toggle' ? (
        <Switch
          value={acc.value}
          onValueChange={acc.onChange}
          disabled={disabled}
          trackColor={{ true: colors.accent, false: colors.fillStrong }}
          thumbColor="#FDFEFF"
          ios_backgroundColor={colors.fillStrong}
          accessibilityLabel={label}
        />
      ) : null}
      {acc.type === 'radio' ? <Radio selected={acc.selected} /> : null}
      {acc.type === 'custom' ? acc.node : null}
    </View>
  );

  if (!press) return body;

  return (
    <Tappable
      onPress={press}
      disabled={disabled}
      pressScale={1}
      pressedColor={colors.sunken}
      accessibilityRole={acc.type === 'radio' ? 'radio' : acc.type === 'toggle' ? 'switch' : 'button'}
      accessibilityState={
        acc.type === 'radio' ? { selected: acc.selected } : acc.type === 'toggle' ? { checked: acc.value } : undefined
      }
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={hint}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      {body}
    </Tappable>
  );
}

export function Radio({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: selected ? 0 : 1.5,
        borderColor: colors.fillStrong,
        backgroundColor: selected ? colors.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected ? <Icon name="check" size={14} color={colors.onAccent} strokeWidth={3} /> : null}
    </View>
  );
}

type Option<T extends string> = { key: T; label: string; hint?: string };

export function RadioGroup<T extends string>({
  options,
  selected,
  onSelect,
  header,
  footer,
}: {
  options: Option<T>[];
  selected: T;
  onSelect: (key: T) => void;
  header?: string;
  footer?: ReactNode;
}) {
  return (
    <ListGroup header={header} footer={footer}>
      {options.map((o) => (
        <ListRow
          key={o.key}
          label={o.label}
          hint={o.hint}
          onPress={() => onSelect(o.key)}
          accessory={{ type: 'radio', selected: selected === o.key }}
        />
      ))}
    </ListGroup>
  );
}

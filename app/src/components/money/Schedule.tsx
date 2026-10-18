import { formatNaira, InstallmentStatus, type ScheduledInstallment } from '@tranche/shared';
import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { Text } from '../../ui';
import { dueLabel, shortDate } from '../../lib/format';
import type { InstallmentView } from '../../types/api';

type Row = {
  key: string;
  sequence: number;
  amountKobo: number;
  dueDate: string;
  status: InstallmentStatus;
  paidAt?: string | null;
};

const fromPreview = (s: ScheduledInstallment): Row => ({
  key: String(s.sequence),
  sequence: s.sequence,
  amountKobo: s.amountKobo,
  dueDate: s.dueDate,
  status: InstallmentStatus.PENDING,
});

const fromInstallment = (i: InstallmentView): Row => ({
  key: i.id,
  sequence: i.sequence,
  amountKobo: i.amountKobo,
  dueDate: i.dueDate,
  status: i.status,
  paidAt: i.paidAt,
});

/** Segmented bar: one segment per payment, filled when paid. The brand mark, in data. */
export function ProgressSegments({ statuses, height = 6 }: { statuses: InstallmentStatus[]; height?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {statuses.map((s, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: height,
            backgroundColor:
              s === InstallmentStatus.PAID
                ? colors.accent
                : s === InstallmentStatus.OVERDUE || s === InstallmentStatus.FAILED
                  ? colors.warn
                  : colors.fillStrong,
          }}
        />
      ))}
    </View>
  );
}

/**
 * The schedule as a vertical timeline. Pass `preview` (from the shared schedule builder) before
 * checkout or `installments` from the api afterwards: both render the same rows.
 */
export function Schedule({
  preview,
  installments,
  highlightFirst = false,
}: {
  preview?: ScheduledInstallment[];
  installments?: InstallmentView[];
  highlightFirst?: boolean;
}) {
  const { colors } = useTheme();
  const rows = preview ? preview.map(fromPreview) : (installments ?? []).map(fromInstallment);

  return (
    <View>
      {rows.map((row, index) => {
        const paid = row.status === InstallmentStatus.PAID;
        const late = row.status === InstallmentStatus.OVERDUE || row.status === InstallmentStatus.FAILED;
        const first = highlightFirst && index === 0;
        const dot = paid || first ? colors.accent : late ? colors.warn : 'transparent';
        const ring = paid || first ? colors.accent : late ? colors.warn : colors.fillStrong;
        const label = preview
          ? index === 0
            ? 'Today'
            : shortDate(row.dueDate)
          : paid
            ? `Paid ${row.paidAt ? shortDate(row.paidAt) : ''}`
            : late
              ? row.status === InstallmentStatus.OVERDUE
                ? `Overdue since ${shortDate(row.dueDate)}`
                : `Payment failed · due ${shortDate(row.dueDate)}`
              : dueLabel(row.dueDate);
        return (
          <View key={row.key} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ alignItems: 'center', width: 14 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: ring, backgroundColor: dot, marginTop: 3 }} />
              {index < rows.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: colors.hairline, marginVertical: 4 }} /> : null}
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: index < rows.length - 1 ? 18 : 0 }}>
              <View>
                <Text variant="callout" weight={first ? 'semibold' : 'medium'}>
                  Payment {row.sequence}
                </Text>
                <Text variant="footnote" color={late ? 'warn' : 'ink3'}>
                  {label}
                </Text>
              </View>
              <Text variant="callout" weight="medium" tabular color={paid ? 'ink3' : 'ink'}>
                {formatNaira(row.amountKobo, { exact: !Number.isInteger(row.amountKobo / 100) })}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

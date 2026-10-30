/**
 * MoneyField — displays monetary amounts with tabular numerals.
 * Supports showing available / held / pending as separate rows.
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';

interface BalanceRow {
  label: string;
  amount: number;
  color?: string;
  note?: string;
}

interface MoneyFieldProps {
  rows: BalanceRow[];
  style?: ViewStyle;
  /** Show currency symbol. Default: '₫' */
  currency?: string;
}

function formatVnd(amount: number): string {
  return amount.toLocaleString('vi-VN');
}

export function MoneyField({ rows, style, currency = '₫' }: MoneyFieldProps) {
  return (
    <View style={[styles.container, style]}>
      {rows.map((row, i) => (
        <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
          <Text style={styles.label}>{row.label}</Text>
          <View style={styles.rightCol}>
            <Text style={[styles.amount, row.color ? { color: row.color } : null]}>
              {formatVnd(row.amount)}{' '}
              <Text style={styles.currency}>{currency}</Text>
            </Text>
            {row.note ? <Text style={styles.note}>{row.note}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    // tabular numerals
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  currency: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  note: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
});


/**
 * ReceiptScreen — full-screen post-action confirmation.
 * Shows: amount (if any), timestamp, reference ID, next steps.
 * Used after deposit, withdraw, or contract action completes.
 */
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';

export interface ReceiptData {
  type: 'success' | 'pending' | 'error';
  title: string;
  description: string;
  /** Main amount line, e.g. "+ 500.000 ₫" */
  amountDisplay?: string;
  /** List of detail rows */
  details: Array<{ label: string; value: string; masked?: boolean }>;
  referenceId?: string;
  timestamp?: string;
  nextSteps?: string[];
}

interface ReceiptScreenProps {
  data: ReceiptData;
  onDone: () => void;
  doneLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
  style?: ViewStyle;
}

const TYPE_ICONS = {
  success: 'check-circle',
  pending: 'clock-outline',
  error: 'alert-circle-outline',
} as const;

const TYPE_COLORS = {
  success: Colors.success,
  pending: Colors.warning,
  error: Colors.danger,
} as const;

function maskValue(value: string): string {
  if (value.length <= 4) return '••••';
  return '••••' + value.slice(-4);
}

function formatTimestamp(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function ReceiptScreen({
  data,
  onDone,
  doneLabel = 'Xong',
  onSecondary,
  secondaryLabel,
}: ReceiptScreenProps) {
  const insets = useSafeAreaInsets();
  const iconColor = TYPE_COLORS[data.type];
  const icon = TYPE_ICONS[data.type];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 16, 32), paddingBottom: Math.max(insets.bottom + 16, 32) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Icon */}
      <View style={[styles.iconCircle, { backgroundColor: iconColor + '15' }]}>
        <MaterialCommunityIcons name={icon} size={48} color={iconColor} />
      </View>

      {/* Title / Amount */}
      <Text style={styles.title}>{data.title}</Text>
      {data.amountDisplay ? (
        <Text style={[styles.amount, { color: data.type === 'error' ? Colors.danger : Colors.text }]}>
          {data.amountDisplay}
        </Text>
      ) : null}
      <Text style={styles.description}>{data.description}</Text>

      {/* Detail rows */}
      <View style={styles.detailsBox}>
        {data.details.map((item, i) => (
          <View key={i} style={[styles.detailRow, i > 0 && styles.detailBorder]}>
            <Text style={styles.detailLabel}>{item.label}</Text>
            <Text style={styles.detailValue}>
              {item.masked ? maskValue(item.value) : item.value}
            </Text>
          </View>
        ))}
        {data.referenceId ? (
          <View style={[styles.detailRow, styles.detailBorder]}>
            <Text style={styles.detailLabel}>Mã tham chiếu</Text>
            <Text style={[styles.detailValue, styles.refId]}>{data.referenceId}</Text>
          </View>
        ) : null}
        {data.timestamp ? (
          <View style={[styles.detailRow, styles.detailBorder]}>
            <Text style={styles.detailLabel}>Thời gian</Text>
            <Text style={styles.detailValue}>{formatTimestamp(data.timestamp)}</Text>
          </View>
        ) : null}
      </View>

      {/* Next steps */}
      {data.nextSteps && data.nextSteps.length > 0 ? (
        <View style={styles.nextStepsBox}>
          <Text style={styles.nextStepsTitle}>Bước tiếp theo</Text>
          {data.nextSteps.map((step, i) => (
            <View key={i} style={styles.nextStepRow}>
              <View style={styles.nextStepDot} />
              <Text style={styles.nextStepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* CTAs */}
      <View style={styles.ctaArea}>
        {onSecondary && secondaryLabel ? (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onSecondary}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
          >
            <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={onDone}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={doneLabel}
        >
          <Text style={styles.doneBtnText}>{doneLabel}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  amount: {
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  detailBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  refId: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.textMuted,
  },
  nextStepsBox: {
    width: '100%',
    backgroundColor: 'rgba(22,102,197,0.06)',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  nextStepsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: Spacing.sm,
  },
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  nextStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.blue,
    marginTop: 6,
    flexShrink: 0,
  },
  nextStepText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  ctaArea: {
    width: '100%',
    gap: Spacing.sm,
  },
  doneBtn: {
    backgroundColor: Colors.blue,
    borderRadius: 12,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  secondaryBtn: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});


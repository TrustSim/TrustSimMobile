/**
 * ContractTimeline — linear step tracker for contract flow.
 * Steps: Chờ ký → Đã ký → Chờ chuyển nhượng → Chờ xác minh → Hoàn tất
 * Never uses ambiguous "Đang xử lý".
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import type { TradeTransactionStatus } from '../../types';

export interface ContractStep {
  key: string;
  label: string;
  sublabel?: string;
}

export const CONTRACT_STEPS: ContractStep[] = [
  { key: 'PendingEscrow',           label: 'Đặt cọc',          sublabel: 'Chờ thanh toán đặt cọc' },
  { key: 'PendingContractSigning',  label: 'Ký hợp đồng',      sublabel: 'Chờ các bên ký' },
  { key: 'PendingTransfer',         label: 'Chuyển nhượng',     sublabel: 'Chờ bàn giao SIM' },
  { key: 'PendingVerification',     label: 'Xác minh',          sublabel: 'Chờ xác minh bằng chứng' },
  { key: 'Completed',               label: 'Hoàn tất',          sublabel: 'Giao dịch thành công' },
];

// Map TradeTransactionStatus to step key
function statusToStepIndex(status: TradeTransactionStatus | string): number {
  const map: Record<string, number> = {
    PendingEscrow: 0,
    PendingContractSigning: 1,
    PendingTransfer: 2,
    PendingVerification: 3,
    Completed: 4,
    Cancelled: -1,
    Disputed: -1,
  };
  return map[status] ?? 0;
}

interface ContractTimelineProps {
  status: TradeTransactionStatus | string;
  /** Compact mode — smaller and horizontal-scrollable for list items */
  compact?: boolean;
  style?: ViewStyle;
}

export function ContractTimeline({ status, compact = false, style }: ContractTimelineProps) {
  const isCancelled = status === 'Cancelled' || status === 'Disputed';
  const currentIndex = statusToStepIndex(status);

  if (compact) {
    // Horizontal mini dots for list use
    return (
      <View style={[styles.compactRow, style]}>
        {CONTRACT_STEPS.map((step, i) => {
          const isDone = i < currentIndex;
          const isActive = i === currentIndex && !isCancelled;
          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <View style={[styles.compactLine, isDone && styles.compactLineDone]} />
              )}
              <View style={[
                styles.compactDot,
                isDone && styles.compactDotDone,
                isActive && styles.compactDotActive,
                isCancelled && styles.compactDotCancelled,
              ]} />
            </React.Fragment>
          );
        })}
        <Text style={styles.compactLabel}>
          {isCancelled ? (status === 'Disputed' ? 'Tranh chấp' : 'Đã hủy') : CONTRACT_STEPS[Math.max(0, currentIndex)]?.label}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {isCancelled && (
        <View style={styles.cancelledBanner}>
          <MaterialCommunityIcons name="cancel" size={16} color={Colors.danger} />
          <Text style={styles.cancelledText}>
            {status === 'Disputed' ? 'Giao dịch đang tranh chấp' : 'Hợp đồng đã bị hủy'}
          </Text>
        </View>
      )}

      {CONTRACT_STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex && !isCancelled;
        const isLast = i === CONTRACT_STEPS.length - 1;

        return (
          <View key={step.key} style={styles.stepRow}>
            {/* Connector line */}
            <View style={styles.stepLeft}>
              <View style={[
                styles.dot,
                isDone && styles.dotDone,
                isActive && styles.dotActive,
                isCancelled && !isDone && styles.dotMuted,
              ]}>
                {isDone ? (
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                ) : isActive ? (
                  <View style={styles.dotInner} />
                ) : null}
              </View>
              {!isLast && (
                <View style={[styles.connector, isDone && styles.connectorDone]} />
              )}
            </View>

            {/* Content */}
            <View style={[styles.stepContent, !isLast && styles.stepContentGap]}>
              <Text style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isDone && styles.stepLabelDone,
                isCancelled && !isDone && styles.stepLabelMuted,
              ]}>
                {step.label}
              </Text>
              {(isActive || isDone) && step.sublabel ? (
                <Text style={styles.stepSublabel}>{step.sublabel}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT_SIZE = 22;
const CONNECTOR_WIDTH = 2;

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  cancelledText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepLeft: {
    alignItems: 'center',
    width: DOT_SIZE + 8,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dotActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.blue,
    borderWidth: 2,
  },
  dotMuted: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.blue,
  },
  connector: {
    width: CONNECTOR_WIDTH,
    flex: 1,
    minHeight: 24,
    backgroundColor: Colors.borderLight,
    marginVertical: 2,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
  stepContent: {
    flex: 1,
    paddingLeft: Spacing.md,
    paddingBottom: 0,
  },
  stepContentGap: {
    paddingBottom: Spacing.lg,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    lineHeight: DOT_SIZE,
  },
  stepLabelActive: {
    color: Colors.blue,
    fontWeight: '700',
  },
  stepLabelDone: {
    color: Colors.success,
  },
  stepLabelMuted: {
    color: Colors.textMuted,
  },
  stepSublabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  // Compact
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  compactDotDone: {
    backgroundColor: Colors.success,
  },
  compactDotActive: {
    backgroundColor: Colors.blue,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  compactDotCancelled: {
    backgroundColor: Colors.danger,
  },
  compactLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 2,
  },
  compactLineDone: {
    backgroundColor: Colors.success,
  },
  compactLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    flexShrink: 1,
  },
});


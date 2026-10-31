/**
 * ContractTimeline — linear step tracker for contract & SIM transfer flow.
 * Steps: Ký quỹ (Escrow) → Ký hợp đồng (OTP) → Sang tên & Bằng chứng → Nghiệm thu → Hoàn tất
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
  {
    key: 'PendingEscrow',
    label: 'Ký quỹ (Escrow)',
    sublabel: 'Sàn giữ trung gian bảo đảm thanh toán',
  },
  {
    key: 'PendingSignature',
    label: 'Ký hợp đồng (OTP)',
    sublabel: 'Hai bên xác thực chữ ký điện tử bằng OTP',
  },
  {
    key: 'PendingTransfer',
    label: 'Sang tên & Bằng chứng',
    sublabel: 'Sang tên tại nhà mạng & chụp biên nhận',
  },
  {
    key: 'PendingVerification',
    label: 'Nghiệm thu SIM',
    sublabel: 'Người mua kiểm tra SIM & xác nhận chính chủ',
  },
  {
    key: 'Completed',
    label: 'Hoàn tất & Giải ngân',
    sublabel: 'Giải ngân tiền ký quỹ cho người bán',
  },
];

/**
 * Kiểm tra xem giao dịch còn đang ở bước Ký quỹ hoặc Chờ ký hợp đồng bằng OTP hay không.
 * Nếu đúng, bước chính tiếp theo phải là Ký hợp đồng (/contract/[tradeId]) chứ chưa tới bước Chụp bằng chứng (/handover/[tradeId]).
 */
export function isTradeAwaitingSignature(status?: TradeTransactionStatus | string | null): boolean {
  if (!status) return true;
  const s = String(status).trim();
  return (
    s === 'PendingSignature' ||
    s === 'PendingContractSigning' ||
    s === 'PENDING_SIGNATURE' ||
    s === 'PENDING_CONTRACT_SIGNING' ||
    s === 'PARTIALLY_SIGNED' ||
    s === 'DRAFT' ||
    s === 'PendingEscrow' ||
    s === 'PENDING_ESCROW'
  );
}

// Map TradeTransactionStatus to step index
export function statusToStepIndex(status: TradeTransactionStatus | string): number {
  const s = String(status || '').trim();
  if (s.startsWith('Cancelled') || s === 'CANCELLED' || s === 'Disputed' || s === 'DISPUTED') {
    return -1;
  }
  const map: Record<string, number> = {
    PendingEscrow: 0,
    PENDING_ESCROW: 0,
    PendingSignature: 1,
    PendingContractSigning: 1,
    PENDING_SIGNATURE: 1,
    PENDING_CONTRACT_SIGNING: 1,
    PARTIALLY_SIGNED: 1,
    DRAFT: 1,
    PendingTransfer: 2,
    PENDING_TRANSFER: 2,
    PENDING_SELLER_ACTION: 2,
    PendingVerification: 3,
    PENDING_VERIFICATION: 3,
    SELLER_PROOF_SUBMITTED: 3,
    PENDING_BUYER_ACTION: 3,
    Completed: 4,
    COMPLETED: 4,
  };
  return map[s] ?? 1;
}

interface ContractTimelineProps {
  status: TradeTransactionStatus | string;
  /** Compact mode — smaller and horizontal for list items */
  compact?: boolean;
  style?: ViewStyle;
}

export function ContractTimeline({ status, compact = false, style }: ContractTimelineProps) {
  const s = String(status || '').trim();
  const isDisputed = s === 'Disputed' || s === 'DISPUTED';
  const isCancelled = s.startsWith('Cancelled') || s === 'CANCELLED' || isDisputed;
  const currentIndex = statusToStepIndex(s);

  if (compact) {
    return (
      <View style={[styles.compactRow, style]}>
        {CONTRACT_STEPS.map((step, i) => {
          const isDone = !isCancelled && i < currentIndex;
          const isActive = i === currentIndex && !isCancelled;
          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <View style={[styles.compactLine, isDone && styles.compactLineDone]} />
              )}
              <View
                style={[
                  styles.compactDot,
                  isDone && styles.compactDotDone,
                  isActive && styles.compactDotActive,
                  isCancelled && styles.compactDotCancelled,
                ]}
              />
            </React.Fragment>
          );
        })}
        <Text style={styles.compactLabel}>
          {isCancelled
            ? isDisputed
              ? 'Đang khiếu nại tranh chấp'
              : 'Đã hủy giao dịch'
            : CONTRACT_STEPS[Math.max(0, currentIndex)]?.label}
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
            {isDisputed ? 'Giao dịch đang tranh chấp' : 'Hợp đồng đã bị hủy'}
          </Text>
        </View>
      )}

      {CONTRACT_STEPS.map((step, i) => {
        const isDone = !isCancelled && i < currentIndex;
        const isActive = i === currentIndex && !isCancelled;
        const isLast = i === CONTRACT_STEPS.length - 1;

        return (
          <View key={step.key} style={styles.stepRow}>
            {/* Connector line */}
            <View style={styles.stepLeft}>
              <View
                style={[
                  styles.dot,
                  isDone && styles.dotDone,
                  isActive && styles.dotActive,
                  isCancelled && !isDone && styles.dotMuted,
                ]}
              >
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
              <Text
                style={[
                  styles.stepLabel,
                  isActive && styles.stepLabelActive,
                  isDone && styles.stepLabelDone,
                  isCancelled && !isDone && styles.stepLabelMuted,
                ]}
              >
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
  stepSublabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
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

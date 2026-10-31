/**
 * ContractTimeline — linear step tracker for contract & SIM transfer flow.
 * Steps: Ký quỹ (Escrow) → Ký hợp đồng (OTP) → Sang tên & Bằng chứng → Nghiệm thu → Hoàn tất
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import type { TradeTransactionStatus } from '../../types';

export interface ContractStep {
  key: string;
  label: string;
  sublabel?: string;
}

export const CONTRACT_STEPS: ContractStep[] = [
  {
    key: 'PendingEscrow',
    label: 'Ký quỹ',
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
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactTrackRow}>
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
                >
                  {isDone && (
                    <MaterialCommunityIcons name="check" size={9} color="#FFFFFF" />
                  )}
                </View>
              </React.Fragment>
            );
          })}
        </View>
        <View
          style={[
            styles.compactPill,
            isCancelled
              ? styles.compactPillDanger
              : currentIndex === 4
              ? styles.compactPillSuccess
              : styles.compactPillInfo,
          ]}
        >
          <View
            style={[
              styles.compactPillDot,
              {
                backgroundColor: isCancelled
                  ? Colors.danger
                  : currentIndex === 4
                  ? Colors.success
                  : Colors.blue,
              },
            ]}
          />
          <Text
            style={[
              styles.compactLabel,
              {
                color: isCancelled
                  ? Colors.danger
                  : currentIndex === 4
                  ? Colors.success
                  : Colors.blue,
              },
            ]}
            numberOfLines={1}
          >
            {isCancelled
              ? isDisputed
                ? 'Đang khiếu nại'
                : 'Đã hủy'
              : `Bước ${Math.max(1, currentIndex + 1)}/5 · ${
                  CONTRACT_STEPS[Math.max(0, currentIndex)]?.label
                }`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {isCancelled && (
        <View style={styles.cancelledBanner}>
          <MaterialCommunityIcons name="alert-octagon" size={16} color={Colors.danger} />
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
                  <MaterialCommunityIcons name="check" size={13} color="#fff" />
                ) : isActive ? (
                  <View style={styles.dotInner} />
                ) : null}
              </View>
              {!isLast && (
                <View style={[styles.connector, isDone && styles.connectorDone]} />
              )}
            </View>

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

const DOT_SIZE = 24;
const CONNECTOR_WIDTH = 2;

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  cancelledText: {
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: Colors.blueSoft,
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
    backgroundColor: Colors.border,
    marginVertical: 3,
  },
  connectorDone: {
    backgroundColor: Colors.success,
  },
  stepContent: {
    flex: 1,
    paddingLeft: Spacing.md,
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
    lineHeight: 17,
  },
  stepLabelActive: {
    color: Colors.navy,
    fontWeight: '800',
  },
  stepLabelDone: {
    color: Colors.success,
    fontWeight: '700',
  },
  stepLabelMuted: {
    color: Colors.textMuted,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  compactTrackRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactDotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  compactDotActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blueBorder,
    borderWidth: 2.5,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  compactDotCancelled: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  compactLine: {
    flex: 1,
    height: 2.5,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  compactLineDone: {
    backgroundColor: Colors.success,
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  compactPillInfo: {
    backgroundColor: Colors.blueSoft,
  },
  compactPillSuccess: {
    backgroundColor: Colors.successLight,
  },
  compactPillDanger: {
    backgroundColor: Colors.dangerLight,
  },
  compactPillDot: {
    width: 5,
    height: 5,
    borderRadius: 99,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});

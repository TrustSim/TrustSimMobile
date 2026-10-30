/**
 * EvidenceCard — displays an evidence item for contract handover.
 * Shows thumbnail (if any), timestamp, type, contract code, and status.
 * Rejected state shows reason + "Chụp lại" button inline.
 */
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { VerificationStatusBadge } from './VerificationStatusBadge';
import type { VerifStatus } from './VerificationStatusBadge';

export interface EvidenceItem {
  id: string;
  thumbnailUri?: string;
  timestamp: string;        // ISO string
  evidenceType: string;     // e.g. "Ảnh bàn giao", "Hợp đồng ký"
  contractCode?: string;
  status: VerifStatus;
  rejectionReason?: string;
}

interface EvidenceCardProps {
  evidence: EvidenceItem;
  onRetake?: (id: string) => void;
  style?: ViewStyle;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function EvidenceCard({ evidence, onRetake, style }: EvidenceCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        {/* Thumbnail */}
        {evidence.thumbnailUri ? (
          <Image source={{ uri: evidence.thumbnailUri }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <MaterialCommunityIcons name="file-image-outline" size={24} color={Colors.textMuted} />
          </View>
        )}

        <View style={styles.meta}>
          <Text style={styles.evidenceType}>{evidence.evidenceType}</Text>
          {evidence.contractCode ? (
            <Text style={styles.contractCode}>#{evidence.contractCode}</Text>
          ) : null}
          <Text style={styles.timestamp}>{formatTimestamp(evidence.timestamp)}</Text>
          <VerificationStatusBadge status={evidence.status} size="sm" style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Rejection reason + retake CTA */}
      {evidence.status === 'rejected' && evidence.rejectionReason ? (
        <View style={styles.rejectionBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color={Colors.danger} />
          <Text style={styles.rejectionText}>{evidence.rejectionReason}</Text>
        </View>
      ) : null}

      {evidence.status === 'rejected' && onRetake ? (
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => onRetake(evidence.id)}
          activeOpacity={0.8}
          accessibilityLabel="Chụp lại bằng chứng"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="camera-retake-outline" size={16} color={Colors.blue} />
          <Text style={styles.retakeBtnText}>Chụp lại</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  meta: {
    flex: 1,
  },
  evidenceType: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  contractCode: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  rejectionText: {
    fontSize: 12,
    color: Colors.danger,
    flex: 1,
    lineHeight: 16,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.blue,
    minHeight: 36,
  },
  retakeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue,
  },
});


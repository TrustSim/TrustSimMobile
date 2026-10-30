/**
 * TrustLevelCard — Trust ID card showing all verification layers.
 * CCCD NFC | eKYC face | SIM | Bank account — each with status, date, next action.
 * Sensitive data always masked in list display.
 */
import React from 'react';
import {
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

export interface TrustLayer {
  key: 'cccd_nfc' | 'ekyc_face' | 'sim' | 'bank';
  label: string;
  sublabel?: string;
  status: VerifStatus;
  verifiedDate?: string;
  nextAction?: string;
  onAction?: () => void;
}

interface TrustLevelCardProps {
  layers: TrustLayer[];
  overallLevel?: 'none' | 'basic' | 'standard' | 'full';
  style?: ViewStyle;
}

const LAYER_ICONS: Record<TrustLayer['key'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  cccd_nfc: 'card-account-details-outline',
  ekyc_face: 'face-recognition',
  sim: 'sim-outline',
  bank: 'bank-outline',
};

const LEVEL_CONFIG = {
  none:     { label: 'Chưa xác thực', color: Colors.textMuted, bg: Colors.surfaceAlt },
  basic:    { label: 'Cơ bản', color: Colors.warning, bg: Colors.warningLight },
  standard: { label: 'Tiêu chuẩn', color: Colors.blue, bg: 'rgba(22,102,197,0.08)' },
  full:     { label: 'Đầy đủ', color: Colors.amber, bg: Colors.amberLight },
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function TrustLevelCard({ layers, overallLevel = 'none', style }: TrustLevelCardProps) {
  const levelCfg = LEVEL_CONFIG[overallLevel];

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.levelBadge, { backgroundColor: levelCfg.bg }]}>
          <MaterialCommunityIcons name="shield-star-outline" size={16} color={levelCfg.color} />
          <Text style={[styles.levelLabel, { color: levelCfg.color }]}>
            Trust ID · {levelCfg.label}
          </Text>
        </View>
      </View>

      {/* Layers */}
      {layers.map((layer, i) => {
        const icon = LAYER_ICONS[layer.key];
        return (
          <View key={layer.key} style={[styles.layerRow, i > 0 && styles.layerBorder]}>
            <View style={styles.layerIconBox}>
              <MaterialCommunityIcons name={icon} size={20} color={Colors.navy} />
            </View>

            <View style={styles.layerContent}>
              <Text style={styles.layerLabel}>{layer.label}</Text>
              {layer.sublabel ? (
                <Text style={styles.layerSublabel}>{layer.sublabel}</Text>
              ) : null}
              {layer.verifiedDate ? (
                <Text style={styles.layerDate}>Xác minh {formatDate(layer.verifiedDate)}</Text>
              ) : null}
              <VerificationStatusBadge status={layer.status} size="sm" style={{ marginTop: 4 }} />
            </View>

            {layer.nextAction && layer.onAction ? (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={layer.onAction}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={layer.nextAction}
              >
                <Text style={styles.actionBtnText}>{layer.nextAction}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  levelLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  layerBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  layerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  layerContent: {
    flex: 1,
  },
  layerLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  layerSublabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  layerDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.blue,
    alignSelf: 'center',
    minHeight: 36,
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
  },
});


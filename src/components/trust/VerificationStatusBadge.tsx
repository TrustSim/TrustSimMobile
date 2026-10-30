/**
 * VerificationStatusBadge
 * Never conveys state by color alone — always uses icon + text label.
 * States: verified | pending | rejected | not_submitted | checking
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';

export type VerifStatus = 'verified' | 'pending' | 'rejected' | 'not_submitted' | 'checking';

interface VerificationStatusBadgeProps {
  status: VerifStatus;
  label?: string;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<VerifStatus, {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  defaultLabel: string;
  bg: string;
  textColor: string;
  borderColor: string;
}> = {
  verified: {
    icon: 'check-circle',
    defaultLabel: 'Đã xác minh',
    bg: Colors.successLight,
    textColor: Colors.success,
    borderColor: '#A7F3D0',
  },
  pending: {
    icon: 'clock-outline',
    defaultLabel: 'Đang xét duyệt',
    bg: Colors.warningLight,
    textColor: Colors.warning,
    borderColor: '#FDE68A',
  },
  rejected: {
    icon: 'close-circle',
    defaultLabel: 'Bị từ chối',
    bg: Colors.dangerLight,
    textColor: Colors.danger,
    borderColor: '#FCA5A5',
  },
  not_submitted: {
    icon: 'circle-outline',
    defaultLabel: 'Chưa nộp',
    bg: Colors.surfaceAlt,
    textColor: Colors.textSecondary,
    borderColor: Colors.border,
  },
  checking: {
    icon: 'magnify',
    defaultLabel: 'Đang đối soát',
    bg: Colors.amberLight,
    textColor: Colors.amber,
    borderColor: '#FDE68A',
  },
};

export function VerificationStatusBadge({ status, label, style, size = 'md' }: VerificationStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const iconSize = size === 'sm' ? 12 : 14;
  const textSize = size === 'sm' ? 11 : 12;

  return (
    <View style={[
      styles.badge,
      { backgroundColor: cfg.bg, borderColor: cfg.borderColor },
      size === 'sm' && styles.badgeSm,
      style,
    ]}>
      <MaterialCommunityIcons name={cfg.icon} size={iconSize} color={cfg.textColor} />
      <Text style={[styles.text, { color: cfg.textColor, fontSize: textSize }]}>
        {label ?? cfg.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontWeight: '600',
  },
});


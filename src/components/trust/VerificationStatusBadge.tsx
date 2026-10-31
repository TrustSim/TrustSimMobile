import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BorderRadius, Colors } from '../../constants/theme';

export type VerificationBadgeStatus =
  | 'verified'
  | 'pending'
  | 'checking'
  | 'rejected'
  | 'not_submitted'
  | 'warning';

export type VerifStatus = VerificationBadgeStatus;

interface VerificationStatusBadgeProps {
  status: VerificationBadgeStatus;
  label?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

const BADGE_CONFIG: Record<
  VerificationBadgeStatus,
  {
    bg: string;
    border: string;
    text: string;
    dot: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    defaultLabel: string;
  }
> = {
  verified: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#047857',
    dot: '#10B981',
    icon: 'shield-check',
    defaultLabel: 'Đã xác thực',
  },
  pending: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#B45309',
    dot: '#F59E0B',
    icon: 'clock-fast',
    defaultLabel: 'Chờ duyệt',
  },
  checking: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1D4ED8',
    dot: '#3B82F6',
    icon: 'shield-sync-outline',
    defaultLabel: 'Đang bảo chứng',
  },
  rejected: {
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#BE123C',
    dot: '#F43F5E',
    icon: 'close-octagon-outline',
    defaultLabel: 'Từ chối',
  },
  not_submitted: {
    bg: '#F1F5F9',
    border: '#E2E8F0',
    text: '#475569',
    dot: '#94A3B8',
    icon: 'shield-outline',
    defaultLabel: 'Chưa gửi',
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#B45309',
    dot: '#F59E0B',
    icon: 'alert-circle-outline',
    defaultLabel: 'Cần bổ sung',
  },
};

export function VerificationStatusBadge({
  status,
  label,
  size = 'md',
  style,
}: VerificationStatusBadgeProps) {
  const cfg = BADGE_CONFIG[status] ?? BADGE_CONFIG.not_submitted;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          paddingHorizontal: isSmall ? 9 : 12,
          paddingVertical: isSmall ? 4 : 6,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: cfg.dot,
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
          },
        ]}
      />
      <MaterialCommunityIcons
        name={cfg.icon}
        size={isSmall ? 12 : 14}
        color={cfg.text}
      />
      <Text
        style={[
          styles.label,
          {
            color: cfg.text,
            fontSize: isSmall ? 11 : 12,
          },
        ]}
        numberOfLines={1}
      >
        {label ?? cfg.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    borderRadius: 99,
  },
  label: {
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../constants/theme';

interface BadgeProps {
  status: string;
  label?: string;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, style }) => {
  const getBadgeConfig = () => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
      case 'COMPLETED':
      case 'ACTIVE':
      case 'FULLY_SIGNED':
        return {
          bg: Colors.successLight,
          color: '#065F46',
          text: label || (status === 'VERIFIED' ? 'Đã xác thực' : status === 'COMPLETED' ? 'Hoàn tất' : status === 'FULLY_SIGNED' ? 'Đã ký số' : 'Hoạt động'),
        };
      case 'PENDING':
      case 'PENDING_VERIFICATION':
      case 'PENDING_BUYER_SIGNATURE':
      case 'PENDING_SELLER_SIGNATURE':
      case 'PENDINGTRANSFER':
      case 'PENDINGESCROW':
        return {
          bg: Colors.warningLight,
          color: '#9A3412',
          text: label || 'Đang xử lý',
        };
      case 'REJECTED':
      case 'FAILED':
      case 'CANCELLED':
      case 'REVOKED':
      case 'LOCKED':
        return {
          bg: Colors.dangerLight,
          color: '#991B1B',
          text: label || (status === 'LOCKED' ? 'Đã khóa' : status === 'FAILED' ? 'Thất bại' : 'Đã hủy'),
        };
      case 'FROZEN':
        return {
          bg: Colors.accentLight,
          color: '#92400E',
          text: label || 'Tạm giữ',
        };
      case 'UNVERIFIED':
      default:
        return {
          bg: Colors.surfaceAlt,
          color: Colors.textSecondary,
          text: label || (status === 'UNVERIFIED' ? 'Chưa xác thực' : status || 'Không rõ'),
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

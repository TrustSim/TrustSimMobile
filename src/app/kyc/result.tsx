import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';

export default function KycResultScreen() {
  const router = useRouter();
  const { fullName, identityNumber, score, status } = useLocalSearchParams<{
    fullName: string;
    identityNumber: string;
    score: string;
    status: string;
  }>();

  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });
    }, [])
  );

  return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Success Icon */}
            <View style={styles.celebrationCircle}>
              <MaterialCommunityIcons name="shield-check" size={56} color="#fff" />
            </View>

            <Text style={styles.title}>Xác Minh Danh Tính Thành Công</Text>
            <Text style={styles.subtitle}>
              Thông tin Căn cước công dân và hình ảnh chân dung đã được đối chiếu trùng khớp.
            </Text>

        <VerificationStatusBadge
              status="verified"
              label="ĐÃ XÁC THỰC CHÍNH CHỦ"
              style={styles.badge}
            />

              {/* Thẻ chi tiết thông tin trích xuất */}
              <View style={styles.infoCard}>
                <Text style={styles.cardHeader}>THÔNG TIN XÁC THỰC CĂN CƯỚC</Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Họ và tên:</Text>
                  <Text style={styles.infoValBold}>{fullName || '—'}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Số CCCD định danh:</Text>
                  <Text style={styles.infoValBold}>
                    {identityNumber ? `•••• •••• ${identityNumber.slice(-4)}` : '—'}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Độ tương đồng khuôn mặt:</Text>
                  <Text style={[styles.infoValBold, { color: Colors.success }]}>
                    {score ? `${parseFloat(score).toFixed(1)}% (Rất tốt)` : 'Đạt yêu cầu'}
                  </Text>
                </View>
          </View>

            {/* Thẻ thông báo tài khoản sẵn sàng */}
            <View style={styles.pkiCard}>
              <View style={styles.pkiHeader}>
                <MaterialCommunityIcons name="check-decagram" size={20} color={Colors.success} />
                <Text style={styles.pkiTitle}>Tài Khoản Đã Sẵn Sàng Giao Dịch</Text>
              </View>
              <Text style={styles.pkiDesc}>
                Chứng thư số cá nhân và phương thức bảo mật tài khoản đã được kích hoạt thành công. Bạn đã có thể ký hợp đồng chuyển nhượng SIM an toàn trên hệ thống.
              </Text>
        </View>

        {/* Nút hành động */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(tabs)/account')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="account-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Xem Hồ Sơ Tài Khoản</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(tabs)')}
        activeOpacity={0.7}
        >
        <Text style={styles.secondaryBtnText}>Về Trang Chủ</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.xl,
    alignItems: 'center',
    paddingBottom: Spacing.xxxl,
  },
  celebrationCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  badge: {
    marginBottom: Spacing.lg,
  },
  infoCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValBold: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  pkiCard: {
    width: '100%',
    backgroundColor: 'rgba(22, 163, 74, 0.06)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.18)',
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  pkiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  pkiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  pkiDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
    primaryBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: Colors.blue,
      borderRadius: BorderRadius.md,
      minHeight: 52,
      marginBottom: Spacing.sm,
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#fff',
    },
    secondaryBtn: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BorderRadius.md,
      minHeight: 44,
    },
    secondaryBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.textSecondary,
    },
  });

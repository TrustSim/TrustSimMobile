import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Colors, Spacing } from '../../constants/theme';

export default function KycResultScreen() {
  const router = useRouter();
  const { fullName, identityNumber, score, status } = useLocalSearchParams<{
    fullName: string;
    identityNumber: string;
    score: string;
    status: string;
  }>();

  // Guarantee portrait orientation when entering this screen
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Success Icon */}
        <View style={styles.celebrationCircle}>
          <Ionicons name="shield-checkmark" size={60} color={Colors.textInverse} />
        </View>

        <Text style={styles.title}>XÁC MINH DANH TÍNH THÀNH CÔNG!</Text>
        <Text style={styles.subtitle}>
          Thông tin Căn cước công dân và hình ảnh của bạn đã được đối chiếu chính xác.
        </Text>

        <Badge
          status={status || 'VERIFIED'}
          label="ĐÃ XÁC THỰC CHÍNH CHỦ"
          style={styles.badge}
        />

        {/* Extracted Details Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.cardHeader}>THÔNG TIN XÁC THỰC CĂN CƯỚC</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Họ và tên chủ thẻ:</Text>
            <Text style={styles.infoValBold}>{fullName || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số CCCD định danh:</Text>
            <Text style={styles.infoValBold}>{identityNumber || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Độ tương đồng khuôn mặt:</Text>
            <Text style={[styles.infoValBold, { color: Colors.success }]}>
              {score ? `${parseFloat(score).toFixed(1)}% (Rất tốt)` : 'Đạt yêu cầu'}
            </Text>
          </View>
        </Card>

        {/* Certificate Issuance Notice */}
        <Card style={styles.pkiCard}>
          <View style={styles.pkiHeader}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.pkiTitle}>Tài Khoản Đã Sẵn Sàng Giao Dịch</Text>
          </View>
          <Text style={styles.pkiDesc}>
            Chữ ký số và phương thức bảo mật tài khoản đã được kích hoạt thành công.
            Bạn có thể tham gia ký hợp đồng mua bán và giao dịch SIM an toàn trên hệ thống.
          </Text>
        </Card>

        {/* Action Buttons */}
        <Button
          title="VỀ KHO SIM CỦA TÔI"
          variant="primary"
          size="lg"
          onPress={() => router.replace('/(tabs)/sims')}
          style={styles.actionBtn}
        />

        <Button
          title="Về Trang Chủ"
          variant="ghost"
          size="md"
          onPress={() => router.replace('/(tabs)')}
          style={{ marginTop: Spacing.xs }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  celebrationCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.md,
  },
  badge: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoCard: {
    width: '100%',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
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
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValBold: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  pkiCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
    borderColor: 'rgba(30, 58, 138, 0.2)',
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  pkiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pkiTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  pkiDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  actionBtn: {
    width: '100%',
  },
});

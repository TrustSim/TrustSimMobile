import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { BorderRadius, Colors, Spacing } from '../constants/theme';

export default function VerifySuccessScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Celebration Circle Icon */}
        <View style={styles.celebrationCircle}>
          <Ionicons name="checkmark-circle" size={68} color={Colors.textInverse} />
        </View>

        <Text style={styles.title}>KÍCH HOẠT THÀNH CÔNG!</Text>
        <Text style={styles.subtitle}>
          Tài khoản và ví điện tử của bạn đã được kích hoạt thành công trên hệ thống TrustSim.
        </Text>

        {/* Email Badge */}
        {email ? (
          <View style={styles.emailBadge}>
            <Ionicons name="mail" size={16} color={Colors.primary} />
            <Text style={styles.emailText}>{email}</Text>
          </View>
        ) : null}

        {/* Features Ready Card */}
        <Card style={styles.card}>
          <Text style={styles.cardHeader}>TÍNH NĂNG ĐÃ SẴN SÀNG</Text>

          <View style={styles.featureItem}>
            <View style={[styles.iconBox, { backgroundColor: Colors.successLight }]}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Bảo Mật Tài Khoản</Text>
              <Text style={styles.featureDesc}>
                Email của bạn đã được chứng thực. Mọi thông báo giao dịch sẽ được gửi về đây an toàn.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureItem}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(30, 58, 138, 0.08)' }]}>
              <Ionicons name="wallet" size={20} color={Colors.primary} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Ví Tiền Sẵn Sàng</Text>
              <Text style={styles.featureDesc}>
                Ví tài khoản đã được khởi tạo. Bạn có thể nạp tiền VietQR và bắt đầu mua SIM bất cứ lúc nào.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.featureItem}>
            <View style={[styles.iconBox, { backgroundColor: Colors.warningLight }]}>
              <Ionicons name="id-card-outline" size={20} color={Colors.accent} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Xác Thực Danh Tính (eKYC)</Text>
              <Text style={styles.featureDesc}>
                Chụp ảnh CCCD để mở khóa quyền đăng bán SIM chính chủ và tham gia phòng đấu giá cao cấp.
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="BẮT ĐẦU SỬ DỤNG NGAY"
            variant="primary"
            size="lg"
            onPress={() => router.replace('/(tabs)' as any)}
            style={styles.mainBtn}
          />

          <Button
            title="Xác Thực Danh Tính (eKYC)"
            variant="outline"
            size="md"
            icon={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.primary} />}
            onPress={() => router.push('/kyc' as any)}
            style={styles.ekycBtn}
          />
        </View>
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
    paddingBottom: Spacing.xxl,
  },
  celebrationCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    gap: 6,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  card: {
    width: '100%',
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm + 2,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  actionButtons: {
    width: '100%',
    gap: Spacing.sm,
  },
  mainBtn: {
    width: '100%',
  },
  ekycBtn: {
    width: '100%',
  },
});

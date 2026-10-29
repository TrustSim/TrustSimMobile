import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { BottomNavBar } from '../../components/BottomNavBar';
import { Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function KycIntroScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  // Guarantee portrait orientation when entering this screen
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }, [])
  );

  const isVerified = profile?.verificationStatus === 'VERIFIED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Xác Thực Danh Tính eKYC" showBack onBack={() => router.back()} showHome />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={[styles.statusIconCircle, isVerified && styles.statusIconCircleVerified]}>
            <Ionicons
              name={isVerified ? 'shield-checkmark' : 'id-card-outline'}
              size={48}
              color={isVerified ? Colors.success : Colors.primary}
            />
          </View>

          <Text style={styles.statusTitle}>
            {isVerified ? 'Tài Khoản Đã Xác Minh Danh Tính' : 'Xác Minh Danh Tính Tài Khoản'}
          </Text>

          <View style={{ marginTop: Spacing.xs }}>
            <Badge
              status={profile?.verificationStatus || 'UNVERIFIED'}
              label={isVerified ? 'ĐÃ XÁC THỰC THÀNH CÔNG' : 'CHƯA XÁC THỰC'}
            />
          </View>

          <Text style={styles.statusDesc}>
            {isVerified
              ? 'Thông tin định danh và khuôn mặt của bạn đã được xác minh thành công. Tài khoản đã sẵn sàng để thực hiện các giao dịch mua bán SIM an toàn.'
              : 'Quy trình xác minh gồm 3 bước chụp ảnh giấy tờ và khuôn mặt trực tiếp. Hệ thống sẽ tự động duyệt nhanh chóng chỉ sau vài giây.'}
          </Text>
        </Card>

        {/* 3 Step Roadmap */}
        <Card style={styles.stepsCard}>
          <Text style={styles.stepsHeader}>QUY TRÌNH CHỤP ẢNH 3 BƯỚC ĐƠN GIẢN</Text>

          <View style={styles.stepItem}>
            <View style={styles.stepNumBox}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Chụp Mặt Trước CCCD</Text>
              <Text style={styles.stepSubtitle}>
                Đặt thẻ căn cước vào khung hình chữ nhật, chụp rõ họ tên, ngày sinh và số CCCD.
              </Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepItem}>
            <View style={styles.stepNumBox}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Chụp Mặt Sau CCCD</Text>
              <Text style={styles.stepSubtitle}>
                Chụp rõ chip điện tử và các dòng ký tự bên dưới, tránh để lóa ánh sáng.
              </Text>
            </View>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.stepItem}>
            <View style={styles.stepNumBox}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Chụp Ảnh Chân Dung Khuôn Mặt</Text>
              <Text style={styles.stepSubtitle}>
                Đưa khuôn mặt vào giữa khung bầu dục, nhìn thẳng, không đeo kính râm hoặc khẩu trang.
              </Text>
            </View>
          </View>
        </Card>

        {/* Anti Fraud Warning */}
        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
            <Text style={styles.warningTitle}>Quy định Bảo Mật & An Toàn</Text>
          </View>
          <Text style={styles.warningDesc}>
            Để đảm bảo an toàn cho mọi giao dịch, hình ảnh giấy tờ và chân dung cần được chụp
            trực tiếp từ máy ảnh tại thời điểm xác thực.
          </Text>
        </Card>

        {/* Action Button */}
        <Button
          title={isVerified ? 'CHỤP LẠI ĐỂ CẬP NHẬT' : 'BẮT ĐẦU XÁC THỰC CCCD'}
          variant={isVerified ? 'outline' : 'primary'}
          size="lg"
          icon={<Ionicons name="camera" size={20} color={isVerified ? Colors.primary : Colors.textInverse} />}
          onPress={() => router.push('/kyc/camera-front')}
          style={styles.startBtn}
        />
      </ScrollView>
      <BottomNavBar activeTab="account" />
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
  },
  statusCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  statusIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statusIconCircleVerified: {
    backgroundColor: Colors.successLight,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  statusDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.md,
  },
  stepsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stepsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  stepNum: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  stepSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  stepDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  warningCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.25)',
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
    marginLeft: Spacing.xs,
  },
  warningDesc: {
    fontSize: 12,
    color: '#9A3412',
    lineHeight: 17,
  },
  startBtn: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
});

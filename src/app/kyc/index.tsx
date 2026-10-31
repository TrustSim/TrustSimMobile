import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function KycIntroScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  // Đảm bảo luôn khóa hướng dọc khi vào màn hình này
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { });
    }, [])
  );

  const isVerified = profile?.verificationStatus === 'VERIFIED';
  const isPending = profile?.verificationStatus === 'PENDING_VERIFICATION';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Xác Thực Danh Tính" showBack onBack={() => router.back()} />

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Thẻ trạng thái xác minh */}
            <View style={styles.statusCard}>
              <View style={[styles.statusIconCircle, isVerified && styles.statusIconCircleVerified]}>
            <MaterialCommunityIcons
                  name={isVerified ? 'shield-check' : 'card-account-details-outline'}
                  size={44}
                  color={isVerified ? Colors.success : Colors.navy}
                />
              </View>

              <Text style={styles.statusTitle}>
                {isVerified ? 'Tài Khoản Đã Xác Minh Danh Tính' : 'Xác Minh Danh Tính Tài Khoản'}
              </Text>

              <View style={{ marginTop: Spacing.xs }}>
            <VerificationStatusBadge
                  status={isVerified ? 'verified' : (isPending ? 'pending' : 'not_submitted')}
                  label={isVerified ? 'ĐÃ XÁC MINH' : (isPending ? 'ĐANG CHỜ DUYỆT' : 'CHƯA XÁC MINH')}
                />
              </View>

              <Text style={styles.statusDesc}>
                {isVerified
                ? 'Thông tin định danh và khuôn mặt của bạn đã được xác thực an toàn. Bạn đã đủ điều kiện ký hợp đồng điện tử và thực hiện mọi giao dịch SIM trên sàn.'
              : 'Quy trình xác thực gồm 3 bước chụp ảnh thẻ CCCD và nhận diện khuôn mặt. Hệ thống đối chiếu dữ liệu tự động chỉ trong vài giây.'}
              </Text>
          </View>

            {/* Lộ trình 3 bước xác thực */}
            <View style={styles.stepsCard}>
              <Text style={styles.stepsHeader}>QUY TRÌNH CHỤP ẢNH 3 BƯỚC ĐƠN GIẢN</Text>

              <View style={styles.stepItem}>
                <View style={styles.stepNumBox}>
                  <Text style={styles.stepNum}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Chụp Mặt Trước CCCD</Text>
                  <Text style={styles.stepSubtitle}>
                    Căn chỉnh thẻ căn cước vào khung hình, chụp rõ họ tên, ngày sinh và số định danh.
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
                    Chụp rõ chip bảo mật và các dòng ký tự phía sau thẻ, tránh bị lóa đèn hoặc che góc.
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
                    Đưa khuôn mặt vào giữa khung hình bầu dục, nhìn thẳng, không đeo kính râm hoặc khẩu trang.
                  </Text>
                </View>
              </View>
        </View>

            {/* Mục Quy định Bảo mật & An toàn (Thiết kế thanh lịch, chuyên nghiệp theo phong cách Swiss Fintech) */}
            <View style={styles.policyCard}>
              <View style={styles.policyHeader}>
                <View style={styles.policyIconBox}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={18} color={Colors.blue} />
                </View>
                <Text style={styles.policyTitle}>Quy định bảo mật & an toàn thông tin</Text>
              </View>
                <Text style={styles.policyDesc}>
                  Để bảo vệ an toàn cho mọi giao dịch chuyển nhượng SIM, hình ảnh giấy tờ và chân dung cần được chụp trực tiếp từ máy ảnh tại thời điểm xác thực. Thông tin của bạn được mã hóa an toàn theo tiêu chuẩn ngân hàng số.
                </Text>
            </View>

              {/* Nút bắt đầu thực hiện */}
        <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/kyc/camera-front')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Bắt đầu xác thực CCCD"
        >
            <MaterialCommunityIcons name="camera" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>
              {isVerified ? 'Chụp Lại Để Cập Nhật' : 'Bắt Đầu Xác Thực CCCD'}
            </Text>
          </TouchableOpacity>
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
    paddingBottom: Spacing.xxxl,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  statusIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(11, 31, 58, 0.06)',
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
    color: Colors.navy,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  statusDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: Spacing.md,
  },
  stepsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  stepsHeader: {
    fontSize: 11,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  stepSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 3,
  },
  stepDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
    policyCard: {
      backgroundColor: 'rgba(22, 102, 197, 0.05)',
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(22, 102, 197, 0.15)',
      padding: Spacing.md,
      marginBottom: Spacing.xl,
    },
      policyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: Spacing.xs,
      },
        policyIconBox: {
          width: 26,
          height: 26,
          borderRadius: 6,
          backgroundColor: 'rgba(22, 102, 197, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        policyTitle: {
          fontSize: 13,
          fontWeight: '800',
          color: Colors.navy,
        },
          policyDesc: {
            fontSize: 12,
            color: Colors.textSecondary,
            lineHeight: 18,
          },
            actionBtn: {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: Colors.blue,
              borderRadius: BorderRadius.md,
              minHeight: 52,
              marginBottom: Spacing.xl,
            },
            actionBtnText: {
              fontSize: 15,
              fontWeight: '800',
              color: '#fff',
            },
          });

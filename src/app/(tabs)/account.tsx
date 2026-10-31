import React, { useEffect } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function AccountScreen() {
  const router = useRouter();
  const { user, profile, logout, refreshProfile } = useAuth();

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const performLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng TrustSim?')
      ) {
        performLogout();
      }
    } else {
      Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng TrustSim?', [
        { text: 'Hủy bỏ', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: performLogout,
        },
      ]);
    }
  };

  const isVerified = profile?.verificationStatus === 'VERIFIED';
  const isPending = profile?.verificationStatus === 'PENDING_VERIFICATION';
  const isRejected = profile?.verificationStatus === 'REJECTED';

  const maskSensitive = (str?: string) => {
    if (!str) return 'Chưa cập nhật';
    if (str.length <= 4) return '••••';
    return '•••• ' + str.slice(-4);
  };

  const getKycBadgeStatus = () => {
    if (isVerified) return 'verified' as const;
    if (isPending) return 'pending' as const;
    if (isRejected) return 'rejected' as const;
    return 'not_submitted' as const;
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>XÁC THỰC CÁ NHÂN & BẢO MẬT</Text>
            <Text style={styles.pageTitle}>Định Danh & Hồ Sơ</Text>
          </View>
          <VerificationStatusBadge
            status={getKycBadgeStatus()}
            label={
              isVerified
                ? 'Đã định danh'
                : isPending
                  ? 'Chờ duyệt'
                  : isRejected
                    ? 'Cần chụp lại'
                    : 'Chưa định danh'
            }
          />
        </View>

        {/* User Identity Header Panel */}
        <View style={styles.identityHeaderPanel}>
          <View style={styles.avatarBox}>
            <MaterialCommunityIcons name="shield-account-outline" size={26} color={Colors.navy} />
          </View>
          <View style={styles.identityTextCol}>
            <Text style={styles.userName}>
              {profile?.fullName || user?.fullName || user?.userName || 'Thành viên TrustSim'}
            </Text>
            <Text style={styles.userEmail}>{profile?.email || user?.email || '—'}</Text>
          </View>
        </View>

        {/* Rejection Warning if applicable */}
        {isRejected ? (
          <View style={styles.rejectBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectBannerTitle}>Hồ sơ định danh cần chụp lại</Text>
              <Text style={styles.rejectBannerReason}>
                Ảnh giấy tờ hoặc khuôn mặt chưa đạt tiêu chuẩn đối soát. Vui lòng thực hiện chụp lại.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Core Verification Operations (eKYC + NFC + SIM) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>NGHIỆP VỤ ĐỊNH DANH BẮT BUỘC</Text>
        </View>

        <View style={styles.ledgerPanel}>
          {/* 1. Chụp ảnh CCCD & Khuôn mặt (3 bước) */}
          <TouchableOpacity
            style={styles.opRow}
            onPress={() => router.push('/kyc')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Xác thực CCCD và khuôn mặt"
          >
            <View style={styles.opIconBox}>
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={20}
                color={Colors.navy}
              />
            </View>
            <View style={styles.opContent}>
              <Text style={styles.opTitle}>Chụp CCCD & Khuôn mặt (3 bước)</Text>
              <Text style={styles.opDesc}>
                Chụp mặt trước, mặt sau CCCD và ảnh chân dung trực tiếp
              </Text>
            </View>
            <View style={styles.opRight}>
              <VerificationStatusBadge status={getKycBadgeStatus()} size="sm" />
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={styles.hairlineH} />

          {/* 2. Đọc chip CCCD qua NFC */}
          <TouchableOpacity
            style={styles.opRow}
            onPress={() => router.push('/kyc/nfc')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Đọc chip CCCD qua NFC"
          >
            <View style={styles.opIconBox}>
              <MaterialCommunityIcons name="nfc-variant" size={20} color={Colors.navy} />
            </View>
            <View style={styles.opContent}>
              <Text style={styles.opTitle}>Đọc chip CCCD gắn chip (NFC)</Text>
              <Text style={styles.opDesc}>
                Quét dữ liệu bảo mật từ chip điện tử hoặc chọn xác thực thủ công
              </Text>
            </View>
            <View style={styles.opRight}>
              <Text style={styles.actionLinkText}>{isVerified ? 'Đã xác thực' : 'Quét chip'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={styles.hairlineH} />

          {/* 3. Xác thực SIM chính chủ */}
          <TouchableOpacity
            style={styles.opRow}
            onPress={() => router.push('/sims/verify')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Xác thực SIM chính chủ"
          >
            <View style={styles.opIconBox}>
              <MaterialCommunityIcons name="sim-outline" size={20} color={Colors.navy} />
            </View>
            <View style={styles.opContent}>
              <Text style={styles.opTitle}>Xác thực SIM chính chủ (SMS OTP)</Text>
              <Text style={styles.opDesc}>
                Đối soát thông tin chủ thuê bao trùng khớp với hồ sơ CCCD
              </Text>
            </View>
            <View style={styles.opRight}>
              <Text style={styles.actionLinkText}>Đối soát</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={styles.hairlineH} />

          {/* 4. Tài khoản ngân hàng nhận tiền */}
          <TouchableOpacity
            style={styles.opRow}
            onPress={() => router.push('/withdraw')}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Tài khoản ngân hàng nhận tiền"
          >
            <View style={styles.opIconBox}>
              <MaterialCommunityIcons name="bank-outline" size={20} color={Colors.navy} />
            </View>
            <View style={styles.opContent}>
              <Text style={styles.opTitle}>Tài khoản ngân hàng thụ hưởng</Text>
              <Text style={styles.opDesc}>
                Chỉ cho phép rút tiền về tài khoản trùng tên trên CCCD
              </Text>
            </View>
            <View style={styles.opRight}>
              <Text style={styles.actionLinkText}>Kiểm tra</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Masked Personal Identity Record */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>DỮ LIỆU ĐỊNH DANH ĐÃ LƯU TRỮ</Text>
        </View>

        <View style={styles.ledgerPanel}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Họ và tên pháp lý</Text>
            <Text style={styles.dataValue}>
              {profile?.fullName || user?.fullName || 'Chưa cập nhật'}
            </Text>
          </View>

          <View style={styles.hairlineH} />

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Số CCCD / Định danh</Text>
            <Text style={[styles.dataValue, styles.monoText]}>
              {maskSensitive(profile?.identityNumber)}
            </Text>
          </View>

          <View style={styles.hairlineH} />

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Số điện thoại liên kết</Text>
            <Text style={[styles.dataValue, styles.monoText]}>
              {maskSensitive(profile?.phoneNumber)}
            </Text>
          </View>

          <View style={styles.hairlineH} />

          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Nơi thường trú</Text>
            <Text style={styles.dataValue} numberOfLines={1}>
              {profile?.address || 'Đã ẩn bảo mật'}
            </Text>
          </View>
        </View>

        {/* Quick Evidence & Dispute Access */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>TRA CỨU CHUYỂN NHƯỢNG & HỒ SƠ</Text>
        </View>

        <View style={styles.ledgerPanel}>
          <TouchableOpacity
            style={styles.opRow}
            onPress={() => router.push('/(tabs)/contracts')}
            activeOpacity={0.75}
          >
            <View style={styles.opIconBox}>
              <MaterialCommunityIcons name="camera-document" size={20} color={Colors.navy} />
            </View>
            <View style={styles.opContent}>
              <Text style={styles.opTitle}>Quá trình chuyển nhượng & Bằng chứng</Text>
              <Text style={styles.opDesc}>
                Xem hợp đồng, chụp biên nhận sang tên hoặc báo cáo sự cố trong giao dịch
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Action */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất tài khoản"
        >
          <MaterialCommunityIcons name="logout" size={18} color={Colors.danger} />
          <Text style={styles.logoutBtnText}>Đăng Xuất Khỏi Thiết Bị</Text>
        </TouchableOpacity>

        <Text style={styles.footerVersion}>
          TrustSim Mobile · Thiết bị xác thực & bảo chứng giao dịch
        </Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
  },
  identityHeaderPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatarBox: {
    width: 46,
    height: 46,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  identityTextCol: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rejectBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  rejectBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.danger,
  },
  rejectBannerReason: {
    fontSize: 12,
    color: Colors.navy,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
  },
  ledgerPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  hairlineH: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  opIconBox: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  opContent: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  opTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  opDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  opRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  dataLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    maxWidth: '58%',
    textAlign: 'right',
  },
  monoText: {
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.sm,
    minHeight: 46,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.danger,
  },
  footerVersion: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

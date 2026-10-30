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
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { TrustLevelCard } from '../../components/trust/TrustLevelCard';
import type { TrustLayer } from '../../components/trust/TrustLevelCard';
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
      if (typeof window !== 'undefined' && window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng TrustSim?')) {
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

  // Mask helper
  const maskSensitive = (str?: string) => {
    if (!str) return 'Chưa cập nhật';
    if (str.length <= 4) return '••••';
    return '•••• ' + str.slice(-4);
  };

  // Build Trust ID layers
  const trustLayers: TrustLayer[] = [
    {
      key: 'cccd_nfc',
      label: 'CCCD gắn chip (NFC)',
      sublabel: isVerified ? 'Đã đọc & xác thực chữ ký số chip C06' : 'Đọc chip bảo mật qua công nghệ NFC',
      status: isVerified ? 'verified' : (isPending ? 'pending' : 'not_submitted'),
      verifiedDate: profile?.verifiedAt,
      nextAction: isVerified ? undefined : 'Quét NFC',
      onAction: () => router.push('/kyc/nfc'),
    },
    {
      key: 'ekyc_face',
      label: 'Khuôn mặt & eKYC (AI Liveness)',
      sublabel: isVerified ? 'Độ trùng khớp sinh trắc học 98%' : 'Chụp ảnh chân dung chống giả mạo',
      status: isVerified ? 'verified' : (isPending ? 'pending' : 'not_submitted'),
      verifiedDate: profile?.verifiedAt,
      nextAction: isVerified ? undefined : 'Chụp eKYC',
      onAction: () => router.push('/kyc'),
    },
    {
      key: 'sim',
      label: 'SIM chính chủ telco',
      sublabel: 'Đối chiếu thuê bao nhà mạng Viettel / Vina / Mobi',
      status: isVerified ? 'verified' : 'not_submitted',
      nextAction: 'Đối soát',
      onAction: () => router.push('/sims/verify'),
    },
    {
      key: 'bank',
      label: 'Tài khoản ngân hàng rút tiền',
      sublabel: 'Tài khoản chính chủ nhận tiền thanh toán',
      status: isVerified ? 'verified' : 'not_submitted',
      nextAction: 'Quản lý',
      onAction: () => router.push('/withdraw'),
    },
  ];

  const overallLevel = isVerified ? 'full' : (isPending ? 'standard' : 'none');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <MaterialCommunityIcons name="account" size={36} color={Colors.navy} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>
              {profile?.fullName || user?.fullName || user?.userName || 'Người dùng TrustSim'}
            </Text>
            <Text style={styles.userEmail}>{profile?.email || user?.email}</Text>
          </View>
        </View>

        {/* Trust ID Section (Prominent) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hồ Sơ Định Danh (Trust ID)</Text>
        </View>

        <TrustLevelCard
          layers={trustLayers}
          overallLevel={overallLevel}
          style={{ marginBottom: Spacing.lg }}
        />

        {/* Identity Details Card (Masked) */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardHeaderTitle}>THÔNG TIN XÁC THỰC BẢO MẬT</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Số CCCD/Định danh</Text>
            <Text style={styles.detailValue}>{maskSensitive(profile?.identityNumber)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Số điện thoại liên hệ</Text>
            <Text style={styles.detailValue}>{maskSensitive(profile?.phoneNumber)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Địa chỉ thường trú</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {profile?.address || 'Đã mã hóa bảo mật'}
            </Text>
          </View>
        </View>

        {/* System & Navigation Links */}
        <View style={styles.menuCard}>
          <Text style={styles.cardHeaderTitle}>TIỆN ÍCH & GIAO DỊCH</Text>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/(tabs)/contracts')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Hợp đồng điện tử"
          >
            <View style={styles.navLeft}>
              <MaterialCommunityIcons name="file-document-outline" size={20} color={Colors.navy} />
              <Text style={styles.navText}>Hợp đồng chuyển nhượng PAdES</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/transactions')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Lịch sử giao dịch ví"
          >
            <View style={styles.navLeft}>
              <MaterialCommunityIcons name="history" size={20} color={Colors.navy} />
              <Text style={styles.navText}>Lịch sử giao dịch ví</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/sims/verify')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Xác thực SIM chính chủ"
          >
            <View style={styles.navLeft}>
              <MaterialCommunityIcons name="sim" size={20} color={Colors.navy} />
              <Text style={styles.navText}>Đối soát SIM chính chủ</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Đăng xuất tài khoản"
        >
          <MaterialCommunityIcons name="logout" size={18} color={Colors.danger} />
          <Text style={styles.logoutBtnText}>Đăng Xuất Tài Khoản</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>TrustSim Mobile · Kiến trúc Trust Ledger v2.0</Text>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    minHeight: 40,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  menuCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    minHeight: 48,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.md,
    minHeight: 48,
    marginBottom: Spacing.md,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.danger,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

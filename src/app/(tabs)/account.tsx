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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Colors, Spacing } from '../../constants/theme';
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.userName}>
            {profile?.fullName || user?.fullName || user?.userName || 'Người dùng TrustSim'}
          </Text>
          <Text style={styles.userEmail}>{profile?.email || user?.email}</Text>

          <View style={styles.badgeWrapper}>
            <Badge
              status={profile?.verificationStatus || 'UNVERIFIED'}
              label={isVerified ? 'Đã xác minh' : 'Chưa xác minh'}
            />
          </View>
        </Card>

        {/* eKYC Call to Action */}
        <Card style={[styles.ekycBanner, isVerified && styles.ekycBannerVerified]}>
          <View style={styles.ekycHeaderRow}>
            <Ionicons
              name={isVerified ? 'shield-checkmark' : 'shield-outline'}
              size={28}
              color={isVerified ? Colors.success : Colors.warning}
            />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={styles.ekycTitle}>
                {isVerified ? 'Danh Tính Đã Được Xác Minh' : 'Xác Thực Danh Tính Tài Khoản'}
              </Text>
              <Text style={styles.ekycDesc}>
                {isVerified
                  ? 'Tài khoản của bạn đã được chứng thực chính chủ và bảo vệ an toàn. Bạn có thể thực hiện mọi giao dịch mua bán SIM trên hệ thống.'
                  : 'Chụp ảnh CCCD và ảnh chân dung khuôn mặt để hoàn tất xác minh tài khoản, sẵn sàng tham gia giao dịch an toàn.'}
              </Text>
            </View>
          </View>

          {!isVerified && (
            <Button
              title="XÁC THỰC TÀI KHOẢN NGAY"
              variant="accent"
              size="md"
              onPress={() => router.push('/kyc')}
              style={{ marginTop: Spacing.md }}
            />
          )}
        </Card>

        {/* Account Details List */}
        <Card style={styles.menuCard}>
          <Text style={styles.menuHeader}>HỒ SƠ CÁ NHÂN</Text>

          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>Số CCCD / CMND:</Text>
            <Text style={styles.menuValue}>{profile?.identityNumber || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>Số điện thoại:</Text>
            <Text style={styles.menuValue}>{profile?.phoneNumber || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.menuItem}>
            <Text style={styles.menuLabel}>Địa chỉ thường trú:</Text>
            <Text style={styles.menuValue}>{profile?.address || 'Chưa cập nhật'}</Text>
          </View>
        </Card>

        {/* Navigation Shortcuts */}
        <Card style={styles.menuCard}>
          <Text style={styles.menuHeader}>TIỆN ÍCH HỆ THỐNG</Text>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/transactions')}
            activeOpacity={0.7}
          >
            <View style={styles.navLeft}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <Text style={styles.navText}>Lịch sử giao dịch ví</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/sims/verify')}
            activeOpacity={0.7}
          >
            <View style={styles.navLeft}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={Colors.accent} />
              <Text style={styles.navText}>Xác thực SIM chính chủ</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/contract/preview')}
            activeOpacity={0.7}
          >
            <View style={styles.navLeft}>
              <Ionicons name="receipt-outline" size={20} color={Colors.success} />
              <Text style={styles.navText}>Hợp đồng chuyển nhượng SIM</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Logout Button */}
        <Button
          title="Đăng Xuất Tài Khoản"
          variant="danger"
          size="md"
          icon={<Ionicons name="log-out-outline" size={18} color={Colors.textInverse} />}
          onPress={handleLogout}
          style={styles.logoutBtn}
        />

        <Text style={styles.versionText}>TrustSim Mobile v1.0.0 (Expo SDK 57)</Text>
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
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeWrapper: {
    marginTop: Spacing.sm,
  },
  ekycBanner: {
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: '#FED7AA',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ekycBannerVerified: {
    backgroundColor: Colors.successLight,
    borderColor: '#A7F3D0',
  },
  ekycHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ekycTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  ekycDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 17,
  },
  menuCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  menuHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
  },
  menuLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  menuValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  logoutBtn: {
    marginTop: Spacing.md,
  },
  versionText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});

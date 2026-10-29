import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, wallet, refreshWallet, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.allSettled([refreshWallet(), refreshProfile()]);
    setRefreshing(false);
  };

  const handleAddSim = () => {
    if (profile?.verificationStatus !== 'VERIFIED') {
      Alert.alert(
        'Yêu cầu xác minh danh tính',
        'Để thêm và xác thực số SIM chính chủ, bạn cần hoàn thành xác thực CCCD (eKYC) trước.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Xác minh ngay', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    router.push('/sims/verify');
  };

  const formatVnd = (amount?: number) => {
    if (typeof amount !== 'number') return '0 đ';
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Top User Greeting Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetingSub}>Xin chào,</Text>
            <Text style={styles.greetingName}>
              {profile?.fullName || user?.fullName || user?.userName || 'Quý khách'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push('/(tabs)/account')}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
            <View style={styles.notifBadge} />
          </TouchableOpacity>
        </View>

        {/* Hero Escrow Banner */}
        <Card style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroTag}>GIAO DỊCH AN TOÀN TUYỆT ĐỐI</Text>
              <Text style={styles.heroTitle}>Bảo Vệ Người Mua & Bán</Text>
            </View>
            <View style={styles.heroIconBox}>
              <Ionicons name="shield-checkmark" size={28} color={Colors.accent} />
            </View>
          </View>
          <Text style={styles.heroDesc}>
            Khoản thanh toán được bảo lưu an toàn cho đến khi bạn nhận và kiểm tra SIM hoạt động tốt. Hợp đồng điện tử có đầy đủ giá trị pháp lý.
          </Text>

          {/* Wallet Balance Preview inside Hero */}
          <View style={styles.heroBalanceBox}>
            <View>
              <Text style={styles.heroBalLabel}>Số dư khả dụng:</Text>
              <Text style={styles.heroBalValue}>{formatVnd(wallet?.availableBalance)}</Text>
            </View>
            <TouchableOpacity
              style={styles.heroDepositBtn}
              onPress={() => router.push('/deposit')}
            >
              <Ionicons name="add-circle" size={16} color={Colors.primary} />
              <Text style={styles.heroDepositText}>Nạp tiền</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Quick Actions Grid */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Thao Tác Nhanh</Text>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/deposit')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="add-circle-outline" size={24} color={Colors.success} />
            </View>
            <Text style={styles.actionLabel}>Nạp Tiền</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/withdraw')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.12)' }]}>
              <Ionicons name="arrow-up-circle-outline" size={24} color={Colors.primaryLight} />
            </View>
            <Text style={styles.actionLabel}>Rút Tiền</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/kyc')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Ionicons name="id-card-outline" size={24} color={Colors.accent} />
            </View>
            <Text style={styles.actionLabel}>Xác Minh CCCD</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleAddSim}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.12)' }]}>
              <Ionicons name="phone-portrait-outline" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.actionLabel}>Thêm SIM</Text>
          </TouchableOpacity>
        </View>

        {/* Active Trade / Contract Highlight */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Hợp Đồng & Giao Dịch Gần Đây</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.seeAllText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Trade State - Clean without seed data */}
        <Card style={styles.tradeCard}>
          <View style={styles.emptyTradeBox}>
            <Ionicons name="document-text-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTradeTitle}>Chưa có hợp đồng nào cần xử lý</Text>
            <Text style={styles.emptyTradeDesc}>
              Khi bạn tham gia mua hoặc bán SIM, các hợp đồng và tiến trình bàn giao sẽ xuất hiện tại đây.
            </Text>
            <Button
              title="Khám Phá Kho SIM"
              variant="outline"
              size="sm"
              onPress={() => router.push('/(tabs)/sims')}
              style={{ marginTop: Spacing.md }}
            />
          </View>
        </Card>

        {/* eKYC Status Callout */}
        {profile?.verificationStatus !== 'VERIFIED' && (
          <Card style={styles.kycCallout}>
            <View style={styles.kycCalloutContent}>
              <View style={styles.kycCalloutIcon}>
                <Ionicons name="alert-circle" size={24} color={Colors.warning} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.kycCalloutTitle}>Chưa xác minh căn cước!</Text>
                <Text style={styles.kycCalloutDesc}>
                  Vui lòng xác minh căn cước công dân để an tâm giao dịch và ký hợp đồng mua bán SIM.
                </Text>
              </View>
            </View>
            <Button
              title="XÁC MINH NGAY (3 BƯỚC)"
              variant="accent"
              size="sm"
              onPress={() => router.push('/kyc')}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        )}
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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greetingSub: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.xl,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTag: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.textInverse,
    marginTop: 2,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: Spacing.sm,
    lineHeight: 17,
  },
  heroBalanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  heroBalLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  heroBalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textInverse,
    marginTop: 2,
  },
  heroDepositBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  heroDepositText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  actionItem: {
    alignItems: 'center',
    width: '23%',
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  tradeCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  emptyTradeBox: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  emptyTradeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptyTradeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  kycCallout: {
    backgroundColor: Colors.warningLight,
    borderColor: '#FED7AA',
    borderWidth: 1,
    padding: Spacing.md,
  },
  kycCalloutContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  kycCalloutIcon: {
    paddingTop: 2,
  },
  kycCalloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9A3412',
  },
  kycCalloutDesc: {
    fontSize: 12,
    color: '#9A3412',
    marginTop: 2,
    lineHeight: 16,
  },
});

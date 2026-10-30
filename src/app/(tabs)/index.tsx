import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { ContractTimeline } from '../../components/trust/ContractTimeline';
import { MoneyField } from '../../components/trust/MoneyField';
import { useAuth } from '../../context/AuthContext';
import { contractService } from '../../services/contractService';
import type { TradeTransactionDto } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, wallet, refreshWallet, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrades, setActiveTrades] = useState<TradeTransactionDto[]>([]);

  const fetchActiveTrades = useCallback(async () => {
    try {
      const res = await contractService.getMyContracts({ pageIndex: 1, pageSize: 3 });
      if (res.success && res.data?.items) {
        setActiveTrades(res.data.items);
      }
    } catch {
      setActiveTrades([]);
    }
  }, []);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.allSettled([refreshWallet(), refreshProfile(), fetchActiveTrades()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refreshWallet();
        refreshProfile();
        fetchActiveTrades();
      }
    }, [user, refreshWallet, refreshProfile, fetchActiveTrades])
  );

  const isVerified = profile?.verificationStatus === 'VERIFIED';
  const availableBal = wallet?.availableBalance ?? 0;
  const lockedBal = wallet?.lockedBalance ?? 0;
  const totalBal = wallet?.totalBalance ?? (availableBal + lockedBal);

  const handleKycPress = () => {
    if (isVerified) {
      router.push('/(tabs)/account');
    } else {
      router.push('/kyc');
    }
  };

  const handleSimAction = () => {
    if (!isVerified) {
      Alert.alert(
        'Yêu cầu xác minh danh tính',
        'Để liên kết và quản lý SIM, bạn cần hoàn thành xác thực căn cước công dân trước.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Xác thực ngay', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    router.push('/sims/verify');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Trust ID Status Banner */}
        <View style={styles.topHeader}>
          <View style={styles.greetingBox}>
            <Text style={styles.greetingSub}>Hệ thống chuyển nhượng SIM an toàn</Text>
            <Text style={styles.greetingName}>
              {profile?.fullName || user?.fullName || user?.userName || 'Tài khoản TrustSim'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.trustBadgeBtn}
            onPress={handleKycPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Trạng thái xác thực danh tính"
          >
            <MaterialCommunityIcons
              name={isVerified ? 'shield-check' : 'shield-alert-outline'}
              size={18}
              color={isVerified ? Colors.amber : Colors.warning}
            />
            <Text style={[styles.trustBadgeText, { color: isVerified ? Colors.amber : Colors.warning }]}>
              {isVerified ? 'Đã xác minh' : 'Chưa xác thực'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trạng thái định danh rút gọn */}
        <View style={styles.trustStripCard}>
          <View style={styles.trustStripHeader}>
            <View style={styles.trustStripTitleRow}>
              <MaterialCommunityIcons name="shield-lock-outline" size={16} color={Colors.navy} />
              <Text style={styles.trustStripTitle}>Trạng thái định danh tài khoản</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/account')}>
              <Text style={styles.linkText}>Chi tiết</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.trustPillsRow}>
            <View style={styles.trustPill}>
              <MaterialCommunityIcons
                name={isVerified ? 'check-circle' : 'circle-outline'}
                size={14}
                color={isVerified ? Colors.success : Colors.textMuted}
              />
              <Text style={styles.trustPillLabel}>Căn cước công dân</Text>
            </View>
            <View style={styles.trustPill}>
              <MaterialCommunityIcons
                name="cellphone-check"
                size={14}
                color={isVerified ? Colors.blue : Colors.textMuted}
              />
              <Text style={styles.trustPillLabel}>SIM chính chủ</Text>
            </View>
            <View style={styles.trustPill}>
              <MaterialCommunityIcons
                name="bank-check"
                size={14}
                color={Colors.blue}
              />
              <Text style={styles.trustPillLabel}>Tài khoản ví</Text>
            </View>
          </View>
        </View>

        {/* Số dư ví */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tài Khoản & Số Dư</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/wallet')}>
            <Text style={styles.linkText}>Ví & Lịch sử</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ledgerCard}>
          <View style={styles.ledgerMainRow}>
            <View>
              <Text style={styles.ledgerMainLabel}>SỐ DƯ KHẢ DỤNG</Text>
              <Text style={styles.ledgerMainAmount}>
                {availableBal.toLocaleString('vi-VN')}{' '}
                <Text style={styles.currency}>₫</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.depositCtaBtn}
              onPress={() => router.push('/deposit')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Nạp tiền vào ví"
            >
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.depositCtaText}>Nạp tiền</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ledgerBreakdown}>
            <View style={styles.ledgerSubCol}>
              <Text style={styles.ledgerSubLabel}>Đang ký quỹ an toàn</Text>
              <Text style={[styles.ledgerSubAmount, { color: Colors.warning }]}>
                {lockedBal.toLocaleString('vi-VN')} ₫
              </Text>
            </View>
            <View style={styles.ledgerDivider} />
            <View style={styles.ledgerSubCol}>
              <Text style={styles.ledgerSubLabel}>Tổng số dư</Text>
              <Text style={styles.ledgerSubAmount}>
                {totalBal.toLocaleString('vi-VN')} ₫
              </Text>
            </View>
          </View>
        </View>

        {/* Nút thao tác nhanh (Đã thay Đấu giá bằng Hợp đồng) */}
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/deposit')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Nạp tiền"
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(22, 102, 197, 0.08)' }]}>
              <MaterialCommunityIcons name="arrow-down-bold-circle-outline" size={24} color={Colors.blue} />
            </View>
            <Text style={styles.actionCardTitle}>Nạp tiền</Text>
            <Text style={styles.actionCardDesc}>VietQR tức thì</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/withdraw')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Rút tiền"
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(11, 31, 58, 0.08)' }]}>
              <MaterialCommunityIcons name="arrow-up-bold-circle-outline" size={24} color={Colors.navy} />
            </View>
            <Text style={styles.actionCardTitle}>Rút tiền</Text>
            <Text style={styles.actionCardDesc}>Về tài khoản ngân hàng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/contracts')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Hợp đồng chuyển nhượng"
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(217, 146, 22, 0.1)' }]}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color={Colors.amber} />
            </View>
            <Text style={styles.actionCardTitle}>Hợp đồng</Text>
            <Text style={styles.actionCardDesc}>Tiến trình chuyển nhượng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleSimAction}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Xác thực SIM chính chủ"
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(22, 163, 74, 0.08)' }]}>
              <MaterialCommunityIcons name="sim" size={24} color={Colors.success} />
            </View>
            <Text style={styles.actionCardTitle}>Xác thực SIM</Text>
            <Text style={styles.actionCardDesc}>Chính chủ nhà mạng</Text>
          </TouchableOpacity>
        </View>

        {/* Hợp đồng đang diễn ra */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hợp Đồng Đang Tiến Hành</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/contracts')}>
            <Text style={styles.linkText}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        {activeTrades.length === 0 ? (
          <View style={styles.emptyContractCard}>
            <MaterialCommunityIcons name="file-check-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyContractTitle}>Không có giao dịch chờ xử lý</Text>
            <Text style={styles.emptyContractDesc}>
              Các hợp đồng mua/bán SIM đang thực hiện sẽ hiển thị tiến trình xác thực tại đây.
            </Text>
          </View>
        ) : (
          activeTrades.map((trade) => (
            <TouchableOpacity
              key={trade.id}
              style={styles.tradeCard}
              onPress={() => router.push(`/contract/${trade.id}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Giao dịch ${trade.tradeTransactionCode}`}
            >
              <View style={styles.tradeHeader}>
                <View>
                  <Text style={styles.tradeCode}>#{trade.tradeTransactionCode}</Text>
                  <Text style={styles.tradeSimNumber}>{trade.simPhoneNumber || 'SIM Chuyển nhượng'}</Text>
                </View>
                <Text style={styles.tradeAmount}>
                  {(trade.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
                </Text>
              </View>

              <ContractTimeline status={trade.status} compact style={{ marginTop: Spacing.xs }} />
            </TouchableOpacity>
          ))
        )}

        {/* Bảo đảm ký quỹ an toàn */}
        <View style={styles.guaranteeBox}>
          <MaterialCommunityIcons name="shield-check" size={20} color={Colors.blue} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guaranteeTitle}>Quy chế ký quỹ & bảo vệ thanh toán</Text>
            <Text style={styles.guaranteeDesc}>
              Số tiền đặt cọc được giữ an toàn trong tài khoản ký quỹ. Người bán chỉ nhận được tiền khi SIM đã hoàn tất thủ tục sang tên chính chủ và có biên nhận xác nhận hợp lệ.
            </Text>
          </View>
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
    paddingBottom: Spacing.xxxl,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  greetingBox: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  greetingSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
  },
  trustBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trustStripCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  trustStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  trustStripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustStripTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.blue,
  },
  trustPillsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  trustPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
  trustPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  ledgerCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  ledgerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  ledgerMainLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  ledgerMainAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  depositCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minHeight: 40,
  },
  depositCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  ledgerBreakdown: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  ledgerSubCol: {
    flex: 1,
  },
  ledgerDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  ledgerSubLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  ledgerSubAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.card,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  actionCardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyContractCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyContractTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: Spacing.sm,
  },
  emptyContractDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  tradeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  tradeCode: {
    fontSize: 12,
    color: Colors.blue,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  tradeSimNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 2,
  },
  tradeAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  guaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(22, 102, 197, 0.05)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(22, 102, 197, 0.15)',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  guaranteeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
});

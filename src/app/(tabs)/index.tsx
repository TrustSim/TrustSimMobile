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
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { ContractTimeline } from '../../components/trust/ContractTimeline';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { contractService } from '../../services/contractService';
import { simService } from '../../services/simService';
import type { TradeTransactionDto } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, wallet, refreshWallet, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrades, setActiveTrades] = useState<TradeTransactionDto[]>([]);
  const [verifiedSimCount, setVerifiedSimCount] = useState<number>(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [tradesRes, simsRes] = await Promise.allSettled([
        contractService.getMyContracts({ pageIndex: 1, pageSize: 3 }),
        simService.getMyOwnerships({ pageIndex: 1, pageSize: 20 }),
      ]);

      if (tradesRes.status === 'fulfilled' && tradesRes.value.success && tradesRes.value.data?.items) {
        setActiveTrades(tradesRes.value.data.items);
      } else {
        setActiveTrades([]);
      }

      if (simsRes.status === 'fulfilled' && simsRes.value.success && simsRes.value.data?.items) {
        setVerifiedSimCount(simsRes.value.data.totalCount ?? simsRes.value.data.items.length);
      }
    } catch {
      setActiveTrades([]);
    }
  }, []);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await Promise.allSettled([refreshWallet(), refreshProfile(), fetchDashboardData()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refreshWallet();
        refreshProfile();
        fetchDashboardData();
      }
    }, [user, refreshWallet, refreshProfile, fetchDashboardData])
  );

  const isVerified = profile?.verificationStatus === 'VERIFIED';
  const isPendingKyc = profile?.verificationStatus === 'PENDING_VERIFICATION';
  const availableBal = wallet?.availableBalance ?? 0;
  const lockedBal = wallet?.lockedBalance ?? 0;

  const handleSimVerification = () => {
    if (!isVerified) {
      Alert.alert(
        'Cần xác thực CCCD trước',
        'Để đối soát SIM chính chủ với nhà mạng, bạn cần hoàn tất xác thực căn cước công dân trước.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Xác thực CCCD', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    router.push('/sims/verify');
  };

  const handleRegisterSim = () => {
    if (!isVerified) {
      Alert.alert(
        'Cần xác thực CCCD trước',
        'Vui lòng xác thực Căn cước công dân trước khi khai báo SIM lên hệ thống.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Xác thực CCCD', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    router.push('/sims/register');
  };

  const handleCaptureHandover = () => {
    if (activeTrades.length > 0) {
      router.push(`/handover/${activeTrades[0].id}`);
    } else {
      router.push('/(tabs)/contracts');
    }
  };

  const quickActions = [
    {
      key: 'deposit',
      label: 'Nạp tiền',
      sub: 'VietQR 24/7',
      icon: 'arrow-down-left' as const,
      color: Colors.navy,
      bgColor: Colors.surfaceAlt,
      onPress: () => router.push('/deposit'),
    },
    {
      key: 'withdraw',
      label: 'Rút tiền',
      sub: 'Về ngân hàng',
      icon: 'arrow-up-right' as const,
      color: Colors.navy,
      bgColor: Colors.surfaceAlt,
      onPress: () => router.push('/withdraw'),
    },
    {
      key: 'transactions',
      label: 'Sao kê ví',
      sub: 'Lịch sử GD',
      icon: 'receipt-text-outline' as const,
      color: Colors.navy,
      bgColor: Colors.surfaceAlt,
      onPress: () => router.push('/transactions'),
    },
    {
      key: 'verify-sim',
      label: 'Xác thực SIM',
      sub: 'Đối soát OTP',
      icon: 'sim-outline' as const,
      color: Colors.blue,
      bgColor: 'rgba(22, 102, 197, 0.08)',
      onPress: handleSimVerification,
    },
    {
      key: 'register-sim',
      label: 'Khai báo SIM',
      sub: 'Thêm thuê bao',
      icon: 'sim-alert-outline' as const,
      color: Colors.navy,
      bgColor: Colors.surfaceAlt,
      onPress: handleRegisterSim,
    },
    {
      key: 'kyc',
      label: 'Định danh',
      sub: isVerified ? 'Đã xác minh' : 'Chụp CCCD',
      icon: 'card-account-details-outline' as const,
      color: isVerified ? Colors.success : Colors.navy,
      bgColor: isVerified ? Colors.successLight : Colors.surfaceAlt,
      onPress: () => router.push(isVerified ? '/(tabs)/account' : '/kyc'),
    },
    {
      key: 'nfc',
      label: 'Quét NFC',
      sub: 'CCCD gắn chip',
      icon: 'nfc-variant' as const,
      color: Colors.navy,
      bgColor: Colors.surfaceAlt,
      onPress: () => router.push('/kyc/nfc'),
    },
    {
      key: 'handover',
      label: 'Chuyển nhượng',
      sub: 'Bằng chứng',
      icon: 'camera-document' as const,
      color: Colors.blue,
      bgColor: 'rgba(22, 102, 197, 0.08)',
      onPress: handleCaptureHandover,
    },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.navy} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar: Định danh & Trạng thái */}
        <View style={styles.topBar}>
          <View style={styles.userCol}>
            <Text style={styles.appTag}>TRUSTSIM · BẢO CHỨNG GIAO DỊCH</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {profile?.fullName || user?.fullName || user?.userName || 'Tài khoản'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/account')}
            activeOpacity={0.75}
          >
            <VerificationStatusBadge
              status={isVerified ? 'verified' : isPendingKyc ? 'pending' : 'not_submitted'}
              label={isVerified ? 'CCCD đã xác minh' : isPendingKyc ? 'Chờ duyệt CCCD' : 'Chưa xác thực'}
            />
          </TouchableOpacity>
        </View>

        {/* Khối Sổ Cái Tài Chính (Nạp / Rút / Ký Quỹ) */}
        <View style={styles.ledgerPanel}>
          <View style={styles.ledgerTop}>
            <View style={styles.balancePrimaryCol}>
              <Text style={styles.fieldCaption}>SỐ DƯ KHẢ DỤNG</Text>
              <Text style={styles.primaryBalance}>
                {availableBal.toLocaleString('vi-VN')}{' '}
                <Text style={styles.currencyUnit}>₫</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.historyLinkBtn}
              onPress={() => router.push('/transactions')}
              activeOpacity={0.7}
            >
              <Text style={styles.historyLinkText}>Sao kê</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.blue} />
            </TouchableOpacity>
          </View>

          <View style={styles.escrowStrip}>
            <View style={styles.escrowLabelRow}>
              <View style={styles.escrowDot} />
              <Text style={styles.escrowLabel}>Tiền đang ký quỹ giao dịch</Text>
            </View>
            <Text style={styles.escrowValue}>{lockedBal.toLocaleString('vi-VN')} ₫</Text>
          </View>

          <View style={styles.walletBtnRow}>
            <TouchableOpacity
              style={styles.depositBtn}
              onPress={() => router.push('/deposit')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Nạp tiền vào ví"
            >
              <MaterialCommunityIcons name="arrow-down-left" size={18} color="#fff" />
              <Text style={styles.depositBtnText}>Nạp tiền</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => router.push('/withdraw')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Rút tiền về ngân hàng"
            >
              <MaterialCommunityIcons name="arrow-up-right" size={18} color={Colors.navy} />
              <Text style={styles.withdrawBtnText}>Rút tiền</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cụm Nút Quick Action (Nạp tiền, Rút tiền, Sao kê, Xác thực SIM, Định danh...) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>THAO TÁC NHANH</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/wallet')}>
            <Text style={styles.sectionActionLink}>Mở Ví tiền</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActionGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.quickActionCard}
              onPress={item.onPress}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} - ${item.sub}`}
            >
              <View style={[styles.quickActionIconBox, { backgroundColor: item.bgColor }]}>
                <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.quickActionSub} numberOfLines={1}>
                {item.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bảng Điều Khiển Nghiệp Vụ Xác Thực & Chuyển Nhượng */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>NGHIỆP VỤ XÁC THỰC & CHUYỂN NHƯỢNG</Text>
        </View>

        <View style={styles.operationsPanel}>
          {/* 1. Xác thực eKYC */}
          <TouchableOpacity
            style={styles.opRow}
            onPress={() => router.push(isVerified ? '/(tabs)/account' : '/kyc')}
            activeOpacity={0.75}
          >
            <View style={styles.opIconBox}>
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={20}
                color={Colors.navy}
              />
            </View>
            <View style={styles.opBody}>
              <Text style={styles.opTitle}>Xác thực danh tính (CCCD)</Text>
              <Text style={styles.opMeta}>
                {isVerified
                  ? 'Đã khớp Căn cước & Khuôn mặt'
                  : 'Chụp CCCD 2 mặt & khuôn mặt hoặc chạm NFC'}
              </Text>
            </View>
            <View style={styles.opRight}>
              <Text
                style={[
                  styles.opActionText,
                  { color: isVerified ? Colors.success : Colors.blue },
                ]}
              >
                {isVerified ? 'Đã xong' : 'Thực hiện'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* 2. Xác thực SIM */}
          <TouchableOpacity
            style={[styles.opRow, styles.opRowDivider]}
            onPress={handleSimVerification}
            activeOpacity={0.75}
          >
            <View style={styles.opIconBox}>
              <MaterialCommunityIcons name="sim-outline" size={20} color={Colors.navy} />
            </View>
            <View style={styles.opBody}>
              <Text style={styles.opTitle}>Xác thực SIM chính chủ</Text>
              <Text style={styles.opMeta}>
                {verifiedSimCount > 0
                  ? `Đã xác thực ${verifiedSimCount} thuê bao chính chủ`
                  : 'Nhận mã SMS OTP & đối soát chủ thuê bao'}
              </Text>
            </View>
            <View style={styles.opRight}>
              <Text style={styles.opActionText}>Đối soát</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>

          {/* 3. Quá trình chuyển nhượng & Bằng chứng sang tên */}
          <TouchableOpacity
            style={[styles.opRow, styles.opRowDivider]}
            onPress={handleCaptureHandover}
            activeOpacity={0.75}
          >
            <View style={styles.opIconBox}>
              <MaterialCommunityIcons name="camera-document" size={20} color={Colors.navy} />
            </View>
            <View style={styles.opBody}>
              <Text style={styles.opTitle}>Tiến trình chuyển nhượng & Bằng chứng</Text>
              <Text style={styles.opMeta}>
                Chụp biên nhận sang tên SIM hoặc báo cáo sự cố trong giao dịch
              </Text>
            </View>
            <View style={styles.opRight}>
              <Text style={styles.opActionText}>Thực hiện</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Danh sách giao dịch đang cần bàn giao / ký / gửi bằng chứng */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>HỢP ĐỒNG & CHUYỂN NHƯỢNG ĐANG XỬ LÝ</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/contracts')}>
            <Text style={styles.sectionActionLink}>Tất cả</Text>
          </TouchableOpacity>
        </View>

        {activeTrades.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyPanelTitle}>Chưa có giao dịch cần bàn giao</Text>
            <Text style={styles.emptyPanelSub}>
              Khi bạn trúng đấu giá hoặc có giao dịch bán SIM, hợp đồng và tiến trình chuyển nhượng sẽ hiển thị tại đây.
            </Text>
          </View>
        ) : (
          <View style={styles.tradesPanel}>
            {activeTrades.map((trade, index) => (
              <View
                key={trade.id}
                style={[styles.tradeItem, index > 0 && styles.opRowDivider]}
              >
                <TouchableOpacity
                  onPress={() => router.push(`/handover/${trade.id}`)}
                  activeOpacity={0.75}
                >
                  <View style={styles.tradeTopRow}>
                    <View>
                      <Text style={styles.tradeRefCode}>#{trade.tradeTransactionCode}</Text>
                      <Text style={styles.tradePhoneText}>
                        {trade.simPhoneNumber || 'SIM Chuyển nhượng'}
                      </Text>
                    </View>
                    <View style={styles.tradeAmountCol}>
                      <Text style={styles.tradeAmountVal}>
                        {(trade.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
                      </Text>
                      <Text style={styles.tradeAmountCap}>Ký quỹ</Text>
                    </View>
                  </View>

                  <ContractTimeline
                    status={trade.status}
                    compact
                    style={{ marginTop: Spacing.xs, marginBottom: Spacing.sm }}
                  />
                </TouchableOpacity>

                {/* Nút thao tác cho từng giao dịch chuyển nhượng */}
                <View style={styles.tradeQuickActions}>
                  <TouchableOpacity
                    style={styles.tradeSecondaryBtn}
                    onPress={() => router.push(`/contract/${trade.id}`)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name="file-sign"
                      size={15}
                      color={Colors.navy}
                    />
                    <Text style={styles.tradeSecondaryBtnText}>Hợp đồng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.tradePrimaryBtn}
                    onPress={() => router.push(`/handover/${trade.id}`)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="camera-document"
                      size={15}
                      color="#fff"
                    />
                    <Text style={styles.tradePrimaryBtnText}>Quá trình chuyển nhượng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
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
    paddingBottom: Spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  userCol: {
    flex: 1,
  },
  appTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
  },
  ledgerPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  ledgerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  balancePrimaryCol: {
    flex: 1,
  },
  fieldCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  primaryBalance: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
    letterSpacing: -0.5,
  },
  currencyUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  historyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.blue,
  },
  escrowStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  escrowLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  escrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.amber,
  },
  escrowLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  escrowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  walletBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  depositBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.sm,
    minHeight: 46,
  },
  depositBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  withdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 46,
  },
  withdrawBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
  },
  sectionActionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.blue,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.xl,
  },
  quickActionCard: {
    width: '23%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.navy,
    textAlign: 'center',
  },
  quickActionSub: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  operationsPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  opRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.md,
    minHeight: 64,
  },
  opRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  opIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opBody: {
    flex: 1,
  },
  opTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  opMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  opRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  opActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
  },
  emptyPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
  },
  emptyPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  emptyPanelSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  tradesPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tradeItem: {
    padding: Spacing.md,
  },
  tradeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tradeRefCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  tradePhoneText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  tradeAmountCol: {
    alignItems: 'flex-end',
  },
  tradeAmountVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  tradeAmountCap: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  tradeQuickActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tradeSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.xs,
    minHeight: 38,
    paddingHorizontal: Spacing.sm,
  },
  tradeSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  tradePrimaryBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.xs,
    minHeight: 38,
    paddingHorizontal: Spacing.sm,
  },
  tradePrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  tradeDisputeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    minHeight: 38,
  },
  tradeDisputeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.danger,
  },
});

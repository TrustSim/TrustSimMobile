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
import {
  ContractTimeline,
  isTradeAwaitingSignature,
} from '../../components/trust/ContractTimeline';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { contractService } from '../../services/contractService';
import { simService } from '../../services/simService';
import type { TradeTransactionDto } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, wallet, escrowBalance, refreshWallet, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrades, setActiveTrades] = useState<TradeTransactionDto[]>([]);
  const [verifiedSimCount, setVerifiedSimCount] = useState<number>(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [tradesRes, simsRes] = await Promise.allSettled([
        contractService.getMyContracts({ pageIndex: 1, pageSize: 5 }),
        simService.getMyOwnerships({ pageIndex: 1, pageSize: 20 }),
      ]);

      if (
        tradesRes.status === 'fulfilled' &&
        tradesRes.value.success &&
        tradesRes.value.data?.items
      ) {
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
  const depositBal = wallet?.lockedBalance ?? 0;
  const escrowBal = wallet?.escrowBalance ?? escrowBalance ?? 0;

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
      const firstTrade = activeTrades[0];
      if (isTradeAwaitingSignature(firstTrade.status)) {
        router.push(`/contract/${firstTrade.id}`);
      } else {
        router.push(`/handover/${firstTrade.id}`);
      }
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
      color: '#059669',
      bgColor: '#ECFDF5',
      onPress: () => router.push('/deposit'),
    },
    {
      key: 'withdraw',
      label: 'Rút tiền',
      sub: 'Về ngân hàng',
      icon: 'arrow-up-right' as const,
      color: Colors.navy,
      bgColor: '#EEF2FF',
      onPress: () => router.push('/withdraw'),
    },
    {
      key: 'transactions',
      label: 'Sao kê ví',
      sub: 'Lịch sử GD',
      icon: 'receipt-text-outline' as const,
      color: '#1D4ED8',
      bgColor: '#EFF6FF',
      onPress: () => router.push('/transactions'),
    },
    {
      key: 'verify-sim',
      label: 'Xác thực SIM',
      sub: 'Đối soát OTP',
      icon: 'sim-outline' as const,
      color: '#D97706',
      bgColor: '#FFFBEB',
      onPress: handleSimVerification,
    },
    {
      key: 'register-sim',
      label: 'Khai báo SIM',
      sub: 'Thêm thuê bao',
      icon: 'sim-alert-outline' as const,
      color: Colors.navy,
      bgColor: '#F1F5F9',
      onPress: handleRegisterSim,
    },
    {
      key: 'kyc',
      label: 'Định danh',
      sub: isVerified ? 'Đã xác minh' : 'Chụp CCCD',
      icon: 'card-account-details-outline' as const,
      color: isVerified ? Colors.success : '#E11D48',
      bgColor: isVerified ? Colors.successLight : '#FFF1F2',
      onPress: () => router.push(isVerified ? '/(tabs)/account' : '/kyc'),
    },
    {
      key: 'kyc-history',
      label: 'Lịch sử eKYC',
      sub: 'Hồ sơ duyệt',
      icon: 'history' as const,
      color: '#1D4ED8',
      bgColor: '#EFF6FF',
      onPress: () => router.push('/(tabs)/account'),
    },
    {
      key: 'handover',
      label: 'Chuyển nhượng',
      sub: 'Ký OTP & BC',
      icon: 'camera-document' as const,
      color: '#E4011E',
      bgColor: '#FFF1F2',
      onPress: handleCaptureHandover,
    },
  ];

  const displayName = profile?.fullName || user?.fullName || user?.userName || 'Thành viên';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.navy} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header editorial hiện đại */}
        <View style={styles.topBar}>
          <View style={styles.userCol}>
            <View style={styles.brandBadgeRow}>
              <View style={styles.brandLiveDot} />
              <Text style={styles.brandSubText}>TrustSim Vault</Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              Xin chào, {displayName}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/account')} activeOpacity={0.8}>
            <VerificationStatusBadge
              status={isVerified ? 'verified' : isPendingKyc ? 'pending' : 'not_submitted'}
              label={
                isVerified
                  ? 'Đã định danh'
                  : isPendingKyc
                  ? 'Chờ duyệt'
                  : 'Chưa eKYC'
              }
            />
          </TouchableOpacity>
        </View>

        {/* Hero Vault Card (Deep Royal Navy #001743 + Glass Sub-cards) */}
        <View style={styles.heroVaultCard}>
          <View style={styles.heroGlowCircle} />
          <View style={styles.heroTopRow}>
            <View style={styles.balancePrimaryCol}>
              <Text style={styles.heroBalanceLabel}>Số dư ví khả dụng</Text>
              <Text
                style={styles.heroPrimaryBalance}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {availableBal.toLocaleString('vi-VN')}{' '}
                <Text style={styles.heroCurrencyUnit}>₫</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroHistoryPill}
              onPress={() => router.push('/transactions')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="history" size={14} color="#E2E8F0" />
              <Text style={styles.heroHistoryText}>Sao kê</Text>
              <MaterialCommunityIcons name="chevron-right" size={15} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* 2 Glass Cards: Tiền ký quỹ & Tiền cọc đấu giá */}
          <View style={styles.glassGrid}>
            <TouchableOpacity
              style={styles.glassSubCard}
              onPress={() => router.push('/(tabs)/contracts')}
              activeOpacity={0.85}
            >
              <View style={styles.glassTagRow}>
                <View style={[styles.glassDot, { backgroundColor: '#38BDF8' }]} />
                <Text style={styles.glassLabel}>Tiền ký quỹ</Text>
              </View>
              <Text
                style={[styles.glassValue, { color: '#7DD3FC' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {escrowBal.toLocaleString('vi-VN')} ₫
              </Text>
              <Text style={styles.glassHint}>Bảo chứng hợp đồng SIM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.glassSubCard}
              onPress={() => router.push('/(tabs)/wallet')}
              activeOpacity={0.85}
            >
              <View style={styles.glassTagRow}>
                <View style={[styles.glassDot, { backgroundColor: '#FBBF24' }]} />
                <Text style={styles.glassLabel}>Tiền cọc đấu giá</Text>
              </View>
              <Text
                style={[styles.glassValue, { color: '#FDE68A' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {depositBal.toLocaleString('vi-VN')} ₫
              </Text>
              <Text style={styles.glassHint}>Giữ khi tham gia phiên</Text>
            </TouchableOpacity>
          </View>

          {/* Nút Nạp tiền & Rút tiền nổi bật */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.heroDepositBtn}
              onPress={() => router.push('/deposit')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Nạp tiền vào ví"
            >
              <MaterialCommunityIcons name="arrow-down-left" size={18} color="#FFFFFF" />
              <Text style={styles.heroDepositBtnText}>Nạp tiền VietQR</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroWithdrawBtn}
              onPress={() => router.push('/withdraw')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Rút tiền về ngân hàng"
            >
              <MaterialCommunityIcons name="arrow-up-right" size={18} color="#FFFFFF" />
              <Text style={styles.heroWithdrawBtnText}>Rút tiền</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tiện ích nhanh (Bento Grid hiện đại) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tiện ích nhanh</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/wallet')}>
            <Text style={styles.sectionLink}>Mở Ví tiền →</Text>
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
                <MaterialCommunityIcons name={item.icon} size={21} color={item.color} />
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

        {/* Danh sách Hợp đồng & Chuyển nhượng SIM đang xử lý (Auction Live Deal Cards) */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithCount}>
            <Text style={styles.sectionTitle}>Giao dịch & Hợp đồng SIM</Text>
            {activeTrades.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{activeTrades.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/contracts')}>
            <Text style={styles.sectionLink}>Xem tất cả →</Text>
          </TouchableOpacity>
        </View>

        {activeTrades.length === 0 ? (
          <View style={styles.emptyDealCard}>
            <View style={styles.emptyDealIconCircle}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={26}
                color={Colors.blue}
              />
            </View>
            <Text style={styles.emptyDealTitle}>Chưa có hợp đồng chờ ký hoặc bàn giao</Text>
            <Text style={styles.emptyDealSub}>
              Khi bạn trúng đấu giá hoặc bán SIM số đẹp, hợp đồng điện tử OTP và tiến trình sang tên sẽ xuất hiện ngay tại đây.
            </Text>
          </View>
        ) : (
          <View style={styles.dealCardsStack}>
            {activeTrades.map((trade) => {
              const awaitingSign = isTradeAwaitingSignature(trade.status);
              const primaryTarget = awaitingSign
                ? `/contract/${trade.id}`
                : `/handover/${trade.id}`;

              return (
                <View key={trade.id} style={styles.dealCard}>
                  <TouchableOpacity
                    onPress={() => router.push(primaryTarget as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dealTopRow}>
                      <View style={styles.dealSimChipRow}>
                        <View style={styles.miniSimChip}>
                          <MaterialCommunityIcons name="sim" size={16} color={Colors.gold} />
                        </View>
                        <View>
                          <Text style={styles.dealRefCode}>
                            #{trade.tradeTransactionCode || trade.id.slice(0, 8)}
                          </Text>
                          <Text style={styles.dealPhoneText}>
                            {trade.simPhoneNumber || 'SIM Đấu giá'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dealEscrowBox}>
                        <Text style={styles.dealEscrowLabel}>Ký quỹ</Text>
                        <Text
                          style={styles.dealEscrowValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                        >
                          {(trade.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
                        </Text>
                      </View>
                    </View>

                    <ContractTimeline
                      status={trade.status}
                      compact
                      style={styles.dealTimeline}
                    />
                  </TouchableOpacity>

                  {/* Nút hành động thông minh theo đúng bước */}
                  <View style={styles.dealActionRow}>
                    {awaitingSign ? (
                      <TouchableOpacity
                        style={styles.dealSignOtpBtn}
                        onPress={() => router.push(`/contract/${trade.id}`)}
                        activeOpacity={0.88}
                      >
                        <MaterialCommunityIcons
                          name="shield-key-outline"
                          size={17}
                          color="#FFFFFF"
                        />
                        <Text style={styles.dealSignOtpBtnText}>
                          Bước 1: Đọc & Ký Hợp Đồng Bằng OTP
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.dealSecondaryBtn}
                          onPress={() => router.push(`/contract/${trade.id}`)}
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons
                            name="file-check-outline"
                            size={16}
                            color={Colors.navy}
                          />
                          <Text style={styles.dealSecondaryBtnText}>Hợp đồng</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dealPrimaryBtn}
                          onPress={() => router.push(`/handover/${trade.id}`)}
                          activeOpacity={0.88}
                        >
                          <MaterialCommunityIcons
                            name="camera-document"
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text style={styles.dealPrimaryBtnText}>
                            Chụp bằng chứng sang tên
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Trung tâm bảo chứng & Xác thực 3 bước */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Trung tâm bảo chứng tài sản</Text>
        </View>

        <View style={styles.trustCenterStack}>
          {/* 1. Xác thực eKYC */}
          <TouchableOpacity
            style={styles.trustCard}
            onPress={() => router.push(isVerified ? '/(tabs)/account' : '/kyc')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.trustIconWrap,
                { backgroundColor: isVerified ? Colors.successLight : '#EFF6FF' },
              ]}
            >
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={22}
                color={isVerified ? Colors.success : Colors.blue}
              />
            </View>
            <View style={styles.trustBody}>
              <Text style={styles.trustCardTitle}>Định danh công dân (eKYC)</Text>
              <Text style={styles.trustCardSub}>
                {isVerified
                  ? 'Đã đối khớp CCCD & sinh trắc học khuôn mặt'
                  : 'Chụp CCCD 2 mặt & đối khớp khuôn mặt chính chủ'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* 2. Xác thực SIM */}
          <TouchableOpacity
            style={styles.trustCard}
            onPress={handleSimVerification}
            activeOpacity={0.8}
          >
            <View style={[styles.trustIconWrap, { backgroundColor: Colors.goldSoft }]}>
              <MaterialCommunityIcons name="sim-outline" size={22} color={Colors.gold} />
            </View>
            <View style={styles.trustBody}>
              <Text style={styles.trustCardTitle}>Tài sản SIM chính chủ</Text>
              <Text style={styles.trustCardSub}>
                {verifiedSimCount > 0
                  ? `Đang quản lý ${verifiedSimCount} SIM số đẹp đã đối soát nhà mạng`
                  : 'Xác thực SMS OTP & đối soát thông tin chủ thuê bao'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          {/* 3. Quy trình chuyển nhượng */}
          <TouchableOpacity
            style={styles.trustCard}
            onPress={handleCaptureHandover}
            activeOpacity={0.8}
          >
            <View style={[styles.trustIconWrap, { backgroundColor: Colors.crimsonSoft }]}>
              <MaterialCommunityIcons
                name="camera-document"
                size={22}
                color={Colors.crimson}
              />
            </View>
            <View style={styles.trustBody}>
              <Text style={styles.trustCardTitle}>Ký hợp đồng OTP & Sang tên SIM</Text>
              <Text style={styles.trustCardSub}>
                Ký số bằng OTP trước khi chụp biên nhận sang tên & mở khóa giải ngân
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
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
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  brandLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: Colors.crimson,
  },
  brandSubText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: -0.1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  heroVaultCard: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.lg,
  },
  heroGlowCircle: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(29, 78, 216, 0.28)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  balancePrimaryCol: {
    flex: 1,
  },
  heroBalanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  heroPrimaryBalance: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
    letterSpacing: -0.8,
  },
  heroCurrencyUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
  },
  heroHistoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroHistoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  glassGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  glassSubCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  glassTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  glassDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  glassLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  glassValue: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 6,
    letterSpacing: -0.3,
  },
  glassHint: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  heroDepositBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.crimson,
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  heroDepositBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroWithdrawBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  heroWithdrawBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: Colors.crimsonSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.crimson,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  quickActionCard: {
    width: '22.5%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  quickActionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  quickActionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  quickActionSub: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },
  emptyDealCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  emptyDealIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyDealTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
  },
  emptyDealSub: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  dealCardsStack: {
    gap: Spacing.md,
  },
  dealCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  dealTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dealSimChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  miniSimChip: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.goldSoft,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealRefCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  dealPhoneText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  dealEscrowBox: {
    alignItems: 'flex-end',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  dealEscrowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dealEscrowValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.blue,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  dealTimeline: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  dealActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dealSignOtpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  dealSignOtpBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dealSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.sm,
    minHeight: 42,
    paddingHorizontal: Spacing.sm,
  },
  dealSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.navy,
  },
  dealPrimaryBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.sm,
    minHeight: 42,
    paddingHorizontal: Spacing.sm,
  },
  dealPrimaryBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  trustCenterStack: {
    gap: Spacing.sm,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  trustIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustBody: {
    flex: 1,
  },
  trustCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.2,
  },
  trustCardSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
});

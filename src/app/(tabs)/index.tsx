import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sample VIP SIMs for the "Featured Artwork / VIP SIMs" carousel (Image 2 style)
const FEATURED_VIP_SIMS = [
  {
    id: 'vip-1',
    phoneNumber: '0988.888.888',
    rhythm: 'Bát Quý 8 Cực Phẩm',
    carrier: 'Viettel 5G',
    currentBid: '850.000.000 ₫',
    endingIn: '6h 32m 23s',
    gradientColors: ['#001743', '#0B2A6B'],
    verified: true,
  },
  {
    id: 'vip-2',
    phoneNumber: '0909.666.999',
    rhythm: 'Lộc Phát Thần Tài',
    carrier: 'MobiFone VIP',
    currentBid: '265.000.000 ₫',
    endingIn: '12h 15m 08s',
    gradientColors: ['#0B1630', '#1E293B'],
    verified: true,
  },
  {
    id: 'vip-3',
    phoneNumber: '0912.345.678',
    rhythm: 'Sảnh Tiến Đại Gia',
    carrier: 'VinaPhone VIP',
    currentBid: '420.000.000 ₫',
    endingIn: '1 ngày 4h',
    gradientColors: ['#001743', '#1D4ED8'],
    verified: true,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, wallet, escrowBalance, refreshWallet, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrades, setActiveTrades] = useState<TradeTransactionDto[]>([]);
  const [verifiedSimCount, setVerifiedSimCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSims, setSavedSims] = useState<Record<string, boolean>>({});

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

  const toggleSaveSim = (id: string) => {
    setSavedSims((prev) => ({ ...prev, [id]: !prev[id] }));
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
      icon: 'plus-circle-outline' as const,
      color: Colors.navy,
      bgColor: '#F1F5F9',
      onPress: handleRegisterSim,
    },
    {
      key: 'kyc',
      label: 'Định danh',
      sub: isVerified ? 'Đã xác minh' : 'Chụp CCCD',
      icon: 'card-account-details-outline' as const,
      color: isVerified ? Colors.success : '#4C5FD5',
      bgColor: isVerified ? Colors.successLight : '#EEF2FF',
      onPress: () => router.push(isVerified ? '/(tabs)/account' : '/kyc'),
    },
    {
      key: 'sim-vault',
      label: 'Kho SIM',
      sub: `${verifiedSimCount} thuê bao`,
      icon: 'sim' as const,
      color: Colors.indigo,
      bgColor: '#EEF2FF',
      onPress: () => router.push('/(tabs)/sims'),
    },
    {
      key: 'handover',
      label: 'Ký bàn giao',
      sub: 'OTP & Bằng chứng',
      icon: 'camera-document' as const,
      color: Colors.navy,
      bgColor: '#F1F5F9',
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
        {/* ─── 1. TOP BRAND ROW (Image 2 Style) ─── */}
        <View style={styles.topBrandRow}>
          <View style={styles.brandTitleCol}>
            <View style={styles.brandLogoRow}>
              <View style={styles.brandEmblemBox}>
                <MaterialCommunityIcons name="shield-check" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.brandTitleText}>TrustSim</Text>
              <View style={styles.vaultBadgePill}>
                <Text style={styles.vaultBadgeText}>VAULT</Text>
              </View>
            </View>
            <Text style={styles.greetingSubText}>
              Xin chào, <Text style={styles.greetingName}>{displayName}</Text>
            </Text>
          </View>

          {/* Right Action Icons (Wallet & Bell Pills - Image 2) */}
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={styles.topIconPill}
              onPress={() => router.push('/(tabs)/wallet')}
              activeOpacity={0.8}
              accessibilityLabel="Mở ví tiền"
            >
              <MaterialCommunityIcons name="wallet-outline" size={20} color={Colors.navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topIconPill}
              onPress={() => router.push('/(tabs)/account')}
              activeOpacity={0.8}
              accessibilityLabel="Thông báo"
            >
              <MaterialCommunityIcons name="bell-outline" size={20} color={Colors.navy} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. SEARCH PILL (Image 2 Style) ─── */}
        <View style={styles.searchPillContainer}>
          <MaterialCommunityIcons name="magnify" size={22} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm SIM tứ quý, lộc phát, phong thủy..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ─── 3. FEATURED VIP SIM CARDS CAROUSEL (Image 2 "Most Popular Artwork" Style) ─── */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>SIM Nổi Bật & Đấu Giá Trực Tiếp</Text>
            <Text style={styles.sectionSub}>Bảo chứng quyền sở hữu chính chủ 100%</Text>
          </View>
          <TouchableOpacity
            style={styles.moreOptionsBtn}
            onPress={() => router.push('/(tabs)/sims')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredCarouselContent}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH * 0.78 + 14}
        >
          {FEATURED_VIP_SIMS.map((sim) => {
            const isSaved = !!savedSims[sim.id];
            return (
              <View key={sim.id} style={styles.vipSimCard}>
                {/* Visual Backdrop (Deep Royal Navy) */}
                <View style={styles.vipCardBackdrop}>
                  {/* Glowing decorative rings */}
                  <View style={styles.vipGlowCircle} />

                  {/* Top floating tags (Artwork pill & Heart pill - Image 2) */}
                  <View style={styles.vipCardTopRow}>
                    <View style={styles.vipRhythmBadge}>
                      <MaterialCommunityIcons name="star-four-points" size={12} color="#F59E0B" />
                      <Text style={styles.vipRhythmBadgeText}>{sim.rhythm}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.vipHeartPill, isSaved && styles.vipHeartPillActive]}
                      onPress={() => toggleSaveSim(sim.id)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons
                        name={isSaved ? 'heart' : 'heart-outline'}
                        size={17}
                        color={isSaved ? '#EF4444' : '#FFFFFF'}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Middle: Golden Microchip & Big Display Number */}
                  <View style={styles.vipCardCenter}>
                    <View style={styles.goldMicrochipPlate}>
                      <View style={styles.chipGridH} />
                      <View style={styles.chipGridV} />
                      <MaterialCommunityIcons name="integrated-circuit-chip" size={22} color="#92400E" />
                    </View>

                    <Text style={styles.vipPhoneNumber} numberOfLines={1}>
                      {sim.phoneNumber}
                    </Text>

                    <View style={styles.vipCarrierRow}>
                      <View style={styles.carrierDot} />
                      <Text style={styles.vipCarrierText}>{sim.carrier}</Text>
                      <Text style={styles.vipDotDivider}>•</Text>
                      <Text style={styles.vipVerifiedText}>Đã đối soát OTP</Text>
                    </View>
                  </View>

                  {/* Bottom Glassmorphic Overlay Panel (Exact match to Image 2 footer) */}
                  <View style={styles.vipGlassFooter}>
                    <View style={styles.glassFooterCol}>
                      <Text style={styles.glassFooterLabel}>Giá khởi điểm / Bid</Text>
                      <Text style={styles.glassFooterValue} numberOfLines={1}>
                        {sim.currentBid}
                      </Text>
                    </View>

                    <View style={styles.glassFooterDivider} />

                    <View style={styles.glassFooterColRight}>
                      <Text style={styles.glassFooterLabel}>Thời gian còn</Text>
                      <View style={styles.timerRow}>
                        <MaterialCommunityIcons name="clock-outline" size={13} color="#CBD5E1" />
                        <Text style={styles.glassFooterTimer}>{sim.endingIn}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* ─── 4. HERO VAULT BALANCE CARD (Deep Royal Navy #001743) ─── */}
        <View style={styles.heroVaultCard}>
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
              <MaterialCommunityIcons name="history" size={15} color="#E2E8F0" />
              <Text style={styles.heroHistoryText}>Sao kê</Text>
            </TouchableOpacity>
          </View>

          {/* 2 Glass Sub-Cards: Tiền ký quỹ & Tiền cọc đấu giá */}
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
              <Text style={styles.glassHint}>Bảo chứng giao dịch</Text>
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

          {/* Nút Nạp tiền & Rút tiền Pill Actions (Soft-Cloud Navy tokens) */}
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

        {/* ─── 5. QUICK ACTIONS BENTO GRID ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Tiện ích nhanh</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/wallet')}>
            <Text style={styles.sectionLink}>Mở ví tiền →</Text>
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

        {/* ─── 6. ACTIVE DEALS & CONTRACTS SECTION ─── */}
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
              <MaterialCommunityIcons name="shield-check-outline" size={26} color={Colors.indigo} />
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

                  {/* Nút hành động chuẩn Soft-Cloud Navy (Pill shapes) */}
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

        {/* ─── 7. TRUNG TÂM BẢO CHỨNG TÀI SẢN ─── */}
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
                { backgroundColor: isVerified ? Colors.successLight : '#EEF2FF' },
              ]}
            >
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={22}
                color={isVerified ? Colors.success : Colors.indigo}
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
            <View style={[styles.trustIconWrap, { backgroundColor: '#F1F5F9' }]}>
              <MaterialCommunityIcons
                name="camera-document"
                size={22}
                color={Colors.navy}
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
    paddingBottom: 110, // Generous padding to clear the floating bottom navigation bar
  },

  // 1. Top Brand Row (Image 2 style)
  topBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandTitleCol: {
    flex: 1,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandEmblemBox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  brandTitleText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  vaultBadgePill: {
    backgroundColor: 'rgba(76, 95, 213, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  vaultBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.indigo,
    letterSpacing: 0.5,
  },
  greetingSubText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  greetingName: {
    fontWeight: '700',
    color: Colors.navy,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconPill: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.sm,
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },

  // 2. Search Pill (Image 2 style)
  searchPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: Colors.text,
    paddingVertical: 0,
  },

  // 3. Featured VIP SIMs Carousel (Image 2 style)
  featuredCarouselContent: {
    paddingRight: Spacing.lg,
    gap: 14,
    marginBottom: Spacing.xl,
  },
  vipSimCard: {
    width: SCREEN_WIDTH * 0.78,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.navy,
    ...Shadows.lg,
  },
  vipCardBackdrop: {
    padding: 18,
    minHeight: 220,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  vipGlowCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(76, 95, 213, 0.28)',
  },
  vipCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  vipRhythmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  vipRhythmBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vipHeartPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipHeartPillActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  vipCardCenter: {
    marginVertical: 14,
    alignItems: 'flex-start',
    zIndex: 2,
  },
  goldMicrochipPlate: {
    width: 38,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#FDE68A',
    borderWidth: 1.5,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  chipGridH: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#B45309',
    opacity: 0.4,
  },
  chipGridV: {
    position: 'absolute',
    left: 18,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#B45309',
    opacity: 0.4,
  },
  vipPhoneNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  vipCarrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  carrierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  vipCarrierText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  vipDotDivider: {
    fontSize: 12,
    color: '#64748B',
  },
  vipVerifiedText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },

  // Glass Footer on VIP SIM Card (Image 2 style)
  vipGlassFooter: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    zIndex: 2,
  },
  glassFooterCol: {
    flex: 1,
  },
  glassFooterColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  glassFooterDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginHorizontal: 8,
  },
  glassFooterLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
  },
  glassFooterValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  glassFooterTimer: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    fontVariant: ['tabular-nums'],
  },

  // 4. Hero Vault Balance Card
  heroVaultCard: {
    backgroundColor: Colors.navy,
    borderRadius: 28,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.lg,
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
    fontWeight: '900',
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
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
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
    backgroundColor: Colors.indigo,
    borderRadius: BorderRadius.full,
    minHeight: 46,
    ...Shadows.sm,
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
    borderRadius: BorderRadius.full,
    minHeight: 46,
  },
  heroWithdrawBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 5. Section Headers & Quick Actions
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
  sectionSub: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  moreOptionsBtn: {
    padding: 4,
  },
  countPill: {
    backgroundColor: 'rgba(76, 95, 213, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.indigo,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.indigo,
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
    borderRadius: 20,
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
    fontSize: 9.5,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 1,
  },

  // 6. Active Deals & Contracts
  emptyDealCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
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
    backgroundColor: '#EEF2FF',
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
    borderRadius: 24,
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
    borderRadius: 12,
  },
  dealEscrowLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dealEscrowValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
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
    borderRadius: BorderRadius.full,
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
    borderRadius: BorderRadius.full,
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
    backgroundColor: Colors.indigo,
    borderRadius: BorderRadius.full,
    minHeight: 42,
    paddingHorizontal: Spacing.sm,
  },
  dealPrimaryBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 7. Trust Center Stack
  trustCenterStack: {
    gap: Spacing.sm,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 20,
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

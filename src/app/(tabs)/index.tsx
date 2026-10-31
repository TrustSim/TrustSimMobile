import React, { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
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
import { notificationService } from '../../services/notificationService';
import type { SimOwnershipDto, TradeTransactionDto } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getCarrierTheme(carrier?: string) {
  const upper = (carrier || '').toUpperCase();
  if (upper.includes('VIETTEL')) {
    return {
      bg: Colors.viettelSoft,
      text: Colors.viettel,
      border: '#FECDD3',
      label: carrier || 'Viettel',
    };
  }
  if (upper.includes('VINA')) {
    return {
      bg: Colors.vinaphoneSoft,
      text: Colors.vinaphone,
      border: '#BFDBFE',
      label: carrier || 'VinaPhone',
    };
  }
  if (upper.includes('MOBI')) {
    return {
      bg: Colors.mobifoneSoft,
      text: Colors.mobifone,
      border: '#BAE6FD',
      label: carrier || 'MobiFone',
    };
  }
  return {
    bg: Colors.goldSoft,
    text: Colors.gold,
    border: Colors.goldBorder,
    label: carrier || 'Nhà mạng VN',
  };
}

function getSimBadgeProps(sim: SimOwnershipDto) {
  if (sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE') {
    return { status: 'verified' as const, label: 'Chính chủ' };
  }
  if (sim.verificationStatus === 'PENDING_VERIFICATION') {
    return { status: 'checking' as const, label: 'Đang duyệt' };
  }
  if (sim.verificationStatus === 'REJECTED' || sim.ownershipStatus === 'REVOKED') {
    return { status: 'rejected' as const, label: 'Từ chối' };
  }
  return { status: 'pending' as const, label: 'Cần OTP' };
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, wallet, escrowBalance, refreshWallet, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrades, setActiveTrades] = useState<TradeTransactionDto[]>([]);
  const [myOwnerships, setMyOwnerships] = useState<SimOwnershipDto[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [tradesRes, simsRes, unreadRes] = await Promise.allSettled([
        contractService.getMyContracts({ pageIndex: 1, pageSize: 5 }),
        simService.getMyOwnerships({ pageIndex: 1, pageSize: 20 }),
        notificationService.getUnreadCount(),
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
        setMyOwnerships(simsRes.value.data.items);
      } else {
        setMyOwnerships([]);
      }

      if (unreadRes.status === 'fulfilled' && unreadRes.value.success && typeof unreadRes.value.data === 'number') {
        setUnreadNotificationCount(unreadRes.value.data);
      }
    } catch {
      setActiveTrades([]);
      setMyOwnerships([]);
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
      color: isVerified ? Colors.success : Colors.indigo,
      bgColor: isVerified ? Colors.successLight : '#EEF2FF',
      onPress: () => router.push(isVerified ? '/(tabs)/account' : '/kyc'),
    },
    {
      key: 'sim-vault',
      label: 'Kho SIM',
      sub: `${myOwnerships.length} thuê bao`,
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.navy} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. TOP HEADER: LOGO S-White-Logo & ACTIONS (No "Xin chào") ─── */}
        <View style={styles.topBrandRow}>
          <View style={styles.brandLogoRow}>
            <View style={styles.brandEmblemBox}>
              <Image
                source={require('../../../assets/images/logo/S-White-Logo.png')}
                style={styles.brandLogoImg}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.brandTitleText}>TrustSim</Text>
              <View style={styles.vaultBadgePill}>
                <Text style={styles.vaultBadgeText}>VAULT</Text>
              </View>
            </View>
          </View>

          {/* Right Action Icons (Wallet & Bell Pills) */}
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
              onPress={() => router.push('/notifications')}
              activeOpacity={0.8}
              accessibilityLabel="Thông báo"
            >
              <MaterialCommunityIcons name="bell-outline" size={20} color={Colors.navy} />
              {unreadNotificationCount > 0 && <View style={styles.notificationDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. HERO BANNER: SỐ DƯ KHẢ DỤNG & VÍ TIỀN ─── */}
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

          {/* Nút Nạp tiền & Rút tiền Pill Actions (Soft-Cloud Navy) */}
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

        {/* ─── 3. SIM OWNER CARDS: SIM MÀ BẢN THÂN SỞ HỮU (Style Ảnh 2) ─── */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithCount}>
            <Text style={styles.sectionTitle}>SIM sở hữu của bạn</Text>
            {myOwnerships.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{myOwnerships.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/sims')} activeOpacity={0.8}>
            <Text style={styles.sectionLink}>Quản lý kho SIM →</Text>
          </TouchableOpacity>
        </View>

        {myOwnerships.length === 0 ? (
          <View style={styles.emptySimCard}>
            <View style={styles.emptySimIconCircle}>
              <MaterialCommunityIcons name="sim" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.emptySimTitle}>Bạn chưa có SIM nào trong kho</Text>
            <Text style={styles.emptySimSub}>
              Khai báo số thuê bao bạn đang sở hữu và xác thực OTP để bảo chứng quyền sở hữu chính chủ trên sàn.
            </Text>
            <TouchableOpacity
              style={styles.emptySimAddBtn}
              onPress={handleRegisterSim}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="plus" size={17} color="#FFFFFF" />
              <Text style={styles.emptySimAddBtnText}>Khai báo SIM mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.simOwnerCarouselContent}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH * 0.78 + 14}
          >
            {myOwnerships.map((sim) => {
              const carrierTheme = getCarrierTheme(sim.carrierName);
              const badge = getSimBadgeProps(sim);
              const isOwnVerified =
                sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE';

              return (
                <TouchableOpacity
                  key={sim.id}
                  style={styles.simOwnerCard}
                  onPress={() => router.push('/(tabs)/sims')}
                  activeOpacity={0.9}
                >
                  <View style={styles.simCardBackdrop}>
                    <View style={styles.simGlowCircle} />

                    {/* Top row: Carrier Pill & Status Pill */}
                    <View style={styles.simCardTopRow}>
                      <View
                        style={[
                          styles.carrierPillBadge,
                          { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderColor: 'rgba(255, 255, 255, 0.25)' },
                        ]}
                      >
                        <View style={[styles.carrierLiveDot, { backgroundColor: '#34D399' }]} />
                        <Text style={styles.carrierPillText}>{carrierTheme.label}</Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadgePill,
                          isOwnVerified
                            ? { backgroundColor: 'rgba(52, 211, 153, 0.2)', borderColor: 'rgba(52, 211, 153, 0.4)' }
                            : { backgroundColor: 'rgba(251, 191, 36, 0.2)', borderColor: 'rgba(251, 191, 36, 0.4)' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgePillText,
                            { color: isOwnVerified ? '#34D399' : '#FBBF24' },
                          ]}
                        >
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    {/* Center: Gold Microchip & Phone Number */}
                    <View style={styles.simCardCenter}>
                      <View style={styles.goldMicrochipPlate}>
                        <View style={styles.chipGridH} />
                        <View style={styles.chipGridV} />
                        <MaterialCommunityIcons
                          name="integrated-circuit-chip"
                          size={22}
                          color="#92400E"
                        />
                      </View>

                      <Text style={styles.simOwnerPhoneNumber} numberOfLines={1}>
                        {sim.phoneNumber}
                      </Text>

                      <View style={styles.simRhythmRow}>
                        {sim.formatRhythmName ? (
                          <View style={styles.rhythmPill}>
                            <MaterialCommunityIcons
                              name="star-four-points"
                              size={11}
                              color="#F59E0B"
                            />
                            <Text style={styles.rhythmPillText}>{sim.formatRhythmName}</Text>
                          </View>
                        ) : (
                          <Text style={styles.simDefaultHintText}>Tài sản thuê bao chính chủ</Text>
                        )}
                      </View>
                    </View>

                    {/* Bottom Glassmorphic Footer (OpenNFTs style) */}
                    <View style={styles.simGlassFooter}>
                      <View style={styles.glassFooterCol}>
                        <Text style={styles.glassFooterLabel}>Định giá niêm yết</Text>
                        <Text style={styles.glassFooterValue} numberOfLines={1}>
                          {sim.price > 0
                            ? `${sim.price.toLocaleString('vi-VN')} ₫`
                            : 'Chưa niêm yết'}
                        </Text>
                      </View>

                      <View style={styles.glassFooterDivider} />

                      <View style={styles.glassFooterColRight}>
                        <Text style={styles.glassFooterLabel}>Thao tác</Text>
                        <View style={styles.actionArrowRow}>
                          <Text style={styles.glassActionText}>Chi tiết</Text>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={16}
                            color="#CBD5E1"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ─── 4. QUICK ACTIONS BENTO GRID ─── */}
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

        {/* ─── 5. ACTIVE DEALS & CONTRACTS SECTION (DANH SÁCH GIAO DỊCH) ─── */}
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

        {/* ─── 6. TRUNG TÂM BẢO CHỨNG TÀI SẢN ─── */}
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
                {myOwnerships.length > 0
                  ? `Đang quản lý ${myOwnerships.length} SIM số đẹp đã đối soát nhà mạng`
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
    paddingTop: Spacing.sm,
    paddingBottom: 110, // Avoid bottom floating nav bar
  },

  // 1. Top Brand Row with S-White-Logo (Image 2 style, no "Xin chào")
  topBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandEmblemBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    ...Shadows.sm,
  },
  brandLogoImg: {
    width: 24,
    height: 24,
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
    paddingVertical: 1.5,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  vaultBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.indigo,
    letterSpacing: 0.5,
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

  // 2. Hero Vault Balance Card
  heroVaultCard: {
    backgroundColor: Colors.navy,
    borderRadius: 28,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.lg,
  },
  heroGlowCircle: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(76, 95, 213, 0.28)',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    zIndex: 2,
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
    zIndex: 2,
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
    zIndex: 2,
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

  // 3. SIM Owner Carousel (Image 2 style)
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

  // Empty state for SIM Owner
  emptySimCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  emptySimIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptySimTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
  },
  emptySimSub: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  emptySimAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.indigo,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  emptySimAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Active SIM Owner Cards
  simOwnerCarouselContent: {
    paddingRight: Spacing.lg,
    gap: 14,
    marginBottom: Spacing.xl,
  },
  simOwnerCard: {
    width: SCREEN_WIDTH * 0.78,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.navy,
    ...Shadows.lg,
  },
  simCardBackdrop: {
    padding: 18,
    minHeight: 220,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  simGlowCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(76, 95, 213, 0.28)',
  },
  simCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  carrierPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  carrierLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  carrierPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  statusBadgePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  simCardCenter: {
    marginVertical: 12,
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
    marginBottom: 8,
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
  simOwnerPhoneNumber: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  simRhythmRow: {
    marginTop: 4,
  },
  rhythmPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: BorderRadius.full,
  },
  rhythmPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDE68A',
  },
  simDefaultHintText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },

  // Glass Footer on SIM Card
  simGlassFooter: {
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
    flex: 0.8,
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
  actionArrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  glassActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },

  // 4. Quick Actions Bento Grid
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

  // 5. Active Deals & Contracts (Danh sách giao dịch)
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

  // 6. Trust Center Stack
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

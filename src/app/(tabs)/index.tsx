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
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import {
  ContractTimeline,
  isTradeAwaitingSignature,
} from '../../components/trust/ContractTimeline';
import { useAuth } from '../../context/AuthContext';
import { contractService } from '../../services/contractService';
import { simService } from '../../services/simService';
import { notificationService } from '../../services/notificationService';
import type { SimOwnershipDto, TradeTransactionDto } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIM_CARD_WIDTH = SCREEN_WIDTH * 0.76;

function getCarrierLabel(carrier?: string): string {
  const upper = (carrier || '').toUpperCase();
  if (upper.includes('VIETTEL')) return 'Viettel';
  if (upper.includes('VINA')) return 'VinaPhone';
  if (upper.includes('MOBI')) return 'MobiFone';
  return carrier || 'Nhà mạng';
}

function getSimStatusMeta(sim: SimOwnershipDto) {
  if (sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE') {
    return { label: 'Chính chủ', dotColor: '#10B981', textColor: '#047857', bgColor: '#ECFDF5' };
  }
  if (sim.verificationStatus === 'PENDING_VERIFICATION') {
    return { label: 'Đang duyệt', dotColor: '#F59E0B', textColor: '#B45309', bgColor: '#FFFBEB' };
  }
  if (sim.verificationStatus === 'REJECTED' || sim.ownershipStatus === 'REVOKED') {
    return { label: 'Từ chối', dotColor: '#E11D48', textColor: '#BE123C', bgColor: '#FFF1F2' };
  }
  return { label: 'Cần OTP', dotColor: '#4C5FD5', textColor: '#4C5FD5', bgColor: '#EEF1FA' };
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

      if (
        unreadRes.status === 'fulfilled' &&
        unreadRes.value.success &&
        typeof unreadRes.value.data === 'number'
      ) {
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
      icon: 'arrow-down-left' as const,
      accent: false,
      onPress: () => router.push('/deposit'),
    },
    {
      key: 'withdraw',
      label: 'Rút tiền',
      icon: 'arrow-up-right' as const,
      accent: false,
      onPress: () => router.push('/withdraw'),
    },
    {
      key: 'transactions',
      label: 'Sao kê',
      icon: 'receipt-text-outline' as const,
      accent: false,
      onPress: () => router.push('/transactions'),
    },
    {
      key: 'verify-sim',
      label: 'Đối soát',
      icon: 'cellphone-check' as const,
      accent: false,
      onPress: handleSimVerification,
    },
    {
      key: 'register-sim',
      label: 'Thêm SIM',
      icon: 'plus' as const,
      accent: true,
      onPress: handleRegisterSim,
    },
    {
      key: 'kyc',
      label: 'eKYC',
      icon: 'shield-account-outline' as const,
      accent: false,
      onPress: () => router.push(isVerified ? '/(tabs)/account' : '/kyc'),
    },
    {
      key: 'sim-vault',
      label: 'Kho SIM',
      icon: 'sim-outline' as const,
      accent: false,
      onPress: () => router.push('/(tabs)/sims'),
    },
    {
      key: 'handover',
      label: 'Bàn giao',
      icon: 'file-sign' as const,
      accent: false,
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
        {/* ─── 1. UNIFIED TOP HEADER ─── */}
        <View style={styles.topHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandEmblem}>
              <Image
                source={require('../../../assets/images/logo/S-White-Logo.png')}
                style={styles.brandLogoImg}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandWordmark}>TrustSim</Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => router.push('/(tabs)/wallet')}
              activeOpacity={0.8}
              accessibilityLabel="Ví tiền"
            >
              <MaterialCommunityIcons name="wallet-outline" size={20} color={Colors.navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.8}
              accessibilityLabel="Thông báo"
            >
              <MaterialCommunityIcons name="bell-outline" size={20} color={Colors.navy} />
              {unreadNotificationCount > 0 && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. HERO BALANCE CARD ─── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopSection}>
            <View style={styles.heroLabelRow}>
              <Text style={styles.heroLabel}>Số dư khả dụng</Text>
              <TouchableOpacity
                style={styles.historyChip}
                onPress={() => router.push('/transactions')}
                activeOpacity={0.8}
              >
                <Text style={styles.historyChipText}>Sao kê</Text>
                <MaterialCommunityIcons name="chevron-right" size={14} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <Text
              style={styles.heroBalanceText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
            >
              {availableBal.toLocaleString('vi-VN')} <Text style={styles.heroCurrency}>₫</Text>
            </Text>

            <View style={styles.heroBtnRow}>
              <TouchableOpacity
                style={styles.heroPrimaryPill}
                onPress={() => router.push('/deposit')}
                activeOpacity={0.88}
              >
                <MaterialCommunityIcons name="plus" size={17} color={Colors.navy} />
                <Text style={styles.heroPrimaryPillText}>Nạp tiền</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroSecondaryPill}
                onPress={() => router.push('/withdraw')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="arrow-up-right" size={17} color="#FFFFFF" />
                <Text style={styles.heroSecondaryPillText}>Rút tiền</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Docked Balance Strip (Escrow & Deposit) */}
          <View style={styles.heroDockedBar}>
            <TouchableOpacity
              style={styles.heroDockedCol}
              onPress={() => router.push('/(tabs)/contracts')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroDockedLabel}>Tiền ký quỹ</Text>
              <Text
                style={styles.heroDockedValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {escrowBal.toLocaleString('vi-VN')} ₫
              </Text>
            </TouchableOpacity>

            <View style={styles.heroDockedDivider} />

            <TouchableOpacity
              style={styles.heroDockedCol}
              onPress={() => router.push('/(tabs)/wallet')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroDockedLabel}>Cọc đấu giá</Text>
              <Text
                style={styles.heroDockedValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {depositBal.toLocaleString('vi-VN')} ₫
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 3. OWNED SIM SHOWCASE CARDS (SIM SỞ HỮU) ─── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>SIM sở hữu</Text>
            {myOwnerships.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{myOwnerships.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.sectionPillLink}
            onPress={() => router.push('/(tabs)/sims')}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.sectionPillLinkText}>Tất cả</Text>
            <MaterialCommunityIcons name="chevron-right" size={15} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {myOwnerships.length === 0 ? (
          <View style={styles.emptyShowcaseCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="sim-outline" size={24} color={Colors.navy} />
            </View>
            <Text style={styles.emptyCardTitle}>Chưa có SIM sở hữu</Text>
            <TouchableOpacity
              style={styles.emptyActionPill}
              onPress={handleRegisterSim}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.emptyActionPillText}>Khai báo SIM</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.simCarousel}
            decelerationRate="fast"
            snapToInterval={SIM_CARD_WIDTH + 14}
          >
            {myOwnerships.map((sim) => {
              const carrierName = getCarrierLabel(sim.carrierName);
              const statusMeta = getSimStatusMeta(sim);

              return (
                <TouchableOpacity
                  key={sim.id}
                  style={styles.simCardOuter}
                  onPress={() => router.push('/(tabs)/sims')}
                  activeOpacity={0.9}
                >
                  {/* Visual Stage (Soft-Cloud Luxury Surface) */}
                  <View style={styles.simCardStage}>
                    <View style={styles.simStageTopRow}>
                      <View style={styles.carrierTagPill}>
                        <Text style={styles.carrierTagText}>{carrierName}</Text>
                      </View>

                      <View
                        style={[
                          styles.statusTagPill,
                          { backgroundColor: statusMeta.bgColor },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: statusMeta.dotColor },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusTagText,
                            { color: statusMeta.textColor },
                          ]}
                        >
                          {statusMeta.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.simStageCenter}>
                      <View style={styles.simChipMinimal}>
                        <MaterialCommunityIcons
                          name="integrated-circuit-chip"
                          size={18}
                          color={Colors.navy}
                        />
                      </View>
                      <Text
                        style={styles.simPhoneDisplay}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {sim.phoneNumber}
                      </Text>
                      <Text style={styles.simRhythmLabel} numberOfLines={1}>
                        {sim.formatRhythmName || 'Thuê bao chính chủ'}
                      </Text>
                    </View>
                  </View>

                  {/* Docked Meta Bar */}
                  <View style={styles.simCardFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.simFooterCaption}>Định giá</Text>
                      <Text style={styles.simFooterPrice} numberOfLines={1}>
                        {sim.price > 0
                          ? `${sim.price.toLocaleString('vi-VN')} ₫`
                          : 'Chưa niêm yết'}
                      </Text>
                    </View>

                    <View style={styles.simFooterArrowCircle}>
                      <MaterialCommunityIcons
                        name="arrow-top-right"
                        size={18}
                        color={Colors.navy}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ─── 4. QUICK ACTIONS ─── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tiện ích</Text>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.quickTile}
              onPress={item.onPress}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View
                style={[
                  styles.quickIconCircle,
                  item.accent && styles.quickIconCircleAccent,
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={20}
                  color={item.accent ? '#FFFFFF' : Colors.navy}
                />
              </View>
              <Text
                style={styles.quickTileLabel}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── 5. ACTIVE TRANSACTIONS & CONTRACTS ─── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <Text style={styles.sectionTitle}>Giao dịch</Text>
            {activeTrades.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeTrades.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.sectionPillLink}
            onPress={() => router.push('/(tabs)/contracts')}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.sectionPillLinkText}>Tất cả</Text>
            <MaterialCommunityIcons name="chevron-right" size={15} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {activeTrades.length === 0 ? (
          <View style={styles.emptyShowcaseCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={22}
                color={Colors.navy}
              />
            </View>
            <Text style={styles.emptyCardTitle}>Chưa có giao dịch đang xử lý</Text>
          </View>
        ) : (
          <View style={styles.tradeListStack}>
            {activeTrades.map((trade) => {
              const awaitingSign = isTradeAwaitingSignature(trade.status);
              const primaryTarget = awaitingSign
                ? `/contract/${trade.id}`
                : `/handover/${trade.id}`;

              return (
                <View key={trade.id} style={styles.tradeRowCard}>
                  <TouchableOpacity
                    onPress={() => router.push(primaryTarget as any)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.tradeHeaderRow}>
                      <View style={styles.tradeIconBox}>
                        <MaterialCommunityIcons name="sim-outline" size={20} color={Colors.navy} />
                      </View>

                      <View style={styles.tradeMainCol}>
                        <Text style={styles.tradePhoneText} numberOfLines={1}>
                          {trade.simPhoneNumber || 'SIM Đấu giá'}
                        </Text>
                        <Text style={styles.tradeCodeText}>
                          #{trade.tradeTransactionCode || trade.id.slice(0, 8)}
                        </Text>
                      </View>

                      <View style={styles.tradeRightCol}>
                        <Text style={styles.tradeAmountText} numberOfLines={1}>
                          {(trade.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
                        </Text>
                        <Text style={styles.tradeStepCaption}>
                          {awaitingSign ? 'Chờ ký OTP' : 'Chờ sang tên'}
                        </Text>
                      </View>
                    </View>

                    <ContractTimeline
                      status={trade.status}
                      compact
                      style={styles.tradeTimeline}
                    />
                  </TouchableOpacity>

                  <View style={styles.tradeBtnRow}>
                    {awaitingSign ? (
                      <TouchableOpacity
                        style={styles.tradePrimaryPillBtn}
                        onPress={() => router.push(`/contract/${trade.id}`)}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.tradePrimaryPillText}>Ký hợp đồng OTP</Text>
                        <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.tradeGhostPillBtn}
                          onPress={() => router.push(`/contract/${trade.id}`)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.tradeGhostPillText}>Hợp đồng</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.tradePrimaryPillBtn}
                          onPress={() => router.push(`/handover/${trade.id}`)}
                          activeOpacity={0.88}
                        >
                          <Text style={styles.tradePrimaryPillText}>Cập nhật bàn giao</Text>
                          <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 114,
  },

  // 1. Unified Top Header
  topHeader: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandEmblem: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImg: {
    width: 20,
    height: 20,
  },
  brandWordmark: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.6,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },

  // 2. Hero Balance Card
  heroCard: {
    backgroundColor: Colors.navy,
    borderRadius: 28,
    padding: 20,
    marginBottom: 26,
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  heroTopSection: {
    marginBottom: 18,
  },
  heroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  historyChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  heroBalanceText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
    marginTop: 6,
    marginBottom: 18,
  },
  heroCurrency: {
    fontSize: 20,
    fontWeight: '600',
    color: '#94A3B8',
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroPrimaryPill: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroPrimaryPillText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.navy,
  },
  heroSecondaryPill: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroSecondaryPillText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroDockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  heroDockedCol: {
    flex: 1,
  },
  heroDockedDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 14,
  },
  heroDockedLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 2,
  },
  heroDockedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    fontVariant: ['tabular-nums'],
  },

  // 3. Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.4,
  },
  countBadge: {
    backgroundColor: '#EEF1FA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.indigo,
  },
  sectionPillLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.06)',
  },
  sectionPillLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },

  // 4. Owned SIM Showcase Carousel (Soft-Cloud Luxury)
  simCarousel: {
    paddingRight: 20,
    gap: 14,
    marginBottom: 26,
  },
  simCardOuter: {
    width: SIM_CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  simCardStage: {
    backgroundColor: '#EEF1FA',
    borderRadius: 22,
    padding: 16,
    minHeight: 148,
    justifyContent: 'space-between',
  },
  simStageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carrierTagPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  carrierTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: 0.2,
  },
  statusTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  simStageCenter: {
    marginTop: 18,
  },
  simChipMinimal: {
    width: 30,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  simPhoneDisplay: {
    fontSize: 23,
    fontWeight: '900',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  simRhythmLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  simCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  simFooterCaption: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  simFooterPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  simFooterArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty Showcase Card
  emptyShowcaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    marginBottom: 26,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyActionPill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  emptyActionPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 5. Quick Actions Grid (Clean Monochromatic Tiles)
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },
  quickTile: {
    width: '22.5%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: SCREEN_WIDTH < 360 ? 3 : 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
  },
  quickIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickIconCircleAccent: {
    backgroundColor: Colors.navy,
  },
  quickTileLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.navy,
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // 6. Active Transactions & Contracts List
  tradeListStack: {
    gap: 12,
  },
  tradeRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  tradeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tradeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeMainCol: {
    flex: 1,
  },
  tradePhoneText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  tradeCodeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  tradeRightCol: {
    alignItems: 'flex-end',
  },
  tradeAmountText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  tradeStepCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.indigo,
    marginTop: 2,
  },
  tradeTimeline: {
    marginTop: 14,
    marginBottom: 14,
  },
  tradeBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tradePrimaryPillBtn: {
    flex: 1.4,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tradePrimaryPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tradeGhostPillBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tradeGhostPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.navy,
  },
});

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  VerificationBadgeStatus,
  VerificationStatusBadge,
} from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { simService } from '../../services/simService';
import type { SimOwnershipDto } from '../../types';

type SimFilter = 'ALL' | 'VERIFIED' | 'PENDING' | 'NEEDS_OTP';

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

function getSimBadgeProps(sim: SimOwnershipDto): {
  status: VerificationBadgeStatus;
  label: string;
} {
  if (sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE') {
    return { status: 'verified', label: 'Chính chủ đã xác thực' };
  }
  if (sim.verificationStatus === 'PENDING_VERIFICATION') {
    return { status: 'checking', label: 'Đang thẩm định' };
  }
  if (sim.verificationStatus === 'REJECTED' || sim.ownershipStatus === 'REVOKED') {
    return { status: 'rejected', label: 'Từ chối duyệt' };
  }
  return { status: 'pending', label: 'Cần xác thực OTP' };
}

export default function SimVerificationTabScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [ownerships, setOwnerships] = useState<SimOwnershipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<SimFilter>('ALL');

  const isEkycVerified = profile?.verificationStatus === 'VERIFIED';

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const ownRes = await simService.getMyOwnerships({ pageIndex: 1, pageSize: 50 });
      if (ownRes.success && ownRes.data?.items) {
        setOwnerships(ownRes.data.items);
      } else {
        setOwnerships([]);
      }
    } catch {
      setOwnerships([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(false);
    }, [loadData])
  );

  const counts = useMemo(() => {
    let verified = 0;
    let pending = 0;
    let needsOtp = 0;
    ownerships.forEach((sim) => {
      const isOwnVerified =
        sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE';
      if (isOwnVerified) verified += 1;
      else if (sim.verificationStatus === 'PENDING_VERIFICATION') pending += 1;
      else needsOtp += 1;
    });
    return { total: ownerships.length, verified, pending, needsOtp };
  }, [ownerships]);

  const filteredSims = useMemo(() => {
    return ownerships.filter((sim) => {
      const isOwnVerified =
        sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE';
      if (filter === 'VERIFIED') return isOwnVerified;
      if (filter === 'PENDING') return sim.verificationStatus === 'PENDING_VERIFICATION';
      if (filter === 'NEEDS_OTP')
        return !isOwnVerified && sim.verificationStatus !== 'PENDING_VERIFICATION';
      return true;
    });
  }, [ownerships, filter]);

  const handleRegisterNewSim = () => {
    if (!isEkycVerified) {
      Alert.alert(
        'Yêu cầu xác thực CCCD trước',
        'Để đảm bảo thuê bao SIM khớp với danh tính chính chủ, bạn cần hoàn tất xác thực CCCD trước khi khai báo SIM.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Xác thực CCCD', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    router.push('/sims/register');
  };

  const handleOpenOtpFlow = (sim?: SimOwnershipDto) => {
    if (!isEkycVerified) {
      Alert.alert(
        'Yêu cầu xác thực CCCD trước',
        'Vui lòng xác thực CCCD để hệ thống đối chiếu thông tin chủ thuê bao với nhà mạng.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Xác thực CCCD', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    if (sim) {
      router.push({
        pathname: '/sims/verify',
        params: {
          simAssetId: sim.simNumberId || sim.id,
          phoneNumber: sim.phoneNumber,
          carrier: sim.carrierName || 'Viettel',
        },
      });
    } else {
      router.push('/sims/verify');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={Colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerBadgeText}>Bộ sưu tập & Đối soát thuê bao</Text>
            <Text style={styles.pageTitle}>Tài Sản SIM Số Đẹp</Text>
          </View>
          <TouchableOpacity
            style={styles.addSimBtn}
            onPress={handleRegisterNewSim}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.addSimBtnText}>Khai báo SIM</Text>
          </TouchableOpacity>
        </View>

        {/* Cảnh báo nếu chưa eKYC */}
        {!isEkycVerified && (
          <TouchableOpacity
            style={styles.ekycAlertBanner}
            onPress={() => router.push('/kyc')}
            activeOpacity={0.85}
          >
            <View style={styles.ekycAlertIcon}>
              <MaterialCommunityIcons
                name="shield-alert-outline"
                size={20}
                color={Colors.amber}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ekycAlertTitle}>Cần xác thực CCCD trước khi đối soát SIM</Text>
              <Text style={styles.ekycAlertSub}>
                Hệ thống đối chiếu trực tiếp họ tên & số CCCD của bạn với dữ liệu thuê bao nhà mạng.
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.amber} />
          </TouchableOpacity>
        )}

        {/* Hero Collector Summary Banner (Navy + Gold SIM Chip Motif) */}
        <View style={styles.collectorHeroCard}>
          <View style={styles.collectorHeroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.collectorHeroTitle}>Chứng thực quyền sở hữu SIM</Text>
              <Text style={styles.collectorHeroSub}>
                Xác thực SMS OTP trực tiếp trên thiết bị lắp SIM để cấp chứng chỉ chính chủ đưa lên sàn đấu giá.
              </Text>
            </View>
            <View style={styles.goldSimChipGraphic}>
              <View style={styles.goldSimChipInner} />
              <MaterialCommunityIcons name="sim" size={26} color="#F59E0B" />
            </View>
          </View>

          {/* 3 Stat Pills */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatBox}>
              <Text style={styles.heroStatNumber}>{counts.total}</Text>
              <Text style={styles.heroStatLabel}>Tổng thuê bao</Text>
            </View>
            <View style={styles.heroStatBox}>
              <Text style={[styles.heroStatNumber, { color: '#34D399' }]}>{counts.verified}</Text>
              <Text style={styles.heroStatLabel}>Đã chính chủ</Text>
            </View>
            <View style={styles.heroStatBox}>
              <Text style={[styles.heroStatNumber, { color: '#FBBF24' }]}>
                {counts.pending + counts.needsOtp}
              </Text>
              <Text style={styles.heroStatLabel}>Chờ xác thực</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.heroVerifyCta}
            onPress={() => handleOpenOtpFlow()}
            activeOpacity={0.88}
          >
            <MaterialCommunityIcons name="cellphone-check" size={18} color={Colors.navy} />
            <Text style={styles.heroVerifyCtaText}>Thực hiện đối soát SMS OTP ngay</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              { key: 'ALL', label: `Tất cả (${counts.total})` },
              { key: 'NEEDS_OTP', label: `Cần OTP (${counts.needsOtp})` },
              { key: 'PENDING', label: `Đang duyệt (${counts.pending})` },
              { key: 'VERIFIED', label: `Chính chủ (${counts.verified})` },
            ] as { key: SimFilter; label: string }[]
          ).map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(item.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Danh sách Thẻ SIM Số Đẹp (Tactile VIP SIM Collector Cards) */}
        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="small" color={Colors.navy} />
            <Text style={styles.emptySub}>Đang tải danh sách tài sản SIM...</Text>
          </View>
        ) : filteredSims.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="sim-outline" size={28} color={Colors.gold} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có SIM nào trong danh mục này</Text>
            <Text style={styles.emptySub}>
              Khai báo số thuê bao bạn đang sở hữu và xác thực mã OTP để mở khóa tính năng đấu giá trên sàn.
            </Text>
            <TouchableOpacity
              style={styles.emptyCtaBtn}
              onPress={handleRegisterNewSim}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Khai báo SIM mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.simCardsStack}>
            {filteredSims.map((sim) => {
              const isOwnVerified =
                sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE';
              const badge = getSimBadgeProps(sim);
              const carrierTheme = getCarrierTheme(sim.carrierName || sim.carrierCode);

              return (
                <View key={sim.id} style={styles.simAssetCard}>
                  {/* Top Bar: Carrier Pill + Status Badge */}
                  <View style={styles.simCardHeader}>
                    <View
                      style={[
                        styles.carrierPill,
                        {
                          backgroundColor: carrierTheme.bg,
                          borderColor: carrierTheme.border,
                        },
                      ]}
                    >
                      <View
                        style={[styles.carrierDot, { backgroundColor: carrierTheme.text }]}
                      />
                      <Text style={[styles.carrierPillText, { color: carrierTheme.text }]}>
                        {carrierTheme.label}
                      </Text>
                    </View>
                    <VerificationStatusBadge
                      status={badge.status}
                      label={badge.label}
                      size="sm"
                    />
                  </View>

                  {/* Middle: Tactile Gold SIM Chip + Big Phone Number + Rhythm Tag */}
                  <View style={styles.simPlateBody}>
                    <View style={styles.tactileChipBox}>
                      <View style={styles.tactileChipGridLineH} />
                      <View style={styles.tactileChipGridLineV} />
                      <MaterialCommunityIcons
                        name="integrated-circuit-chip"
                        size={20}
                        color="#B45309"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.simNumberDisplay}>{sim.phoneNumber}</Text>
                      <View style={styles.simTagsRow}>
                        {sim.formatRhythmName ? (
                          <View style={styles.rhythmTag}>
                            <MaterialCommunityIcons
                              name="star-four-points"
                              size={11}
                              color={Colors.gold}
                            />
                            <Text style={styles.rhythmTagText}>{sim.formatRhythmName}</Text>
                          </View>
                        ) : (
                          <Text style={styles.simSubHint}>Thuê bao di động chính chủ</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Bottom Footer: Valuation Price + Action Button */}
                  <View style={styles.simCardFooter}>
                    <View>
                      <Text style={styles.priceCaption}>Định giá niêm yết</Text>
                      <Text style={styles.priceValue}>
                        {sim.price > 0
                          ? `${sim.price.toLocaleString('vi-VN')} ₫`
                          : 'Chưa niêm yết giá'}
                      </Text>
                    </View>

                    {!isOwnVerified ? (
                      <TouchableOpacity
                        style={styles.verifyOtpBtn}
                        onPress={() => handleOpenOtpFlow(sim)}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons
                          name="shield-key-outline"
                          size={15}
                          color="#FFFFFF"
                        />
                        <Text style={styles.verifyOtpBtnText}>Xác thực OTP</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.verifiedDetailBtn}
                        onPress={() => handleOpenOtpFlow(sim)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons
                          name="check-decagram"
                          size={15}
                          color={Colors.success}
                        />
                        <Text style={styles.verifiedDetailBtnText}>Chứng thư số</Text>
                      </TouchableOpacity>
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  headerTextCol: {
    flex: 1,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  addSimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.crimson,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    ...Shadows.sm,
  },
  addSimBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ekycAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  ekycAlertIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ekycAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  ekycAlertSub: {
    fontSize: 11.5,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 16,
  },
  collectorHeroCard: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  collectorHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  collectorHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  collectorHeroSub: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
    marginTop: 4,
  },
  goldSimChipGraphic: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldSimChipInner: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  heroStatBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  heroStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  heroVerifyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FBBF24',
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  heroVerifyCtaText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.navy,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  emptySub: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  emptyCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  simCardsStack: {
    gap: Spacing.md,
  },
  simAssetCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  simCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  carrierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  carrierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  carrierPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  simPlateBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tactileChipBox: {
    width: 46,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FDE68A',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  tactileChipGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(180, 83, 9, 0.25)',
  },
  tactileChipGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(180, 83, 9, 0.25)',
  },
  simNumberDisplay: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  simTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  rhythmTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.goldSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  rhythmTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold,
  },
  simSubHint: {
    fontSize: 11.5,
    color: Colors.textMuted,
  },
  simCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  priceCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  verifyOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
  },
  verifyOtpBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  verifiedDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  verifiedDetailBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.success,
  },
});

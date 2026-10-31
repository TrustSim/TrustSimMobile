import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  VerificationBadgeStatus,
  VerificationStatusBadge,
} from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { simService } from '../../services/simService';
import { aiValuationService } from '../../services/aiValuationService';
import type { SimOwnershipDto, SimValuationDto } from '../../types';

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

  // Valuation & Price Edit Modal States
  const [selectedSim, setSelectedSim] = useState<SimOwnershipDto | null>(null);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [modalMode, setModalMode] = useState<'AI' | 'MANUAL'>('AI');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiResult, setAiResult] = useState<SimValuationDto | null>(null);
  const [customPrice, setCustomPrice] = useState<number>(10000000);
  const [customPriceFormatted, setCustomPriceFormatted] = useState<string>('10.000.000');
  const [submittingPrice, setSubmittingPrice] = useState(false);

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

  // Open AI Valuation Modal
  const handleOpenAiValuation = (sim: SimOwnershipDto) => {
    setSelectedSim(sim);
    setModalMode('AI');
    setAiResult(null);
    const initialPrice = sim.price > 0 ? sim.price : 10000000;
    setCustomPrice(initialPrice);
    setCustomPriceFormatted(initialPrice.toLocaleString('vi-VN'));
    setShowValuationModal(true);
    triggerAiEstimate(sim);
  };

  // Open Manual Price Edit Modal
  const handleOpenManualPriceEdit = (sim: SimOwnershipDto) => {
    setSelectedSim(sim);
    setModalMode('MANUAL');
    setAiResult(null);
    const initialPrice = sim.price > 0 ? sim.price : 10000000;
    setCustomPrice(initialPrice);
    setCustomPriceFormatted(initialPrice.toLocaleString('vi-VN'));
    setShowValuationModal(true);
  };

  // Call AI Valuation Service
  const triggerAiEstimate = async (simToEvaluate?: SimOwnershipDto) => {
    const sim = simToEvaluate || selectedSim;
    if (!sim) return;
    setLoadingAi(true);
    try {
      const res = await aiValuationService.estimatePrice({
        phoneNumber: sim.phoneNumber,
        simNumberId: sim.simNumberId || sim.id,
      });
      if (res.success && res.data) {
        setAiResult(res.data);
        if (res.data.suggestedPrice > 0) {
          const p = Math.round(res.data.suggestedPrice);
          setCustomPrice(p);
          setCustomPriceFormatted(p.toLocaleString('vi-VN'));
        }
      } else {
        Alert.alert('Thông báo', res.message || 'Không thể định giá SIM vào thời điểm này.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi định giá AI', err?.message || 'Đã có lỗi xảy ra khi thẩm định giá SIM.');
    } finally {
      setLoadingAi(false);
    }
  };

  // Apply AI Price to SIM
  const handleApplyAiPrice = async () => {
    if (!aiResult?.valuationId) {
      Alert.alert('Chưa có định giá', 'Vui lòng nhấn định giá AI trước.');
      return;
    }
    setSubmittingPrice(true);
    try {
      const res = await aiValuationService.applyValuation(aiResult.valuationId);
      if (res.success) {
        Alert.alert(
          'Áp dụng thành công',
          `Đã cập nhật mức giá ${Math.round(aiResult.suggestedPrice).toLocaleString('vi-VN')} ₫ vào số SIM ${selectedSim?.phoneNumber}.`
        );
        setShowValuationModal(false);
        await loadData(true);
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể áp dụng giá AI.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể áp dụng giá AI.');
    } finally {
      setSubmittingPrice(false);
    }
  };

  // Save Manual Price
  const handleSaveManualPrice = async () => {
    if (!selectedSim) return;
    if (!customPrice || customPrice <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập mức giá hợp lệ (lớn hơn 0).');
      return;
    }
    setSubmittingPrice(true);
    try {
      const simId = selectedSim.simNumberId || selectedSim.id;
      const res = await simService.updateSim(simId, { price: customPrice });
      if (res.success) {
        Alert.alert(
          'Cập nhật thành công',
          `Đã cập nhật giá niêm yết của SIM ${selectedSim.phoneNumber} thành ${customPrice.toLocaleString('vi-VN')} ₫.`
        );
        setShowValuationModal(false);
        await loadData(true);
      } else {
        Alert.alert('Lỗi', res.message || 'Không thể cập nhật giá SIM.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Đã có lỗi xảy ra khi cập nhật giá SIM.');
    } finally {
      setSubmittingPrice(false);
    }
  };

  const handleQuickAdd = (amount: number) => {
    const next = (customPrice || 0) + amount;
    setCustomPrice(next);
    setCustomPriceFormatted(next.toLocaleString('vi-VN'));
  };

  const handlePriceChange = (text: string) => {
    const numericOnly = text.replace(/\D/g, '');
    const num = parseInt(numericOnly, 10) || 0;
    setCustomPrice(num);
    setCustomPriceFormatted(num > 0 ? num.toLocaleString('vi-VN') : '');
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
        {/* ─── 1. TOP PROGRESS & SYNC HEADER (Image 1 Style) ─── */}
        <View style={styles.topProgressHeader}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.navy} />
          </TouchableOpacity>

          <View style={styles.progressBarWrapper}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressTitle}>Xác thực chính chủ</Text>
              <Text style={styles.progressPercentText}>
                {counts.total > 0 ? `${Math.round((counts.verified / counts.total) * 100)}%` : '0%'}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${counts.total > 0 ? Math.min(Math.round((counts.verified / counts.total) * 100), 100) : 25}%`,
                  },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerSyncBtn}
            onPress={() => loadData(true)}
            activeOpacity={0.8}
            accessibilityLabel="Đồng bộ dữ liệu"
          >
            <MaterialCommunityIcons name="sync" size={20} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {/* ─── 2. 3D SIM VECTOR ARTWORK HERO (Image 1 Style) ─── */}
        <View style={styles.sim3DArtworkHero}>
          {/* Layered 3D SIM Card Graphic */}
          <View style={styles.sim3DGraphicOuter}>
            <View style={styles.sim3DChamferCut} />
            <View style={styles.sim3DInnerPad}>
              <View style={styles.sim3DChipPlate}>
                <View style={styles.sim3DChipTraceH} />
                <View style={styles.sim3DChipTraceV} />
                <MaterialCommunityIcons name="integrated-circuit-chip" size={32} color="#92400E" />
              </View>
            </View>
          </View>

          <Text style={styles.heroHeadline}>Kho SIM & Tài Sản Của Bạn</Text>
          <Text style={styles.heroSubDescription}>
            Đối soát trực tiếp dữ liệu thuê bao với Viettel, Vina, Mobi. Thẩm định giá AI 4 tầng và bảo chứng chính chủ trên sàn.
          </Text>

          {/* Action Pills (Image 1 style) */}
          <View style={styles.heroPillActions}>
            <TouchableOpacity
              style={styles.primaryPillBtn}
              onPress={handleRegisterNewSim}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="plus" size={17} color="#FFFFFF" />
              <Text style={styles.primaryPillBtnText}>Khai báo SIM mới</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryPillBtn}
              onPress={() => handleOpenOtpFlow()}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="shield-key-outline" size={17} color={Colors.navy} />
              <Text style={styles.secondaryPillBtnText}>Đối soát SMS OTP</Text>
            </TouchableOpacity>
          </View>
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

        {/* ─── 3. STATS STRIP ─── */}
        <View style={styles.heroStatsStrip}>
          <View style={styles.statItemCol}>
            <Text style={styles.statItemNumber}>{counts.total}</Text>
            <Text style={styles.statItemLabel}>Tổng thuê bao</Text>
          </View>
          <View style={styles.statItemDivider} />
          <View style={styles.statItemCol}>
            <Text style={[styles.statItemNumber, { color: '#059669' }]}>{counts.verified}</Text>
            <Text style={styles.statItemLabel}>Đã chính chủ</Text>
          </View>
          <View style={styles.statItemDivider} />
          <View style={styles.statItemCol}>
            <Text style={[styles.statItemNumber, { color: '#D97706' }]}>
              {counts.pending + counts.needsOtp}
            </Text>
            <Text style={styles.statItemLabel}>Chờ xác thực</Text>
          </View>
        </View>

        {/* ─── 4. FILTER PILLS ─── */}
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

        {/* ─── 5. "CHOOSE YOUR NUMBER" LIST (Image 1 Style) ─── */}
        <View style={styles.listSectionHeader}>
          <Text style={styles.listSectionTitle}>Chọn số SIM của bạn</Text>
          <Text style={styles.listSectionSub}>
            Chọn số thuê bao để kích hoạt định giá AI, cấp chứng thư hoặc chỉnh sửa niêm yết.
          </Text>
        </View>

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
              <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Khai báo SIM mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.simCardsStack}>
            {filteredSims.map((sim) => {
              const carrierTheme = getCarrierTheme(sim.carrierName);
              const badge = getSimBadgeProps(sim);
              const isOwnVerified =
                sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE';

              return (
                <View key={sim.id} style={styles.simAssetCard}>
                  {/* Clean Number Row with Chevron > (Image 1 Style) */}
                  <TouchableOpacity
                    style={styles.numberRowTouchable}
                    onPress={() => {
                      if (!isOwnVerified) {
                        handleOpenOtpFlow(sim);
                      } else {
                        handleOpenAiValuation(sim);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={styles.numberRowLeft}>
                      <View style={styles.simMiniChipGraphic}>
                        <MaterialCommunityIcons name="sim" size={18} color="#D97706" />
                      </View>
                      <View>
                        <Text style={styles.simNumberMainText}>{sim.phoneNumber}</Text>
                        <View style={styles.carrierTagsRow}>
                          <View
                            style={[
                              styles.carrierMiniTag,
                              { backgroundColor: carrierTheme.bg, borderColor: carrierTheme.border },
                            ]}
                          >
                            <Text style={[styles.carrierMiniTagText, { color: carrierTheme.text }]}>
                              {carrierTheme.label}
                            </Text>
                          </View>

                          {sim.formatRhythmName && (
                            <View style={styles.rhythmTag}>
                              <Text style={styles.rhythmTagText}>{sim.formatRhythmName}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Right Chevron > inside circle (Image 1) */}
                    <View style={styles.chevronCircle}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
                    </View>
                  </TouchableOpacity>

                  {/* Sub Info Row: Valuation Price & Status Badge */}
                  <View style={styles.simMetaFooter}>
                    <View>
                      <Text style={styles.priceCaption}>Định giá niêm yết</Text>
                      <Text style={styles.priceValue}>
                        {sim.price > 0
                          ? `${sim.price.toLocaleString('vi-VN')} ₫`
                          : 'Chưa niêm yết'}
                      </Text>
                    </View>

                    <VerificationStatusBadge
                      status={badge.status}
                      label={badge.label}
                      size="sm"
                    />
                  </View>

                  {/* Action Pill Buttons */}
                  <View style={styles.simCardActionRow}>
                    {!isOwnVerified ? (
                      <TouchableOpacity
                        style={styles.actionPillPrimary}
                        onPress={() => handleOpenOtpFlow(sim)}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="shield-key-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.actionPillPrimaryText}>Xác thực OTP</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionPillSuccess}
                        onPress={() => handleOpenOtpFlow(sim)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="check-decagram" size={15} color={Colors.success} />
                        <Text style={styles.actionPillSuccessText}>Chứng thư số</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.actionPillAi}
                      onPress={() => handleOpenAiValuation(sim)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="creation" size={15} color="#D97706" />
                      <Text style={styles.actionPillAiText}>Định giá AI</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionPillSecondary}
                      onPress={() => handleOpenManualPriceEdit(sim)}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons name="tag-edit-outline" size={15} color={Colors.navy} />
                      <Text style={styles.actionPillSecondaryText}>Sửa giá</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* "Scroll Down to show more numbers" Hint (Image 1 Style) */}
            <View style={styles.scrollDownHintContainer}>
              <Text style={styles.scrollDownHintText}>Kéo xuống để xem thêm thuê bao</Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.textMuted} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── VALUATION & PRICE EDIT MODAL ─── */}
      <Modal
        visible={showValuationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowValuationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.modalSimPill}>
                  <MaterialCommunityIcons name="sim" size={16} color={Colors.gold} />
                  <Text style={styles.modalSimNumber}>{selectedSim?.phoneNumber}</Text>
                  {selectedSim?.carrierName && (
                    <Text style={styles.modalSimCarrier}>• {selectedSim.carrierName}</Text>
                  )}
                </View>
                <Text style={styles.modalTitle}>
                  {modalMode === 'AI' ? 'Thẩm định giá thông minh AI' : 'Chỉnh sửa định giá niêm yết'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowValuationModal(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Segmented Mode Switcher */}
            <View style={styles.modeSwitcherRow}>
              <TouchableOpacity
                style={[styles.modeTab, modalMode === 'AI' && styles.modeTabActiveAi]}
                onPress={() => setModalMode('AI')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="creation"
                  size={15}
                  color={modalMode === 'AI' ? '#D97706' : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    modalMode === 'AI' && styles.modeTabTextActiveAi,
                  ]}
                >
                  Định giá nhờ AI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, modalMode === 'MANUAL' && styles.modeTabActiveManual]}
                onPress={() => setModalMode('MANUAL')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={15}
                  color={modalMode === 'MANUAL' ? Colors.navy : Colors.textMuted}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    modalMode === 'MANUAL' && styles.modeTabTextActiveManual,
                  ]}
                >
                  Sửa giá niêm yết
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={styles.modalScrollBody}
              showsVerticalScrollIndicator={false}
            >
              {modalMode === 'AI' ? (
                /* ─── TAB 1: AI VALUATION ─── */
                <View>
                  {loadingAi ? (
                    <View style={styles.aiLoadingBox}>
                      <ActivityIndicator size="large" color="#D97706" />
                      <Text style={styles.aiLoadingTitle}>Mô hình AI đang thẩm định giá...</Text>
                      <Text style={styles.aiLoadingSub}>
                        Phân tích nhịp số toán học, đối chiếu dữ liệu giao dịch RAG và mô hình NVIDIA LLM.
                      </Text>
                    </View>
                  ) : aiResult ? (
                    <View style={styles.aiResultContainer}>
                      {/* Big Suggested Price Box */}
                      <View style={styles.aiPriceHeroCard}>
                        <View style={styles.aiPriceBadge}>
                          <MaterialCommunityIcons name="creation" size={13} color="#FFFFFF" />
                          <Text style={styles.aiPriceBadgeText}>MỨC GIÁ AI ĐỀ XUẤT</Text>
                        </View>
                        <Text style={styles.aiPriceHeroValue}>
                          {Math.round(aiResult.suggestedPrice).toLocaleString('vi-VN')} ₫
                        </Text>
                        <Text style={styles.aiPriceHeroHint}>
                          Độ tin cậy: {Math.round((aiResult.confidenceScore || 0.85) * 100)}%
                          {aiResult.detectedRhythmName ? ` • ${aiResult.detectedRhythmName}` : ''}
                        </Text>
                      </View>

                      {/* Market Spread: Min & Max */}
                      <View style={styles.marketSpreadRow}>
                        <View style={styles.marketSpreadBox}>
                          <Text style={styles.marketSpreadLabel}>Giá thợ thu mua</Text>
                          <Text style={styles.marketSpreadVal}>
                            {Math.round(aiResult.minPrice).toLocaleString('vi-VN')} ₫
                          </Text>
                        </View>
                        <View style={styles.marketSpreadDivider} />
                        <View style={styles.marketSpreadBox}>
                          <Text style={styles.marketSpreadLabel}>Giá bán lẻ đại lý</Text>
                          <Text style={styles.marketSpreadVal}>
                            {Math.round(aiResult.maxPrice).toLocaleString('vi-VN')} ₫
                          </Text>
                        </View>
                      </View>

                      {/* Reasoning & Feng Shui */}
                      {(aiResult.valuationReasoning || aiResult.fengShuiAnalysis) && (
                        <View style={styles.aiReasoningBox}>
                          <Text style={styles.aiReasoningTitle}>Luận giải định giá & Phong thủy:</Text>
                          <Text style={styles.aiReasoningText}>
                            {aiResult.valuationReasoning || aiResult.fengShuiAnalysis}
                          </Text>
                        </View>
                      )}

                      {/* Re-estimate CTA */}
                      <TouchableOpacity
                        style={styles.reEstimateBtn}
                        onPress={() => triggerAiEstimate()}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="refresh" size={15} color="#D97706" />
                        <Text style={styles.reEstimateBtnText}>Yêu cầu thẩm định lại</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.aiInitialBox}>
                      <View style={styles.aiInitialIcon}>
                        <MaterialCommunityIcons name="robot-confused-outline" size={32} color="#D97706" />
                      </View>
                      <Text style={styles.aiInitialTitle}>Chưa có kết quả thẩm định</Text>
                      <Text style={styles.aiInitialSub}>
                        Nhấn nút bên dưới để hệ thống AI 4 tầng định giá chính xác theo thị trường hiện tại.
                      </Text>
                      <TouchableOpacity
                        style={styles.aiTriggerCta}
                        onPress={() => triggerAiEstimate()}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="creation" size={17} color="#FFFFFF" />
                        <Text style={styles.aiTriggerCtaText}>Định giá AI ngay</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                /* ─── TAB 2: MANUAL PRICE EDIT ─── */
                <View>
                  <Text style={styles.inputLabel}>Mức giá niêm yết mong muốn (VNĐ)</Text>
                  <View style={styles.currencyInputRow}>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="numeric"
                      value={customPriceFormatted}
                      onChangeText={handlePriceChange}
                      placeholder="0"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Text style={styles.currencyUnit}>₫</Text>
                  </View>

                  {/* Quick Addition Pills */}
                  <Text style={styles.quickAddLabel}>Cộng nhanh mức giá:</Text>
                  <View style={styles.quickAddRow}>
                    <TouchableOpacity
                      style={styles.quickAddPill}
                      onPress={() => handleQuickAdd(1000000)}
                    >
                      <Text style={styles.quickAddPillText}>+ 1 Tr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAddPill}
                      onPress={() => handleQuickAdd(5000000)}
                    >
                      <Text style={styles.quickAddPillText}>+ 5 Tr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAddPill}
                      onPress={() => handleQuickAdd(10000000)}
                    >
                      <Text style={styles.quickAddPillText}>+ 10 Tr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAddPill}
                      onPress={() => handleQuickAdd(50000000)}
                    >
                      <Text style={styles.quickAddPillText}>+ 50 Tr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickAddPill}
                      onPress={() => handleQuickAdd(100000000)}
                    >
                      <Text style={styles.quickAddPillText}>+ 100 Tr</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.priceHelpBanner}>
                    <MaterialCommunityIcons name="information-outline" size={16} color={Colors.navy} />
                    <Text style={styles.priceHelpText}>
                      Giá niêm yết sẽ hiển thị trực tiếp cho người mua trên sàn và là giá khởi điểm khi tạo phiên đấu giá.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowValuationModal(false)}
                disabled={submittingPrice}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              {modalMode === 'AI' ? (
                <TouchableOpacity
                  style={[
                    styles.modalApplyBtnAi,
                    (!aiResult || submittingPrice) && { opacity: 0.6 },
                  ]}
                  onPress={handleApplyAiPrice}
                  disabled={!aiResult || submittingPrice}
                  activeOpacity={0.85}
                >
                  {submittingPrice ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.modalApplyText}>Áp dụng giá AI này</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.modalApplyBtnManual,
                    submittingPrice && { opacity: 0.6 },
                  ]}
                  onPress={handleSaveManualPrice}
                  disabled={submittingPrice}
                  activeOpacity={0.85}
                >
                  {submittingPrice ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="content-save-check" size={16} color="#FFFFFF" />
                      <Text style={styles.modalApplyText}>Lưu giá niêm yết</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
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

  // 1. Top Progress & Header (Image 1 style)
  topProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: 12,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  progressBarWrapper: {
    flex: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.navy,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.indigo,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.navy,
    borderRadius: 3,
  },
  headerSyncBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },

  // 2. 3D SIM Artwork Hero (Image 1 style)
  sim3DArtworkHero: {
    backgroundColor: Colors.surface,
    borderRadius: 28,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  sim3DGraphicOuter: {
    width: 80,
    height: 110,
    borderRadius: 16,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: Spacing.md,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  sim3DChamferCut: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderTopRightRadius: 16,
    backgroundColor: Colors.surface,
    transform: [{ rotate: '45deg' }, { translateX: 8 }, { translateY: -8 }],
  },
  sim3DInnerPad: {
    width: 58,
    height: 74,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sim3DChipPlate: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sim3DChipTraceH: {
    position: 'absolute',
    width: 54,
    height: 1,
    backgroundColor: '#B45309',
    opacity: 0.4,
  },
  sim3DChipTraceV: {
    position: 'absolute',
    height: 70,
    width: 1,
    backgroundColor: '#B45309',
    opacity: 0.4,
  },
  heroHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.navy,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  heroSubDescription: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  heroPillActions: {
    width: '100%',
    gap: 8,
  },
  primaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.indigo,
    borderRadius: BorderRadius.full,
    paddingVertical: 13,
    ...Shadows.sm,
  },
  primaryPillBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.full,
    paddingVertical: 13,
  },
  secondaryPillBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },

  // Alert Banner
  ekycAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 20,
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

  // 3. Stats Strip
  heroStatsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  statItemCol: {
    alignItems: 'center',
    flex: 1,
  },
  statItemNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  statItemLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  statItemDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
  },

  // 4. Filter Row
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
    borderColor: Colors.borderLight,
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

  // 5. "Choose Your Number" Section
  listSectionHeader: {
    marginBottom: Spacing.sm,
    marginTop: 4,
  },
  listSectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.navy,
    letterSpacing: -0.4,
  },
  listSectionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  simCardsStack: {
    gap: 12,
    marginTop: Spacing.sm,
  },
  simAssetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  numberRowTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numberRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  simMiniChipGraphic: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simNumberMainText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
  },
  carrierTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  carrierMiniTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  carrierMiniTagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  rhythmTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rhythmTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Sub Meta Footer
  simMetaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  priceCaption: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  priceValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },

  // Action Pills
  simCardActionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  actionPillPrimary: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.navy,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  actionPillPrimaryText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionPillSuccess: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  actionPillSuccessText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.success,
  },
  actionPillAi: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  actionPillAiText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D97706',
  },
  actionPillSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  actionPillSecondaryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.navy,
  },

  // "Scroll Down" Hint (Image 1 Style)
  scrollDownHintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 2,
  },
  scrollDownHintText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  // Empty Card
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
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

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalSimPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modalSimNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
  },
  modalSimCarrier: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.full,
    padding: 3,
    marginBottom: Spacing.md,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  modeTabActiveAi: {
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  modeTabActiveManual: {
    backgroundColor: '#FFFFFF',
    ...Shadows.sm,
  },
  modeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  modeTabTextActiveAi: {
    color: '#D97706',
  },
  modeTabTextActiveManual: {
    color: Colors.navy,
  },
  modalScrollBody: {
    paddingVertical: Spacing.sm,
  },
  aiLoadingBox: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  aiLoadingTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: Spacing.md,
  },
  aiLoadingSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: Spacing.lg,
  },
  aiResultContainer: {
    gap: Spacing.md,
  },
  aiPriceHeroCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 20,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  aiPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#D97706',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginBottom: 6,
  },
  aiPriceBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  aiPriceHeroValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#92400E',
    fontVariant: ['tabular-nums'],
  },
  aiPriceHeroHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
    marginTop: 4,
  },
  marketSpreadRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
  },
  marketSpreadBox: {
    flex: 1,
    alignItems: 'center',
  },
  marketSpreadDivider: {
    width: 1,
    backgroundColor: '#CBD5E1',
    marginHorizontal: Spacing.sm,
  },
  marketSpreadLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  marketSpreadVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  aiReasoningBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiReasoningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 4,
  },
  aiReasoningText: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reEstimateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  reEstimateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  aiInitialBox: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  aiInitialIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  aiInitialTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  aiInitialSub: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  aiTriggerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: BorderRadius.full,
  },
  aiTriggerCtaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 6,
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  currencyInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
    paddingVertical: 12,
  },
  currencyUnit: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  quickAddLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  quickAddRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  quickAddPill: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  quickAddPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  priceHelpBanner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: Spacing.md,
  },
  priceHelpText: {
    flex: 1,
    fontSize: 11.5,
    color: '#1E40AF',
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalApplyBtnAi: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#D97706',
    borderRadius: BorderRadius.full,
    paddingVertical: 13,
  },
  modalApplyBtnManual: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.full,
    paddingVertical: 13,
  },
  modalApplyText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

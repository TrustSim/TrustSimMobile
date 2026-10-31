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
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { simService } from '../../services/simService';
import { aiValuationService } from '../../services/aiValuationService';
import type { SimOwnershipDto, SimValuationDto } from '../../types';

type SimFilter = 'ALL' | 'VERIFIED' | 'PENDING' | 'NEEDS_OTP';

function getSimStatusMeta(sim: SimOwnershipDto): {
  label: string;
  dotColor: string;
  textColor: string;
  bgColor: string;
  isVerified: boolean;
} {
  if (sim.verificationStatus === 'VERIFIED' || sim.ownershipStatus === 'ACTIVE') {
    return {
      label: 'Chính chủ',
      dotColor: '#10B981',
      textColor: '#059669',
      bgColor: '#ECFDF5',
      isVerified: true,
    };
  }
  if (sim.verificationStatus === 'PENDING_VERIFICATION') {
    return {
      label: 'Đang duyệt',
      dotColor: '#4C5FD5',
      textColor: '#4C5FD5',
      bgColor: '#EEF1FA',
      isVerified: false,
    };
  }
  if (sim.verificationStatus === 'REJECTED' || sim.ownershipStatus === 'REVOKED') {
    return {
      label: 'Từ chối',
      dotColor: '#E11D48',
      textColor: '#E11D48',
      bgColor: '#FFF1F2',
      isVerified: false,
    };
  }
  return {
    label: 'Cần OTP',
    dotColor: '#F59E0B',
    textColor: '#D97706',
    bgColor: '#FFFBEB',
    isVerified: false,
  };
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
        {/* ─── 1. UNIFIED TOP HEADER ─── */}
        <View style={styles.topHeader}>
          <Text style={styles.pageTitle}>Kho SIM sở hữu</Text>

          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => handleOpenOtpFlow()}
              activeOpacity={0.8}
              accessibilityLabel="Đối soát OTP"
            >
              <MaterialCommunityIcons name="shield-key-outline" size={19} color={Colors.navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtnPrimary}
              onPress={handleRegisterNewSim}
              activeOpacity={0.85}
              accessibilityLabel="Khai báo SIM mới"
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. COMPACT STATS ROW (Image 4 Style) ─── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{counts.total}</Text>
            <Text style={styles.statLabel}>Tổng SIM</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#059669' }]}>{counts.verified}</Text>
            <Text style={styles.statLabel}>Chính chủ</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#4C5FD5' }]}>
              {counts.pending + counts.needsOtp}
            </Text>
            <Text style={styles.statLabel}>Chờ xử lý</Text>
          </View>
        </View>

        {/* Compact eKYC Banner if not verified */}
        {!isEkycVerified && (
          <TouchableOpacity
            style={styles.ekycCompactPill}
            onPress={() => router.push('/kyc')}
            activeOpacity={0.85}
          >
            <View style={styles.ekycCompactIcon}>
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={16}
                color="#001743"
              />
            </View>
            <Text style={styles.ekycCompactText} numberOfLines={1}>
              Cần xác thực CCCD trước khi đối soát SIM
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#64748B" />
          </TouchableOpacity>
        )}

        {/* ─── 3. PILL FILTER CHIPS ─── */}
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

        {/* ─── 4. SOFT-CLOUD LUXURY SIM CARDS ─── */}
        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="small" color={Colors.navy} />
            <Text style={styles.emptySub}>Đang tải danh sách SIM...</Text>
          </View>
        ) : filteredSims.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="sim-outline" size={24} color="#001743" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có SIM trong mục này</Text>
            <TouchableOpacity
              style={styles.emptyCtaPill}
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
              const statusMeta = getSimStatusMeta(sim);

              return (
                <View key={sim.id} style={styles.simCardOuter}>
                  {/* Soft Cloud Inner Stage */}
                  <TouchableOpacity
                    style={styles.simStageInner}
                    onPress={() => {
                      if (!statusMeta.isVerified) {
                        handleOpenOtpFlow(sim);
                      } else {
                        handleOpenAiValuation(sim);
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    {/* Top Row: Carrier Pill + Status Pill */}
                    <View style={styles.simStageTopRow}>
                      <View style={styles.carrierPill}>
                        <MaterialCommunityIcons name="sim" size={13} color="#001743" />
                        <Text style={styles.carrierPillText}>
                          {sim.carrierName || 'Nhà mạng VN'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusPill,
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
                            styles.statusPillText,
                            { color: statusMeta.textColor },
                          ]}
                        >
                          {statusMeta.label}
                        </Text>
                      </View>
                    </View>

                    {/* Center Row: Phone Number + Chevron */}
                    <View style={styles.simNumberRow}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={styles.simPhoneText}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {sim.phoneNumber}
                        </Text>
                        {sim.formatRhythmName ? (
                          <Text style={styles.simRhythmText}>{sim.formatRhythmName}</Text>
                        ) : null}
                      </View>
                      <View style={styles.stageArrowCircle}>
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#001743" />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Docked Bottom Bar: Valuation Price + Pill Actions */}
                  <View style={styles.simFooterRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.priceLabel}>Định giá niêm yết</Text>
                      <Text
                        style={styles.priceValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {sim.price > 0
                          ? `${sim.price.toLocaleString('vi-VN')} ₫`
                          : 'Chưa định giá'}
                      </Text>
                    </View>

                    <View style={styles.actionPillsGroup}>
                      <TouchableOpacity
                        style={styles.pillBtnSoft}
                        onPress={() => handleOpenAiValuation(sim)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="creation" size={14} color="#001743" />
                        <Text style={styles.pillBtnSoftText}>AI</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.pillBtnSoft}
                        onPress={() => handleOpenManualPriceEdit(sim)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={14} color="#001743" />
                        <Text style={styles.pillBtnSoftText}>Giá</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={
                          statusMeta.isVerified ? styles.pillBtnVerified : styles.pillBtnPrimary
                        }
                        onPress={() => handleOpenOtpFlow(sim)}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons
                          name={statusMeta.isVerified ? 'check-decagram' : 'shield-key-outline'}
                          size={14}
                          color={statusMeta.isVerified ? '#059669' : '#FFFFFF'}
                        />
                        <Text
                          style={
                            statusMeta.isVerified
                              ? styles.pillBtnVerifiedText
                              : styles.pillBtnPrimaryText
                          }
                        >
                          {statusMeta.isVerified ? 'Chứng thư' : 'OTP'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
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
                  <MaterialCommunityIcons name="sim" size={15} color="#001743" />
                  <Text style={styles.modalSimNumber}>{selectedSim?.phoneNumber}</Text>
                  {selectedSim?.carrierName ? (
                    <Text style={styles.modalSimCarrier}>· {selectedSim.carrierName}</Text>
                  ) : null}
                </View>
                <Text style={styles.modalTitle}>
                  {modalMode === 'AI' ? 'Thẩm định giá AI' : 'Sửa giá niêm yết'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowValuationModal(false)}
              >
                <MaterialCommunityIcons name="close" size={20} color="#001743" />
              </TouchableOpacity>
            </View>

            {/* Segmented Mode Switcher */}
            <View style={styles.modeSwitcherRow}>
              <TouchableOpacity
                style={[styles.modeTab, modalMode === 'AI' && styles.modeTabActive]}
                onPress={() => setModalMode('AI')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="creation"
                  size={15}
                  color={modalMode === 'AI' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[styles.modeTabText, modalMode === 'AI' && styles.modeTabTextActive]}
                >
                  Định giá AI
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, modalMode === 'MANUAL' && styles.modeTabActive]}
                onPress={() => setModalMode('MANUAL')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={15}
                  color={modalMode === 'MANUAL' ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[styles.modeTabText, modalMode === 'MANUAL' && styles.modeTabTextActive]}
                >
                  Sửa giá thủ công
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 380 }}
              contentContainerStyle={styles.modalScrollBody}
              showsVerticalScrollIndicator={false}
            >
              {modalMode === 'AI' ? (
                <View>
                  {loadingAi ? (
                    <View style={styles.aiLoadingBox}>
                      <ActivityIndicator size="large" color="#001743" />
                      <Text style={styles.aiLoadingTitle}>Đang thẩm định giá SIM...</Text>
                      <Text style={styles.aiLoadingSub}>
                        Đối chiếu nhịp số toán học & dữ liệu giao dịch thị trường
                      </Text>
                    </View>
                  ) : aiResult ? (
                    <View style={styles.aiResultContainer}>
                      <View style={styles.aiPriceHeroCard}>
                        <Text style={styles.aiPriceBadgeText}>MỨC GIÁ ĐỀ XUẤT</Text>
                        <Text style={styles.aiPriceHeroValue}>
                          {Math.round(aiResult.suggestedPrice).toLocaleString('vi-VN')} ₫
                        </Text>
                        <Text style={styles.aiPriceHeroHint}>
                          Độ tin cậy {Math.round((aiResult.confidenceScore || 0.85) * 100)}%
                          {aiResult.detectedRhythmName ? ` · ${aiResult.detectedRhythmName}` : ''}
                        </Text>
                      </View>

                      <View style={styles.marketSpreadRow}>
                        <View style={styles.marketSpreadBox}>
                          <Text style={styles.marketSpreadLabel}>Giá thu mua</Text>
                          <Text style={styles.marketSpreadVal}>
                            {Math.round(aiResult.minPrice).toLocaleString('vi-VN')} ₫
                          </Text>
                        </View>
                        <View style={styles.marketSpreadDivider} />
                        <View style={styles.marketSpreadBox}>
                          <Text style={styles.marketSpreadLabel}>Giá bán lẻ</Text>
                          <Text style={styles.marketSpreadVal}>
                            {Math.round(aiResult.maxPrice).toLocaleString('vi-VN')} ₫
                          </Text>
                        </View>
                      </View>

                      {(aiResult.valuationReasoning || aiResult.fengShuiAnalysis) && (
                        <View style={styles.aiReasoningBox}>
                          <Text style={styles.aiReasoningText}>
                            {aiResult.valuationReasoning || aiResult.fengShuiAnalysis}
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.reEstimateBtn}
                        onPress={() => triggerAiEstimate()}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="refresh" size={15} color="#001743" />
                        <Text style={styles.reEstimateBtnText}>Thẩm định lại</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.aiInitialBox}>
                      <Text style={styles.aiInitialTitle}>Chưa có kết quả thẩm định</Text>
                      <TouchableOpacity
                        style={styles.aiTriggerCta}
                        onPress={() => triggerAiEstimate()}
                        activeOpacity={0.85}
                      >
                        <MaterialCommunityIcons name="creation" size={16} color="#FFFFFF" />
                        <Text style={styles.aiTriggerCtaText}>Định giá AI ngay</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <Text style={styles.inputLabel}>Mức giá niêm yết (VNĐ)</Text>
                  <View style={styles.currencyInputRow}>
                    <TextInput
                      style={styles.currencyInput}
                      keyboardType="numeric"
                      value={customPriceFormatted}
                      onChangeText={handlePriceChange}
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.currencyUnit}>₫</Text>
                  </View>

                  <View style={styles.quickAddRow}>
                    {[1000000, 5000000, 10000000, 50000000].map((amt) => (
                      <TouchableOpacity
                        key={amt}
                        style={styles.quickAddPill}
                        onPress={() => handleQuickAdd(amt)}
                      >
                        <Text style={styles.quickAddPillText}>+{amt / 1000000} Tr</Text>
                      </TouchableOpacity>
                    ))}
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
                <Text style={styles.modalCancelText}>Đóng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalApplyBtn,
                  ((modalMode === 'AI' && !aiResult) || submittingPrice) && { opacity: 0.6 },
                ]}
                onPress={modalMode === 'AI' ? handleApplyAiPrice : handleSaveManualPrice}
                disabled={(modalMode === 'AI' && !aiResult) || submittingPrice}
                activeOpacity={0.85}
              >
                {submittingPrice ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    <Text style={styles.modalApplyText}>
                      {modalMode === 'AI' ? 'Áp dụng giá AI' : 'Lưu giá niêm yết'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
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
    backgroundColor: '#F6F7FB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 114,
  },

  // 1. Unified Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#001743',
    letterSpacing: -0.6,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircleBtnPrimary: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#001743',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },

  // 2. Compact Stats Row (Image 4 Style)
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#001743',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Compact eKYC Banner
  ekycCompactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.06)',
  },
  ekycCompactIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ekycCompactText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#001743',
  },

  // 3. Filter Pills
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.06)',
  },
  filterChipActive: {
    backgroundColor: '#001743',
    borderColor: '#001743',
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // 4. SIM Cards (Soft-Cloud Luxury)
  simCardsStack: {
    gap: 14,
  },
  simCardOuter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  simStageInner: {
    backgroundColor: '#EEF1FA',
    borderRadius: 20,
    padding: 14,
  },
  simStageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  carrierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  carrierPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#001743',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  simNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  simPhoneText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#001743',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  simRhythmText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C5FD5',
    marginTop: 2,
  },
  stageArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Docked Footer Row
  simFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 2,
    gap: 8,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#001743',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  actionPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillBtnSoft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F4FB',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  pillBtnSoftText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#001743',
  },
  pillBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#001743',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  pillBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillBtnVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  pillBtnVerifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Empty Card
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#001743',
  },
  emptySub: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
  },
  emptyCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#001743',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    marginTop: 14,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 23, 67, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalSimPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: '#EEF1FA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 6,
  },
  modalSimNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#001743',
    fontVariant: ['tabular-nums'],
  },
  modalSimCarrier: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#001743',
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitcherRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF1FA',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9999,
  },
  modeTabActive: {
    backgroundColor: '#001743',
  },
  modeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  modalScrollBody: {
    paddingBottom: 8,
  },
  aiLoadingBox: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#F6F7FB',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  aiLoadingTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#001743',
    marginTop: 12,
  },
  aiLoadingSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  aiResultContainer: {
    gap: 12,
  },
  aiPriceHeroCard: {
    backgroundColor: '#001743',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
  },
  aiPriceBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  aiPriceHeroValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  aiPriceHeroHint: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  marketSpreadRow: {
    flexDirection: 'row',
    backgroundColor: '#F6F7FB',
    borderRadius: 18,
    padding: 12,
  },
  marketSpreadBox: {
    flex: 1,
    alignItems: 'center',
  },
  marketSpreadDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 23, 67, 0.08)',
  },
  marketSpreadLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  marketSpreadVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#001743',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  aiReasoningBox: {
    backgroundColor: '#F6F7FB',
    borderRadius: 16,
    padding: 12,
  },
  aiReasoningText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  reEstimateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  reEstimateBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#001743',
  },
  aiInitialBox: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#F6F7FB',
    borderRadius: 20,
    gap: 12,
  },
  aiInitialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#001743',
  },
  aiTriggerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#001743',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  aiTriggerCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#001743',
    marginBottom: 8,
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FB',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.1)',
    marginBottom: 12,
  },
  currencyInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#001743',
    paddingVertical: 12,
    fontVariant: ['tabular-nums'],
  },
  currencyUnit: {
    fontSize: 18,
    fontWeight: '800',
    color: '#64748B',
  },
  quickAddRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickAddPill: {
    backgroundColor: '#EEF1FA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  quickAddPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#001743',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#001743',
  },
  modalApplyBtn: {
    flex: 1.6,
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#001743',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  modalApplyText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

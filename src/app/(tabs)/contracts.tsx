import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { contractService } from '../../services/contractService';
import { disputeService } from '../../services/disputeService';
import type { DisputeTicketDto, TradeTransactionDto } from '../../types';

type ActiveSegment = 'handover' | 'disputes';

export default function ContractsAndEvidenceScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<ActiveSegment>('handover');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contracts, setContracts] = useState<TradeTransactionDto[]>([]);
  const [disputes, setDisputes] = useState<DisputeTicketDto[]>([]);

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [contractsRes, disputesRes] = await Promise.allSettled([
        contractService.getMyContracts({ pageIndex: 1, pageSize: 20 }),
        disputeService.getMyDisputes({ pageIndex: 1, pageSize: 20 }),
      ]);

      if (
        contractsRes.status === 'fulfilled' &&
        contractsRes.value.success &&
        contractsRes.value.data?.items
      ) {
        setContracts(contractsRes.value.data.items);
      } else {
        setContracts([]);
      }

      if (
        disputesRes.status === 'fulfilled' &&
        disputesRes.value.success &&
        disputesRes.value.data?.items
      ) {
        setDisputes(disputesRes.value.data.items);
      } else {
        setDisputes([]);
      }
    } catch {
      setContracts([]);
      setDisputes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAllData(false);
    }, [fetchAllData])
  );

  const renderDisputeStatusBadge = (status: string) => {
    const upper = (status || '').toUpperCase();
    if (upper.includes('RESOLVED')) {
      return <VerificationStatusBadge status="verified" label="Đã xử lý" size="sm" />;
    }
    if (upper.includes('REJECTED')) {
      return <VerificationStatusBadge status="rejected" label="Từ chối" size="sm" />;
    }
    return <VerificationStatusBadge status="checking" label="Đang thẩm định" size="sm" />;
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAllData(true)}
            tintColor={Colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSubText}>Hợp đồng số & Bằng chứng thực địa</Text>
            <Text style={styles.pageTitle}>Chuyển Nhượng SIM</Text>
          </View>
          <View style={styles.escrowProtectionPill}>
            <MaterialCommunityIcons name="shield-lock" size={14} color={Colors.blue} />
            <Text style={styles.escrowProtectionText}>Ký quỹ 100%</Text>
          </View>
        </View>

        {/* Pill Segmented Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'handover' && styles.segmentBtnActive]}
            onPress={() => setSegment('handover')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="file-sign"
              size={16}
              color={segment === 'handover' ? '#FFFFFF' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                segment === 'handover' && styles.segmentBtnTextActive,
              ]}
            >
              Hợp đồng & Sang tên ({contracts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'disputes' && styles.segmentBtnActive]}
            onPress={() => setSegment('disputes')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="scale-balance"
              size={16}
              color={segment === 'disputes' ? '#FFFFFF' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentBtnText,
                segment === 'disputes' && styles.segmentBtnTextActive,
              ]}
            >
              Khiếu nại ({disputes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* PHÂN MỤC 1: KÝ HỢP ĐỒNG OTP & CHỤP BẰNG CHỨNG BÀN GIAO */}
        {segment === 'handover' && (
          <View>
            {/* Visual 2-Step Workflow Banner */}
            <View style={styles.workflowHeroCard}>
              <View style={styles.workflowStepRow}>
                <View style={styles.workflowStepPill}>
                  <View style={styles.workflowStepBadge}>
                    <Text style={styles.workflowStepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.workflowStepTitle}>Ký hợp đồng bằng OTP</Text>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={16} color="#94A3B8" />
                <View style={styles.workflowStepPill}>
                  <View style={[styles.workflowStepBadge, { backgroundColor: Colors.gold }]}>
                    <Text style={styles.workflowStepBadgeText}>2</Text>
                  </View>
                  <Text style={styles.workflowStepTitle}>Chụp biên nhận sang tên</Text>
                </View>
              </View>
              <Text style={styles.workflowHeroDesc}>
                Tiền ký quỹ được sàn khóa an toàn. Hai bên hoàn tất ký hợp đồng điện tử bằng mã OTP trước khi mở khóa bước chụp bằng chứng sang tên tại điểm giao dịch.
              </Text>
            </View>

            {loading && contracts.length === 0 ? (
              <View style={styles.emptyPanel}>
                <ActivityIndicator size="small" color={Colors.navy} />
                <Text style={styles.emptyDesc}>Đang tải danh sách hợp đồng...</Text>
              </View>
            ) : contracts.length === 0 ? (
              <View style={styles.emptyPanel}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons
                    name="file-document-check-outline"
                    size={28}
                    color={Colors.blue}
                  />
                </View>
                <Text style={styles.emptyTitle}>Chưa có hợp đồng chuyển nhượng</Text>
                <Text style={styles.emptyDesc}>
                  Các giao dịch mua bán SIM đang trong quá trình ký hợp đồng OTP hoặc chờ chụp biên nhận sang tên sẽ hiển thị tại đây.
                </Text>
              </View>
            ) : (
              <View style={styles.cardsStack}>
                {contracts.map((contract) => {
                  const id = contract.id;
                  const awaitingSign = isTradeAwaitingSignature(contract.status);
                  const isCompleted =
                    contract.status === 'Completed' || contract.status === 'COMPLETED';
                  const primaryRoute = awaitingSign
                    ? `/contract/${id}`
                    : `/handover/${id}`;

                  return (
                    <View key={id} style={styles.contractCard}>
                      <TouchableOpacity
                        onPress={() => router.push(primaryRoute as any)}
                        activeOpacity={0.8}
                      >
                        {/* Top Badge Row */}
                        <View style={styles.cardHeaderRow}>
                          <View style={styles.codeRow}>
                            <Text style={styles.refCode}>
                              #{contract.tradeTransactionCode || id.slice(0, 8)}
                            </Text>
                          </View>
                          <VerificationStatusBadge
                            status={
                              awaitingSign
                                ? 'checking'
                                : isCompleted
                                ? 'verified'
                                : 'pending'
                            }
                            label={
                              awaitingSign
                                ? 'Bước 1: Chờ ký OTP'
                                : isCompleted
                                ? 'Đã hoàn tất'
                                : 'Bước 2: Chờ sang tên'
                            }
                            size="sm"
                          />
                        </View>

                        {/* Middle SIM Plate & Escrow Amount */}
                        <View style={styles.simDealBanner}>
                          <View style={styles.simChipIconBox}>
                            <MaterialCommunityIcons name="sim" size={20} color={Colors.gold} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.simCaption}>Tài sản chuyển nhượng</Text>
                            <Text style={styles.simPhone}>
                              {contract.simPhoneNumber || 'SIM Đấu giá'}
                            </Text>
                          </View>
                          <View style={styles.escrowCol}>
                            <Text style={styles.escrowLabel}>Tiền ký quỹ</Text>
                            <Text
                              style={styles.escrowVal}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.65}
                            >
                              {(contract.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
                            </Text>
                          </View>
                        </View>

                        <ContractTimeline
                          status={contract.status || 'PendingSignature'}
                          compact
                          style={styles.timelineRow}
                        />
                      </TouchableOpacity>

                      {/* Action Buttons */}
                      <View style={styles.actionRow}>
                        {awaitingSign ? (
                          <TouchableOpacity
                            style={[styles.signOtpPrimaryBtn, { flex: 1 }]}
                            onPress={() => router.push(`/contract/${id}`)}
                            activeOpacity={0.88}
                          >
                            <MaterialCommunityIcons
                              name="shield-key-outline"
                              size={17}
                              color="#FFFFFF"
                            />
                            <Text style={styles.primaryBtnText}>
                              Đọc & Ký Hợp Đồng Bằng OTP
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.secondaryBtn}
                              onPress={() => router.push(`/contract/${id}`)}
                              activeOpacity={0.8}
                            >
                              <MaterialCommunityIcons
                                name="file-check-outline"
                                size={16}
                                color={Colors.navy}
                              />
                              <Text style={styles.secondaryBtnText}>Hợp đồng (Đã ký)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.primaryBtn}
                              onPress={() => router.push(`/handover/${id}`)}
                              activeOpacity={0.88}
                            >
                              <MaterialCommunityIcons
                                name="camera-document"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text style={styles.primaryBtnText}>
                                {isCompleted
                                  ? 'Xem biên nhận'
                                  : 'Chụp bằng chứng sang tên'}
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
          </View>
        )}

        {/* PHÂN MỤC 2: THEO DÕI HỒ SƠ KHIẾU NẠI */}
        {segment === 'disputes' && (
          <View>
            <View style={styles.disputeInfoCard}>
              <View style={styles.disputeInfoIcon}>
                <MaterialCommunityIcons
                  name="shield-alert-outline"
                  size={20}
                  color={Colors.crimson}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.disputeInfoTitle}>
                  Khiếu nại gắn trực tiếp với từng giao dịch chuyển nhượng
                </Text>
                <Text style={styles.disputeInfoSub}>
                  Để gửi ảnh bằng chứng sự cố và tạm đóng băng giải ngân ký quỹ, hãy mở giao dịch trong mục &ldquo;Hợp đồng & Sang tên&rdquo; và chọn Báo cáo sự cố.
                </Text>
              </View>
            </View>

            {loading && disputes.length === 0 ? (
              <View style={styles.emptyPanel}>
                <ActivityIndicator size="small" color={Colors.navy} />
                <Text style={styles.emptyDesc}>Đang tải danh sách khiếu nại...</Text>
              </View>
            ) : disputes.length === 0 ? (
              <View style={styles.emptyPanel}>
                <View style={[styles.emptyIconCircle, { backgroundColor: Colors.successLight }]}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={28}
                    color={Colors.success}
                  />
                </View>
                <Text style={styles.emptyTitle}>Không có khiếu nại phát sinh</Text>
                <Text style={styles.emptyDesc}>
                  Tất cả hợp đồng chuyển nhượng của bạn đang diễn ra an toàn. Nếu phát sinh tranh chấp tại điểm giao dịch, hãy vào chi tiết giao dịch đó để gửi bằng chứng.
                </Text>
                <TouchableOpacity
                  style={styles.switchBackBtn}
                  onPress={() => setSegment('handover')}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={16} color={Colors.navy} />
                  <Text style={styles.switchBackBtnText}>
                    Quay lại danh sách Hợp đồng & Sang tên
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cardsStack}>
                {disputes.map((dsp) => {
                  const dateStr = dsp.createdDate
                    ? new Date(dsp.createdDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '';
                  return (
                    <View key={dsp.id} style={styles.contractCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.refCode}>
                          KHIẾU NẠI #{dsp.id.slice(0, 8).toUpperCase()}
                        </Text>
                        {renderDisputeStatusBadge(dsp.status)}
                      </View>

                      <Text style={styles.disputeReasonText}>{dsp.reason}</Text>
                      {dateStr ? (
                        <Text style={styles.disputeDateText}>Ngày gửi hồ sơ: {dateStr}</Text>
                      ) : null}

                      {dsp.adminResolutionNotes ? (
                        <View style={styles.resolutionBox}>
                          <Text style={styles.resolutionLabel}>Kết luận từ Ban thẩm định:</Text>
                          <Text style={styles.resolutionText}>{dsp.adminResolutionNotes}</Text>
                        </View>
                      ) : null}

                      {dsp.tradeTransactionId ? (
                        <View style={styles.disputeActionRow}>
                          <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => router.push(`/handover/${dsp.tradeTransactionId}`)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons
                              name="file-eye-outline"
                              size={15}
                              color={Colors.navy}
                            />
                            <Text style={styles.secondaryBtnText}>Tiến trình sang tên</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={() => router.push(`/dispute/${dsp.tradeTransactionId}`)}
                            activeOpacity={0.85}
                          >
                            <MaterialCommunityIcons
                              name="camera-plus-outline"
                              size={15}
                              color="#FFFFFF"
                            />
                            <Text style={styles.primaryBtnText}>Bổ sung bằng chứng</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
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
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerSubText: {
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
  escrowProtectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.blueSoft,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  escrowProtectionText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.blue,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  segmentBtnActive: {
    backgroundColor: Colors.navy,
  },
  segmentBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  workflowHeroCard: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  workflowStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  workflowStepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  workflowStepBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowStepBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  workflowStepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  workflowHeroDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  emptyPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  cardsStack: {
    gap: Spacing.md,
  },
  contractCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refCode: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
  },
  simDealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  simChipIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.goldSoft,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simCaption: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  simPhone: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.3,
  },
  escrowCol: {
    alignItems: 'flex-end',
  },
  escrowLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  escrowVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.blue,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  timelineRow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  signOtpPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
  },
  secondaryBtn: {
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
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.navy,
  },
  primaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.sm,
    minHeight: 42,
    paddingHorizontal: Spacing.sm,
  },
  primaryBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disputeInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.crimsonSoft,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  disputeInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disputeInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9F1239',
  },
  disputeInfoSub: {
    fontSize: 12,
    color: '#BE123C',
    lineHeight: 17,
    marginTop: 2,
  },
  switchBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: Spacing.md,
  },
  switchBackBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.navy,
  },
  disputeReasonText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    lineHeight: 21,
  },
  disputeDateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resolutionBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  resolutionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.navy,
  },
  resolutionText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  disputeActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});

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
import { Colors } from '../../constants/theme';
import {
  ContractTimeline,
  isTradeAwaitingSignature,
} from '../../components/trust/ContractTimeline';
import { contractService } from '../../services/contractService';
import { disputeService } from '../../services/disputeService';
import type { DisputeTicketDto, TradeTransactionDto } from '../../types';

type ActiveSegment = 'handover' | 'disputes';

function getDisputeStatusMeta(status?: string) {
  const upper = (status || '').toUpperCase();
  if (upper.includes('RESOLVED')) {
    return { label: 'Đã xử lý', dot: '#10B981', text: '#059669', bg: '#ECFDF5' };
  }
  if (upper.includes('REJECTED')) {
    return { label: 'Từ chối', dot: '#E11D48', text: '#E11D48', bg: '#FFF1F2' };
  }
  return { label: 'Đang thẩm định', dot: '#4C5FD5', text: '#4C5FD5', bg: '#EEF1FA' };
}

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
        {/* ─── 1. UNIFIED TOP HEADER ─── */}
        <View style={styles.topHeader}>
          <Text style={styles.pageTitle}>Hợp đồng & Bàn giao</Text>

          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => fetchAllData(true)}
              activeOpacity={0.8}
              accessibilityLabel="Làm mới"
            >
              <MaterialCommunityIcons name="refresh" size={19} color={Colors.navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.8}
              accessibilityLabel="Thông báo"
            >
              <MaterialCommunityIcons name="bell-outline" size={19} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. PILL SEGMENTED CONTROL ─── */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'handover' && styles.segmentBtnActive]}
            onPress={() => setSegment('handover')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="file-sign"
              size={15}
              color={segment === 'handover' ? '#FFFFFF' : '#64748B'}
            />
            <Text
              style={[
                styles.segmentBtnText,
                segment === 'handover' && styles.segmentBtnTextActive,
              ]}
            >
              Hợp đồng ({contracts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'disputes' && styles.segmentBtnActive]}
            onPress={() => setSegment('disputes')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="scale-balance"
              size={15}
              color={segment === 'disputes' ? '#FFFFFF' : '#64748B'}
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

        {/* ─── PHÂN MỤC 1: HỢP ĐỒNG & SANG TÊN ─── */}
        {segment === 'handover' && (
          <View>
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
                    size={24}
                    color="#001743"
                  />
                </View>
                <Text style={styles.emptyTitle}>Chưa có hợp đồng chuyển nhượng</Text>
                <Text style={styles.emptyDesc}>
                  Các giao dịch mua bán SIM đang ký OTP hoặc chờ sang tên sẽ hiển thị tại đây.
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

                  const statusDot = awaitingSign
                    ? '#F59E0B'
                    : isCompleted
                    ? '#10B981'
                    : '#4C5FD5';
                  const statusBg = awaitingSign
                    ? '#FFFBEB'
                    : isCompleted
                    ? '#ECFDF5'
                    : '#EEF1FA';
                  const statusColor = awaitingSign
                    ? '#D97706'
                    : isCompleted
                    ? '#059669'
                    : '#4C5FD5';
                  const statusLabel = awaitingSign
                    ? 'Chờ ký OTP'
                    : isCompleted
                    ? 'Hoàn tất'
                    : 'Chờ sang tên';

                  return (
                    <View key={id} style={styles.contractCard}>
                      <TouchableOpacity
                        onPress={() => router.push(primaryRoute as any)}
                        activeOpacity={0.85}
                      >
                        {/* Top Header Row */}
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.refCode}>
                            #{contract.tradeTransactionCode || id.slice(0, 8)}
                          </Text>
                          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                            <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
                            <Text style={[styles.statusPillText, { color: statusColor }]}>
                              {statusLabel}
                            </Text>
                          </View>
                        </View>

                        {/* Soft Cloud SIM & Escrow Stage */}
                        <View style={styles.simDealStage}>
                          <View style={styles.simIconSquircle}>
                            <MaterialCommunityIcons name="sim" size={20} color="#001743" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.simCaption}>Số thuê bao</Text>
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
                            style={[styles.primaryPillBtn, { flex: 1 }]}
                            onPress={() => router.push(`/contract/${id}`)}
                            activeOpacity={0.88}
                          >
                            <MaterialCommunityIcons
                              name="shield-key-outline"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.primaryPillBtnText}>Ký hợp đồng bằng OTP</Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.secondaryPillBtn}
                              onPress={() => router.push(`/contract/${id}`)}
                              activeOpacity={0.8}
                            >
                              <MaterialCommunityIcons
                                name="file-check-outline"
                                size={15}
                                color="#001743"
                              />
                              <Text style={styles.secondaryPillBtnText}>Hợp đồng</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.primaryPillBtn}
                              onPress={() => router.push(`/handover/${id}`)}
                              activeOpacity={0.88}
                            >
                              <MaterialCommunityIcons
                                name="camera-document"
                                size={15}
                                color="#FFFFFF"
                              />
                              <Text style={styles.primaryPillBtnText}>
                                {isCompleted ? 'Xem biên nhận' : 'Cập nhật sang tên'}
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

        {/* ─── PHÂN MỤC 2: KHIẾU NẠI ─── */}
        {segment === 'disputes' && (
          <View>
            {loading && disputes.length === 0 ? (
              <View style={styles.emptyPanel}>
                <ActivityIndicator size="small" color={Colors.navy} />
                <Text style={styles.emptyDesc}>Đang tải danh sách khiếu nại...</Text>
              </View>
            ) : disputes.length === 0 ? (
              <View style={styles.emptyPanel}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={24}
                    color="#001743"
                  />
                </View>
                <Text style={styles.emptyTitle}>Không có khiếu nại phát sinh</Text>
                <Text style={styles.emptyDesc}>
                  Tất cả hợp đồng chuyển nhượng của bạn đang diễn ra an toàn.
                </Text>
                <TouchableOpacity
                  style={styles.switchBackPill}
                  onPress={() => setSegment('handover')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.switchBackPillText}>Xem danh sách hợp đồng</Text>
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
                  const meta = getDisputeStatusMeta(dsp.status);

                  return (
                    <View key={dsp.id} style={styles.contractCard}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.refCode}>
                          #{dsp.id.slice(0, 8).toUpperCase()}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
                          <View style={[styles.statusDot, { backgroundColor: meta.dot }]} />
                          <Text style={[styles.statusPillText, { color: meta.text }]}>
                            {meta.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.disputeReasonText}>{dsp.reason}</Text>
                      {dateStr ? (
                        <Text style={styles.disputeDateText}>Ngày gửi: {dateStr}</Text>
                      ) : null}

                      {dsp.adminResolutionNotes ? (
                        <View style={styles.resolutionBox}>
                          <Text style={styles.resolutionLabel}>Kết luận thẩm định:</Text>
                          <Text style={styles.resolutionText}>{dsp.adminResolutionNotes}</Text>
                        </View>
                      ) : null}

                      {dsp.tradeTransactionId ? (
                        <View style={[styles.actionRow, { marginTop: 14 }]}>
                          <TouchableOpacity
                            style={styles.secondaryPillBtn}
                            onPress={() => router.push(`/handover/${dsp.tradeTransactionId}`)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons
                              name="file-eye-outline"
                              size={15}
                              color="#001743"
                            />
                            <Text style={styles.secondaryPillBtnText}>Tiến trình</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.primaryPillBtn}
                            onPress={() => router.push(`/dispute/${dsp.tradeTransactionId}`)}
                            activeOpacity={0.85}
                          >
                            <MaterialCommunityIcons
                              name="camera-plus-outline"
                              size={15}
                              color="#FFFFFF"
                            />
                            <Text style={styles.primaryPillBtnText}>Bổ sung bằng chứng</Text>
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
    backgroundColor: '#F6F7FB',
  },
  scroll: {
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

  // 2. Pill Segmented Control
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF1FA',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  segmentBtnActive: {
    backgroundColor: '#001743',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Empty State
  emptyPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
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
  emptyDesc: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  switchBackPill: {
    backgroundColor: '#F1F4FB',
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 14,
  },
  switchBackPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#001743',
  },

  // Contract & Dispute Cards
  cardsStack: {
    gap: 14,
  },
  contractCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  refCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
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
  simDealStage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EEF1FA',
    borderRadius: 18,
    padding: 13,
  },
  simIconSquircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  simPhone: {
    fontSize: 18,
    fontWeight: '800',
    color: '#001743',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.2,
    marginTop: 1,
  },
  escrowCol: {
    alignItems: 'flex-end',
  },
  escrowLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  escrowVal: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#001743',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  timelineRow: {
    marginTop: 12,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F4FB',
    borderRadius: 9999,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  secondaryPillBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#001743',
  },
  primaryPillBtn: {
    flex: 1.35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#001743',
    borderRadius: 9999,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  primaryPillBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disputeReasonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#001743',
    lineHeight: 21,
  },
  disputeDateText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  resolutionBox: {
    backgroundColor: '#EEF1FA',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
  },
  resolutionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#001743',
  },
  resolutionText: {
    fontSize: 12.5,
    color: '#334155',
    marginTop: 3,
    lineHeight: 18,
  },
});

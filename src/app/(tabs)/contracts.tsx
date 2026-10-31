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
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { ContractTimeline } from '../../components/trust/ContractTimeline';
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
            <Text style={styles.headerCaption}>HỢP ĐỒNG & BẰNG CHỨNG THỰC ĐỊA</Text>
            <Text style={styles.pageTitle}>Quá Trình Chuyển Nhượng</Text>
          </View>
        </View>

        {/* Segmented Control: Quá trình chuyển nhượng vs Hồ sơ khiếu nại */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'handover' && styles.segmentBtnActive]}
            onPress={() => setSegment('handover')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                segment === 'handover' && styles.segmentBtnTextActive,
              ]}
            >
              Chuyển nhượng ({contracts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, segment === 'disputes' && styles.segmentBtnActive]}
            onPress={() => setSegment('disputes')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentBtnText,
                segment === 'disputes' && styles.segmentBtnTextActive,
              ]}
            >
              Hồ sơ khiếu nại ({disputes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* PHÂN MỤC 1: CHUYỂN NHƯỢNG & CHỤP BẰNG CHỨNG BÀN GIAO */}
        {segment === 'handover' && (
          <View>
            {/* Hướng dẫn quy trình chuyển nhượng & các bước con */}
            <View style={styles.actionBanner}>
              <View style={styles.actionBannerLeft}>
                <Text style={styles.actionBannerTitle}>
                  Quy trình bàn giao SIM & xử lý sự cố theo từng giao dịch
                </Text>
                <Text style={styles.actionBannerSub}>
                  Chọn giao dịch bên dưới để thực hiện các bước: (1) Ký hợp đồng, (2) Chụp biên nhận sang tên tại nhà mạng, hoặc (3) Chụp bằng chứng khiếu nại nếu phát sinh sự cố trong quá trình chuyển nhượng.
                </Text>
              </View>
            </View>

            {loading && contracts.length === 0 ? (
              <View style={styles.emptyPanel}>
                <ActivityIndicator size="small" color={Colors.navy} />
                <Text style={styles.emptyDesc}>Đang tải danh sách hợp đồng...</Text>
              </View>
            ) : contracts.length === 0 ? (
              <View style={styles.emptyPanel}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={34}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyTitle}>Chưa có hợp đồng chuyển nhượng</Text>
                <Text style={styles.emptyDesc}>
                  Các giao dịch mua bán SIM đang trong quá trình ký hợp đồng hoặc chờ chụp biên nhận sang tên sẽ hiển thị tại đây.
                </Text>
              </View>
            ) : (
              <View style={styles.listPanel}>
                {contracts.map((contract, idx) => {
                  const id = contract.id;
                  return (
                    <View
                      key={id}
                      style={[styles.itemBlock, idx > 0 && styles.itemDivider]}
                    >
                      <TouchableOpacity
                        onPress={() => router.push(`/handover/${id}`)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.itemTopRow}>
                          <View>
                            <Text style={styles.refCode}>
                              #{contract.tradeTransactionCode || id.slice(0, 8)}
                            </Text>
                            <Text style={styles.simPhone}>
                              {contract.simPhoneNumber || 'SIM Chuyển nhượng'}
                            </Text>
                          </View>
                          <View style={styles.amountCol}>
                            <Text style={styles.amountVal}>
                              {(contract.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
                            </Text>
                            <Text style={styles.amountSub}>Tiền ký quỹ</Text>
                          </View>
                        </View>

                        <ContractTimeline
                          status={contract.status || 'PendingEscrow'}
                          compact
                          style={styles.timelineRow}
                        />
                      </TouchableOpacity>

                      {/* Thanh công cụ của giao dịch: Hợp đồng | Tiến trình chuyển nhượng (gồm Chụp biên nhận & Khiếu nại) */}
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.secondaryBtn}
                          onPress={() => router.push(`/contract/${id}`)}
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons
                            name="file-document-outline"
                            size={15}
                            color={Colors.navy}
                          />
                          <Text style={styles.secondaryBtnText}>Hợp đồng</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.primaryBtn}
                          onPress={() => router.push(`/handover/${id}`)}
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons
                            name="camera-document"
                            size={15}
                            color="#fff"
                          />
                          <Text style={styles.primaryBtnText}>
                            Tiến trình & Bằng chứng sang tên
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* PHÂN MỤC 2: THEO DÕI HỒ SƠ KHIẾU NẠI CỦA CÁC GIAO DỊCH CHUYỂN NHƯỢNG */}
        {segment === 'disputes' && (
          <View>
            <View style={styles.actionBanner}>
              <View style={styles.actionBannerLeft}>
                <Text style={styles.actionBannerTitle}>
                  Khiếu nại được tạo trực tiếp từ giao dịch đang chuyển nhượng
                </Text>
                <Text style={styles.actionBannerSub}>
                  Để gửi bằng chứng khiếu nại và khóa giải ngân ký quỹ, vui lòng mở chi tiết giao dịch trong mục &ldquo;Chuyển nhượng&rdquo; và chọn bước Báo cáo sự cố.
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
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={34}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyTitle}>Không có khiếu nại phát sinh</Text>
                <Text style={styles.emptyDesc}>
                  Các giao dịch chuyển nhượng của bạn hiện đang diễn ra bình thường. Nếu gặp sự cố sang tên ở bất kỳ giao dịch nào, hãy vào tiến trình chuyển nhượng của giao dịch đó để chụp bằng chứng khiếu nại.
                </Text>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { marginTop: Spacing.md, alignSelf: 'stretch' }]}
                  onPress={() => setSegment('handover')}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="swap-horizontal" size={16} color={Colors.navy} />
                  <Text style={styles.secondaryBtnText}>
                    Xem danh sách giao dịch chuyển nhượng
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.listPanel}>
                {disputes.map((dsp, i) => {
                  const dateStr = dsp.createdDate
                    ? new Date(dsp.createdDate).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                    : '';
                  return (
                    <View
                      key={dsp.id}
                      style={[styles.itemBlock, i > 0 && styles.itemDivider]}
                    >
                      <View style={styles.itemTopRow}>
                        <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                          <Text style={styles.refCode}>
                            MÃ KHIẾU NẠI: #{dsp.id.slice(0, 8).toUpperCase()}
                          </Text>
                          <Text style={styles.disputeReasonText}>{dsp.reason}</Text>
                          {dateStr ? (
                            <Text style={styles.disputeDateText}>Ngày gửi: {dateStr}</Text>
                          ) : null}
                        </View>
                        {renderDisputeStatusBadge(dsp.status)}
                      </View>

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
                            activeOpacity={0.75}
                          >
                            <MaterialCommunityIcons
                              name="file-eye-outline"
                              size={15}
                              color={Colors.navy}
                            />
                            <Text style={styles.secondaryBtnText}>
                              Xem tiến trình chuyển nhượng
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={() => router.push(`/dispute/${dsp.tradeTransactionId}`)}
                            activeOpacity={0.75}
                          >
                            <MaterialCommunityIcons
                              name="camera-plus-outline"
                              size={15}
                              color={Colors.navy}
                            />
                            <Text style={styles.secondaryBtnText}>
                              Bổ sung ảnh bằng chứng
                            </Text>
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
  },
  quickDisputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 38,
  },
  quickDisputeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.danger,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: Colors.surface,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: Colors.navy,
    fontWeight: '800',
  },
  actionBanner: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.navy,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  actionBannerLeft: {
    flex: 1,
  },
  actionBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  actionBannerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  emptyPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  listPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  itemBlock: {
    padding: Spacing.md,
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  simPhone: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  amountSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  timelineRow: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.xs,
    minHeight: 38,
    paddingHorizontal: Spacing.sm,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  primaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.xs,
    minHeight: 38,
    paddingHorizontal: Spacing.sm,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  dangerOutlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    minHeight: 38,
  },
  dangerOutlineBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.danger,
  },
  newDisputeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.sm,
    minHeight: 48,
    marginBottom: Spacing.md,
  },
  newDisputeCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  disputeReasonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 4,
    lineHeight: 19,
  },
  disputeDateText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  resolutionBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.xs,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  resolutionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.navy,
  },
  resolutionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  disputeActionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
});

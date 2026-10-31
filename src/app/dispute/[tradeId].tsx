import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { EvidenceCard } from '../../components/trust/EvidenceCard';
import type { EvidenceItem } from '../../components/trust/EvidenceCard';
import { ReceiptScreen } from '../../components/trust/ReceiptScreen';
import type { ReceiptData } from '../../components/trust/ReceiptScreen';
import { SecureReviewSheet } from '../../components/trust/SecureReviewSheet';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { contractService } from '../../services/contractService';
import { disputeService } from '../../services/disputeService';
import { transferService } from '../../services/transferService';
import type { TradeTransactionDto } from '../../types';

const DISPUTE_REASONS = [
  'SIM không đúng thông tin hoặc cam kết ban đầu',
  'Bên bán chậm trễ làm thủ tục sang tên tại nhà mạng',
  'Điểm giao dịch từ chối sang tên do nợ cước / vướng cam kết',
  'SIM không có sóng hoặc không kích hoạt được chính chủ',
];

const EVIDENCE_TYPES = [
  { id: 'tttb', label: 'Ảnh chụp tin nhắn TTTB gửi 1414' },
  { id: 'telco_doc', label: 'Phiếu xác nhận / từ chối tại quầy nhà mạng' },
  { id: 'sim_card', label: 'Ảnh chụp phôi SIM & mã seri thực tế' },
];

export default function DisputeEvidenceScreen() {
  const router = useRouter();
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();

  const validTradeId = tradeId && tradeId !== 'new' ? tradeId : '';
  const [activeTrade, setActiveTrade] = useState<TradeTransactionDto | null>(null);
  const [loadingTrade, setLoadingTrade] = useState<boolean>(true);

  const [selectedReason, setSelectedReason] = useState<string>(DISPUTE_REASONS[0]);
  const [customNote, setCustomNote] = useState<string>('');
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<string>(EVIDENCE_TYPES[0].label);

  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [showReviewSheet, setShowReviewSheet] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const fetchTradeContext = useCallback(async () => {
    if (!validTradeId) {
      setLoadingTrade(false);
      setActiveTrade(null);
      return;
    }
    setLoadingTrade(true);
    try {
      const [progressRes, contractsRes] = await Promise.allSettled([
        transferService.getProgress(validTradeId),
        contractService.getMyContracts({ pageIndex: 1, pageSize: 20 }),
      ]);

      if (
        progressRes.status === 'fulfilled' &&
        progressRes.value.success &&
        progressRes.value.data
      ) {
        const p = progressRes.value.data;
        setActiveTrade({
          id: p.tradeId || validTradeId,
          tradeTransactionCode: p.tradeTransactionCode || validTradeId.slice(0, 8).toUpperCase(),
          simPhoneNumber: p.simPhoneNumber,
          escrowAmount: p.escrowAmount ?? 0,
          status: (p.simTransferStatus as any) || 'PendingTransfer',
        });
        return;
      }

      if (
        contractsRes.status === 'fulfilled' &&
        contractsRes.value.success &&
        contractsRes.value.data?.items
      ) {
        const found = contractsRes.value.data.items.find((t) => t.id === validTradeId);
        if (found) {
          setActiveTrade(found);
          return;
        }
      }
    } catch {
      // Ignore error
    } finally {
      setLoadingTrade(false);
    }
  }, [validTradeId]);

  useEffect(() => {
    fetchTradeContext();
  }, [fetchTradeContext]);

  const handleCaptureEvidence = () => {
    setShowCameraModal(false);
    const newItem: EvidenceItem = {
      id: 'ev_' + Date.now(),
      thumbnailUri:
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=400&q=80',
      timestamp: new Date().toISOString(),
      evidenceType: selectedEvidenceType,
      contractCode: activeTrade?.tradeTransactionCode || validTradeId.slice(0, 8).toUpperCase(),
      status: 'pending',
    };
    setEvidenceList((prev) => [newItem, ...prev]);
  };

  const handleOpenReview = () => {
    if (!validTradeId) {
      Alert.alert(
        'Chưa chọn giao dịch chuyển nhượng',
        'Vui lòng quay lại danh sách giao dịch chuyển nhượng và chọn giao dịch cần báo cáo sự cố.'
      );
      return;
    }
    if (evidenceList.length === 0) {
      Alert.alert(
        'Yêu cầu ảnh bằng chứng',
        'Vui lòng chụp ít nhất 01 hình ảnh bằng chứng thực tế để hệ thống đóng băng khoản tiền ký quỹ và bảo vệ quyền lợi của bạn.'
      );
      return;
    }
    setShowReviewSheet(true);
  };

  const handleSubmitDispute = async () => {
    setSubmitting(true);
    const targetTradeId = validTradeId;
    const fullReason = customNote.trim()
      ? `${selectedReason} — Chi tiết: ${customNote.trim()} (Đính kèm ${evidenceList.length} ảnh bằng chứng)`
      : `${selectedReason} (Đính kèm ${evidenceList.length} ảnh bằng chứng)`;

    try {
      // Upload proof images to trade transfer proof log
      for (const ev of evidenceList) {
        if (ev.thumbnailUri && targetTradeId) {
          await transferService
            .submitProof(targetTradeId, ev.thumbnailUri, `[BẰNG CHỨNG KHIẾU NẠI] ${ev.evidenceType}`)
            .catch(() => { });
        }
      }

      const res = await disputeService.createDispute({
        tradeTransactionId: targetTradeId,
        reason: fullReason,
      });

      setShowReviewSheet(false);

      const refCode =
        res.data?.id?.slice(0, 8).toUpperCase() ||
        'DSP-' + Math.floor(100000 + Math.random() * 900000);

      setReceiptData({
        type: 'pending',
        title: 'Đã Tiếp Nhận Hồ Sơ Khiếu Nại',
        description:
          'Khoản tiền ký quỹ của giao dịch chuyển nhượng này đã được tạm khóa giải ngân. Bộ phận thẩm định của sàn đang kiểm tra bằng chứng hình ảnh bạn cung cấp.',
        details: [
          {
            label: 'Giao dịch chuyển nhượng',
            value: activeTrade?.tradeTransactionCode || `#${targetTradeId.slice(0, 8)}`,
          },
          { label: 'Số thuê bao', value: activeTrade?.simPhoneNumber || 'Theo hồ sơ chuyển nhượng' },
          { label: 'Lý do khiếu nại', value: selectedReason },
          { label: 'Số bằng chứng đính kèm', value: `${evidenceList.length} hình ảnh xác thực` },
          { label: 'Trạng thái tiền ký quỹ', value: 'Đã phong tỏa bảo vệ' },
        ],
        referenceId: `DSP-${refCode}`,
        timestamp: new Date().toISOString(),
        nextSteps: [
          'Tiền ký quỹ sẽ được giữ nguyên trên sàn cho đến khi có kết luận đối soát.',
          'Kết quả xử lý khiếu nại sẽ được cập nhật trực tiếp tại mục Quá trình chuyển nhượng trong vòng 24 giờ làm việc.',
        ],
      });
    } catch {
      setShowReviewSheet(false);
      setReceiptData({
        type: 'pending',
        title: 'Đã Ghi Nhận Bằng Chứng Khiếu Nại',
        description:
          'Hình ảnh bằng chứng và nội dung khiếu nại đã được ghi nhận kèm dấu thời gian thực cho giao dịch chuyển nhượng này. Khoản tiền ký quỹ được bảo vệ trong suốt quá trình thẩm định.',
        details: [
          {
            label: 'Giao dịch chuyển nhượng',
            value: activeTrade?.tradeTransactionCode || `#${targetTradeId.slice(0, 8)}`,
          },
          { label: 'Lý do khiếu nại', value: selectedReason },
          { label: 'Số bằng chứng đính kèm', value: `${evidenceList.length} hình ảnh xác thực` },
          { label: 'Trạng thái tiền ký quỹ', value: 'Tạm khóa giải ngân' },
        ],
        referenceId: 'DSP-' + Math.floor(100000 + Math.random() * 900000),
        timestamp: new Date().toISOString(),
        nextSteps: [
          'Ban quản trị sàn sẽ đối chiếu hình ảnh bằng chứng với lịch sử nhà mạng.',
          'Bạn có thể theo dõi tiến độ xử lý tại phân mục Hồ sơ khiếu nại.',
        ],
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (receiptData) {
    return (
      <ReceiptScreen
        data={receiptData}
        onDone={() => router.replace(`/handover/${validTradeId || ''}` as any)}
        doneLabel="Quay Lại Tiến Trình Chuyển Nhượng"
      />
    );
  }

  if (!validTradeId) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Báo Cáo Sự Cố Chuyển Nhượng" showBack onBack={() => router.back()} />
        <View style={styles.emptyContextBox}>
          <MaterialCommunityIcons name="swap-horizontal-circle-outline" size={48} color={Colors.navy} />
          <Text style={styles.emptyContextTitle}>
            Khiếu nại là một bước trong quá trình chuyển nhượng
          </Text>
          <Text style={styles.emptyContextDesc}>
            Bạn không cần phải nhập mã giao dịch thủ công. Vui lòng chọn giao dịch SIM đang chuyển nhượng gặp sự cố để hệ thống tự động liên kết hồ sơ và khóa giải ngân khoản tiền ký quỹ tương ứng.
          </Text>
          <TouchableOpacity
            style={styles.goToTransfersBtn}
            onPress={() => router.replace('/(tabs)/contracts')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="camera-document" size={18} color="#fff" />
            <Text style={styles.goToTransfersBtnText}>Chọn Giao Dịch Chuyển Nhượng</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Chụp Bằng Chứng Khiếu Nại" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Breadcrumb chỉ dẫn bước con trong quá trình chuyển nhượng */}
        <View style={styles.subStepBanner}>
          <View style={styles.subStepBadgeRow}>
            <MaterialCommunityIcons name="source-branch" size={15} color={Colors.danger} />
            <Text style={styles.subStepBadgeText}>
              QUÁ TRÌNH CHUYỂN NHƯỢNG › BƯỚC XỬ LÝ SỰ CỐ & KHIẾU NẠI
            </Text>
          </View>
          <Text style={styles.subStepBannerDesc}>
            Khi gửi ảnh bằng chứng sự cố ở bước này, hệ thống sẽ ngay lập tức{' '}
            <Text style={styles.noticeTextBold}>tạm dừng giải ngân tiền ký quỹ</Text> của giao dịch chuyển nhượng bên dưới.
          </Text>
        </View>

        {/* Thông tin giao dịch chuyển nhượng (Tự động gắn kết, không cần nhập mã) */}
        <Text style={styles.sectionLabel}>GIAO DỊCH CHUYỂN NHƯỢNG ĐANG KHIẾU NẠI</Text>
        <View style={styles.panel}>
          {loadingTrade ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.blue} />
              <Text style={styles.loadingText}>Đang đồng bộ thông tin giao dịch chuyển nhượng...</Text>
            </View>
          ) : (
            <View style={styles.lockedTradeCard}>
              <View style={styles.lockedTradeTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockedTradeCode}>
                    MÃ GIAO DỊCH: #{activeTrade?.tradeTransactionCode || validTradeId.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={styles.tradePhone}>
                    {activeTrade?.simPhoneNumber || 'SIM Đang Chuyển Nhượng'}
                  </Text>
                </View>
                <View style={styles.lockedEscrowCol}>
                  <Text style={styles.lockedEscrowVal}>
                    {(activeTrade?.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
                  </Text>
                  <Text style={styles.lockedEscrowCap}>Ký quỹ đang giữ</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.backToHandoverLink}
                onPress={() => router.back()}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="arrow-left" size={14} color={Colors.blue} />
                <Text style={styles.backToHandoverText}>
                  Quay lại bước chụp biên nhận sang tên
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 1. Chọn nguyên nhân sự cố */}
        <Text style={styles.sectionLabel}>1. NGUYÊN NHÂN SỰ CỐ KHI SANG TÊN</Text>
        <View style={styles.panel}>
          {DISPUTE_REASONS.map((reason, idx) => {
            const isSelected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                style={[styles.selectRow, idx > 0 && styles.rowBorder]}
                onPress={() => setSelectedReason(reason)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={isSelected ? Colors.blue : Colors.textMuted}
                />
                <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={[styles.noteInputBox, styles.rowBorder]}>
            <Text style={styles.noteInputLabel}>Mô tả chi tiết sự việc (tùy chọn)</Text>
            <TextInput
              style={styles.noteInput}
              value={customNote}
              onChangeText={setCustomNote}
              placeholder="Ghi rõ tình trạng thực tế tại điểm giao dịch hoặc tình trạng SIM..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* 2. Chụp bằng chứng thực tế */}
        <Text style={styles.sectionLabel}>2. CHỤP ẢNH BẰNG CHỨNG XÁC THỰC</Text>
        <View style={styles.panel}>
          <View style={styles.panelHeaderPad}>
            <Text style={styles.panelSubhead}>Chọn loại tài liệu cần chụp:</Text>
            <View style={styles.typeChipsCol}>
              {EVIDENCE_TYPES.map((t) => {
                const active = selectedEvidenceType === t.label;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => setSelectedEvidenceType(t.label)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name={active ? 'check-circle' : 'circle-outline'}
                      size={16}
                      color={active ? Colors.blue : Colors.textMuted}
                    />
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => setShowCameraModal(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Mở máy ảnh chụp bằng chứng khiếu nại"
            >
              <MaterialCommunityIcons name="camera-outline" size={20} color="#fff" />
              <Text style={styles.cameraBtnText}>Mở Máy Ảnh Chụp Bằng Chứng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Danh sách ảnh bằng chứng đã chụp */}
        {evidenceList.length > 0 && (
          <View style={{ marginBottom: Spacing.lg }}>
            <Text style={styles.sectionLabel}>
              BẰNG CHỨNG ĐÍNH KÈM ({evidenceList.length})
            </Text>
            {evidenceList.map((item) => (
              <EvidenceCard
                key={item.id}
                evidence={item}
                onRetake={() => setShowCameraModal(true)}
              />
            ))}
          </View>
        )}

        {/* Nút gửi yêu cầu khiếu nại */}
        <TouchableOpacity
          style={[styles.submitDisputeBtn, evidenceList.length === 0 && styles.submitDisputeBtnMuted]}
          onPress={handleOpenReview}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Rà soát và gửi hồ sơ khiếu nại"
        >
          <MaterialCommunityIcons name="shield-alert-outline" size={20} color="#fff" />
          <Text style={styles.submitDisputeBtnText}>
            Gửi Hồ Sơ Khiếu Nại & Khóa Giải Ngân
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Camera Framing Modal */}
      <Modal visible={showCameraModal} animationType="slide" transparent>
        <View style={styles.cameraBackdrop}>
          <View style={styles.cameraTopBar}>
            <TouchableOpacity
              onPress={() => setShowCameraModal(false)}
              style={styles.cameraCloseBtn}
            >
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTopTitle}>Chụp Bằng Chứng Khiếu Nại</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.cameraFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            <MaterialCommunityIcons name="camera-enhance-outline" size={44} color="rgba(255,255,255,0.75)" />
            <Text style={styles.cameraFrameTitle}>{selectedEvidenceType}</Text>
            <Text style={styles.cameraFrameSub}>
              Đặt văn bản, phôi SIM hoặc màn hình kết quả tra cứu vào chính giữa khung ngắm. Đảm bảo chữ và số hiển thị sắc nét.
            </Text>
          </View>

          <View style={styles.cameraBottomBar}>
            <TouchableOpacity
              style={styles.shutterOuter}
              onPress={handleCaptureEvidence}
              activeOpacity={0.75}
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Secure Review Sheet */}
      <SecureReviewSheet
        visible={showReviewSheet}
        title="Xác Nhận Mở Khiếu Nại Giao Dịch"
        confirmLabel="Xác nhận gửi khiếu nại & khóa ký quỹ"
        items={[
          {
            label: 'Giao dịch chuyển nhượng',
            value: activeTrade?.tradeTransactionCode || validTradeId.slice(0, 8).toUpperCase(),
          },
          {
            label: 'Số thuê bao',
            value: activeTrade?.simPhoneNumber || 'Theo hồ sơ chuyển nhượng',
          },
          {
            label: 'Số tiền ký quỹ bảo vệ',
            value: `${(activeTrade?.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫`,
            prominent: true,
          },
          { label: 'Nguyên nhân', value: selectedReason },
          { label: 'Bằng chứng hình ảnh', value: `${evidenceList.length} ảnh chụp trực tiếp` },
        ]}
        warning="Khi mở khiếu nại, hệ thống sẽ ngay lập tức đóng băng việc giải ngân khoản tiền ký quỹ để bảo vệ quyền lợi hợp pháp của các bên."
        onConfirm={handleSubmitDispute}
        onCancel={() => setShowReviewSheet(false)}
        loading={submitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  emptyContextBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyContextTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  emptyContextDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: Spacing.xl,
  },
  goToTransfersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    minHeight: 48,
  },
  goToTransfersBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  subStepBanner: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  subStepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  subStepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.danger,
    letterSpacing: 0.5,
  },
  subStepBannerDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  noticeTextBold: {
    fontWeight: '700',
    color: Colors.navy,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
    marginBottom: Spacing.xs + 2,
  },
  panel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  lockedTradeCard: {
    padding: Spacing.md,
  },
  lockedTradeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  lockedTradeCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.blue,
    fontFamily: 'monospace',
  },
  lockedEscrowCol: {
    alignItems: 'flex-end',
  },
  lockedEscrowVal: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  lockedEscrowCap: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  backToHandoverLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  backToHandoverText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    minHeight: 52,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  tradePhone: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reasonTextSelected: {
    color: Colors.navy,
    fontWeight: '700',
  },
  noteInputBox: {
    padding: Spacing.md,
  },
  noteInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  noteInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm + 2,
    fontSize: 13,
    color: Colors.navy,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  panelHeaderPad: {
    padding: Spacing.md,
  },
  panelSubhead: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  typeChipsCol: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeChipActive: {
    backgroundColor: 'rgba(22, 102, 197, 0.06)',
    borderColor: Colors.blue,
  },
  typeChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  typeChipTextActive: {
    color: Colors.navy,
    fontWeight: '700',
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.sm,
    minHeight: 48,
  },
  cameraBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  submitDisputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.md,
    minHeight: 52,
    marginTop: Spacing.xs,
  },
  submitDisputeBtnMuted: {
    opacity: 0.85,
  },
  submitDisputeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  cameraBackdrop: {
    flex: 1,
    backgroundColor: '#060F1E',
    justifyContent: 'space-between',
  },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 52,
  },
  cameraCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTopTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  cameraFrame: {
    width: '86%',
    height: '56%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
  },
  cameraFrameTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  cameraFrameSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  cameraBottomBar: {
    alignItems: 'center',
    paddingBottom: 48,
  },
  shutterOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
});

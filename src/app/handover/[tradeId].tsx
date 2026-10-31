import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { ContractTimeline, isTradeAwaitingSignature } from '../../components/trust/ContractTimeline';
import { EvidenceCard } from '../../components/trust/EvidenceCard';
import type { EvidenceItem } from '../../components/trust/EvidenceCard';
import { ReceiptScreen } from '../../components/trust/ReceiptScreen';
import type { ReceiptData } from '../../components/trust/ReceiptScreen';
import { SecureReviewSheet } from '../../components/trust/SecureReviewSheet';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { contractService } from '../../services/contractService';
import { transferService } from '../../services/transferService';
import {
  ContractPreviewDto,
  SimTransferProgressDto,
  TradeTransactionDto,
} from '../../types';

export default function SimHandoverScreen() {
  const router = useRouter();
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();

  const [progress, setProgress] = useState<SimTransferProgressDto | null>(null);
  const [contract, setContract] = useState<ContractPreviewDto | null>(null);
  const [trade, setTrade] = useState<TradeTransactionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal chụp bằng chứng
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [submittingProof, setSubmittingProof] = useState(false);

  // Modal rà soát giải ngân tiền ký quỹ
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const fetchProgress = useCallback(
    async (silent = false) => {
      if (!tradeId) {
        setLoading(false);
        setProgress(null);
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const [progressRes, contractRes, tradeRes] = await Promise.allSettled([
          transferService.getProgress(tradeId),
          contractService.preview(tradeId),
          contractService.getById(tradeId),
        ]);

        if (
          contractRes.status === 'fulfilled' &&
          contractRes.value.success &&
          contractRes.value.data
        ) {
          setContract(contractRes.value.data);
        }

        if (tradeRes.status === 'fulfilled' && tradeRes.value.success && tradeRes.value.data) {
          setTrade(tradeRes.value.data);
        }

        if (
          progressRes.status === 'fulfilled' &&
          progressRes.value.success &&
          progressRes.value.data
        ) {
          const data = progressRes.value.data;
          setProgress(data);
          if (data.proofs && data.proofs.length > 0) {
            const items: EvidenceItem[] = data.proofs.map((p, idx) => ({
              id: p.id || String(idx),
              thumbnailUri: p.imageUrl || p.proofImageUrl,
              timestamp: p.createdAt || p.createdDate || new Date().toISOString(),
              evidenceType: 'Biên nhận sang tên tại nhà mạng',
              contractCode: data.tradeTransactionCode,
              status: (p.proofStatus?.toLowerCase() as any) || 'pending',
              rejectionReason: p.description,
            }));
            setEvidenceList(items);
          } else if (data.transferProofUrl) {
            setEvidenceList([
              {
                id: 'initial_proof',
                thumbnailUri: data.transferProofUrl,
                timestamp: new Date().toISOString(),
                evidenceType: 'Biên nhận sang tên tại nhà mạng',
                contractCode: data.tradeTransactionCode,
                status: 'pending',
              },
            ]);
          } else {
            setEvidenceList([]);
          }
        } else {
          setProgress(null);
        }
      } catch {
        setProgress(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tradeId]
  );

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Chụp bằng chứng
  const handleSimulateCapture = async () => {
    setShowCaptureModal(false);
    setSubmittingProof(true);

    const newEvidence: EvidenceItem = {
      id: 'proof_' + Date.now(),
      thumbnailUri:
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
      timestamp: new Date().toISOString(),
      evidenceType: 'Biên nhận quầy giao dịch nhà mạng',
      contractCode: progress?.tradeTransactionCode || 'TRD-20261021',
      status: 'pending',
    };

    try {
      await transferService.submitProof(
        progress?.tradeId || tradeId || '',
        newEvidence.thumbnailUri!,
        'Đã chụp phiếu xác nhận sang tên tại điểm giao dịch'
      );
      setEvidenceList((prev) => [newEvidence, ...prev]);
      Alert.alert(
        'Đã gửi bằng chứng',
        'Hình ảnh biên nhận sang tên đã được gửi lên hệ thống và đang chờ kiểm tra.'
      );
      fetchProgress(true);
    } catch {
      setEvidenceList((prev) => [newEvidence, ...prev]);
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleRetakeEvidence = () => {
    setShowCaptureModal(true);
  };

  // Người mua xác nhận đã nhận SIM -> giải ngân tiền ký quỹ
  const handleExecuteBuyerConfirm = async () => {
    setConfirming(true);
    try {
      const res = await transferService.confirmTransfer(progress?.tradeId || tradeId || '');
      setShowConfirmSheet(false);

      if (res.success && res.data) {
        setReceiptData({
          type: 'success',
          title: 'Giao Dịch Hoàn Tất Thành Công',
          amountDisplay: `${(progress?.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫`,
          description:
            'Khoản tiền ký quỹ an toàn đã được giải ngân cho Người bán. Thủ tục chuyển nhượng SIM kết thúc thành công.',
          details: [
            { label: 'Mã giao dịch', value: progress?.tradeTransactionCode || 'TRD-20261021' },
            { label: 'Số SIM bàn giao', value: progress?.simPhoneNumber || '0909.999.999' },
            { label: 'Tình trạng hợp đồng', value: 'Đã hoàn tất chuyển nhượng' },
            { label: 'Phí giao dịch', value: '5% (Do người bán chi trả)' },
          ],
          referenceId: res.data.tradeTransactionCode || progress?.tradeTransactionCode,
          timestamp: new Date().toISOString(),
          nextSteps: [
            'SIM đã được kích hoạt sóng và cập nhật thông tin chính chủ dưới tên bạn.',
            'Bạn có thể tải lưu tệp PDF hợp đồng và biên bản thanh lý trong mục Hợp đồng.',
          ],
        });
      } else {
        throw new Error(res.message || 'Lỗi xác nhận bàn giao');
      }
    } catch (err: any) {
      setShowConfirmSheet(false);
      Alert.alert('Chưa thể xác nhận', err?.message || 'Có lỗi kết nối mạng.');
    } finally {
      setConfirming(false);
    }
  };

  if (receiptData) {
    return (
      <ReceiptScreen
        data={receiptData}
        onDone={() => {
          router.replace('/(tabs)/contracts');
        }}
        doneLabel="Về Danh Sách Hợp Đồng"
      />
    );
  }

  if (loading && !progress && !contract) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Quá Trình Chuyển Nhượng SIM" showBack onBack={() => router.back()} />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.blue} />
          <Text style={styles.loadingText}>Đang kiểm tra trạng thái hợp đồng & bàn giao...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!progress && !contract && !trade) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Quá Trình Chuyển Nhượng SIM" showBack onBack={() => router.back()} />
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="file-question-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.notFoundTitle}>Chưa có thông tin tiến trình</Text>
          <Text style={styles.notFoundDesc}>Giao dịch này chưa bước vào giai đoạn bàn giao.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay Lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Kiểm tra xem hợp đồng đã được ký đủ 2 bên chưa!
  const isFullySigned = contract
    ? Boolean(
        contract.isFullySigned ||
          contract.contractStatus === 'FULLY_SIGNED' ||
          (contract.buyerSigned && contract.sellerSigned)
      )
    : trade
    ? !isTradeAwaitingSignature(trade.status)
    : Boolean(progress?.simTransferId);

  const escrowAmount =
    progress?.escrowAmount ?? contract?.escrowAmount ?? trade?.escrowAmount ?? 0;
  const displayTradeCode =
    progress?.tradeTransactionCode ||
    contract?.tradeTransactionCode ||
    trade?.tradeTransactionCode ||
    'TRD';
  const displaySimNumber =
    progress?.simPhoneNumber ||
    contract?.simPhoneNumber ||
    trade?.simPhoneNumber ||
    'SIM Chuyển nhượng';

  // Nếu hợp đồng CHƯA ký đủ 2 bên -> Yêu cầu thực hiện Bước Ký Hợp Đồng Bằng OTP trước (Đồng bộ 100% với Web Frontend)
  if (!isFullySigned) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Quá Trình Chuyển Nhượng SIM" showBack onBack={() => router.back()} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchProgress(true)}
              tintColor={Colors.navy}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Tiến trình đang ở Bước Ký Hợp Đồng */}
          <View style={styles.card}>
            <Text style={styles.sectionHeaderTitle}>TIẾN TRÌNH GIAO DỊCH CHUYỂN NHƯỢNG</Text>
            <ContractTimeline
              status={trade?.status || 'PendingSignature'}
              style={{ marginTop: Spacing.sm }}
            />
          </View>

          {/* Thông tin giao dịch */}
          <View style={styles.card}>
            <View style={styles.tradeHeaderRow}>
              <View>
                <Text style={styles.tradeCode}>MÃ GIAO DỊCH: #{displayTradeCode}</Text>
                <Text style={styles.tradeSimNumber}>{displaySimNumber}</Text>
              </View>
              <View style={styles.escrowBadge}>
                <Text style={styles.escrowAmountText}>
                  {escrowAmount.toLocaleString('vi-VN')} ₫
                </Text>
                <Text style={styles.escrowNote}>Đang giữ trong ký quỹ (Escrow)</Text>
              </View>
            </View>
          </View>

          {/* Khối khóa bước chụp bằng chứng cho tới khi ký hợp đồng OTP */}
          <View style={styles.gateCard}>
            <View style={styles.stepPillRow}>
              <View style={styles.gateBadge}>
                <MaterialCommunityIcons name="file-sign" size={14} color={Colors.blue} />
                <Text style={styles.gateBadgeText}>BƯỚC BẮT BUỘC TRƯỚC KHI CHỤP BẰNG CHỨNG</Text>
              </View>
            </View>

            <Text style={styles.gateTitle}>
              Cần hoàn tất ký hợp đồng bằng OTP trước khi chụp bằng chứng sang tên
            </Text>
            <Text style={styles.gateDesc}>
              Giao dịch này hiện đang ở bước <Text style={{ fontWeight: '800', color: Colors.navy }}>Ký hợp đồng điện tử bằng OTP</Text>. Theo quy trình bảo chứng của TrustSim, bước chụp biên nhận sang tên tại nhà mạng chỉ mở khóa sau khi cả Bên Mua và Bên Bán hoàn tất chữ ký số OTP.
            </Text>

            <View style={styles.signerStatusRow}>
              <View style={styles.signerStatusBox}>
                <Text style={styles.signerRoleLabel}>BÊN MUA</Text>
                <View style={styles.signerStateLine}>
                  <MaterialCommunityIcons
                    name={contract?.buyerSigned ? 'check-circle' : 'clock-outline'}
                    size={16}
                    color={contract?.buyerSigned ? Colors.success : Colors.warning}
                  />
                  <Text
                    style={[
                      styles.signerStateText,
                      { color: contract?.buyerSigned ? Colors.success : Colors.warning },
                    ]}
                  >
                    {contract?.buyerSigned ? 'Đã ký OTP' : 'Chưa ký OTP'}
                  </Text>
                </View>
              </View>

              <View style={styles.signerStatusBox}>
                <Text style={styles.signerRoleLabel}>BÊN BÁN</Text>
                <View style={styles.signerStateLine}>
                  <MaterialCommunityIcons
                    name={contract?.sellerSigned ? 'check-circle' : 'clock-outline'}
                    size={16}
                    color={contract?.sellerSigned ? Colors.success : Colors.warning}
                  />
                  <Text
                    style={[
                      styles.signerStateText,
                      { color: contract?.sellerSigned ? Colors.success : Colors.warning },
                    ]}
                  >
                    {contract?.sellerSigned ? 'Đã ký OTP' : 'Chưa ký OTP'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.captureCtaBtn}
              onPress={() => router.replace(`/contract/${tradeId}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Đi tới trang ký hợp đồng bằng OTP"
            >
              <MaterialCommunityIcons name="shield-key-outline" size={20} color="#fff" />
              <Text style={styles.captureCtaText}>Đi Tới Ký Hợp Đồng Bằng OTP</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentStep =
    trade?.status === 'Completed' || progress?.completedAt
      ? 'Completed'
      : evidenceList.length > 0
      ? 'PendingVerification'
      : 'PendingTransfer';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Quá Trình Chuyển Nhượng SIM" showBack onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchProgress(true)}
            tintColor={Colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Tiến trình trực quan */}
        <View style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>TIẾN TRÌNH XÁC MINH SANG TÊN</Text>
          <ContractTimeline status={currentStep} style={{ marginTop: Spacing.sm }} />
        </View>

        {/* Thông tin giao dịch & tiền ký quỹ */}
        <View style={styles.card}>
          <View style={styles.tradeHeaderRow}>
            <View>
              <Text style={styles.tradeCode}>MÃ GIAO DỊCH: #{displayTradeCode}</Text>
              <Text style={styles.tradeSimNumber}>{displaySimNumber}</Text>
            </View>
            <View style={styles.escrowBadge}>
              <Text style={styles.escrowAmountText}>{escrowAmount.toLocaleString('vi-VN')} ₫</Text>
              <Text style={styles.escrowNote}>Đang ký quỹ an toàn</Text>
            </View>
          </View>
        </View>

        {/* BƯỚC 1: Chụp ảnh bằng chứng sang tên tại nhà mạng */}
        <View style={styles.checklistCard}>
          <View style={styles.stepPillRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>BƯỚC 1 · BẰNG CHỨNG SANG TÊN (SAU KHI ĐÃ KÝ HỢP ĐỒNG)</Text>
            </View>
          </View>
          <View style={styles.checklistTitleRow}>
            <MaterialCommunityIcons name="camera-document" size={20} color={Colors.navy} />
            <Text style={styles.checklistTitle}>CHỤP BIÊN NHẬN SANG TÊN NHÀ MẠNG</Text>
          </View>
          <Text style={styles.checklistSubtitle}>
            Bên bán cần cung cấp hình ảnh rõ nét để làm căn cứ giải ngân tiền ký quỹ:
          </Text>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.blue} />
            <Text style={styles.checkItemText}>
              1. Phiếu yêu cầu thay đổi thông tin / biên nhận của nhà mạng.
            </Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.blue} />
            <Text style={styles.checkItemText}>
              2. Số điện thoại và tên chủ thuê bao mới thể hiện rõ ràng.
            </Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.blue} />
            <Text style={styles.checkItemText}>
              3. Có dấu mộc hoặc chữ ký xác nhận của nhân viên giao dịch.
            </Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.blue} />
            <Text style={styles.checkItemText}>
              4. Ảnh chụp ngay ngắn, không bị lóa sáng hay mất góc.
            </Text>
          </View>

          {/* Nút chụp ảnh bằng chứng sang tên */}
          <TouchableOpacity
            style={styles.captureCtaBtn}
            onPress={() => setShowCaptureModal(true)}
            disabled={submittingProof}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Mở máy ảnh chụp bằng chứng sang tên SIM"
          >
            <MaterialCommunityIcons name="camera-plus" size={20} color="#fff" />
            <Text style={styles.captureCtaText}>
              {submittingProof ? 'Đang tải bằng chứng...' : 'Chụp Ảnh Bằng Chứng Sang Tên SIM'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Danh sách ảnh bằng chứng đã gửi */}
        <View style={styles.evidenceHeaderRow}>
          <Text style={styles.sectionTitle}>
            Hình Ảnh Bằng Chứng Đã Tải Lên ({evidenceList.length})
          </Text>
        </View>

        {evidenceList.length === 0 ? (
          <View style={styles.emptyEvidenceCard}>
            <MaterialCommunityIcons name="file-image-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyEvidenceTitle}>Chưa có ảnh bằng chứng nào</Text>
            <Text style={styles.emptyEvidenceDesc}>
              Bên bán vui lòng chụp ảnh giấy biên nhận sang tên từ quầy giao dịch nhà mạng để gửi người mua kiểm tra.
            </Text>
          </View>
        ) : (
          evidenceList.map((item) => (
            <EvidenceCard key={item.id} evidence={item} onRetake={handleRetakeEvidence} />
          ))
        )}

        {/* BƯỚC 2: Nút xác nhận nhận SIM dành cho Bên Mua */}
        <View style={styles.buyerActionCard}>
          <View style={styles.stepPillRow}>
            <View style={[styles.stepBadge, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.stepBadgeText, { color: Colors.success }]}>
                BƯỚC 2 · NGƯỜI MUA XÁC NHẬN & GIẢI NGÂN
              </Text>
            </View>
          </View>
          <Text style={styles.buyerCardTitle}>Hoàn tất kiểm tra SIM chính chủ</Text>
          <Text style={styles.buyerCardDesc}>
            Sau khi SIM đã kích hoạt sóng và đứng tên chính chủ của bạn, hãy xác nhận để giải ngân tiền ký quỹ cho Bên bán.
          </Text>
          <TouchableOpacity
            style={styles.confirmReceiptBtn}
            onPress={() => setShowConfirmSheet(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Xác nhận đã nhận SIM và giải ngân"
          >
            <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
            <Text style={styles.confirmReceiptBtnText}>Xác Nhận Đã Nhận SIM & Giải Ngân</Text>
          </TouchableOpacity>
        </View>

        {/* BƯỚC CON TRONG QUÁ TRÌNH CHUYỂN NHƯỢNG: Báo cáo sự cố / Chụp bằng chứng khiếu nại */}
        <View style={styles.disputeSubStepCard}>
          <View style={styles.stepPillRow}>
            <View style={styles.disputeStepBadge}>
              <MaterialCommunityIcons name="shield-alert-outline" size={13} color={Colors.danger} />
              <Text style={styles.disputeStepBadgeText}>
                BƯỚC XỬ LÝ SỰ CỐ TRONG QUÁ TRÌNH CHUYỂN NHƯỢNG
              </Text>
            </View>
          </View>
          <Text style={styles.disputeSubStepTitle}>
            Phát sinh sự cố khi sang tên SIM #{displaySimNumber}?
          </Text>
          <Text style={styles.disputeSubStepDesc}>
            Nếu bên bán chậm trễ ra điểm giao dịch, SIM bị từ chối sang tên do nợ cước/vướng cam kết hoặc không đúng mô tả, hãy chụp bằng chứng khiếu nại ngay tại bước này để hệ thống đóng băng khoản tiền ký quỹ ({escrowAmount.toLocaleString('vi-VN')} ₫).
          </Text>
          <TouchableOpacity
            style={styles.disputeSubStepBtn}
            onPress={() => router.push(`/dispute/${progress?.tradeId || tradeId}`)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Chụp bằng chứng khiếu nại cho giao dịch này"
          >
            <MaterialCommunityIcons name="camera-plus-outline" size={18} color={Colors.danger} />
            <Text style={styles.disputeSubStepBtnText}>
              Chụp Bằng Chứng Khiếu Nại & Khóa Giải Ngân
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal máy ảnh căn khung hình */}
      <Modal visible={showCaptureModal} animationType="slide" transparent>
        <View style={styles.cameraBackdrop}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={() => setShowCaptureModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Căn Chỉnh Khung Hình Biên Nhận</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.cameraGuideContainer}>
            <View style={styles.frameCornerTopLeft} />
            <View style={styles.frameCornerTopRight} />
            <View style={styles.frameCornerBottomLeft} />
            <View style={styles.frameCornerBottomRight} />

            <View style={styles.frameCenterContent}>
              <MaterialCommunityIcons name="scan-helper" size={48} color="rgba(255,255,255,0.7)" />
              <Text style={styles.frameGuideText}>
                Đặt toàn bộ giấy biên nhận sang tên vào trong khung{'\n'}
                Đảm bảo thấy rõ số thuê bao và dấu mộc nhà mạng
              </Text>
            </View>
          </View>

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.shutterBtn}
              onPress={handleSimulateCapture}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Bấm chụp ảnh biên nhận"
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rà soát an toàn trước khi giải ngân */}
      <SecureReviewSheet
        visible={showConfirmSheet}
        title="Xác Nhận Giải Ngân Cho Người Bán"
        confirmLabel={`Xác nhận giải ngân ${escrowAmount.toLocaleString('vi-VN')} ₫`}
        items={[
          {
            label: 'Số tiền giải ngân',
            value: `${escrowAmount.toLocaleString('vi-VN')} ₫`,
            prominent: true,
          },
          { label: 'Số SIM bàn giao', value: displaySimNumber },
          { label: 'Mã hợp đồng', value: displayTradeCode },
          {
            label: 'Bên bán thụ hưởng',
            value: progress?.isSeller ? 'Tài khoản của bạn' : 'Người bán xác minh',
          },
          { label: 'Tình trạng', value: 'Đã hoàn tất kiểm tra SIM' },
        ]}
        warning="Bằng việc nhấn xác nhận, bạn cam kết đã kiểm tra và SIM đã hoạt động bình thường dưới quyền sở hữu của bạn. Khoản tiền ký quỹ sẽ được chuyển thẳng cho Người bán và không thể hoàn tác."
        onConfirm={handleExecuteBuyerConfirm}
        onCancel={() => setShowConfirmSheet(false)}
        loading={confirming}
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: Spacing.md,
  },
  notFoundDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  backBtn: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.navy,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  tradeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.blue,
    fontFamily: 'monospace',
  },
  tradeSimNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  escrowBadge: {
    alignItems: 'flex-end',
  },
  escrowAmountText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  escrowNote: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '600',
    marginTop: 1,
  },
  gateCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.blue,
    borderLeftWidth: 3,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  gateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22, 102, 197, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gateBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.blue,
    letterSpacing: 0.4,
  },
  gateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 4,
    lineHeight: 22,
  },
  gateDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: Spacing.md,
  },
  signerStatusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  signerStatusBox: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm + 2,
  },
  signerRoleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },
  signerStateLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  signerStateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checklistCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checklistTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: 0.5,
  },
  checklistSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  checkItemText: {
    fontSize: 13,
    color: Colors.navy,
    flex: 1,
    lineHeight: 18,
  },
  captureCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.md,
    minHeight: 50,
    marginTop: Spacing.md,
  },
  captureCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  evidenceHeaderRow: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  emptyEvidenceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyEvidenceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: Spacing.sm,
  },
  emptyEvidenceDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  stepPillRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs + 2,
  },
  stepBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.blue,
    letterSpacing: 0.5,
  },
  buyerActionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadows.card,
  },
  buyerCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  buyerCardDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  confirmReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.md,
    minHeight: 50,
  },
  confirmReceiptBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  disputeSubStepCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  disputeStepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dangerLight,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  disputeStepBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.danger,
    letterSpacing: 0.4,
  },
  disputeSubStepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
  },
  disputeSubStepDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  disputeSubStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  disputeSubStepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.danger,
  },
  cameraBackdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: 50,
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cameraGuideContainer: {
    width: '88%',
    height: '60%',
    alignSelf: 'center',
    borderRadius: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.blue,
  },
  frameCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.blue,
  },
  frameCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: Colors.blue,
  },
  frameCornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.blue,
  },
  frameCenterContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  frameGuideText: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  cameraControls: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});

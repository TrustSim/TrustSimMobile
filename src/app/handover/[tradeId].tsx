import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { ContractTimeline } from '../../components/trust/ContractTimeline';
import { EvidenceCard } from '../../components/trust/EvidenceCard';
import type { EvidenceItem } from '../../components/trust/EvidenceCard';
import { ReceiptScreen } from '../../components/trust/ReceiptScreen';
import type { ReceiptData } from '../../components/trust/ReceiptScreen';
import { SecureReviewSheet } from '../../components/trust/SecureReviewSheet';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { transferService } from '../../services/transferService';
import { SimTransferConfirmResultDto, SimTransferProgressDto } from '../../types';

export default function SimHandoverScreen() {
  const router = useRouter();
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();

  const [progress, setProgress] = useState<SimTransferProgressDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal chụp bằng chứng
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [submittingProof, setSubmittingProof] = useState(false);

  // Modal rà soát giải ngân tiền ký quỹ
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!tradeId) {
      setLoading(false);
      setProgress(null);
      return;
    }
    setLoading(true);
    try {
      const res = await transferService.getProgress(tradeId);
      if (res.success && res.data) {
        setProgress(res.data);
        if (res.data.proofs && res.data.proofs.length > 0) {
          const items: EvidenceItem[] = res.data.proofs.map((p, idx) => ({
            id: p.id || String(idx),
            thumbnailUri: p.imageUrl || p.proofImageUrl,
            timestamp: p.createdAt || p.createdDate || new Date().toISOString(),
            evidenceType: 'Biên nhận sang tên tại nhà mạng',
            contractCode: res.data.tradeTransactionCode,
            status: (p.proofStatus?.toLowerCase() as any) || 'pending',
            rejectionReason: p.description,
          }));
          setEvidenceList(items);
        } else if (res.data.transferProofUrl) {
          setEvidenceList([
            {
              id: 'initial_proof',
              thumbnailUri: res.data.transferProofUrl,
              timestamp: new Date().toISOString(),
              evidenceType: 'Biên nhận sang tên tại nhà mạng',
              contractCode: res.data.tradeTransactionCode,
              status: 'pending',
            },
          ]);
        }
      } else {
        setProgress(null);
      }
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Chụp bằng chứng
  const handleSimulateCapture = async () => {
    setShowCaptureModal(false);
    setSubmittingProof(true);

    const newEvidence: EvidenceItem = {
      id: 'proof_' + Date.now(),
      thumbnailUri: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
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
      fetchProgress();
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
          description: 'Khoản tiền ký quỹ an toàn đã được giải ngân cho Người bán. Thủ tục chuyển nhượng SIM kết thúc thành công.',
          details: [
            { label: 'Mã giao dịch', value: progress?.tradeTransactionCode || 'TRD-20261021' },
            { label: 'Số SIM bàn giao', value: progress?.simPhoneNumber || '0909.999.999' },
            { label: 'Tình trạng hợp đồng', value: 'Đã hoàn tất chuyển nhượng' },
            { label: 'Phí giao dịch', value: '0 ₫ (Miễn phí)' },
          ],
          referenceId: res.data.tradeTransactionCode || progress?.tradeTransactionCode,
          timestamp: new Date().toISOString(),
          nextSteps: [
            'SIM đã được kích hoạt sóng và cập nhật thông tin chính chủ dưới tên bạn.',
            'Bạn có thể tải lưu tệp PDF hợp đồng bất cứ lúc nào trong mục Hợp đồng.',
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

  if (loading && !progress) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Bằng Chứng Bàn Giao SIM" showBack onBack={() => router.back()} />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.blue} />
          <Text style={styles.loadingText}>Đang tải thông tin bàn giao...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!progress) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Bằng Chứng Bàn Giao SIM" showBack onBack={() => router.back()} />
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

  const escrowAmount = progress.escrowAmount ?? 0;
  const currentStep = evidenceList.length > 0 ? 'PendingVerification' : 'PendingTransfer';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Bằng Chứng Sang Tên SIM" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tiến trình trực quan */}
        <View style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>TIẾN TRÌNH XÁC MINH SANG TÊN</Text>
          <ContractTimeline status={currentStep} style={{ marginTop: Spacing.sm }} />
        </View>

        {/* Thông tin giao dịch & tiền ký quỹ */}
        <View style={styles.card}>
          <View style={styles.tradeHeaderRow}>
            <View>
              <Text style={styles.tradeCode}>MÃ GIAO DỊCH: #{progress.tradeTransactionCode || 'TRD-20261021'}</Text>
              <Text style={styles.tradeSimNumber}>{progress.simPhoneNumber || 'SIM Chuyển nhượng'}</Text>
            </View>
            <View style={styles.escrowBadge}>
              <Text style={styles.escrowAmountText}>{escrowAmount.toLocaleString('vi-VN')} ₫</Text>
              <Text style={styles.escrowNote}>Đang ký quỹ an toàn</Text>
            </View>
          </View>
        </View>

        {/* Hướng dẫn chụp ảnh bằng chứng (tiếng Việt rõ ràng, thân thiện) */}
        <View style={styles.checklistCard}>
          <View style={styles.checklistTitleRow}>
            <MaterialCommunityIcons name="camera-document" size={20} color={Colors.navy} />
            <Text style={styles.checklistTitle}>HƯỚNG DẪN CHỤP ẢNH BẰNG CHỨNG</Text>
          </View>
          <Text style={styles.checklistSubtitle}>
            Bên bán cần cung cấp hình ảnh rõ nét để làm căn cứ giải ngân tiền ký quỹ:
          </Text>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.blue} />
            <Text style={styles.checkItemText}>1. Phiếu yêu cầu thay đổi thông tin / biên nhận của nhà mạng.</Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.blue} />
            <Text style={styles.checkItemText}>2. Số điện thoại và tên chủ thuê bao mới thể hiện rõ ràng.</Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.blue} />
            <Text style={styles.checkItemText}>3. Có dấu mộc hoặc chữ ký xác nhận của nhân viên giao dịch.</Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.blue} />
            <Text style={styles.checkItemText}>4. Ảnh chụp ngay ngắn, không bị lóa sáng hay mất góc.</Text>
          </View>

          {/* Nút chụp ảnh bằng chứng sang tên */}
          <TouchableOpacity
            style={styles.captureCtaBtn}
            onPress={() => setShowCaptureModal(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Mở máy ảnh chụp bằng chứng sang tên SIM"
          >
            <MaterialCommunityIcons name="camera-plus" size={20} color="#fff" />
            <Text style={styles.captureCtaText}>Chụp Ảnh Bằng Chứng Sang Tên SIM</Text>
          </TouchableOpacity>
        </View>

        {/* Danh sách ảnh bằng chứng đã gửi */}
        <View style={styles.evidenceHeaderRow}>
          <Text style={styles.sectionTitle}>Hình Ảnh Bằng Chứng Đã Tải Lên ({evidenceList.length})</Text>
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
            <EvidenceCard
              key={item.id}
              evidence={item}
              onRetake={handleRetakeEvidence}
            />
          ))
        )}

        {/* Nút xác nhận nhận SIM dành cho Bên Mua */}
        <View style={styles.buyerActionArea}>
          <TouchableOpacity
            style={styles.confirmReceiptBtn}
            onPress={() => setShowConfirmSheet(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Xác nhận đã nhận SIM và giải ngân"
          >
            <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
            <Text style={styles.confirmReceiptBtnText}>
              Xác Nhận Đã Nhận SIM & Giải Ngân
            </Text>
          </TouchableOpacity>
          <Text style={styles.buyerActionNote}>
            * Khi bạn nhấn xác nhận, tiền ký quỹ sẽ được chuyển cho Bên Bán và giao dịch kết thúc an toàn.
          </Text>
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

          {/* Khung ngắm chụp tài liệu */}
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

          {/* Nút bấm chụp */}
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
          { label: 'Số tiền giải ngân', value: `${escrowAmount.toLocaleString('vi-VN')} ₫`, prominent: true },
          { label: 'Số SIM bàn giao', value: progress.simPhoneNumber || '0909.999.999' },
          { label: 'Mã hợp đồng', value: progress.tradeTransactionCode || 'TRD-20261021' },
          { label: 'Bên bán thụ hưởng', value: progress.isSeller ? 'Tài khoản của bạn' : 'Người bán xác minh' },
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
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
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
  buyerActionArea: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  confirmReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.md,
    minHeight: 52,
  },
  confirmReceiptBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  buyerActionNote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
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

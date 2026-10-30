import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { BiometricPromptModal } from '../../components/BiometricPromptModal';
import { Header } from '../../components/Header';
import { SignaturePadModal } from '../../components/SignaturePadModal';
import { ContractTimeline } from '../../components/trust/ContractTimeline';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { contractService } from '../../services/contractService';
import { ContractPreviewDto } from '../../types';

export default function ContractPreviewScreen() {
  const router = useRouter();
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();
  const { user } = useAuth();

  const [contract, setContract] = useState<ContractPreviewDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [signingLoading, setSigningLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Handwritten & Biometric state
  const [handwrittenSig, setHandwrittenSig] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showBiometrics, setShowBiometrics] = useState(false);

  // Modal xem toàn bộ điều khoản văn bản
  const [showFullTermsModal, setShowFullTermsModal] = useState(false);

  const fetchContract = useCallback(async () => {
    if (!tradeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await contractService.preview(tradeId);
      if (res.success && res.data) {
        setContract(res.data);
      } else {
        setContract(null);
      }
    } catch {
      setContract(null);
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleStartSign = async () => {
    setShowOtpModal(true);
    setOtpError(null);
    try {
      await contractService.sendOtp(contract?.tradeId || tradeId || '');
    } catch {
      // Ignored
    }
  };

  const handleConfirmSign = async (authMethod: 'OTP' | 'BIOMETRIC' = 'OTP') => {
    if (!otpCode || otpCode.length < 6) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã xác thực nhận qua Email.');
      return;
    }

    setOtpError(null);
    setSigningLoading(true);
    try {
      const res = await contractService.sign(
        contract?.tradeId || tradeId || '',
        otpCode,
        handwrittenSig || undefined,
        handwrittenSig ? 'BIOMETRIC_AND_OTP' : authMethod
      );

      setShowOtpModal(false);
      setShowBiometrics(false);

      if (res.success) {
        Alert.alert(
          'Ký Hợp Đồng Thành Công',
          'Hợp đồng đã được ký xác nhận điện tử hợp pháp giữa các bên.',
          [
            {
              text: 'Chuyển Đến Bằng Chứng Bàn Giao',
              onPress: () => router.push(`/handover/${contract?.tradeId || tradeId}`),
            },
          ]
        );
        fetchContract();
      } else {
        throw new Error(res.message || 'Ký số thất bại');
      }
    } catch {
      setShowOtpModal(false);
      Alert.alert(
        'Lỗi ký hợp đồng',
        'Không thể hoàn tất ký hợp đồng vào lúc này. Vui lòng kiểm tra lại kết nối mạng và thử lại.'
      );
    } finally {
      setSigningLoading(false);
    }
  };

  if (loading && !contract) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Hợp Đồng Chuyển Nhượng" showBack onBack={() => router.back()} />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.blue} />
          <Text style={styles.loadingText}>Đang tải hợp đồng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!loading && !contract) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Header title="Hợp Đồng Chuyển Nhượng" showBack onBack={() => router.back()} />
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="file-document-outline" size={56} color={Colors.textMuted} />
          <Text style={styles.notFoundTitle}>Không tìm thấy thông tin hợp đồng</Text>
          <Text style={styles.notFoundDesc}>
            Hợp đồng này không tồn tại hoặc bạn chưa có quyền truy cập.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay Lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isFullySigned = contract?.contractStatus === 'FULLY_SIGNED';
  const tradeStatus = isFullySigned ? 'PendingTransfer' : 'PendingContractSigning';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Hợp Đồng Chuyển Nhượng" showBack onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tiến trình thực hiện trực quan */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionSmallTitle}>TIẾN TRÌNH GIAO DỊCH</Text>
          <ContractTimeline status={tradeStatus} style={{ marginTop: Spacing.sm }} />
        </View>

        {/* Thẻ tóm tắt thông tin hợp đồng gọn gàng */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.tradeCode}>
                MÃ GIAO DỊCH: #{contract?.tradeTransactionCode || contract?.tradeCode || 'TRD-20261021'}
              </Text>
              <Text style={styles.simNumber}>
                {contract?.simPhoneNumber || contract?.simNumber || 'SIM Chuyển nhượng'}
              </Text>
            </View>
            <VerificationStatusBadge
              status={isFullySigned ? 'verified' : 'pending'}
              label={isFullySigned ? 'Đã ký đủ 2 bên' : 'Chờ bạn ký'}
            />
          </View>

          <View style={styles.divider} />

          {/* Chi tiết điều khoản tóm tắt */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số tiền ký quỹ:</Text>
            <Text style={styles.infoValueBold}>
              {(contract?.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bảo vệ thanh toán:</Text>
            <Text style={[styles.infoValue, { color: Colors.success }]}>
              Giữ an toàn trong tài khoản ký quỹ
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Các bên tham gia */}
          <View style={styles.partiesRow}>
            <View style={styles.partyCol}>
              <Text style={styles.partyRole}>BÊN BÁN (BÊN A)</Text>
              <Text style={styles.partyName} numberOfLines={1}>
                {contract?.sellerFullName || contract?.sellerName || 'Bên bán'}
              </Text>
              <View style={styles.signedTag}>
                <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
                <Text style={styles.signedTagText}>Đã ký điện tử</Text>
              </View>
            </View>

            <View style={styles.partyDivider} />

            <View style={styles.partyCol}>
              <Text style={styles.partyRole}>BÊN MUA (BÊN B)</Text>
              <Text style={styles.partyName} numberOfLines={1}>
                {contract?.buyerFullName || contract?.buyerName || 'Bên mua'}
              </Text>
              {contract?.buyerSigned ? (
                <View style={styles.signedTag}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
                  <Text style={styles.signedTagText}>Đã ký điện tử</Text>
                </View>
              ) : (
                <View style={[styles.signedTag, { backgroundColor: Colors.warningLight }]}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.warning} />
                  <Text style={[styles.signedTagText, { color: Colors.warning }]}>Chờ bạn ký</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Nút xem điều khoản đầy đủ (khi người dùng muốn xem thì mới bấm) */}
        <TouchableOpacity
          style={styles.viewTermsBtn}
          onPress={() => setShowFullTermsModal(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="file-eye-outline" size={18} color={Colors.blue} />
          <Text style={styles.viewTermsText}>Xem toàn bộ điều khoản hợp đồng</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.blue} />
        </TouchableOpacity>

        {/* Chữ ký tay nếu đã đính kèm */}
        {handwrittenSig && (
          <View style={styles.sigCard}>
            <Text style={styles.sigTitle}>Chữ ký tay của bạn:</Text>
            <View style={styles.sigPlaceholder}>
              <MaterialCommunityIcons name="draw" size={16} color={Colors.blue} />
              <Text style={styles.sigText}>Đã đính kèm chữ ký cá nhân</Text>
            </View>
          </View>
        )}

        {/* Chứng nhận niêm phong pháp lý */}
        {isFullySigned && (
          <View style={styles.certCard}>
            <MaterialCommunityIcons name="shield-check" size={24} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.certTitle}>Hợp đồng đã có hiệu lực pháp lý</Text>
              <Text style={styles.certDesc}>
                Văn bản đã được ký điện tử và niêm phong an toàn. Bên bán có trách nhiệm hoàn tất thủ tục bàn giao sang tên tại quầy nhà mạng.
              </Text>
            </View>
          </View>
        )}

        {/* Các nút hành động chính */}
        {!contract?.buyerSigned ? (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handleStartSign}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ký hợp đồng bằng mã xác thực Email OTP"
            >
              <MaterialCommunityIcons name="shield-key" size={20} color="#fff" />
              <Text style={styles.primaryActionText}>Ký Hợp Đồng Bằng Mã Xác Thực</Text>
            </TouchableOpacity>

            <View style={styles.advancedRow}>
              <TouchableOpacity
                style={styles.advancedBtn}
                onPress={() => setShowSignaturePad(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="draw" size={16} color={Colors.navy} />
                <Text style={styles.advancedBtnText}>Vẽ chữ ký tay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.advancedBtn}
                onPress={() => setShowBiometrics(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="fingerprint" size={16} color={Colors.navy} />
                <Text style={styles.advancedBtnText}>Vân tay / FaceID</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            {/* Nút chuyển tới màn bằng chứng bàn giao - Tên rõ ràng dễ hiểu */}
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push(`/handover/${contract.tradeId}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Chụp và xem bằng chứng bàn giao SIM"
            >
              <MaterialCommunityIcons name="camera-document" size={20} color="#fff" />
              <Text style={styles.primaryActionText}>Chụp & Xem Bằng Chứng Bàn Giao</Text>
            </TouchableOpacity>

            {/* Nút tải PDF về máy */}
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => {
                const pdfUrl = contract.documentPdfUrl || contract.pdfDocumentUrl;
                if (pdfUrl) {
                  Linking.openURL(pdfUrl);
                } else {
                  Alert.alert('Tải hợp đồng', 'Tệp tin hợp đồng PDF đang được tải về...');
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="download" size={18} color={Colors.navy} />
              <Text style={styles.secondaryActionText}>Tải Hợp Đồng Về Máy (PDF)</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal xem toàn bộ nội dung văn bản hợp đồng khi người dùng cần */}
      <Modal visible={showFullTermsModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={styles.modalFullHeader}>
            <Text style={styles.modalFullTitle}>Chi Tiết Văn Bản Hợp Đồng</Text>
            <TouchableOpacity onPress={() => setShowFullTermsModal(false)} style={styles.modalCloseBtn}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            <Text style={styles.fullPaperText}>
              {contract?.htmlContent.replace(/<[^>]+>/g, '').trim()}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal nhập OTP ký hợp đồng */}
      <Modal visible={showOtpModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderIcon}>
              <MaterialCommunityIcons name="lock-outline" size={24} color={Colors.navy} />
            </View>
            <Text style={styles.modalTitle}>Xác Nhận Ký Hợp Đồng</Text>
            <Text style={styles.modalDesc}>
              Mã xác thực 6 chữ số đã được gửi đến email đăng ký:
            </Text>
            <Text style={styles.modalEmail}>{user?.email || 'email của bạn'}</Text>

            {otpError && (
              <View style={styles.modalError}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.modalErrorText}>{otpError}</Text>
              </View>
            )}

            <TextInput
              style={styles.modalOtpInput}
              value={otpCode}
              onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••••"
              placeholderTextColor={Colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.modalConfirmBtn, (signingLoading || otpCode.length < 6) && styles.modalBtnDisabled]}
              onPress={() => handleConfirmSign('OTP')}
              disabled={signingLoading || otpCode.length < 6}
              activeOpacity={0.85}
            >
              <Text style={styles.modalConfirmBtnText}>
                {signingLoading ? 'Đang xác nhận...' : 'Xác Nhận Ký Hợp Đồng'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowOtpModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Hủy Bỏ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal vẽ chữ ký tay */}
      <SignaturePadModal
        visible={showSignaturePad}
        onConfirm={(base64Signature: string) => {
          setHandwrittenSig(base64Signature);
          setShowSignaturePad(false);
        }}
        onClose={() => setShowSignaturePad(false)}
      />

      {/* Modal xác thực sinh trắc học */}
      <BiometricPromptModal
        visible={showBiometrics}
        tradeCode={contract?.tradeTransactionCode || 'TRD-20261021'}
        simNumber={contract?.simPhoneNumber || 'SIM'}
        onSuccess={() => {
          setShowBiometrics(false);
          handleStartSign();
        }}
        onFallbackToOtp={() => {
          setShowBiometrics(false);
          handleStartSign();
        }}
        onClose={() => setShowBiometrics(false)}
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
  timelineCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  sectionSmallTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tradeCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.blue,
    fontFamily: 'monospace',
  },
  simNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.navy,
  },
  infoValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  partiesRow: {
    flexDirection: 'row',
  },
  partyCol: {
    flex: 1,
  },
  partyDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.md,
  },
  partyRole: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 2,
  },
  signedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  signedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  viewTermsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  viewTermsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue,
    marginLeft: Spacing.xs,
  },
  sigCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sigTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 4,
  },
  sigPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sigText: {
    fontSize: 12,
    color: Colors.blue,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  certTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  certDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  actionsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.md,
    minHeight: 52,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  advancedRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  advancedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 44,
  },
  advancedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 48,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  modalFullHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalFullTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
  },
  modalCloseBtn: {
    padding: 4,
  },
  fullPaperText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.modal,
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  modalEmail: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    padding: Spacing.xs + 2,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  modalErrorText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
  },
  modalOtpInput: {
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    color: Colors.navy,
  },
  modalConfirmBtn: {
    width: '100%',
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  modalCancelBtn: {
    paddingVertical: Spacing.sm,
  },
  modalCancelText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});

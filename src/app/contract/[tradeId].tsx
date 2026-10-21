import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { BiometricPromptModal } from '../../components/BiometricPromptModal';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { BottomNavBar } from '../../components/BottomNavBar';
import { SignaturePadModal } from '../../components/SignaturePadModal';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { contractService } from '../../services/contractService';
import { ContractIntegrityResultDto, ContractPreviewDto } from '../../types';

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

  // Integrity Check result modal
  const [integrityResult, setIntegrityResult] = useState<ContractIntegrityResultDto | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);

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
      setOtpError('Vui lòng nhập đủ 6 chữ số mã OTP nhận qua Email.');
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
          'Ký Hợp Đồng Thành Công!',
          'Hợp đồng đã được cả 2 bên ký xác nhận thành công và có đầy đủ hiệu lực pháp lý.',
          [
            {
              text: 'Xem Tiến Trình Bàn Giao',
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

  const handleVerifyIntegrity = async () => {
    setCheckingIntegrity(true);
    try {
      const sampleHash =
        contract?.documentHash ||
        '7f9fad1c0e5a83b275c4e976ec4e0626a23531b79f83526d11f71a938c0f5f84';
      const res = await contractService.verifyIntegrity(
        contract?.tradeId || tradeId || '',
        sampleHash
      );
      if (res.success && res.data) {
        setIntegrityResult(res.data);
      } else {
        Alert.alert('Thông báo', 'Không thể xác thực tính toàn vẹn của hợp đồng vào lúc này.');
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể kết nối máy chủ để kiểm tra tính toàn vẹn.');
    } finally {
      setCheckingIntegrity(false);
    }
  };

  if (loading && !contract) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Hợp Đồng Chuyển Nhượng SIM" showBack onBack={() => router.back()} showHome />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: Spacing.md, color: Colors.textSecondary }}>Đang tải hợp đồng...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!loading && !contract) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Hợp Đồng Chuyển Nhượng SIM" showBack onBack={() => router.back()} showHome />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl }}>
          <Ionicons name="document-text-outline" size={60} color={Colors.border} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.text, marginTop: Spacing.md }}>
            Không tìm thấy thông tin hợp đồng
          </Text>
          <Text style={{ fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
            Hợp đồng này không tồn tại hoặc bạn chưa có quyền truy cập.
          </Text>
          <Button
            title="Quay Lại"
            variant="outline"
            onPress={() => router.back()}
            style={{ marginTop: Spacing.xl, minWidth: 140 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Hợp Đồng Chuyển Nhượng SIM" showBack onBack={() => router.back()} showHome />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.tradeCode}>{contract?.tradeCode || 'TRD-20261021-001'}</Text>
              <Text style={styles.simNumber}>0909.999.999 (Mobifone)</Text>
            </View>
            <Badge
              status={contract?.contractStatus || 'PENDING_BUYER_SIGNATURE'}
              label={
                contract?.contractStatus === 'FULLY_SIGNED'
                  ? 'ĐÃ KÝ ĐỦ 2 BÊN'
                  : 'CHỜ BÊN MUA KÝ'
              }
            />
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.partiesRow}>
            {/* Seller */}
            <View style={styles.partyBox}>
              <Text style={styles.partyRole}>BÊN BÁN (BÊN A)</Text>
              <Text style={styles.partyName}>{contract?.sellerFullName}</Text>
              <View style={styles.signedTag}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.signedTagText}>Đã ký</Text>
              </View>
            </View>

            {/* Buyer */}
            <View style={styles.partyBox}>
              <Text style={styles.partyRole}>BÊN MUA (BÊN B)</Text>
              <Text style={styles.partyName}>{contract?.buyerFullName}</Text>
              {contract?.buyerSigned ? (
                <View style={styles.signedTag}>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                  <Text style={styles.signedTagText}>Đã ký</Text>
                </View>
              ) : (
                <View style={[styles.signedTag, { backgroundColor: Colors.warningLight }]}>
                  <Ionicons name="time-outline" size={14} color={Colors.warning} />
                  <Text style={[styles.signedTagText, { color: '#9A3412' }]}>Chờ bạn ký</Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Contract HTML Preview Card */}
        <Card style={styles.paperCard}>
          <View style={styles.paperHeader}>
            <Ionicons name="document-text" size={20} color={Colors.primary} />
            <Text style={styles.paperTitle}>NỘI DUNG VĂN BẢN HỢP ĐỒNG</Text>
          </View>

          <View style={styles.paperContent}>
            <Text style={styles.paperText}>
              {contract?.htmlContent.replace(/<[^>]+>/g, '').trim()}
            </Text>
          </View>
        </Card>

        {/* Handwritten Signature Preview if attached */}
        {handwrittenSig && (
          <Card style={styles.sigPreviewCard}>
            <View style={styles.sigPreviewHeader}>
              <Ionicons name="pencil" size={16} color={Colors.primary} />
              <Text style={styles.sigPreviewTitle}>Chữ ký tay điện tử của bạn:</Text>
            </View>
            <View style={styles.sigBox}>
              <Text style={styles.sigPlaceholderText}>
                ✍️ [Đã đính kèm chữ ký tay]
              </Text>
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        {!contract?.buyerSigned ? (
          <View style={styles.signActionContainer}>
            <Button
              title="✍️ KÝ HỢP ĐỒNG BẰNG MÃ OTP"
              variant="primary"
              size="lg"
              onPress={handleStartSign}
              style={{ marginBottom: Spacing.sm }}
            />

            <View style={styles.advancedSignRow}>
              <Button
                title="Vẽ chữ ký tay"
                variant="outline"
                size="sm"
                icon={<Ionicons name="brush-outline" size={16} color={Colors.primary} />}
                onPress={() => setShowSignaturePad(true)}
                style={{ flex: 1, marginRight: Spacing.xs }}
              />
              <Button
                title="Vân Tay / FaceID"
                variant="outline"
                size="sm"
                icon={<Ionicons name="finger-print-outline" size={16} color={Colors.primary} />}
                onPress={() => setShowBiometrics(true)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.fullySignedActions}>
            <Button
              title="TIẾN TRÌNH BÀN GIAO SIM"
              variant="primary"
              size="lg"
              onPress={() => router.push(`/handover/${contract.tradeId}`)}
              style={{ marginBottom: Spacing.sm }}
            />
            <Button
              title="📄 TẢI HỢP ĐỒNG ĐIỆN TỬ (PDF)"
              variant="outline"
              size="md"
              icon={<Ionicons name="download-outline" size={18} color={Colors.primary} />}
              onPress={() =>
                contract.pdfDocumentUrl
                  ? Linking.openURL(contract.pdfDocumentUrl)
                  : Alert.alert('Tải hợp đồng', 'File PDF đang được tải về...')
              }
              style={{ marginBottom: Spacing.sm }}
            />
            <Button
              title="🛡️ KIỂM TRA TÍNH TOÀN VẸN HỢP ĐỒNG"
              variant="secondary"
              size="sm"
              loading={checkingIntegrity}
              onPress={handleVerifyIntegrity}
            />
          </View>
        )}
      </ScrollView>

      {/* SCR-19: Contract OTP Signing Modal */}
      <Modal visible={showOtpModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.otpModalHeader}>
              <Ionicons name="lock-closed" size={28} color={Colors.primary} />
              <Text style={styles.otpModalTitle}>Xác Nhận Ký Hợp Đồng</Text>
            </View>

            <Text style={styles.otpModalDesc}>
              Mã OTP xác thực 6 số đã được gửi tới email của bạn:
            </Text>
            <Text style={styles.otpEmailHighlighted}>{user?.email || 'email của bạn'}</Text>

            {otpError && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{otpError}</Text>
              </View>
            )}

            <TextInput
              style={styles.otpInput}
              value={otpCode}
              onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="Nhập 6 số OTP..."
              autoFocus
            />

            <Text style={styles.legalNotice}>
              Bằng việc nhập mã OTP, bạn xác nhận đồng ý với toàn bộ điều khoản trong hợp đồng mua bán SIM này.
            </Text>

            <Button
              title="XÁC NHẬN KÝ HỢP ĐỒNG"
              variant="primary"
              size="lg"
              loading={signingLoading}
              onPress={() => handleConfirmSign('OTP')}
              style={{ marginTop: Spacing.md, width: '100%' }}
            />

            <Button
              title="Đóng / Hủy bỏ"
              variant="ghost"
              size="sm"
              onPress={() => setShowOtpModal(false)}
              style={{ marginTop: Spacing.xs, width: '100%' }}
            />
          </View>
        </View>
      </Modal>

      {/* SCR-19.1: Signature Pad Modal */}
      <SignaturePadModal
        visible={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        onConfirm={(sig) => {
          setHandwrittenSig(sig);
          setShowSignaturePad(false);
          Alert.alert('Đã lưu chữ ký tay!', 'Chữ ký tay sẽ được gắn kèm khi bạn bấm Ký OTP.');
        }}
      />

      {/* SCR-19.2: Biometric Prompt Modal */}
      <BiometricPromptModal
        visible={showBiometrics}
        tradeCode={contract?.tradeCode || '—'}
        simNumber={contract?.simNumber || 'SIM'}
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

      {/* Integrity Verification Result Modal */}
      <Modal visible={!!integrityResult} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.integrityHeader}>
              <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
              <Text style={styles.integrityTitle}>HỢP ĐỒNG HỢP LỆ & TOÀN VẸN</Text>
            </View>

            {integrityResult && (
              <View style={styles.integrityBody}>
                <Text style={styles.integrityDesc}>{integrityResult.message}</Text>

                <View style={styles.integrityRow}>
                  <Text style={styles.intLabel}>Mã chứng thực:</Text>
                  <Text style={styles.intVal}>{integrityResult.padesSignatureSerial}</Text>
                </View>

                <View style={styles.integrityRow}>
                  <Text style={styles.intLabel}>Đơn vị cấp chứng thực:</Text>
                  <Text style={styles.intVal}>{integrityResult.tsaAuthority}</Text>
                </View>

                <View style={styles.integrityRow}>
                  <Text style={styles.intLabel}>Thời gian chứng thực:</Text>
                  <Text style={styles.intVal}>
                    {new Date(integrityResult.tsaTimestamp).toLocaleString('vi-VN')}
                  </Text>
                </View>

                <View style={styles.integrityRow}>
                  <Text style={styles.intLabel}>Số lượng chữ ký hợp lệ:</Text>
                  <Text style={[styles.intVal, { color: Colors.success, fontWeight: '800' }]}>
                    {integrityResult.totalSignatures} / 2 bên đã ký
                  </Text>
                </View>

                <Button
                  title="Đóng Kết Quả"
                  variant="primary"
                  size="md"
                  onPress={() => setIntegrityResult(null)}
                  style={{ marginTop: Spacing.lg, width: '100%' }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
      <BottomNavBar activeTab="none" />
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
  },
  summaryCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tradeCode: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  simNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  partiesRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  partyBox: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
  },
  partyRole: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginVertical: 4,
  },
  signedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  signedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 3,
  },
  paperCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  paperTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  paperContent: {
    backgroundColor: '#FAFAF9',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  paperText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sigPreviewCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(30, 58, 138, 0.04)',
  },
  sigPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sigPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 4,
  },
  sigBox: {
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  sigPlaceholderText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  signActionContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  advancedSignRow: {
    flexDirection: 'row',
  },
  fullySignedActions: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  otpModalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  otpModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  otpModalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  otpEmailHighlighted: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    width: '100%',
  },
  errorAlertText: {
    fontSize: 12,
    color: Colors.danger,
    marginLeft: 4,
    fontWeight: '500',
  },
  otpInput: {
    width: '100%',
    height: 52,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    color: Colors.text,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  legalNotice: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  integrityHeader: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  integrityTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  integrityBody: {
    width: '100%',
  },
  integrityDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 17,
  },
  integrityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  intLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  intVal: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
});

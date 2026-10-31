import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  RefreshControl,
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
import { extractErrorMessage } from '../../services/apiClient';
import { contractService } from '../../services/contractService';
import { ContractPreviewDto, TradeTransactionDto } from '../../types';

export default function ContractPreviewScreen() {
  const router = useRouter();
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();
  const { user, refreshWallet } = useAuth();

  const [contract, setContract] = useState<ContractPreviewDto | null>(null);
  const [trade, setTrade] = useState<TradeTransactionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // OTP states (inline & modal)
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [signingLoading, setSigningLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Handwritten & Biometric state
  const [handwrittenSig, setHandwrittenSig] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [showBiometrics, setShowBiometrics] = useState(false);

  // Modal xem toàn bộ điều khoản văn bản
  const [showFullTermsModal, setShowFullTermsModal] = useState(false);

  const fetchContract = useCallback(
    async (silent = false) => {
      if (!tradeId) {
        setLoading(false);
        return;
      }
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const [previewRes, tradeRes] = await Promise.allSettled([
          contractService.preview(tradeId),
          contractService.getById(tradeId),
        ]);

        if (
          previewRes.status === 'fulfilled' &&
          previewRes.value.success &&
          previewRes.value.data
        ) {
          setContract(previewRes.value.data);
        } else {
          setContract(null);
        }

        if (tradeRes.status === 'fulfilled' && tradeRes.value.success && tradeRes.value.data) {
          setTrade(tradeRes.value.data);
        }
      } catch {
        setContract(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tradeId]
  );

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const handleRequestOtp = async () => {
    const targetId = contract?.tradeId || tradeId || '';
    if (!targetId || sendingOtp || otpCooldown > 0) return;

    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await contractService.sendOtp(targetId);
      const cooldown = res.data?.cooldownSeconds || 60;
      setOtpCooldown(cooldown);
      setOtpSentMessage(
        res.data?.message ||
          res.message ||
          `Đã gửi mã OTP 6 chữ số tới email ${res.data?.email || user?.email || 'đăng ký'}.`
      );
    } catch (err: any) {
      setOtpError(extractErrorMessage(err));
    } finally {
      setSendingOtp(false);
    }
  };

  const handleStartSignModal = async () => {
    setShowOtpModal(true);
    setOtpError(null);
    if (otpCooldown <= 0) {
      await handleRequestOtp();
    }
  };

  const handleConfirmSign = async (authMethod: 'OTP' | 'BIOMETRIC' = 'OTP') => {
    const cleanOtp = otpCode.replace(/[^0-9]/g, '');
    if (cleanOtp.length !== 6) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã OTP nhận qua Email.');
      return;
    }

    setOtpError(null);
    setSigningLoading(true);
    try {
      const targetId = contract?.tradeId || tradeId || '';
      const res = await contractService.sign(
        targetId,
        cleanOtp,
        handwrittenSig || undefined,
        handwrittenSig ? 'BIOMETRIC_AND_OTP' : authMethod
      );

      setShowOtpModal(false);
      setShowBiometrics(false);

      if (res.success) {
        setOtpCode('');
        await Promise.allSettled([fetchContract(true), refreshWallet()]);

        const fullySignedNow = Boolean(
          res.data?.isFullySigned || res.data?.contractStatus === 'FULLY_SIGNED'
        );

        if (fullySignedNow) {
          Alert.alert(
            'Đã Ký Đủ 2 Bên · Mở Khóa Bước Bàn Giao',
            res.data?.message ||
              'Cả Bên Mua và Bên Bán đã hoàn tất ký hợp đồng bằng OTP. Hệ thống đã mở khóa bước Chụp bằng chứng sang tên SIM.',
            [
              {
                text: 'Ở lại xem hợp đồng',
                style: 'cancel',
              },
              {
                text: 'Chuyển Đến Bằng Chứng Sang Tên',
                onPress: () => router.push(`/handover/${targetId}`),
              },
            ]
          );
        } else {
          Alert.alert(
            'Đã Ghi Nhận Chữ Ký OTP Của Bạn',
            res.data?.message ||
              'Chữ ký điện tử bằng OTP của bạn đã được lưu hợp lệ. Hợp đồng đang chờ đối phương ký xác nhận để chuyển sang bước chụp bằng chứng bàn giao.'
          );
        }
      } else {
        throw new Error(res.message || 'Ký số thất bại');
      }
    } catch (err: any) {
      const errMsg = extractErrorMessage(err);
      setOtpError(errMsg);
      Alert.alert('Chưa thể ký hợp đồng', errMsg);
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
          <Text style={styles.loadingText}>Đang tải hợp đồng điện tử...</Text>
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

  const isFullySigned = Boolean(
    contract?.isFullySigned ||
      contract?.contractStatus === 'FULLY_SIGNED' ||
      (contract?.buyerSigned && contract?.sellerSigned)
  );

  const currentUserId = (user?.userId || '').toLowerCase();
  const isBuyer = Boolean(
    currentUserId && trade?.buyerId && trade.buyerId.toLowerCase() === currentUserId
  );
  const isSeller = Boolean(
    currentUserId && trade?.sellerId && trade.sellerId.toLowerCase() === currentUserId
  );

  // Xác định người dùng hiện tại đã ký hay chưa
  const hasCurrentUserSigned = isBuyer
    ? Boolean(contract?.buyerSigned)
    : isSeller
    ? Boolean(contract?.sellerSigned)
    : isFullySigned;

  const canCurrentUserSign = !isFullySigned && !hasCurrentUserSigned;

  const timelineStatus =
    trade?.status === 'Completed'
      ? 'Completed'
      : isFullySigned || trade?.status === 'PendingTransfer'
      ? 'PendingTransfer'
      : 'PendingSignature';

  const formatSignedTime = (iso?: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Hợp Đồng Chuyển Nhượng" showBack onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchContract(true)}
            tintColor={Colors.navy}
          />
        }
      >
        {/* Tiến trình thực hiện trực quan */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionSmallTitle}>TIẾN TRÌNH GIAO DỊCH CHUYỂN NHƯỢNG</Text>
          <ContractTimeline status={timelineStatus} style={{ marginTop: Spacing.sm }} />
        </View>

        {/* Thẻ tóm tắt thông tin hợp đồng */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={{ flex: 1, paddingRight: Spacing.sm }}>
              <Text style={styles.tradeCode}>
                MÃ GIAO DỊCH: #{contract?.tradeTransactionCode || contract?.tradeCode || trade?.tradeTransactionCode}
              </Text>
              <Text style={styles.simNumber}>
                {contract?.simPhoneNumber || contract?.simNumber || trade?.simPhoneNumber || 'SIM Chuyển nhượng'}
              </Text>
            </View>
            <VerificationStatusBadge
              status={isFullySigned ? 'verified' : hasCurrentUserSigned ? 'checking' : 'pending'}
              label={
                isFullySigned
                  ? 'Đã ký đủ 2 bên'
                  : hasCurrentUserSigned
                  ? 'Chờ đối phương ký'
                  : 'Chờ bạn ký OTP'
              }
            />
          </View>

          <View style={styles.divider} />

          {/* Chi tiết điều khoản tóm tắt */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số tiền ký quỹ (Escrow):</Text>
            <Text style={styles.infoValueBold}>
              {(contract?.escrowAmount ?? trade?.escrowAmount ?? 0).toLocaleString('vi-VN')} ₫
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cơ chế bảo vệ:</Text>
            <Text style={[styles.infoValue, { color: Colors.success }]}>
              Sàn giữ trung gian (Hoàn tất → trả người bán, Hủy → hoàn tiền)
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Các bên tham gia (Hiển thị chuẩn trạng thái ký thực tế của cả Bên Bán và Bên Mua) */}
          <View style={styles.partiesRow}>
            <View style={styles.partyCol}>
              <View style={styles.partyRoleRow}>
                <Text style={styles.partyRole}>BÊN BÁN (BÊN A)</Text>
                {isSeller && (
                  <View style={styles.selfBadge}>
                    <Text style={styles.selfBadgeText}>Bạn</Text>
                  </View>
                )}
              </View>
              <Text style={styles.partyName} numberOfLines={1}>
                {contract?.sellerFullName || contract?.sellerName || trade?.sellerName || 'Bên bán'}
              </Text>
              {contract?.sellerSigned ? (
                <View style={styles.signedTag}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
                  <Text style={styles.signedTagText}>Đã ký OTP</Text>
                </View>
              ) : (
                <View style={[styles.signedTag, { backgroundColor: Colors.warningLight }]}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.warning} />
                  <Text style={[styles.signedTagText, { color: Colors.warning }]}>
                    {isSeller ? 'Chờ bạn ký OTP' : 'Chưa ký'}
                  </Text>
                </View>
              )}
              {contract?.sellerSignedAt ? (
                <Text style={styles.signedAtText}>{formatSignedTime(contract.sellerSignedAt)}</Text>
              ) : null}
            </View>

            <View style={styles.partyDivider} />

            <View style={styles.partyCol}>
              <View style={styles.partyRoleRow}>
                <Text style={styles.partyRole}>BÊN MUA (BÊN B)</Text>
                {isBuyer && (
                  <View style={styles.selfBadge}>
                    <Text style={styles.selfBadgeText}>Bạn</Text>
                  </View>
                )}
              </View>
              <Text style={styles.partyName} numberOfLines={1}>
                {contract?.buyerFullName || contract?.buyerName || trade?.buyerName || 'Bên mua'}
              </Text>
              {contract?.buyerSigned ? (
                <View style={styles.signedTag}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={Colors.success} />
                  <Text style={styles.signedTagText}>Đã ký OTP</Text>
                </View>
              ) : (
                <View style={[styles.signedTag, { backgroundColor: Colors.warningLight }]}>
                  <MaterialCommunityIcons name="clock-outline" size={14} color={Colors.warning} />
                  <Text style={[styles.signedTagText, { color: Colors.warning }]}>
                    {isBuyer ? 'Chờ bạn ký OTP' : 'Chưa ký'}
                  </Text>
                </View>
              )}
              {contract?.buyerSignedAt ? (
                <Text style={styles.signedAtText}>{formatSignedTime(contract.buyerSignedAt)}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Nút xem điều khoản đầy đủ */}
        <TouchableOpacity
          style={styles.viewTermsBtn}
          onPress={() => setShowFullTermsModal(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="file-eye-outline" size={18} color={Colors.blue} />
          <Text style={styles.viewTermsText}>Đọc toàn văn điều khoản hợp đồng chuyển nhượng</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.blue} />
        </TouchableOpacity>

        {/* KHỐI KÝ HỢP ĐỒNG BẰNG OTP TRỰC TIẾP (Đồng bộ với Web Frontend) */}
        {canCurrentUserSign && (
          <View style={styles.otpSignPanel}>
            <View style={styles.stepPillRow}>
              <View style={styles.stepPill}>
                <MaterialCommunityIcons name="shield-key-outline" size={13} color={Colors.blue} />
                <Text style={styles.stepPillText}>BƯỚC HIỆN TẠI · KÝ HỢP ĐỒNG BẰNG OTP</Text>
              </View>
            </View>

            <Text style={styles.otpPanelTitle}>Đọc và ký xác nhận hợp đồng bằng mã OTP</Text>
            <Text style={styles.otpPanelDesc}>
              Mã xác thực 6 chữ số sẽ được gửi tới email <Text style={{ fontWeight: '700', color: Colors.navy }}>{user?.email || 'đăng ký'}</Text>. Sau khi cả Bên Mua và Bên Bán ký OTP, hệ thống sẽ niêm phong hợp đồng PAdES và mở khóa bước Chụp bằng chứng sang tên SIM.
            </Text>

            {otpSentMessage && !otpError && (
              <View style={styles.otpSuccessBanner}>
                <MaterialCommunityIcons name="check-circle-outline" size={15} color={Colors.success} />
                <Text style={styles.otpSuccessText}>{otpSentMessage}</Text>
              </View>
            )}

            {otpError && (
              <View style={styles.modalError}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color={Colors.danger} />
                <Text style={styles.modalErrorText}>{otpError}</Text>
              </View>
            )}

            <View style={styles.inlineOtpRow}>
              <TextInput
                style={styles.inlineOtpInput}
                value={otpCode}
                onChangeText={(val) => {
                  setOtpCode(val.replace(/[^0-9]/g, '').slice(0, 6));
                  if (otpError) setOtpError(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="Nhập 6 số OTP"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                style={[
                  styles.sendOtpBtn,
                  (sendingOtp || otpCooldown > 0) && styles.sendOtpBtnDisabled,
                ]}
                onPress={handleRequestOtp}
                disabled={sendingOtp || otpCooldown > 0}
                activeOpacity={0.8}
              >
                {sendingOtp ? (
                  <ActivityIndicator size="small" color={Colors.blue} />
                ) : (
                  <MaterialCommunityIcons name="email-fast-outline" size={16} color={Colors.blue} />
                )}
                <Text style={styles.sendOtpBtnText}>
                  {otpCooldown > 0 ? `Gửi lại (${otpCooldown}s)` : 'Nhận mã OTP'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                (signingLoading || otpCode.length !== 6) && styles.modalBtnDisabled,
              ]}
              onPress={() => handleConfirmSign('OTP')}
              disabled={signingLoading || otpCode.length !== 6}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Ký xác nhận hợp đồng bằng mã OTP"
            >
              <MaterialCommunityIcons name="file-sign" size={20} color="#fff" />
              <Text style={styles.primaryActionText}>
                {signingLoading ? 'Đang xác thực chữ ký OTP...' : 'Ký Xác Nhận Hợp Đồng (OTP)'}
              </Text>
            </TouchableOpacity>

            {/* Tùy chọn nâng cao: Vẽ chữ ký tay hoặc Sinh trắc học */}
            <View style={styles.advancedRow}>
              <TouchableOpacity
                style={styles.advancedBtn}
                onPress={() => setShowSignaturePad(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="draw" size={16} color={Colors.navy} />
                <Text style={styles.advancedBtnText}>
                  {handwrittenSig ? 'Đã đính kèm chữ ký tay' : 'Đính kèm chữ ký tay'}
                </Text>
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
        )}

        {/* TRẠNG THÁI: Người dùng hiện tại ĐÃ KÝ nhưng đang chờ đối phương ký */}
        {!isFullySigned && hasCurrentUserSigned && (
          <View style={styles.waitingCounterpartyCard}>
            <View style={styles.waitingHeaderRow}>
              <MaterialCommunityIcons name="clock-check-outline" size={22} color={Colors.blue} />
              <View style={{ flex: 1 }}>
                <Text style={styles.waitingTitle}>
                  Chữ ký OTP của bạn đã được ghi nhận
                </Text>
                <Text style={styles.waitingDesc}>
                  Đang chờ {isBuyer ? 'Bên Bán' : 'Bên Mua'} hoàn tất ký hợp đồng bằng OTP. Bước chụp bằng chứng sang tên tại nhà mạng sẽ tự động mở khóa ngay sau khi cả 2 bên ký đủ.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => fetchContract(true)}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="refresh" size={18} color={Colors.navy} />
              <Text style={styles.secondaryActionText}>Đồng bộ trạng thái ký mới nhất</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TRẠNG THÁI: CẢ HAI BÊN ĐÃ KÝ XONG -> Mở khóa bước Chụp bằng chứng sang tên */}
        {isFullySigned && (
          <View style={styles.actionsContainer}>
            <View style={styles.certCard}>
              <MaterialCommunityIcons name="shield-check" size={24} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.certTitle}>Hợp đồng đã ký đủ 2 bên & có hiệu lực pháp lý</Text>
                <Text style={styles.certDesc}>
                  Văn bản đã được ký điện tử OTP và niêm phong PAdES an toàn. Bây giờ hai bên có thể tiến hành sang tên SIM tại nhà mạng và chụp ảnh biên nhận bàn giao.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push(`/handover/${contract?.tradeId || tradeId}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Chuyển sang bước chụp và xem bằng chứng bàn giao SIM"
            >
              <MaterialCommunityIcons name="camera-document" size={20} color="#fff" />
              <Text style={styles.primaryActionText}>
                Bước Tiếp Theo: Chụp Bằng Chứng Sang Tên
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => {
                const pdfUrl = contract?.documentPdfUrl || contract?.pdfDocumentUrl;
                if (pdfUrl) {
                  Linking.openURL(pdfUrl);
                } else {
                  Alert.alert(
                    'Đang niêm phong PDF',
                    'Hệ thống đang đóng dấu chứng thư số PAdES lên tệp PDF. Vui lòng kéo xuống làm mới sau vài giây.'
                  );
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="download" size={18} color={Colors.navy} />
              <Text style={styles.secondaryActionText}>Tải Hợp Đồng Đã Niêm Phong (PDF)</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal xem toàn bộ nội dung văn bản hợp đồng */}
      <Modal visible={showFullTermsModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={styles.modalFullHeader}>
            <Text style={styles.modalFullTitle}>Chi Tiết Văn Bản Hợp Đồng</Text>
            <TouchableOpacity
              onPress={() => setShowFullTermsModal(false)}
              style={styles.modalCloseBtn}
            >
              <MaterialCommunityIcons name="close" size={24} color={Colors.navy} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
            <Text style={styles.fullPaperText}>
              {(contract?.htmlContent || '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim() || 'Nội dung hợp đồng đang được đồng bộ...'}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal nhập OTP ký hợp đồng (khi dùng qua luồng Sinh trắc học) */}
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
              style={[
                styles.modalConfirmBtn,
                (signingLoading || otpCode.length < 6) && styles.modalBtnDisabled,
              ]}
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
              <Text style={styles.modalCancelText}>Đóng</Text>
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
        tradeCode={contract?.tradeTransactionCode || trade?.tradeTransactionCode || 'TRD'}
        simNumber={contract?.simPhoneNumber || trade?.simPhoneNumber || 'SIM'}
        onSuccess={() => {
          setShowBiometrics(false);
          handleStartSignModal();
        }}
        onFallbackToOtp={() => {
          setShowBiometrics(false);
          handleStartSignModal();
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
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionSmallTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
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
    fontVariant: ['tabular-nums'],
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
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
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
  partyRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  partyRole: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },
  selfBadge: {
    backgroundColor: 'rgba(22, 102, 197, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  selfBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.blue,
  },
  partyName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: 3,
  },
  signedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  signedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.success,
  },
  signedAtText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
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
    paddingVertical: Spacing.sm + 3,
    marginBottom: Spacing.md,
  },
  viewTermsText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue,
    marginLeft: Spacing.xs,
  },
  otpSignPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.blue,
    borderLeftWidth: 3,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stepPillRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs + 2,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22, 102, 197, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stepPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.blue,
    letterSpacing: 0.4,
  },
  otpPanelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  otpPanelDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  otpSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  otpSuccessText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  inlineOtpRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inlineOtpInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 48,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: 6,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  sendOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.blue,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  sendOtpBtnDisabled: {
    opacity: 0.55,
    borderColor: Colors.border,
  },
  sendOtpBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.blue,
  },
  waitingCounterpartyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.blue,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  waitingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
  },
  waitingDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 3,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  certTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.navy,
  },
  certDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  actionsContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.sm,
    minHeight: 50,
    paddingHorizontal: Spacing.md,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  advancedRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  advancedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 42,
    paddingHorizontal: Spacing.xs,
  },
  advancedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 46,
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
    flex: 1,
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
    paddingVertical: Spacing.md,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: Spacing.md,
  },
  modalConfirmBtn: {
    width: '100%',
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});

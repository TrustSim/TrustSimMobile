import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { ReceiptScreen } from '../../components/trust/ReceiptScreen';
import type { ReceiptData } from '../../components/trust/ReceiptScreen';
import { TelcoRadarModal } from '../../components/TelcoRadarModal';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { extractErrorMessage } from '../../services/apiClient';
import { simService } from '../../services/simService';

export default function SimVerifyScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  // Flow step: 1 = Enter Phone Number, 2 = Enter SMS OTP
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telco Radar Modal state
  const [showRadar, setShowRadar] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const getCarrierInfo = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('090') || clean.startsWith('093') || clean.startsWith('089') || clean.startsWith('07')) {
      return { name: 'MobiFone', color: Colors.blue };
    }
    if (clean.startsWith('098') || clean.startsWith('097') || clean.startsWith('086') || clean.startsWith('03')) {
      return { name: 'Viettel Telecom', color: '#00843D' };
    }
    if (clean.startsWith('091') || clean.startsWith('094') || clean.startsWith('088') || clean.startsWith('08')) {
      return { name: 'VNPT Vinaphone', color: '#0066B3' };
    }
    return { name: 'Nhà mạng Việt Nam', color: Colors.textSecondary };
  };

  const carrier = getCarrierInfo(phoneNumber);

  const handleSendOtp = async () => {
    if (profile?.verificationStatus !== 'VERIFIED') {
      Alert.alert(
        'Yêu cầu xác minh danh tính',
        'Hồ sơ của bạn chưa hoàn tất xác thực CCCD (Trust ID). Vui lòng hoàn thành xác thực CCCD trước khi liên kết SIM chính chủ.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Xác minh ngay', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }

    const clean = phoneNumber.replace(/[^0-9]/g, '');
    if (clean.length < 10) {
      setError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số).');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await simService.sendSimOtp(clean);
      if (res.success) {
        setStep(2);
      } else {
        setError(res.message || 'Không thể gửi mã OTP tới số này.');
      }
    } catch (err: any) {
      const msg = extractErrorMessage(err, 'Không thể gửi mã OTP tới số này.');
      setError(msg);
      if (msg.includes('KYC') || msg.includes('xác thực danh tính')) {
        Alert.alert(
          'Chưa xác thực Trust ID',
          msg,
          [
            { text: 'Để sau', style: 'cancel' },
            { text: 'Xác minh ngay', onPress: () => router.push('/kyc') },
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP gửi qua tin nhắn SMS.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await simService.verifySimOtp(phoneNumber.replace(/[^0-9]/g, ''), otpCode);
      if (res.success) {
        setShowRadar(true);
      } else {
        setError(res.message || 'Mã xác thực không chính xác.');
      }
    } catch {
      setError('Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleRadarCompleted = () => {
    setShowRadar(false);
    setReceiptData({
      type: 'success',
      title: 'Khớp Chủ Thuê Bao Thành Công',
      description: 'Thông tin thuê bao nhà mạng đã khớp hoàn toàn với hồ sơ định danh CCCD của bạn.',
      details: [
        { label: 'Số thuê bao', value: phoneNumber },
        { label: 'Nhà mạng', value: carrier.name },
        { label: 'Chủ thuê bao CCCD', value: profile?.fullName || 'NGUYỄN VĂN A' },
        { label: 'Số CCCD liên kết', value: profile?.identityNumber || '••••', masked: true },
        { label: 'Trạng thái đối soát', value: 'Khớp chủ thuê bao 100%' },
      ],
      referenceId: 'SIM-AUDIT-' + Math.floor(100000 + Math.random() * 900000),
      timestamp: new Date().toISOString(),
      nextSteps: [
        'SIM này đã được cấp quyền niêm yết đấu giá hoặc chuyển nhượng.',
        'Hợp đồng chuyển nhượng điện tử sẽ tự động trích xuất thông tin SIM này.',
      ],
    });
  };

  if (receiptData) {
    return (
      <ReceiptScreen
        data={receiptData}
        onDone={() => {
          router.replace('/(tabs)/account');
        }}
        doneLabel="Xem Hồ Sơ Trust ID"
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header
        title={step === 1 ? 'Đối Soát SIM Chính Chủ' : 'Nhập Mã OTP SMS'}
        showBack
        onBack={() => {
          if (step === 2) setStep(1);
          else router.back();
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepDotText}>1</Text>
            </View>
            <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 2 && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step < 2 && styles.stepDotTextInactive]}>2</Text>
            </View>
          </View>

          {step === 1 && (
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>BƯỚC 1: SỐ ĐIỆN THOẠI THUÊ BAO</Text>
              <Text style={styles.title}>Đối Chiếu Danh Tính Nhà Mạng</Text>
              <Text style={styles.desc}>
                Hệ thống TrustSim sẽ gửi mã OTP xác nhận quyền kiểm soát SIM, sau đó đối chiếu thông tin chủ thuê bao với dữ liệu CCCD của bạn.
              </Text>

              {error && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>SỐ ĐIỆN THOẠI CẦN XÁC THỰC</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="cellphone" size={20} color={Colors.navy} />
                <TextInput
                  style={styles.textInput}
                  value={phoneNumber}
                  onChangeText={(val) => setPhoneNumber(val.replace(/[^0-9]/g, ''))}
                  placeholder="Ví dụ: 0988123456"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>

              {phoneNumber.length >= 3 && (
                <View style={styles.carrierBadge}>
                  <MaterialCommunityIcons name="signal" size={14} color={carrier.color} />
                  <Text style={[styles.carrierText, { color: carrier.color }]}>{carrier.name}</Text>
                </View>
              )}

              {/* Requirement Checklist */}
              <View style={styles.checklist}>
                <View style={styles.checkRow}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.blue} />
                  <Text style={styles.checkText}>SIM đang hoạt động 2 chiều, nhận được SMS OTP.</Text>
                </View>
                <View style={styles.checkRow}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.blue} />
                  <Text style={styles.checkText}>Họ tên đăng ký tại nhà mạng phải trùng khớp với CCCD.</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (loading || phoneNumber.length < 10) && styles.submitBtnDisabled]}
                onPress={handleSendOtp}
                disabled={loading || phoneNumber.length < 10}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Gửi mã xác thực OTP"
              >
                <MaterialCommunityIcons name="send-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>{loading ? 'Đang gửi...' : 'Gửi Mã OTP Xác Thực'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>BƯỚC 2: NHẬP MÃ OTP SMS</Text>
              <Text style={styles.title}>Xác Nhận Quyền Sở Hữu</Text>
              <Text style={styles.desc}>
                Nhập mã 6 chữ số vừa được gửi tới thuê bao{' '}
                <Text style={{ fontWeight: '800', color: Colors.navy }}>{phoneNumber}</Text>
              </Text>

              {error && (
                <View style={styles.errorBox}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={Colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>MÃ XÁC THỰC (6 CHỮ SỐ)</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="shield-key-outline" size={20} color={Colors.navy} />
                <TextInput
                  style={[styles.textInput, styles.otpInput]}
                  value={otpCode}
                  onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, (loading || otpCode.length < 6) && styles.submitBtnDisabled]}
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length < 6}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Đối soát danh tính ngay"
              >
                <MaterialCommunityIcons name="shield-check" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>{loading ? 'Đang đối soát...' : 'Đối Soát & Xác Thực'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => Alert.alert('Đã gửi lại OTP', 'Mã xác thực mới đã được gửi tới số điện thoại.')}
                activeOpacity={0.7}
              >
                <Text style={styles.resendBtnText}>Chưa nhận được mã? Gửi lại OTP</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Telco Radar Animation Modal */}
      <TelcoRadarModal
        visible={showRadar}
        phoneNumber={phoneNumber}
        onCompleted={handleRadarCompleted}
        onClose={() => setShowRadar(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  stepDotText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  stepDotTextInactive: {
    color: Colors.textMuted,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  stepLineActive: {
    backgroundColor: Colors.blue,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: Spacing.xs,
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.xs,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.navy,
    fontWeight: '600',
    padding: 0,
  },
  otpInput: {
    fontFamily: 'monospace',
    letterSpacing: 8,
    fontSize: 18,
    fontWeight: '800',
  },
  carrierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.md,
  },
  carrierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checklist: {
    backgroundColor: 'rgba(22, 102, 197, 0.05)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.xs + 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkText: {
    fontSize: 12,
    color: Colors.navy,
    flex: 1,
    lineHeight: 16,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.md,
    minHeight: 52,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  resendBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    minHeight: 36,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.blue,
  },
});

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { BottomNavBar } from '../../components/BottomNavBar';
import { Input } from '../../components/Input';
import { TelcoRadarModal } from '../../components/TelcoRadarModal';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { simService } from '../../services/simService';

export default function SimVerifyScreen() {
  const router = useRouter();

  // Flow step: 1 = Enter Phone Number, 2 = Enter SMS OTP
  const [step, setStep] = useState<1 | 2>(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telco Radar Modal state
  const [showRadar, setShowRadar] = useState(false);

  const getCarrierInfo = (phone: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('090') || clean.startsWith('093') || clean.startsWith('089') || clean.startsWith('07')) {
      return { name: 'Mobifone', color: Colors.primary };
    }
    if (clean.startsWith('098') || clean.startsWith('097') || clean.startsWith('086') || clean.startsWith('03')) {
      return { name: 'Viettel', color: '#00843D' };
    }
    if (clean.startsWith('091') || clean.startsWith('094') || clean.startsWith('088') || clean.startsWith('08')) {
      return { name: 'Vinaphone', color: '#0066B3' };
    }
    return { name: 'Nhà mạng Việt Nam', color: Colors.textSecondary };
  };

  const carrier = getCarrierInfo(phoneNumber);

  const handleSendOtp = async () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Vui lòng nhập số điện thoại hợp lệ 10 số.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await simService.sendSimOtp(cleanPhone);
      if (res.success) {
        setStep(2);
      } else {
        setError(res.message || 'Không thể gửi mã OTP tới số này.');
      }
    } catch {
      setError('Không thể gửi mã OTP. Vui lòng kiểm tra lại kết nối mạng.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP gửi qua SMS.');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={step === 1 ? 'Xác Thực Quyền Sở Hữu SIM' : 'Nhập Mã OTP Xác Thực'}
        showBack
        showHome
        onBack={() => {
          if (step === 2) setStep(1);
          else router.back();
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {step === 1 && (
            <Card style={styles.card}>
              <View style={styles.phaseBadge}>
                <Text style={styles.phaseBadgeText}>BƯỚC 1: XÁC MINH SỐ ĐIỆN THOẠI</Text>
              </View>

              <Text style={styles.title}>Đăng Ký & Xác Minh Số SIM</Text>
              <Text style={styles.desc}>
                Hệ thống sẽ gửi mã OTP SMS trực tiếp tới số SIM của bạn để xác nhận bạn đang
                sử dụng số điện thoại này.
              </Text>

              {error && (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={styles.errorAlertText}>{error}</Text>
                </View>
              )}

              <Input
                label="Số điện thoại cần xác thực"
                placeholder="Ví dụ: 0909999999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={12}
                hint="Số thuê bao di động 10 số tại Việt Nam"
                leftIcon={<Ionicons name="phone-portrait-outline" size={18} color={Colors.primary} />}
              />

              {phoneNumber.length >= 3 && (
                <View style={styles.carrierIndicator}>
                  <Ionicons name="cellular-outline" size={16} color={carrier.color} />
                  <Text style={[styles.carrierText, { color: carrier.color }]}>
                    Nhận diện: {carrier.name}
                  </Text>
                </View>
              )}

              <Button
                title="GỬI MÃ OTP ĐẾN SỐ SIM"
                variant="primary"
                size="lg"
                loading={loading}
                icon={<Ionicons name="paper-plane-outline" size={18} color={Colors.textInverse} />}
                onPress={handleSendOtp}
                style={styles.actionBtn}
              />
            </Card>
          )}

          {step === 2 && (
            <Card style={styles.card}>
              <View style={[styles.phaseBadge, { backgroundColor: Colors.successLight }]}>
                <Text style={[styles.phaseBadgeText, { color: '#065F46' }]}>
                  BƯỚC 2: XÁC MINH CHỦ SỞ HỮU
                </Text>
              </View>

              <Text style={styles.title}>Nhập Mã OTP SMS</Text>
              <Text style={styles.desc}>
                Nhập mã OTP 6 số đã được gửi qua tin nhắn SMS tới số thuê bao:{' '}
                <Text style={{ fontWeight: '800', color: Colors.primary }}>{phoneNumber}</Text>
              </Text>

              {error && (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                  <Text style={styles.errorAlertText}>{error}</Text>
                </View>
              )}

              <Input
                label="Mã OTP 6 số"
                placeholder="Ví dụ: 654321"
                value={otpCode}
                onChangeText={(val) => setOtpCode(val.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={6}
                leftIcon={<Ionicons name="key-outline" size={18} color={Colors.primary} />}
              />

              <Button
                title="XÁC THỰC SỞ HỮU SIM"
                variant="primary"
                size="lg"
                loading={loading}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color={Colors.textInverse} />}
                onPress={handleVerifyOtp}
                style={styles.actionBtn}
              />

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={() => Alert.alert('Đã gửi lại OTP', 'Mã xác thực SMS mới đã được gửi.')}
              >
                <Text style={styles.resendBtnText}>Chưa nhận được tin nhắn? Gửi lại OTP</Text>
              </TouchableOpacity>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SCR-16 & SCR-17: Telco Radar Audit Animation Modal */}
      <TelcoRadarModal
        visible={showRadar}
        phoneNumber={phoneNumber}
        onCompleted={() => {
          setShowRadar(false);
          router.replace('/(tabs)/sims');
        }}
        onClose={() => setShowRadar(false)}
      />
      <BottomNavBar activeTab="sims" />
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
  },
  card: {
    padding: Spacing.xl,
  },
  phaseBadge: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: Spacing.sm,
  },
  phaseBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  desc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorAlertText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  carrierIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  carrierText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  actionBtn: {
    marginTop: Spacing.md,
  },
  resendBtn: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  resendBtnText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
});

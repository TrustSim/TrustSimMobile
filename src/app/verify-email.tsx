import React, { useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/apiClient';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail } = useAuth();

  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  const inputRef = useRef<any>(null);

  // 60s cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!otpCode || otpCode.length < 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP.');
      return;
    }

    if (!email) {
      setError('Không tìm thấy thông tin email.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await verifyEmail({ email, otpCode });
      router.replace({
        pathname: '/verify-success' as any,
        params: { email },
      });
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Mã OTP không chính xác hoặc đã hết hạn.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (cooldown > 0) return;
    setCooldown(60);
    Alert.alert('Đã gửi lại OTP', `Mã xác thực mới đã được gửi tới email ${email}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Xác Thực Email" showBack onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-unread" size={42} color={Colors.primary} />
            </View>

            <Text style={styles.title}>Nhập Mã Xác Thực</Text>
            <Text style={styles.subtitle}>
              Mã bảo mật 6 số đã được gửi tới địa chỉ email:
            </Text>
            <Text style={styles.emailHighlighted}>{email || 'email của bạn'}</Text>

            {error && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            {/* Hidden Input that captures keyboard */}
            <TextInput
              ref={inputRef}
              value={otpCode}
              onChangeText={(val) => {
                const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
                setOtpCode(cleaned);
              }}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.hiddenInput}
              autoFocus
            />

            {/* 6 Digit Display Boxes */}
            <TouchableOpacity
              activeOpacity={1}
              style={styles.otpBoxesRow}
              onPress={() => inputRef.current?.focus()}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const char = otpCode[index] || '';
                const isCurrent = otpCode.length === index;
                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      isCurrent && styles.otpBoxFocused,
                      !!char && styles.otpBoxFilled,
                    ]}
                  >
                    <Text style={styles.otpChar}>{char}</Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            <Button
              title="XÁC THỰC TÀI KHOẢN"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleVerify}
              style={styles.submitBtn}
            />

            {/* Cooldown Resend */}
            <View style={styles.resendSection}>
              <Text style={styles.resendText}>Chưa nhận được mã?</Text>
              {cooldown > 0 ? (
                <Text style={styles.cooldownText}>Gửi lại sau ({cooldown}s)</Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={styles.resendLink}>Gửi lại ngay</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  emailHighlighted: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  errorAlertText: {
    flex: 1,
    color: Colors.danger,
    fontSize: 13,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: Spacing.lg,
  },
  otpBox: {
    width: 46,
    height: 54,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  otpBoxFilled: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
  },
  otpChar: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  submitBtn: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  resendSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  resendText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cooldownText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  resendLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: 6,
  },
});

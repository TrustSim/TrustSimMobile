import React, { useState } from 'react';
import {
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
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/apiClient';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!userName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Vui lòng điền đầy đủ tất cả thông tin.');
      return;
    }

    if (userName.trim().length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Địa chỉ email không hợp lệ.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await register({
        userName: userName.trim(),
        email: email.trim(),
        password,
      });

      // Navigate to Email OTP screen with email prefilled
      router.push({
        pathname: '/verify-email',
        params: { email: email.trim() },
      });
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Đăng ký tài khoản không thành công.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Đăng Ký Tài Khoản" showBack onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeStep}>
                <Text style={styles.badgeStepText}>Bước 1 / 2</Text>
              </View>
              <Text style={styles.formTitle}>Tạo Tài Khoản Mới</Text>
              <Text style={styles.formSubtitle}>
                Hệ thống sẽ gửi mã xác thực OTP 6 số đến email của bạn ở bước kế tiếp
              </Text>
            </View>

            {error && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            <Input
              label="Tên đăng nhập"
              placeholder="Ví dụ: nguyenvana"
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="none"
              hint="3-50 ký tự, không dấu cách"
              leftIcon={<Ionicons name="person-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Địa chỉ Email"
              placeholder="vidu@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              hint="Dùng để nhận mã xác nhận và thông báo giao dịch"
              leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Mật khẩu"
              placeholder="Tối thiểu 6 ký tự..."
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu..."
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={Colors.textSecondary} />}
            />

            <Button
              title="TIẾP TỤC"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleRegister}
              style={styles.submitBtn}
            />
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Đăng Nhập Ngay</Text>
            </TouchableOpacity>
          </View>
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
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  badgeStep: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xs,
  },
  badgeStepText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400E',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
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
  submitBtn: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: 6,
  },
});

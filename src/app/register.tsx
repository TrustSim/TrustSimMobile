import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo Brand Header */}
          <View style={styles.brandHeader}>
            <Image
              source={require('../../assets/images/logo/TrustSim-Logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.badgeStep}>
                <Text style={styles.badgeStepText}>Bước 1 / 2</Text>
              </View>
              <Text style={styles.formTitle}>Tạo Tài Khoản Mới</Text>
              <Text style={styles.formSubtitle}>
                Hệ thống sẽ gửi mã xác thực 6 số đến email của bạn ở bước kế tiếp
              </Text>
            </View>

            {error && (
              <View style={styles.errorAlert}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.danger} />
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
              leftIcon={<MaterialCommunityIcons name="account-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Địa chỉ Email"
              placeholder="vidu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              hint="Dùng để nhận mã OTP và thông báo giao dịch"
              leftIcon={<MaterialCommunityIcons name="email-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChangeText={setPassword}
              isPassword
              hint="Tối thiểu 6 ký tự"
              leftIcon={<MaterialCommunityIcons name="lock-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Xác nhận mật khẩu"
              placeholder="Nhập lại mật khẩu..."
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              leftIcon={<MaterialCommunityIcons name="lock-check-outline" size={18} color={Colors.textSecondary} />}
            />

            <Button
              title="TIẾP TỤC"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleRegister}
              style={styles.registerBtn}
            />

            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={styles.loginLinkText}>Đăng nhập</Text>
              </TouchableOpacity>
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
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandLogo: {
    width: 200,
    height: 54,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  cardHeader: {
    marginBottom: Spacing.lg,
  },
  badgeStep: {
    backgroundColor: Colors.primaryLight + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  badgeStepText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.blue,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorAlertText: {
    fontSize: 13,
    color: Colors.danger,
    flex: 1,
  },
  registerBtn: {
    marginTop: Spacing.sm,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  loginPromptText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.blue,
  },
});

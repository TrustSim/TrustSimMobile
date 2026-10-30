import React, { useState } from 'react';
import {
  Alert,
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
import { Input } from '../components/Input';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/apiClient';
import { BiometricService } from '../services/biometricService';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [userNameOrEmail, setUserNameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!userNameOrEmail.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập/email và mật khẩu.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login({ userNameOrEmail: userNameOrEmail.trim(), password });
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Đăng nhập không thành công.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const res = await BiometricService.authenticate('Đăng nhập nhanh bằng vân tay hoặc FaceID');
    if (res.success) {
      Alert.alert('Sinh trắc học thành công', 'Xác thực sinh trắc học trên thiết bị thành công!');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo Brand Header từ frontend */}
          <View style={styles.brandContainer}>
            <Image
              source={require('../../assets/images/logo/TrustSim-Logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandSubtitle}>
              Nền Tảng Giao Dịch & Chuyển Nhượng SIM Có Kiểm Chứng
            </Text>
          </View>

          {/* Form Card */}
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Đăng Nhập Tài Khoản</Text>

            {error && (
              <View style={styles.errorAlert}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            <Input
              label="Tên đăng nhập hoặc Email"
              placeholder="Nhập tên đăng nhập hoặc email..."
              value={userNameOrEmail}
              onChangeText={setUserNameOrEmail}
              autoCapitalize="none"
              leftIcon={<MaterialCommunityIcons name="account-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon={<MaterialCommunityIcons name="lock-outline" size={18} color={Colors.textSecondary} />}
            />

            <Button
              title="ĐĂNG NHẬP"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleLogin}
              style={styles.loginBtn}
            />

            {/* Quick Biometrics Login */}
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.biometricBtn}
                onPress={handleBiometricLogin}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="fingerprint" size={24} color={Colors.blue} />
                <Text style={styles.biometricBtnText}>Đăng nhập nhanh bằng Sinh trắc học</Text>
              </TouchableOpacity>
            )}

            <View style={styles.registerPrompt}>
              <Text style={styles.registerPromptText}>Chưa có tài khoản TrustSim? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLinkText}>Đăng ký ngay</Text>
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
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brandLogo: {
    width: 220,
    height: 64,
    marginBottom: Spacing.xs,
  },
  brandSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  formCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
    marginBottom: Spacing.lg,
    textAlign: 'center',
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
  loginBtn: {
    marginTop: Spacing.sm,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  biometricBtnText: {
    fontSize: 14,
    color: Colors.blue,
    fontWeight: '600',
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  registerPromptText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.blue,
  },
});

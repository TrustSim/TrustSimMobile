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
      // If biometrics passed and stored credentials exist
      Alert.alert('Sinh trắc học thành công', 'Xác thực sinh trắc học thiết bị thành công!');
    }
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark" size={38} color={Colors.textInverse} />
            </View>
            <Text style={styles.brandTitle}>TrustSim</Text>
            <Text style={styles.brandSubtitle}>
              Sàn Giao Dịch & Đấu Giá SIM Số Đẹp Uy Tín
            </Text>
          </View>

          {/* Form Card */}
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Đăng Nhập Tài Khoản</Text>

            {error && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            <Input
              label="Tên đăng nhập hoặc Email"
              placeholder="Nhập tên đăng nhập hoặc email..."
              value={userNameOrEmail}
              onChangeText={setUserNameOrEmail}
              autoCapitalize="none"
              leftIcon={<Ionicons name="person-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />}
            />

            <Button
              title="ĐĂNG NHẬP"
              variant="primary"
              size="lg"
              loading={loading}
              onPress={handleLogin}
              style={styles.submitBtn}
            />

            {/* Biometric Icon button */}
            <TouchableOpacity
              style={styles.bioBtn}
              onPress={handleBiometricLogin}
              activeOpacity={0.7}
            >
              <Ionicons name="finger-print" size={24} color={Colors.primary} />
              <Text style={styles.bioBtnText}>Đăng nhập sinh trắc học (FaceID / Vân tay)</Text>
            </TouchableOpacity>
          </Card>

          {/* Footer Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản TrustSim?</Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}>Đăng Ký Ngay</Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  formCard: {
    padding: Spacing.xl,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
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
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  bioBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.xs,
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
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.accent,
    marginLeft: 6,
  },
});

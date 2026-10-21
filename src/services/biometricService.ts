import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export class BiometricService {
  // Check if current device supports hardware biometrics (Fingerprint/FaceID)
  static async isSupported(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch {
      return false;
    }
  }

  // Get available biometric types on device
  static async getBiometricTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    if (Platform.OS === 'web') return [];
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch {
      return [];
    }
  }

  // Prompt hardware biometric authentication (BiometricPrompt / LocalAuthentication)
  static async authenticate(
    promptMessage = 'Xác thực vân tay hoặc FaceID để tiếp tục'
  ): Promise<{ success: boolean; error?: string }> {
    if (Platform.OS === 'web') {
      return { success: true };
    }
    try {
      const supported = await this.isSupported();
      if (!supported) {
        return { success: false, error: 'Thiết bị chưa cài đặt hoặc không hỗ trợ sinh trắc học' };
      }

      const res = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Hủy bỏ',
        fallbackLabel: 'Dùng mã OTP',
        disableDeviceFallback: true, // Requires real biometric hardware, no passcode fallback
      });

      if (res.success) {
        return { success: true };
      }
      return { success: false, error: res.error || 'Xác thực sinh trắc học không thành công' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi cảm biến sinh trắc học' };
    }
  }
}

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { BiometricService } from '../services/biometricService';

interface BiometricPromptModalProps {
  visible: boolean;
  tradeCode: string;
  simNumber: string;
  onSuccess: () => void;
  onFallbackToOtp: () => void;
  onClose: () => void;
}

export const BiometricPromptModal: React.FC<BiometricPromptModalProps> = ({
  visible,
  tradeCode,
  simNumber,
  onSuccess,
  onFallbackToOtp,
  onClose,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerBiometrics = useCallback(async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    try {
      const res = await BiometricService.authenticate(
        `Xác thực vân tay/FaceID ký hợp đồng SIM ${simNumber} (${tradeCode})`
      );
      if (res.success) {
        onSuccess();
      } else {
        setErrorMessage(res.error || 'Xác thực sinh trắc học không thành công');
      }
    } finally {
      setIsAuthenticating(false);
    }
  }, [simNumber, tradeCode, onSuccess]);

  useEffect(() => {
    if (visible) {
      triggerBiometrics();
    } else {
      setErrorMessage(null);
      setIsAuthenticating(false);
    }
  }, [visible, triggerBiometrics]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Biometric Sensor Icon */}
          <View style={styles.sensorCircle}>
            <Ionicons name="finger-print" size={56} color={Colors.primary} />
          </View>

          <Text style={styles.dialogTitle}>Xác Thực Sinh Trắc Học</Text>

          <Text style={styles.dialogSubtitle}>
            Chạm ngón tay vào cảm biến vân tay hoặc nhìn vào màn hình FaceID để xác nhận ký kết
            hợp đồng chuyển nhượng SIM số:
          </Text>

          <View style={styles.badgeInfo}>
            <Text style={styles.simText}>{simNumber}</Text>
            <Text style={styles.tradeText}>Mã giao dịch: {tradeCode}</Text>
          </View>

          {isAuthenticating && (
            <View style={styles.authenticatingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.authText}>Đang chờ quét vân tay / FaceID...</Text>
            </View>
          )}

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity onPress={triggerBiometrics} style={styles.retryBtn}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="DÙNG MÃ EMAIL OTP"
              variant="outline"
              size="md"
              onPress={onFallbackToOtp}
              style={styles.otpBtn}
            />
            <Button
              title="Hủy Bỏ"
              variant="ghost"
              size="sm"
              onPress={onClose}
              style={styles.cancelBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  sensorCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  dialogTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  dialogSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  badgeInfo: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.md,
  },
  simText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  tradeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  authenticatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  authText: {
    fontSize: 13,
    color: Colors.primary,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  errorBox: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 4,
    padding: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  actions: {
    width: '100%',
    marginTop: Spacing.md,
  },
  otpBtn: {
    width: '100%',
    marginBottom: Spacing.xs,
  },
  cancelBtn: {
    width: '100%',
  },
});

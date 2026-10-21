import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { BorderRadius, Colors, Spacing } from '../constants/theme';

interface TelcoRadarModalProps {
  visible: boolean;
  phoneNumber: string;
  onCompleted: () => void;
  onClose: () => void;
}

export const TelcoRadarModal: React.FC<TelcoRadarModalProps> = ({
  visible,
  phoneNumber,
  onCompleted,
  onClose,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) {
      setStep(1);
      setIsSuccess(false);
      return;
    }

    // Step 1: Connecting to Telco Gateway
    const t1 = setTimeout(() => setStep(2), 1200);
    // Step 2: Querying Subscriber Data
    const t2 = setTimeout(() => setStep(3), 2400);
    // Step 3: Matching CCCD with SIM Ownership
    const t3 = setTimeout(() => {
      setStep(4);
      setIsSuccess(true);
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {isSuccess ? (
            <View style={styles.successState}>
              <View style={styles.successIconCircle}>
                <Ionicons name="shield-checkmark" size={54} color={Colors.textInverse} />
              </View>
              <Text style={styles.successTitle}>XÁC MINH SIM THÀNH CÔNG!</Text>
              <Text style={styles.successDesc}>
                Số SIM <Text style={{ fontWeight: '800' }}>{phoneNumber}</Text> đã được xác minh
                chính chủ khớp với thông tin định danh của bạn.
              </Text>
              <Button
                title="Về Kho SIM Của Tôi"
                variant="primary"
                size="md"
                onPress={onCompleted}
                style={styles.actionBtn}
              />
            </View>
          ) : (
            <View style={styles.radarState}>
              <View style={styles.radarCircle}>
                <Ionicons name="radio" size={48} color={Colors.primary} />
                <ActivityIndicator
                  size="large"
                  color={Colors.accent}
                  style={styles.spinnerOverlay}
                />
              </View>

              <Text style={styles.radarTitle}>Đang Kiểm Tra Với Nhà Mạng</Text>
              <Text style={styles.simText}>{phoneNumber}</Text>

              {/* Progress steps */}
              <View style={styles.stepsContainer}>
                <View style={styles.stepRow}>
                  <Ionicons
                    name={step >= 1 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={step >= 1 ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.stepText, step >= 1 && styles.stepActive]}>
                    1. Kết nối an toàn đến hệ thống nhà mạng
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <Ionicons
                    name={step >= 2 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={step >= 2 ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.stepText, step >= 2 && styles.stepActive]}>
                    2. Kiểm tra thông tin thuê bao và tình trạng hoạt động
                  </Text>
                </View>

                <View style={styles.stepRow}>
                  <Ionicons
                    name={step >= 3 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={step >= 3 ? Colors.success : Colors.textMuted}
                  />
                  <Text style={[styles.stepText, step >= 3 && styles.stepActive]}>
                    3. Đối chiếu thông tin chủ sở hữu
                  </Text>
                </View>
              </View>

              <Text style={styles.noteText}>Vui lòng giữ kết nối, quá trình mất khoảng vài giây...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  radarState: {
    alignItems: 'center',
  },
  radarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  spinnerOverlay: {
    position: 'absolute',
  },
  radarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  simText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  stepText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  stepActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  successState: {
    alignItems: 'center',
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  successDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    width: '100%',
  },
});

import React, { useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { BorderRadius, Colors, Spacing } from '../constants/theme';

interface SignaturePadModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (base64Signature: string) => void;
}

interface Point {
  x: number;
  y: number;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const [paths, setPaths] = useState<Point[][]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [penColor, setPenColor] = useState<string>('#1E3A8A'); // Default Blue ink

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setPaths((prev) => [...prev, currentPath]);
        setCurrentPath([]);
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const handleSave = () => {
    if (paths.length === 0 && currentPath.length === 0) {
      alert('Vui lòng ký tên của bạn vào khung trước khi lưu.');
      return;
    }
    // Generate simulated Base64 signature image payload for PAdES sealing
    const simulatedBase64 = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAACWCAMAAAD7f${Date.now()}SigTrustSim`;
    onConfirm(simulatedBase64);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="pencil" size={20} color={Colors.primary} />
              <Text style={styles.title}>Vẽ Chữ Ký Tay Điện Tử</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.instruction}>
            Vui lòng dùng ngón tay hoặc bút cảm ứng ký tên vào khung bên dưới:
          </Text>

          {/* Canvas Area */}
          <View style={styles.canvasContainer} {...panResponder.panHandlers}>
            <View style={styles.signatureLine} />
            <Text style={styles.watermarkText}>(Ký bằng ngón tay hoặc bút cảm ứng)</Text>

            {/* Simple point rendering preview */}
            {paths.map((path, idx) => (
              <View key={idx} style={StyleSheet.absoluteFill} pointerEvents="none">
                {path.map((pt, pIdx) => (
                  <View
                    key={pIdx}
                    style={[
                      styles.pointDot,
                      { left: pt.x, top: pt.y, backgroundColor: penColor },
                    ]}
                  />
                ))}
              </View>
            ))}

            {currentPath.map((pt, pIdx) => (
              <View
                key={pIdx}
                style={[
                  styles.pointDot,
                  { left: pt.x, top: pt.y, backgroundColor: penColor },
                ]}
              />
            ))}
          </View>

          {/* Color & Tool Options */}
          <View style={styles.toolsRow}>
            <View style={styles.colorGroup}>
              <Text style={styles.toolLabel}>Màu mực:</Text>
              <TouchableOpacity
                style={[
                  styles.colorBtn,
                  { backgroundColor: '#1E3A8A' },
                  penColor === '#1E3A8A' && styles.colorSelected,
                ]}
                onPress={() => setPenColor('#1E3A8A')}
              />
              <TouchableOpacity
                style={[
                  styles.colorBtn,
                  { backgroundColor: '#0F172A' },
                  penColor === '#0F172A' && styles.colorSelected,
                ]}
                onPress={() => setPenColor('#0F172A')}
              />
            </View>

            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
              <Text style={styles.clearBtnText}>Xóa làm lại</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.legalNotice}>
            Chữ ký tay này sẽ được gắn vào văn bản hợp đồng và biên bản bàn giao SIM để đảm bảo tính pháp lý.
          </Text>

          {/* Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title="Lưu và Sử Dụng Chữ Ký"
              variant="primary"
              size="md"
              onPress={handleSave}
              style={styles.saveBtn}
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
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  instruction: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  canvasContainer: {
    height: 220,
    backgroundColor: '#FAF5FF',
    borderWidth: 2,
    borderColor: '#E9D5FF',
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden',
  },
  signatureLine: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  watermarkText: {
    position: 'absolute',
    bottom: 15,
    width: '100%',
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
  },
  pointDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  colorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  colorBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: Spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: Colors.accent,
    transform: [{ scale: 1.15 }],
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.danger,
    marginLeft: 4,
  },
  legalNotice: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    lineHeight: 16,
  },
  actionButtons: {
    marginTop: Spacing.lg,
  },
  saveBtn: {
    width: '100%',
  },
});

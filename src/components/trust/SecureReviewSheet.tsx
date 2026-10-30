/**
 * SecureReviewSheet — bottom sheet modal for confirm-before-commit.
 * Used for ALL money actions and contract confirmations.
 * Sensitive data is always masked. Action CTA must be explicit.
 */
import React from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';

export interface ReviewItem {
  label: string;
  value: string;
  /** Mask the value with •••• except last 4 chars */
  masked?: boolean;
  /** Highlight this row (e.g. amount) */
  prominent?: boolean;
}

interface SecureReviewSheetProps {
  visible: boolean;
  title: string;
  /** Explicit CTA text — must describe the action, e.g. "Xác nhận rút 2.000.000 ₫" */
  confirmLabel: string;
  items: ReviewItem[];
  warning?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  style?: ViewStyle;
}

function maskValue(value: string): string {
  if (value.length <= 4) return '••••';
  return '••••' + value.slice(-4);
}

export function SecureReviewSheet({
  visible,
  title,
  confirmLabel,
  items,
  warning,
  onConfirm,
  onCancel,
  loading = false,
}: SecureReviewSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.dismissArea} onPress={onCancel} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.shieldIcon}>
              <MaterialCommunityIcons name="shield-check-outline" size={20} color={Colors.blue} />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>

          <Text style={styles.subtitle}>Vui lòng kiểm tra thông tin trước khi xác nhận</Text>

          {/* Review items */}
          <View style={styles.itemsContainer}>
            {items.map((item, i) => (
              <View key={i} style={[styles.itemRow, i > 0 && styles.itemBorder]}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={[styles.itemValue, item.prominent && styles.itemValueProminent]}>
                  {item.masked ? maskValue(item.value) : item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Warning */}
          {warning ? (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons name="information-outline" size={14} color={Colors.warning} />
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ) : null}

          {/* CTAs */}
          <TouchableOpacity
            style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
            onPress={onConfirm}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            accessibilityState={{ busy: loading, disabled: loading }}
          >
            {loading ? (
              <MaterialCommunityIcons name="loading" size={20} color="#fff" />
            ) : (
              <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#fff" />
            )}
            <Text style={styles.confirmBtnText}>{loading ? 'Đang xử lý…' : confirmLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={loading}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Hủy bỏ"
          >
            <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  shieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(22, 102, 197, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  itemsContainer: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  itemBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  itemLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  itemValueProminent: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.navy,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.warningLight,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  warningText: {
    fontSize: 12,
    color: Colors.warning,
    flex: 1,
    lineHeight: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blue,
    borderRadius: 12,
    minHeight: 52,
    marginBottom: Spacing.sm,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});


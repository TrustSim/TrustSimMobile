import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Card } from './Card';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { vietQrService } from '../services/vietQrService';
import { walletService } from '../services/walletService';
import { DepositResponseDto } from '../types';

interface VietQrPaymentViewProps {
  depositData: DepositResponseDto;
  onSuccess: () => void;
  onClose: () => void;
}

export const VietQrPaymentView: React.FC<VietQrPaymentViewProps> = ({
  depositData,
  onSuccess,
  onClose,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30 * 60);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isPolling, setIsPolling] = useState<boolean>(true);
  const [isSavingQr, setIsSavingQr] = useState<boolean>(false);

  // Initialize countdown
  useEffect(() => {
    const expiredTime = new Date(depositData.expiredAt).getTime();
    const now = Date.now();
    const initialSeconds = Math.max(0, Math.floor((expiredTime - now) / 1000));
    setSecondsRemaining(initialSeconds > 0 ? initialSeconds : 30 * 60);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsPolling(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [depositData.expiredAt]);

  // Real-time polling for payment completion (every 2.5s)
  useEffect(() => {
    if (!isPolling || isCompleted) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await walletService.getTransactionById(depositData.transactionId);
        if (res.success && res.data?.status === 'COMPLETED') {
          setIsCompleted(true);
          setIsPolling(false);
          clearInterval(pollInterval);
        }
      } catch {
        // Continue polling on error
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [depositData.transactionId, isPolling, isCompleted]);

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatVnd = (amount: number) => {
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const handleSaveQr = async () => {
    setIsSavingQr(true);
    try {
      await vietQrService.saveQrImageToGallery(depositData.qrCodeUrl, depositData.transactionCode);
    } finally {
      setIsSavingQr(false);
    }
  };

  if (isCompleted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark-sharp" size={54} color={Colors.textInverse} />
        </View>
        <Text style={styles.successTitle}>Nạp Tiền Thành Công!</Text>
        <Text style={styles.successAmount}>{formatVnd(depositData.amount)}</Text>
        <Text style={styles.successDesc}>
          Hệ thống đã tự động cộng tiền vào số dư ví của bạn thành công.
        </Text>

        <Card style={styles.successInfoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mã giao dịch:</Text>
            <Text style={styles.infoValue}>{depositData.transactionCode}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trạng thái:</Text>
            <Text style={[styles.infoValue, { color: Colors.success, fontWeight: '700' }]}>
              Thành công (Đã cộng ví)
            </Text>
          </View>
        </Card>

        <Button
          title="Xem Số Dư Ví Mới"
          size="lg"
          variant="primary"
          onPress={onSuccess}
          style={styles.actionBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Countdown */}
      <View style={styles.timerHeader}>
        <Ionicons
          name="time-outline"
          size={20}
          color={secondsRemaining < 300 ? Colors.danger : Colors.warning}
        />
        <Text
          style={[
            styles.timerText,
            { color: secondsRemaining < 300 ? Colors.danger : Colors.warning },
          ]}
        >
          Thời gian giữ mã: {formatTimer(secondsRemaining)}
        </Text>
      </View>

      <Text style={styles.subTimerHint}>
        Hệ thống sẽ tự động cập nhật số dư ngay khi bạn chuyển khoản thành công
      </Text>

      {/* VietQR Image Card */}
      <Card style={styles.qrCard}>
        <Image
          source={{ uri: depositData.qrCodeUrl }}
          style={styles.qrImage}
          resizeMode="contain"
        />

        <Button
          title="Lưu ảnh QR vào bộ sưu tập"
          variant="outline"
          size="sm"
          loading={isSavingQr}
          icon={<Ionicons name="download-outline" size={18} color={Colors.primary} />}
          onPress={handleSaveQr}
          style={styles.saveQrBtn}
        />
      </Card>

      {/* Transfer Information */}
      <Card style={styles.detailsCard}>
        <Text style={styles.sectionHeader}>THÔNG TIN CHUYỂN KHOẢN</Text>

        <View style={styles.copyRow}>
          <View>
            <Text style={styles.detailLabel}>Số tài khoản</Text>
            <Text style={styles.detailValueBold}>070131881841</Text>
            <Text style={styles.detailSub}>Sacombank (STB) - CONG TY TNHH TRUSTSIM</Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => vietQrService.copyToClipboard('070131881841', 'Số tài khoản')}
          >
            <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            <Text style={styles.copyBtnText}>Sao chép</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.copyRow}>
          <View>
            <Text style={styles.detailLabel}>Số tiền nạp</Text>
            <Text style={[styles.detailValueBold, { color: Colors.primary }]}>
              {formatVnd(depositData.amount)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => vietQrService.copyToClipboard(depositData.amount.toString(), 'Số tiền')}
          >
            <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            <Text style={styles.copyBtnText}>Sao chép</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.copyRow}>
          <View>
            <Text style={styles.detailLabel}>Nội dung chuyển khoản (Bắt buộc)</Text>
            <Text style={[styles.detailValueBold, { color: Colors.danger }]}>
              {depositData.transferContent}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() =>
              vietQrService.copyToClipboard(depositData.transferContent, 'Nội dung chuyển tiền')
            }
          >
            <Ionicons name="copy-outline" size={16} color={Colors.primary} />
            <Text style={styles.copyBtnText}>Sao chép</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Live Polling Indicator */}
      <View style={styles.pollingIndicator}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.pollingText}>Đang chờ hệ thống ngân hàng xác nhận giao dịch...</Text>
      </View>

      <Button
        title="Đóng / Hoàn thành sau"
        variant="ghost"
        onPress={onClose}
        style={styles.closeBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: Spacing.xs,
  },
  subTimerHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  qrCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  qrImage: {
    width: 250,
    height: 250,
    borderRadius: BorderRadius.md,
    backgroundColor: '#FFFFFF',
  },
  saveQrBtn: {
    marginTop: Spacing.md,
    width: '100%',
  },
  detailsCard: {
    padding: Spacing.md,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailValueBold: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginVertical: 2,
  },
  detailSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  pollingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    fontStyle: 'italic',
  },
  closeBtn: {
    marginTop: Spacing.xs,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  successAmount: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  successDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  successInfoCard: {
    width: '100%',
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  actionBtn: {
    width: '100%',
  },
});

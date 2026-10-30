import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../components/Header';
import { MoneyField } from '../components/trust/MoneyField';
import { ReceiptScreen } from '../components/trust/ReceiptScreen';
import type { ReceiptData } from '../components/trust/ReceiptScreen';
import { VietQrPaymentView } from '../components/VietQrPaymentView';
import { BorderRadius, Colors, Shadows, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/apiClient';
import { walletService } from '../services/walletService';
import { DepositResponseDto } from '../types';

export default function DepositScreen() {
  const router = useRouter();
  const { wallet, refreshWallet } = useAuth();

  const [amount, setAmount] = useState<string>('500000');
  const [note, setNote] = useState<string>('Nạp tiền vào ví TrustSim');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States: 'input' | 'qr' | 'receipt'
  const [depositResult, setDepositResult] = useState<DepositResponseDto | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const quickAmounts = [100000, 200000, 500000, 1000000, 2000000, 5000000];

  const availableBal = wallet?.availableBalance ?? 0;
  const lockedBal = wallet?.lockedBalance ?? 0;

  const handleCreateVietQr = async () => {
    const numAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numAmount) || numAmount < 10000) {
      setError('Số tiền nạp tối thiểu là 10.000 ₫.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await walletService.deposit({
        amount: numAmount,
        note: note.trim() || undefined,
      });

      if (res.success && res.data) {
        setDepositResult(res.data);
      } else {
        throw new Error(res.message || 'Không thể tạo mã VietQR');
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi tạo yêu cầu nạp tiền'));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    await refreshWallet();
    const numAmount = depositResult?.amount || parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;
    setReceiptData({
      type: 'success',
      title: 'Nạp Tiền Thành Công',
      amountDisplay: `+ ${numAmount.toLocaleString('vi-VN')} ₫`,
      description: 'Số dư khả dụng trong ví của bạn đã được cập nhật thành công.',
      details: [
        { label: 'Phương thức', value: 'VietQR Napas 24/7' },
        { label: 'Nội dung', value: depositResult?.transferContent || note },
        { label: 'Trạng thái', value: 'Đã hạch toán' },
      ],
      referenceId: depositResult?.transactionCode,
      timestamp: new Date().toISOString(),
      nextSteps: [
        'Số tiền khả dụng ngay để đặt cọc đấu giá SIM.',
        'Bạn có thể kiểm tra biến động số dư trong phần Sao kê ví.',
      ],
    });
  };

  // Receipt screen shown upon payment completion
  if (receiptData) {
    return (
      <ReceiptScreen
        data={receiptData}
        onDone={() => {
          router.replace('/(tabs)/wallet');
        }}
        doneLabel="Về Ví Tiền"
      />
    );
  }

  const numAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header
        title={depositResult ? 'Thanh Toán VietQR' : 'Nạp Tiền Vào Ví'}
        showBack
        onBack={() => {
          if (depositResult) {
            setDepositResult(null);
          } else {
            router.back();
          }
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {depositResult ? (
            /* Live VietQR Payment Screen */
            <VietQrPaymentView
              depositData={depositResult}
              onSuccess={handlePaymentSuccess}
              onClose={async () => {
                await refreshWallet();
                router.back();
              }}
            />
          ) : (
            /* Deposit Form */
            <View>
              {/* Separate Balances */}
              <MoneyField
                rows={[
                  { label: 'Số dư khả dụng hiện tại', amount: availableBal, color: Colors.navy },
                  { label: 'Đang giữ cọc đấu giá', amount: lockedBal, color: Colors.warning, note: 'Tạm khóa an toàn' },
                ]}
                style={{ marginBottom: Spacing.lg }}
              />

              {/* Payment Method Selector */}
              <View style={styles.methodCard}>
                <View style={styles.methodHeader}>
                  <View style={styles.methodIconBox}>
                    <MaterialCommunityIcons name="qrcode-scan" size={24} color={Colors.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.methodTitleRow}>
                      <Text style={styles.methodTitle}>Chuyển khoản VietQR 24/7</Text>
                      <View style={styles.badgeAuto}>
                        <Text style={styles.badgeAutoText}>Khớp lệnh tự động</Text>
                      </View>
                    </View>
                    <Text style={styles.methodDesc}>Quét mã QR từ mọi ứng dụng ngân hàng và ví điện tử</Text>
                  </View>
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>SỐ TIỀN CẦN NẠP (₫)</Text>

                <View style={styles.amountInputRow}>
                  <TextInput
                    style={styles.amountInput}
                    value={numAmount > 0 ? numAmount.toLocaleString('vi-VN') : ''}
                    onChangeText={(val) => setAmount(val.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.inputCurrency}>₫</Text>
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={14} color={Colors.danger} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Quick Select Buttons */}
                <Text style={styles.quickLabel}>Chọn nhanh số tiền:</Text>
                <View style={styles.quickGrid}>
                  {quickAmounts.map((q) => {
                    const isSelected = numAmount === q;
                    return (
                      <TouchableOpacity
                        key={q}
                        style={[styles.quickBtn, isSelected && styles.quickBtnSelected]}
                        onPress={() => setAmount(q.toString())}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.quickBtnText, isSelected && styles.quickBtnTextSelected]}>
                          {(q / 1000).toLocaleString('vi-VN')}k
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Security Banner */}
              <View style={styles.securityBox}>
                <MaterialCommunityIcons name="shield-check-outline" size={18} color={Colors.blue} />
                <Text style={styles.securityText}>
                  Miễn phí giao dịch. Tiền vào tài khoản ví trong 10–30 giây sau khi quét mã thành công.
                </Text>
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.submitBtn, (loading || numAmount < 10000) && styles.submitBtnDisabled]}
                onPress={handleCreateVietQr}
                disabled={loading || numAmount < 10000}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Tạo mã VietQR nạp tiền"
              >
                <MaterialCommunityIcons name="qrcode" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {loading
                    ? 'Đang tạo mã...'
                    : `Tạo mã QR nạp ${numAmount > 0 ? numAmount.toLocaleString('vi-VN') + ' ₫' : ''}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
    paddingBottom: Spacing.xxxl,
  },
  methodCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.blue,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  methodIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(22, 102, 197, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  badgeAuto: {
    backgroundColor: Colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeAutoText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
  },
  methodDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  inputCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.blue,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.md,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    padding: 0,
  },
  inputCurrency: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    borderRadius: 6,
    padding: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnSelected: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(22, 102, 197, 0.08)',
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  quickBtnTextSelected: {
    color: Colors.blue,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.xl,
  },
  securityText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.md,
    minHeight: 52,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});

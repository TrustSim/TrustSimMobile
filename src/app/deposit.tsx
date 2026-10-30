import React, { useState } from 'react';
import {
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
import { Header } from '../components/Header';
import { BottomNavBar } from '../components/BottomNavBar';
import { Input } from '../components/Input';
import { VietQrPaymentView } from '../components/VietQrPaymentView';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/apiClient';
import { walletService } from '../services/walletService';
import { DepositResponseDto } from '../types';

export default function DepositScreen() {
  const router = useRouter();
  const { wallet, refreshWallet } = useAuth();

  const [amount, setAmount] = useState<string>('500000');
  const [note, setNote] = useState<string>('Nạp tiền vào tài khoản');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active VietQR Deposit response (triggers SCR-06 state)
  const [depositResult, setDepositResult] = useState<DepositResponseDto | null>(null);

  const quickAmounts = [100000, 200000, 500000, 1000000, 2000000, 5000000];

  const formatVnd = (val?: number) => {
    if (typeof val !== 'number') return '0 đ';
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const handleCreateVietQr = async () => {
    const numAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numAmount) || numAmount < 10000) {
      setError('Số tiền nạp tối thiểu là 10.000 VNĐ.');
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

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header
        title={depositResult ? 'Thanh Toán Chuyển Khoản QR' : 'Nạp Tiền Vào Ví'}
        showBack
        showHome
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
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {depositResult ? (
            /* Live VietQR Payment Screen */
            <VietQrPaymentView
              depositData={depositResult}
              onSuccess={async () => {
                await refreshWallet();
                router.back();
              }}
              onClose={async () => {
                await refreshWallet();
                router.back();
              }}
            />
          ) : (
            /* Deposit Form */
            <View>
              {/* Current Balance Overview */}
              <Card style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Số dư ví hiện tại:</Text>
                <Text style={styles.balanceAmount}>{formatVnd(wallet?.availableBalance)}</Text>
              </Card>

              {/* Deposit Input Form */}
              <Card style={styles.formCard}>
                {error && (
                  <View style={styles.errorAlert}>
                    <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                    <Text style={styles.errorAlertText}>{error}</Text>
                  </View>
                )}

                <Input
                  label="Số tiền muốn nạp (VNĐ)"
                  placeholder="Ví dụ: 500000"
                  value={amount}
                  onChangeText={(val) => setAmount(val.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  hint="Tối thiểu: 10.000 VNĐ • Miễn phí giao dịch"
                  leftIcon={<Ionicons name="cash-outline" size={18} color={Colors.primary} />}
                />

                {/* Quick Amount Chips */}
                <Text style={styles.quickLabel}>CHỌN NHANH SỐ TIỀN:</Text>
                <View style={styles.quickGrid}>
                  {quickAmounts.map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={[
                        styles.quickChip,
                        amount === q.toString() && styles.quickChipSelected,
                      ]}
                      onPress={() => setAmount(q.toString())}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          amount === q.toString() && styles.quickChipTextSelected,
                        ]}
                      >
                        {formatVnd(q)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Payment Method Badge */}
                <View style={styles.methodBox}>
                  <View style={styles.methodRadio}>
                    <View style={styles.methodRadioInner} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <Text style={styles.methodTitle}>Chuyển khoản ngân hàng qua mã QR</Text>
                    <Text style={styles.methodDesc}>
                      Chuyển khoản nhanh 24/7 • Tiền vào ví tự động ngay lập tức
                    </Text>
                  </View>
                </View>

                <Input
                  label="Ghi chú nạp tiền (Tùy chọn)"
                  placeholder="Ghi chú thêm..."
                  value={note}
                  onChangeText={setNote}
                  leftIcon={<Ionicons name="create-outline" size={18} color={Colors.textSecondary} />}
                />

                <Button
                  title="TẠO MÃ QR NẠP TIỀN"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  icon={<Ionicons name="qr-code" size={18} color={Colors.textInverse} />}
                  onPress={handleCreateVietQr}
                  style={styles.createBtn}
                />
              </Card>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomNavBar activeTab="wallet" />
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
  },
  balanceCard: {
    backgroundColor: 'rgba(30, 58, 138, 0.06)',
    borderColor: 'rgba(30, 58, 138, 0.15)',
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },
  formCard: {
    padding: Spacing.xl,
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
  quickLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  quickChipTextSelected: {
    color: Colors.textInverse,
  },
  methodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1.5,
    borderColor: Colors.success,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  methodDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  createBtn: {
    marginTop: Spacing.md,
  },
});

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
import { Header } from '../components/Header';
import { BottomNavBar } from '../components/BottomNavBar';
import { Input } from '../components/Input';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/apiClient';
import { walletService } from '../services/walletService';

export default function WithdrawScreen() {
  const router = useRouter();
  const { wallet, refreshWallet } = useAuth();

  const [amount, setAmount] = useState<string>('');
  const [bankCode, setBankCode] = useState<string>('MB');
  const [bankName, setBankName] = useState<string>('Ngân hàng TMCP Quân Đội (MB Bank)');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [note, setNote] = useState<string>('Rút tiền về tài khoản ngân hàng');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const bankOptions = [
    { code: 'MB', name: 'Ngân hàng TMCP Quân Đội (MB Bank)' },
    { code: 'VCB', name: 'Ngân hàng Ngoại Thương (Vietcombank)' },
    { code: 'TCB', name: 'Ngân hàng Kỹ Thương (Techcombank)' },
    { code: 'STB', name: 'Ngân hàng Sài Gòn Thương Tín (Sacombank)' },
    { code: 'BIDV', name: 'Ngân hàng Đầu tư & Phát triển (BIDV)' },
    { code: 'CTG', name: 'Ngân hàng Công Thương (Vietinbank)' },
  ];

  const formatVnd = (val?: number) => {
    if (typeof val !== 'number') return '0 đ';
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const handleWithdraw = async () => {
    const numAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    const available = wallet?.availableBalance || 0;

    if (isNaN(numAmount) || numAmount < 50000) {
      setError('Số tiền rút tối thiểu là 50.000 VNĐ.');
      return;
    }

    if (numAmount > available) {
      setError(`Số tiền rút vượt quá số dư khả dụng (${formatVnd(available)}).`);
      return;
    }

    if (!accountNumber.trim()) {
      setError('Vui lòng nhập số tài khoản ngân hàng thụ hưởng.');
      return;
    }

    if (!accountHolderName.trim()) {
      setError('Vui lòng nhập tên chủ tài khoản thụ hưởng.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await walletService.withdraw({
        amount: numAmount,
        destinationBankCode: bankCode,
        destinationBankName: bankName,
        destinationAccountNumber: accountNumber.trim(),
        destinationAccountHolderName: accountHolderName.toUpperCase().trim(),
        note: note.trim() || undefined,
      });

      if (res.success) {
        await refreshWallet();
        Alert.alert(
          'Lập lệnh rút tiền thành công!',
          `Hệ thống đã tiếp nhận lệnh rút ${formatVnd(numAmount)} về tài khoản ${accountNumber} (${bankCode}). Tiền sẽ được chuyển trong 1-5 phút.`,
          [{ text: 'Về Ví Của Tôi', onPress: () => router.back() }]
        );
      } else {
        throw new Error(res.message || 'Rút tiền thất bại');
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi xử lý yêu cầu rút tiền.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Rút Tiền Về Ngân Hàng" showBack onBack={() => router.back()} showHome />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Balance card */}
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Số dư khả dụng có thể rút:</Text>
            <Text style={styles.balanceAmount}>{formatVnd(wallet?.availableBalance)}</Text>
          </Card>

          <Card style={styles.formCard}>
            {error && (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text style={styles.errorAlertText}>{error}</Text>
              </View>
            )}

            <Input
              label="Số tiền muốn rút (VNĐ)"
              placeholder="Ví dụ: 500000"
              value={amount}
              onChangeText={(val) => setAmount(val.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              hint="Tối thiểu: 50.000 VNĐ • Phí rút: Miễn phí"
              leftIcon={<Ionicons name="cash-outline" size={18} color={Colors.primary} />}
            />

            {/* Quick Fill All */}
            <TouchableOpacity
              style={styles.fillAllBtn}
              onPress={() => setAmount(Math.floor(wallet?.availableBalance || 0).toString())}
            >
              <Text style={styles.fillAllText}>Rút toàn bộ số dư</Text>
            </TouchableOpacity>

            {/* Select Bank */}
            <Text style={styles.fieldLabel}>CHỌN NGÂN HÀNG THỤ HƯỞNG:</Text>
            <View style={styles.bankGrid}>
              {bankOptions.map((b) => (
                <TouchableOpacity
                  key={b.code}
                  style={[
                    styles.bankChip,
                    bankCode === b.code && styles.bankChipSelected,
                  ]}
                  onPress={() => {
                    setBankCode(b.code);
                    setBankName(b.name);
                  }}
                >
                  <Text
                    style={[
                      styles.bankChipText,
                      bankCode === b.code && styles.bankChipTextSelected,
                    ]}
                  >
                    {b.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.selectedBankSub}>{bankName}</Text>

            <Input
              label="Số tài khoản ngân hàng"
              placeholder="Nhập số tài khoản..."
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              leftIcon={<Ionicons name="card-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Tên chủ tài khoản (Viết hoa không dấu)"
              placeholder="Ví dụ: NGUYEN VAN A"
              value={accountHolderName}
              onChangeText={(val) => setAccountHolderName(val.toUpperCase())}
              autoCapitalize="characters"
              hint="Bắt buộc trùng khớp với tên trên thẻ ngân hàng"
              leftIcon={<Ionicons name="person-outline" size={18} color={Colors.textSecondary} />}
            />

            <Input
              label="Ghi chú chuyển khoản (Tùy chọn)"
              placeholder="Ghi chú..."
              value={note}
              onChangeText={setNote}
              leftIcon={<Ionicons name="create-outline" size={18} color={Colors.textSecondary} />}
            />

            <Button
              title="XÁC NHẬN RÚT TIỀN"
              variant="primary"
              size="lg"
              loading={loading}
              icon={<Ionicons name="arrow-up-circle" size={18} color={Colors.textInverse} />}
              onPress={handleWithdraw}
              style={styles.submitBtn}
            />
          </Card>
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
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.success,
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
  fillAllBtn: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  fillAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  bankChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bankChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  bankChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  bankChipTextSelected: {
    color: Colors.textInverse,
  },
  selectedBankSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  submitBtn: {
    marginTop: Spacing.md,
  },
});

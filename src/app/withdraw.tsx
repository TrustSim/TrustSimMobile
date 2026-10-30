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
import { SecureReviewSheet } from '../components/trust/SecureReviewSheet';
import type { ReviewItem } from '../components/trust/SecureReviewSheet';
import { BorderRadius, Colors, Shadows, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/apiClient';
import { BiometricService } from '../services/biometricService';
import { walletService } from '../services/walletService';

export default function WithdrawScreen() {
  const router = useRouter();
  const { wallet, refreshWallet, profile } = useAuth();

  const [amount, setAmount] = useState<string>('');
  const [bankCode, setBankCode] = useState<string>('MB');
  const [bankName, setBankName] = useState<string>('MB Bank');
  const [accountNumber, setAccountNumber] = useState<string>('0987654321');
  const [accountHolderName, setAccountHolderName] = useState<string>(
    profile?.fullName || 'NGUYEN VAN A'
  );
  const [note, setNote] = useState<string>('Rút tiền về tài khoản ngân hàng');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal and receipt states
  const [showReview, setShowReview] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  const bankOptions = [
    { code: 'MB', name: 'MB Bank', fullName: 'Ngân hàng TMCP Quân Đội' },
    { code: 'VCB', name: 'Vietcombank', fullName: 'Ngân hàng Ngoại Thương' },
    { code: 'TCB', name: 'Techcombank', fullName: 'Ngân hàng Kỹ Thương' },
    { code: 'STB', name: 'Sacombank', fullName: 'Ngân hàng Sài Gòn Thương Tín' },
    { code: 'BIDV', name: 'BIDV', fullName: 'Ngân hàng Đầu tư & Phát triển' },
    { code: 'CTG', name: 'Vietinbank', fullName: 'Ngân hàng Công Thương' },
  ];

  const availableBal = wallet?.availableBalance ?? 0;
  const numAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;

  const handleOpenReview = () => {
    if (numAmount < 50000) {
      setError('Số tiền rút tối thiểu là 50.000 ₫.');
      return;
    }
    if (numAmount > availableBal) {
      setError('Số dư khả dụng không đủ để thực hiện giao dịch.');
      return;
    }
    if (!accountNumber.trim()) {
      setError('Vui lòng nhập số tài khoản ngân hàng.');
      return;
    }
    setError(null);
    setShowReview(true);
  };

  const handleConfirmWithdraw = async () => {
    // 1. Biometric verification step
    setLoading(true);
    try {
      const bioResult = await BiometricService.authenticate(
        `Xác thực vân tay/FaceID để rút ${numAmount.toLocaleString('vi-VN')} ₫`
      );
      if (!bioResult.success && Platform.OS !== 'web') {
        // If biometric failed or not enrolled, proceed with password/alert
        setError(bioResult.error || 'Xác thực sinh trắc học không thành công');
        setShowReview(false);
        setLoading(false);
        return;
      }

      // 2. Call withdraw API
      const res = await walletService.withdraw({
        amount: numAmount,
        destinationBankCode: bankCode,
        destinationBankName: bankName,
        destinationAccountNumber: accountNumber.trim(),
        destinationAccountHolderName: accountHolderName.trim().toUpperCase(),
        note: note.trim() || undefined,
      });

      setShowReview(false);

      if (res.success && res.data) {
        await refreshWallet();
        setReceiptData({
          type: 'success',
          title: 'Lệnh Rút Tiền Đã Tiếp Nhận',
          amountDisplay: `- ${numAmount.toLocaleString('vi-VN')} ₫`,
          description: 'Hệ thống đang tiến hành chuyển tiền qua cổng NAPAS 24/7 tới ngân hàng của bạn.',
          details: [
            { label: 'Ngân hàng thụ hưởng', value: bankName },
            { label: 'Số tài khoản nhận', value: accountNumber, masked: true },
            { label: 'Chủ tài khoản', value: accountHolderName.toUpperCase() },
            { label: 'Phí giao dịch', value: '0 ₫ (Miễn phí)' },
            { label: 'Thời gian xử lý dự kiến', value: '1 - 3 phút' },
          ],
          referenceId: res.data.transactionCode,
          timestamp: new Date().toISOString(),
          nextSteps: [
            'Tiền sẽ được chuyển thẳng vào số tài khoản ngân hàng đã đăng ký.',
            'Nếu quá 15 phút chưa nhận được, vui lòng liên hệ hỗ trợ TrustSim.',
          ],
        });
      } else {
        throw new Error(res.message || 'Lỗi khi rút tiền');
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Lỗi rút tiền'));
      setShowReview(false);
    } finally {
      setLoading(false);
    }
  };

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

  const reviewItems: ReviewItem[] = [
    { label: 'Số tiền rút', value: `${numAmount.toLocaleString('vi-VN')} ₫`, prominent: true },
    { label: 'Phí dịch vụ', value: '0 ₫ (Miễn phí)' },
    { label: 'Ngân hàng nhận', value: bankName },
    { label: 'Tài khoản nhận', value: accountNumber, masked: true },
    { label: 'Tên người nhận', value: accountHolderName.toUpperCase() },
    { label: 'Thời gian xử lý', value: '24/7 (tối đa 5 phút)' },
  ];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Rút Tiền Về Ngân Hàng" showBack onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Available balance overview */}
          <MoneyField
            rows={[
              { label: 'Số dư khả dụng để rút', amount: availableBal, color: Colors.navy },
            ]}
            style={{ marginBottom: Spacing.lg }}
          />

          {/* Bank selector */}
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>NGÂN HÀNG THỤ HƯỞNG</Text>
            <View style={styles.bankGrid}>
              {bankOptions.map((b) => {
                const isSelected = bankCode === b.code;
                return (
                  <TouchableOpacity
                    key={b.code}
                    style={[styles.bankOption, isSelected && styles.bankOptionSelected]}
                    onPress={() => {
                      setBankCode(b.code);
                      setBankName(b.name);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.bankCodeText, isSelected && styles.bankCodeTextSelected]}>
                      {b.code}
                    </Text>
                    <Text style={styles.bankNameText} numberOfLines={1}>{b.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Account number */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>SỐ TÀI KHOẢN NGÂN HÀNG</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="credit-card-outline" size={18} color={Colors.navy} />
              <TextInput
                style={styles.textInput}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder="Nhập số tài khoản"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            {/* Holder Name */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.md }]}>TÊN CHỦ TÀI KHOẢN (KHÔNG DẤU)</Text>
            <View style={styles.inputBox}>
              <MaterialCommunityIcons name="account-outline" size={18} color={Colors.navy} />
              <TextInput
                style={[styles.textInput, { textTransform: 'uppercase' }]}
                value={accountHolderName}
                onChangeText={(val) => setAccountHolderName(val.toUpperCase())}
                placeholder="NGUYEN VAN A"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Amount to withdraw */}
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>SỐ TIỀN RÚT (₫)</Text>
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

            {/* Quick Withdraw All button */}
            <TouchableOpacity
              style={styles.withdrawAllBtn}
              onPress={() => setAmount(availableBal.toString())}
              activeOpacity={0.7}
            >
              <Text style={styles.withdrawAllText}>Rút toàn bộ số dư: {availableBal.toLocaleString('vi-VN')} ₫</Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorBox}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          {/* Security policy notice */}
          <View style={styles.securityBox}>
            <MaterialCommunityIcons name="shield-lock-outline" size={18} color={Colors.navy} />
            <Text style={styles.securityText}>
              Xác thực sinh trắc học (vân tay / khuôn mặt) sẽ được yêu cầu ở bước rà soát trước khi lệnh rút tiền được gửi đi.
            </Text>
          </View>

          {/* Continue CTA */}
          <TouchableOpacity
            style={[styles.continueBtn, (numAmount < 50000 || numAmount > availableBal) && styles.continueBtnDisabled]}
            onPress={handleOpenReview}
            disabled={numAmount < 50000 || numAmount > availableBal}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Rà soát lệnh rút tiền"
          >
            <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
            <Text style={styles.continueBtnText}>
              {numAmount > 0
                ? `Rà soát rút ${numAmount.toLocaleString('vi-VN')} ₫`
                : 'Nhập số tiền muốn rút'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Secure Review Sheet — confirm before commit */}
      <SecureReviewSheet
        visible={showReview}
        title="Rà Soát Lệnh Rút Tiền"
        confirmLabel={`Xác nhận rút ${numAmount.toLocaleString('vi-VN')} ₫`}
        items={reviewItems}
        warning="Vui lòng đảm bảo số tài khoản nhận tiền chính xác. TrustSim không chịu trách nhiệm nếu quý khách nhập sai thông tin ngân hàng."
        onConfirm={handleConfirmWithdraw}
        onCancel={() => setShowReview(false)}
        loading={loading}
      />
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
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  bankOption: {
    width: '31%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xs + 2,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  bankOptionSelected: {
    borderColor: Colors.blue,
    backgroundColor: 'rgba(22, 102, 197, 0.08)',
  },
  bankCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.navy,
  },
  bankCodeTextSelected: {
    color: Colors.blue,
  },
  bankNameText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 46,
    gap: Spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
    padding: 0,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.blue,
    paddingBottom: Spacing.xs,
    marginBottom: Spacing.sm,
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
  withdrawAllBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  withdrawAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    borderRadius: 6,
    padding: Spacing.xs + 2,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
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
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.md,
    minHeight: 52,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
});

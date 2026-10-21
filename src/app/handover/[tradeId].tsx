import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { BottomNavBar } from '../../components/BottomNavBar';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { transferService } from '../../services/transferService';
import { SimTransferConfirmResultDto, SimTransferProgressDto } from '../../types';

export default function SimHandoverScreen() {
  const router = useRouter();
  const { tradeId } = useLocalSearchParams<{ tradeId: string }>();

  const [progress, setProgress] = useState<SimTransferProgressDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Seller proof upload state
  const [proofNote, setProofNote] = useState('Đã hoàn tất thủ tục sang tên tại điểm giao dịch');
  const [submittingProof, setSubmittingProof] = useState(false);

  // Buyer confirm receipt state (SCR-21 trigger)
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<SimTransferConfirmResultDto | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!tradeId) {
      setLoading(false);
      setProgress(null);
      return;
    }
    setLoading(true);
    try {
      const res = await transferService.getProgress(tradeId);
      if (res.success && res.data) {
        setProgress(res.data);
      } else {
        setProgress(null);
      }
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [tradeId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleSellerSubmitProof = async () => {
    if (!progress?.tradeId && !tradeId) return;
    setSubmittingProof(true);
    try {
      const sampleProofUrl =
        'https://storage.trustsim.vn/proofs/bien_ban_sang_ten.jpg';
      const res = await transferService.submitProof(
        progress?.tradeId || tradeId || '',
        sampleProofUrl,
        proofNote
      );

      if (res.success) {
        Alert.alert(
          'Gửi biên bản thành công',
          'Biên bản sang tên đã được ghi nhận. Hệ thống đã thông báo cho Người mua kiểm tra và xác nhận nhận SIM.'
        );
        fetchProgress();
      } else {
        Alert.alert('Chưa thể gửi biên bản', res.message || 'Vui lòng kiểm tra lại.');
      }
    } catch (err: any) {
      Alert.alert(
        'Lỗi gửi biên bản',
        err?.message || 'Không thể gửi ảnh biên bản. Vui lòng kiểm tra lại kết nối mạng.'
      );
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleBuyerConfirmReceipt = async () => {
    Alert.alert(
      'Xác nhận nhận SIM & Hoàn tất giao dịch?',
      `Khi xác nhận, bạn cam kết SIM đã hoạt động bình thường. Khoản tiền thanh toán (${formatVnd(progress?.escrowAmount)}) sẽ được chuyển cho Người bán và hoàn tất giao dịch.`,
      [
        { text: 'Chưa, để kiểm tra lại', style: 'cancel' },
        {
          text: 'Xác Nhận Đã Nhận SIM',
          style: 'default',
          onPress: async () => {
            setConfirming(true);
            try {
              const res = await transferService.confirmTransfer(progress?.tradeId || tradeId || '');
              if (res.success && res.data) {
                setConfirmResult(res.data);
              } else {
                throw new Error(res.message || 'Xác nhận không thành công');
              }
            } catch (err: any) {
              Alert.alert(
                'Chưa thể xác nhận',
                err?.message || 'Có lỗi xảy ra khi xác nhận. Vui lòng kiểm tra kết nối mạng và thử lại.'
              );
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  const formatVnd = (amount?: number) => {
    if (typeof amount !== 'number') return '0 đ';
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  if (loading && !progress) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Tiến Trình Bàn Giao SIM" showBack onBack={() => router.back()} showHome />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: Spacing.md, color: Colors.textSecondary }}>Đang tải tiến trình...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!progress) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Tiến Trình Bàn Giao SIM" showBack onBack={() => router.back()} showHome />
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có thông tin tiến trình</Text>
          <Text style={styles.emptySubtitle}>
            Giao dịch này chưa bước vào giai đoạn bàn giao hoặc không tồn tại.
          </Text>
          <Button
            title="Quay Lại"
            variant="outline"
            size="md"
            onPress={() => router.back()}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title={confirmResult ? 'Hoàn Tất Giao Dịch' : 'Tiến Trình Bàn Giao SIM'}
        showBack
        showHome
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {confirmResult ? (
          <View style={styles.resultContainer}>
            <View style={styles.resultIconCircle}>
              <Ionicons name="checkmark-sharp" size={54} color={Colors.textInverse} />
            </View>

            <Text style={styles.resultTitle}>GIAO DỊCH HOÀN TẤT THÀNH CÔNG!</Text>
            <Text style={styles.resultDesc}>
              SIM đã chính thức thuộc quyền sở hữu của bạn!
            </Text>

            <Card style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.resultRowText}>
                  Số tiền thanh toán ({formatVnd(progress?.escrowAmount)}) đã được chuyển cho Người bán.
                </Text>
              </View>

              <View style={styles.resultDivider} />

              <View style={styles.resultRow}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={styles.resultRowText}>
                  Biên bản bàn giao và thanh lý hợp đồng đã được chứng thực hợp pháp.
                </Text>
              </View>
            </Card>

            <Button
              title="📄 XEM BIÊN BẢN BÀN GIAO (PDF)"
              variant="outline"
              size="lg"
              icon={<Ionicons name="document-text-outline" size={20} color={Colors.primary} />}
              onPress={() =>
                confirmResult.liquidationDocumentUrl
                  ? Linking.openURL(confirmResult.liquidationDocumentUrl)
                  : Alert.alert('Biên bản bàn giao', 'Đang tải file...')
              }
              style={{ width: '100%', marginBottom: Spacing.sm }}
            />

            <Button
              title="📱 VỀ KHO SIM CỦA TÔI"
              variant="primary"
              size="lg"
              onPress={() => router.replace('/(tabs)/sims')}
              style={{ width: '100%', marginBottom: Spacing.sm }}
            />

            <Button
              title="Về Trang Chủ"
              variant="ghost"
              size="md"
              onPress={() => router.replace('/(tabs)')}
              style={{ width: '100%' }}
            />
          </View>
        ) : (
          <View>
            {/* Trade Info Header */}
            <Card style={styles.headerCard}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.tradeCode}>{progress.tradeCode}</Text>
                  <Text style={styles.simText}>Mã giao dịch: {progress.tradeCode}</Text>
                </View>
                <Badge
                  status={progress.tradeStatus}
                  label="Đang bàn giao"
                />
              </View>

              <View style={styles.escrowNotice}>
                <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                <Text style={styles.escrowText}>
                  Tiền đảm bảo giao dịch:{' '}
                  <Text style={{ fontWeight: '800' }}>{formatVnd(progress.escrowAmount)}</Text>{' '}
                  [ĐANG ĐƯỢC BẢO VỆ AN TOÀN]
                </Text>
              </View>

              {progress.transferDeadline && (
                <Text style={styles.deadlineText}>
                  ⏱️ Hạn chót hoàn tất: {new Date(progress.transferDeadline).toLocaleDateString('vi-VN')}
                </Text>
              )}
            </Card>

            {/* Handover Roadmap Steps */}
            <Card style={styles.stepsCard}>
              <Text style={styles.stepsTitle}>QUY TRÌNH BÀN GIAO CHÍNH CHỦ</Text>

              <View style={styles.stepItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={[styles.stepItemText, styles.stepDone]}>
                  1. Ký hợp đồng mua bán SIM (Đã hoàn tất)
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Ionicons name="time" size={20} color={Colors.warning} />
                <Text style={[styles.stepItemText, styles.stepActive]}>
                  2. Người bán làm thủ tục sang tên tại điểm giao dịch nhà mạng
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Ionicons name="ellipse-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.stepItemText}>
                  3. Người mua nhận SIM, kiểm tra có sóng & xác nhận
                </Text>
              </View>

              <View style={styles.stepItem}>
                <Ionicons name="ellipse-outline" size={20} color={Colors.textMuted} />
                <Text style={styles.stepItemText}>
                  4. Hệ thống hoàn tất chuyển tiền cho Người bán & xuất Biên bản hoàn tất
                </Text>
              </View>
            </Card>

            {/* Seller Action Section */}
            <Card style={styles.sellerCard}>
              <Text style={styles.roleHeader}>DÀNH CHO NGƯỜI BÁN</Text>
              <Text style={styles.roleDesc}>
                Sau khi làm xong thủ tục sang tên tại điểm giao dịch nhà mạng, vui lòng nộp ảnh chứng từ xác nhận:
              </Text>

              <View style={styles.uploadBox}>
                <Ionicons name="camera" size={32} color={Colors.primary} />
                <Text style={styles.uploadText}>
                  📷 [Đã đính kèm ảnh biên bản sang tên]
                </Text>
              </View>

              <TextInput
                style={styles.noteInput}
                value={proofNote}
                onChangeText={setProofNote}
                placeholder="Ghi chú thêm..."
              />

              <Button
                title="NỘP BIÊN BẢN SANG TÊN"
                variant="outline"
                size="md"
                loading={submittingProof}
                onPress={handleSellerSubmitProof}
                style={{ marginTop: Spacing.sm }}
              />
            </Card>

            {/* Buyer Action Section */}
            <Card style={styles.buyerCard}>
              <Text style={[styles.roleHeader, { color: Colors.primary }]}>
                DÀNH CHO NGƯỜI MUA
              </Text>
              <Text style={styles.roleDesc}>
                Khi bạn đã nhận SIM, lắp vào máy và thấy sóng nhà mạng hoạt động bình thường, hãy bấm xác nhận bên dưới:
              </Text>

              <Button
                title="✅ XÁC NHẬN ĐÃ NHẬN SIM & HOÀN TẤT"
                variant="success"
                size="lg"
                loading={confirming}
                onPress={handleBuyerConfirmReceipt}
                style={styles.confirmBtn}
              />
            </Card>
          </View>
        )}
      </ScrollView>
      <BottomNavBar activeTab="none" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  headerCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  tradeCode: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  simText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  escrowNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
  },
  escrowText: {
    fontSize: 13,
    color: '#065F46',
    marginLeft: Spacing.xs,
  },
  deadlineText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '700',
    marginTop: 4,
  },
  stepsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stepsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  stepItemText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  stepDone: {
    color: Colors.text,
    fontWeight: '600',
  },
  stepActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  sellerCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(241, 245, 249, 0.6)',
  },
  roleHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  uploadText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    marginTop: 6,
  },
  noteInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    fontSize: 13,
    marginTop: Spacing.sm,
  },
  buyerCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderColor: Colors.success,
    borderWidth: 1.5,
  },
  confirmBtn: {
    marginTop: Spacing.md,
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  resultIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
  },
  resultDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  resultCard: {
    width: '100%',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  resultRowText: {
    fontSize: 13,
    color: Colors.text,
    marginLeft: Spacing.xs,
    flex: 1,
    lineHeight: 18,
  },
  resultDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 18,
    paddingHorizontal: Spacing.lg,
  },
});

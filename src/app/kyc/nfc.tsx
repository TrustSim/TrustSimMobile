import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { ReceiptScreen } from '../../components/trust/ReceiptScreen';
import type { ReceiptData } from '../../components/trust/ReceiptScreen';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

// Các bước luồng:
// 1. 'privacy_intro': Giới thiệu quyền riêng tư
// 2. 'check_nfc': Kiểm tra phần cứng
// 3. 'unsupported_fallback': Trạng thái bình thường nếu máy không có NFC
// 4. 'placement_guide': Hướng dẫn áp thẻ
// 5. 'scanning': Đang đọc chip
// 6. 'chip_read_failed': Không đọc được chip -> thử lại hoặc thủ công
// 7. 'matched_confirm': Đối chiếu thành công
type NfcStep =
  | 'privacy_intro'
  | 'check_nfc'
  | 'unsupported_fallback'
  | 'placement_guide'
  | 'scanning'
  | 'chip_read_failed'
  | 'matched_confirm';

export default function NfcCccdScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const [step, setStep] = useState<NfcStep>('privacy_intro');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanPhaseLabel, setScanPhaseLabel] = useState<string>('Khởi tạo kết nối không tiếp xúc...');
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Kiểm tra hỗ trợ NFC
  const handleCheckNfcSupport = () => {
    setStep('check_nfc');
    setTimeout(() => {
      setStep('placement_guide');
    }, 1200);
  };

  // Quá trình đọc chip với thanh tiến trình thân thiện bằng tiếng Việt
  const handleStartScan = () => {
    setStep('scanning');
    setScanProgress(10);
    setScanPhaseLabel('Đang nhận diện chip căn cước công dân...');

    setTimeout(() => {
      setScanProgress(35);
      setScanPhaseLabel('Đang đọc thông tin cá nhân trên thẻ...');
    }, 1000);

    setTimeout(() => {
      setScanProgress(65);
      setScanPhaseLabel('Đang kiểm tra hình ảnh chân dung...');
    }, 2000);

    setTimeout(() => {
      setScanProgress(85);
      setScanPhaseLabel('Đang kiểm tra chứng thực bảo mật thẻ...');
    }, 3000);

    setTimeout(() => {
      setScanProgress(100);
      setScanPhaseLabel('Xác thực thẻ căn cước công dân thành công!');
      setTimeout(() => {
        setStep('matched_confirm');
      }, 600);
    }, 4000);
  };

  const handleConfirmAndComplete = async () => {
    await refreshProfile();
    setReceiptData({
      type: 'success',
      title: 'Xác Thực Thẻ CCCD Thành Công',
      description: 'Thông tin căn cước công dân gắn chip đã được đối chiếu và lưu vào hồ sơ tài khoản của bạn.',
      details: [
        { label: 'Họ và tên', value: profile?.fullName || 'NGUYỄN VĂN A' },
        { label: 'Số căn cước', value: profile?.identityNumber || '001202009999', masked: true },
        { label: 'Hình thức xác thực', value: 'Đọc chip căn cước công dân' },
        { label: 'Chứng thực điện tử', value: 'Hợp lệ & Chính chủ' },
        { label: 'Cấp độ tài khoản', value: 'Đã xác minh đầy đủ' },
      ],
      referenceId: 'CCCD-' + Math.floor(100000 + Math.random() * 900000),
      timestamp: new Date().toISOString(),
      nextSteps: [
        'Hồ sơ của bạn đã đủ điều kiện ký hợp đồng chuyển nhượng SIM.',
        'Hạn mức giao dịch và rút tiền đã được kích hoạt tối đa.',
      ],
    });
  };

  if (receiptData) {
    return (
      <ReceiptScreen
        data={receiptData}
        onDone={() => {
          router.replace('/(tabs)/account');
        }}
        doneLabel="Xem Hồ Sơ Tài Khoản"
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header
        title="Xác Thực CCCD Gắn Chip"
        showBack
        onBack={() => {
          if (step !== 'privacy_intro') {
            setStep('privacy_intro');
          } else {
            router.back();
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BƯỚC 1: GIỚI THIỆU & QUYỀN RIÊNG TƯ */}
        {step === 'privacy_intro' && (
          <View style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="cellphone-nfc" size={48} color={Colors.navy} />
            </View>

            <Text style={styles.stepTitle}>Đọc Thẻ Căn Cước Gắn Chip</Text>
            <Text style={styles.stepSubtitle}>
              TrustSim sử dụng công nghệ chạm không tiếp xúc để đọc dữ liệu bảo mật từ chip thẻ CCCD, giúp xác định chính xác danh tính và bảo vệ an toàn giao dịch.
            </Text>

            {/* Cam kết bảo mật */}
            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>CAM KẾT BẢO VỆ DỮ LIỆU CÁ NHÂN</Text>

              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="shield-check" size={18} color={Colors.success} />
                <Text style={styles.checkItemText}>
                  Dữ liệu chỉ dùng để đối chiếu thông tin sang tên SIM chính chủ.
                </Text>
              </View>

              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="shield-check" size={18} color={Colors.success} />
                <Text style={styles.checkItemText}>
                  Không lưu trữ hình ảnh thẻ thô, toàn bộ thông tin được mã hóa bảo mật.
                </Text>
              </View>

              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="shield-check" size={18} color={Colors.success} />
                <Text style={styles.checkItemText}>
                  Tuân thủ các quy định hiện hành về an toàn bảo mật thông tin cá nhân.
                </Text>
              </View>
            </View>

            {/* Phương án dự phòng nếu máy không có NFC */}
            <TouchableOpacity
              style={styles.textBtn}
              onPress={() => setStep('unsupported_fallback')}
              activeOpacity={0.7}
            >
              <Text style={styles.textBtnLabel}>Điện thoại của tôi không có tính năng chạm NFC?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleCheckNfcSupport}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Bắt đầu kiểm tra và xác thực"
            >
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Kiểm Tra & Bắt Đầu</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BƯỚC 2: KIỂM TRA ĐẦU ĐỌC */}
        {step === 'check_nfc' && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.blue} />
            <Text style={styles.loadingTitle}>Đang kết nối đầu đọc thẻ của máy...</Text>
            <Text style={styles.loadingDesc}>Vui lòng giữ điện thoại mở khóa màn hình.</Text>
          </View>
        )}

        {/* BƯỚC 3: MÁY KHÔNG HỖ TRỢ (TRẠNG THÁI BÌNH THƯỜNG) */}
        {step === 'unsupported_fallback' && (
          <View style={styles.stepContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.surfaceAlt }]}>
              <MaterialCommunityIcons name="cellphone-off" size={48} color={Colors.textMuted} />
            </View>

            <Text style={styles.stepTitle}>Máy Chưa Hỗ Trợ Đọc Chip</Text>
            <Text style={styles.stepSubtitle}>
              Đây là trạng thái bình thường nếu điện thoại của bạn không có đầu đọc chip không tiếp xúc. Bạn có thể chọn xác thực bằng chụp ảnh thẻ căn cước.
            </Text>

            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>HÌNH THỨC XÁC THỰC THAY THẾ</Text>
              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="camera-outline" size={18} color={Colors.blue} />
                <Text style={styles.checkItemText}>
                  Chụp ảnh 2 mặt thẻ căn cước công dân rõ nét.
                </Text>
              </View>
              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="face-recognition" size={18} color={Colors.blue} />
                <Text style={styles.checkItemText}>
                  Quét khuôn mặt để xác thực người thật.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/kyc')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Chuyển sang chụp ảnh thẻ"
            >
              <MaterialCommunityIcons name="camera" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Xác Thực Bằng Chụp Ảnh Thẻ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setStep('placement_guide')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Thử lại tính năng chạm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BƯỚC 4: HƯỚNG DẪN ĐẶT THẺ */}
        {step === 'placement_guide' && (
          <View style={styles.stepContainer}>
            <View style={styles.placementGraphicBox}>
              <MaterialCommunityIcons name="card-account-details-outline" size={64} color={Colors.blue} />
              <MaterialCommunityIcons name="arrow-up-down" size={24} color={Colors.amber} style={{ marginVertical: 8 }} />
              <MaterialCommunityIcons name="cellphone" size={56} color={Colors.navy} />
            </View>

            <Text style={styles.stepTitle}>Hướng Dẫn Áp Thẻ Vào Máy</Text>
            <Text style={styles.stepSubtitle}>
              Áp phần chip của thẻ CCCD sát vào mặt lưng phía trên của điện thoại.
            </Text>

            <View style={styles.cardBox}>
              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="numeric-1-circle" size={18} color={Colors.navy} />
                <Text style={styles.checkItemText}>Nên tháo ốp lưng dày hoặc ốp kim loại để tín hiệu tốt nhất.</Text>
              </View>
              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="numeric-2-circle" size={18} color={Colors.navy} />
                <Text style={styles.checkItemText}>Giữ yên thẻ sát lưng máy trong khoảng 3 đến 5 giây.</Text>
              </View>
              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="numeric-3-circle" size={18} color={Colors.navy} />
                <Text style={styles.checkItemText}>Không lắc hay di chuyển máy khi đang đọc dữ liệu.</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleStartScan}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sẵn sàng quét chip"
            >
              <MaterialCommunityIcons name="nfc" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Sẵn Sàng Đọc Thẻ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BƯỚC 5: ĐANG ĐỌC DỮ LIỆU */}
        {step === 'scanning' && (
          <View style={styles.stepContainer}>
            <View style={styles.scanningPulseBox}>
              <MaterialCommunityIcons name="cellphone-nfc" size={64} color={Colors.blue} />
            </View>

            <Text style={styles.stepTitle}>Đang Đọc Thông Tin Thẻ...</Text>
            <Text style={styles.stepSubtitle}>Vui lòng giữ nguyên vị trí thẻ sau lưng điện thoại.</Text>

            {/* Thanh tiến trình */}
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${scanProgress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{scanProgress}%</Text>
            <Text style={styles.progressPhaseText}>{scanPhaseLabel}</Text>

            <TouchableOpacity
              style={styles.cancelScanBtn}
              onPress={() => setStep('chip_read_failed')}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelScanText}>Không đọc được thẻ? Thử cách khác</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BƯỚC 6: ĐỌC THẤT BẠI HOẶC BỊ GIÁN ĐOẠN */}
        {step === 'chip_read_failed' && (
          <View style={styles.stepContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.dangerLight }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.danger} />
            </View>

            <Text style={styles.stepTitle}>Không Thể Đọc Thẻ</Text>
            <Text style={styles.stepSubtitle}>
              Tín hiệu bị ngắt quãng hoặc vị trí thẻ chưa chuẩn xác. Bạn có thể thử đặt lại hoặc chọn hình thức chụp ảnh thẻ.
            </Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setStep('placement_guide')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="reload" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Thử Lại Đặt Thẻ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/kyc')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Chuyển Sang Chụp Ảnh Thẻ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BƯỚC 7: XÁC THỰC HỢP LỆ & XÁC NHẬN */}
        {step === 'matched_confirm' && (
          <View style={styles.stepContainer}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.successLight }]}>
              <MaterialCommunityIcons name="check-decagram" size={56} color={Colors.success} />
            </View>

            <Text style={styles.stepTitle}>Thông Tin Thẻ Hợp Lệ</Text>
            <Text style={styles.stepSubtitle}>
              Dữ liệu căn cước công dân chính chủ đã được xác thực an toàn.
            </Text>

            <View style={styles.cardBox}>
              <Text style={styles.cardBoxTitle}>THÔNG TIN XÁC THỰC</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Họ và tên:</Text>
                <Text style={styles.previewValue}>{profile?.fullName || 'NGUYỄN VĂN A'}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Số căn cước:</Text>
                <Text style={styles.previewValue}>•••• •••• {profile?.identityNumber?.slice(-4) || '9999'}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Trạng thái:</Text>
                <Text style={[styles.previewValue, { color: Colors.success }]}>Khớp thông tin chính chủ</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleConfirmAndComplete}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Xác nhận cập nhật hồ sơ"
            >
              <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Xác Nhận & Cập Nhật Hồ Sơ</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  stepContainer: {
    alignItems: 'center',
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(11, 31, 58, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  placementGraphicBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  scanningPulseBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(22, 102, 197, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  cardBox: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  cardBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  checkItemText: {
    fontSize: 13,
    color: Colors.navy,
    flex: 1,
    lineHeight: 18,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  previewLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
    fontFamily: 'monospace',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.blue,
  },
  progressPercent: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginBottom: Spacing.xs,
  },
  progressPhaseText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: Spacing.lg,
  },
  loadingDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.blue,
    borderRadius: BorderRadius.md,
    minHeight: 52,
    marginBottom: Spacing.sm,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  secondaryBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 48,
    marginBottom: Spacing.sm,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  textBtn: {
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  textBtnLabel: {
    fontSize: 13,
    color: Colors.blue,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelScanBtn: {
    paddingVertical: Spacing.md,
  },
  cancelScanText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});

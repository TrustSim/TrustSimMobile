import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import {
  VerificationBadgeStatus,
  VerificationStatusBadge,
} from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { kycService } from '../../services/kycService';
import { simService } from '../../services/simService';
import type { KycStatusDto } from '../../types';

function maskIdCard(id?: string): string {
  if (!id) return 'Chưa cập nhật';
  if (id.length <= 6) return id;
  return `${id.slice(0, 3)}••••••${id.slice(-3)}`;
}

function getKycBadge(status?: string): { status: VerificationBadgeStatus; label: string } {
  switch (status) {
    case 'VERIFIED':
      return { status: 'verified', label: 'CCCD đã xác minh' };
    case 'PENDING_VERIFICATION':
      return { status: 'pending', label: 'Đang chờ duyệt' };
    case 'REJECTED':
      return { status: 'rejected', label: 'Từ chối xác thực' };
    default:
      return { status: 'not_submitted', label: 'Chưa xác thực CCCD' };
  }
}

export default function IdentityAccountScreen() {
  const router = useRouter();
  const { user, profile, logout, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [verifiedSimsCount, setVerifiedSimsCount] = useState(0);
  const [kycData, setKycData] = useState<KycStatusDto | null>(null);
  const [kycHistory, setKycHistory] = useState<KycStatusDto[]>([]);

  // State Chỉnh sửa thông tin cá nhân
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // State Đổi mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const loadAccountDetails = useCallback(async () => {
    try {
      const [simRes, kycRes, historyRes] = await Promise.allSettled([
        simService.getMyOwnerships({ pageIndex: 1, pageSize: 20 }),
        kycService.getKycStatus(),
        kycService.getKycHistory({ pageIndex: 1, pageSize: 20 }),
      ]);

      if (simRes.status === 'fulfilled' && simRes.value.success && simRes.value.data?.items) {
        setVerifiedSimsCount(simRes.value.data.totalCount ?? simRes.value.data.items.length);
      }
      if (kycRes.status === 'fulfilled' && kycRes.value.success && kycRes.value.data) {
        setKycData(kycRes.value.data);
      }
      if (historyRes.status === 'fulfilled' && historyRes.value.success && historyRes.value.data) {
        const hItems = Array.isArray(historyRes.value.data)
          ? historyRes.value.data
          : historyRes.value.data.items || [];
        setKycHistory(hItems);
      }
    } catch {
      // Ignore network errors quietly
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshProfile(), loadAccountDetails()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      loadAccountDetails();
    }, [refreshProfile, loadAccountDetails])
  );

  const displayName =
    profile?.fullName || kycData?.fullName || user?.fullName || user?.userName || 'Thành viên';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  const currentStatus = profile?.verificationStatus || kycData?.verificationStatus;
  const kycBadge = getKycBadge(currentStatus);
  const isVerified = currentStatus === 'VERIFIED';
  const identityNumber = profile?.identityNumber || kycData?.identityNumber;

  const completedPillars =
    (isVerified ? 1 : 0) + (verifiedSimsCount > 0 ? 1 : 0) + (isVerified ? 1 : 0);

  // Mở modal chỉnh sửa hồ sơ
  const handleOpenEditProfile = () => {
    setEditFullName(profile?.fullName || user?.fullName || '');
    setEditPhoneNumber(profile?.phoneNumber || user?.phoneNumber || '');
    setEditAddress(profile?.address || '');
    const dob = profile?.dateOfBirth || kycData?.dateOfBirth;
    if (dob) {
      try {
        const d = new Date(dob);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setEditDateOfBirth(`${yyyy}-${mm}-${dd}`);
      } catch {
        setEditDateOfBirth(String(dob));
      }
    } else {
      setEditDateOfBirth('');
    }
    setShowEditModal(true);
  };

  // Lưu thông tin cá nhân
  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!editPhoneNumber.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        fullName: editFullName.trim(),
        phoneNumber: editPhoneNumber.trim(),
        address: editAddress.trim(),
        identityNumber: identityNumber || '', // CCCD giữ nguyên không đổi
        dateOfBirth: editDateOfBirth.trim() || undefined,
      });

      if (res.success) {
        Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân thành công.');
        setShowEditModal(false);
        await refreshProfile();
      } else {
        Alert.alert('Không thể lưu', res.message || 'Cập nhật thất bại. Vui lòng thử lại.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Cập nhật thất bại. Vui lòng kiểm tra lại đường truyền.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Lưu đổi mật khẩu
  const handleSavePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Mật khẩu yếu', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Không trùng khớp', 'Mật khẩu mới và xác nhận mật khẩu không khớp nhau.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });

      if (res.success) {
        Alert.alert('Thành công', 'Đã đổi mật khẩu tài khoản thành công!');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Không thành công', res.message || 'Mật khẩu hiện tại không chính xác.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.navy} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Hồ sơ công dân số & Bảo mật</Text>
            <Text style={styles.pageTitle}>Định Danh & Tài Khoản</Text>
          </View>
          <View style={styles.trustScorePill}>
            <MaterialCommunityIcons name="shield-star" size={15} color={Colors.gold} />
            <Text style={styles.trustScoreText}>Bảo chứng {completedPillars}/3</Text>
          </View>
        </View>

        {/* Digital Identity Passport Hero Card */}
        <View style={styles.passportHeroCard}>
          <View style={styles.passportGlow} />
          <View style={styles.passportTopRow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitials}>{initials || 'TS'}</Text>
              </View>
              {isVerified && (
                <View style={styles.avatarCheckBadge}>
                  <MaterialCommunityIcons name="check" size={11} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View style={styles.passportIdentityCol}>
              <Text style={styles.passportName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.passportEmail} numberOfLines={1}>
                {user?.email || profile?.email || 'Chưa cập nhật email'}
              </Text>
              <View style={{ marginTop: 8 }}>
                <VerificationStatusBadge status={kycBadge.status} label={kycBadge.label} />
              </View>
            </View>
          </View>

          {/* Rejection Notice */}
          {currentStatus === 'REJECTED' && kycData?.rejectionReason ? (
            <View style={styles.rejectionAlert}>
              <MaterialCommunityIcons name="alert-circle" size={16} color="#FDA4AF" />
              <Text style={styles.rejectionAlertText}>
                Lý do từ chối: {kycData.rejectionReason}
              </Text>
            </View>
          ) : null}

          {/* Action CTA if not yet verified */}
          {!isVerified && (
            <View style={styles.passportCtaRow}>
              <TouchableOpacity
                style={styles.passportPrimaryBtn}
                onPress={() => router.push('/kyc')}
                activeOpacity={0.88}
              >
                <MaterialCommunityIcons
                  name="camera-account"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.passportPrimaryBtnText}>Chụp CCCD & Khuôn mặt (eKYC)</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Cụm Nút Tác Vụ Cá Nhân (Sửa thông tin & Đổi mật khẩu) */}
        <View style={styles.actionPillGrid}>
          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={handleOpenEditProfile}
            activeOpacity={0.82}
          >
            <View style={[styles.actionPillIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <MaterialCommunityIcons name="account-edit-outline" size={20} color={Colors.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionPillTitle}>Chỉnh sửa thông tin</Text>
              <Text style={styles.actionPillSub}>Cập nhật họ tên, SĐT, nơi ở</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={() => setShowPasswordModal(true)}
            activeOpacity={0.82}
          >
            <View style={[styles.actionPillIconCircle, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="lock-reset" size={20} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionPillTitle}>Đổi mật khẩu</Text>
              <Text style={styles.actionPillSub}>Bảo mật & đăng nhập</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 3 Trụ cột Xác thực */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>3 Lớp bảo chứng giao dịch</Text>
        </View>

        <View style={styles.pillarsStack}>
          {/* 1. CCCD & Face Match */}
          <TouchableOpacity
            style={styles.pillarCard}
            onPress={() => router.push('/kyc')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.pillarIconBox,
                { backgroundColor: isVerified ? Colors.successLight : Colors.blueSoft },
              ]}
            >
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={22}
                color={isVerified ? Colors.success : Colors.blue}
              />
            </View>
            <View style={styles.pillarBody}>
              <Text style={styles.pillarTitle}>1. Căn cước công dân & Khuôn mặt</Text>
              <Text style={styles.pillarDesc}>
                Chụp 2 mặt CCCD và ảnh chân dung trực tiếp để xác thực chính chủ
              </Text>
            </View>
            <VerificationStatusBadge
              status={kycBadge.status}
              label={
                isVerified
                  ? 'Đã xác minh'
                  : currentStatus === 'PENDING_VERIFICATION'
                    ? 'Chờ duyệt'
                    : 'Thực hiện'
              }
              size="sm"
            />
          </TouchableOpacity>

          {/* 2. SIM Chính chủ */}
          <TouchableOpacity
            style={styles.pillarCard}
            onPress={() => router.push('/(tabs)/sims')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.pillarIconBox,
                {
                  backgroundColor:
                    verifiedSimsCount > 0 ? Colors.successLight : Colors.blueSoft,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="sim-outline"
                size={22}
                color={verifiedSimsCount > 0 ? Colors.success : Colors.blue}
              />
            </View>
            <View style={styles.pillarBody}>
              <Text style={styles.pillarTitle}>2. Thuê bao SIM chính chủ</Text>
              <Text style={styles.pillarDesc}>
                {verifiedSimsCount > 0
                  ? `Đã xác thực ${verifiedSimsCount} SIM chính chủ qua SMS OTP`
                  : 'Xác thực mã OTP trên SIM để đối soát thông tin chủ sở hữu'}
              </Text>
            </View>
            <VerificationStatusBadge
              status={verifiedSimsCount > 0 ? 'verified' : 'not_submitted'}
              label={verifiedSimsCount > 0 ? `${verifiedSimsCount} SIM` : 'Đối soát'}
              size="sm"
            />
          </TouchableOpacity>

          {/* 3. Tài khoản ngân hàng nhận giải ngân */}
          <TouchableOpacity
            style={styles.pillarCard}
            onPress={() => router.push('/withdraw')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.pillarIconBox,
                { backgroundColor: isVerified ? Colors.successLight : Colors.surfaceMuted },
              ]}
            >
              <MaterialCommunityIcons
                name="bank-outline"
                size={22}
                color={isVerified ? Colors.success : Colors.navy}
              />
            </View>
            <View style={styles.pillarBody}>
              <Text style={styles.pillarTitle}>3. Ngân hàng nhận tiền giải ngân</Text>
              <Text style={styles.pillarDesc}>
                Rút tiền & nhận giải ngân ký quỹ về tài khoản ngân hàng chính chủ
              </Text>
            </View>
            <VerificationStatusBadge
              status={isVerified ? 'verified' : 'warning'}
              label={isVerified ? 'Sẵn sàng' : 'Mở rút tiền'}
              size="sm"
            />
          </TouchableOpacity>
        </View>

        {/* Lịch sử gửi định danh eKYC */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
          <View style={styles.sectionTitleWithCount}>
            <Text style={styles.sectionTitle}>Lịch sử gửi định danh eKYC</Text>
            {kycHistory.length > 0 && (
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{kycHistory.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/kyc')} activeOpacity={0.75}>
            <Text style={styles.sectionActionLink}>Chụp mới →</Text>
          </TouchableOpacity>
        </View>

        {kycHistory.length === 0 ? (
          <View style={styles.emptyKycCard}>
            <View style={styles.emptyKycIconCircle}>
              <MaterialCommunityIcons
                name="card-account-details-outline"
                size={26}
                color={Colors.blue}
              />
            </View>
            <Text style={styles.emptyKycTitle}>Chưa có lượt gửi eKYC nào</Text>
            <Text style={styles.emptyKycSub}>
              Khi bạn chụp ảnh CCCD và khuôn mặt gửi lên hệ thống, tiến trình và kết quả thẩm định eKYC sẽ hiển thị chi tiết tại đây.
            </Text>
            <TouchableOpacity
              style={styles.emptyKycBtn}
              onPress={() => router.push('/kyc')}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
              <Text style={styles.emptyKycBtnText}>Thực hiện định danh ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.kycHistoryStack}>
            {kycHistory.map((item, idx) => {
              const status = item.verificationStatus;
              const dateStr = item.submittedAt
                ? new Date(item.submittedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '—';
              const verifiedDateStr = item.verifiedAt
                ? new Date(item.verifiedAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : null;
              const badge = getKycBadge(status);
              const isMatchScore =
                typeof item.faceSimilarityScore === 'number' && item.faceSimilarityScore > 0;

              return (
                <View key={item.id || String(idx)} style={styles.kycHistoryCard}>
                  <View style={styles.kycCardTopRow}>
                    <View style={styles.kycCodeBadgeRow}>
                      <View style={styles.kycOrderBadge}>
                        <Text style={styles.kycOrderText}>#{idx + 1}</Text>
                      </View>
                      <View>
                        <Text style={styles.kycCodeText}>
                          YÊU CẦU #{item.id?.slice(0, 8).toUpperCase() || 'EKYC'}
                        </Text>
                        <Text style={styles.kycDateText}>Gửi lúc: {dateStr}</Text>
                      </View>
                    </View>
                    <VerificationStatusBadge status={badge.status} label={badge.label} size="sm" />
                  </View>

                  {/* Chi tiết thông tin đã trích xuất */}
                  {(item.fullName || item.identityNumber || isMatchScore) && (
                    <View style={styles.kycDetailGrid}>
                      {item.fullName ? (
                        <View style={styles.kycDetailItem}>
                          <Text style={styles.kycDetailLabel}>Họ và tên</Text>
                          <Text style={styles.kycDetailVal}>{item.fullName}</Text>
                        </View>
                      ) : null}
                      {item.identityNumber ? (
                        <View style={styles.kycDetailItem}>
                          <Text style={styles.kycDetailLabel}>Số định danh</Text>
                          <Text style={[styles.kycDetailVal, styles.monoVal]}>
                            {maskIdCard(item.identityNumber)}
                          </Text>
                        </View>
                      ) : null}
                      {isMatchScore ? (
                        <View style={styles.kycDetailItem}>
                          <Text style={styles.kycDetailLabel}>Độ khớp khuôn mặt</Text>
                          <Text style={[styles.kycDetailVal, { color: Colors.success }]}>
                            {Math.round(item.faceSimilarityScore!)}%
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {/* Lý do từ chối nếu có */}
                  {status === 'REJECTED' && item.rejectionReason ? (
                    <View style={styles.kycRejectionBox}>
                      <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={16}
                        color={Colors.danger}
                      />
                      <Text style={styles.kycRejectionText}>
                        Lý do từ chối: {item.rejectionReason}
                      </Text>
                    </View>
                  ) : null}

                  {/* Thời gian hoàn tất xác minh */}
                  {verifiedDateStr ? (
                    <View style={styles.kycVerifiedTimeRow}>
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.kycVerifiedTimeText}>
                        Đã xác minh chính chủ vào {verifiedDateStr}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {/* Thông tin hồ sơ trích xuất từ CCCD */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Dữ liệu căn cước đã lưu</Text>
          <TouchableOpacity
            style={styles.editHeaderBtn}
            onPress={handleOpenEditProfile}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="pencil-outline" size={14} color={Colors.blue} />
            <Text style={styles.editHeaderText}>Chỉnh sửa</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recordCard}>
          <View style={styles.recordRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recordLabel}>Số CCCD / Mã định danh</Text>
              <Text style={styles.lockedNote}>Cố định từ eKYC chính chủ (Không cho sửa)</Text>
            </View>
            <View style={styles.lockedValBox}>
              <MaterialCommunityIcons name="lock" size={14} color={Colors.textMuted} />
              <Text style={[styles.recordVal, styles.monoVal, { color: Colors.textSecondary }]}>
                {maskIdCard(identityNumber)}
              </Text>
            </View>
          </View>
          <View style={styles.hairline} />
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>Họ và tên</Text>
            <Text style={styles.recordVal}>{displayName}</Text>
          </View>
          <View style={styles.hairline} />
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>Số điện thoại</Text>
            <Text style={[styles.recordVal, styles.monoVal]}>
              {profile?.phoneNumber || user?.phoneNumber || 'Chưa cập nhật'}
            </Text>
          </View>
          <View style={styles.hairline} />
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>Ngày sinh</Text>
            <Text style={styles.recordVal}>
              {profile?.dateOfBirth || kycData?.dateOfBirth
                ? new Date(
                  (profile?.dateOfBirth || kycData?.dateOfBirth) as string
                ).toLocaleDateString('vi-VN')
                : 'Chưa cập nhật'}
            </Text>
          </View>
          <View style={styles.hairline} />
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>Nơi thường trú</Text>
            <Text style={styles.recordVal} numberOfLines={2}>
              {profile?.address || 'Chưa cập nhật'}
            </Text>
          </View>
        </View>

        {/* Nút Đăng xuất */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="logout" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Đăng xuất khỏi thiết bị</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── MODAL CHỈNH SỬA THÔNG TIN CÁ NHÂN ── */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
                <Text style={styles.modalSub}>Cập nhật thông tin hồ sơ tài khoản</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* CCCD Cố Định (Read-Only) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelWithLockRow}>
                  <Text style={styles.inputLabel}>Số CCCD / Mã định danh</Text>
                  <View style={styles.lockedPill}>
                    <MaterialCommunityIcons name="lock" size={12} color="#64748B" />
                    <Text style={styles.lockedPillText}>Không cho sửa</Text>
                  </View>
                </View>
                <View style={styles.disabledInputBox}>
                  <Text style={styles.disabledInputText}>{identityNumber || 'Chưa có CCCD'}</Text>
                </View>
                <Text style={styles.fieldHint}>
                  Số CCCD được đối soát cố định từ quy trình định danh eKYC để bảo đảm tính pháp lý cho hợp đồng.
                </Text>
              </View>

              {/* Họ và tên */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ và tên *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Nhập họ và tên đầy đủ"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Số điện thoại */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số điện thoại liên hệ *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPhoneNumber}
                  onChangeText={setEditPhoneNumber}
                  placeholder="Ví dụ: 0912345678"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Ngày sinh */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày sinh (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDateOfBirth}
                  onChangeText={setEditDateOfBirth}
                  placeholder="Ví dụ: 1995-08-15"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Nơi thường trú */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nơi ở thường trú / Địa chỉ</Text>
                <TextInput
                  style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Nhập số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveProfile}
                disabled={savingProfile}
                activeOpacity={0.85}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Lưu thông tin</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL ĐỔI MẬT KHẨU ── */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                <Text style={styles.modalSub}>Tăng cường bảo mật cho tài khoản của bạn</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={22} color={Colors.navy} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              {/* Mật khẩu hiện tại */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu hiện tại *</Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Nhập mật khẩu đang dùng"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPasswordText}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswordText(!showPasswordText)}
                    style={styles.eyeBtn}
                  >
                    <MaterialCommunityIcons
                      name={showPasswordText ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mật khẩu mới */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu mới (Tối thiểu 6 ký tự) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPasswordText}
                />
              </View>

              {/* Xác nhận mật khẩu mới */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Xác nhận mật khẩu mới *</Text>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPasswordText}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowPasswordModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSavePassword}
                disabled={savingPassword}
                activeOpacity={0.85}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="lock-check-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>Đổi mật khẩu</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 110, // Floating bottom nav bar allowance
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.5,
  },
  trustScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.goldSoft,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  trustScoreText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.gold,
  },
  passportHeroCard: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.lg,
  },
  passportGlow: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(29, 78, 216, 0.28)',
  },
  passportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatarRing: {
    position: 'relative',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportIdentityCol: {
    flex: 1,
  },
  passportName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  passportEmail: {
    fontSize: 12.5,
    color: '#CBD5E1',
    marginTop: 2,
  },
  rejectionAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(225, 29, 72, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.4)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  rejectionAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#FECDD3',
    fontWeight: '600',
    lineHeight: 17,
  },
  passportCtaRow: {
    marginTop: Spacing.lg,
  },
  passportPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.crimson,
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  passportPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionPillGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  actionPillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  actionPillIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPillTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.navy,
  },
  actionPillSub: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.blue,
  },
  sectionActionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue,
  },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  editHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
  },
  pillarsStack: {
    gap: Spacing.sm,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  pillarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarBody: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.2,
  },
  pillarDesc: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  emptyKycCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  emptyKycIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyKycTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  emptyKycSub: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  emptyKycBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  emptyKycBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  kycHistoryStack: {
    gap: Spacing.sm,
  },
  kycHistoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  kycCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  kycCodeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kycOrderBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  kycOrderText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.navy,
  },
  kycCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.navy,
  },
  kycDateText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  kycDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm + 2,
    marginTop: Spacing.xs,
  },
  kycDetailItem: {
    flex: 1,
    minWidth: 100,
  },
  kycDetailLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  kycDetailVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
  },
  kycRejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    borderRadius: BorderRadius.xs,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  kycRejectionText: {
    flex: 1,
    fontSize: 11.5,
    color: Colors.danger,
    lineHeight: 16,
    fontWeight: '600',
  },
  kycVerifiedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.sm,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  kycVerifiedTimeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.success,
  },
  recordCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  lockedValBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  lockedNote: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  hairline: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  recordLabel: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  recordVal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.navy,
  },
  monoVal: {
    fontVariant: ['tabular-nums'],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    minHeight: 48,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.danger,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 23, 67, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl + 10,
    ...Shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.navy,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  labelWithLockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.navy,
    marginBottom: 6,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  lockedPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  disabledInputBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  disabledInputText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  fieldHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 15,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingRight: Spacing.sm,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.navy,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 6,
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.navy,
  },
  modalSubmitBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  modalSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

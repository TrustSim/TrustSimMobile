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
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { kycService } from '../../services/kycService';
import { simService } from '../../services/simService';
import type { KycStatusDto } from '../../types';

type ProfileTab = 'INFO' | 'HISTORY';

function maskIdCard(id?: string): string {
  if (!id) return 'Chưa cập nhật';
  if (id.length <= 6) return id;
  return `${id.slice(0, 3)}••••••${id.slice(-3)}`;
}

function getKycStatusMeta(status?: string) {
  switch (status) {
    case 'VERIFIED':
      return {
        label: 'CCCD đã xác minh',
        shortLabel: 'Đã xác minh',
        dot: '#10B981',
        color: '#059669',
        bg: '#ECFDF5',
      };
    case 'PENDING_VERIFICATION':
      return {
        label: 'Đang chờ duyệt',
        shortLabel: 'Chờ duyệt',
        dot: '#4C5FD5',
        color: '#4C5FD5',
        bg: '#EEF1FA',
      };
    case 'REJECTED':
      return {
        label: 'Từ chối xác thực',
        shortLabel: 'Từ chối',
        dot: '#E11D48',
        color: '#E11D48',
        bg: '#FFF1F2',
      };
    default:
      return {
        label: 'Chưa định danh CCCD',
        shortLabel: 'Chưa eKYC',
        dot: '#F59E0B',
        color: '#D97706',
        bg: '#FFFBEB',
      };
  }
}

export default function IdentityAccountScreen() {
  const router = useRouter();
  const { user, profile, logout, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('INFO');
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
  const kycMeta = getKycStatusMeta(currentStatus);
  const isVerified = currentStatus === 'VERIFIED';
  const identityNumber = profile?.identityNumber || kycData?.identityNumber;

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
        identityNumber: identityNumber || '',
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
        {/* ─── 1. UNIFIED TOP HEADER ─── */}
        <View style={styles.topHeader}>
          <Text style={styles.pageTitle}>Hồ sơ định danh</Text>

          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={handleOpenEditProfile}
              activeOpacity={0.8}
              accessibilityLabel="Chỉnh sửa hồ sơ"
            >
              <MaterialCommunityIcons name="account-edit-outline" size={19} color={Colors.navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.8}
              accessibilityLabel="Đổi mật khẩu"
            >
              <MaterialCommunityIcons name="lock-outline" size={19} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. CENTERED PROFILE SHOWCASE CARD (Image 1 & Image 4 Style) ─── */}
        <View style={styles.profileHeroCard}>
          {/* Centered Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials || 'TS'}</Text>
            </View>
            {isVerified && (
              <View style={styles.avatarVerifiedBadge}>
                <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Name & Email */}
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.profileHandle} numberOfLines={1}>
            {user?.email || profile?.email || profile?.phoneNumber || 'Chưa cập nhật email'}
          </Text>

          {/* KYC Status Pill */}
          <View style={[styles.kycStatusPill, { backgroundColor: kycMeta.bg }]}>
            <View style={[styles.kycStatusDot, { backgroundColor: kycMeta.dot }]} />
            <Text style={[styles.kycStatusText, { color: kycMeta.color }]}>
              {kycMeta.label}
            </Text>
          </View>

          {/* Rejection Notice */}
          {currentStatus === 'REJECTED' && kycData?.rejectionReason ? (
            <View style={styles.rejectionAlert}>
              <MaterialCommunityIcons name="alert-circle-outline" size={15} color="#E11D48" />
              <Text style={styles.rejectionAlertText}>
                Lý do từ chối: {kycData.rejectionReason}
              </Text>
            </View>
          ) : null}

          {/* Primary eKYC Action Pill if not yet verified */}
          {!isVerified && (
            <TouchableOpacity
              style={styles.ekycPrimaryPill}
              onPress={() => router.push('/kyc')}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="camera-account" size={16} color="#FFFFFF" />
              <Text style={styles.ekycPrimaryPillText}>Xác thực CCCD & Khuôn mặt</Text>
            </TouchableOpacity>
          )}

          {/* 3 Horizontal Stat Blocks (Image 4 Style) */}
          <View style={styles.profileStatsRow}>
            <TouchableOpacity
              style={styles.profileStatBlock}
              onPress={() => router.push('/kyc')}
              activeOpacity={0.8}
            >
              <Text style={styles.profileStatLabel}>Định danh</Text>
              <Text
                style={[styles.profileStatVal, { color: kycMeta.color }]}
                numberOfLines={1}
              >
                {kycMeta.shortLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileStatBlock}
              onPress={() => router.push('/(tabs)/sims')}
              activeOpacity={0.8}
            >
              <Text style={styles.profileStatLabel}>SIM sở hữu</Text>
              <Text style={styles.profileStatVal}>{verifiedSimsCount} SIM</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileStatBlock}
              onPress={() => setActiveTab('HISTORY')}
              activeOpacity={0.8}
            >
              <Text style={styles.profileStatLabel}>Hồ sơ KYC</Text>
              <Text style={styles.profileStatVal}>{kycHistory.length} lượt</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 3. SEGMENTED TAB SWITCHER (Image 4 Items | Activity Style) ─── */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'INFO' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('INFO')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'INFO' && styles.segmentBtnTextActive,
              ]}
            >
              Thông tin căn cước
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'HISTORY' && styles.segmentBtnActive]}
            onPress={() => setActiveTab('HISTORY')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'HISTORY' && styles.segmentBtnTextActive,
              ]}
            >
              Lịch sử eKYC ({kycHistory.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── TAB 1: THÔNG TIN CĂN CƯỚC & CÀI ĐẶT ─── */}
        {activeTab === 'INFO' ? (
          <View>
            <View style={styles.recordCard}>
              <View style={styles.recordRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordLabel}>Số CCCD / Định danh</Text>
                  <Text style={styles.lockedNote}>Cố định theo eKYC</Text>
                </View>
                <View style={styles.lockedValPill}>
                  <MaterialCommunityIcons name="lock" size={13} color="#64748B" />
                  <Text style={styles.lockedValText}>{maskIdCard(identityNumber)}</Text>
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

            {/* Quick Account Actions Row */}
            <View style={styles.quickSettingsRow}>
              <TouchableOpacity
                style={styles.quickSettingBtn}
                onPress={handleOpenEditProfile}
                activeOpacity={0.8}
              >
                <View style={styles.quickSettingIcon}>
                  <MaterialCommunityIcons name="pencil-outline" size={17} color="#001743" />
                </View>
                <Text style={styles.quickSettingText}>Sửa thông tin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickSettingBtn}
                onPress={() => setShowPasswordModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.quickSettingIcon}>
                  <MaterialCommunityIcons name="lock-reset" size={17} color="#001743" />
                </View>
                <Text style={styles.quickSettingText}>Đổi mật khẩu</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ─── TAB 2: LỊCH SỬ GỬI ĐỊNH DANH EKYC ─── */
          <View>
            {kycHistory.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons
                    name="card-account-details-outline"
                    size={24}
                    color="#001743"
                  />
                </View>
                <Text style={styles.emptyTitle}>Chưa có lượt gửi eKYC nào</Text>
                <TouchableOpacity
                  style={styles.emptyCtaPill}
                  onPress={() => router.push('/kyc')}
                  activeOpacity={0.88}
                >
                  <MaterialCommunityIcons name="camera" size={15} color="#FFFFFF" />
                  <Text style={styles.emptyCtaText}>Thực hiện eKYC ngay</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.kycHistoryStack}>
                {kycHistory.map((item, idx) => {
                  const meta = getKycStatusMeta(item.verificationStatus);
                  const dateStr = item.submittedAt
                    ? new Date(item.submittedAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';
                  const isMatchScore =
                    typeof item.faceSimilarityScore === 'number' &&
                    item.faceSimilarityScore > 0;

                  return (
                    <View key={item.id || String(idx)} style={styles.kycHistoryCard}>
                      <View style={styles.kycCardTopRow}>
                        <View style={styles.kycCodeBadgeRow}>
                          <View style={styles.kycOrderBadge}>
                            <Text style={styles.kycOrderText}>#{idx + 1}</Text>
                          </View>
                          <View>
                            <Text style={styles.kycCodeText}>
                              HỒ SƠ #{item.id?.slice(0, 8).toUpperCase() || 'EKYC'}
                            </Text>
                            <Text style={styles.kycDateText}>{dateStr}</Text>
                          </View>
                        </View>

                        <View style={[styles.kycStatusPill, { backgroundColor: meta.bg, marginTop: 0 }]}>
                          <View style={[styles.kycStatusDot, { backgroundColor: meta.dot }]} />
                          <Text style={[styles.kycStatusText, { color: meta.color }]}>
                            {meta.shortLabel}
                          </Text>
                        </View>
                      </View>

                      {(item.fullName || item.identityNumber || isMatchScore) && (
                        <View style={styles.kycDetailStage}>
                          {item.fullName ? (
                            <View style={styles.kycDetailRow}>
                              <Text style={styles.kycDetailLabel}>Họ và tên</Text>
                              <Text style={styles.kycDetailVal}>{item.fullName}</Text>
                            </View>
                          ) : null}
                          {item.identityNumber ? (
                            <View style={styles.kycDetailRow}>
                              <Text style={styles.kycDetailLabel}>Số CCCD</Text>
                              <Text style={[styles.kycDetailVal, styles.monoVal]}>
                                {maskIdCard(item.identityNumber)}
                              </Text>
                            </View>
                          ) : null}
                          {isMatchScore ? (
                            <View style={styles.kycDetailRow}>
                              <Text style={styles.kycDetailLabel}>Khớp khuôn mặt</Text>
                              <Text style={[styles.kycDetailVal, { color: '#059669' }]}>
                                {Math.round(item.faceSimilarityScore!)}%
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      )}

                      {item.verificationStatus === 'REJECTED' && item.rejectionReason ? (
                        <View style={styles.rejectionAlert}>
                          <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={15}
                            color="#E11D48"
                          />
                          <Text style={styles.rejectionAlertText}>
                            {item.rejectionReason}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ─── 4. LOGOUT BUTTON ─── */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="logout" size={17} color="#E11D48" />
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
              <Text style={styles.modalTitle}>Chỉnh sửa thông tin</Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={20} color="#001743" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <View style={styles.inputGroup}>
                <View style={styles.labelWithLockRow}>
                  <Text style={styles.inputLabel}>Số CCCD / Mã định danh</Text>
                  <View style={styles.lockedPill}>
                    <MaterialCommunityIcons name="lock" size={11} color="#64748B" />
                    <Text style={styles.lockedPillText}>Cố định</Text>
                  </View>
                </View>
                <View style={styles.disabledInputBox}>
                  <Text style={styles.disabledInputText}>
                    {identityNumber || 'Chưa có CCCD'}
                  </Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ và tên *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Nhập họ và tên đầy đủ"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Số điện thoại liên hệ *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editPhoneNumber}
                  onChangeText={setEditPhoneNumber}
                  placeholder="Ví dụ: 0912345678"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ngày sinh (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editDateOfBirth}
                  onChangeText={setEditDateOfBirth}
                  placeholder="Ví dụ: 1995-08-15"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nơi thường trú</Text>
                <TextInput
                  style={[styles.textInput, { height: 68, textAlignVertical: 'top' }]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder="Nhập địa chỉ thường trú"
                  placeholderTextColor="#94A3B8"
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
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
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
                  <Text style={styles.modalSubmitBtnText}>Lưu thông tin</Text>
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
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="close" size={20} color="#001743" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu hiện tại *</Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Nhập mật khẩu đang dùng"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPasswordText}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswordText(!showPasswordText)}
                    style={styles.eyeBtn}
                  >
                    <MaterialCommunityIcons
                      name={showPasswordText ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mật khẩu mới (Tối thiểu 6 ký tự) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPasswordText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Xác nhận mật khẩu mới *</Text>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor="#94A3B8"
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
                  <Text style={styles.modalSubmitBtnText}>Đổi mật khẩu</Text>
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
    backgroundColor: '#F6F7FB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 114,
  },

  // 1. Unified Top Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#001743',
    letterSpacing: -0.6,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // 2. Centered Profile Showcase Card (Image 1 & Image 4 Style)
  profileHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 18,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF1FA',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '800',
    color: '#001743',
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#001743',
    letterSpacing: -0.4,
  },
  profileHandle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  kycStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    marginTop: 10,
  },
  kycStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  kycStatusText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  rejectionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    alignSelf: 'stretch',
  },
  rejectionAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#E11D48',
  },
  ekycPrimaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#001743',
    borderRadius: 9999,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 14,
    alignSelf: 'stretch',
  },
  ekycPrimaryPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    alignSelf: 'stretch',
  },
  profileStatBlock: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  profileStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  profileStatVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#001743',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },

  // 3. Segmented Tab Switcher
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF1FA',
    borderRadius: 9999,
    padding: 4,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
  },
  segmentBtnActive: {
    backgroundColor: '#001743',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Tab 1: Record Card
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    marginBottom: 12,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  recordLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  lockedNote: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  lockedValPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F4FB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  lockedValText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#001743',
    fontVariant: ['tabular-nums'],
  },
  recordVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#001743',
    textAlign: 'right',
    flexShrink: 1,
  },
  monoVal: {
    fontVariant: ['tabular-nums'],
  },
  hairline: {
    height: 1,
    backgroundColor: 'rgba(0, 23, 67, 0.05)',
  },
  quickSettingsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickSettingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
  },
  quickSettingIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSettingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#001743',
  },

  // Tab 2: KYC History
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    marginBottom: 16,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#001743',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    marginTop: 14,
  },
  emptyCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  kycHistoryStack: {
    gap: 12,
    marginBottom: 16,
  },
  kycHistoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
  },
  kycCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kycCodeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kycOrderBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: '#EEF1FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycOrderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#001743',
  },
  kycCodeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#001743',
  },
  kycDateText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  kycDetailStage: {
    backgroundColor: '#F6F7FB',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    gap: 6,
  },
  kycDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kycDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  kycDetailVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#001743',
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.16)',
    marginTop: 4,
  },
  logoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#E11D48',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 23, 67, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#001743',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 14,
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
    color: '#001743',
    marginBottom: 6,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F4FB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  lockedPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  disabledInputBox: {
    backgroundColor: '#F6F7FB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  disabledInputText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    fontVariant: ['tabular-nums'],
  },
  textInput: {
    backgroundColor: '#F6F7FB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#001743',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.08)',
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F7FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.08)',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#001743',
  },
  eyeBtn: {
    padding: 6,
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#001743',
  },
  modalSubmitBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#001743',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

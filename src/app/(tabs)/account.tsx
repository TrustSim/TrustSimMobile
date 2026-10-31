import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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

  const loadAccountDetails = useCallback(async () => {
    try {
      const [simRes, kycRes] = await Promise.allSettled([
        simService.getMyOwnerships({ pageIndex: 1, pageSize: 20 }),
        kycService.getKycStatus(),
      ]);

      if (simRes.status === 'fulfilled' && simRes.value.success && simRes.value.data?.items) {
        setVerifiedSimsCount(simRes.value.data.totalCount ?? simRes.value.data.items.length);
      }
      if (kycRes.status === 'fulfilled' && kycRes.value.success && kycRes.value.data) {
        setKycData(kycRes.value.data);
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
    (isVerified ? 2 : 0) + (verifiedSimsCount > 0 ? 1 : 0) + (isVerified ? 1 : 0);

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
            <Text style={styles.trustScoreText}>Bảo chứng {completedPillars}/4</Text>
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
                  size={17}
                  color="#FFFFFF"
                />
                <Text style={styles.passportPrimaryBtnText}>Chụp CCCD & Khuôn mặt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.passportSecondaryBtn}
                onPress={() => router.push('/kyc/nfc')}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="nfc-variant" size={17} color="#FDE68A" />
                <Text style={styles.passportSecondaryBtnText}>Quét NFC</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 4 Trụ cột Xác thực (Interactive Verification Pillars) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>4 Lớp bảo chứng giao dịch</Text>
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
                Chụp 2 mặt CCCD và ảnh chân dung trực tiếp (3 bước)
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

          {/* 2. NFC Chip */}
          <TouchableOpacity
            style={styles.pillarCard}
            onPress={() => router.push('/kyc/nfc')}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.pillarIconBox,
                { backgroundColor: isVerified ? Colors.successLight : Colors.goldSoft },
              ]}
            >
              <MaterialCommunityIcons
                name="nfc-variant"
                size={22}
                color={isVerified ? Colors.success : Colors.gold}
              />
            </View>
            <View style={styles.pillarBody}>
              <Text style={styles.pillarTitle}>2. Quét chip NFC trên CCCD</Text>
              <Text style={styles.pillarDesc}>
                Đọc dữ liệu bảo mật ICAO 9303 trực tiếp từ chip điện tử
              </Text>
            </View>
            <VerificationStatusBadge
              status={isVerified ? 'verified' : 'checking'}
              label={isVerified ? 'Đã khớp' : 'Quét chip'}
              size="sm"
            />
          </TouchableOpacity>

          {/* 3. SIM Chính chủ */}
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
              <Text style={styles.pillarTitle}>3. Thuê bao SIM chính chủ</Text>
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

          {/* 4. Tài khoản ngân hàng nhận giải ngân */}
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
              <Text style={styles.pillarTitle}>4. Ngân hàng nhận tiền giải ngân</Text>
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

        {/* Thông tin hồ sơ trích xuất từ CCCD */}
        <View style={[styles.sectionHeaderRow, { marginTop: Spacing.xl }]}>
          <Text style={styles.sectionTitle}>Dữ liệu căn cước đã lưu</Text>
        </View>

        <View style={styles.recordCard}>
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>Số CCCD / Định danh</Text>
            <Text style={[styles.recordVal, styles.monoVal]}>
              {maskIdCard(identityNumber)}
            </Text>
          </View>
          <View style={styles.hairline} />
          <View style={styles.recordRow}>
            <Text style={styles.recordLabel}>Số điện thoại liên hệ</Text>
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
    paddingBottom: Spacing.xxxl,
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
    marginBottom: Spacing.xl,
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
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  passportPrimaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.crimson,
    borderRadius: BorderRadius.md,
    minHeight: 44,
  },
  passportPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  passportSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.35)',
    borderRadius: BorderRadius.md,
    minHeight: 44,
  },
  passportSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FDE68A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.3,
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
});

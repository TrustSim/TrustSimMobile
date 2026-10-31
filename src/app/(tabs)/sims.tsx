import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { simService } from '../../services/simService';
import { SimOwnershipDto, SimOwnershipSortBy, SortOrder } from '../../types';

const STATUS_FILTERS = [
  { key: undefined, label: 'Tất cả' },
  { key: 'ACTIVE', label: 'Đang sở hữu' },
  { key: 'UNVERIFIED', label: 'Chờ đối soát' },
] as const;

export default function MySimsScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [sims, setSims] = useState<SimOwnershipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

  const fetchSims = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await simService.getMyOwnerships({
          keyword: searchTerm.trim() || undefined,
          status: (selectedStatus as any) || undefined,
          sortBy: SimOwnershipSortBy.CreatedDate,
          sortOrder: SortOrder.Desc,
          pageIndex: 1,
          pageSize: 30,
        });

        if (res.success && res.data?.items) {
          setSims(res.data.items);
        } else {
          setSims([]);
        }
      } catch {
        setSims([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchTerm, selectedStatus]
  );

  useFocusEffect(
    useCallback(() => {
      fetchSims(false);
    }, [fetchSims])
  );

  const isKycVerified = profile?.verificationStatus === 'VERIFIED';

  const handleVerifyNewSim = () => {
    if (!isKycVerified) {
      Alert.alert(
        'Yêu cầu xác thực CCCD trước',
        'Để đối soát thông tin chủ thuê bao với nhà mạng, bạn cần hoàn tất xác thực Căn cước công dân trước.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Xác thực CCCD', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    router.push('/sims/verify');
  };

  const handleRegisterSim = () => {
    if (!isKycVerified) {
      Alert.alert(
        'Yêu cầu xác thực CCCD trước',
        'Vui lòng xác thực Căn cước công dân trước khi khai báo SIM lên hệ thống.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Xác thực CCCD', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    router.push('/sims/register');
  };

  const verifiedCount = sims.filter(
    (s) => s.verificationStatus === 'VERIFIED' || s.ownershipStatus === 'ACTIVE'
  ).length;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchSims(true)}
            tintColor={Colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.headerCaption}>ĐỐI SOÁT THUÊ BAO NHÀ MẠNG</Text>
            <Text style={styles.pageTitle}>Xác Thực SIM</Text>
          </View>
          <TouchableOpacity
            style={styles.registerLinkBtn}
            onPress={handleRegisterSim}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="plus" size={16} color={Colors.navy} />
            <Text style={styles.registerLinkText}>Khai báo SIM</Text>
          </TouchableOpacity>
        </View>

        {/* Bảng tóm tắt đối soát SIM & Nút xác thực OTP */}
        <View style={styles.summaryPanel}>
          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>TỔNG THUÊ BAO</Text>
              <Text style={styles.metricVal}>{sims.length}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>KHỚP CHÍNH CHỦ</Text>
              <Text style={[styles.metricVal, { color: Colors.success }]}>{verifiedCount}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>HỒ SƠ CCCD GỐC</Text>
              <Text
                style={[
                  styles.metricStatusText,
                  { color: isKycVerified ? Colors.success : Colors.warning },
                ]}
              >
                {isKycVerified ? 'Đã xác minh' : 'Chưa xác thực'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.verifySimCta}
            onPress={handleVerifyNewSim}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Xác thực SIM chính chủ bằng mã OTP"
          >
            <MaterialCommunityIcons name="cellphone-check" size={18} color="#fff" />
            <Text style={styles.verifySimCtaText}>Xác Thực SIM Chính Chủ Qua SMS OTP</Text>
          </TouchableOpacity>
        </View>

        {/* Thanh tìm kiếm & Bộ lọc */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmitEditing={() => fetchSims(false)}
              placeholder="Tìm theo số điện thoại..."
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              returnKeyType="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <MaterialCommunityIcons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.tabsRow}>
            {STATUS_FILTERS.map((f) => {
              const active = selectedStatus === f.key;
              return (
                <TouchableOpacity
                  key={f.label}
                  style={[styles.filterTab, active && styles.filterTabActive]}
                  onPress={() => setSelectedStatus(f.key)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Danh sách SIM đã liên kết */}
        <Text style={styles.listHeaderLabel}>DANH SÁCH THUÊ BAO ({sims.length})</Text>

        {loading && sims.length === 0 ? (
          <View style={styles.emptyPanel}>
            <ActivityIndicator size="small" color={Colors.navy} />
            <Text style={styles.emptySub}>Đang tải danh sách thuê bao...</Text>
          </View>
        ) : sims.length === 0 ? (
          <View style={styles.emptyPanel}>
            <MaterialCommunityIcons name="sim-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có SIM nào được xác thực</Text>
            <Text style={styles.emptySub}>
              Nhấn nút &ldquo;Xác Thực SIM Chính Chủ Qua SMS OTP&rdquo; phía trên để nhận mã xác nhận và đối chiếu thông tin thuê bao với CCCD của bạn.
            </Text>
          </View>
        ) : (
          <View style={styles.registryPanel}>
            {sims.map((item, index) => {
              const isSimVerified =
                item.verificationStatus === 'VERIFIED' || item.ownershipStatus === 'ACTIVE';
              const verifiedDate = item.verifiedAt || item.createdDate;
              const formattedDate = verifiedDate
                ? new Date(verifiedDate).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
                : '';

              return (
                <View
                  key={item.id}
                  style={[styles.simRow, index > 0 && styles.simRowDivider]}
                >
                  <View style={styles.simTopLine}>
                    <View>
                      <View style={styles.phoneBadgeRow}>
                        <Text style={styles.phoneNumberText}>{item.phoneNumber}</Text>
                        <View style={styles.carrierPill}>
                          <Text style={styles.carrierPillText}>
                            {item.carrierName || 'Nhà mạng'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.simMetaText}>
                        {item.formatRhythmName || 'Thuê bao di động'}
                        {formattedDate ? ` · Cập nhật ${formattedDate}` : ''}
                      </Text>
                    </View>

                    <VerificationStatusBadge
                      status={isSimVerified ? 'verified' : 'checking'}
                      label={isSimVerified ? 'Khớp chủ thuê bao' : 'Chờ đối soát'}
                      size="sm"
                    />
                  </View>

                  <View style={styles.simBottomLine}>
                    <Text style={styles.priceValueText}>
                      Định giá: {(item.price ?? 0).toLocaleString('vi-VN')} ₫
                    </Text>

                    {!isSimVerified ? (
                      <TouchableOpacity
                        style={styles.reverifyBtn}
                        onPress={() => router.push('/sims/verify')}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.reverifyBtnText}>Xác thực OTP</Text>
                        <MaterialCommunityIcons
                          name="arrow-right"
                          size={14}
                          color={Colors.blue}
                        />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.readyStatusText}>Đủ điều kiện giao dịch</Text>
                    )}
                  </View>
                </View>
              );
            })}
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  headerCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
  },
  registerLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    minHeight: 38,
  },
  registerLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.navy,
  },
  summaryPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  metricCol: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.sm,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  metricStatusText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  verifySimCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.sm,
    minHeight: 48,
  },
  verifySimCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  filterSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.navy,
    paddingVertical: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  listHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
    marginBottom: Spacing.sm,
  },
  emptyPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  registryPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  simRow: {
    padding: Spacing.md,
  },
  simRowDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  simTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  phoneBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  phoneNumberText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  carrierPill: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  carrierPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  simMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  simBottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  priceValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  reverifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reverifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
  },
  readyStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
});

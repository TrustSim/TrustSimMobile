import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { simService } from '../../services/simService';
import { SimOwnershipDto, SimOwnershipSortBy } from '../../types';

export default function MySimsScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [sims, setSims] = useState<SimOwnershipDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SimOwnershipSortBy>('CreatedDate_Desc');
  const [pageIndex, setPageIndex] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchSims = useCallback(async (isRefresh = false, page = 1) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await simService.getMyOwnerships({
        search: searchTerm.trim() || undefined,
        sortBy,
        pageIndex: page,
        pageSize: 10,
      });

      if (res.success && res.data?.items) {
        if (page === 1) {
          setSims(res.data.items);
        } else {
          setSims((prev) => [...prev, ...res.data.items]);
        }
        setHasNextPage(res.data.hasNextPage);
      } else {
        if (page === 1) setSims([]);
      }
    } catch {
      if (page === 1) setSims([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm, sortBy]);

  useEffect(() => {
    fetchSims(true, 1);
  }, [fetchSims]);

  const handleVerifyNewSim = () => {
    // Check eKYC pre-condition
    if (profile?.verificationStatus !== 'VERIFIED') {
      Alert.alert(
        'Yêu cầu xác minh danh tính',
        'Để thêm số điện thoại chính chủ, bạn cần hoàn thành xác minh căn cước công dân trước.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Xác minh ngay', onPress: () => router.push('/kyc') },
        ]
      );
      return;
    }
    router.push('/sims/verify');
  };

  const formatVnd = (price: number) => {
    return price.toLocaleString('vi-VN') + ' đ';
  };

  const renderSimCard = ({ item }: { item: SimOwnershipDto }) => {
    return (
      <Card style={styles.simCard}>
        <View style={styles.simCardHeader}>
          <View>
            <View style={styles.phoneRow}>
              <Ionicons name="phone-portrait" size={20} color={Colors.primary} />
              <Text style={styles.simNumber}>{item.phoneNumber}</Text>
            </View>
            <Text style={styles.simRhythm}>
              {item.formatRhythmName || 'Số đẹp'} • Giá: {formatVnd(item.price)}
            </Text>
          </View>

          <View style={styles.carrierTag}>
            <Text style={styles.carrierText}>{item.carrierName}</Text>
          </View>
        </View>

        <View style={styles.simCardDivider} />

        <View style={styles.simCardFooter}>
          <View style={styles.statusRow}>
            <Badge status={item.simStatus} label={item.simStatus} />
            <View style={styles.verifiedTag}>
              <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
              <Text style={styles.verifiedTagText}>Chính chủ</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <Button
              title="Niêm yết bán"
              variant="outline"
              size="sm"
              onPress={() =>
                Alert.alert(
                  'Niêm yết SIM',
                  `Tạo yêu cầu niêm yết SIM ${item.phoneNumber} lên sàn TrustSim.`
                )
              }
              style={{ marginRight: Spacing.xs }}
            />
            <Button
              title="Tạo đấu giá"
              variant="secondary"
              size="sm"
              onPress={() =>
                Alert.alert(
                  'Phòng đấu giá',
                  `Tạo phòng đấu giá công khai cho SIM ${item.phoneNumber}.`
                )
              }
            />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.pageTitle}>Kho SIM Của Tôi</Text>
          <Text style={styles.simCountSub}>
            Đang quản lý {sims.length} SIM
          </Text>
        </View>

        <Button
          title="+ Thêm SIM"
          variant="primary"
          size="sm"
          icon={<Ionicons name="add" size={16} color={Colors.textInverse} />}
          onPress={handleVerifyNewSim}
        />
      </View>

      {/* Search & Sort Filters */}
      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            placeholder="Tìm số SIM, nhà mạng..."
            placeholderTextColor={Colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Toggle */}
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            setSortBy((prev) =>
              prev === 'CreatedDate_Desc' ? 'CreatedDate_Asc' : 'CreatedDate_Desc'
            );
          }}
        >
          <Ionicons name="swap-vertical" size={16} color={Colors.primary} />
          <Text style={styles.sortText}>
            {sortBy === 'CreatedDate_Desc' ? 'Mới nhất' : 'Cũ nhất'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SIM List */}
      <FlatList
        data={sims}
        keyExtractor={(item) => item.id}
        renderItem={renderSimCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchSims(true, 1)} />
        }
        onEndReached={() => {
          if (hasNextPage && !loading) {
            const nextP = pageIndex + 1;
            setPageIndex(nextP);
            fetchSims(false, nextP);
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="phone-portrait-outline" size={60} color={Colors.border} />
              <Text style={styles.emptyTitle}>Chưa có SIM nào</Text>
              <Text style={styles.emptySubtitle}>
                Bấm nút &quot;+ Thêm SIM&quot; phía trên để liên kết số điện thoại chính chủ của bạn.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  simCountSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 42,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 4,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  simCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  simCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  simNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text,
    marginLeft: Spacing.xs,
    letterSpacing: 0.5,
  },
  simRhythm: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  carrierTag: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  carrierText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary,
  },
  simCardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  simCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
    marginLeft: 2,
  },
  cardActions: {
    flexDirection: 'row',
  },
  loadingFooter: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: Spacing.xl,
  },
});

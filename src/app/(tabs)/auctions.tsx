import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export default function AuctionsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Đấu Giá</Text>
          <TouchableOpacity style={styles.filterBtn} accessibilityRole="button" accessibilityLabel="Lọc đấu giá">
            <MaterialCommunityIcons name="filter-outline" size={20} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {/* Empty state — placeholder until auction service integrated */}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <MaterialCommunityIcons name="gavel" size={40} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có phiên đấu giá</Text>
          <Text style={styles.emptyDesc}>
            Các phiên đấu giá SIM đang hoạt động sẽ xuất hiện tại đây.{'\n'}
            Kéo xuống để làm mới.
          </Text>
        </View>

        {/* Info strip */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={16} color={Colors.blue} />
          <Text style={styles.infoText}>
            Bạn cần xác thực danh tính (Trust ID) để đặt cọc tham gia đấu giá.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(22,102,197,0.06)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  infoText: {
    fontSize: 13,
    color: Colors.blue,
    flex: 1,
    lineHeight: 18,
  },
});


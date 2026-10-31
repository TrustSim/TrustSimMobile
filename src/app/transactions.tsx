import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { BottomNavBar } from '../components/BottomNavBar';
import { Header } from '../components/Header';
import { VerificationStatusBadge } from '../components/trust/VerificationStatusBadge';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { walletService } from '../services/walletService';
import {
  SortOrder,
  StatementItemDto,
  UnifiedStatementQueryFilter,
  WalletTransactionSortBy,
} from '../types';

type SourceFilterKey = 'ALL' | 'WALLET' | 'AUCTION_DEPOSIT' | 'ESCROW' | 'COMPENSATION';

const SOURCE_FILTERS: { key: SourceFilterKey; label: string }[] = [
  { key: 'ALL', label: 'Tất cả sao kê' },
  { key: 'WALLET', label: 'Nạp & Rút tiền' },
  { key: 'AUCTION_DEPOSIT', label: 'Tiền cọc đấu giá' },
  { key: 'ESCROW', label: 'Tiền ký quỹ' },
  { key: 'COMPENSATION', label: 'Tiền bồi thường' },
];

function getStatementTitle(type: string, description?: string): string {
  switch (type) {
    case 'TOP_UP':
    case 'TOP_UP_CREDIT':
      return 'Nạp tiền vào ví (VietQR)';
    case 'WITHDRAW':
      return 'Rút tiền về ngân hàng';
    case 'AUCTION_DEPOSIT_LOCK':
      return 'Tạm khóa tiền đặt cọc đấu giá';
    case 'AUCTION_PROGRESSIVE_DEPOSIT_LOCK':
      return 'Bổ sung tiền đặt cọc đấu giá';
    case 'AUCTION_DEPOSIT_RELEASED':
      return 'Hoàn trả tiền đặt cọc đấu giá';
    case 'AUCTION_DEPOSIT_FORFEITED':
      return 'Khấu trừ cọc vi phạm quy chế';
    case 'ESCROW_HOLD':
      return 'Chuyển vào tiền ký quỹ giao dịch';
    case 'ESCROW_DEBIT':
      return 'Thanh toán từ tiền ký quỹ';
    case 'ESCROW_REFUNDED':
      return 'Hoàn trả tiền ký quỹ';
    case 'SELLER_PAYOUT':
      return 'Giải ngân tiền bán SIM từ ký quỹ';
    case 'AUCTION_COMPENSATION':
      return 'Nhận tiền bồi thường giao dịch';
    case 'PENALTY':
      return 'Khấu trừ tiền phạt';
    default:
      return description || type || 'Giao dịch tài chính';
  }
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { wallet, escrowBalance, refreshWallet } = useAuth();
  const [sourceFilter, setSourceFilter] = useState<SourceFilterKey>('ALL');
  const [items, setItems] = useState<StatementItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const filter: UnifiedStatementQueryFilter = {
          pageIndex: 1,
          pageSize: 50,
          sourceType: sourceFilter !== 'ALL' ? sourceFilter : undefined,
          sortBy: WalletTransactionSortBy.CreatedAt,
          sortOrder: SortOrder.Desc,
        };
        const res = await walletService.getStatement(filter);
        if (res.success && res.data?.items) {
          setItems(res.data.items);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sourceFilter]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRefresh = async () => {
    await Promise.allSettled([refreshWallet(), fetchHistory(true)]);
  };

  const availableBal = wallet?.availableBalance ?? 0;
  const depositBal = wallet?.lockedBalance ?? 0;
  const escrowBal = wallet?.escrowBalance ?? escrowBalance ?? 0;

  const getStatusBadge = (status?: string, direction?: string) => {
    if (direction === 'LOCK') {
      return <VerificationStatusBadge status="checking" label="Đang giữ trung gian" size="sm" />;
    }
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
        return <VerificationStatusBadge status="verified" label="Hoàn tất" size="sm" />;
      case 'PENDING':
        return <VerificationStatusBadge status="pending" label="Chờ xử lý" size="sm" />;
      case 'FAILED':
      case 'CANCELLED':
        return <VerificationStatusBadge status="rejected" label="Đã hủy" size="sm" />;
      default:
        return <VerificationStatusBadge status="not_submitted" label={status || 'Khác'} size="sm" />;
    }
  };

  const renderItem = ({ item, index }: { item: StatementItemDto; index: number }) => {
    const isCredit = item.direction === 'CREDIT';
    const isLock = item.direction === 'LOCK';
    const isEscrow =
      item.transactionType === 'ESCROW_HOLD' ||
      item.transactionType === 'ESCROW_DEBIT' ||
      item.transactionType === 'ESCROW_REFUNDED' ||
      item.transactionType === 'SELLER_PAYOUT';
    const refCode = item.referenceCode || item.transactionCode || item.id?.slice(0, 8);
    const txDate = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

    const indicatorBg = isCredit
      ? Colors.successLight
      : isLock
      ? isEscrow
        ? 'rgba(22, 102, 197, 0.1)'
        : Colors.warningLight
      : Colors.surfaceAlt;

    const indicatorColor = isCredit
      ? Colors.success
      : isLock
      ? isEscrow
        ? Colors.blue
        : Colors.amber
      : Colors.navy;

    const iconName = isCredit
      ? 'arrow-down-left'
      : isLock
      ? 'shield-lock-outline'
      : 'arrow-up-right';

    return (
      <View style={[styles.txCard, index > 0 && styles.txDivider]}>
        <View style={styles.txRow}>
          <View style={[styles.txTypeIndicator, { backgroundColor: indicatorBg }]}>
            <MaterialCommunityIcons name={iconName} size={18} color={indicatorColor} />
          </View>

          <View style={styles.txMetaCol}>
            <Text style={styles.txTitle}>
              {getStatementTitle(item.transactionType, item.description)}
            </Text>
            {item.description ? (
              <Text style={styles.txDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.txSubRow}>
              <Text style={styles.txCode}>#{refCode}</Text>
              <Text style={styles.txDot}>·</Text>
              <Text style={styles.txDate}>{txDate}</Text>
            </View>
          </View>

          <View style={styles.txAmountCol}>
            <Text
              style={[
                styles.txAmount,
                {
                  color: isCredit
                    ? Colors.success
                    : isLock
                    ? isEscrow
                      ? Colors.blue
                      : Colors.amber
                    : Colors.navy,
                },
              ]}
            >
              {isCredit ? '+' : '-'}
              {Math.abs(item.amount).toLocaleString('vi-VN')} ₫
            </Text>
            <View style={{ marginTop: 4 }}>{getStatusBadge(item.status, item.direction)}</View>
          </View>
        </View>

        <View style={styles.balanceAuditRow}>
          <Text style={styles.balanceAuditText}>
            Trước GD: {(item.balanceBefore ?? 0).toLocaleString('vi-VN')} ₫
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={12} color={Colors.textMuted} />
          <Text style={styles.balanceAuditAfter}>
            Sau GD: {(item.balanceAfter ?? 0).toLocaleString('vi-VN')} ₫
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Header title="Toàn Bộ Sao Kê & Lịch Sử Ví" showBack onBack={() => router.back()} />

      {/* Tóm tắt nhanh 3 quỹ: Khả dụng · Tiền cọc đấu giá · Tiền ký quỹ */}
      <View style={styles.topSummaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>KHẢ DỤNG</Text>
          <Text
            style={styles.summaryValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {availableBal.toLocaleString('vi-VN')} ₫
          </Text>
        </View>
        <View style={styles.summaryVLine} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>TIỀN CỌC ĐẤU GIÁ</Text>
          <Text
            style={[styles.summaryValue, { color: Colors.amber }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {depositBal.toLocaleString('vi-VN')} ₫
          </Text>
        </View>
        <View style={styles.summaryVLine} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>KÝ QUỸ</Text>
          <Text
            style={[styles.summaryValue, { color: Colors.blue }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {escrowBal.toLocaleString('vi-VN')} ₫
          </Text>
        </View>
      </View>

      {/* Bộ lọc phân nhóm chuẩn hệ thống */}
      <View style={styles.filterBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {SOURCE_FILTERS.map((f) => {
            const active = sourceFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setSourceFilter(f.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.navy} />
          <Text style={styles.loadingText}>Đang tải sao kê sổ cái...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => item.id || String(idx)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.navy}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyPanel}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={36}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyTitle}>Chưa có bút toán nào trong mục này</Text>
              <Text style={styles.emptySub}>
                Các giao dịch Nạp/Rút, Tiền đặt cọc đấu giá và Tiền ký quỹ chuyển nhượng SIM sẽ hiển thị chi tiết tại đây.
              </Text>
            </View>
          }
        />
      )}

      {/* Đồng bộ 100% thanh điều hướng dưới cùng với các tab chính */}
      <BottomNavBar activeTab="wallet" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topSummaryStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  summaryVLine: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  filterBarWrapper: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  txCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  txDivider: {},
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  txTypeIndicator: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  txMetaCol: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.navy,
  },
  txDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  txCode: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  txDot: {
    fontSize: 11,
    color: Colors.textMuted,
    marginHorizontal: 5,
  },
  txDate: {
    fontSize: 11,
    color: Colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  balanceAuditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    marginTop: Spacing.sm,
  },
  balanceAuditText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  balanceAuditAfter: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  emptyPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Spacing.md,
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
    marginTop: 4,
    lineHeight: 18,
  },
});

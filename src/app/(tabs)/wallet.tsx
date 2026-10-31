import React, { useCallback, useMemo, useState } from 'react';
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
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/walletService';
import { StatementItemDto } from '../../types';

type LedgerFilter = 'ALL' | 'WALLET' | 'AUCTION_DEPOSIT' | 'ESCROW';

function getStatementTitle(type: string, description?: string): string {
  switch (type) {
    case 'TOP_UP':
    case 'TOP_UP_CREDIT':
      return 'Nạp tiền vào ví (VietQR)';
    case 'WITHDRAW':
      return 'Rút tiền về ngân hàng';
    case 'AUCTION_DEPOSIT_LOCK':
      return 'Đặt cọc tham gia đấu giá';
    case 'AUCTION_PROGRESSIVE_DEPOSIT_LOCK':
      return 'Bổ sung tiền cọc đấu giá';
    case 'AUCTION_DEPOSIT_RELEASED':
      return 'Hoàn tiền cọc đấu giá';
    case 'AUCTION_DEPOSIT_FORFEITED':
      return 'Khấu trừ cọc vi phạm';
    case 'ESCROW_HOLD':
      return 'Chuyển vào tiền ký quỹ';
    case 'ESCROW_DEBIT':
      return 'Thanh toán từ tiền ký quỹ';
    case 'ESCROW_REFUNDED':
      return 'Hoàn tiền ký quỹ';
    case 'SELLER_PAYOUT':
      return 'Giải ngân tiền bán SIM';
    case 'AUCTION_COMPENSATION':
      return 'Nhận tiền bồi thường';
    case 'PENALTY':
      return 'Khấu trừ tiền phạt';
    default:
      return description || type || 'Giao dịch tài chính';
  }
}

function isDepositTx(item: StatementItemDto): boolean {
  const t = String(item.transactionType || '');
  return (
    t === 'AUCTION_DEPOSIT_LOCK' ||
    t === 'AUCTION_PROGRESSIVE_DEPOSIT_LOCK' ||
    t === 'AUCTION_DEPOSIT_RELEASED' ||
    t === 'AUCTION_DEPOSIT_FORFEITED'
  );
}

function isEscrowTx(item: StatementItemDto): boolean {
  const t = String(item.transactionType || '');
  return (
    t === 'ESCROW_HOLD' ||
    t === 'ESCROW_DEBIT' ||
    t === 'ESCROW_REFUNDED' ||
    t === 'SELLER_PAYOUT'
  );
}

function getTxStatusMeta(status?: string, direction?: string) {
  if (direction === 'LOCK') {
    return { label: 'Tạm giữ', dot: '#4C5FD5', color: '#4C5FD5' };
  }
  switch (status) {
    case 'COMPLETED':
    case 'SUCCESS':
      return { label: 'Hoàn tất', dot: '#10B981', color: '#059669' };
    case 'PENDING':
      return { label: 'Chờ duyệt', dot: '#F59E0B', color: '#D97706' };
    case 'FAILED':
    case 'CANCELLED':
      return { label: 'Từ chối', dot: '#E11D48', color: '#E11D48' };
    default:
      return { label: status || 'Hoàn tất', dot: '#94A3B8', color: '#64748B' };
  }
}

export default function WalletScreen() {
  const router = useRouter();
  const { wallet, escrowBalance, refreshWallet } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [statementItems, setStatementItems] = useState<StatementItemDto[]>([]);
  const [filter, setFilter] = useState<LedgerFilter>('ALL');

  const fetchRecentHistory = useCallback(async () => {
    try {
      const res = await walletService.getStatement({ pageIndex: 1, pageSize: 20 });
      if (res.success && res.data?.items) {
        setStatementItems(res.data.items);
        return;
      }
      const txRes = await walletService.getTransactions({ pageIndex: 1, pageSize: 15 });
      if (txRes.success && txRes.data?.items) {
        setStatementItems(
          txRes.data.items.map((tx) => ({
            id: tx.id,
            source: 'WALLET',
            transactionType: tx.walletTransactionType || tx.type || 'TOP_UP',
            direction:
              (tx.walletTransactionType || tx.type) === 'TOP_UP' ? 'CREDIT' : 'DEBIT',
            referenceCode: tx.transactionCode,
            amount: tx.amount,
            balanceBefore: tx.balanceBefore ?? 0,
            balanceAfter: tx.balanceAfter ?? 0,
            description: tx.description || '',
            createdAt: tx.createdAt,
            status: tx.transactionStatus || tx.status || 'COMPLETED',
          }))
        );
      } else {
        setStatementItems([]);
      }
    } catch {
      setStatementItems([]);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshWallet(), fetchRecentHistory()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      refreshWallet();
      fetchRecentHistory();
    }, [refreshWallet, fetchRecentHistory])
  );

  const availableBal = wallet?.availableBalance ?? 0;
  const depositBal = wallet?.lockedBalance ?? 0;
  const escrowBal = wallet?.escrowBalance ?? escrowBalance ?? 0;
  const totalBal = availableBal + depositBal + escrowBal;

  const filteredItems = useMemo(() => {
    if (filter === 'ALL') return statementItems;
    if (filter === 'WALLET') {
      return statementItems.filter(
        (tx) =>
          tx.source === 'WALLET' ||
          tx.transactionType === 'TOP_UP' ||
          tx.transactionType === 'WITHDRAW'
      );
    }
    if (filter === 'AUCTION_DEPOSIT') {
      return statementItems.filter(isDepositTx);
    }
    if (filter === 'ESCROW') {
      return statementItems.filter(isEscrowTx);
    }
    return statementItems;
  }, [statementItems, filter]);

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
          <Text style={styles.pageTitle}>Ví & Sổ cái</Text>

          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => router.push('/transactions')}
              activeOpacity={0.8}
              accessibilityLabel="Toàn bộ sao kê"
            >
              <MaterialCommunityIcons name="receipt-text-outline" size={19} color={Colors.navy} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconCircleBtn}
              onPress={() => router.push('/notifications')}
              activeOpacity={0.8}
              accessibilityLabel="Thông báo"
            >
              <MaterialCommunityIcons name="bell-outline" size={19} color={Colors.navy} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 2. HERO BALANCE CARD (Matching Home Soft-Cloud Luxury) ─── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>Số dư khả dụng</Text>
            <View style={styles.totalAssetPill}>
              <Text style={styles.totalAssetLabel}>Tổng tài sản </Text>
              <Text
                style={styles.totalAssetValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {totalBal.toLocaleString('vi-VN')} ₫
              </Text>
            </View>
          </View>

          <Text
            style={styles.heroBalanceValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {availableBal.toLocaleString('vi-VN')}{' '}
            <Text style={styles.heroCurrency}>₫</Text>
          </Text>

          {/* Action Pills */}
          <View style={styles.heroBtnRow}>
            <TouchableOpacity
              style={styles.heroPrimaryBtn}
              onPress={() => router.push('/deposit')}
              activeOpacity={0.88}
            >
              <MaterialCommunityIcons name="plus" size={17} color="#001743" />
              <Text style={styles.heroPrimaryBtnText}>Nạp tiền</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroSecondaryBtn}
              onPress={() => router.push('/withdraw')}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="arrow-top-right" size={17} color="#FFFFFF" />
              <Text style={styles.heroSecondaryBtnText}>Rút tiền</Text>
            </TouchableOpacity>
          </View>

          {/* Docked 2-Column Sub-Balances */}
          <View style={styles.heroStatsBar}>
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatCaption}>Tiền ký quỹ</Text>
              <Text
                style={styles.heroStatAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {escrowBal.toLocaleString('vi-VN')} ₫
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCol}>
              <Text style={styles.heroStatCaption}>Cọc đấu giá</Text>
              <Text
                style={styles.heroStatAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {depositBal.toLocaleString('vi-VN')} ₫
              </Text>
            </View>
          </View>
        </View>

        {/* ─── 3. STATEMENT LEDGER HEADER & FILTERS ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Biến động số dư</Text>
          <TouchableOpacity
            onPress={() => router.push('/transactions')}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.viewAllLink}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'WALLET', label: 'Nạp / Rút' },
              { key: 'AUCTION_DEPOSIT', label: 'Cọc đấu giá' },
              { key: 'ESCROW', label: 'Tiền ký quỹ' },
            ] as { key: LedgerFilter; label: string }[]
          ).map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(item.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ─── 4. TRANSACTION CARDS (Soft-Cloud Luxury) ─── */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyPanel}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={24}
                color="#001743"
              />
            </View>
            <Text style={styles.emptyTitle}>Chưa có giao dịch phù hợp</Text>
          </View>
        ) : (
          <View style={styles.txStack}>
            {filteredItems.map((tx, idx) => {
              const isCredit = tx.direction === 'CREDIT';
              const isLock = tx.direction === 'LOCK';
              const refCode = tx.referenceCode || tx.transactionCode || tx.id?.slice(0, 8);
              const txDate = tx.createdAt
                ? new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—';

              const iconName = isCredit
                ? 'arrow-bottom-left'
                : isLock
                ? 'shield-lock-outline'
                : 'arrow-top-right';

              const statusMeta = getTxStatusMeta(tx.status, tx.direction);

              return (
                <View key={tx.id || refCode || idx} style={styles.txCard}>
                  <View style={styles.txIconSquircle}>
                    <MaterialCommunityIcons name={iconName} size={19} color="#001743" />
                  </View>

                  <View style={styles.txMetaCol}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {getStatementTitle(tx.transactionType, tx.description)}
                    </Text>
                    <Text style={styles.txSub} numberOfLines={1}>
                      #{refCode} · {txDate}
                    </Text>
                  </View>

                  <View style={styles.txAmountCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isCredit ? '#059669' : '#001743' },
                      ]}
                    >
                      {isCredit ? '+' : '-'}
                      {Math.abs(tx.amount).toLocaleString('vi-VN')} ₫
                    </Text>
                    <View style={styles.txStatusRow}>
                      <View
                        style={[styles.txStatusDot, { backgroundColor: statusMeta.dot }]}
                      />
                      <Text style={[styles.txStatusText, { color: statusMeta.color }]}>
                        {statusMeta.label}
                      </Text>
                    </View>
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

  // 2. Hero Balance Card
  heroCard: {
    backgroundColor: '#001743',
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.68)',
  },
  totalAssetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  totalAssetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  totalAssetValue: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  heroBalanceValue: {
    fontSize: 31,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.8,
    marginBottom: 18,
  },
  heroCurrency: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  heroBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  heroPrimaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#001743',
  },
  heroSecondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heroSecondaryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  heroStatCol: {
    flex: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 12,
  },
  heroStatCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
  },
  heroStatAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },

  // 3. Statement Header & Filters
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#001743',
    letterSpacing: -0.4,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4C5FD5',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.06)',
  },
  filterPillActive: {
    backgroundColor: '#001743',
    borderColor: '#001743',
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },

  // 4. Transaction Cards
  emptyPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
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
  txStack: {
    gap: 10,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 23, 67, 0.05)',
    shadowColor: '#001743',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
    gap: 12,
  },
  txIconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMetaCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#001743',
  },
  txSub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
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
  txStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  txStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  txStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

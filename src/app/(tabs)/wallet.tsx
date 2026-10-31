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
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/walletService';
import { WalletTransactionDto } from '../../types';

type TxFilter = 'ALL' | 'TOP_UP' | 'WITHDRAW';

export default function WalletScreen() {
  const router = useRouter();
  const { wallet, refreshWallet } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransactionDto[]>([]);
  const [filter, setFilter] = useState<TxFilter>('ALL');

  const fetchRecentHistory = useCallback(async () => {
    try {
      const res = await walletService.getTransactions({ pageIndex: 1, pageSize: 15 });
      if (res.success && res.data?.items) {
        setRecentTransactions(res.data.items);
      } else {
        setRecentTransactions([]);
      }
    } catch {
      setRecentTransactions([]);
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
  const lockedBal = wallet?.lockedBalance ?? 0;
  const totalBal = wallet?.totalBalance ?? availableBal + lockedBal;

  const filteredTransactions = useMemo(() => {
    if (filter === 'ALL') return recentTransactions;
    return recentTransactions.filter((tx) => {
      const type = tx.walletTransactionType || tx.type;
      return filter === 'TOP_UP' ? type === 'TOP_UP' : type !== 'TOP_UP';
    });
  }, [recentTransactions, filter]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
        return <VerificationStatusBadge status="verified" label="Hoàn tất" size="sm" />;
      case 'PENDING':
        return <VerificationStatusBadge status="pending" label="Chờ duyệt" size="sm" />;
      case 'FAILED':
      case 'CANCELLED':
        return <VerificationStatusBadge status="rejected" label="Từ chối" size="sm" />;
      default:
        return <VerificationStatusBadge status="not_submitted" label={status || 'Khác'} size="sm" />;
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>SỔ CÁI TÀI CHÍNH & THANH TOÁN</Text>
            <Text style={styles.pageTitle}>Ví Tiền</Text>
          </View>
          <View style={styles.statusChip}>
            <View style={styles.statusDot} />
            <Text style={styles.statusChipText}>
              {wallet?.walletStatus === 'LOCKED' ? 'TẠM KHÓA' : 'HOẠT ĐỘNG'}
            </Text>
          </View>
        </View>

        {/* Financial Balance Ledger Panel */}
        <View style={styles.ledgerPanel}>
          <View style={styles.balanceMainBlock}>
            <Text style={styles.balanceLabel}>SỐ DƯ KHẢ DỤNG</Text>
            <Text style={styles.balanceValue}>
              {availableBal.toLocaleString('vi-VN')} <Text style={styles.currencyUnit}>₫</Text>
            </Text>
          </View>

          <View style={styles.hairlineH} />

          <View style={styles.subLedgerGrid}>
            <View style={styles.subLedgerCell}>
              <Text style={styles.subLedgerLabel}>TIỀN ĐANG KÝ QUỸ</Text>
              <Text style={[styles.subLedgerValue, { color: Colors.amber }]}>
                {lockedBal.toLocaleString('vi-VN')} ₫
              </Text>
              <Text style={styles.subLedgerNote}>Tạm giữ bảo đảm giao dịch</Text>
            </View>
            <View style={styles.hairlineV} />
            <View style={styles.subLedgerCell}>
              <Text style={styles.subLedgerLabel}>TỔNG TÀI SẢN VÍ</Text>
              <Text style={styles.subLedgerValue}>{totalBal.toLocaleString('vi-VN')} ₫</Text>
              <Text style={styles.subLedgerNote}>Khả dụng + Ký quỹ</Text>
            </View>
          </View>

          <View style={styles.hairlineH} />

          {/* Primary Financial Operations */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.push('/deposit')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Nạp tiền vào ví"
            >
              <MaterialCommunityIcons name="arrow-down-left" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>Nạp tiền (VietQR)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => router.push('/withdraw')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Rút tiền ngân hàng"
            >
              <MaterialCommunityIcons name="arrow-up-right" size={18} color={Colors.navy} />
              <Text style={styles.secondaryActionText}>Rút về ngân hàng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Concise Escrow Rule Strip */}
        <View style={styles.policyStrip}>
          <MaterialCommunityIcons name="shield-lock-outline" size={16} color={Colors.navy} />
          <Text style={styles.policyText}>
            Tiền ký quỹ chỉ giải ngân cho người bán sau khi hoàn tất sang tên SIM hoặc có quyết định xử lý khiếu nại.
          </Text>
        </View>

        {/* Transaction History Header & Filters */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>BIẾN ĐỘNG SỐ DƯ</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')} activeOpacity={0.7}>
            <Text style={styles.viewAllLink}>Toàn bộ sao kê</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'TOP_UP', label: 'Nạp tiền' },
              { key: 'WITHDRAW', label: 'Rút tiền' },
            ] as { key: TxFilter; label: string }[]
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
        </View>

        {/* Unified Transaction Ledger Table */}
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyPanel}>
            <MaterialCommunityIcons name="receipt-text-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có giao dịch phù hợp</Text>
            <Text style={styles.emptySub}>
              Mọi lệnh nạp tiền VietQR và rút tiền ngân hàng sẽ được ghi nhận tại sổ cái này.
            </Text>
          </View>
        ) : (
          <View style={styles.txLedgerPanel}>
            {filteredTransactions.map((tx, idx) => {
              const isTopUp = tx.walletTransactionType === 'TOP_UP' || tx.type === 'TOP_UP';
              const txDate = tx.createdAt
                ? new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
                : '—';

              return (
                <React.Fragment key={tx.id || tx.transactionCode || idx}>
                  {idx > 0 && <View style={styles.hairlineH} />}
                  <View style={styles.txRow}>
                    <View
                      style={[
                        styles.txTypeIndicator,
                        { backgroundColor: isTopUp ? Colors.successLight : Colors.surfaceAlt },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isTopUp ? 'arrow-down-left' : 'arrow-up-right'}
                        size={18}
                        color={isTopUp ? Colors.success : Colors.navy}
                      />
                    </View>

                    <View style={styles.txMetaCol}>
                      <Text style={styles.txTitle}>
                        {isTopUp ? 'Nạp tiền vào ví' : 'Rút tiền về ngân hàng'}
                      </Text>
                      <View style={styles.txSubRow}>
                        <Text style={styles.txCode}>#{tx.transactionCode}</Text>
                        <Text style={styles.txDot}>·</Text>
                        <Text style={styles.txDate}>{txDate}</Text>
                      </View>
                    </View>

                    <View style={styles.txAmountCol}>
                      <Text
                        style={[
                          styles.txAmount,
                          { color: isTopUp ? Colors.success : Colors.navy },
                        ]}
                      >
                        {isTopUp ? '+' : '-'}
                        {Math.abs(tx.amount).toLocaleString('vi-VN')} ₫
                      </Text>
                      <View style={{ marginTop: 4 }}>
                        {getStatusBadge(tx.transactionStatus || tx.status)}
                      </View>
                    </View>
                  </View>
                </React.Fragment>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
    marginTop: 2,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: 0.5,
  },
  ledgerPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  balanceMainBlock: {
    padding: Spacing.lg,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  currencyUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  hairlineH: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  hairlineV: {
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  subLedgerGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAFBFD',
  },
  subLedgerCell: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  subLedgerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  subLedgerValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  subLedgerNote: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.sm,
    minHeight: 46,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    minHeight: 46,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  policyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  policyText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.7,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.blue,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
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
    marginTop: 4,
    lineHeight: 17,
  },
  txLedgerPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  txTypeIndicator: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  txMetaCol: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  txSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
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
});

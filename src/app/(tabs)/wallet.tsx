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
import { BorderRadius, Colors, Shadows, Spacing } from '../../constants/theme';
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
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
      return 'Khấu trừ cọc vi phạm quy chế';
    case 'ESCROW_HOLD':
      return 'Chuyển vào tiền ký quỹ (Escrow)';
    case 'ESCROW_DEBIT':
      return 'Thanh toán từ quỹ ký quỹ (Escrow)';
    case 'ESCROW_REFUNDED':
      return 'Hoàn tiền ký quỹ (Escrow)';
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

  const getStatusBadge = (status?: string, direction?: string) => {
    if (direction === 'LOCK') {
      return <VerificationStatusBadge status="checking" label="Đang giữ trung gian" size="sm" />;
    }
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.navy} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerSub}>Sổ cái tài chính · Cọc & Ký quỹ trung gian</Text>
            <Text style={styles.pageTitle}>Ví Tiền & Bảo Chứng</Text>
          </View>
          <VerificationStatusBadge
            status={wallet?.walletStatus === 'LOCKED' ? 'rejected' : 'verified'}
            label={wallet?.walletStatus === 'LOCKED' ? 'Tạm khóa' : 'Đang hoạt động'}
            size="sm"
          />
        </View>

        {/* Deep Navy Financial Vault Hero Card */}
        <View style={styles.vaultHeroCard}>
          <View style={styles.vaultGlow} />
          <View style={styles.vaultTopRow}>
            <View>
              <Text style={styles.vaultBalanceCaption}>Số dư khả dụng</Text>
              <Text style={styles.vaultBalanceValue}>
                {availableBal.toLocaleString('vi-VN')}{' '}
                <Text style={styles.vaultCurrency}>₫</Text>
              </Text>
            </View>
            <View style={styles.totalAssetPill}>
              <Text style={styles.totalAssetLabel}>Tổng tài sản</Text>
              <Text style={styles.totalAssetValue}>
                {totalBal.toLocaleString('vi-VN')} ₫
              </Text>
            </View>
          </View>

          {/* 2 Glass Cards: Tiền Cọc Đấu Giá vs Tiền Ký Quỹ (Escrow) */}
          <View style={styles.vaultGlassGrid}>
            <View style={styles.vaultGlassBox}>
              <View style={styles.vaultGlassHeader}>
                <View style={[styles.vaultDot, { backgroundColor: '#FBBF24' }]} />
                <Text style={styles.vaultGlassTitle}>Tiền cọc đấu giá</Text>
              </View>
              <Text style={[styles.vaultGlassAmount, { color: '#FDE68A' }]}>
                {depositBal.toLocaleString('vi-VN')} ₫
              </Text>
              <Text style={styles.vaultGlassNote}>
                Giữ khi đấu giá (Thắng → cộng vào ký quỹ; Không thắng → hoàn tiền)
              </Text>
            </View>

            <View style={styles.vaultGlassBox}>
              <View style={styles.vaultGlassHeader}>
                <View style={[styles.vaultDot, { backgroundColor: '#38BDF8' }]} />
                <Text style={styles.vaultGlassTitle}>Tiền ký quỹ (Escrow)</Text>
              </View>
              <Text style={[styles.vaultGlassAmount, { color: '#7DD3FC' }]}>
                {escrowBal.toLocaleString('vi-VN')} ₫
              </Text>
              <Text style={styles.vaultGlassNote}>
                Giữ cho hợp đồng & sang tên (Hoàn tất → trả người bán; Hủy → hoàn tiền)
              </Text>
            </View>
          </View>

          {/* Primary Actions */}
          <View style={styles.vaultBtnRow}>
            <TouchableOpacity
              style={styles.depositCtaBtn}
              onPress={() => router.push('/deposit')}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Nạp tiền vào ví"
            >
              <MaterialCommunityIcons name="arrow-down-left" size={18} color="#FFFFFF" />
              <Text style={styles.depositCtaText}>Nạp tiền (VietQR)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.withdrawCtaBtn}
              onPress={() => router.push('/withdraw')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Rút tiền ngân hàng"
            >
              <MaterialCommunityIcons name="arrow-up-right" size={18} color="#FFFFFF" />
              <Text style={styles.withdrawCtaText}>Rút về ngân hàng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Giải thích cơ chế Bảo chứng 2 lớp */}
        <View style={styles.policyCard}>
          <View style={styles.policyIconWrap}>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color={Colors.blue} />
          </View>
          <Text style={styles.policyText}>
            <Text style={{ fontWeight: '800', color: Colors.navy }}>Cơ chế bảo chứng 2 lớp: </Text>
            Khi tham gia đấu giá, sàn tạm giữ <Text style={{ fontWeight: '700' }}>Tiền cọc</Text> (không thắng hoàn ngay; thắng cộng vào tiền ký quỹ). Khi lập hợp đồng chuyển nhượng, toàn bộ giá trị SIM nằm trong <Text style={{ fontWeight: '700' }}>Tiền ký quỹ (Escrow)</Text> và chỉ giải ngân cho người bán sau khi sang tên thành công.
          </Text>
        </View>

        {/* Transaction History Header & Filters */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Biến động số dư & Sao kê</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')} activeOpacity={0.75}>
            <Text style={styles.viewAllLink}>Toàn bộ sao kê →</Text>
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
              { key: 'AUCTION_DEPOSIT', label: 'Tiền cọc đấu giá' },
              { key: 'ESCROW', label: 'Tiền ký quỹ (Escrow)' },
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

        {/* Unified Transaction Ledger List */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyPanel}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons
                name="receipt-text-outline"
                size={26}
                color={Colors.blue}
              />
            </View>
            <Text style={styles.emptyTitle}>Chưa có giao dịch phù hợp</Text>
            <Text style={styles.emptySub}>
              Mọi biến động Nạp/Rút, Đặt cọc đấu giá và Tiền ký quỹ (Escrow) đều được ghi nhận minh bạch tại đây.
            </Text>
          </View>
        ) : (
          <View style={styles.txLedgerPanel}>
            {filteredItems.map((tx, idx) => {
              const isCredit = tx.direction === 'CREDIT';
              const isLock = tx.direction === 'LOCK';
              const isEscrow = isEscrowTx(tx);
              const refCode = tx.referenceCode || tx.transactionCode || tx.id?.slice(0, 8);
              const txDate = tx.createdAt
                ? new Date(tx.createdAt).toLocaleDateString('vi-VN', {
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
                  ? Colors.blueSoft
                  : Colors.warningLight
                : Colors.surfaceMuted;

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
                <React.Fragment key={tx.id || refCode || idx}>
                  {idx > 0 && <View style={styles.hairlineH} />}
                  <View style={styles.txRow}>
                    <View style={[styles.txTypeIndicator, { backgroundColor: indicatorBg }]}>
                      <MaterialCommunityIcons
                        name={iconName}
                        size={19}
                        color={indicatorColor}
                      />
                    </View>

                    <View style={styles.txMetaCol}>
                      <Text style={styles.txTitle}>
                        {getStatementTitle(tx.transactionType, tx.description)}
                      </Text>
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
                        {Math.abs(tx.amount).toLocaleString('vi-VN')} ₫
                      </Text>
                      <View style={{ marginTop: 4 }}>
                        {getStatusBadge(tx.status, tx.direction)}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  headerRow: {
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
  vaultHeroCard: {
    backgroundColor: Colors.navy,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.lg,
  },
  vaultGlow: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(29, 78, 216, 0.3)',
  },
  vaultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  vaultBalanceCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  vaultBalanceValue: {
    fontSize: 31,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
    letterSpacing: -0.8,
  },
  vaultCurrency: {
    fontSize: 19,
    fontWeight: '700',
    color: '#94A3B8',
  },
  totalAssetPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  totalAssetLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  totalAssetValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
  vaultGlassGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  vaultGlassBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  vaultGlassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vaultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vaultGlassTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  vaultGlassAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 5,
    letterSpacing: -0.3,
  },
  vaultGlassNote: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 14,
  },
  vaultBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  depositCtaBtn: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.crimson,
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  depositCtaText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  withdrawCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: BorderRadius.md,
    minHeight: 46,
  },
  withdrawCtaText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  policyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyText: {
    flex: 1,
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.navy,
    letterSpacing: -0.3,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  emptyPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  emptySub: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  txLedgerPanel: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  hairlineH: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  txTypeIndicator: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  txMetaCol: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  txTitle: {
    fontSize: 13.5,
    fontWeight: '800',
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
    fontWeight: '600',
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
    fontSize: 14.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});

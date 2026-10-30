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
import { VerificationStatusBadge } from '../../components/trust/VerificationStatusBadge';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/walletService';
import { WalletTransactionDto } from '../../types';

export default function WalletScreen() {
  const router = useRouter();
  const { wallet, refreshWallet } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransactionDto[]>([]);

  const fetchRecentHistory = useCallback(async () => {
    try {
      const res = await walletService.getTransactions({ pageIndex: 1, pageSize: 6 });
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
  const totalBal = wallet?.totalBalance ?? (availableBal + lockedBal);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'SUCCESS':
        return <VerificationStatusBadge status="verified" label="Thành công" size="sm" />;
      case 'PENDING':
        return <VerificationStatusBadge status="pending" label="Đang xử lý" size="sm" />;
      case 'FAILED':
      case 'CANCELLED':
        return <VerificationStatusBadge status="rejected" label="Thất bại" size="sm" />;
      default:
        return <VerificationStatusBadge status="not_submitted" label={status || 'Khác'} size="sm" />;
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>Ví Tiền</Text>
          <View style={styles.statusPill}>
            <View style={styles.activeDot} />
            <Text style={styles.statusText}>{wallet?.walletStatus || 'HOẠT ĐỘNG'}</Text>
          </View>
        </View>

        {/* Thẻ số dư ví */}
        <View style={styles.masterCard}>
          <View style={styles.masterHeader}>
            <View>
              <Text style={styles.availableLabel}>SỐ DƯ KHẢ DỤNG</Text>
              <Text style={styles.availableAmount}>
                {availableBal.toLocaleString('vi-VN')}{' '}
                <Text style={styles.currencySymbol}>₫</Text>
              </Text>
            </View>
            <View style={styles.shieldIconBox}>
              <MaterialCommunityIcons name="shield-lock" size={22} color={Colors.navy} />
            </View>
          </View>

          {/* Phân tách: Tiền ký quỹ & Tổng số dư */}
          <View style={styles.breakdownBox}>
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Tiền ký quỹ an toàn</Text>
              <Text style={[styles.breakdownAmount, { color: Colors.warning }]}>
                {lockedBal.toLocaleString('vi-VN')} ₫
              </Text>
              <Text style={styles.breakdownNote}>Bảo đảm giao dịch chuyển nhượng</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownCol}>
              <Text style={styles.breakdownLabel}>Tổng số dư ví</Text>
              <Text style={styles.breakdownAmount}>
                {totalBal.toLocaleString('vi-VN')} ₫
              </Text>
              <Text style={styles.breakdownNote}>Khả dụng + Ký quỹ</Text>
            </View>
          </View>
        </View>

        {/* Nút hành động */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => router.push('/deposit')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Nạp tiền vào ví"
          >
            <MaterialCommunityIcons name="plus-circle" size={20} color="#fff" />
            <Text style={styles.actionBtnPrimaryText}>Nạp tiền</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push('/withdraw')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Rút tiền về ngân hàng"
          >
            <MaterialCommunityIcons name="arrow-up-circle-outline" size={20} color={Colors.navy} />
            <Text style={styles.actionBtnSecondaryText}>Rút tiền</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push('/transactions')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Xem lịch sử giao dịch"
          >
            <MaterialCommunityIcons name="file-document-outline" size={20} color={Colors.navy} />
            <Text style={styles.actionBtnSecondaryText}>Lịch sử</Text>
          </TouchableOpacity>
        </View>

        {/* Giải thích cơ chế bảo vệ ký quỹ */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="lock-check-outline" size={20} color={Colors.blue} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>Cơ chế bảo vệ ký quỹ an toàn</Text>
            <Text style={styles.infoDesc}>
              Số tiền cọc khi giao dịch được tạm giữ bảo đảm. Khi bên bán hoàn tất sang tên chính chủ và bên mua xác nhận đã nhận SIM, tiền mới được giải ngân.
            </Text>
          </View>
        </View>

        {/* Giao dịch gần đây */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Giao Dịch Gần Đây</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.seeAllBtn}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="receipt-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Chưa có biến động số dư</Text>
          </View>
        ) : (
          recentTransactions.map((tx) => {
            const isTopUp = tx.walletTransactionType === 'TOP_UP' || tx.type === 'TOP_UP';
            const txDate = tx.createdAt
              ? new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <View key={tx.id || tx.transactionCode} style={styles.txCard}>
                <View
                  style={[
                    styles.txIconBox,
                    { backgroundColor: isTopUp ? Colors.successLight : Colors.surfaceAlt },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={isTopUp ? 'arrow-down-left' : 'arrow-up-right'}
                    size={22}
                    color={isTopUp ? Colors.success : Colors.navy}
                  />
                </View>

                <View style={styles.txContent}>
                  <Text style={styles.txTitle}>
                    {isTopUp ? 'Nạp tiền vào ví' : 'Rút tiền về ngân hàng'}
                  </Text>
                  <Text style={styles.txCode}>#{tx.transactionCode}</Text>
                  <Text style={styles.txDate}>{txDate}</Text>
                </View>

                <View style={styles.txAmountBox}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isTopUp ? Colors.success : Colors.navy },
                    ]}
                  >
                    {isTopUp ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('vi-VN')} ₫
                  </Text>
                  <View style={{ marginTop: 4 }}>
                    {getStatusBadge(tx.transactionStatus || tx.status)}
                  </View>
                </View>
              </View>
            );
          })
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.navy,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.navy,
  },
  masterCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  masterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  availableLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  availableAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  shieldIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownBox: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  breakdownCol: {
    flex: 1,
  },
  breakdownDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  breakdownLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  breakdownAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  breakdownNote: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: BorderRadius.md,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.blue,
  },
  actionBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  actionBtnSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: 'rgba(22, 102, 197, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(22, 102, 197, 0.15)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  infoDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.navy,
  },
  seeAllBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.blue,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    ...Shadows.card,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  txContent: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.navy,
  },
  txCode: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: 'monospace',
    marginTop: 1,
  },
  txDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  txAmountBox: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});

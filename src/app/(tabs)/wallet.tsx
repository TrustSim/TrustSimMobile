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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
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
      const res = await walletService.getTransactions({ pageIndex: 1, pageSize: 5 });
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

  const formatVnd = (amount?: number) => {
    if (typeof amount !== 'number') return '0 đ';
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Page Top Title */}
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>Ví Tiền Của Tôi</Text>
          <Badge status={wallet?.walletStatus || 'ACTIVE'} label={wallet?.walletStatus || 'ACTIVE'} />
        </View>

        {/* Aesthetic Master Balance Card */}
        <Card style={styles.masterCard}>
          <View style={styles.cardGlow} />

          {/* Top Card Row */}
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.availableLabel}>SỐ DƯ KHẢ DỤNG</Text>
              <Text style={styles.availableAmount}>{formatVnd(wallet?.availableBalance)}</Text>
            </View>
            <View style={styles.cardChipIcon}>
              <Ionicons name="card" size={28} color={Colors.accent} />
            </View>
          </View>

          {/* Locked / Total Row */}
          <View style={styles.subBalanceContainer}>
            <View style={styles.subBalanceCol}>
              <Text style={styles.subBalLabel}>Tạm giữ giao dịch:</Text>
              <Text style={[styles.subBalValue, { color: Colors.warning }]}>
                {formatVnd(wallet?.lockedBalance)}
              </Text>
            </View>

            <View style={styles.subDivider} />

            <View style={styles.subBalanceCol}>
              <Text style={styles.subBalLabel}>Tổng tài sản:</Text>
              <Text style={styles.subBalValue}>{formatVnd(wallet?.totalBalance)}</Text>
            </View>
          </View>

          <Text style={styles.cardNote}>
            * Số tiền tạm giữ gồm tiền đặt cọc đấu giá và tiền bảo đảm đang giao dịch.
          </Text>
        </Card>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtnBox, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/deposit')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={22} color={Colors.textInverse} />
            <Text style={styles.actionBtnTextInverse}>Nạp Tiền</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnBox, { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border }]}
            onPress={() => router.push('/withdraw')}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up-circle" size={22} color={Colors.primary} />
            <Text style={styles.actionBtnText}>Rút Tiền</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtnBox, { backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border }]}
            onPress={() => router.push('/transactions')}
            activeOpacity={0.85}
          >
            <Ionicons name="receipt" size={22} color={Colors.accent} />
            <Text style={styles.actionBtnText}>Lịch Sử</Text>
          </TouchableOpacity>
        </View>

        {/* Security Notice */}
        <Card style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Ionicons name="lock-closed" size={18} color={Colors.primary} />
            <Text style={styles.securityTitle}>Giao Dịch An Toàn & Bảo Mật</Text>
          </View>
          <Text style={styles.securityDesc}>
            Mọi giao dịch nạp rút và thanh toán đều được mã hóa bảo mật, đảm bảo an toàn tuyệt đối cho tài khoản của bạn.
          </Text>
        </Card>

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Biến Động Gần Đây</Text>
          <TouchableOpacity onPress={() => router.push('/transactions')}>
            <Text style={styles.seeAllBtn}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {recentTransactions.length > 0 ? (
          recentTransactions.map((tx) => {
            const isTopUp = (tx.walletTransactionType || tx.type) === 'TOP_UP';
            const txStatus = tx.transactionStatus || tx.status || 'PENDING';
            return (
              <Card key={tx.id} style={styles.txItemCard}>
                <View style={styles.txIconBox}>
                  <Ionicons
                    name={isTopUp ? 'arrow-down' : 'arrow-up'}
                    size={20}
                    color={isTopUp ? Colors.success : Colors.danger}
                  />
                </View>

                <View style={styles.txContentBox}>
                  <Text style={styles.txTitle}>
                    {isTopUp ? 'Nạp tiền vào ví' : 'Rút tiền ngân hàng'}
                  </Text>
                  <Text style={styles.txCode}>{tx.transactionCode}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.createdAt).toLocaleString('vi-VN')}
                  </Text>
                </View>

                <View style={styles.txAmountBox}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isTopUp ? Colors.success : Colors.text },
                    ]}
                  >
                    {isTopUp ? '+' : '-'} {formatVnd(tx.amount)}
                  </Text>
                  <Badge status={txStatus} style={{ marginTop: 2 }} />
                </View>
              </Card>
            );
          })
        ) : (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Chưa có biến động số dư nào</Text>
          </Card>
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
    color: Colors.text,
  },
  masterCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  cardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  availableLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.5,
  },
  availableAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#34D399', // Emerald accent
    marginTop: 4,
  },
  cardChipIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBalanceContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  subBalanceCol: {
    flex: 1,
  },
  subDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: Spacing.sm,
  },
  subBalLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  subBalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textInverse,
    marginTop: 2,
  },
  cardNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  actionBtnBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionBtnTextInverse: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.textInverse,
    marginLeft: 6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 6,
  },
  securityCard: {
    backgroundColor: 'rgba(30, 58, 138, 0.05)',
    borderColor: 'rgba(30, 58, 138, 0.15)',
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  securityDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  seeAllBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  txItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  txContentBox: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  txCode: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  txDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmountBox: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});

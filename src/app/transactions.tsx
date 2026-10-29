import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { BottomNavBar } from '../components/BottomNavBar';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { walletService } from '../services/walletService';
import { StatementItemDto, WalletTransactionDto } from '../types';

export default function TransactionsScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'transactions' | 'statement'>('transactions');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [statementItems, setStatementItems] = useState<StatementItemDto[]>([]);

  // Selected item for Detail Modal (SCR-09)
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'transactions') {
        const res = await walletService.getTransactions({ pageIndex: 1, pageSize: 20 });
        if (res.success && res.data?.items) {
          setTransactions(res.data.items);
        } else {
          setTransactions([]);
        }
      } else {
        const res = await walletService.getStatement({ pageIndex: 1, pageSize: 20 });
        if (res.success && res.data?.items) {
          setStatementItems(res.data.items);
        } else {
          setStatementItems([]);
        }
      }
    } catch {
      if (activeTab === 'transactions') setTransactions([]);
      else setStatementItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatVnd = (val: number) => {
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const renderTransactionItem = ({ item }: { item: WalletTransactionDto }) => {
    const isTopUp = (item.walletTransactionType || item.type) === 'TOP_UP';
    const txStatus = item.transactionStatus || item.status || 'PENDING';
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSelectedTx({ ...item, isStatement: false, status: txStatus, type: isTopUp ? 'TOP_UP' : 'WITHDRAW' })}
      >
        <Card style={styles.itemCard}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isTopUp ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color={isTopUp ? Colors.success : Colors.danger}
            />
          </View>

          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>
              {isTopUp ? 'Nạp tiền VietQR' : 'Rút tiền ngân hàng'}
            </Text>
            <Text style={styles.itemCode}>{item.transactionCode}</Text>
            <Text style={styles.itemDate}>
              {new Date(item.createdAt).toLocaleString('vi-VN')}
            </Text>
          </View>

          <View style={styles.itemRight}>
            <Text
              style={[
                styles.itemAmount,
                { color: isTopUp ? Colors.success : Colors.text },
              ]}
            >
              {isTopUp ? '+' : '-'} {formatVnd(item.amount)}
            </Text>
            <Badge status={txStatus} style={{ marginTop: 4 }} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderStatementItem = ({ item }: { item: StatementItemDto }) => {
    const isCredit = item.direction === 'CREDIT';
    const isDebit = item.direction === 'DEBIT';
    const amountColor = isCredit ? Colors.success : isDebit ? Colors.danger : Colors.warning;
    const amountPrefix = isCredit ? '+' : isDebit ? '-' : '';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setSelectedTx({ ...item, isStatement: true })}
      >
        <Card style={styles.itemCard}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={
                isCredit
                  ? 'arrow-down-circle'
                  : isDebit
                  ? 'arrow-up-circle'
                  : item.transactionType?.includes('RELEASE')
                  ? 'lock-open-outline'
                  : 'lock-closed-outline'
              }
              size={22}
              color={amountColor}
            />
          </View>

          <View style={styles.itemContent}>
            <View style={styles.statementTitleRow}>
              <Text style={styles.itemTitle}>{item.transactionType}</Text>
              {item.source && (
                <View style={styles.sourceTag}>
                  <Text style={styles.sourceTagText}>{item.source}</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemDesc} numberOfLines={1}>
              {item.description}
            </Text>
            <Text style={styles.itemDate}>
              {new Date(item.createdAt).toLocaleString('vi-VN')}
            </Text>
          </View>

          <View style={styles.itemRight}>
            <Text style={[styles.itemAmount, { color: amountColor }]}>
              {amountPrefix} {formatVnd(item.amount)}
            </Text>
            {item.direction ? (
              <Badge status={item.direction} style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.statementBalanceSub}>
                Sau GD: {formatVnd(item.balanceAfter)}
              </Text>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Lịch Sử Giao Dịch" showBack onBack={() => router.back()} showHome />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'transactions' && styles.tabItemActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text
            style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}
          >
            Nạp & Rút Tiền
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'statement' && styles.tabItemActive]}
          onPress={() => setActiveTab('statement')}
        >
          <Text
            style={[styles.tabText, activeTab === 'statement' && styles.tabTextActive]}
          >
            Tiền Cọc & Tạm Giữ
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {activeTab === 'transactions' ? (
        <FlatList
          data={transactions}
          keyExtractor={(i) => i.id}
          renderItem={renderTransactionItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchData();
              }}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.emptyText}>Đang tải giao dịch...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={statementItems}
          keyExtractor={(i) => i.id}
          renderItem={renderStatementItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchData();
              }}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.emptyText}>Đang tải dữ liệu...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Chưa có khoản đặt cọc hoặc tạm giữ nào</Text>
              </View>
            )
          }
        />
      )}

      {/* SCR-09: Transaction Detail Modal */}
      <Modal visible={!!selectedTx} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi Tiết Giao Dịch</Text>
              <TouchableOpacity onPress={() => setSelectedTx(null)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <View style={styles.modalBody}>
                <View style={styles.modalAmountBox}>
                  <Text style={styles.modalAmountLabel}>Số tiền biến động:</Text>
                  <Text style={styles.modalAmountValue}>{formatVnd(selectedTx.amount)}</Text>
                  <Badge status={selectedTx.transactionStatus || selectedTx.status} style={{ marginTop: 4 }} />
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mã giao dịch:</Text>
                  <Text style={styles.detailValBold}>{selectedTx.transactionCode || selectedTx.referenceCode || selectedTx.id}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Loại giao dịch:</Text>
                  <Text style={styles.detailVal}>
                    {selectedTx.walletTransactionType === 'TOP_UP' || selectedTx.type === 'TOP_UP'
                      ? 'Nạp tiền VietQR'
                      : selectedTx.walletTransactionType === 'WITHDRAW' || selectedTx.type === 'WITHDRAW'
                      ? 'Rút tiền ngân hàng'
                      : (selectedTx.type || selectedTx.transactionType || 'Biến động ví')}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Thời gian ghi nhận:</Text>
                  <Text style={styles.detailVal}>
                    {new Date(selectedTx.createdAt).toLocaleString('vi-VN')}
                  </Text>
                </View>

                {selectedTx.isStatement && (
                  <>
                    {selectedTx.source && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Nguồn nghiệp vụ:</Text>
                        <Text style={styles.detailValBold}>{selectedTx.source}</Text>
                      </View>
                    )}
                    {selectedTx.direction && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Hướng dòng tiền:</Text>
                        <Badge status={selectedTx.direction} />
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Số dư trước GD:</Text>
                      <Text style={styles.detailVal}>{formatVnd(selectedTx.balanceBefore)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Số dư sau GD:</Text>
                      <Text style={[styles.detailValBold, { color: Colors.primary }]}>
                        {formatVnd(selectedTx.balanceAfter)}
                      </Text>
                    </View>
                  </>
                )}

                <View style={styles.descBox}>
                  <Text style={styles.descLabel}>Nội dung diễn giải:</Text>
                  <Text style={styles.descText}>
                    {selectedTx.description || 'Giao dịch qua cổng tài chính TrustSim'}
                  </Text>
                </View>

                <View style={styles.hashBox}>
                  <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
                  <Text style={styles.hashText}>
                    Giao dịch đã được ghi nhận và bảo vệ an toàn
                  </Text>
                </View>

                <Button
                  title="Đóng Chi Tiết"
                  variant="primary"
                  size="md"
                  onPress={() => setSelectedTx(null)}
                  style={{ marginTop: Spacing.lg }}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
      <BottomNavBar activeTab="wallet" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabItem: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  listContent: {
    padding: Spacing.lg,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  itemCode: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  statementBalanceSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sourceTag: {
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  sourceTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  modalBody: {
    paddingTop: Spacing.xs,
  },
  modalAmountBox: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalAmountLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalAmountValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primary,
    marginVertical: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + 2,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailVal: {
    fontSize: 13,
    color: Colors.text,
  },
  detailValBold: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  descBox: {
    backgroundColor: 'rgba(241, 245, 249, 0.8)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  descLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  descText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  hashBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  hashText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 6,
  },
});

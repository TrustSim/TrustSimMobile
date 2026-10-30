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
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { ContractTimeline } from '../../components/trust/ContractTimeline';
import { useAuth } from '../../context/AuthContext';
import { contractService } from '../../services/contractService';

export default function ContractsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);

  const fetchContracts = useCallback(async () => {
    try {
      const res = await contractService.getMyContracts({ pageIndex: 1, pageSize: 20 });
      if (res.success && res.data?.items) {
        setContracts(res.data.items);
      } else {
        setContracts([]);
      }
    } catch {
      setContracts([]);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContracts();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchContracts();
    }, [fetchContracts])
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Hợp Đồng</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Lọc hợp đồng"
          >
            <MaterialCommunityIcons name="filter-outline" size={20} color={Colors.navy} />
          </TouchableOpacity>
        </View>

        {/* Contract list */}
        {contracts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <MaterialCommunityIcons name="file-document-outline" size={40} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có hợp đồng</Text>
            <Text style={styles.emptyDesc}>
              Hợp đồng chuyển nhượng SIM của bạn sẽ xuất hiện ở đây sau khi giao dịch bắt đầu.
            </Text>
          </View>
        ) : (
          contracts.map((contract) => (
            <TouchableOpacity
              key={contract.tradeTransactionId ?? contract.id}
              style={styles.contractCard}
              onPress={() => router.push(`/contract/${contract.tradeTransactionId ?? contract.id}`)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Hợp đồng ${contract.contractCode ?? ''}`}
            >
              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.contractCode}>
                    #{contract.contractCode ?? contract.tradeTransactionId?.slice(0, 8)}
                  </Text>
                  <Text style={styles.simNumber}>{contract.simNumber ?? 'SIM chuyển nhượng'}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
              </View>

              {/* Timeline strip */}
              <ContractTimeline
                status={contract.status ?? contract.tradeStatus ?? 'PendingEscrow'}
                compact
                style={styles.timelineStrip}
              />

              {/* Amount */}
              {contract.agreedPrice != null && (
                <Text style={styles.contractAmount}>
                  {contract.agreedPrice.toLocaleString('vi-VN')} ₫
                </Text>
              )}
            </TouchableOpacity>
          ))
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
  iconBtn: {
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
  contractCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  contractCode: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.blue,
    fontFamily: 'monospace',
  },
  simNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  timelineStrip: {
    marginBottom: Spacing.sm,
  },
  contractAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    marginTop: Spacing.xs,
  },
});


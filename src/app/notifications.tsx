import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { BorderRadius, Colors, Shadows, Spacing } from '../constants/theme';
import { notificationService } from '../services/notificationService';
import type { NotificationDto, NotificationType } from '../types';

type FilterTab = 'ALL' | 'UNREAD' | 'READ';

interface NotificationVisual {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bgColor: string;
  badgeLabel: string;
}

function getNotificationVisual(type: NotificationType): NotificationVisual {
  const upper = (type || '').toUpperCase();

  if (upper.includes('WALLET') || upper.includes('TOPUP') || upper.includes('WITHDRAWAL')) {
    return {
      icon: 'wallet-outline',
      color: '#059669',
      bgColor: '#ECFDF5',
      badgeLabel: 'Ví & Tài chính',
    };
  }

  if (upper.includes('CONTRACT') || upper.includes('SIGNING') || upper.includes('TRANSFER')) {
    return {
      icon: 'file-sign',
      color: Colors.indigo,
      bgColor: '#EEF2FF',
      badgeLabel: 'Hợp đồng & Sang tên',
    };
  }

  if (upper.includes('AUCTION_WON') || upper.includes('RUNNER_UP')) {
    return {
      icon: 'trophy-outline',
      color: '#D97706',
      bgColor: '#FFFBEB',
      badgeLabel: 'Trúng đấu giá',
    };
  }

  if (upper.includes('AUCTION_LOST') || upper.includes('FORFEITED') || upper.includes('FAILED')) {
    return {
      icon: 'alert-circle-outline',
      color: '#E11D48',
      bgColor: '#FFF1F2',
      badgeLabel: 'Đấu giá',
    };
  }

  if (upper.includes('DEPOSIT')) {
    return {
      icon: 'shield-lock-outline',
      color: '#0284C7',
      bgColor: '#F0F9FF',
      badgeLabel: 'Tiền cọc & Ký quỹ',
    };
  }

  return {
    icon: 'bell-outline',
    color: Colors.navy,
    bgColor: '#F1F5F9',
    badgeLabel: 'Hệ thống',
  };
}

function formatNotificationTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [selectedNotification, setSelectedNotification] = useState<NotificationDto | null>(null);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [listRes, countRes] = await Promise.allSettled([
        notificationService.getMyNotifications({ pageIndex: 1, pageSize: 50 }),
        notificationService.getUnreadCount(),
      ]);

      if (listRes.status === 'fulfilled' && listRes.value.success && listRes.value.data?.items) {
        setNotifications(listRes.value.data.items);
      } else {
        setNotifications([]);
      }

      if (countRes.status === 'fulfilled' && countRes.value.success && typeof countRes.value.data === 'number') {
        setUnreadCount(countRes.value.data);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications(false);
    }, [loadNotifications])
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'UNREAD') {
      return notifications.filter((n) => !n.isRead);
    }
    if (activeFilter === 'READ') {
      return notifications.filter((n) => n.isRead);
    }
    return notifications;
  }, [notifications, activeFilter]);

  const handleItemPress = async (item: NotificationDto) => {
    setSelectedNotification(item);

    // Mark as read in background if unread
    if (!item.isRead) {
      try {
        await notificationService.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently continue
      }
    }
  };

  const handleMarkAllRead = async () => {
    const unreadItems = notifications.filter((n) => !n.isRead);
    if (unreadItems.length === 0) {
      Alert.alert('Thông báo', 'Tất cả thông báo của bạn đã được đọc.');
      return;
    }

    try {
      await Promise.allSettled(unreadItems.map((n) => notificationService.markAsRead(n.id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      Alert.alert('Thành công', 'Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch {
      Alert.alert('Lỗi', 'Không thể đánh dấu đã đọc một số thông báo.');
    }
  };

  const handleNavigateFromNotification = (item: NotificationDto) => {
    setSelectedNotification(null);

    // If trade transaction reference
    if (
      item.referenceType === 'TradeTransaction' ||
      item.referenceType === 'Trade' ||
      item.actionUrl?.includes('contract')
    ) {
      const tradeId = item.referenceId || item.id;
      router.push(`/contract/${tradeId}` as any);
      return;
    }

    // If wallet reference
    if (item.actionUrl?.includes('wallet') || item.notificationType.includes('WALLET')) {
      router.push('/(tabs)/wallet');
      return;
    }

    // If sim reference
    if (item.actionUrl?.includes('sim') || item.notificationType.includes('SIM')) {
      router.push('/(tabs)/sims');
      return;
    }

    // Fallback: stay on current page
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {/* ─── 1. TOP HEADER (Image 1 Reference Style) ─── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
          accessibilityLabel="Quay lại"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.navy} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Hộp thư thông báo</Text>
          {unreadCount > 0 ? (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>{unreadCount} mới</Text>
            </View>
          ) : (
            <Text style={styles.headerSubtitle}>Tất cả đã đọc</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleMarkAllRead}
          activeOpacity={0.8}
          accessibilityLabel="Đánh dấu tất cả đã đọc"
        >
          <MaterialCommunityIcons name="check-all" size={20} color={Colors.navy} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNotifications(true)}
            tintColor={Colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 2. PROGRESS / STATS SUMMARY STRIP (Image 1 Style) ─── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{notifications.length}</Text>
            <Text style={styles.summaryLabel}>Tổng tin nhắn</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: unreadCount > 0 ? '#E11D48' : '#059669' }]}>
              {unreadCount}
            </Text>
            <Text style={styles.summaryLabel}>Chưa đọc</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: Colors.indigo }]}>
              {notifications.length - unreadCount}
            </Text>
            <Text style={styles.summaryLabel}>Đã xem</Text>
          </View>
        </View>

        {/* ─── 3. FILTER PILL CHIPS ─── */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setActiveFilter('ALL')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
              Tất cả ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'UNREAD' && styles.filterChipActive]}
            onPress={() => setActiveFilter('UNREAD')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'UNREAD' && styles.filterChipTextActive]}>
              Chưa đọc ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'READ' && styles.filterChipActive]}
            onPress={() => setActiveFilter('READ')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, activeFilter === 'READ' && styles.filterChipTextActive]}>
              Đã đọc ({notifications.length - unreadCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── 4. NOTIFICATION LIST (Image 1 Clean Cards with Chevron >) ─── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={Colors.navy} />
            <Text style={styles.loadingText}>Đang tải thông báo từ sàn...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialCommunityIcons name="bell-check-outline" size={32} color={Colors.indigo} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'UNREAD' ? 'Không có tin chưa đọc' : 'Chưa có thông báo nào'}
            </Text>
            <Text style={styles.emptySub}>
              Khi có giao dịch chuyển nhượng, nạp rút ví hoặc kết quả đấu giá SIM, thông báo sẽ gửi tức thì tới bạn tại đây.
            </Text>
          </View>
        ) : (
          <View style={styles.listStack}>
            {filteredNotifications.map((item) => {
              const visual = getNotificationVisual(item.notificationType);
              const formattedTime = formatNotificationTime(item.createdDate);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notificationCard,
                    !item.isRead && styles.notificationCardUnread,
                  ]}
                  onPress={() => handleItemPress(item)}
                  activeOpacity={0.78}
                >
                  <View style={styles.cardInnerRow}>
                    {/* Left: Category Icon */}
                    <View style={[styles.iconBox, { backgroundColor: visual.bgColor }]}>
                      <MaterialCommunityIcons name={visual.icon} size={22} color={visual.color} />
                    </View>

                    {/* Center: Content */}
                    <View style={styles.contentCol}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[
                            styles.itemTitle,
                            !item.isRead && styles.itemTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        {!item.isRead && <View style={styles.unreadDot} />}
                      </View>

                      <Text style={styles.itemContent} numberOfLines={2}>
                        {item.content}
                      </Text>

                      <View style={styles.metaRow}>
                        <View style={styles.badgePill}>
                          <Text style={styles.badgePillText}>{visual.badgeLabel}</Text>
                        </View>
                        <Text style={styles.timeText}>{formattedTime}</Text>
                      </View>
                    </View>

                    {/* Right: Chevron > inside subtle circle (Image 1 style) */}
                    <View style={styles.chevronBox}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textMuted} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ─── 5. NOTIFICATION DETAIL MODAL (Soft-Cloud Navy) ─── */}
      <Modal
        visible={!!selectedNotification}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedNotification && (() => {
              const visual = getNotificationVisual(selectedNotification.notificationType);
              const formattedTime = formatNotificationTime(selectedNotification.createdDate);
              const hasAction =
                selectedNotification.referenceType === 'TradeTransaction' ||
                selectedNotification.referenceType === 'Trade' ||
                selectedNotification.actionUrl;

              return (
                <>
                  <View style={styles.modalTopRow}>
                    <View style={[styles.modalIconBox, { backgroundColor: visual.bgColor }]}>
                      <MaterialCommunityIcons name={visual.icon} size={24} color={visual.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillText}>{visual.badgeLabel}</Text>
                      </View>
                      <Text style={styles.modalTimeText}>{formattedTime}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.modalCloseBtn}
                      onPress={() => setSelectedNotification(null)}
                    >
                      <MaterialCommunityIcons name="close" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitleText}>{selectedNotification.title}</Text>
                    <Text style={styles.modalBodyText}>{selectedNotification.content}</Text>

                    {selectedNotification.referenceId && (
                      <View style={styles.referenceBox}>
                        <Text style={styles.referenceLabel}>Mã tham chiếu:</Text>
                        <Text style={styles.referenceValue}>
                          #{selectedNotification.referenceId.slice(0, 12)}
                        </Text>
                      </View>
                    )}
                  </ScrollView>

                  <View style={styles.modalFooterRow}>
                    <TouchableOpacity
                      style={styles.modalDismissBtn}
                      onPress={() => setSelectedNotification(null)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalDismissBtnText}>Đóng</Text>
                    </TouchableOpacity>

                    {hasAction && (
                      <TouchableOpacity
                        style={styles.modalActionBtn}
                        onPress={() => handleNavigateFromNotification(selectedNotification)}
                        activeOpacity={0.88}
                      >
                        <MaterialCommunityIcons name="arrow-right-circle" size={17} color="#FFFFFF" />
                        <Text style={styles.modalActionBtnText}>Xem chi tiết</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
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
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },

  // 1. Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.navy,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  unreadCountBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  unreadCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#E11D48',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },

  // 2. Summary Card Strip
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.borderLight,
  },

  // 3. Filter Row
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // 4. Notification List Cards
  listStack: {
    gap: 10,
  },
  notificationCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  notificationCardUnread: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(76, 95, 213, 0.35)',
    borderLeftWidth: 3.5,
    borderLeftColor: Colors.indigo,
  },
  cardInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navy,
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '900',
    color: Colors.navy,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.indigo,
  },
  itemContent: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  badgePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.navy,
  },
  timeText: {
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty & Loading State
  loadingBox: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: 8,
  },
  loadingText: {
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
    marginTop: Spacing.md,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.navy,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    paddingHorizontal: Spacing.md,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    maxHeight: '80%',
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTimeText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleText: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.navy,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  modalBodyText: {
    fontSize: 13.5,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  referenceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.md,
  },
  referenceLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  referenceValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.navy,
    fontVariant: ['tabular-nums'],
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalDismissBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalDismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalActionBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.indigo,
    borderRadius: BorderRadius.full,
    paddingVertical: 12,
  },
  modalActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});


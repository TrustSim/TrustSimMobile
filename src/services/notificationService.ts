import apiClient from './apiClient';
import { ApiResponse, NotificationDto, NotificationQueryFilter, PagedResult } from '../types';

export const notificationService = {
  // Lấy danh sách thông báo của người dùng hiện tại (phân trang & lọc trạng thái đã đọc)
  async getMyNotifications(
    filter?: NotificationQueryFilter
  ): Promise<ApiResponse<PagedResult<NotificationDto>>> {
    const res = await apiClient.get<ApiResponse<PagedResult<NotificationDto>>>('/notifications', {
      params: filter,
    });
    return res.data;
  },

  // Lấy số lượng thông báo chưa đọc
  async getUnreadCount(): Promise<ApiResponse<number>> {
    const res = await apiClient.get<ApiResponse<number>>('/notifications/unread-count');
    return res.data;
  },

  // Đánh dấu 1 thông báo đã đọc
  async markAsRead(id: string): Promise<ApiResponse<boolean>> {
    const res = await apiClient.patch<ApiResponse<boolean>>(`/notifications/${id}/read`);
    return res.data;
  },
};


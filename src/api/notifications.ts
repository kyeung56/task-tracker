import client, { apiCall } from './client';
import type { Notification, PaginatedResponse } from '../types';

export const notificationsApi = {
  // Get notifications
  async getAll(page = 1, pageSize = 20, unreadOnly = false): Promise<PaginatedResponse<Notification>> {
    const response = await client.get<PaginatedResponse<Notification>>('/notifications', {
      params: { page, pageSize, unreadOnly },
    });
    return response.data;
  },

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const result = await apiCall(client.get<ApiResponse<{ count: number }>>('/notifications/unread-count'));
    return result.count;
  },

  // Mark as read
  async markAsRead(id: string): Promise<void> {
    await client.put(`/notifications/${id}/read`);
  },

  // Mark all as read
  async markAllAsRead(): Promise<void> {
    await client.put('/notifications/read-all');
  },

  // Delete notification
  async delete(id: string): Promise<void> {
    await client.delete(`/notifications/${id}`);
  },
};

export default notificationsApi;

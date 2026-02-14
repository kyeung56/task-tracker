import client, { apiCall } from './client';
import type { Notification, PaginatedResponse, ApiResponse, NotificationPreferences, EmailConfig, EmailConfigUpdate } from '../types';

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

  // ============================================
  // Notification Preferences
  // ============================================

  // Get user notification preferences
  async getPreferences(): Promise<NotificationPreferences> {
    const result = await apiCall(client.get<ApiResponse<NotificationPreferences>>('/notifications/preferences'));
    return result;
  },

  // Update user notification preferences
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const result = await apiCall(client.put<ApiResponse<NotificationPreferences>>('/notifications/preferences', preferences));
    return result;
  },

  // ============================================
  // Email Configuration (Admin)
  // ============================================

  // Get email configuration
  async getEmailConfig(): Promise<EmailConfig | null> {
    try {
      const result = await apiCall(client.get<ApiResponse<EmailConfig | null>>('/notifications/email-config'));
      return result;
    } catch {
      return null;
    }
  },

  // Update email configuration
  async updateEmailConfig(config: EmailConfigUpdate): Promise<EmailConfig | null> {
    const result = await apiCall(client.put<ApiResponse<EmailConfig | null>>('/notifications/email-config', config));
    return result;
  },

  // Test email configuration
  async testEmailConfig(email: string): Promise<{ success: boolean; message?: string }> {
    try {
      await client.post('/notifications/email-config/test', { email });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.response?.data?.error?.message || 'Failed to send test email' };
    }
  },
};

export default notificationsApi;

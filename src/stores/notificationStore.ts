import { create } from 'zustand';
import type { Notification } from '../types';
import { notificationsApi } from '../api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: (page?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,
  error: null,

  fetchNotifications: async (page = 1, unreadOnly = false) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationsApi.getAll(page, 20, unreadOnly);
      set({
        notifications: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
        isLoading: false,
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationsApi.getUnreadCount();
      set({ unreadCount: count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to mark as read',
      });
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to mark all as read',
      });
    }
  },

  deleteNotification: async (id) => {
    try {
      await notificationsApi.delete(id);
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount:
            notification && !notification.isRead
              ? state.unreadCount - 1
              : state.unreadCount,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete notification',
      });
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),

  openPanel: () => set({ isOpen: true }),

  closePanel: () => set({ isOpen: false }),

  clearError: () => set({ error: null }),
}));

export default useNotificationStore;

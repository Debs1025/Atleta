import { useState, useEffect, useCallback } from 'react';
import {
  getOfficialNotifications,
  markAllOfficialNotificationsAsRead,
  markOfficialNotificationAsRead,
  getCachedData,
} from '../../api/client';
import type { OfficialNotificationItem } from '../../api/types';

// Shows Unread Notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<OfficialNotificationItem[]>(() => {
    const cached = getCachedData<{ unread_count: number; notifications: OfficialNotificationItem[] }>('official_notifications');
    return cached?.notifications || [];
  });
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const cached = getCachedData<{ unread_count: number; notifications: OfficialNotificationItem[] }>('official_notifications');
    return cached?.unread_count ?? 0;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOfficialNotifications(forceRefresh);
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllOfficialNotificationsAsRead();
  };

  const markSingleRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markOfficialNotificationAsRead(id);
  };

  const clearHistory = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: () => fetchNotifications(true),
    markAllRead,
    markSingleRead,
    clearHistory,
  };
}

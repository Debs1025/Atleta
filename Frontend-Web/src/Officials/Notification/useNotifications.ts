import { useState, useEffect, useCallback } from 'react';
import {
  getOfficialNotifications,
  markAllOfficialNotificationsAsRead,
  markOfficialNotificationAsRead,
  storeReadNotificationId,
  storeAllReadNotificationIds,
  getStoredReadNotificationIds,
  getCachedData,
} from '../../api/client';
import type { OfficialNotificationItem } from '../../api/types';

// Shows Unread Notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<OfficialNotificationItem[]>(() => {
    const cached = getCachedData<{ unread_count: number; notifications: OfficialNotificationItem[] }>('official_notifications');
    const readSet = getStoredReadNotificationIds();
    return (cached?.notifications || []).map((n) => ({
      ...n,
      is_read: Boolean(n.is_read) || readSet.has(n.notification_id),
    }));
  });
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const cached = getCachedData<{ unread_count: number; notifications: OfficialNotificationItem[] }>('official_notifications');
    const readSet = getStoredReadNotificationIds();
    if (cached?.notifications && Array.isArray(cached.notifications)) {
      return cached.notifications.filter((n) => !n.is_read && !readSet.has(n.notification_id)).length;
    }
    return cached?.unread_count ?? 0;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOfficialNotifications(forceRefresh);
      const notifs = res.notifications || [];
      const count = notifs.filter((n) => !n.is_read).length;
      setNotifications(notifs);
      setUnreadCount(count);
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
    setNotifications((prev) => {
      storeAllReadNotificationIds(prev.map((n) => n.notification_id));
      return prev.map((n) => ({ ...n, is_read: true }));
    });
    await markAllOfficialNotificationsAsRead();
  };

  const markSingleRead = async (id: string) => {
    storeReadNotificationId(id);
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markOfficialNotificationAsRead(id);
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: () => fetchNotifications(true),
    markAllRead,
    markSingleRead,
  };
}

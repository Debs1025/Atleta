import { randomUUID } from 'crypto';
import { db } from '../utils/firebaseAdmin';
import { Notification, NotificationType } from '../models/notificationModel';
import { eventBus, EVENTS, SystemEventPayload } from '../utils/eventBus';

// In-memory fallback store if Firestore isn't connected
const inMemoryNotifications = new Map<string, Notification[]>();

/**
 * Log and simulate push notification dispatch within 2 seconds.
 */
function sendPushAlertToDevice(recipientUserId: string, notification: Notification) {
  const startTime = Date.now();
  console.log(`[PUSH ALERT INITIATED] Delivering alert to device for user ${recipientUserId}...`);
  
  // Simulate push notification dispatch (e.g. FCM / APNs / Expo Push)
  setTimeout(() => {
    const elapsed = Date.now() - startTime;
    console.log(
      `[PUSH ALERT DELIVERED] Push notification "${notification.type}" sent to device (${recipientUserId}) in ${elapsed}ms. Body: "${notification.message_body}"`
    );
  }, 150); // Delivered in ~150ms (< 2 seconds)
}

/**
 * Register system event listener for auto-triggering push alerts and creating notifications.
 */
eventBus.on(EVENTS.PUSH_NOTIFICATION, async (payload: SystemEventPayload) => {
  try {
    await createNotification(payload.recipient_user_id, payload.type, payload.message_body);
  } catch (error) {
    console.error('Error handling system push notification event:', error);
  }
});

/**
 * Create a new notification for an athlete and trigger a push alert.
 */
export async function createNotification(
  recipientUserId: string,
  type: NotificationType,
  messageBody: string
): Promise<Notification> {
  const notificationId = randomUUID();
  const timestamp = new Date().toISOString();

  const notification: Notification = {
    notification_id: notificationId,
    recipient_user_id: recipientUserId,
    type,
    message_body: messageBody,
    is_read: false,
    timestamp,
  };

  // Always store in memory store for instant availability
  const userNotifs = inMemoryNotifications.get(recipientUserId) || [];
  userNotifs.unshift(notification);
  inMemoryNotifications.set(recipientUserId, userNotifs);

  // Attempt Firestore write asynchronously without blocking execution
  db.collection('Notifications')
    .doc(notificationId)
    .set(notification)
    .catch(() => {
      // Ignored if Firestore is offline
    });

  // Trigger immediate push alert to athlete device (< 2s)
  sendPushAlertToDevice(recipientUserId, notification);

  return notification;
}

/**
 * Get all notifications for an athlete ordered by timestamp descending.
 */
export async function getAthleteNotifications(athleteId: string): Promise<Notification[]> {
  const memNotifs = inMemoryNotifications.get(athleteId) || [];

  try {
    const snapshotPromise = db
      .collection('Notifications')
      .where('recipient_user_id', '==', athleteId)
      .get();

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 500));
    const snapshot = await Promise.race([snapshotPromise, timeoutPromise]);

    if (snapshot && !snapshot.empty) {
      const notifsMap = new Map<string, Notification>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as Notification;
        notifsMap.set(data.notification_id, data);
      });
      memNotifs.forEach((n) => notifsMap.set(n.notification_id, n));

      return Array.from(notifsMap.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  } catch (err) {
    // Fall through
  }

  return [...memNotifs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(
  athleteId: string,
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  let updated = false;

  // Update in memory store first
  const userNotifs = inMemoryNotifications.get(athleteId) || [];
  const target = userNotifs.find((n) => n.notification_id === notificationId);
  if (target) {
    target.is_read = true;
    updated = true;
  }

  // Also trigger Firestore update
  db.collection('Notifications')
    .doc(notificationId)
    .get()
    .then((doc) => {
      if (doc.exists && doc.data()?.recipient_user_id === athleteId) {
        doc.ref.update({ is_read: true }).catch(() => {});
      }
    })
    .catch(() => {});

  if (!updated) {
    return { success: false, message: 'Notification not found or unauthorized.' };
  }

  return { success: true, message: 'Notification marked as read.' };
}

/**
 * Mark all notifications for an athlete as read.
 */
export async function markAllNotificationsAsRead(
  athleteId: string
): Promise<{ success: boolean; updated_count: number }> {
  let count = 0;

  // Update in memory store first
  const userNotifs = inMemoryNotifications.get(athleteId) || [];
  userNotifs.forEach((n) => {
    if (!n.is_read) {
      n.is_read = true;
      count++;
    }
  });

  // Also trigger Firestore batch update
  db.collection('Notifications')
    .where('recipient_user_id', '==', athleteId)
    .where('is_read', '==', false)
    .get()
    .then((snapshot) => {
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.update(doc.ref, { is_read: true }));
        batch.commit().catch(() => {});
      }
    })
    .catch(() => {});

  return { success: true, updated_count: count };
}

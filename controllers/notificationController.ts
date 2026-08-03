import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  getAthleteNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';

/**
 * GET /api/v1/notifications
 * Fetch notifications for the current authenticated athlete.
 */
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = req.user?.uid;
    if (!athleteId) {
      res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
      return;
    }

    const notifications = await getAthleteNotifications(athleteId);
    res.status(200).json({ notifications });
  } catch (error: any) {
    console.error('getNotifications error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * PUT /api/v1/notifications/read-all
 * Mark all notifications for the current athlete as read.
 */
export async function markAllRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = req.user?.uid;
    if (!athleteId) {
      res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
      return;
    }

    const result = await markAllNotificationsAsRead(athleteId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('markAllRead error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * PUT /api/v1/notifications/:notificationId/read
 * Mark a single notification as read.
 */
export async function markRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = req.user?.uid;
    const notificationId = Array.isArray(req.params.notificationId)
      ? req.params.notificationId[0]
      : req.params.notificationId;

    if (!athleteId) {
      res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
      return;
    }

    if (!notificationId) {
      res.status(400).json({ error: 'Notification ID is required.' });
      return;
    }

    const result = await markNotificationAsRead(athleteId, notificationId);
    if (!result.success) {
      res.status(404).json({ error: result.message });
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('markRead error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

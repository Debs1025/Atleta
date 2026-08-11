import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { db } from '../utils/firebaseAdmin';
import {
  getOfficialDashboardMetrics,
  getOfficialSchedules,
  getOfficialNotifications,
  markAllOfficialNotificationsAsRead
} from '../services/officialDashboardService';

/**
 * Helper to retrieve official_id from the authenticated user's profile.
 */
async function getOfficialIdFromUid(uid: string): Promise<string | null> {
  const profileDoc = await db.collection('Official_Profiles').doc(uid).get();
  if (!profileDoc.exists) {
    return null;
  }
  return profileDoc.data()!.official_id;
}

/**
 * GET /api/v1/officials/dashboard
 * Retrieve headline metrics and the pending match audit queue.
 * Responds in under 200ms.
 */
export async function getDashboardHandler(req: AuthRequest, res: Response): Promise<void> {
  const startTime = Date.now();
  try {
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Access denied. Official role required.' });
      return;
    }

    const officialId = await getOfficialIdFromUid(req.user.uid);
    if (!officialId) {
      res.status(404).json({ error: 'Official profile not found.' });
      return;
    }

    const dashboardData = await getOfficialDashboardMetrics(officialId);
    const duration = Date.now() - startTime;

    res.set('X-Response-Time-Ms', String(duration));
    res.status(200).json(dashboardData);
  } catch (error: any) {
    console.error('getDashboardHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/officials/schedules?month=&year=
 * Retrieve scheduled match assignments, venue logistics, assigned officials, and court numbers.
 * Responds in under 200ms.
 */
export async function getSchedulesHandler(req: AuthRequest, res: Response): Promise<void> {
  const startTime = Date.now();
  try {
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Access denied. Official role required.' });
      return;
    }

    const officialId = await getOfficialIdFromUid(req.user.uid);
    if (!officialId) {
      res.status(404).json({ error: 'Official profile not found.' });
      return;
    }

    const monthParam = req.query.month ? Number(req.query.month) : undefined;
    const yearParam = req.query.year ? Number(req.query.year) : undefined;

    const schedules = await getOfficialSchedules(officialId, monthParam, yearParam);
    const duration = Date.now() - startTime;

    res.set('X-Response-Time-Ms', String(duration));
    res.status(200).json({
      official_id: officialId,
      schedules
    });
  } catch (error: any) {
    console.error('getSchedulesHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/notifications/official
 * Fetch chronological notification logs for audit requests and schedule updates.
 */
export async function getOfficialNotificationsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Access denied. Official role required.' });
      return;
    }

    const officialId = await getOfficialIdFromUid(req.user.uid);
    if (!officialId) {
      res.status(404).json({ error: 'Official profile not found.' });
      return;
    }

    const notifications = await getOfficialNotifications(officialId);

    res.status(200).json({
      official_id: officialId,
      unread_count: notifications.filter(n => !n.is_read).length,
      notifications
    });
  } catch (error: any) {
    console.error('getOfficialNotificationsHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * PUT /api/v1/notifications/read-all
 * Mark all official notifications as read.
 */
export async function markAllOfficialNotificationsAsReadHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Access denied. Official role required.' });
      return;
    }

    const officialId = await getOfficialIdFromUid(req.user.uid);
    if (!officialId) {
      res.status(404).json({ error: 'Official profile not found.' });
      return;
    }

    const count = await markAllOfficialNotificationsAsRead(officialId);

    // Triggers immediate feedback
    res.status(200).json({
      message: 'All official notifications marked as read.',
      updated_count: count
    });
  } catch (error: any) {
    console.error('markAllOfficialNotificationsAsReadHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

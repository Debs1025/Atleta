import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController';
import {
  getOfficialNotificationsHandler,
  markAllOfficialNotificationsAsReadHandler,
} from '../controllers/officialDashboardController';

const router = Router();

// GET /api/v1/notifications/official – Fetch chronological notification logs for audit requests and schedule updates
router.get('/official', authenticate, getOfficialNotificationsHandler);

// GET /api/v1/notifications – Fetch notifications for current authenticated athlete
router.get('/', authenticate, getNotifications);

// PUT /api/v1/notifications/read-all – Mark all notifications as read (polymorphic based on user role)
router.put('/read-all', authenticate, (req: any, res: any) => {
  if (req.user && req.user.role === 'Official') {
    return markAllOfficialNotificationsAsReadHandler(req, res);
  }
  return markAllAsRead(req, res);
});

// PUT /api/v1/notifications/:notificationId/read – Mark single notification as read
router.put('/:notificationId/read', authenticate, markAsRead);

export default router;

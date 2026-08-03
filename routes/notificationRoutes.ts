import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getNotifications,
  markRead,
  markAllRead,
} from '../controllers/notificationController';

const router = Router();

// Protect all notification routes with Bearer authentication
router.use(authenticate);

// GET /api/v1/notifications – Fetch notifications for current athlete
router.get('/', getNotifications);

// PUT /api/v1/notifications/read-all – Mark all notifications as read
router.put('/read-all', markAllRead);

// PUT /api/v1/notifications/:notificationId/read – Mark single notification as read
router.put('/:notificationId/read', markRead);

export default router;

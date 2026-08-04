import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController';

const router = Router();

// GET /api/v1/notifications – Fetch notifications for current authenticated athlete
router.get('/', authenticate, getNotifications);

// PUT /api/v1/notifications/read-all – Mark all notifications as read
router.put('/read-all', authenticate, markAllAsRead);

// PUT /api/v1/notifications/:notificationId/read – Mark single notification as read
router.put('/:notificationId/read', authenticate, markAsRead);

export default router;

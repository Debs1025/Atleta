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

router.get('/official', authenticate, getOfficialNotificationsHandler);
router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, (req: any, res: any) => {
  if (req.user && req.user.role === 'Official') {
    return markAllOfficialNotificationsAsReadHandler(req, res);
  }
  return markAllAsRead(req, res);
});
router.put('/:notificationId/read', authenticate, markAsRead);

export default router;

import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getOfficialProfileHandler,
  getOfficialSettingsHandler,
  updateOfficialSettingsHandler,
} from '../controllers/officialController';
import {
  getDashboardHandler,
  getSchedulesHandler,
  getOfficialNotificationsHandler,
  markAllOfficialNotificationsAsReadHandler,
} from '../controllers/officialDashboardController';

const router = Router();

// Profile & Identity
router.get('/profile', authenticate, getOfficialProfileHandler);
router.get('/me', authenticate, getOfficialProfileHandler);

// Tournament Management Operations & Dashboard
router.get('/dashboard', authenticate, getDashboardHandler);
router.get('/schedules', authenticate, getSchedulesHandler);

// Tournament Official Notifications
router.get('/notifications', authenticate, getOfficialNotificationsHandler);
router.put('/notifications/read-all', authenticate, markAllOfficialNotificationsAsReadHandler);
router.put('/notifications/read', authenticate, markAllOfficialNotificationsAsReadHandler);

// Tournament Official Settings
router.get('/me/settings', authenticate, getOfficialSettingsHandler);
router.put('/me/settings', authenticate, updateOfficialSettingsHandler);

export default router;

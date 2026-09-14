import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getOfficialProfileHandler,
  updateOfficialProfileHandler,
  getOfficialSettingsHandler,
  updateOfficialSettingsHandler,
} from '../controllers/officialController';
import {
  getDashboardHandler,
  getSchedulesHandler,
  getOfficialNotificationsHandler,
  markAllOfficialNotificationsAsReadHandler,
} from '../controllers/officialDashboardController';
import { getOfficialMatchesHandler } from '../controllers/validationController';

const router = Router();

// Profile & Identity (Named and Root Routes)
router.get('/profile', authenticate, getOfficialProfileHandler);
router.patch('/profile', authenticate, updateOfficialProfileHandler);

router.get('/me', authenticate, getOfficialProfileHandler);
router.patch('/me', authenticate, updateOfficialProfileHandler);
router.get('/me/profile', authenticate, getOfficialProfileHandler);
router.patch('/me/profile', authenticate, updateOfficialProfileHandler);

router.get('/', authenticate, getOfficialProfileHandler);
router.patch('/', authenticate, updateOfficialProfileHandler);

// Tournament Management Operations, Matches & Dashboard
router.get('/dashboard', authenticate, getDashboardHandler);
router.get('/schedules', authenticate, getSchedulesHandler);
router.get('/matches', authenticate, getOfficialMatchesHandler);
router.get('/matches/all', authenticate, getOfficialMatchesHandler);

// Tournament Official Notifications
router.get('/notifications', authenticate, getOfficialNotificationsHandler);
router.patch('/notifications/read-all', authenticate, markAllOfficialNotificationsAsReadHandler);
router.post('/notifications/read-all', authenticate, markAllOfficialNotificationsAsReadHandler);
router.patch('/notifications/read', authenticate, markAllOfficialNotificationsAsReadHandler);

// Tournament Official Settings
router.get('/me/settings', authenticate, getOfficialSettingsHandler);
router.get('/settings', authenticate, getOfficialSettingsHandler);
router.patch('/me/settings', authenticate, updateOfficialSettingsHandler);
router.patch('/settings', authenticate, updateOfficialSettingsHandler);

export default router;


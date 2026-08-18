import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getOfficialSettingsHandler,
  updateOfficialSettingsHandler,
} from '../controllers/officialController';
import {
  getDashboardHandler,
  getSchedulesHandler,
} from '../controllers/officialDashboardController';

const router = Router();

router.get('/dashboard', authenticate, getDashboardHandler);
router.get('/schedules', authenticate, getSchedulesHandler);
router.get('/me/settings', authenticate, getOfficialSettingsHandler);
router.put('/me/settings', authenticate, updateOfficialSettingsHandler);

export default router;

import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getOfficialSettingsHandler,
  updateOfficialSettingsHandler,
} from '../controllers/officialController';

const router = Router();

// GET /api/v1/officials/me/settings – Fetch split-screen layout preferences, discrepancy flag presets, and notification toggles
router.get('/me/settings', authenticate, getOfficialSettingsHandler);

// PUT /api/v1/officials/me/settings – Update audit preferences and notification controls
router.put('/me/settings', authenticate, updateOfficialSettingsHandler);

export default router;

import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireCoach } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware';
import { registerCoach, loginUser } from '../controllers/userController';
import {
  getCoachProfileHandler,
  getCoachSettingsHandler,
  updateCoachSettingsHandler,
  updateCoachProfileHandler,
  changeCoachPasswordHandler,
} from '../controllers/coachInquiryController';
import { getScoutingAthleteProfileController } from '../controllers/scoutingController';
import { postSrpeLog, getAthleteWorkloadHandler } from '../controllers/workloadController';
import { syncCoachOfflineBatchHandler, getCoachOfflineSnapshotHandler } from '../controllers/syncController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB document upload limit
});

// POST /api/v1/coaches/register-coach & /api/v1/coaches/coach – Register a new coach
router.post('/register-coach', authRateLimiter, upload.single('professional_documents'), registerCoach);
router.post('/coach', authRateLimiter, upload.single('professional_documents'), registerCoach);

// POST /api/v1/coaches/login – Login coach and receive a Bearer token
router.post('/login', authRateLimiter, loginUser);

// GET /api/v1/coaches/me/settings – Retrieve coach privacy, sync, and notification preferences
router.get('/me/settings', authenticate, getCoachSettingsHandler);

// PUT /api/v1/coaches/me/settings – Update sync preferences and notification toggles
router.put('/me/settings', authenticate, updateCoachSettingsHandler);

// PUT /api/v1/coaches/me/profile – Update coach full name, sport category, and uploaded certification document URLs
router.put('/me/profile', authenticate, updateCoachProfileHandler);

// PUT /api/v1/coaches/me/password – Change password requiring current password verification
router.put('/me/password', authenticate, changeCoachPasswordHandler);

// GET /api/v1/coaches/scouting/athletes/:athleteId – Retrieve complete athlete profile for coaching evaluation
router.get('/scouting/athletes/:athleteId', authenticate, requireCoach, getScoutingAthleteProfileController);

// POST /api/v1/coaches/athletes/:athleteId/workload – Coach logs athlete session duration, sRPE hardness & notes
router.post('/athletes/:athleteId/workload', authenticate, requireCoach, postSrpeLog);

// GET /api/v1/coaches/athletes/:athleteId/workload – Coach retrieves athlete workload trends and safety metrics
router.get('/athletes/:athleteId/workload', authenticate, requireCoach, getAthleteWorkloadHandler);

// POST /api/v1/coaches/sync-offline – Flush coach offline match transaction and stat queue
router.post('/sync-offline', authenticate, requireCoach, syncCoachOfflineBatchHandler);

// GET /api/v1/coaches/offline-snapshot – Pre-fetch coach offline data package (teams, rosters, sport schemas)
router.get('/offline-snapshot', authenticate, requireCoach, getCoachOfflineSnapshotHandler);

// GET /api/v1/coaches/:coachId – Retrieve public coach profile, quote, credentials, contact info
router.get('/:coachId', getCoachProfileHandler);

export default router;

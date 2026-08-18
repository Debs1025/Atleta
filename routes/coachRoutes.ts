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
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.post('/register-coach', authRateLimiter, upload.single('professional_documents'), registerCoach);
router.post('/coach', authRateLimiter, upload.single('professional_documents'), registerCoach);
router.post('/login', authRateLimiter, loginUser);
router.get('/me/settings', authenticate, getCoachSettingsHandler);
router.put('/me/settings', authenticate, updateCoachSettingsHandler);
router.put('/me/profile', authenticate, updateCoachProfileHandler);
router.put('/me/password', authenticate, changeCoachPasswordHandler);
router.get('/scouting/athletes/:athleteId', authenticate, requireCoach, getScoutingAthleteProfileController);
router.post('/athletes/:athleteId/workload', authenticate, requireCoach, postSrpeLog);
router.get('/athletes/:athleteId/workload', authenticate, requireCoach, getAthleteWorkloadHandler);
router.post('/sync-offline', authenticate, requireCoach, syncCoachOfflineBatchHandler);
router.get('/offline-snapshot', authenticate, requireCoach, getCoachOfflineSnapshotHandler);
router.get('/:coachId', getCoachProfileHandler);

export default router;

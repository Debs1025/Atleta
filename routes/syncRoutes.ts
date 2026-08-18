import { Router } from 'express';
import { authenticate, requireCoach } from '../middlewares/authMiddleware';
import {
  syncCoachOfflineBatchHandler,
  syncAthleteOfflineBatchHandler,
  getCoachOfflineSnapshotHandler,
  getAthleteOfflineSnapshotHandler,
  getOfflineSyncStatusHandler,
} from '../controllers/syncController';

const router = Router();

// POST /api/v1/sync/coach-offline-queue & /offline-queue – Flush and synchronize coach offline match & stat queue
router.post('/coach-offline-queue', authenticate, requireCoach, syncCoachOfflineBatchHandler);
router.post('/offline-queue', authenticate, requireCoach, syncCoachOfflineBatchHandler);
router.post('/batch', authenticate, syncCoachOfflineBatchHandler);

// POST /api/v1/sync/athlete-offline-queue – Flush and synchronize athlete offline edits & workout logs
router.post('/athlete-offline-queue', authenticate, syncAthleteOfflineBatchHandler);

// GET /api/v1/sync/coach-snapshot – Pre-fetch complete offline snapshot package for Coach
router.get('/coach-snapshot', authenticate, requireCoach, getCoachOfflineSnapshotHandler);

// GET /api/v1/sync/athlete-snapshot/:athleteId – Pre-fetch complete offline snapshot package for Athlete
router.get('/athlete-snapshot/:athleteId', authenticate, getAthleteOfflineSnapshotHandler);

// GET /api/v1/sync/status – Retrieve sync status and recent audit history
router.get('/status', authenticate, getOfflineSyncStatusHandler);

export default router;

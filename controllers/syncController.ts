import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { validateSyncBatchRequest } from '../validators/syncValidator';
import {
  processCoachOfflineBatchService,
  processAthleteOfflineBatchService,
  getCoachOfflineSnapshotService,
  getAthleteOfflineSnapshotService,
  getOfflineSyncStatusService,
  ServiceError,
} from '../services/syncService';

/**
 * POST /api/v1/sync/coach-offline-queue & /api/v1/sync/offline-queue
 * Flush and synchronize queued offline match transactions, metrics, and sRPE entries from Coach.
 */
export async function syncCoachOfflineBatchHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const authenticatedUid = req.user!.uid;
    const userRole = (req.user as any)?.role;

    const payload = {
      ...req.body,
      user_id: req.body.user_id || authenticatedUid,
      user_role: req.body.user_role || 'Coach',
    };

    const errors = validateSyncBatchRequest(payload);
    if (errors.length > 0) {
      res.status(400).json({ error: 'Bad Request. Validation failed.', details: errors });
      return;
    }

    if (userRole !== 'Coach' && userRole !== 'Admin') {
      res.status(403).json({ error: 'Forbidden. Only coaches may sync coach offline queues.' });
      return;
    }

    const response = await processCoachOfflineBatchService(authenticatedUid, payload);
    res.status(200).json(response);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('syncCoachOfflineBatchHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/sync/athlete-offline-queue
 * Flush and synchronize queued offline profile edits and self-logged workout entries from Athlete.
 */
export async function syncAthleteOfflineBatchHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const authenticatedUid = req.user!.uid;
    const userRole = (req.user as any)?.role;

    const athleteId = req.params.athleteId || req.body.user_id || authenticatedUid;
    const payload = {
      ...req.body,
      user_id: athleteId,
      user_role: req.body.user_role || 'Athlete',
    };

    const errors = validateSyncBatchRequest(payload);
    if (errors.length > 0) {
      res.status(400).json({ error: 'Bad Request. Validation failed.', details: errors });
      return;
    }

    if (authenticatedUid !== athleteId && userRole !== 'Coach' && userRole !== 'Admin') {
      res.status(403).json({ error: 'Forbidden. You do not have permission to sync this athlete queue.' });
      return;
    }

    const response = await processAthleteOfflineBatchService(athleteId, payload);
    res.status(200).json(response);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('syncAthleteOfflineBatchHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/sync/coach-snapshot
 * Pre-fetch complete offline package for Coach with HTTP 304 conditional validation.
 */
export async function getCoachOfflineSnapshotHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const coachId = req.user!.uid;
    const snapshot = await getCoachOfflineSnapshotService(coachId);

    // Conditional HTTP ETag Caching
    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === snapshot.etag) {
      res.status(304).end();
      return;
    }

    res.set('ETag', snapshot.etag);
    res.set('Cache-Control', 'private, max-age=300');
    res.set('X-Offline-Cache-Version', snapshot.cache_version);
    res.status(200).json(snapshot);
  } catch (error: any) {
    console.error('getCoachOfflineSnapshotHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/sync/athlete-snapshot/:athleteId
 * Pre-fetch complete offline package for Athlete with HTTP 304 conditional validation.
 */
export async function getAthleteOfflineSnapshotHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = req.params.athleteId || req.user!.uid;
    const snapshot = await getAthleteOfflineSnapshotService(athleteId);

    const clientEtag = req.headers['if-none-match'];
    if (clientEtag && clientEtag === snapshot.etag) {
      res.status(304).end();
      return;
    }

    res.set('ETag', snapshot.etag);
    res.set('Cache-Control', 'private, max-age=300');
    res.set('X-Offline-Cache-Version', snapshot.cache_version);
    res.status(200).json(snapshot);
  } catch (error: any) {
    console.error('getAthleteOfflineSnapshotHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/sync/status
 * Retrieve synchronization status and recent audit history.
 */
export async function getOfflineSyncStatusHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.uid;
    const status = await getOfflineSyncStatusService(userId);
    res.status(200).json(status);
  } catch (error: any) {
    console.error('getOfflineSyncStatusHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { validateSrpeInput } from '../validators/workloadValidator';
import { logSrpeEntry, getWorkloadAnalytics } from '../services/workloadService';

/**
 * POST /api/v1/analytics/srpe
 * Log daily session duration and sRPE hardness rating.
 *
 * ACCEPTANCE CRITERIA:
 * - sRPE values outside 1–10 return HTTP 400 Bad Request.
 */
export async function postSrpeLog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const authenticatedUid = req.user?.uid;

    // Validate input
    const errors = validateSrpeInput(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        error: 'Bad Request. Validation failed.',
        details: errors,
      });
      return;
    }

    const { athlete_id, session_duration_mins, srpe_score, entry_date } = req.body;

    // Security: only the athlete themselves or their coach may submit
    // For now, allow if authenticated user matches athlete_id
    if (authenticatedUid && authenticatedUid !== athlete_id) {
      // Check if the authenticated user is a coach for this athlete (future: coach roster lookup)
      // For now, allow coaches by checking role in token claims
      const userRole = (req.user as any)?.role;
      if (userRole !== 'Coach' && userRole !== 'Admin') {
        res.status(403).json({
          error: 'Forbidden. Only the athlete or their verified coach may submit workload data.',
        });
        return;
      }
    }

    const entry = await logSrpeEntry({
      athlete_id,
      session_duration_mins: Number(session_duration_mins),
      srpe_score: Number(srpe_score),
      entry_date,
    });

    res.status(201).json({
      message: 'sRPE entry logged successfully.',
      entry,
    });
  } catch (error: any) {
    console.error('postSrpeLog error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/analytics/:athleteId/workload
 * Retrieve calculated workload trends and safety metrics.
 *
 * ACCEPTANCE CRITERIA:
 * - Athletes with < 28 days of baseline data return HTTP 404 with explanation.
 * - Cached workload queries respond in < 100ms.
 * - Only the athlete or their verified coach may view workload data.
 */
export async function getWorkload(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = Array.isArray(req.params.athleteId)
      ? req.params.athleteId[0]
      : req.params.athleteId;
    const authenticatedUid = req.user?.uid;

    if (!athleteId) {
      res.status(400).json({ error: 'Athlete ID is required.' });
      return;
    }

    // Security: only the athlete themselves or their coach may view
    if (authenticatedUid && authenticatedUid !== athleteId) {
      const userRole = (req.user as any)?.role;
      if (userRole !== 'Coach' && userRole !== 'Admin') {
        res.status(403).json({
          error: 'Forbidden. Only the athlete or their verified coach may view workload data.',
        });
        return;
      }
    }

    const startTime = Date.now();
    const analytics = await getWorkloadAnalytics(athleteId);
    const responseTimeMs = Date.now() - startTime;

    if (!analytics) {
      res.status(404).json({
        error: 'We need at least 28 days of workout logs to calculate your baseline fatigue meter!',
        athlete_id: athleteId,
        recommendation: 'Keep logging your daily sRPE entries. You can start viewing analytics once you have 28 days of data.',
      });
      return;
    }

    res.set('Cache-Control', 'private, max-age=60');
    res.set('X-Response-Time-Ms', String(responseTimeMs));
    res.status(200).json(analytics);
  } catch (error: any) {
    console.error('getWorkload error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

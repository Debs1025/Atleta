import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  validateCreateOfficialMatch,
  validateCertifyValidation,
} from '../validators/validationValidator';
import {
  createOfficialMatchService,
  getPendingValidationsService,
  certifyValidationService,
  deleteMatchService,
} from '../services/validationService';
import { ServiceError } from '../validators/matchValidator';

/**
 * POST /api/v1/matches/official
 * Create a new official match instance with reference ID, teams, assigned coaches, and scoresheet attachment.
 * Requires Idempotency-Key header.
 */
export async function createOfficialMatchHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Security check: Official role required
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Unauthorized. Official role required.' });
      return;
    }

    const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;

    const errors = validateCreateOfficialMatch(req.body, idempotencyKey);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const result = await createOfficialMatchService(req.user.uid, req.body, idempotencyKey!);

    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('createOfficialMatchHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/validations/pending
 * Fetch pending match verification requests.
 */
export async function getPendingValidationsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Security check: Official role required
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Unauthorized. Official role required.' });
      return;
    }

    const pendingValidations = await getPendingValidationsService();

    res.status(200).json(pendingValidations);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('getPendingValidationsHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/validations/:validationId/certify
 * Approve audit, save context notes, and lock target match record to read-only status.
 * ACCEPTANCE CRITERIA:
 * 1. Non-official accounts attempting certification return HTTP 401 Unauthorized.
 * 2. Re-auditing an already-certified match returns HTTP 409 Conflict.
 */
export async function certifyValidationHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Security check: Non-official accounts return HTTP 401 Unauthorized
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Unauthorized. Official role required for certification.' });
      return;
    }

    const validationId = req.params.validationId;
    if (!validationId) {
      res.status(400).json({ error: 'Validation ID parameter is required.' });
      return;
    }

    const errors = validateCertifyValidation(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const result = await certifyValidationService(validationId, req.user.uid, req.body);

    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('certifyValidationHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * DELETE /api/v1/matches/:matchId
 * Remove or invalidate a disputed match record.
 */
export async function deleteMatchHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Security check: Official role required
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Unauthorized. Official role required.' });
      return;
    }

    const matchId = req.params.matchId;
    if (!matchId) {
      res.status(400).json({ error: 'Match ID parameter is required.' });
      return;
    }

    const result = await deleteMatchService(matchId);

    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('deleteMatchHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

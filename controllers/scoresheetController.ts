import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ServiceError } from '../validators/matchValidator';
import {
  createScoresheetRequestService,
  getScoresheetRequestsService,
  updateScoresheetRequestService,
} from '../services/scoresheetService';

export async function requestScoresheetHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { match_id, notes, context_notes, official_id, target_team_id } = req.body;
    if (!match_id) {
      res.status(400).json({ error: 'match_id is required.' });
      return;
    }

    const result = await createScoresheetRequestService(req.user.uid, {
      match_id,
      notes: notes || context_notes,
      official_id,
      target_team_id,
    });

    res.status(201).json({
      message: 'Scoresheet request submitted successfully.',
      ...result,
    });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('requestScoresheetHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

export async function getScoresheetsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const matchId = typeof req.query.match_id === 'string' ? req.query.match_id : undefined;
    const officialId = typeof req.query.official_id === 'string' ? req.query.official_id : undefined;

    const requests = await getScoresheetRequestsService(req.user.uid, req.user.role, {
      status,
      match_id: matchId,
      official_id: officialId,
    });

    res.status(200).json(requests);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('getScoresheetsHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

export async function updateScoresheetHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user || req.user.role !== 'Official') {
      res.status(401).json({ error: 'Unauthorized. Official role required.' });
      return;
    }

    const requestId = String(Array.isArray(req.params.requestId) ? req.params.requestId[0] : (req.params.requestId || (req.params as any).id || '')).trim();
    if (!requestId) {
      res.status(400).json({ error: 'Request ID parameter is required.' });
      return;
    }

    const { status, scoresheet_url, scoresheet_data, notes } = req.body;
    if (!status || !['Approved', 'Rejected'].includes(status)) {
      res.status(400).json({ error: "status must be 'Approved' or 'Rejected'." });
      return;
    }

    const result = await updateScoresheetRequestService(requestId, req.user.uid, {
      status,
      scoresheet_url,
      scoresheet_data,
      notes,
    });

    res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('updateScoresheetHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

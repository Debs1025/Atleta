import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  submitMatchSession,
  processScoresheetOCR,
  getMatchBoxscore,
  getMatchResultDetails,
} from '../services/matchService';
import { validateSubmitMatch, ServiceError } from '../validators/matchValidator';

export async function submitMatch(req: AuthRequest, res: Response): Promise<void> {
  try {
    const coachId = req.user?.uid || 'coach_default';
    const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;

    const errors = validateSubmitMatch(req.body, idempotencyKey);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const result = await submitMatchSession(coachId, req.body, idempotencyKey!);
    res.status(201).json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('submitMatch error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

export async function uploadScoresheet(req: AuthRequest, res: Response): Promise<void> {
  try {
    const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!matchId) {
      res.status(400).json({ error: 'Match ID is required.' });
      return;
    }

    const parsedResult = await processScoresheetOCR(matchId, file);
    res.status(200).json({
      message: 'Scoresheet uploaded and OCR table parsing completed successfully.',
      ...parsedResult,
    });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('uploadScoresheet error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

export async function getBoxscore(req: AuthRequest, res: Response): Promise<void> {
  try {
    const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;

    if (!matchId) {
      res.status(400).json({ error: 'Match ID is required.' });
      return;
    }

    const boxscore = await getMatchBoxscore(matchId);
    res.status(200).json(boxscore);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('getBoxscore error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

export async function getMatchDetailsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const matchId = Array.isArray(req.params.matchId) ? req.params.matchId[0] : req.params.matchId;

    if (!matchId) {
      res.status(400).json({ error: 'Match ID is required.' });
      return;
    }

    const details = await getMatchResultDetails(matchId);
    res.status(200).json(details);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('getMatchDetailsHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

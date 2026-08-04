import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  getAthleteProfile,
  updateAthleteProfile,
  uploadAthleteDocument,
  getAthleteHomeSummary,
} from '../services/athleteService';

/**
 * GET /api/v1/athletes/:athleteId/home
 * Aggregate personal analytics, shooting efficiency, 5-game trend, and current team summary.
 * Returns Cache-Control: private, max-age=300
 */
export async function getAthleteHome(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = Array.isArray(req.params.athleteId) ? req.params.athleteId[0] : req.params.athleteId;
    const authenticatedUid = req.user?.uid;

    if (!athleteId) {
      res.status(400).json({ error: 'Athlete ID is required.' });
      return;
    }

    // Security requirement: An athlete may only access their own home summary
    if (authenticatedUid && authenticatedUid !== athleteId) {
      res.status(403).json({ error: 'Forbidden. You may only access your own home summary.' });
      return;
    }

    const homeData = await getAthleteHomeSummary(athleteId);
    if (!homeData) {
      res.status(404).json({ error: 'Athlete not found.' });
      return;
    }

    // Set Cache-Control header: private, max-age=300
    res.set('Cache-Control', 'private, max-age=300');
    res.status(200).json(homeData);
  } catch (error: any) {
    console.error('getAthleteHome error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/athletes/:athleteId
 * Fetch full digital dashboard data for an athlete.
 */
export async function getAthlete(req: Request, res: Response): Promise<void> {
  try {
    const athleteId = Array.isArray(req.params.athleteId) ? req.params.athleteId[0] : req.params.athleteId;
    if (!athleteId) {
      res.status(400).json({ error: 'Athlete ID is required.' });
      return;
    }

    const athleteData = await getAthleteProfile(athleteId);
    res.status(200).json(athleteData);
  } catch (error: any) {
    console.error('getAthlete error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * PUT /api/v1/athletes/:athleteId
 * Update physical attributes, stats, or profile details.
 */
export async function updateAthlete(req: Request, res: Response): Promise<void> {
  try {
    const athleteId = Array.isArray(req.params.athleteId) ? req.params.athleteId[0] : req.params.athleteId;
    if (!athleteId) {
      res.status(400).json({ error: 'Athlete ID is required.' });
      return;
    }

    const updateData = req.body;
    const updatedProfile = await updateAthleteProfile(athleteId, updateData);

    res.status(200).json({
      message: 'Athlete profile updated successfully.',
      athlete: updatedProfile,
    });
  } catch (error: any) {
    console.error('updateAthlete error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/athletes/:athleteId/documents
 * Upload PSA Birth Certificate or Proof of Residency.
 */
export async function uploadDocument(req: Request, res: Response): Promise<void> {
  try {
    const athleteId = Array.isArray(req.params.athleteId) ? req.params.athleteId[0] : req.params.athleteId;
    const docType = req.body.doc_type || 'psa_birth_certificate';
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!athleteId) {
      res.status(400).json({ error: 'Athlete ID is required.' });
      return;
    }

    if (docType !== 'psa_birth_certificate' && docType !== 'proof_of_residency') {
      res.status(400).json({ error: 'doc_type must be "psa_birth_certificate" or "proof_of_residency".' });
      return;
    }

    const updatedProfile = await uploadAthleteDocument(athleteId, docType, file);

    res.status(200).json({
      message: 'Document uploaded successfully.',
      documents: updatedProfile.documents,
    });
  } catch (error: any) {
    console.error('uploadDocument error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

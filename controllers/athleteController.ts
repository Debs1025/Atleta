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
    const authenticatedRole = req.user?.role;

    if (!athleteId) {
      res.status(400).json({ error: 'Athlete ID is required.' });
      return;
    }

    // Access control:
    // - Coaches and Admins can view any athlete's home summary
    // - Athletes can only view their own (uid matches athleteId with or without ath_ prefix)
    if (authenticatedUid && authenticatedRole === 'Athlete') {
      const normalizedAthleteId = athleteId.replace(/^ath_/, '');
      const normalizedUid = authenticatedUid.replace(/^ath_/, '');
      if (normalizedUid !== normalizedAthleteId) {
        res.status(403).json({ error: 'Forbidden. You may only access your own home summary.' });
        return;
      }
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

/**
 * GET /api/v1/athletes/search?query=
 * Autocomplete search registered athletes by name, ID, or position, returning eligibility document status.
 */
export async function searchAthletesHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = req.query.query as string | undefined;
    const { searchAthletes } = require('../services/teamService');

    const athletes = await searchAthletes(query);

    res.status(200).json({
      total: athletes.length,
      query: query || null,
      athletes,
    });
  } catch (error: any) {
    console.error('searchAthletesHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/athletes/register-athlete & /api/v1/athletes/register
 * Register a new athlete, provision Users and Athlete_Profiles documents.
 */
export async function registerAthlete(req: Request, res: Response): Promise<void> {
  try {
    const data = req.body as Record<string, unknown>;
    const file = (req as any).file as Express.Multer.File | undefined;

    const { validateRegisterUser } = require('../validators/userValidator');
    const errors = validateRegisterUser(data);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const { registerUserService } = require('../services/userService');
    const result = await registerUserService({ ...data, role: 'Athlete' }, file);

    res.status(201).json({
      message: 'Athlete registered successfully.',
      ...result,
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    console.error('Register athlete error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

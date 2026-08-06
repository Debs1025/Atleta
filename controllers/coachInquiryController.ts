import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { validateInquirySubmission } from '../validators/inquiryValidator';
import {
  getPublicCoachProfile,
  submitRecruitmentInquiry,
  getAthleteInquiries,
  ServiceError,
} from '../services/coachInquiryService';

/**
 * GET /api/v1/coaches/:coachId
 * Retrieve public coach profile, philosophy quote, credentials, and contact info.
 */
export async function getCoachProfileHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const coachId = Array.isArray(req.params.coachId)
      ? req.params.coachId[0]
      : req.params.coachId;

    if (!coachId) {
      res.status(400).json({ error: 'Coach ID is required.' });
      return;
    }

    const coach = await getPublicCoachProfile(coachId);

    if (!coach) {
      res.status(404).json({ error: `Coach with ID '${coachId}' was not found.` });
      return;
    }

    res.status(200).json(coach);
  } catch (error: any) {
    console.error('getCoachProfileHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/inquiries
 * Submit a recruitment inquiry to a coach.
 *
 * ACCEPTANCE CRITERIA:
 * - Duplicate active (Pending or Accepted) inquiry returns HTTP 400 Bad Request.
 * - Non-existent coach returns HTTP 404 Not Found.
 * - Rate-limited to 10 requests/day per athlete (returns 429 Too Many Requests).
 */
export async function submitInquiryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = req.user!.uid;

    // Validate request body
    const errors = validateInquirySubmission(req.body);
    if (errors.length > 0) {
      res.status(400).json({
        error: 'Bad Request. Validation failed.',
        details: errors,
      });
      return;
    }

    const { coach_id, message } = req.body;

    const inquiry = await submitRecruitmentInquiry(athleteId, coach_id, message);

    res.status(201).json({
      message: 'Recruitment inquiry submitted successfully.',
      inquiry,
    });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('submitInquiryHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/inquiries
 * Retrieve current athlete's sent inquiries and statuses for the Inquiry Tracker Page.
 * Responds in under 200ms.
 */
export async function getAthleteInquiriesHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const athleteId = req.user!.uid;
    const startTime = Date.now();

    const inquiries = await getAthleteInquiries(athleteId);
    const responseTimeMs = Date.now() - startTime;

    res.set('X-Response-Time-Ms', String(responseTimeMs));
    res.status(200).json({
      athlete_id: athleteId,
      total_inquiries: inquiries.length,
      inquiries,
    });
  } catch (error: any) {
    console.error('getAthleteInquiriesHandler error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

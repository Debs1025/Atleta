import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { submitAuditRequest, generateMatchPdf } from '../services/auditService';
import { checkPdfRateLimit } from '../validators/auditValidator';
import { ServiceError } from '../validators/matchValidator';

/**
 * POST /api/v1/matches/:matchId/audit-request
 * Submit a formal audit request to the appointed Tournament Official.
 */
export async function submitAuditRequestController(req: AuthRequest, res: Response): Promise<void> {
  const coachId = req.user?.uid || 'coach_default';
  const matchId = String(req.params.matchId);

  try {
    const audit = await submitAuditRequest(coachId, matchId);
    res.status(201).json({
      message: 'Official audit request submitted successfully.',
      audit,
    });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('submitAuditRequestController error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/matches/:matchId/pdf
 * Compile and stream a certified PDF match report.
 */
export async function exportMatchPdfController(req: AuthRequest, res: Response): Promise<void> {
  const coachId = req.user?.uid || 'coach_default';
  const matchId = String(req.params.matchId);

  try {
    // 1. Enforce rolling rate limit of 5 requests/minute per coach
    checkPdfRateLimit(coachId);

    // 2. Set headers for attachment streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=match_report_${matchId}.pdf`);

    // 3. Compile and stream PDF report
    await generateMatchPdf(coachId, matchId, res);
  } catch (error: any) {
    // If headers were already sent when the error happened, do not attempt to send them again
    if (res.headersSent) {
      console.error('exportMatchPdfController error after headers sent:', error);
      return;
    }

    if (error instanceof ServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('exportMatchPdfController error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

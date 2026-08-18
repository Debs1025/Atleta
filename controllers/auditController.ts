import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { submitAuditRequest, generateMatchPdf } from '../services/auditService';
import { checkPdfRateLimit } from '../validators/auditValidator';
import { ServiceError } from '../validators/matchValidator';

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

export async function exportMatchPdfController(req: AuthRequest, res: Response): Promise<void> {
  const coachId = req.user?.uid || 'coach_default';
  const matchId = String(req.params.matchId);

  try {
    checkPdfRateLimit(coachId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=match_report_${matchId}.pdf`);

    await generateMatchPdf(coachId, matchId, res);
  } catch (error: any) {
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

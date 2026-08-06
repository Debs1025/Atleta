import { Router } from 'express';
import { getCoachProfileHandler } from '../controllers/coachInquiryController';

const router = Router();

// GET /api/v1/coaches/:coachId – Retrieve public coach profile, quote, credentials, contact info
router.get('/:coachId', getCoachProfileHandler);

export default router;

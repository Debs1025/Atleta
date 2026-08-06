import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  submitInquiryHandler,
  getAthleteInquiriesHandler,
} from '../controllers/coachInquiryController';

const router = Router();

// POST /api/v1/inquiries – Submit a recruitment inquiry to a coach
router.post('/', authenticate, submitInquiryHandler);

// GET /api/v1/inquiries – Retrieve current athlete's sent inquiries and statuses
router.get('/', authenticate, getAthleteInquiriesHandler);

export default router;

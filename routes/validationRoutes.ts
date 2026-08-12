import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getPendingValidationsHandler,
  certifyValidationHandler,
} from '../controllers/validationController';

const router = Router();

// GET /api/v1/validations/pending – Fetch pending match verification requests
router.get('/pending', authenticate, getPendingValidationsHandler);

// POST /api/v1/validations/:validationId/certify – Approve audit, save context notes, and lock target match record
router.post('/:validationId/certify', authenticate, certifyValidationHandler);

export default router;

import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  requestScoresheetHandler,
  getScoresheetsHandler,
  updateScoresheetHandler,
} from '../controllers/scoresheetController';

const router = Router();

// Scoresheet Requests & Fetching
router.post('/request', authenticate, requestScoresheetHandler);
router.post('/', authenticate, requestScoresheetHandler);

router.get('/', authenticate, getScoresheetsHandler);
router.get('/list', authenticate, getScoresheetsHandler);
router.get('/requests', authenticate, getScoresheetsHandler);

router.patch('/:requestId', authenticate, updateScoresheetHandler);
router.patch('/:requestId/respond', authenticate, updateScoresheetHandler);

export default router;

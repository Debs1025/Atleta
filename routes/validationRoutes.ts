import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getPendingValidationsHandler,
  certifyValidationHandler,
  createOfficialMatchHandler,
  deleteMatchHandler,
} from '../controllers/validationController';
import {
  requestScoresheetHandler,
  getScoresheetsHandler,
  updateScoresheetHandler,
} from '../controllers/scoresheetController';

const router = Router();

// Official Match Creation under /validations
router.post('/official', authenticate, createOfficialMatchHandler);
router.post('/matches/official', authenticate, createOfficialMatchHandler);

// Pending Validations Queue (Named and Root Routes)
router.get('/pending', authenticate, getPendingValidationsHandler);
router.get('/list', authenticate, getPendingValidationsHandler);
router.get('/', authenticate, getPendingValidationsHandler);

// Certify Validation
router.post('/:validationId/certify', authenticate, certifyValidationHandler);
router.patch('/:validationId/certify', authenticate, certifyValidationHandler);

// Scoresheet Requests under /validations
router.post('/scoresheets/request', authenticate, requestScoresheetHandler);
router.get('/scoresheets', authenticate, getScoresheetsHandler);
router.patch('/scoresheets/:requestId', authenticate, updateScoresheetHandler);

// Disputed Match Deletion
router.delete('/matches/:matchId', authenticate, deleteMatchHandler);

export default router;


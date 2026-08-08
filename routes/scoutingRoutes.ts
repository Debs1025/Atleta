import { Router } from 'express';
import { authenticate, requireCoach } from '../middlewares/authMiddleware';
import {
  searchAthletesController,
  getRankingsController,
  createProposalController,
  getProposalsController,
} from '../controllers/scoutingController';

const router = Router();

// Protect all scouting endpoints with Bearer token authentication and Coach role restriction
router.use(authenticate);
router.use(requireCoach);

// GET /api/v1/scouting/athletes – Search filtered regional athlete directory.
router.get('/athletes', searchAthletesController);

// GET /api/v1/scouting/rankings – Retrieve top 10 player PER rankings.
router.get('/rankings', getRankingsController);

// POST /api/v1/scouting/proposals – Dispatch a formal recruitment proposal to an athlete.
router.post('/proposals', createProposalController);

// GET /api/v1/scouting/proposals – Retrieve sent recruitment proposals and active status updates.
router.get('/proposals', getProposalsController);

export default router;

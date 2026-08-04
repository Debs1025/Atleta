import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { postSrpeLog, getWorkload } from '../controllers/workloadController';

const router = Router();

// POST /api/v1/analytics/srpe – Log daily session duration and sRPE
router.post('/srpe', authenticate, postSrpeLog);

// GET /api/v1/analytics/:athleteId/workload – Retrieve calculated workload trends
router.get('/:athleteId/workload', authenticate, getWorkload);

export default router;

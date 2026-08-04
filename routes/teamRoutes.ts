import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { browseTeams, getTeam } from '../controllers/teamController';

const router = Router();

// GET /api/v1/teams?sport=&search= – Browse team directory
router.get('/', authenticate, browseTeams);

// GET /api/v1/teams/:teamId – Retrieve specific team details
router.get('/:teamId', authenticate, getTeam);

export default router;

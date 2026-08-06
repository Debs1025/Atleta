import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  browseTeams,
  getTeam,
  createTeamHandler,
  updateRosterHandler,
} from '../controllers/teamController';

const router = Router();

// GET /api/v1/teams?sport=&search=&coachId= – Browse team directory or retrieve teams managed by coach
router.get('/', authenticate, browseTeams);

// POST /api/v1/teams – Create a new team instance (Coach protected)
router.post('/', authenticate, createTeamHandler);

// PUT /api/v1/teams/:teamId/roster – Update roster positions, jersey numbers, or remove players (Coach ownership protected)
router.put('/:teamId/roster', authenticate, updateRosterHandler);

// GET /api/v1/teams/:teamId – Retrieve specific team details, description, region, athlete count, and roster
router.get('/:teamId', authenticate, getTeam);

export default router;

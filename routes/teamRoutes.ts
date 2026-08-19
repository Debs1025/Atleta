import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import {
  browseTeams,
  getTeam,
  createTeamHandler,
  updateTeamHandler,
  updateRosterHandler,
} from '../controllers/teamController';

const router = Router();

router.get('/', authenticate, browseTeams);
router.post('/', authenticate, createTeamHandler);
router.put('/:teamId', authenticate, updateTeamHandler);
router.put('/:teamId/roster', authenticate, updateRosterHandler);
router.get('/:teamId', authenticate, getTeam);

export default router;

import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authMiddleware';
import {
  getAthleteHome,
  getAthlete,
  updateAthlete,
  uploadDocument,
  searchAthletesHandler,
  registerAthlete,
  getAthleteAllStatsHandler,
  getAthleteMatchHistoryHandler,
} from '../controllers/athleteController';
import { getAthleteTeamHandler } from '../controllers/teamController';
import { postSrpeLog, getAthleteWorkloadHandler } from '../controllers/workloadController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
});

// POST /api/v1/athletes/register-athlete & /api/v1/athletes/register – Register a new athlete
router.post('/register-athlete', upload.single('eligible_documents'), registerAthlete);
router.post('/register', upload.single('eligible_documents'), registerAthlete);

// GET /api/v1/athletes/search?query= – Autocomplete search registered athletes by name, ID, or position
router.get('/search', authenticate, searchAthletesHandler);

// GET /api/v1/athletes/:athleteId/home – Aggregated personal analytics & team summary
router.get('/:athleteId/home', authenticate, getAthleteHome);

// GET /api/v1/athletes/:athleteId/team – Retrieve athlete's current team, coach, and roster
router.get('/:athleteId/team', authenticate, getAthleteTeamHandler);

// GET /api/v1/athletes/:athleteId/stats/all – Retrieve expanded career statistics, shooting accuracy percentages, PER ratings, and games played
router.get('/:athleteId/stats/all', authenticate, getAthleteAllStatsHandler);

// GET /api/v1/athletes/:athleteId/matches – Fetch date-grouped match history logs with placements, scores, and sport badges
router.get('/:athleteId/matches', authenticate, getAthleteMatchHistoryHandler);

// GET /api/v1/athletes/:athleteId/workload – Retrieve athlete workload summary, fatigue meter, and recent coach logs
router.get('/:athleteId/workload', authenticate, getAthleteWorkloadHandler);

// POST /api/v1/athletes/:athleteId/workload – Log daily sRPE workout session
router.post('/:athleteId/workload', authenticate, postSrpeLog);

// GET /api/v1/athletes/:athleteId – Fetch full digital dashboard data
router.get('/:athleteId', getAthlete);

// PUT /api/v1/athletes/:athleteId – Update physical characteristics, profile, achievements
router.put('/:athleteId', authenticate, updateAthlete);

// POST /api/v1/athletes/:athleteId/documents – Upload PSA Birth Certificate or Proof of Residency
router.post('/:athleteId/documents', authenticate, upload.single('document'), uploadDocument);

export default router;

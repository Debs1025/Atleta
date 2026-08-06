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
} from '../controllers/athleteController';
import { getAthleteTeamHandler } from '../controllers/teamController';

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

// GET /api/v1/athletes/:athleteId – Fetch full digital dashboard data
router.get('/:athleteId', getAthlete);

// PUT /api/v1/athletes/:athleteId – Update physical characteristics, profile, achievements
router.put('/:athleteId', authenticate, updateAthlete);

// POST /api/v1/athletes/:athleteId/documents – Upload PSA Birth Certificate or Proof of Residency
router.post('/:athleteId/documents', authenticate, upload.single('document'), uploadDocument);

export default router;

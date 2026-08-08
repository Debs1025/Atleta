import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authMiddleware';
import {
  submitMatch,
  uploadScoresheet,
  getBoxscore,
} from '../controllers/matchController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // Allow multer to capture up to 30MB so validator can throw explicit 413 error
});

// POST /api/v1/matches – Submit complete live game log session and stats payload (Requires Idempotency-Key header)
router.post('/', authenticate, submitMatch);

// POST /api/v1/matches/:matchId/scoresheet – Upload scoresheet image/PDF, run OCR processing (Max 25MB limit)
router.post('/:matchId/scoresheet', authenticate, upload.single('scoresheet'), uploadScoresheet);

// GET /api/v1/matches/:matchId/boxscore – Fetch compiled match stats and computed efficiency metrics
router.get('/:matchId/boxscore', authenticate, getBoxscore);

export default router;

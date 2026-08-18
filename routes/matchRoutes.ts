import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireCoach } from '../middlewares/authMiddleware';
import {
  submitMatch,
  uploadScoresheet,
  getBoxscore,
  getMatchDetailsHandler,
} from '../controllers/matchController';
import {
  submitAuditRequestController,
  exportMatchPdfController,
} from '../controllers/auditController';
import {
  createOfficialMatchHandler,
  deleteMatchHandler,
} from '../controllers/validationController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

router.post('/official', authenticate, createOfficialMatchHandler);
router.post('/', authenticate, submitMatch);
router.post('/:matchId/scoresheet', authenticate, upload.single('scoresheet'), uploadScoresheet);
router.get('/:matchId/boxscore', authenticate, getBoxscore);
router.get('/:matchId/details', authenticate, getMatchDetailsHandler);
router.post('/:matchId/audit-request', authenticate, requireCoach, submitAuditRequestController);
router.get('/:matchId/pdf', authenticate, requireCoach, exportMatchPdfController);
router.delete('/:matchId', authenticate, deleteMatchHandler);

export default router;

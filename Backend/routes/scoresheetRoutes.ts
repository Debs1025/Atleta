import { Router } from 'express';
import multer from 'multer';
import { optionalAuth } from '../middlewares/authMiddleware';
import {
  createScoresheetRequestHandler,
  getScoresheetRequestsHandler,
  fulfillScoresheetRequestHandler,
} from '../controllers/scoresheetRequestController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// Coach requests scoresheet
router.post('/request', optionalAuth, createScoresheetRequestHandler);
router.post('/:matchId/request', optionalAuth, createScoresheetRequestHandler);

// Official views request queue
router.get('/requests', optionalAuth, getScoresheetRequestsHandler);
router.get('/queue', optionalAuth, getScoresheetRequestsHandler);
router.get('/', optionalAuth, getScoresheetRequestsHandler);

// Official uploads file & fulfills request
router.post('/requests/:requestId/fulfill', optionalAuth, upload.any(), fulfillScoresheetRequestHandler);
router.post('/fulfill/:requestId', optionalAuth, upload.any(), fulfillScoresheetRequestHandler);
router.post('/:matchId/fulfill', optionalAuth, upload.any(), fulfillScoresheetRequestHandler);

export default router;

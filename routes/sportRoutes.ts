import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { requireSystemAdmin } from '../middlewares/adminMiddleware';
import {
  getSportsHandler,
  getSportByIdHandler,
  createSportHandler,
  updateSportHandler,
} from '../controllers/sportController';

const router = Router();

// GET /api/v1/sports – Retrieve all registered sports, metric keys, and measurement categories (Accessible by any authenticated user)
router.get('/', authenticate, getSportsHandler);

// GET /api/v1/sports/:sportId – Retrieve single sport configuration by sport_id (Accessible by any authenticated user)
router.get('/:sportId', authenticate, getSportByIdHandler);

// POST /api/v1/sports – Register a new sport configuration with dynamic metric keys (Strict RBAC: System Admin required, Idempotency-Key header required)
router.post('/', requireSystemAdmin, createSportHandler);

// PUT /api/v1/sports/:sportId – Update dynamic stat schemas or measurement parameters (Strict RBAC: System Admin required)
router.put('/:sportId', requireSystemAdmin, updateSportHandler);

export default router;

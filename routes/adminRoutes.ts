import { Router } from 'express';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware';
import { requireSystemAdmin } from '../middlewares/adminMiddleware';
import {
  registerAdminHandler,
  loginAdminHandler,
  getAdminProfileHandler,
  getCoachQueueHandler,
  approveCoachHandler,
  rejectCoachHandler,
} from '../controllers/adminController';

const router = Router();

// POST /api/v1/admin/register – Register a system admin account with institutional email and provision Admin_Profiles
router.post('/register', authRateLimiter, registerAdminHandler);

// POST /api/v1/admin/login – Validate admin credentials and return an elevated Bearer JWT
router.post('/login', authRateLimiter, loginAdminHandler);

// GET /api/v1/admin/me – Retrieve administrative profile & session (Strict RBAC Protected)
router.get('/me', requireSystemAdmin, getAdminProfileHandler);

// GET /api/v1/admin/coach-queue – Retrieve pending coach verification applications and uploaded document links
router.get('/coach-queue', requireSystemAdmin, getCoachQueueHandler);

// POST /api/v1/admin/coaches/:coachId/approve – Validate credentials, mark coach account as active, and grant full platform access
router.post('/coaches/:coachId/approve', requireSystemAdmin, approveCoachHandler);

// POST /api/v1/admin/coaches/:coachId/reject – Decline application, log rejection reasons, and notify applicant
router.post('/coaches/:coachId/reject', requireSystemAdmin, rejectCoachHandler);

export default router;

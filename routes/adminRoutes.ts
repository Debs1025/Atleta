import { Router } from 'express';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware';
import { requireSystemAdmin } from '../middlewares/adminMiddleware';
import {
  registerAdminHandler,
  loginAdminHandler,
  getAdminProfileHandler,
} from '../controllers/adminController';

const router = Router();

// POST /api/v1/admin/register – Register a system admin account with institutional email and provision Admin_Profiles
router.post('/register', authRateLimiter, registerAdminHandler);

// POST /api/v1/admin/login – Validate admin credentials and return an elevated Bearer JWT
router.post('/login', authRateLimiter, loginAdminHandler);

// GET /api/v1/admin/me – Retrieve administrative profile & session (Strict RBAC Protected)
router.get('/me', requireSystemAdmin, getAdminProfileHandler);

export default router;

import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authMiddleware';
import { authRateLimiter } from '../middlewares/rateLimitMiddleware';
import {
  registerUser,
  registerCoach,
  loginUser,
  socialLogin,
  getMe,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from '../controllers/userController';
import {
  registerOfficialHandler,
  loginOfficialHandler
} from '../controllers/officialController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB document upload limit
});

// POST /api/v1/users – Register a new user
router.post('/', upload.single('eligible_documents'), registerUser);

// POST /api/v1/users/register – Alias for register
router.post('/register', upload.single('eligible_documents'), registerUser);

// POST /api/v1/users/coach & /api/v1/users/register-coach – Register a new coach with required certification documents (Rate-limited: 5 req/min)
router.post('/coach', authRateLimiter, upload.single('professional_documents'), registerCoach);
router.post('/register-coach', authRateLimiter, upload.single('professional_documents'), registerCoach);

// POST /api/v1/users/official – Register an official with full legal name and tournament organization details
router.post('/official', authRateLimiter, registerOfficialHandler);

// POST /api/v1/users/official/login – Validate credentials and issue Bearer JWT (Rate-limited: 5 req/min)
router.post('/official/login', authRateLimiter, loginOfficialHandler);

// POST /api/v1/users/login – Login and receive a token (Rate-limited: 5 req/min)
router.post('/login', authRateLimiter, loginUser);

// POST /api/v1/users/google-login, /facebook-login, & /social-login – OAuth login via Firebase ID Token
router.post('/google-login', socialLogin as any);
router.post('/facebook-login', socialLogin as any);
router.post('/social-login', socialLogin as any);

// GET /api/v1/users/me – Get current user's profile (protected)
router.get('/me', authenticate, getMe);

// POST /api/v1/users/password-reset & /forgot-password – Request password reset email
router.post('/password-reset', requestPasswordReset);
router.post('/forgot-password', requestPasswordReset);

// PUT & POST /api/v1/users/password-reset & /password-reset/:token – Confirm password reset
router.put('/password-reset', resetPassword);
router.post('/password-reset', resetPassword);
router.post('/password-reset/:token', resetPassword);
router.put('/password-reset/:token', resetPassword);

// POST /api/v1/users/change-password – Change password (protected)
router.post('/change-password', authenticate, changePassword);

export default router;

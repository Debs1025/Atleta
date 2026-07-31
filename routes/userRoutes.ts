import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middlewares/authMiddleware';
import {
  registerUser,
  loginUser,
  getMe,
  requestPasswordReset,
  resetPassword,
  changePassword,
} from '../controllers/userController';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB document upload limit
});

// POST /api/v1/users – Register a new user
router.post('/', upload.single('eligible_documents'), registerUser);

// POST /api/v1/users/register – Alias for register
router.post('/register', upload.single('eligible_documents'), registerUser);

// POST /api/v1/users/login – Login and receive a token
router.post('/login', loginUser);

// GET /api/v1/users/me – Get current user's profile (protected)
router.get('/me', authenticate, getMe);

// POST /api/v1/users/password-reset – Request password reset email
router.post('/password-reset', requestPasswordReset);

// PUT /api/v1/users/password-reset – Confirm password reset (stub)
router.put('/password-reset', resetPassword);

// POST /api/v1/users/change-password – Change password (protected)
router.post('/change-password', authenticate, changePassword);

export default router;

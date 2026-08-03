import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  validateRegisterUser,
  validateLoginUser,
  validatePasswordResetRequest,
  validatePasswordResetConfirm,
  validateChangePassword,
} from '../validators/userValidator';
import {
  registerUserService,
  loginUserService,
  getUserProfileService,
  requestPasswordResetService,
  resetPasswordConfirmService,
  changePasswordService,
  socialLoginService,
} from '../services/userService';

/**
 * POST /api/v1/users & POST /api/v1/users/register
 * Register a new user and provision their role-specific profile.
 */
export async function registerUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const data = req.body as Record<string, unknown>;
    const file = (req as any).file as Express.Multer.File | undefined;

    // Validate input
    const errors = validateRegisterUser(data, !!file);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const result = await registerUserService(data, file);

    res.status(201).json({
      message: 'User registered successfully.',
      ...result,
    });
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({ error: 'A user with this email already exists.' });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/users/login
 * Validate credentials and return a Bearer token.
 */
export async function loginUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validateLoginUser(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const { email, password } = req.body;
    const result = await loginUserService(email, password);

    res.status(200).json({
      message: 'Login successful.',
      ...result,
    });
  } catch (error: any) {
    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found'
    ) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (error.code === 'USER_NOT_FOUND') {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/users/social-login & /google-login & /facebook-login
 * Authenticate via Google or Facebook Firebase ID Token.
 */
export async function socialLogin(req: Request, res: Response): Promise<void> {
  try {
    const body = (req.body || {}) as Record<string, any>;
    const idToken = body.id_token || body.token;
    const provider = body.provider;
    const role = body.role;

    if (!idToken) {
      res.status(400).json({ error: 'id_token (Firebase ID token from Google/Facebook) is required.' });
      return;
    }

    const providerType = provider === 'facebook' ? 'facebook' : 'google';
    const result = await socialLoginService(idToken, providerType, role || 'Athlete');

    res.status(200).json({
      message: `${providerType.toUpperCase()} login successful.`,
      ...result,
    });
  } catch (error: any) {
    console.error('socialLogin error:', error);
    res.status(401).json({
      error: error?.message || 'Social authentication failed.',
      code: error?.code,
    });
  }
}

/**
 * GET /api/v1/users/me
 * Retrieve profile of current authenticated user.
 */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const uid = req.user!.uid;
    const result = await getUserProfileService(uid);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.code === 'USER_NOT_FOUND') {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/users/password-reset
 * Send a secure recovery link via Nodemailer to a registered email.
 */
export async function requestPasswordReset(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validatePasswordResetRequest(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const { email } = req.body;
    const result = await requestPasswordResetService(email);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
      return;
    }
    console.error('RequestPasswordReset error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * PUT /api/v1/users/password-reset & POST /api/v1/users/password-reset/:token
 * Confirm password reset using the token from the email link.
 */
export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const token = (req.body.token || req.params.token || req.query.token) as string;
    const new_password = (req.body.new_password || req.body.password) as string;

    const errors = validatePasswordResetConfirm({ token, new_password });
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const result = await resetPasswordConfirmService(token, new_password);

    res.status(200).json(result);
  } catch (error: any) {
    if (error.code === 'INVALID_TOKEN') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('ResetPassword error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/users/change-password
 * Set a new password for authenticated user.
 */
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validateChangePassword(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const { password } = req.body;
    await changePasswordService(uid, password);

    res.status(200).json({
      message: 'Password updated successfully.',
    });
  } catch (error: any) {
    console.error('ChangePassword error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

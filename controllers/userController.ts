import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../utils/firebaseAdmin';
import { clientAuth } from '../utils/firebaseClient';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ROLE_COLLECTION_MAP, UserRole } from '../models/userModel';
import {
  validateRegisterUser,
  validateLoginUser,
  validatePasswordResetRequest,
  validatePasswordResetConfirm,
  validateChangePassword,
} from '../validators/userValidator';

/**
 * Maps lowercase or mixed case role string to canonical UserRole enum value.
 */
function normalizeRole(roleInput: string): UserRole {
  const lower = roleInput.toLowerCase();
  if (lower === 'athlete') return 'Athlete';
  if (lower === 'coach') return 'Coach';
  if (lower === 'official') return 'Official';
  if (lower === 'system admin' || lower === 'admin') return 'System Admin';
  return roleInput as UserRole;
}

/**
 * Generate a custom JWT token for a user.
 */
function generateToken(uid: string, email: string, role: string): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ uid, email, role }, secret, { expiresIn });
}

/**
 * POST /api/v1/users & POST /api/v1/users/register
 * Register a new user and provision their role-specific profile.
 * Supports both JSON and multipart form data.
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

    const first_name = (data.first_name as string).trim();
    const last_name = (data.last_name as string).trim();
    const email = (data.email as string).trim();
    const password = data.password as string;
    const contact_number = typeof data.contact_number === 'string' && data.contact_number.trim()
      ? data.contact_number.trim()
      : null;
    const rawRole = data.role as string;
    const firestoreRole = normalizeRole(rawRole);

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${first_name} ${last_name}`,
    });

    const uid = userRecord.uid;
    const now = new Date();

    // Prepare base user document
    const userData = {
      user_id: uid,
      first_name,
      last_name,
      email,
      contact_number,
      role: firestoreRole,
      created_at: now,
      updated_at: now,
    };

    // Prepare role-specific profile document
    let profileData: Record<string, unknown> = {
      user_id: uid,
      created_at: now,
      updated_at: now,
    };

    if (firestoreRole === 'Athlete') {
      if (data.birthdate) profileData.birthdate = String(data.birthdate).trim();
      if (data.gender) profileData.gender = data.gender;
      if (data.province) profileData.province = String(data.province).trim();
      if (data.sport_type) profileData.sport_type = data.sport_type;
    } else if (firestoreRole === 'Coach') {
      if (data.certification_license_num) profileData.certification_license_num = String(data.certification_license_num).trim();
      if (data.years_of_experience !== undefined && data.years_of_experience !== null && data.years_of_experience !== '') {
        profileData.years_of_experience = Number(data.years_of_experience);
      }
      if (data.current_institution) profileData.current_institution = String(data.current_institution).trim();
      if (file) {
        profileData.eligible_document = {
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        };
      }
    }

    // Atomic batch write: Users collection + role-specific profile collection
    const batch = db.batch();
    const userRef = db.collection('Users').doc(uid);
    const profileCollection = ROLE_COLLECTION_MAP[firestoreRole];
    const profileRef = db.collection(profileCollection).doc(uid);

    batch.set(userRef, userData);
    batch.set(profileRef, profileData);
    await batch.commit();

    // Generate custom JWT
    const token = generateToken(uid, email, rawRole);

    res.status(201).json({
      message: 'User registered successfully.',
      user: {
        user_id: uid,
        first_name,
        last_name,
        email,
        contact_number,
        role: rawRole,
      },
      token,
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

    // Authenticate via Firebase Client SDK
    const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
    const uid = userCredential.user.uid;

    // Fetch user data from Firestore
    const userDoc = await db.collection('Users').doc(uid).get();
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const userData = userDoc.data()!;

    // Generate custom JWT
    const token = generateToken(uid, userData.email, userData.role);

    res.status(200).json({
      message: 'Login successful.',
      user: {
        user_id: uid,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        role: userData.role,
      },
      token,
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * GET /api/v1/users/me
 * Retrieve the profile, role, and permissions of the currently authenticated user.
 */
export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const uid = req.user!.uid;

    // Fetch user from Firestore
    const userDoc = await db.collection('Users').doc(uid).get();
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const userData = userDoc.data()!;
    const role = userData.role as UserRole;

    // Fetch role-specific profile
    const profileCollection = ROLE_COLLECTION_MAP[role];
    const profileDoc = await db.collection(profileCollection).doc(uid).get();
    const profileData = profileDoc.exists ? profileDoc.data() : null;

    res.status(200).json({
      user: {
        user_id: uid,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email,
        contact_number: userData.contact_number,
        role: userData.role,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
      },
      profile: profileData,
    });
  } catch (error: any) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/users/password-reset
 * Send a secure recovery link to a registered email.
 */
export async function requestPasswordReset(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validatePasswordResetRequest(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const { email } = req.body;

    await sendPasswordResetEmail(clientAuth, email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    // Return success even on error to prevent email enumeration
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }
}

/**
 * PUT /api/v1/users/password-reset
 * Set a new password using a valid recovery token (stub).
 */
export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validatePasswordResetConfirm(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    res.status(501).json({
      message: 'Password reset confirmation is handled via the Firebase email link. This endpoint is a stub for future implementation.',
    });
  } catch (error: any) {
    console.error('ResetPassword error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

/**
 * POST /api/v1/users/change-password
 * Set a new password for the authenticated user.
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
    await auth.updateUser(uid, { password });

    res.status(200).json({
      message: 'Password updated successfully.',
    });
  } catch (error: any) {
    console.error('ChangePassword error:', error);
    res.status(500).json({ error: 'Internal server error.', details: error?.message || String(error) });
  }
}

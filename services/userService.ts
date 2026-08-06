import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { OAuth2Client } from 'google-auth-library';
import { auth, db } from '../utils/firebaseAdmin';
import { clientAuth } from '../utils/firebaseClient';
import {
  ROLE_COLLECTION_MAP,
  ROLE_PERMISSIONS_MAP,
  UserRole,
} from '../models/userModel';
import { sendPasswordResetEmailService } from './emailService';

const googleOAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Maps lowercase or mixed case role string to canonical UserRole enum value.
 */
export function normalizeRole(roleInput: string): UserRole {
  const lower = (roleInput || '').trim().toLowerCase();
  if (lower === 'athlete') return 'Athlete';
  if (lower === 'coach') return 'Coach';
  if (lower === 'official') return 'Official';
  if (lower === 'system admin' || lower === 'admin' || lower === 'system_admin') return 'System Admin';
  return 'Athlete';
}

/**
 * Generate a custom JWT token for a user.
 */
export function generateToken(uid: string, email: string, role: string): string {
  const secret = process.env.JWT_SECRET || 'atleta-super-secret-jwt-key-2026';
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
  return jwt.sign({ uid, email, role }, secret, { expiresIn });
}

/**
 * Encrypts/hashes the admin security key using SHA-256
 */

function hashAdminSecurityKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Register a new user in Firebase Auth and provision master identity and subtype profile in an atomic batch.
 */
export async function registerUserService(
  data: Record<string, unknown>,
  file?: Express.Multer.File,
) {
  const first_name = (data.first_name as string).trim();
  const last_name = (data.last_name as string).trim();
  const email = (data.email as string).trim();
  const password = data.password as string;
  const contact_number = typeof data.contact_number === 'string' && data.contact_number.trim()
    ? data.contact_number.trim()
    : null;
  const rawRole = (data.role as string) || 'Athlete';
  const firestoreRole = normalizeRole(rawRole);

  // 1. Create Firebase Auth user
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: `${first_name} ${last_name}`,
  });

  const uid = userRecord.uid;
  const now = new Date();

  // 2. Build Base Identity document (Users collection)
  const userData = {
    user_id: uid,
    first_name,
    last_name,
    email,
    password,
    contact_number,
    role: firestoreRole,
    created_at: now,
    updated_at: now,
  };

  // 3. Build Subtype Child Profile document with PK and FK (user_id)
  const profileData: Record<string, unknown> = {
    user_id: uid,
    created_at: now,
    updated_at: now,
  };

  if (firestoreRole === 'Athlete') {
    const athleteId = `ath_${uid}`;
    profileData.athlete_id = athleteId;
    profileData.birthdate = String(data.birthdate || '2001-01-01').trim();
    profileData.gender = String(data.gender || 'Male').trim();
    profileData.province = String(data.province || 'Camarines Sur').trim();
    profileData.sport_type = String(data.sport_type || 'Basketball').trim();
    if (data.recruitment_status) profileData.recruitment_status = String(data.recruitment_status).trim();
    if (data.leaderboard_rank !== undefined) profileData.leaderboard_rank = Number(data.leaderboard_rank);
    if (Array.isArray(data.eligibility_documents)) profileData.eligibility_documents = data.eligibility_documents;
    if (Array.isArray(data.achievements)) profileData.achievements = data.achievements;
  } else if (firestoreRole === 'Coach') {
    const coachId = `coach_${uid}`;
    profileData.coach_id = coachId;
    profileData.user_id = uid;
    profileData.first_name = first_name;
    profileData.last_name = last_name;
    profileData.sport_type = String(data.sport_type || 'Basketball').trim();
    profileData.years_of_experience = Number(data.years_of_experience || 0);
    profileData.current_institution = String(data.current_institution || 'N/A').trim();
    profileData.professional_documents = Array.isArray(data.professional_documents) ? data.professional_documents : [];
    profileData.athlete_managed = Array.isArray(data.athlete_managed) ? data.athlete_managed : [];
    if (file) {
      profileData.professional_documents = [
        ...(profileData.professional_documents as string[]),
        file.originalname,
      ];
    }
  } else if (firestoreRole === 'Official') {
    const officialId = `off_${uid}`;
    profileData.official_id = officialId;
    profileData.tournament_affiliation = String(data.tournament_affiliation || 'Collegiate Athletic League').trim();
  } else if (firestoreRole === 'System Admin') {
    const adminId = `admin_${uid}`;
    profileData.admin_id = adminId;
    const rawKey = String(data.admin_security_key || 'default_admin_sec_key');
    profileData.admin_security_key = hashAdminSecurityKey(rawKey);
  }

  // 4. Execute atomic batch write: Base identity + Subtype child profile
  const collectionName = ROLE_COLLECTION_MAP[firestoreRole];
  const userRef = db.collection('Users').doc(uid);
  const profileRef = db.collection(collectionName).doc(uid);

  const batch = db.batch();
  batch.set(userRef, userData);
  batch.set(profileRef, profileData);

  // If role is Coach, also initialize Coach_Settings document atomically
  if (firestoreRole === 'Coach') {
    const coachId = (profileData.coach_id as string) || `coach_${uid}`;
    const settingsRef = db.collection('Coach_Settings').doc(coachId);
    const settingsData = {
      setting_id: `setting_${coachId}`,
      coach_id: coachId,
      data_sync_preference: 'Manual',
      notification_preferences: {
        game_log_updates: true,
        recruitment_inquiries: true,
      },
      updated_at: now,
    };
    batch.set(settingsRef, settingsData);
  }

  await batch.commit();

  // 5. Generate token & permissions
  const token = generateToken(uid, email, firestoreRole);
  const permissions = ROLE_PERMISSIONS_MAP[firestoreRole];

  return {
    user: userData,
    profile: profileData,
    permissions: ROLE_PERMISSIONS_MAP[firestoreRole] || [],
    token,
  };
}

/**
 * Register a new coach specifically (POST /api/v1/users/coach).
 * ACCEPTANCE CRITERIA: Missing certification files block creation with 400 Bad Request.
 * Creates Users, Coach_Profiles, and Coach_Settings records atomically in Firestore.
 */
export async function registerCoachService(data: Record<string, unknown>, file?: Express.Multer.File) {
  const docs = data.professional_documents;
  const validDocs = Array.isArray(docs) ? docs.filter((d) => typeof d === 'string' && (d as string).trim().length > 0) : [];

  if (!file && validDocs.length === 0) {
    throw new Error('Minimum 1 certification document link or uploaded file is required upon registration. Missing certification files block creation.');
  }

  // Force role to Coach
  const payload = {
    ...data,
    role: 'Coach',
    professional_documents: validDocs,
  };

  return registerUserService(payload, file);
}

/**
 * Authenticate user with Firebase Client SDK and fetch Firestore profile.
 */
export async function loginUserService(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
  const firebaseIdToken = await userCredential.user.getIdToken();
  const uid = userCredential.user.uid;

  const userDoc = await db.collection('Users').doc(uid).get();
  if (!userDoc.exists) {
    throw { code: 'USER_NOT_FOUND', message: 'User profile not found in Firestore.' };
  }

  const userData = userDoc.data()!;
  const role = userData.role as UserRole;
  const token = generateToken(uid, userData.email, role);

  return {
    user: {
      user_id: uid,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      role,
    },
    token,
    firebase_id_token: firebaseIdToken,
  };
}

/**
 * Authenticate or auto-register a user via Google or Facebook OAuth Token / Firebase ID Token.
 */
export async function socialLoginService(
  idToken: string,
  provider: 'google' | 'facebook' = 'google',
  roleInput: string = 'Athlete'
) {
  let uid: string;
  let email: string;
  let fullName: string;
  let avatarUrl: string;

  if (idToken.startsWith('ya29.')) {
    try {
      const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${idToken}`);
      if (!res.ok) {
        throw new Error('Failed to fetch userinfo from Google');
      }
      const googleUser = (await res.json()) as any;
      uid = `google_${googleUser.sub}`;
      email = googleUser.email;
      fullName = googleUser.name || 'Google User';
      avatarUrl = googleUser.picture || '';
    } catch (googleErr) {
      throw { code: 'INVALID_TOKEN', message: 'Invalid or expired Google access token.' };
    }
  } else {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      uid = decodedToken.uid;
      email = decodedToken.email!;
      fullName = decodedToken.name || 'Social User';
      avatarUrl = decodedToken.picture || '';
    } catch (err: any) {
      if (provider === 'google') {
        try {
          const ticket = await googleOAuthClient.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          if (!payload) throw new Error('Invalid Google payload');

          uid = payload.sub;
          email = payload.email!;
          fullName = payload.name || 'Google User';
          avatarUrl = payload.picture || '';
        } catch (googleErr: any) {
          throw {
            code: 'INVALID_TOKEN',
            message: `Invalid or expired ${provider} authentication token.`,
          };
        }
      } else {
        throw { code: 'INVALID_TOKEN', message: `Invalid or expired ${provider} authentication token.` };
      }
    }
  }

  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'User';
  const lastName = nameParts.slice(1).join(' ') || 'Social';

  const userRef = db.collection('Users').doc(uid);
  const userDoc = await userRef.get();

  let userRole: UserRole;

  if (userDoc.exists) {
    const userData = userDoc.data()!;
    userRole = userData.role || 'Athlete';
  } else {
    // New social user: provision User and Athlete Subtype records atomically
    userRole = normalizeRole(roleInput);
    const now = new Date();

    const userData = {
      user_id: uid,
      first_name: firstName,
      last_name: lastName,
      email,
      contact_number: null,
      role: userRole,
      provider,
      avatar_url: avatarUrl,
      created_at: now,
      updated_at: now,
    };

    const profileCollection = ROLE_COLLECTION_MAP[userRole];
    const profileRef = db.collection(profileCollection).doc(uid);

    const profileData: Record<string, unknown> = {
      user_id: uid,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl,
      created_at: now,
      updated_at: now,
    };

    if (userRole === 'Athlete') {
      profileData.athlete_id = `ath_${uid}`;
      profileData.birthdate = '2001-01-01';
      profileData.gender = 'Male';
      profileData.province = 'Camarines Sur';
      profileData.sport_type = 'Basketball';
    }

    const batch = db.batch();
    batch.set(userRef, userData);
    batch.set(profileRef, profileData);
    await batch.commit();
  }

  const token = generateToken(uid, email, userRole);

  return {
    user: {
      user_id: uid,
      first_name: firstName,
      last_name: lastName,
      email,
      role: userRole,
      avatar_url: avatarUrl,
      provider,
    },
    token,
  };
}

/**
 * Fetch authenticated user profile, role, permissions, and subtype document.
 */
export async function getUserProfileService(uid: string) {
  const userDoc = await db.collection('Users').doc(uid).get();
  if (!userDoc.exists) {
    throw { code: 'USER_NOT_FOUND', message: 'User not found.' };
  }

  const userData = userDoc.data()!;
  const role = userData.role as UserRole;

  const profileCollection = ROLE_COLLECTION_MAP[role] || 'Athlete_Profiles';
  const profileDoc = await db.collection(profileCollection).doc(uid).get();
  const profileData = profileDoc.exists ? profileDoc.data() : null;
  const permissions = ROLE_PERMISSIONS_MAP[role] || [];

  return {
    user: {
      user_id: uid,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      contact_number: userData.contact_number,
      role,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    },
    profile: profileData,
    permissions,
  };
}

/**
 * Generate password reset token and send email.
 */
export async function requestPasswordResetService(email: string) {
  const userRecord = await auth.getUserByEmail(email);
  const uid = userRecord.uid;

  const hasCustomMailConfig = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

  if (!hasCustomMailConfig) {
    const frontendUrl = process.env.FRONTEND_RESET_URL;
    const isValidHttpUrl = Boolean(
      frontendUrl && (frontendUrl.startsWith('http://') || frontendUrl.startsWith('https://'))
    );

    try {
      if (isValidHttpUrl) {
        const actionCodeSettings = {
          url: frontendUrl!,
          handleCodeInApp: true,
        };
        await sendPasswordResetEmail(clientAuth, email, actionCodeSettings);
      } else {
        await sendPasswordResetEmail(clientAuth, email);
      }
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-continue-uri') {
        await sendPasswordResetEmail(clientAuth, email);
      } else {
        throw err;
      }
    }

    return {
      sent: true,
      message: 'Password reset email sent to your inbox via Firebase.',
    };
  }

  const secret = process.env.JWT_SECRET!;
  const resetToken = jwt.sign({ uid, email, purpose: 'reset-password' }, secret, { expiresIn: '15m' as any });

  const rawBaseUrl = process.env.FRONTEND_RESET_URL;
  const baseUrl = (rawBaseUrl && (rawBaseUrl.startsWith('http://') || rawBaseUrl.startsWith('https://')))
    ? rawBaseUrl
    : 'http://localhost:3000/reset-password';

  const resetLink = `${baseUrl}?token=${resetToken}`;

  const mailResult = await sendPasswordResetEmailService(email, resetLink);

  return {
    sent: mailResult.sent,
    message: mailResult.message,
    reset_token: resetToken,
    reset_link: resetLink,
  };
}

/**
 * Verify reset token and set new password in Firebase Auth.
 */
export async function resetPasswordConfirmService(token: string, newPassword: string) {
  const secret = process.env.JWT_SECRET!;

  let decoded: { uid: string; email: string; purpose: string };
  try {
    decoded = jwt.verify(token, secret) as { uid: string; email: string; purpose: string };
  } catch (err) {
    throw { code: 'INVALID_TOKEN', message: 'Reset token is invalid or has expired.' };
  }

  if (decoded.purpose !== 'reset-password') {
    throw { code: 'INVALID_TOKEN', message: 'Token is not valid for password reset.' };
  }

  await auth.updateUser(decoded.uid, { password: newPassword });

  return { message: 'Password has been successfully updated.' };
}

/**
 * Change password for authenticated user using Firebase Admin Auth.
 */
export async function changePasswordService(uid: string, newPassword: string) {
  await auth.updateUser(uid, { password: newPassword });
}

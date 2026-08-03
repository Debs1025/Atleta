import jwt from 'jsonwebtoken';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../utils/firebaseAdmin';
import { clientAuth } from '../utils/firebaseClient';
import { ROLE_COLLECTION_MAP, UserRole } from '../models/userModel';

/**
 * Maps lowercase or mixed case role string to canonical UserRole enum value.
 */
export function normalizeRole(roleInput: string): UserRole {
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
export function generateToken(uid: string, email: string, role: string): string {
  const secret = process.env.JWT_SECRET!;
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any;
  return jwt.sign({ uid, email, role }, secret, { expiresIn });
}

/**
 * Register a new user in Firebase Auth and provision Firestore profile records.
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
  const rawRole = data.role as string;
  const firestoreRole = normalizeRole(rawRole);

  // 1. Create Firebase Auth user
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: `${first_name} ${last_name}`,
  });

  const uid = userRecord.uid;
  const now = new Date();

  // 2. Build base user document
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

  // 3. Build role-specific profile document
  const profileData: Record<string, unknown> = {
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
    if (data.certification_license_num) {
      profileData.certification_license_num = String(data.certification_license_num).trim();
    }
    if (
      data.years_of_experience !== undefined &&
      data.years_of_experience !== null &&
      data.years_of_experience !== ''
    ) {
      profileData.years_of_experience = Number(data.years_of_experience);
    }
    if (data.current_institution) {
      profileData.current_institution = String(data.current_institution).trim();
    }
    if (file) {
      profileData.eligible_document = {
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    }
  }

  // 4. Batch write to Firestore
  const batch = db.batch();
  const userRef = db.collection('Users').doc(uid);
  const profileCollection = ROLE_COLLECTION_MAP[firestoreRole];
  const profileRef = db.collection(profileCollection).doc(uid);

  batch.set(userRef, userData);
  batch.set(profileRef, profileData);
  await batch.commit();

  // 5. Generate JWT token
  const token = generateToken(uid, email, rawRole);

  return {
    user: {
      user_id: uid,
      first_name,
      last_name,
      email,
      contact_number,
      role: rawRole,
    },
    token,
  };
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
  const token = generateToken(uid, userData.email, userData.role);

  return {
    user: {
      user_id: uid,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      role: userData.role,
    },
    token,
    firebase_id_token: firebaseIdToken,
  };
}

/**
 * Authenticate or auto-register a user via Google or Facebook Firebase ID Token.
 */
export async function socialLoginService(
  idToken: string,
  provider: 'google' | 'facebook' = 'google',
  roleInput: string = 'Athlete'
) {
  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (err: any) {
    throw { code: 'INVALID_TOKEN', message: `Invalid or expired ${provider} authentication token.` };
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email!;
  const fullName = decodedToken.name || 'Social User';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'User';
  const lastName = nameParts.slice(1).join(' ') || 'Social';
  const avatarUrl = decodedToken.picture || '';

  const userRef = db.collection('Users').doc(uid);
  const userDoc = await userRef.get();

  let userRole: string;

  if (userDoc.exists) {
    const userData = userDoc.data()!;
    userRole = userData.role || 'Athlete';
  } else {
    // New social user: provision User and Profile records
    const firestoreRole = normalizeRole(roleInput);
    userRole = firestoreRole;
    const now = new Date();

    const userData = {
      user_id: uid,
      first_name: firstName,
      last_name: lastName,
      email,
      contact_number: null,
      role: firestoreRole,
      provider,
      avatar_url: avatarUrl,
      created_at: now,
      updated_at: now,
    };

    const profileCollection = ROLE_COLLECTION_MAP[firestoreRole];
    const profileRef = db.collection(profileCollection).doc(uid);

    const profileData = {
      user_id: uid,
      first_name: firstName,
      last_name: lastName,
      avatar_url: avatarUrl,
      created_at: now,
      updated_at: now,
    };

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
 * Fetch authenticated user profile & subtype document.
 */
export async function getUserProfileService(uid: string) {
  const userDoc = await db.collection('Users').doc(uid).get();
  if (!userDoc.exists) {
    throw { code: 'USER_NOT_FOUND', message: 'User not found.' };
  }

  const userData = userDoc.data()!;
  const role = userData.role as UserRole;

  const profileCollection = ROLE_COLLECTION_MAP[role];
  const profileDoc = await db.collection(profileCollection).doc(uid).get();
  const profileData = profileDoc.exists ? profileDoc.data() : null;

  return {
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
  };
}

import { sendPasswordResetEmailService } from './emailService';

/**
 * Generate password reset token and send email.
 * Uses Firebase Auth's built-in email service by default (no .env credentials required),
 * or custom Nodemailer if EMAIL_USER & EMAIL_PASS are configured.
 */
export async function requestPasswordResetService(email: string) {
  // 1. Verify user exists in Firebase Auth
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
        // Send real email directly to recipient's inbox using Firebase Auth service
        await sendPasswordResetEmail(clientAuth, email, actionCodeSettings);
      } else {
        await sendPasswordResetEmail(clientAuth, email);
      }
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-continue-uri') {
        // Fallback: If the continue URI host is not authorized in Firebase Console or is invalid,
        // send standard Firebase reset email without actionCodeSettings.
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

  // 2. Custom Nodemailer route: Generate 15-minute reset JWT token & link
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

  // Update password in Firebase Auth
  await auth.updateUser(decoded.uid, { password: newPassword });

  return { message: 'Password has been successfully updated.' };
}

/**
 * Change password for authenticated user using Firebase Admin Auth.
 */
export async function changePasswordService(uid: string, newPassword: string) {
  await auth.updateUser(uid, { password: newPassword });
}

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
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
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

/**
 * Send password reset email via Firebase.
 */
export async function requestPasswordResetService(email: string) {
  await sendPasswordResetEmail(clientAuth, email);
}

/**
 * Change password for authenticated user using Firebase Admin Auth.
 */
export async function changePasswordService(uid: string, newPassword: string) {
  await auth.updateUser(uid, { password: newPassword });
}

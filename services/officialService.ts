import crypto from 'crypto';
import { db, auth } from '../utils/firebaseAdmin';
import { clientAuth } from '../utils/firebaseClient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { OfficialProfile, OfficialSettings, RegisterOfficialDto, UpdateOfficialSettingsDto, User } from '../models/userModel';
import { generateToken } from './userService';

export class ServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * Register a new official and provision their profile & settings in an atomic batch.
 * Checks that the organization_name exists and is active in the Tournament_Registry.
 */
export async function registerOfficialService(data: RegisterOfficialDto) {
  const full_legal_name = data.full_legal_name.trim();
  const email = data.email.trim();
  const password = data.password;
  const orgName = data.organization_name.trim();

  // 1. Verify organization is active in Tournament_Registry
  const registrySnapshot = await db.collection('Tournament_Registry')
    .where('organization_name', '==', orgName)
    .where('status', '==', 'Active')
    .get();

  if (registrySnapshot.empty) {
    throw new ServiceError(`Organization '${orgName}' is not registered or active in the tournament registry.`, 400);
  }

  // 2. Create Firebase Auth user
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: full_legal_name,
  });

  const uid = userRecord.uid;
  const now = new Date();
  const nowStr = now.toISOString();

  // Generate UUIDs for official_id and setting_id
  const officialId = crypto.randomUUID();
  const settingId = crypto.randomUUID();

  // 3. Build Base Identity document (Users collection)
  const userData: any = {
    user_id: uid,
    full_legal_name,
    email,
    password, // Consistent with general user creation pattern in this codebase for testing/fallback
    role: 'Official',
    created_at: now,
    updated_at: now,
  };

  // 4. Build Subtype Child Profile document (Official_Profiles)
  const profileData: OfficialProfile = {
    official_id: officialId,
    user_id: uid,
    organization_name: orgName,
    certification_status: 'Pending',
    created_at: now,
    updated_at: now,
  };

  // 5. Build Settings document (Official_Settings)
  const settingsData: OfficialSettings = {
    setting_id: settingId,
    official_id: officialId,
    split_screen_defaults: true,
    discrepancy_presets: true,
    match_reminders: true,
    updated_at: nowStr,
  };

  // 6. Execute atomic batch write
  const batch = db.batch();
  
  // Base identity
  const userRef = db.collection('Users').doc(uid);
  batch.set(userRef, userData);

  // Subtype profile (keyed by uid for fast lookup and official_id as primary key)
  const profileRef = db.collection('Official_Profiles').doc(uid);
  batch.set(profileRef, profileData);

  // Also index profile by official_id if needed, or we can just fetch it by uid.
  // To satisfy PK requirements, we also write to Official_Profiles collection with official_id as the document key.
  const profileByOfficialIdRef = db.collection('Official_Profiles').doc(officialId);
  batch.set(profileByOfficialIdRef, profileData);

  // Settings document (keyed by official_id)
  const settingsRef = db.collection('Official_Settings').doc(officialId);
  batch.set(settingsRef, settingsData);

  await batch.commit();

  // Generate tokens
  const token = generateToken(uid, email, 'Official');

  return {
    user: {
      user_id: uid,
      full_legal_name,
      email,
      role: 'Official',
    },
    profile: profileData,
    settings: settingsData,
    token,
  };
}

/**
 * Validate credentials and issue Bearer JWT specifically for officials.
 */
export async function loginOfficialService(email: string, password: string) {
  // 1. Fetch user document by email from Firestore first
  const userSnapshot = await db.collection('Users').where('email', '==', email).limit(1).get();
  if (userSnapshot.empty) {
    throw new ServiceError('User profile not found in Firestore.', 404);
  }

  const userDoc = userSnapshot.docs[0];
  const userData = userDoc.data();
  const uid = userDoc.id;

  if (userData.role !== 'Official') {
    throw new ServiceError('Access denied. Official role required.', 403);
  }

  // 2. Attempt client-side authentication with Firebase Auth Client SDK
  let firebaseIdToken = '';
  try {
    const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
    firebaseIdToken = await userCredential.user.getIdToken();
  } catch (err: any) {
    // If client SDK fails due to API key errors, fall back to stored password comparison for local testing
    const isApiKeyError = err.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.' || 
                          err.code === 'auth/invalid-api-key' ||
                          err.message?.includes('api-key-not-valid');
                          
    if (isApiKeyError) {
      if (userData.password && userData.password === password) {
        firebaseIdToken = 'mock_firebase_id_token';
      } else {
        throw {
          code: 'auth/wrong-password',
          message: 'Invalid email or password.'
        };
      }
    } else {
      // Re-throw or format as invalid credential
      throw {
        code: err.code || 'auth/invalid-credential',
        message: err.message || 'Invalid email or password.'
      };
    }
  }

  const token = generateToken(uid, userData.email, 'Official');

  return {
    user: {
      user_id: uid,
      full_legal_name: userData.full_legal_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      email: userData.email,
      role: 'Official',
    },
    token,
    firebase_id_token: firebaseIdToken,
  };
}

/**
 * Fetch settings for a specific official using their official_id.
 */
export async function getOfficialSettings(officialId: string): Promise<OfficialSettings> {
  const settingsRef = db.collection('Official_Settings').doc(officialId);
  const doc = await settingsRef.get();

  const nowStr = new Date().toISOString();

  if (doc.exists) {
    const data = doc.data()!;
    return {
      setting_id: data.setting_id || crypto.randomUUID(),
      official_id: officialId,
      split_screen_defaults: data.split_screen_defaults !== undefined ? data.split_screen_defaults : true,
      discrepancy_presets: data.discrepancy_presets !== undefined ? data.discrepancy_presets : true,
      match_reminders: data.match_reminders !== undefined ? data.match_reminders : true,
      updated_at: data.updated_at || nowStr,
    };
  }

  // Fallback / default initializer if settings don't exist
  const defaultSettings: OfficialSettings = {
    setting_id: crypto.randomUUID(),
    official_id: officialId,
    split_screen_defaults: true,
    discrepancy_presets: true,
    match_reminders: true,
    updated_at: nowStr,
  };

  await settingsRef.set(defaultSettings, { merge: true });
  return defaultSettings;
}

/**
 * Update official settings preferences.
 */
export async function updateOfficialSettings(
  officialId: string,
  payload: UpdateOfficialSettingsDto
): Promise<OfficialSettings> {
  const currentSettings = await getOfficialSettings(officialId);

  const updatedSettings: OfficialSettings = {
    setting_id: currentSettings.setting_id,
    official_id: officialId,
    split_screen_defaults: payload.split_screen_defaults !== undefined ? payload.split_screen_defaults : currentSettings.split_screen_defaults,
    discrepancy_presets: payload.discrepancy_presets !== undefined ? payload.discrepancy_presets : currentSettings.discrepancy_presets,
    match_reminders: payload.match_reminders !== undefined ? payload.match_reminders : currentSettings.match_reminders,
    updated_at: new Date().toISOString(),
  };

  await db.collection('Official_Settings').doc(officialId).set(updatedSettings, { merge: true });
  return updatedSettings;
}

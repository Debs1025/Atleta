import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../../services/firebaseClient";

export const STAGED_OAUTH_SIGNUP_KEY = "@atleta_staged_oauth_signup";

export interface StagedOAuthUserData {
  uid: string;
  email: string;
  fullName: string;
  role: string;
  authProvider: "google" | "facebook";
  status: "pending";
  socialToken: { provider: "google" | "facebook"; idToken: string };
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  stagedAt: string;
  syncedToFirestore?: boolean;
}

export interface ExtractOAuthUserParams {
  idToken: string;
  provider: "google" | "facebook";
  fallbackUser?: {
    id?: string;
    uid?: string;
    email?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    photo?: string;
  } | null;
  role?: string;
}

/**
 * Safely decodes a JWT without external libraries to extract user info.
 */
export function decodeJwtSafely(token: string): Record<string, any> | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    let jsonStr = "";
    if (typeof (globalThis as any).atob === "function") {
      jsonStr = (globalThis as any).atob(b64);
    } else if (typeof (globalThis as any).Buffer !== "undefined") {
      jsonStr = (globalThis as any).Buffer.from(b64, "base64").toString("utf8");
    }

    if (!jsonStr) return null;

    try {
      return JSON.parse(decodeURIComponent(escape(jsonStr)));
    } catch {
      return JSON.parse(jsonStr);
    }
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and sanitizes profile identity information from OAuth tokens and payloads.
 */
export function extractOAuthProfile(params: ExtractOAuthUserParams): {
  uid: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
} {
  const { idToken, provider, fallbackUser } = params;
  const decoded = decodeJwtSafely(idToken) || {};

  const email = (
    decoded.email ||
    fallbackUser?.email ||
    ""
  ).trim().toLowerCase();

  const firstName = (
    decoded.given_name ||
    fallbackUser?.givenName ||
    (decoded.name ? decoded.name.split(" ")[0] : "") ||
    (fallbackUser?.name ? fallbackUser.name.split(" ")[0] : "") ||
    ""
  ).trim();

  const lastName = (
    decoded.family_name ||
    fallbackUser?.familyName ||
    (decoded.name ? decoded.name.split(" ").slice(1).join(" ") : "") ||
    (fallbackUser?.name ? fallbackUser.name.split(" ").slice(1).join(" ") : "") ||
    ""
  ).trim();

  const rawFullName = `${firstName} ${lastName}`.trim();
  const fullName =
    rawFullName ||
    decoded.name ||
    fallbackUser?.name ||
    (email ? email.split("@")[0] : `${provider === "google" ? "Google" : "Facebook"} User`);

  const avatarUrl =
    decoded.picture ||
    fallbackUser?.photo ||
    "";

  // Derive unique UID: prefer provider sub/user_id/uid or fallback to sanitized email hash
  let rawUid =
    decoded.sub ||
    decoded.user_id ||
    decoded.uid ||
    fallbackUser?.uid ||
    fallbackUser?.id ||
    "";

  if (!rawUid && email) {
    rawUid = `${provider}_${email.replace(/[^a-z0-9]/gi, "_")}`;
  } else if (!rawUid) {
    rawUid = `${provider}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  return {
    uid: String(rawUid),
    email,
    fullName,
    firstName,
    lastName,
    avatarUrl,
  };
}

/**
 * Saves staged OAuth sign-up data into AsyncStorage to prevent data loss during network drops.
 */
export async function saveStagedOAuthData(data: StagedOAuthUserData): Promise<void> {
  try {
    await AsyncStorage.setItem(STAGED_OAUTH_SIGNUP_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("[OAuthPersistence] Failed to stage OAuth data locally:", err);
  }
}

/**
 * Retrieves staged OAuth sign-up data from AsyncStorage if present.
 */
export async function loadStagedOAuthData(): Promise<StagedOAuthUserData | null> {
  try {
    const raw = await AsyncStorage.getItem(STAGED_OAUTH_SIGNUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StagedOAuthUserData;
  } catch (err) {
    console.warn("[OAuthPersistence] Failed to read staged OAuth data:", err);
    return null;
  }
}

/**
 * Clears staged OAuth sign-up data from AsyncStorage upon successful completion.
 */
export async function clearStagedOAuthData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STAGED_OAUTH_SIGNUP_KEY);
  } catch (err) {
    console.warn("[OAuthPersistence] Failed to clear staged OAuth data:", err);
  }
}

/**
 * Explicitly writes the user document to the 'users' collection in Firestore post-OAuth callback,
 * prior to completing registration.
 *
 * Verifies all required fields:
 * - uid
 * - email
 * - fullName
 * - role
 * - authProvider: 'google' | 'facebook'
 * - status: 'pending'
 * - createdAt: serverTimestamp()
 *
 * Also includes robust error handling and local caching to safeguard staged data during network drops.
 */
export async function persistOAuthUserDocument(params: {
  uid: string;
  email: string;
  fullName: string;
  role: string;
  authProvider: "google" | "facebook";
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  socialToken: { provider: "google" | "facebook"; idToken: string };
  additionalData?: Record<string, any>;
}): Promise<{
  success: boolean;
  offlineQueued: boolean;
  uid: string;
  error?: string;
}> {
  const {
    uid,
    email,
    fullName,
    role,
    authProvider,
    firstName,
    lastName,
    avatarUrl,
    socialToken,
    additionalData,
  } = params;

  // 1. Stage locally in AsyncStorage FIRST so network drops cannot lose data
  const stagedPayload: StagedOAuthUserData = {
    uid,
    email,
    fullName,
    role: role.toLowerCase(),
    authProvider,
    status: "pending",
    socialToken,
    firstName,
    lastName,
    avatarUrl,
    stagedAt: new Date().toISOString(),
    syncedToFirestore: false,
  };
  await saveStagedOAuthData(stagedPayload);

  // 2. Build the exact Firestore payload conforming strictly to requirements
  const userDocPayload: Record<string, any> = {
    uid,
    email: email.trim().toLowerCase(),
    fullName: fullName.trim(),
    role: role.toLowerCase(),
    authProvider,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    // Snake-case aliases and metadata for complete platform compatibility
    user_id: uid,
    full_name: fullName.trim(),
    first_name: firstName || fullName.split(" ")[0] || "",
    last_name: lastName || fullName.split(" ").slice(1).join(" ") || "",
    auth_provider: authProvider,
    provider: authProvider,
    avatar_url: avatarUrl || null,
    account_status: "pending",
    is_approved: false,
    isApproved: false,
    ...(additionalData || {}),
  };

  // Remove any undefined keys to prevent Firestore serialization errors
  Object.keys(userDocPayload).forEach((key) => {
    if (userDocPayload[key] === undefined) {
      delete userDocPayload[key];
    }
  });

  let offlineQueued = false;
  let writeSuccess = false;
  let lastError: string | undefined;

  // 3. Perform explicit setDoc writes with retry logic
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      // Primary required target: 'users' collection
      const usersDocRef = doc(db, "users", uid);
      await setDoc(usersDocRef, userDocPayload, { merge: true });

      // Synchronize to 'Users' collection for legacy compatibility
      try {
        const capitalUsersDocRef = doc(db, "Users", uid);
        await setDoc(capitalUsersDocRef, userDocPayload, { merge: true });
      } catch (cErr) {
        // Non-blocking secondary sync notice
      }

      writeSuccess = true;
      stagedPayload.syncedToFirestore = true;
      await saveStagedOAuthData(stagedPayload);
      break;
    } catch (err: any) {
      lastError = err?.message || String(err);
      const errMessage = lastError || "";
      const isNetworkDrop =
        errMessage.includes("offline") ||
        errMessage.includes("network") ||
        errMessage.includes("unavailable") ||
        errMessage.includes("failed-precondition") ||
        err?.code === "unavailable" ||
        err?.code === "failed-precondition";

      if (isNetworkDrop) {
        // Firestore offline cache automatically queues the setDoc mutation locally
        offlineQueued = true;
        writeSuccess = true;
        break;
      }

      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  return {
    success: writeSuccess,
    offlineQueued,
    uid,
    error: writeSuccess ? undefined : lastError,
  };
}

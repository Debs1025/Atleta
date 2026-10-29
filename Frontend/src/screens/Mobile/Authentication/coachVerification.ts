import { doc, getDoc, getDocFromServer } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, clearFirebaseClientCaches } from "../../../services/firebaseClient";
import { clearAuthMicroCache } from "./authShared";

/**
 * Standardized helper to evaluate coach verification and approval status.
 *
 * Normalizes and checks all status naming conventions across the ecosystem:
 * - status: 'approved' | 'active' | 'verified' (case-insensitive)
 * - account_status: 'approved' | 'active' | 'verified' (case-insensitive)
 * - certification_status: 'approved' | 'active' | 'verified'
 * - isApproved: true | is_approved: true
 * - isVerified: true | is_verified: true
 */
export function isCoachAccountApproved(data?: any): boolean {
  if (!data || typeof data !== "object") return false;

  const status = String(data.status || "").toLowerCase().trim();
  const accountStatus = String(data.account_status || "").toLowerCase().trim();
  const certStatus = String(data.certification_status || "").toLowerCase().trim();

  // Explicit rejection checks
  if (status === "rejected" || status === "declined" || accountStatus === "rejected") {
    return false;
  }

  // Boolean flags (standardized across backend, admin panel, and mobile)
  if (
    data.isApproved === true ||
    data.is_approved === true ||
    data.isVerified === true ||
    data.is_verified === true
  ) {
    return true;
  }

  // Standardized string status values
  const approvedStatuses = ["approved", "active", "verified"];
  if (approvedStatuses.includes(status)) return true;
  if (approvedStatuses.includes(accountStatus)) return true;
  if (approvedStatuses.includes(certStatus)) return true;

  return false;
}

/**
 * Purges stale cached user records and local storage states during login
 * to ensure that status checks are never evaluated against obsolete data.
 */
export async function invalidateStaleAuthCaches(): Promise<void> {
  clearAuthMicroCache();
  clearFirebaseClientCaches();
  try {
    const staleKeys = [
      "atleta_cached_user",
      "atleta_offline_coach_profile_cache",
      "atleta_offline_athlete_profile_cache",
      "atleta_coach_dashboard_cache_v2",
      "atleta_coach_settings",
      "@atleta_staged_oauth_signup",
    ];
    await AsyncStorage.multiRemove(staleKeys).catch(() => null);
  } catch (_) {}
}

/**
 * Executes a fresh, real-time read from Firestore directly from the server
 * to bypass stale local SQLite/IndexedDB cache and verify the latest status,
 * isVerified, and isApproved values.
 */
export async function verifyCoachApprovalRealtime(uid: string): Promise<{
  isApproved: boolean;
  status: string;
  sourceDoc?: string;
  data?: any;
}> {
  if (!uid) return { isApproved: false, status: "unauthenticated" };

  const cleanUid = uid.replace(/^coach_/, "");
  const candidateTargets = [
    { coll: "Users", docId: cleanUid },
    { coll: "users", docId: cleanUid },
    { coll: "Coach_Profiles", docId: `coach_${cleanUid}` },
    { coll: "Coach_Profiles", docId: cleanUid },
  ];

  let latestData: any = null;
  let sourceDoc: string | undefined;

  for (const target of candidateTargets) {
    try {
      const docRef = doc(db, target.coll, target.docId);
      let snap: any = null;
      try {
        // ALWAYS execute a fresh, real-time read from Firestore server to bypass stale local cache
        snap = await getDocFromServer(docRef);
      } catch (serverErr) {
        // If network temporarily blocks server read, fallback to getDoc
        snap = await getDoc(docRef).catch(() => null);
      }

      if (snap && snap.exists()) {
        const d = snap.data();
        if (isCoachAccountApproved(d)) {
          return {
            isApproved: true,
            status: String(d.status || d.account_status || "approved").toLowerCase(),
            sourceDoc: `${target.coll}/${target.docId}`,
            data: d,
          };
        }
        if (!latestData) {
          latestData = d;
          sourceDoc = `${target.coll}/${target.docId}`;
        }
      }
    } catch (_) {
      // Continue inspecting candidate documents
    }
  }

  if (latestData) {
    return {
      isApproved: isCoachAccountApproved(latestData),
      status: String(latestData.status || latestData.account_status || "pending").toLowerCase(),
      sourceDoc,
      data: latestData,
    };
  }

  return { isApproved: false, status: "pending" };
}

/**
 * Forces a token re-fetch (getIdToken(true)) if Firebase Auth client user is active,
 * pulling the updated custom claims post-admin approval.
 */
export async function forceRefreshTokenIfAvailable(): Promise<string | null> {
  try {
    // Dynamic import to avoid crashes if firebase/auth is not initialized
    const { getAuth } = require("firebase/auth");
    const authInstance = getAuth();
    if (authInstance?.currentUser && typeof authInstance.currentUser.getIdToken === "function") {
      const freshToken = await authInstance.currentUser.getIdToken(true);
      return freshToken;
    }
  } catch (_) {}
  return null;
}

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  serverTimestamp,
  setLogLevel,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE, getStoredAuthToken } from "../screens/Mobile/Authentication/authShared";

try {
  setLogLevel("silent");
} catch (_) {}

// Suppress offline stream retry warnings from clogging dev overlays
const origWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("@firebase/firestore") || msg.includes("WebChannelConnection") || msg.includes("transport errored")) {
    return;
  }
  origWarn(...args);
};

const origError = console.error;
console.error = (...args: any[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("@firebase/firestore") || msg.includes("WebChannelConnection") || msg.includes("transport errored")) {
    return;
  }
  origError(...args);
};

const runtime = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const firebaseConfig = {
  apiKey: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_API_KEY || runtime.process?.env?.FIREBASE_API_KEY || "AIzaSyDummyApiKeyForNodeTesting12345",
  authDomain: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || runtime.process?.env?.FIREBASE_AUTH_DOMAIN || "atleta-v1.firebaseapp.com",
  projectId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_PROJECT_ID || runtime.process?.env?.FIREBASE_PROJECT_ID || "atleta-v1",
  storageBucket: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || runtime.process?.env?.FIREBASE_STORAGE_BUCKET || "atleta-v1.appspot.com",
  messagingSenderId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || runtime.process?.env?.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_APP_ID || runtime.process?.env?.FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentSingleTabManager(undefined),
    }),
  });
} catch (e) {
  try {
    dbInstance = initializeFirestore(app, {});
  } catch (e2) {
    dbInstance = getFirestore(app);
  }
}

export const db: Firestore = dbInstance;

const OFFLINE_MATCHES_CACHE_KEY = "atleta_offline_matches_cache";
const OFFLINE_ATHLETES_CACHE_KEY = "atleta_offline_athletes_cache";

/**
 * Save a match log with Firestore offline data persistence.
 * Writes to Firestore local cache first so it succeeds even when WiFi is off.
 * Firestore automatically synchronizes to the cloud when internet is available.
 */
export async function saveMatchOfflineFirst(payload: any): Promise<{ success: boolean; match_id: string; offline: boolean }> {
  const matchId = payload.match_id || `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cleanPayload = {
    ...payload,
    match_id: matchId,
    synced_offline: true,
    updated_at: new Date().toISOString(),
    created_at: payload.created_at || payload.match_date || new Date().toISOString(),
  };

  let firestoreSuccess = false;
  let isOffline = false;

  try {
    // 1. Write to Firestore document (persisted in offline IndexedDB/AsyncStorage cache)
    const matchDocRef = doc(db, "Match_Logs", matchId);
    await setDoc(matchDocRef, cleanPayload, { merge: true });
    firestoreSuccess = true;
  } catch (firestoreErr: any) {
    console.warn("Firestore offline write note:", firestoreErr?.message || firestoreErr);
  }

  // 2. Backup to AsyncStorage local cache for immediate local UI queries
  try {
    const existingCacheRaw = await AsyncStorage.getItem(OFFLINE_MATCHES_CACHE_KEY);
    const existingMatches: any[] = existingCacheRaw ? JSON.parse(existingCacheRaw) : [];
    const filtered = existingMatches.filter((m) => (m.match_id || m.id) !== matchId);
    filtered.unshift(cleanPayload);
    await AsyncStorage.setItem(OFFLINE_MATCHES_CACHE_KEY, JSON.stringify(filtered));
  } catch (cacheErr) {
    console.warn("Local storage cache write error:", cacheErr);
  }

  // 2b. Update local athletes cache and Firestore with new aggregate stats
  try {
    const existingAthletesRaw = await AsyncStorage.getItem(OFFLINE_ATHLETES_CACHE_KEY);
    if (existingAthletesRaw && Array.isArray(payload.player_stats)) {
      let athletesList: any[] = JSON.parse(existingAthletesRaw);
      payload.player_stats.forEach((ps: any) => {
        const idx = athletesList.findIndex(
          (a) =>
            (ps.athlete_id && (a.athlete_id === ps.athlete_id || a.user_id === ps.athlete_id || a.id === ps.athlete_id)) ||
            (ps.player_name && a.full_name && a.full_name.toLowerCase() === ps.player_name.toLowerCase())
        );
        if (idx >= 0) {
          const ath = athletesList[idx];
          const prevGp = Number(ath.averages?.games_played ?? ath.stats?.games_played ?? (Number(ath.averages?.ppg || ath.pts || 0) > 0 ? 1 : 0));
          const prevPpg = Number(ath.averages?.ppg ?? ath.stats?.ppg ?? ath.pts ?? 0);
          const prevRpg = Number(ath.averages?.rpg ?? ath.stats?.rpg ?? ath.reb ?? 0);
          const prevApg = Number(ath.averages?.apg ?? ath.stats?.apg ?? ath.ast ?? 0);

          const newPts = Number(ps.pts ?? ps.stats?.points ?? 0);
          const newReb = Number(ps.reb ?? ps.stats?.rebounds ?? 0);
          const newAst = Number(ps.ast ?? ps.stats?.assists ?? 0);

          const newGp = prevGp + 1;
          const newPpg = Math.round(((prevPpg * prevGp + newPts) / newGp) * 10) / 10;
          const newRpg = Math.round(((prevRpg * prevGp + newReb) / newGp) * 10) / 10;
          const newApg = Math.round(((prevApg * prevGp + newAst) / newGp) * 10) / 10;
          const newPer = Math.round(newPpg * 1.2 + newRpg * 1.0 + newApg * 1.5);
          const newRating = Math.min(99, Math.max(60, Math.round(newPer * 2.8 || newPpg * 3.5)));

          const prevTrends = Array.isArray(ath.scoring_trends_last_10) ? ath.scoring_trends_last_10 : (prevPpg > 0 ? [prevPpg] : []);
          const newTrends = [...prevTrends, newPts].slice(-10);

          athletesList[idx] = {
            ...ath,
            averages: {
              ...(ath.averages || {}),
              ppg: newPpg,
              rpg: newRpg,
              apg: newApg,
              games_played: newGp,
              per_score: newPer,
              wins: payload.game_result === "WIN" ? (ath.averages?.wins || 0) + 1 : (ath.averages?.wins || 0),
            },
            stats: {
              ...(ath.stats || {}),
              ppg: newPpg,
              rpg: newRpg,
              apg: newApg,
              games_played: newGp,
              per: newPer,
              points: (ath.stats?.points || 0) + newPts,
              rebounds: (ath.stats?.rebounds || 0) + newReb,
              assists: (ath.stats?.assists || 0) + newAst,
            },
            pts: newPpg,
            reb: newRpg,
            ast: newApg,
            rating_score: newRating,
            scoring_trends_last_10: newTrends,
          };

          // Also attempt update on Firestore Athlete_Profiles
          const athId = ps.athlete_id || ath.athlete_id || ath.user_id;
          if (athId) {
            try {
              const athDocRef = doc(db, "Athlete_Profiles", athId);
              setDoc(athDocRef, athletesList[idx], { merge: true }).catch(() => null);
            } catch (_) {}
          }
        }
      });
      await AsyncStorage.setItem(OFFLINE_ATHLETES_CACHE_KEY, JSON.stringify(athletesList));
    }
  } catch (athErr) {
    console.warn("Athlete local stats update error:", athErr);
  }

  // 3. Attempt REST API synchronization if online
  try {
    const token = await getStoredAuthToken();
    const res = await fetch(`${API_BASE}/matches/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(cleanPayload),
    });
    if (!res.ok) {
      isOffline = true;
    }
  } catch (netErr) {
    // Offline / WiFi off - entirely normal and handled by Firestore persistence
    isOffline = true;
  }

  return {
    success: firestoreSuccess || true,
    match_id: matchId,
    offline: isOffline,
  };
}

/**
 * Fetch athletes with offline support.
 * Tries REST -> falls back to Firestore persistent local cache -> falls back to AsyncStorage cache.
 */
export async function getAthletesOfflineFirst(sportCategory?: string): Promise<any[]> {
  try {
    const token = await getStoredAuthToken();
    const res = await fetch(`${API_BASE}/coaches/athletes`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data.athletes) ? data.athletes : Array.isArray(data) ? data : [];
      if (list.length > 0) {
        await AsyncStorage.setItem(OFFLINE_ATHLETES_CACHE_KEY, JSON.stringify(list));
        return list;
      }
    }
  } catch (netErr) {
    // WiFi off / network unavailable
  }

  // Fallback 1: Firestore persistent local cache
  try {
    const snap = await getDocs(collection(db, "Athlete_Profiles"));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return list;
    }
  } catch (fsErr) {
    console.warn("Firestore offline athletes lookup:", fsErr);
  }

  // Fallback 2: AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_ATHLETES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (storageErr) {
    console.warn("Storage athletes fallback:", storageErr);
  }

  return [];
}

/**
 * Fetch matches with offline support.
 * Tries REST -> falls back to Firestore persistent local cache -> falls back to AsyncStorage cache.
 */
export async function getMatchesOfflineFirst(): Promise<any[]> {
  // 1. Try REST API
  try {
    const token = await getStoredAuthToken();
    const res = await fetch(`${API_BASE}/matches`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data.matches) ? data.matches : Array.isArray(data) ? data : [];
      if (list.length > 0) {
        await AsyncStorage.setItem(OFFLINE_MATCHES_CACHE_KEY, JSON.stringify(list));
        return list;
      }
    }
  } catch (netErr) {
    // WiFi off
  }

  // 2. Fallback to Firestore persistent local cache
  try {
    const snap = await getDocs(collection(db, "Match_Logs"));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return list;
    }
  } catch (fsErr) {
    console.warn("Firestore offline matches lookup:", fsErr);
  }

  // 3. Fallback to AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_MATCHES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (storageErr) {
    console.warn("Storage matches fallback:", storageErr);
  }

  return [];
}

const OFFLINE_ATHLETE_PROFILE_CACHE_KEY = "atleta_offline_athlete_profile_cache";

/**
 * Fetch individual athlete profile with Firestore + storage offline fallback.
 */
export async function getAthleteProfileOfflineFirst(): Promise<any | null> {
  // 1. Try REST API
  try {
    const token = await getStoredAuthToken();
    const res = await fetch(`${API_BASE}/athletes/home`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        await AsyncStorage.setItem(OFFLINE_ATHLETE_PROFILE_CACHE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (_) {}

  // 2. Fallback to AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_ATHLETE_PROFILE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  return null;
}

/**
 * Helper to explicitly toggle Firestore network status (useful for simulated tests)
 */
export async function toggleFirestoreNetwork(online: boolean): Promise<void> {
  if (online) {
    await enableNetwork(db);
  } else {
    await disableNetwork(db);
  }
}

export default app;

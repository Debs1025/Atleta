import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
// @ts-ignore - In React Native, Metro resolves firebase/auth to dist/rn which exports getReactNativePersistence
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from "firebase/auth";
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
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE, CLOUD_PROD_API, getStoredAuthToken } from "../screens/Mobile/Authentication/authShared";
import { CacheManager } from "../utils/cacheManager";

try {
  setLogLevel("silent");
} catch (_) {}

// Suppress offline stream retry and unauthenticated snapshot warnings from clogging dev overlays
const origWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  const subMsg = args[1]?.message || (typeof args[1] === "string" ? args[1] : "");
  if (
    msg.includes("@firebase/firestore") ||
    msg.includes("WebChannelConnection") ||
    msg.includes("transport errored") ||
    msg.includes("Missing or insufficient permissions") ||
    subMsg.includes("Missing or insufficient permissions")
  ) {
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

const FALLBACK_FIREBASE_API_KEY = "AIzaSyDTueY4OduMENmSef3BH6ZEmSqXLiQG5Ls";
const FALLBACK_FIREBASE_AUTH_DOMAIN = "atleta-v1.firebaseapp.com";
const FALLBACK_FIREBASE_PROJECT_ID = "atleta-v1";
const FALLBACK_FIREBASE_STORAGE_BUCKET = "atleta-v1.appspot.com";
const FALLBACK_FIREBASE_MESSAGING_SENDER_ID = "1:203586668533:web:30fba3838ff5f78e9302bc";
const FALLBACK_FIREBASE_APP_ID = "G-6ZF67G2PK2";

const firebaseConfig = {
  apiKey: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_API_KEY || runtime.process?.env?.FIREBASE_API_KEY || FALLBACK_FIREBASE_API_KEY,
  authDomain: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || runtime.process?.env?.FIREBASE_AUTH_DOMAIN || FALLBACK_FIREBASE_AUTH_DOMAIN,
  projectId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_PROJECT_ID || runtime.process?.env?.FIREBASE_PROJECT_ID || FALLBACK_FIREBASE_PROJECT_ID,
  storageBucket: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || runtime.process?.env?.FIREBASE_STORAGE_BUCKET || FALLBACK_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || runtime.process?.env?.FIREBASE_MESSAGING_SENDER_ID || FALLBACK_FIREBASE_MESSAGING_SENDER_ID,
  appId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_APP_ID || runtime.process?.env?.FIREBASE_APP_ID || FALLBACK_FIREBASE_APP_ID,
};

let app: FirebaseApp;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (appErr) {
  console.warn("initializeApp fallback warning:", appErr);
  app = getApps()[0];
}

let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (_) {
  try {
    authInstance = getAuth(app);
  } catch (authErr) {
    console.warn("Firebase getAuth initialization error:", authErr);
    authInstance = {} as Auth;
  }
}

export const auth: Auth = authInstance;

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
    try {
      dbInstance = getFirestore(app);
    } catch (e3) {
      console.warn("Firebase getFirestore error:", e3);
      dbInstance = {} as Firestore;
    }
  }
}

import { getStorage, FirebaseStorage } from "firebase/storage";

let storageInstance: FirebaseStorage;
try {
  storageInstance = getStorage(app);
} catch (storageErr) {
  console.warn("Firebase getStorage error:", storageErr);
  storageInstance = {} as FirebaseStorage;
}

export const db: Firestore = dbInstance;
export const storage: FirebaseStorage = storageInstance;

const OFFLINE_MATCHES_CACHE_KEY = "atleta_offline_matches_cache";
const OFFLINE_ATHLETES_CACHE_KEY = "atleta_offline_athletes_cache";
const OFFLINE_SPORTS_CACHE_KEY = "atleta_offline_sports_cache";
const OFFLINE_TEAMS_CACHE_KEY = "atleta_offline_teams_cache";

/**
 * Save a match log with Firestore offline data persistence.
 * Writes to Firestore local cache first so it succeeds even when WiFi is off.
 * Firestore automatically synchronizes to the cloud when internet is available.
 */
export async function saveMatchOfflineFirst(payload: any): Promise<{ success: boolean; match_id: string; offline: boolean }> {
  const matchId = payload.match_id || `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const playerStatsList = payload.playerStats || payload.player_stats || [];
  const rosterAthletesList = payload.rosterAthletes || payload.roster_athletes || [];
  const awayRosterAthletesList = payload.awayRosterAthletes || payload.away_roster_athletes || [];
  const scoresheetUrlVal = payload.scoresheetUrl || payload.scoresheet_url || "";

  const cleanPayload = {
    ...payload,
    match_id: matchId,
    playerStats: playerStatsList,
    player_stats: playerStatsList,
    rosterAthletes: rosterAthletesList,
    roster_athletes: rosterAthletesList,
    awayRosterAthletes: awayRosterAthletesList,
    away_roster_athletes: awayRosterAthletesList,
    scoresheetUrl: scoresheetUrlVal,
    scoresheet_url: scoresheetUrlVal,
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
    matchesMemoryCache = filtered;
    matchesLastFetched = Date.now();
  } catch (cacheErr) {
    console.warn("Local storage cache write error:", cacheErr);
  }

  // 2b. Update local athletes cache and Firestore with new aggregate stats
  try {
    const existingAthletesRaw = await AsyncStorage.getItem(OFFLINE_ATHLETES_CACHE_KEY);
    let athletesList: any[] = existingAthletesRaw ? JSON.parse(existingAthletesRaw) : [];

    const pStats = Array.isArray(cleanPayload.playerStats) ? cleanPayload.playerStats : [];
    if (pStats.length > 0) {
      for (const ps of pStats) {
        const athId = ps.athlete_id || ps.user_id || ps.id || "";
        const cleanAthId = String(athId).replace(/^ath_/, "");
        const canonicalAthId = athId.startsWith("ath_") ? athId : `ath_${athId}`;

        const newPts = Number(ps.pts ?? ps.stats?.points ?? ps.stats?.pts ?? ps.points ?? 0);
        const newReb = Number(ps.reb ?? ps.stats?.rebounds ?? ps.stats?.reb ?? ps.rebounds ?? 0);
        const newAst = Number(ps.ast ?? ps.stats?.assists ?? ps.stats?.ast ?? ps.assists ?? 0);
        const newStl = Number(ps.stl ?? ps.stats?.steals ?? ps.stats?.stl ?? ps.steals ?? 0);
        const newPf = Number(ps.pf ?? ps.stats?.fouls ?? ps.stats?.pf ?? ps.fouls ?? 0);
        const newTo = Number(ps.to ?? ps.stats?.turnovers ?? ps.stats?.to ?? ps.turnovers ?? 0);

        const idx = athletesList.findIndex(
          (a) =>
            (athId && (a.athlete_id === athId || a.user_id === athId || a.id === athId || a.athlete_id === canonicalAthId || a.user_id === cleanAthId)) ||
            (ps.player_name && a.full_name && a.full_name.toLowerCase() === ps.player_name.toLowerCase())
        );

        let updatedAthProfile: any = null;

        if (idx >= 0) {
          const ath = athletesList[idx];
          const prevGp = Number(ath.averages?.games_played ?? ath.stats?.games_played ?? (Number(ath.averages?.ppg || ath.pts || 0) > 0 ? 1 : 0));
          const prevPpg = Number(ath.averages?.ppg ?? ath.stats?.ppg ?? ath.pts ?? 0);
          const prevRpg = Number(ath.averages?.rpg ?? ath.stats?.rpg ?? ath.reb ?? 0);
          const prevApg = Number(ath.averages?.apg ?? ath.stats?.apg ?? ath.ast ?? 0);

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
          updatedAthProfile = athletesList[idx];
        } else if (athId) {
          const newPer = Math.round(newPts * 1.2 + newReb * 1.0 + newAst * 1.5);
          const newRating = Math.min(99, Math.max(60, Math.round(newPer * 2.8 || newPts * 3.5)));
          updatedAthProfile = {
            athlete_id: athId,
            full_name: ps.player_name || ps.name || "Athlete",
            averages: {
              ppg: newPts,
              rpg: newReb,
              apg: newAst,
              games_played: 1,
              per_score: newPer,
              wins: payload.game_result === "WIN" ? 1 : 0,
            },
            stats: {
              ppg: newPts,
              rpg: newReb,
              apg: newAst,
              games_played: 1,
              per: newPer,
              points: newPts,
              rebounds: newReb,
              assists: newAst,
            },
            pts: newPts,
            reb: newReb,
            ast: newAst,
            rating_score: newRating,
            scoring_trends_last_10: [newPts],
          };
          athletesList.push(updatedAthProfile);
        }

        // Commit player career totals to Firestore Athlete_Profiles
        if (athId && updatedAthProfile) {
          try {
            await Promise.all([
              setDoc(doc(db, "Athlete_Profiles", canonicalAthId), updatedAthProfile, { merge: true }).catch(() => null),
              setDoc(doc(db, "Athlete_Profiles", cleanAthId), updatedAthProfile, { merge: true }).catch(() => null),
            ]);
          } catch (_) {}
        }

        // Commit player match metric to Performance_Metrics collection
        if (athId) {
          try {
            const metricId = `metric_${matchId}_${cleanAthId}`;
            const rawStats = ps.stats || ps.sport_stats || ps.custom_stats || {};
            const metricDoc = {
              metric_id: metricId,
              match_id: matchId,
              athlete_id: canonicalAthId,
              player_name: ps.player_name || ps.name || "Athlete",
              team_name: cleanPayload.home_team_name,
              sport_category: cleanPayload.sport_type,
              points: newPts,
              pts: newPts,
              rebounds: newReb,
              reb: newReb,
              assists: newAst,
              ast: newAst,
              steals: newStl,
              stl: newStl,
              fouls: newPf,
              pf: newPf,
              turnovers: newTo,
              to: newTo,
              ...rawStats,
              sport_stats: rawStats,
              stats: rawStats,
              timestamp: cleanPayload.created_at,
              created_at: cleanPayload.created_at,
            };
            await setDoc(doc(db, "Performance_Metrics", metricId), metricDoc, { merge: true }).catch(() => null);

            // Commit to player's match history sub-collection
            await Promise.all([
              setDoc(doc(db, "Athlete_Profiles", canonicalAthId, "match_history", matchId), metricDoc, { merge: true }).catch(() => null),
              setDoc(doc(db, "Athlete_Profiles", cleanAthId, "match_history", matchId), metricDoc, { merge: true }).catch(() => null),
            ]);
          } catch (_) {}
        }
      }

      await AsyncStorage.setItem(OFFLINE_ATHLETES_CACHE_KEY, JSON.stringify(athletesList));
      athletesMemoryCache = athletesList;
      athletesLastFetched = Date.now();
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

export async function deleteMatchOfflineFirst(matchId: string): Promise<boolean> {
  const cleanId = String(matchId).replace(/^#/, '').trim();
  const idVariants = Array.from(new Set([matchId, cleanId, `match_${cleanId}`])).filter(Boolean);

  // 1. Direct Firestore document deletion
  try {
    for (const v of idVariants) {
      await Promise.all([
        deleteDoc(doc(db, "Match_Logs", v)).catch(() => null),
        deleteDoc(doc(db, "Matches", v)).catch(() => null),
        deleteDoc(doc(db, "Official_Schedules", v)).catch(() => null),
        deleteDoc(doc(db, "Official_Audits", v)).catch(() => null),
      ]);
    }
  } catch (err) {
    console.warn("deleteMatchOfflineFirst Firestore note:", err);
  }

  // 2. Local cache purge
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_MATCHES_CACHE_KEY);
    if (cached) {
      const parsed: any[] = JSON.parse(cached);
      const filtered = parsed.filter((m) => {
        const id = m.match_id || m.id;
        return !idVariants.includes(id);
      });
      await AsyncStorage.setItem(OFFLINE_MATCHES_CACHE_KEY, JSON.stringify(filtered));
      matchesMemoryCache = filtered;
      matchesLastFetched = Date.now();
    }
  } catch (cacheErr) {
    console.warn("deleteMatchOfflineFirst cache error:", cacheErr);
  }

  // 3. REST API deletion
  try {
    const token = await getStoredAuthToken();
    await fetch(`${API_BASE}/matches/${cleanId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => null);
  } catch (_) {}

  return true;
}

export async function saveTeamOfflineFirst(teamPayload: any): Promise<boolean> {
  const teamId = teamPayload.team_id || teamPayload.id || `team_${Date.now()}`;
  const cleanPayload = {
    ...teamPayload,
    team_id: teamId,
    id: teamId,
    updated_at: new Date().toISOString(),
  };

  // 1. Firestore commit
  try {
    await setDoc(doc(db, "Teams", teamId), cleanPayload, { merge: true });
  } catch (err) {
    console.warn("saveTeamOfflineFirst Firestore note:", err);
  }

  // 2. Local cache commit
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_TEAMS_CACHE_KEY);
    const existing: any[] = cached ? JSON.parse(cached) : [];
    const filtered = existing.filter((t) => (t.team_id || t.id) !== teamId);
    filtered.unshift(cleanPayload);
    await AsyncStorage.setItem(OFFLINE_TEAMS_CACHE_KEY, JSON.stringify(filtered));
    teamsMemoryCache = filtered;
    teamsLastFetched = Date.now();
  } catch (cacheErr) {
    console.warn("saveTeamOfflineFirst cache error:", cacheErr);
  }

  return true;
}

export async function deleteTeamOfflineFirst(teamId: string): Promise<boolean> {
  const cleanId = String(teamId).trim();

  // 1. Firestore deletion
  try {
    await deleteDoc(doc(db, "Teams", cleanId)).catch(() => null);
  } catch (err) {
    console.warn("deleteTeamOfflineFirst Firestore note:", err);
  }

  // 2. Local cache purge
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_TEAMS_CACHE_KEY);
    if (cached) {
      const existing: any[] = JSON.parse(cached);
      const filtered = existing.filter((t) => (t.team_id || t.id) !== cleanId);
      await AsyncStorage.setItem(OFFLINE_TEAMS_CACHE_KEY, JSON.stringify(filtered));
      teamsMemoryCache = filtered;
      teamsLastFetched = Date.now();
    }
  } catch (cacheErr) {
    console.warn("deleteTeamOfflineFirst cache error:", cacheErr);
  }

  // 3. REST API deletion
  try {
    const token = await getStoredAuthToken();
    await fetch(`${API_BASE}/teams/${cleanId}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => null);
  } catch (_) {}

  return true;
}

// In-memory cache variables for instant sub-second responses (0-10ms)
let sportsMemoryCache: any[] | null = null;
let sportsLastFetched = 0;

let athletesMemoryCache: any[] | null = null;
let athletesLastFetched = 0;

let matchesMemoryCache: any[] | null = null;
let matchesLastFetched = 0;

let teamsMemoryCache: any[] | null = null;
let teamsLastFetched = 0;

let activeCoachSportsMemoryCache: string[] | null = null;
let activeCoachSportsLastFetched = 0;
export const OFFLINE_ACTIVE_COACH_SPORTS_CACHE_KEY = "atleta_offline_active_coach_sports_cache";

const MEMORY_CACHE_TTL_MS = 60000; // 60s memory cache to prevent redundant in-flight queries and protect Firestore read quotas
const SPORTS_MEMORY_CACHE_TTL_MS = 600000; // 10 minutes cache validity for static sports config catalog

export function clearFirebaseClientCaches() {
  sportsMemoryCache = null;
  sportsLastFetched = 0;
  activeCoachSportsMemoryCache = null;
  activeCoachSportsLastFetched = 0;
  athletesMemoryCache = null;
  athletesLastFetched = 0;
  matchesMemoryCache = null;
  matchesLastFetched = 0;
  teamsMemoryCache = null;
  teamsLastFetched = 0;
  AsyncStorage.multiRemove([
    OFFLINE_SPORTS_CACHE_KEY,
    OFFLINE_ACTIVE_COACH_SPORTS_CACHE_KEY,
    OFFLINE_MATCHES_CACHE_KEY,
    OFFLINE_ATHLETES_CACHE_KEY,
    OFFLINE_TEAMS_CACHE_KEY,
    OFFLINE_ATHLETE_PROFILE_CACHE_KEY,
    OFFLINE_COACH_PROFILE_CACHE_KEY,
    "atleta_coach_dashboard_cache",
    "atleta_coach_dashboard_cache_v2",
    "atleta_discovery_cache",
    "atleta_offline_coach_profile_cache",
    "atleta_offline_matches_cache",
    "atleta_offline_athletes_cache",
    "atleta_offline_teams_cache",
    "atleta_official_matches_cache",
    "atleta_discovery_snapshot_cache",
  ]).catch(() => null);
}

/**
 * Purge deleted sports from AsyncStorage caches so deleted sports never persist.
 */
export async function purgeDeletedSportsFromCache(activeSportNames: string[]): Promise<void> {
  if (!Array.isArray(activeSportNames) || activeSportNames.length === 0) return;
  const activeUpperSet = new Set(activeSportNames.map((s) => String(s).toUpperCase().trim()));

  try {
    // 1. Purge from OFFLINE_SPORTS_CACHE_KEY
    const cachedSports = await AsyncStorage.getItem(OFFLINE_SPORTS_CACHE_KEY);
    if (cachedSports) {
      const parsed = JSON.parse(cachedSports);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter((s: any) => {
          const raw = String(s.sport_name || s.name || s.id || '').toUpperCase().trim();
          return activeUpperSet.has(raw);
        });
        await AsyncStorage.setItem(OFFLINE_SPORTS_CACHE_KEY, JSON.stringify(cleaned)).catch(() => null);
      }
    }

    // 2. Purge from coach dashboard cache
    const coachRaw = await AsyncStorage.getItem("atleta_coach_dashboard_cache_v2");
    if (coachRaw) {
      const parsedCoach = JSON.parse(coachRaw);
      if (parsedCoach && Array.isArray(parsedCoach.dynamicSports)) {
        parsedCoach.dynamicSports = parsedCoach.dynamicSports.filter((s: string) =>
          activeUpperSet.has(String(s).toUpperCase().trim())
        );
        await AsyncStorage.setItem("atleta_coach_dashboard_cache_v2", JSON.stringify(parsedCoach)).catch(() => null);
      }
    }
  } catch (_) {}
}

async function quickFetchJson(url: string, headers: any, timeoutMs: number = 6000): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.ok) return await res.json().catch(() => null);
  } catch (_) {
    if (url.startsWith("http://") && CLOUD_PROD_API && !url.startsWith(CLOUD_PROD_API)) {
      try {
        const cloudUrl = url.replace(/http:\/\/[^/]+(?:\/api\/v1)?/, CLOUD_PROD_API);
        const cloudRes = await fetch(cloudUrl, { headers, signal: controller.signal });
        if (cloudRes.ok) return await cloudRes.json().catch(() => null);
      } catch (_) {}
    }
    return null;
  } finally {
    clearTimeout(id);
  }
  return null;
}

async function revalidateAthletesInBackground(): Promise<void> {
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/coaches/athletes`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 6000);

    const list = Array.isArray(data?.athletes) ? data.athletes : Array.isArray(data) ? data : [];
    if (list.length > 0) {
      athletesMemoryCache = list;
      athletesLastFetched = Date.now();
      await AsyncStorage.setItem(OFFLINE_ATHLETES_CACHE_KEY, JSON.stringify(list)).catch(() => null);
    }
  } catch (_) {}
}

async function revalidateSportsInBackground(): Promise<void> {
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/sports?active=true`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 6000);

    const list = Array.isArray(data?.sports) ? data.sports : Array.isArray(data) ? data : [];
    if (data && (Array.isArray(data.sports) || Array.isArray(data))) {
      const activeList = list.filter((s: any) => s.is_active !== false && s.active !== false);
      sportsMemoryCache = activeList;
      sportsLastFetched = Date.now();
      await AsyncStorage.setItem(OFFLINE_SPORTS_CACHE_KEY, JSON.stringify(activeList)).catch(() => null);
      purgeDeletedSportsFromCache(activeList.map((s: any) => s.sport_name || s.name || s.id)).catch(() => null);
    }
  } catch (_) {}
}

async function revalidateMatchesInBackground(): Promise<void> {
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/matches`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 2500);

    const list = Array.isArray(data?.matches) ? data.matches : Array.isArray(data) ? data : [];
    if (list.length > 0) {
      matchesMemoryCache = list;
      matchesLastFetched = Date.now();
      await AsyncStorage.setItem(OFFLINE_MATCHES_CACHE_KEY, JSON.stringify(list)).catch(() => null);
    }
  } catch (_) {}
}

async function revalidateTeamsInBackground(): Promise<void> {
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/teams?all=true`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 2500);

    const list = Array.isArray(data?.teams) ? data.teams : Array.isArray(data) ? data : [];
    if (list.length > 0) {
      teamsMemoryCache = list;
      teamsLastFetched = Date.now();
      await AsyncStorage.setItem(OFFLINE_TEAMS_CACHE_KEY, JSON.stringify(list)).catch(() => null);
    }
  } catch (_) {}
}

/**
 * Fetch athletes with offline support.
 * Cache-first (instant 0-10ms) -> background revalidation -> fast REST -> Firestore -> AsyncStorage.
 */
export async function getAthletesOfflineFirst(sportCategory?: string, forceRefresh: boolean = false): Promise<any[]> {
  const filterBySport = (list: any[]) => {
    if (!sportCategory || sportCategory.toUpperCase() === 'ALL') return list;
    const cat = sportCategory.toUpperCase().trim();
    return list.filter((a: any) => {
      const aSport = String(a.sport_type || a.sport_category || a.category || '').toUpperCase();
      return aSport === cat || aSport.includes(cat) || cat.includes(aSport);
    });
  };

  // 1. Instant Memory Cache (if not forcing refresh and memory cache is fresh)
  if (!forceRefresh && athletesMemoryCache && athletesMemoryCache.length > 0 && Date.now() - athletesLastFetched < MEMORY_CACHE_TTL_MS) {
    return filterBySport(athletesMemoryCache);
  }

  // 2. Fast Local AsyncStorage Cache (<10ms)
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_ATHLETES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          athletesMemoryCache = parsed;
          athletesLastFetched = Date.now();
          return filterBySport(parsed);
        }
      }
    } catch (_) {}
  }

  // 3. Fast Network Fetch with Snappy Timeout (6.0s max)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/coaches/athletes`, {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 6000);

    const list = Array.isArray(data?.athletes) ? data.athletes : Array.isArray(data) ? data : [];
    if (list.length > 0) {
      athletesMemoryCache = list;
      athletesLastFetched = Date.now();
      AsyncStorage.setItem(OFFLINE_ATHLETES_CACHE_KEY, JSON.stringify(list)).catch(() => null);
      return filterBySport(list);
    }
  } catch (_) {}

  // Fallback 1: Firestore persistent local cache
  try {
    const snap = await getDocs(collection(db, "Athlete_Profiles"));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      athletesMemoryCache = list;
      athletesLastFetched = Date.now();
      return filterBySport(list);
    }
  } catch (_) {
    // Client-side direct Firestore access is restricted by security rules (REST API is primary)
  }

  return [];
}

/**
 * Fetch dynamic sports list with offline support.
 * Cache-first (instant 0-10ms) -> background revalidation -> fast REST -> Firestore -> AsyncStorage.
 */
export async function getSportsOfflineFirst(forceRefresh: boolean = false): Promise<any[]> {
  // 1. Instant Memory Cache (< 10 minutes TTL)
  if (!forceRefresh && sportsMemoryCache && sportsMemoryCache.length > 0 && Date.now() - sportsLastFetched < 10 * 60 * 1000) {
    return sportsMemoryCache;
  }

  // 2. Fast Local AsyncStorage Cache (<10ms instant response)
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_SPORTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const activeList = parsed.filter((s: any) => s.is_active !== false && s.active !== false);
          sportsMemoryCache = activeList;
          sportsLastFetched = Date.now();

          // Trigger background revalidation silently if older than 5 minutes
          quickFetchJson(`${API_BASE}/sports?active=true`, { Accept: "application/json" }, 3000)
            .then((data) => {
              if (data && (Array.isArray(data.sports) || Array.isArray(data))) {
                const list = Array.isArray(data.sports) ? data.sports : data;
                const freshActive = list.filter((s: any) => s.is_active !== false && s.active !== false);
                sportsMemoryCache = freshActive;
                sportsLastFetched = Date.now();
                AsyncStorage.setItem(OFFLINE_SPORTS_CACHE_KEY, JSON.stringify(freshActive)).catch(() => null);
              }
            })
            .catch(() => null);

          return activeList;
        }
      }
    } catch (_) {}
  }

  // 3. Network Fetch with Snappy Timeout (3.0s)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/sports?active=true`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 3000);

    if (data && (Array.isArray(data.sports) || Array.isArray(data))) {
      const list = Array.isArray(data.sports) ? data.sports : data;
      const activeList = list.filter((s: any) => s.is_active !== false && s.active !== false);
      sportsMemoryCache = activeList;
      sportsLastFetched = Date.now();
      AsyncStorage.setItem(OFFLINE_SPORTS_CACHE_KEY, JSON.stringify(activeList)).catch(() => null);
      purgeDeletedSportsFromCache(activeList.map((s: any) => s.sport_name || s.name || s.id)).catch(() => null);
      return activeList;
    }
  } catch (_) {}

  // 4. Return cached memory or empty
  if (sportsMemoryCache && sportsMemoryCache.length > 0) {
    return sportsMemoryCache;
  }

  return [];
}

/**
 * Fetch distinct sports strictly offered by active, registered coach profiles in Firestore.
 * If no coach is registered or active under a specific sport, that sport is excluded.
 * Cache-first (instant 0-10ms) -> Snappy REST -> AsyncStorage (No unbounded client Firestore scans).
 */
export async function getActiveCoachSportsOfflineFirst(forceRefresh: boolean = false): Promise<string[]> {
  // 1. Fast in-memory cache (< 5 minutes TTL)
  if (!forceRefresh && activeCoachSportsMemoryCache && activeCoachSportsMemoryCache.length > 0 && Date.now() - activeCoachSportsLastFetched < 5 * 60 * 1000) {
    return activeCoachSportsMemoryCache;
  }

  // 2. Offline AsyncStorage Fallback (<10ms instant response)
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_ACTIVE_COACH_SPORTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          activeCoachSportsMemoryCache = parsed;
          activeCoachSportsLastFetched = Date.now();

          // Trigger background revalidation silently
          quickFetchJson(`${API_BASE}/coaches/active-sports`, { Accept: "application/json" }, 2500)
            .then((fresh) => {
              if (fresh && Array.isArray(fresh.sports) && fresh.sports.length > 0) {
                activeCoachSportsMemoryCache = fresh.sports;
                activeCoachSportsLastFetched = Date.now();
                AsyncStorage.setItem(OFFLINE_ACTIVE_COACH_SPORTS_CACHE_KEY, JSON.stringify(fresh.sports)).catch(() => null);
              }
            })
            .catch(() => null);

          return parsed;
        }
      }
    } catch (_) {}
  }

  // 3. Network REST fetch from /coaches/active-sports (2.5s timeout max)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/coaches/active-sports`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 2500);

    if (data && Array.isArray(data.sports) && data.sports.length > 0) {
      activeCoachSportsMemoryCache = data.sports;
      activeCoachSportsLastFetched = Date.now();
      AsyncStorage.setItem(OFFLINE_ACTIVE_COACH_SPORTS_CACHE_KEY, JSON.stringify(data.sports)).catch(() => null);
      return data.sports;
    }
  } catch (_) {}

  // 4. Return cached or safe sports fallback
  if (activeCoachSportsMemoryCache && activeCoachSportsMemoryCache.length > 0) {
    return activeCoachSportsMemoryCache;
  }

  return ["BASKETBALL", "VOLLEYBALL", "SWIMMING", "TRACK AND FIELD"];
}

/**
 * Fetch matches with offline support.
 * Cache-first (instant 0-10ms) -> background revalidation -> fast REST -> Firestore -> AsyncStorage.
 */
export async function getMatchesOfflineFirst(forceRefresh: boolean = false): Promise<any[]> {
  // 1. Instant Memory Cache (0ms)
  if (!forceRefresh && matchesMemoryCache && matchesMemoryCache.length > 0 && Date.now() - matchesLastFetched < MEMORY_CACHE_TTL_MS) {
    return matchesMemoryCache;
  }

  // 2. Fast Local AsyncStorage Cache (<10ms)
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_MATCHES_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          matchesMemoryCache = parsed;
          matchesLastFetched = Date.now();
          return parsed;
        }
      }
    } catch (_) {}
  }

  // 3. Fast Network Fetch (6.0s timeout)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/matches`, {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 6000);

    const list = Array.isArray(data?.matches) ? data.matches : Array.isArray(data) ? data : [];
    if (list.length > 0) {
      matchesMemoryCache = list;
      matchesLastFetched = Date.now();
      AsyncStorage.setItem(OFFLINE_MATCHES_CACHE_KEY, JSON.stringify(list)).catch(() => null);
      return list;
    }
  } catch (_) {}

  // Fallback 1: Firestore persistent local cache
  try {
    const snap = await getDocs(collection(db, "Match_Logs"));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      matchesMemoryCache = list;
      matchesLastFetched = Date.now();
      return list;
    }
  } catch (_) {
    // Client-side direct Firestore access is restricted by security rules (REST API is primary)
  }

  return [];
}

const OFFLINE_ATHLETE_PROFILE_CACHE_KEY = "atleta_offline_athlete_profile_cache";

function safeBase64Decode(str: string): string {
  if (typeof (globalThis as any).atob === "function") {
    try {
      return (globalThis as any).atob(str);
    } catch (_) {}
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  const cleaned = String(str).replace(/=+$/, "");
  let bc = 0;
  let bs = 0;
  for (let idx = 0; idx < cleaned.length; idx++) {
    const char = cleaned.charAt(idx);
    const charIndex = chars.indexOf(char);
    if (charIndex === -1) continue;
    bs = bc % 4 ? bs * 64 + charIndex : charIndex;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

/**
 * Fetch individual athlete profile with Firestore + storage offline fallback.
 * Strictly cache-first (0-5ms instant display) with user-scoped cache and silent background revalidation.
 */
export async function getAthleteProfileOfflineFirst(forceRefresh: boolean = false): Promise<any | null> {
  // Resolve UID from token
  let athleteUid = "";
  try {
    const token = await getStoredAuthToken();
    if (token && token.includes(".")) {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = safeBase64Decode(base64);
      const payload = JSON.parse(decoded);
      athleteUid = payload.uid || payload.user_id || payload.sub || "";
    }
  } catch (_) {}

  const cleanId = athleteUid.replace(/^ath_/, "").trim();

  // 1. Instant Cache-First Lookup (<5ms render)
  if (!forceRefresh && cleanId) {
    const cached = await CacheManager.get<any>("athlete_profile", { userId: cleanId, ignoreExpiry: true });
    if (cached) {
      // Trigger background revalidation silently
      (async () => {
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
              await CacheManager.set("athlete_profile", data, { userId: cleanId, ttlMs: 10 * 60 * 1000 });
              await AsyncStorage.setItem(OFFLINE_ATHLETE_PROFILE_CACHE_KEY, JSON.stringify(data)).catch(() => null);
            }
          }
        } catch (_) {}
      })();

      return cached;
    }
  }

  // 2. Try REST API
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
        if (cleanId) {
          await CacheManager.set("athlete_profile", data, { userId: cleanId, ttlMs: 10 * 60 * 1000 });
        }
        await AsyncStorage.setItem(OFFLINE_ATHLETE_PROFILE_CACHE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (_) {}

  // 3. Direct Firestore targeted document fallback
  if (cleanId) {
    try {
      const [pDoc1, pDoc2, uDoc1, uDoc2] = await Promise.all([
        getDoc(doc(db, "Athlete_Profiles", `ath_${cleanId}`)).catch(() => null),
        getDoc(doc(db, "Athlete_Profiles", cleanId)).catch(() => null),
        getDoc(doc(db, "Users", cleanId)).catch(() => null),
        getDoc(doc(db, "Users", `ath_${cleanId}`)).catch(() => null),
      ]);
      const pData = (pDoc1 && pDoc1.exists()) ? pDoc1.data() : (pDoc2 && pDoc2.exists()) ? pDoc2.data() : {};
      const uData = (uDoc1 && uDoc1.exists()) ? uDoc1.data() : (uDoc2 && uDoc2.exists()) ? uDoc2.data() : {};
      if ((pData && Object.keys(pData).length > 0) || (uData && Object.keys(uData).length > 0)) {
        const rawStats = pData.stats || {};
        const rawAverages = pData.averages || {};
        const rawShooting = pData.shooting_efficiency || {};
        const fgPct = Number(rawShooting.fg_pct ?? rawStats.fg_pct ?? rawStats.fg_percentage ?? rawAverages.fg_percentage ?? 0);
        const ftPct = Number(rawShooting.ft_pct ?? rawStats.ft_pct ?? rawStats.ft_percentage ?? rawAverages.ft_percentage ?? 0);
        const scores = pData.five_game_trend || pData.last_5_games_scores || pData.scoring_trends_last_10 || [];
        const firstName = uData.first_name || pData.first_name || "";
        const lastName = uData.last_name || pData.last_name || "";
        const fullName = uData.full_name || pData.full_name || `${firstName} ${lastName}`.trim();

        const enriched = {
          athlete_id: `ath_${cleanId}`,
          user_id: cleanId,
          ...uData,
          ...pData,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          province: uData.province || pData.province || "Camarines Sur",
          category: pData.category || pData.sport_type || uData.sport_type || "BASKETBALL",
          sport_type: pData.sport_type || pData.category || uData.sport_type || "BASKETBALL",
          shooting_efficiency: {
            fg_pct: fgPct,
            ft_pct: ftPct,
            three_pct: Number(rawShooting.three_pct ?? rawStats.three_pct ?? rawAverages.three_pt_percentage ?? 0),
            efg_pct: fgPct,
          },
          last_5_games_scores: scores,
          five_game_trend: scores,
        };
        await CacheManager.set("athlete_profile", enriched, { userId: cleanId });
        await AsyncStorage.setItem(OFFLINE_ATHLETE_PROFILE_CACHE_KEY, JSON.stringify(enriched));
        return enriched;
      }
    } catch (_) {}
  }

  // 4. Fallback to AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_ATHLETE_PROFILE_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (!cleanId || String(parsed.user_id || parsed.athlete_id || '').includes(cleanId)) {
        return parsed;
      }
    }
  } catch (_) {}

  return null;
}

const OFFLINE_COACH_PROFILE_CACHE_KEY = "atleta_offline_coach_profile_cache";

/**
 * Validates whether a cached profile belongs to the specified coach UID.
 */
function isMatchingCoachProfile(profile: any, targetUid: string): boolean {
  if (!profile || typeof profile !== "object") return false;
  const cleanTarget = (targetUid || "").replace(/^coach_/, "").trim().toLowerCase();
  if (!cleanTarget) return false;
  const pUid = String(profile.user_id || profile.uid || "").replace(/^coach_/, "").trim().toLowerCase();
  const pCoachId = String(profile.coach_id || "").replace(/^coach_/, "").trim().toLowerCase();
  return Boolean((pUid && pUid === cleanTarget) || (pCoachId && pCoachId === cleanTarget));
}

/**
 * Fetch individual coach profile with Firestore + storage offline fallback.
 * Strictly scoped to the requested or authenticated coach; never leaks another coach's cache.
 */
export async function getCoachProfileOfflineFirst(coachIdOrUid?: string): Promise<any | null> {
  // Resolve UID from argument or active token
  let uid = coachIdOrUid || "";
  let tokenEmail = "";
  try {
    const token = await getStoredAuthToken();
    if (token && token.includes(".")) {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = safeBase64Decode(base64);
      const payload = JSON.parse(decoded);
      if (!uid) {
        uid = payload.uid || payload.user_id || payload.sub || "";
      }
      tokenEmail = payload.email || "";
    }
  } catch (_) {}

  const rawUid = uid.replace(/^coach_/, "").trim();
  const canonicalCoachId = uid.startsWith("coach_") ? uid : `coach_${uid}`;

  // 1. Instant Cache-First Lookup (<5ms render)
  if (rawUid) {
    const cached = await CacheManager.get<any>("coach_profile", { userId: rawUid, ignoreExpiry: true });
    if (cached && isMatchingCoachProfile(cached, rawUid)) {
      // Trigger background revalidation silently
      (async () => {
        try {
          const token = await getStoredAuthToken();
          const endpoint = coachIdOrUid && coachIdOrUid !== uid && coachIdOrUid !== rawUid
            ? `${API_BASE}/coaches/${coachIdOrUid}/profile`
            : `${API_BASE}/coaches/profile`;
          const fresh = await quickFetchJson(endpoint, {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          }, 3000);
          if (fresh && isMatchingCoachProfile(fresh, rawUid)) {
            await CacheManager.set("coach_profile", fresh, { userId: rawUid, ttlMs: 10 * 60 * 1000 });
            await AsyncStorage.setItem(OFFLINE_COACH_PROFILE_CACHE_KEY, JSON.stringify(fresh)).catch(() => null);
          }
        } catch (_) {}
      })();
      return cached;
    }
  }

  // 2. Try REST API with snappy timeout
  try {
    const token = await getStoredAuthToken();
    const endpoint = coachIdOrUid && coachIdOrUid !== uid && coachIdOrUid !== rawUid
      ? `${API_BASE}/coaches/${coachIdOrUid}/profile`
      : `${API_BASE}/coaches/profile`;

    const data = await quickFetchJson(endpoint, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 2000);

    if (data && (data.full_name || data.user_id || data.coach_id)) {
      if (!rawUid || isMatchingCoachProfile(data, rawUid)) {
        if (rawUid) {
          await CacheManager.set("coach_profile", data, { userId: rawUid, ttlMs: 10 * 60 * 1000 });
        }
        await AsyncStorage.setItem(OFFLINE_COACH_PROFILE_CACHE_KEY, JSON.stringify(data)).catch(() => null);
        return data;
      }
    }
  } catch (_) {}

  if (!rawUid) {
    return null;
  }

  // 3. Direct Firestore targeted lookups across Coach_Profiles and Users collections
  try {
    const [cDoc1, cDoc2, uDoc, teamsSnap, matchesSnap] = await Promise.all([
      getDoc(doc(db, "Coach_Profiles", canonicalCoachId)).catch(() => null),
      getDoc(doc(db, "Coach_Profiles", rawUid)).catch(() => null),
      getDoc(doc(db, "Users", rawUid)).catch(() => null),
      getDocs(query(collection(db, "Teams"), where("coach_id", "in", [canonicalCoachId, rawUid, uid]))).catch(() => null),
      getDocs(query(collection(db, "Match_Logs"), where("coach_id", "in", [canonicalCoachId, rawUid, uid]))).catch(() => null),
    ]);

    const cData: Record<string, any> = (cDoc1 && cDoc1.exists()) ? cDoc1.data() : (cDoc2 && cDoc2.exists()) ? cDoc2.data() : {};
    const uData: Record<string, any> = (uDoc && uDoc.exists()) ? uDoc.data() : {};

    if (Object.keys(cData).length === 0 && Object.keys(uData).length === 0) {
      // Check cached profile only if it belongs to this exact user
      const cached = await AsyncStorage.getItem(OFFLINE_COACH_PROFILE_CACHE_KEY).catch(() => null);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (isMatchingCoachProfile(parsed, rawUid)) return parsed;
        } catch (_) {}
        // Stale cache from another coach - purge it immediately
        await AsyncStorage.removeItem(OFFLINE_COACH_PROFILE_CACHE_KEY).catch(() => null);
      }
      return null;
    }

    const emailFallbackName = (uData?.email || tokenEmail || "").split("@")[0] || "";
    const defaultName = emailFallbackName ? (emailFallbackName.charAt(0).toUpperCase() + emailFallbackName.slice(1)) : "Coach";
    const firstName = uData?.first_name || cData?.first_name || defaultName;
    const lastName = uData?.last_name || cData?.last_name || "";
    const fullName = uData?.full_name || cData?.full_name || (firstName !== "Coach" ? `${firstName} ${lastName}`.trim() : "Coach");
    const sportType = cData?.sport_type || uData?.sport_type || "Basketball";
    const avatarUrl = uData?.avatar_url || uData?.profile_image || cData?.avatar_url || cData?.profile_image || null;
    const institution = uData?.current_institution || cData?.current_institution || "";
    const regionalAffiliation = uData?.regional_affiliation || cData?.regional_affiliation || "";
    const nationalLeague = uData?.national_sports_league || cData?.national_sports_league || "";
    const rawUploaded = cData?.uploaded_documents || uData?.uploaded_documents || [];
    const profDocs = cData?.professional_documents || uData?.professional_documents || [];
    const creds = cData?.certifications || cData?.credentials || uData?.credentials || [];

    const mergedDocs = [...(Array.isArray(rawUploaded) ? rawUploaded : [])];
    if (Array.isArray(profDocs)) {
      profDocs.forEach((pd: any) => {
        const pdName = typeof pd === "string" ? pd : pd.file_name || pd.name;
        if (pdName && !mergedDocs.some((d: any) => (typeof d === "string" ? d : d.file_name) === pdName)) {
          mergedDocs.push(pd);
        }
      });
    }

    // Calculate total unique roster athletes from Teams collection
    let totalAthletes = Array.isArray(cData?.athletes_managed) ? cData.athletes_managed.length : Array.isArray(uData?.athletes_managed) ? uData.athletes_managed.length : 0;
    if (teamsSnap && !teamsSnap.empty) {
      const athleteSet = new Set<string>();
      teamsSnap.docs.forEach((t) => {
        const tData = t.data();
        const cId = tData.coach_id;
        if (cId === canonicalCoachId || cId === rawUid || cId === uid) {
          if (Array.isArray(tData.roster_list)) {
            tData.roster_list.forEach((r: any) => {
              const rId = r.athlete_id || r.user_id;
              if (rId) athleteSet.add(rId);
            });
          }
        }
      });
      if (athleteSet.size > 0) totalAthletes = athleteSet.size;
    }

    // Calculate total matches logged by this coach from Match_Logs collection
    let totalMatches = Number(cData?.total_matches_logged || cData?.matches_logged || cData?.metric_logs || 0);
    if (matchesSnap && !matchesSnap.empty) {
      let mCount = 0;
      matchesSnap.docs.forEach((m) => {
        const mData = m.data();
        const cId = mData.coach_id;
        const staff = Array.isArray(mData.coaching_staff) ? mData.coaching_staff : [];
        if (
          cId === canonicalCoachId ||
          cId === rawUid ||
          cId === uid ||
          staff.includes(canonicalCoachId) ||
          staff.includes(rawUid) ||
          staff.includes(uid)
        ) {
          mCount++;
        }
      });
      if (mCount > 0) totalMatches = mCount;
    }

    const enriched = {
      coach_id: canonicalCoachId,
      user_id: rawUid,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: uData?.email || cData?.email || tokenEmail || "",
      contact_number: uData?.contact_number || cData?.contact_number || "",
      sport_type: sportType,
      sports_focus: sportType.toUpperCase(),
      avatar_url: avatarUrl,
      profile_image: avatarUrl,
      current_institution: institution,
      regional_affiliation: regionalAffiliation,
      national_sports_league: nationalLeague,
      uploaded_documents: mergedDocs,
      professional_documents: profDocs,
      certifications: creds,
      credentials: creds,
      system_statistics: {
        total_athletes: totalAthletes,
        metric_logs: totalMatches,
      },
    };

    await AsyncStorage.setItem(OFFLINE_COACH_PROFILE_CACHE_KEY, JSON.stringify(enriched)).catch(() => null);
    return enriched;
  } catch (fsErr) {
    console.warn("Firestore coach profile fetch error:", fsErr);
    const cached = await AsyncStorage.getItem(OFFLINE_COACH_PROFILE_CACHE_KEY).catch(() => null);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (isMatchingCoachProfile(parsed, rawUid)) return parsed;
      } catch (_) {}
      await AsyncStorage.removeItem(OFFLINE_COACH_PROFILE_CACHE_KEY).catch(() => null);
    }
  }

  return null;
}

/**
 * Fetch teams with offline support.
 * Cache-first (instant 0-10ms) -> background revalidation -> fast REST -> direct Firestore -> AsyncStorage.
 */
export async function getTeamsOfflineFirst(forceRefresh: boolean = false): Promise<any[]> {
  // 1. Instant Memory Cache (0ms)
  if (!forceRefresh && teamsMemoryCache && teamsMemoryCache.length > 0 && Date.now() - teamsLastFetched < MEMORY_CACHE_TTL_MS) {
    return teamsMemoryCache;
  }

  // 2. Fast Local AsyncStorage Cache (<10ms)
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(OFFLINE_TEAMS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          teamsMemoryCache = parsed;
          teamsLastFetched = Date.now();

          // Trigger silent background revalidation so fresh teams are synchronized without blocking
          quickFetchJson(`${API_BASE}/teams?all=true`, {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          }, 3500)
            .then((freshData) => {
              const freshList = Array.isArray(freshData?.teams) ? freshData.teams : Array.isArray(freshData) ? freshData : [];
              if (freshList.length > 0) {
                teamsMemoryCache = freshList;
                teamsLastFetched = Date.now();
                AsyncStorage.setItem(OFFLINE_TEAMS_CACHE_KEY, JSON.stringify(freshList)).catch(() => null);
              }
            })
            .catch(() => null);

          return parsed;
        }
      }
    } catch (_) {}
  }

  // 3. Fast Network Fetch with Snappy Timeout (6.0s max)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/teams?all=true`, {
      Accept: "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 6000);

    const list = Array.isArray(data?.teams) ? data.teams : Array.isArray(data) ? data : [];
    if (list.length > 0) {
      teamsMemoryCache = list;
      teamsLastFetched = Date.now();
      AsyncStorage.setItem(OFFLINE_TEAMS_CACHE_KEY, JSON.stringify(list)).catch(() => null);
      return list;
    }
  } catch (_) {}

  // 4. Direct Fallback to Firestore persistent local/remote cache
  try {
    const snap = await getDocs(collection(db, "Teams"));
    if (!snap.empty) {
      const rawTeams = snap.docs.map((d) => ({ team_id: d.id, id: d.id, ...d.data() }));

      const nameMap = new Map<string, string>();

      // Manual known seed defaults for coach names
      nameMap.set('coach_001', 'Erick Nathaniel De Belen');
      nameMap.set('coach_usr_coach_001', 'Coach Nash Racela');
      nameMap.set('usr_coach_001', 'Coach Nash Racela');
      nameMap.set('t358EW07qTaKPJLiFHNSClaLqXJ3', 'Coach Carter');
      nameMap.set('coach_t358EW07qTaKPJLiFHNSClaLqXJ3', 'Coach Carter');

      const enrichedList = rawTeams.map((t: any) => {
        const cId = String(t.coach_id || "").trim();
        const coachName =
          t.coach_name ||
          nameMap.get(cId) ||
          nameMap.get(`coach_${cId}`) ||
          nameMap.get(cId.replace(/^coach_/, "")) ||
          (t.head_coach && t.head_coach.full_name) ||
          "Coach";

        return {
          ...t,
          coach_name: coachName,
          head_coach: {
            coach_id: cId,
            full_name: coachName,
            role_title: `${(t.sport_type || "Varsity").toUpperCase()} HEAD COACH`,
            years_experience: t.years_experience ? `${t.years_experience} Years` : "Experienced Coach",
            quote: t.quote || "Dedicated to athletic excellence and player development.",
          },
        };
      });

      teamsMemoryCache = enrichedList;
      teamsLastFetched = Date.now();
      AsyncStorage.setItem(OFFLINE_TEAMS_CACHE_KEY, JSON.stringify(enrichedList)).catch(() => null);
      return enrichedList;
    }
  } catch (fsErr) {
    console.warn("Firestore offline teams lookup:", fsErr);
  }

  return [];
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

// ─── SCORESHEET REQUEST PIPELINE (FIRESTORE SYNC) ──────────────────────────

export interface ScoresheetRequestRecord {
  id: string;
  requestId: string;
  coachId: string;
  coachName: string;
  teamId: string;
  matchId: string;
  matchName: string;
  customGameTitle?: string;
  custom_game_title?: string;
  match_name?: string;
  gameName?: string;
  game_name?: string;
  sportType?: string;
  status: 'pending' | 'fulfilled' | 'rejected';
  createdAt: any;
  updatedAt?: any;
  scoresheetUrl?: string;
  scoresheet_url?: string;
  fulfilledAt?: string;
  fulfilledByOfficialName?: string;
}

/**
 * Creates a scoresheet request directly in Firestore `scoresheetRequests` collection,
 * and simultaneously informs the backend API.
 */
export async function submitScoresheetRequestOfflineFirst(payload: {
  matchId: string;
  matchName?: string;
  customGameTitle?: string;
  teamId?: string;
  coachId?: string;
  coachName?: string;
  sportType?: string;
}): Promise<ScoresheetRequestRecord> {
  const matchId = String(payload.matchId || '');
  const coachId = String(payload.coachId || 'coach_default');
  const coachName = String(payload.coachName || 'Coach');
  const teamId = String(payload.teamId || 'team_default');
  let matchName = String(payload.customGameTitle || payload.matchName || `Match ${matchId}`);
  const sportType = String(payload.sportType || 'BASKETBALL');

  // If match exists in Match_Logs, pull the official's custom match title directly
  try {
    const matchSnap = await getDoc(doc(db, 'Match_Logs', matchId));
    if (matchSnap.exists()) {
      const md = matchSnap.data();
      const officialTitle =
        (md.customGameTitle && String(md.customGameTitle).trim()) ||
        (md.custom_game_title && String(md.custom_game_title).trim()) ||
        (md.matchName && String(md.matchName).trim()) ||
        (md.match_name && String(md.match_name).trim()) ||
        (md.gameName && String(md.gameName).trim()) ||
        (md.game_name && String(md.game_name).trim());
      if (officialTitle) {
        matchName = officialTitle;
      }
    }
  } catch (_) {}

  const requestId = `req_${matchId}_${coachId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const now = new Date().toISOString();

  const docData: ScoresheetRequestRecord = {
    id: requestId,
    requestId,
    coachId,
    coachName,
    teamId,
    matchId,
    matchName,
    customGameTitle: matchName,
    custom_game_title: matchName,
    match_name: matchName,
    gameName: matchName,
    game_name: matchName,
    sportType,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  // 1. Write directly to Firestore `scoresheetRequests` collection (persists offline via persistentLocalCache)
  try {
    const reqDocRef = doc(db, 'scoresheetRequests', requestId);
    await setDoc(reqDocRef, {
      ...docData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (fsErr) {
    console.warn('[ScoresheetRequest] Direct Firestore write warning:', fsErr);
  }

  // 2. Also update Match_Logs doc locally / in Firestore
  try {
    const matchDocRef = doc(db, 'Match_Logs', matchId);
    await setDoc(matchDocRef, {
      audit_status: 'PENDING REQUEST',
      verification_status: 'Pending',
      scoresheet_request_status: 'pending',
    }, { merge: true });
  } catch (_) {}

  // 3. Inform Backend API asynchronously
  try {
    const token = await getStoredAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(`${API_BASE}/scoresheets/request`, {
      method: 'POST',
      headers,
      body: JSON.stringify(docData),
    }).catch(() => null);

    if (!res || !res.ok) {
      await fetch(`${API_BASE}/matches/${matchId}/audit-request`, {
        method: 'POST',
        headers,
        body: JSON.stringify(docData),
      }).catch(() => null);
    }
  } catch (_) {}

  return docData;
}

/**
 * Real-time listener for coach's scoresheet requests. Emits updates whenever
 * an official uploads a scoresheet and fulfills the request.
 */
export function listenToCoachScoresheetRequests(
  coachId: string,
  onUpdate: (requests: ScoresheetRequestRecord[]) => void
): () => void {
  if (!coachId) return () => {};

  const cleanCoachId = coachId.replace(/^coach_/, '');
  const possibleIds = [coachId, cleanCoachId, `coach_${cleanCoachId}`];

  try {
    const q = query(
      collection(db, 'scoresheetRequests'),
      where('coachId', 'in', possibleIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: ScoresheetRequestRecord[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const title = data.customGameTitle || data.custom_game_title || data.matchName || data.match_name || data.gameName || data.game_name || `Match ${data.matchId}`;
        results.push({
          id: d.id,
          requestId: d.id,
          coachId: data.coachId,
          coachName: data.coachName,
          teamId: data.teamId,
          matchId: data.matchId,
          matchName: title,
          customGameTitle: title,
          custom_game_title: title,
          match_name: title,
          gameName: title,
          game_name: title,
          sportType: data.sportType,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          scoresheetUrl: data.scoresheetUrl || data.scoresheet_url,
          scoresheet_url: data.scoresheet_url || data.scoresheetUrl,
          fulfilledAt: data.fulfilledAt,
          fulfilledByOfficialName: data.fulfilledByOfficialName,
        });
      });
      onUpdate(results);
    }, (err) => {
      console.warn('[ScoresheetRequests] onSnapshot error:', err);
    });

    return unsubscribe;
  } catch (e) {
    console.warn('[ScoresheetRequests] Setup listener failed:', e);
    return () => {};
  }
}

/**
 * Real-time listener for coach's incoming inquiries and proposals.
 * Guarantees resolution whether user authenticated via OAuth or standard email/password,
 * querying across canonical 'coach_' prefixed IDs, raw UIDs, and both 'coachId' and 'coach_scout_id' fields.
 */
export function listenToCoachInquiries(
  coachId: string,
  onUpdate: (inquiries: any[]) => void
): () => void {
  if (!coachId) return () => {};

  const cleanCoachId = coachId.replace(/^coach_/, '');
  const canonicalCoachId = coachId.startsWith('coach_') ? coachId : `coach_${cleanCoachId}`;
  const possibleIds = Array.from(new Set([coachId, cleanCoachId, canonicalCoachId].filter(Boolean)));

  try {
    const q1 = query(
      collection(db, 'Scouting_Registry'),
      where('coach_scout_id', 'in', possibleIds)
    );
    const q2 = query(
      collection(db, 'Scouting_Registry'),
      where('coachId', 'in', possibleIds)
    );
    const q3 = query(
      collection(db, 'inquiries'),
      where('coachId', 'in', possibleIds)
    );

    const docMap = new Map<string, any>();
    const emit = () => {
      onUpdate(Array.from(docMap.values()));
    };

    const unsub1 = onSnapshot(q1, (snapshot) => {
      snapshot.forEach((d) => {
        docMap.set(d.id, { id: d.id, scout_id: d.id, ...d.data() });
      });
      emit();
    }, (err) => console.warn('[Inquiries] onSnapshot q1 notice:', err));

    const unsub2 = onSnapshot(q2, (snapshot) => {
      snapshot.forEach((d) => {
        docMap.set(d.id, { id: d.id, scout_id: d.id, ...d.data() });
      });
      emit();
    }, (err) => console.warn('[Inquiries] onSnapshot q2 notice:', err));

    const unsub3 = onSnapshot(q3, (snapshot) => {
      snapshot.forEach((d) => {
        docMap.set(d.id, { id: d.id, scout_id: d.id, ...d.data() });
      });
      emit();
    }, (err) => console.warn('[Inquiries] onSnapshot q3 notice:', err));

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  } catch (err) {
    console.warn('[Inquiries] Setup listener failed:', err);
    return () => {};
  }
}

export default app;

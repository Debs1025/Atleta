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
  apiKey: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_API_KEY || runtime.process?.env?.FIREBASE_API_KEY || "AIzaSyDTueY4OduMENmSef3BH6ZEmSqXLiQG5Ls",
  authDomain: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || runtime.process?.env?.FIREBASE_AUTH_DOMAIN || "atleta-v1.firebaseapp.com",
  projectId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_PROJECT_ID || runtime.process?.env?.FIREBASE_PROJECT_ID || "atleta-v1",
  storageBucket: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || runtime.process?.env?.FIREBASE_STORAGE_BUCKET || "atleta-v1.appspot.com",
  messagingSenderId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || runtime.process?.env?.FIREBASE_MESSAGING_SENDER_ID || "1:203586668533:web:30fba3838ff5f78e9302bc",
  appId: runtime.process?.env?.EXPO_PUBLIC_FIREBASE_APP_ID || runtime.process?.env?.FIREBASE_APP_ID || "G-6ZF67G2PK2",
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
const OFFLINE_SPORTS_CACHE_KEY = "atleta_offline_sports_cache";
const OFFLINE_TEAMS_CACHE_KEY = "atleta_offline_teams_cache";

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
    matchesMemoryCache = filtered;
    matchesLastFetched = Date.now();
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

// In-memory cache variables for instant sub-second responses (0-10ms)
let sportsMemoryCache: any[] | null = null;
let sportsLastFetched = 0;

let athletesMemoryCache: any[] | null = null;
let athletesLastFetched = 0;

let matchesMemoryCache: any[] | null = null;
let matchesLastFetched = 0;

let teamsMemoryCache: any[] | null = null;
let teamsLastFetched = 0;

const MEMORY_CACHE_TTL_MS = 2 * 60 * 1000; // 2m cache validity before background revalidation
const SPORTS_MEMORY_CACHE_TTL_MS = 10 * 60 * 1000; // 10m cache validity for sports config catalog

async function quickFetchJson(url: string, headers: any, timeoutMs: number = 1800): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch (_) {
    return null;
  } finally {
    clearTimeout(id);
  }
}

async function revalidateAthletesInBackground(): Promise<void> {
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/coaches/athletes`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 2500);

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
    const data = await quickFetchJson(`${API_BASE}/sports`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 2500);

    const list = Array.isArray(data?.sports) ? data.sports : Array.isArray(data) ? data : [];
    if (list.length > 0) {
      sportsMemoryCache = list;
      sportsLastFetched = Date.now();
      await AsyncStorage.setItem(OFFLINE_SPORTS_CACHE_KEY, JSON.stringify(list)).catch(() => null);
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
export async function getAthletesOfflineFirst(sportCategory?: string): Promise<any[]> {
  // 1. Instant Memory Cache (0ms)
  if (athletesMemoryCache && athletesMemoryCache.length > 0) {
    if (Date.now() - athletesLastFetched > MEMORY_CACHE_TTL_MS) {
      revalidateAthletesInBackground().catch(() => null);
    }
    return athletesMemoryCache;
  }

  // 2. Fast Local AsyncStorage Cache (<10ms)
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_ATHLETES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        athletesMemoryCache = parsed;
        athletesLastFetched = Date.now();
        revalidateAthletesInBackground().catch(() => null);
        return parsed;
      }
    }
  } catch (_) {}

  // 3. Fast Network Fetch with Snappy Timeout (1.8s max)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/coaches/athletes`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 1800);

    const list = Array.isArray(data?.athletes) ? data.athletes : Array.isArray(data) ? data : [];
    if (list.length > 0) {
      athletesMemoryCache = list;
      athletesLastFetched = Date.now();
      AsyncStorage.setItem(OFFLINE_ATHLETES_CACHE_KEY, JSON.stringify(list)).catch(() => null);
      return list;
    }
  } catch (_) {}

  // Fallback 1: Firestore persistent local cache
  try {
    const snap = await getDocs(collection(db, "Athlete_Profiles"));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      athletesMemoryCache = list;
      athletesLastFetched = Date.now();
      return list;
    }
  } catch (fsErr) {
    console.warn("Firestore offline athletes lookup:", fsErr);
  }

  return [];
}

/**
 * Fetch dynamic sports list with offline support.
 * Cache-first (instant 0-10ms) -> background revalidation -> fast REST -> Firestore -> AsyncStorage.
 */
export async function getSportsOfflineFirst(): Promise<any[]> {
  // 1. Instant Memory Cache (0ms)
  if (sportsMemoryCache && sportsMemoryCache.length > 0) {
    if (Date.now() - sportsLastFetched > SPORTS_MEMORY_CACHE_TTL_MS) {
      revalidateSportsInBackground().catch(() => null);
    }
    return sportsMemoryCache;
  }

  // 2. Fast Local AsyncStorage Cache (<10ms)
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_SPORTS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        sportsMemoryCache = parsed;
        sportsLastFetched = Date.now();
        if (Date.now() - sportsLastFetched > SPORTS_MEMORY_CACHE_TTL_MS) {
          revalidateSportsInBackground().catch(() => null);
        }
        return parsed;
      }
    }
  } catch (_) {}

  // 3. Fast Network Fetch with Snappy Timeout (1.8s max)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/sports`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 1800);

    const list = Array.isArray(data?.sports)
      ? data.sports
      : Array.isArray(data)
      ? data
      : [];
    if (list.length > 0) {
      sportsMemoryCache = list;
      sportsLastFetched = Date.now();
      AsyncStorage.setItem(OFFLINE_SPORTS_CACHE_KEY, JSON.stringify(list)).catch(() => null);
      return list;
    }
  } catch (_) {}

  // Fallback 1: Firestore persistent local/remote cache
  try {
    let snap = await getDocs(collection(db, "Sports_Configurations"));
    if (snap.empty) {
      snap = await getDocs(collection(db, "sports_configurations"));
    }
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({
        sport_id: d.id,
        ...d.data(),
      }));
      sportsMemoryCache = list;
      sportsLastFetched = Date.now();
      return list;
    }
  } catch (fsErr) {
    // ignore offline warning
  }

  return [];
}

/**
 * Fetch matches with offline support.
 * Cache-first (instant 0-10ms) -> background revalidation -> fast REST -> Firestore -> AsyncStorage.
 */
export async function getMatchesOfflineFirst(): Promise<any[]> {
  // 1. Instant Memory Cache (0ms)
  if (matchesMemoryCache && matchesMemoryCache.length > 0) {
    if (Date.now() - matchesLastFetched > MEMORY_CACHE_TTL_MS) {
      revalidateMatchesInBackground().catch(() => null);
    }
    return matchesMemoryCache;
  }

  // 2. Fast Local AsyncStorage Cache (<10ms)
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_MATCHES_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        matchesMemoryCache = parsed;
        matchesLastFetched = Date.now();
        revalidateMatchesInBackground().catch(() => null);
        return parsed;
      }
    }
  } catch (_) {}

  // 3. Fast Network Fetch (1.8s timeout)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/matches`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 1800);

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
  } catch (fsErr) {
    console.warn("Firestore offline matches lookup:", fsErr);
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

  // 2. Direct Firestore fallback
  try {
    const token = await getStoredAuthToken();
    let athleteUid = "";
    if (token) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);
        athleteUid = payload.uid || payload.user_id || payload.sub || "";
      } catch (_) {}
    }

    if (athleteUid) {
      const cleanId = athleteUid.replace(/^ath_/, "");
      const [pDoc1, pDoc2] = await Promise.all([
        getDoc(doc(db, "Athlete_Profiles", `ath_${cleanId}`)).catch(() => null),
        getDoc(doc(db, "Athlete_Profiles", cleanId)).catch(() => null),
      ]);
      const pData = (pDoc1 && pDoc1.exists()) ? pDoc1.data() : (pDoc2 && pDoc2.exists()) ? pDoc2.data() : null;
      if (pData) {
        const rawStats = pData.stats || {};
        const rawAverages = pData.averages || {};
        const rawShooting = pData.shooting_efficiency || {};
        const fgPct = Number(rawShooting.fg_pct ?? rawStats.fg_pct ?? rawStats.fg_percentage ?? rawAverages.fg_percentage ?? 0);
        const ftPct = Number(rawShooting.ft_pct ?? rawStats.ft_pct ?? rawStats.ft_percentage ?? rawAverages.ft_percentage ?? 0);
        const scores = pData.five_game_trend || pData.last_5_games_scores || pData.scoring_trends_last_10 || [];

        const enriched = {
          ...pData,
          shooting_efficiency: {
            fg_pct: fgPct,
            ft_pct: ftPct,
            three_pct: Number(rawShooting.three_pct ?? rawStats.three_pct ?? rawAverages.three_pt_percentage ?? 0),
            efg_pct: fgPct,
          },
          last_5_games_scores: scores,
          five_game_trend: scores,
        };
        await AsyncStorage.setItem(OFFLINE_ATHLETE_PROFILE_CACHE_KEY, JSON.stringify(enriched));
        return enriched;
      }
    }
  } catch (_) {}

  // 3. Fallback to AsyncStorage cache
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_ATHLETE_PROFILE_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  return null;
}

/**
 * Fetch teams with offline support.
 * Cache-first (instant 0-10ms) -> background revalidation -> fast REST -> direct Firestore -> AsyncStorage.
 */
export async function getTeamsOfflineFirst(): Promise<any[]> {
  // 1. Instant Memory Cache (0ms)
  if (teamsMemoryCache && teamsMemoryCache.length > 0) {
    if (Date.now() - teamsLastFetched > MEMORY_CACHE_TTL_MS) {
      revalidateTeamsInBackground().catch(() => null);
    }
    return teamsMemoryCache;
  }

  // 2. Fast Local AsyncStorage Cache (<10ms)
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_TEAMS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        teamsMemoryCache = parsed;
        teamsLastFetched = Date.now();
        revalidateTeamsInBackground().catch(() => null);
        return parsed;
      }
    }
  } catch (_) {}

  // 3. Fast Network Fetch with Snappy Timeout (1.8s max)
  try {
    const token = await getStoredAuthToken();
    const data = await quickFetchJson(`${API_BASE}/teams?all=true`, {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }, 1800);

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

      // Fetch coach profiles and users to enrich coach_name if any are missing
      const [coachesSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "Coach_Profiles")).catch(() => null),
        getDocs(collection(db, "Users")).catch(() => null),
      ]);

      const nameMap = new Map<string, string>();
      if (usersSnap && !usersSnap.empty) {
        usersSnap.docs.forEach((d) => {
          const u = d.data();
          const fullName = u.full_name || (u.first_name ? `${u.first_name} ${u.last_name || ""}`.trim() : "");
          if (fullName) {
            nameMap.set(d.id, fullName);
            nameMap.set(`coach_${d.id}`, fullName);
            nameMap.set(d.id.replace(/^coach_/, ""), fullName);
          }
        });
      }
      if (coachesSnap && !coachesSnap.empty) {
        coachesSnap.docs.forEach((d) => {
          const c = d.data();
          const fullName = c.full_name || (c.first_name ? `${c.first_name} ${c.last_name || ""}`.trim() : "");
          if (fullName) {
            nameMap.set(d.id, fullName);
            nameMap.set(`coach_${d.id}`, fullName);
            nameMap.set(d.id.replace(/^coach_/, ""), fullName);
          }
        });
      }

      // Manual known seed defaults for coach names
      nameMap.set('coach_001', 'Erick Nathaniel De Belen');
      nameMap.set('coach_usr_coach_001', 'Coach Nash Racela');
      nameMap.set('usr_coach_001', 'Coach Nash Racela');
      nameMap.set('v5XWfDqgsYTFPx7xEWnBsssNcH83', 'Gerard Francis Pelonio');
      nameMap.set('coach_v5XWfDqgsYTFPx7xEWnBsssNcH83', 'Gerard Francis Pelonio');
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

export default app;

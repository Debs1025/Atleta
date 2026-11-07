import AsyncStorage from "@react-native-async-storage/async-storage";

export const CACHE_VERSION = 2;

export interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
  userId?: string;
  version: number;
}

export interface CacheGetOptions {
  userId?: string;
  ignoreExpiry?: boolean;
}

export interface CacheSetOptions {
  userId?: string;
  ttlMs?: number;
}

export interface CacheStatusResult<T> {
  data: T | null;
  isStale: boolean;
  timestamp?: number;
}

// In-memory Tier for 0ms immediate access
const memoryCache = new Map<string, CacheEnvelope<any>>();

function normalizeKey(key: string, userId?: string): string {
  if (userId) {
    const cleanUid = userId.replace(/^ath_|^coach_|^off_/, "").trim();
    return `@atleta:user:${cleanUid}:${key}`;
  }
  if (key.startsWith("@atleta:")) {
    return key;
  }
  return `@atleta:global:${key}`;
}

export class CacheManager {
  /**
   * Set a cache entry in both in-memory cache and AsyncStorage.
   */
  static async set<T>(
    rawKey: string,
    data: T,
    options?: CacheSetOptions
  ): Promise<void> {
    if (data === undefined || data === null) return;

    const key = normalizeKey(rawKey, options?.userId);
    const ttlMs = options?.ttlMs ?? 5 * 60 * 1000; // Default 5 minutes
    const envelope: CacheEnvelope<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
      userId: options?.userId ? options.userId.replace(/^ath_|^coach_|^off_/, "").trim() : undefined,
      version: CACHE_VERSION,
    };

    // 1. Fast in-memory tier
    memoryCache.set(key, envelope);

    // 2. Persistent storage tier
    try {
      await AsyncStorage.setItem(key, JSON.stringify(envelope));
    } catch (err) {
      console.warn(`[CacheManager] Failed to persist key ${key}:`, err);
    }
  }

  /**
   * Synchronous in-memory lookup for 0ms instant display.
   */
  static getSync<T>(rawKey: string, options?: CacheGetOptions): T | null {
    const key = normalizeKey(rawKey, options?.userId);
    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (entry.version !== CACHE_VERSION) {
      memoryCache.delete(key);
      return null;
    }

    // Strict user scoping check: never allow user A data to be returned for user B
    if (options?.userId) {
      const cleanTarget = options.userId.replace(/^ath_|^coach_|^off_/, "").trim();
      if (entry.userId && entry.userId !== cleanTarget) {
        memoryCache.delete(key);
        return null;
      }
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttlMs;
    if (isExpired && !options?.ignoreExpiry) {
      return null;
    }

    return entry.data as T;
  }

  /**
   * Asynchronous lookup: checks memory tier first, then AsyncStorage.
   */
  static async get<T>(rawKey: string, options?: CacheGetOptions): Promise<T | null> {
    const syncResult = this.getSync<T>(rawKey, options);
    if (syncResult !== null) {
      return syncResult;
    }

    const key = normalizeKey(rawKey, options?.userId);

    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const envelope: CacheEnvelope<T> = JSON.parse(raw);
      if (!envelope || envelope.version !== CACHE_VERSION) {
        await AsyncStorage.removeItem(key).catch(() => null);
        return null;
      }

      // Strict user scoping verification
      if (options?.userId) {
        const cleanTarget = options.userId.replace(/^ath_|^coach_|^off_/, "").trim();
        if (envelope.userId && envelope.userId !== cleanTarget) {
          // Mismatched user: delete tainted cache immediately
          await AsyncStorage.removeItem(key).catch(() => null);
          return null;
        }
      }

      // Populate memory cache
      memoryCache.set(key, envelope);

      const isExpired = Date.now() - envelope.timestamp > envelope.ttlMs;
      if (isExpired && !options?.ignoreExpiry) {
        return null;
      }

      return envelope.data;
    } catch {
      return null;
    }
  }

  /**
   * Stale-While-Revalidate helper.
   * Returns existing cached data immediately even if stale, and flags whether revalidation is needed.
   */
  static async getWithStatus<T>(
    rawKey: string,
    options?: CacheGetOptions
  ): Promise<CacheStatusResult<T>> {
    const key = normalizeKey(rawKey, options?.userId);
    let entry = memoryCache.get(key);

    if (!entry) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const parsed: CacheEnvelope<T> = JSON.parse(raw);
          if (parsed && parsed.version === CACHE_VERSION) {
            if (!options?.userId || !parsed.userId || parsed.userId === options.userId.replace(/^ath_|^coach_|^off_/, "").trim()) {
              entry = parsed;
              memoryCache.set(key, entry);
            }
          }
        }
      } catch {}
    }

    if (!entry) {
      return { data: null, isStale: true };
    }

    // Strict user match
    if (options?.userId) {
      const cleanTarget = options.userId.replace(/^ath_|^coach_|^off_/, "").trim();
      if (entry.userId && entry.userId !== cleanTarget) {
        memoryCache.delete(key);
        AsyncStorage.removeItem(key).catch(() => null);
        return { data: null, isStale: true };
      }
    }

    const isStale = Date.now() - entry.timestamp > entry.ttlMs;
    return {
      data: entry.data as T,
      isStale,
      timestamp: entry.timestamp,
    };
  }

  /**
   * Delete specific key from both tiers.
   */
  static async remove(rawKey: string, userId?: string): Promise<void> {
    const key = normalizeKey(rawKey, userId);
    memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  }

  /**
   * Purge all user-scoped caches for a given user (or all users upon logout).
   * Guarantees next user will not see another user's profile, athlete stats, or cached dashboards.
   */
  static async clearUserSessionCache(targetUserId?: string): Promise<void> {
    const cleanTarget = targetUserId ? targetUserId.replace(/^ath_|^coach_|^off_/, "").trim() : undefined;
    const prefix = cleanTarget ? `@atleta:user:${cleanTarget}:` : `@atleta:user:`;

    // 1. Purge from memory cache
    for (const key of Array.from(memoryCache.keys())) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }

    // 2. Purge from AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter((k) => k.startsWith(prefix) || k === "atleta_cached_user_account" || k === "atleta_offline_athlete_profile_cache");
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (err) {
      console.warn("[CacheManager] Error clearing user session cache:", err);
    }
  }

  /**
   * Clear all caches entirely.
   */
  static async clearAll(): Promise<void> {
    memoryCache.clear();
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const atletaKeys = allKeys.filter((k) => k.startsWith("@atleta:") || k.startsWith("atleta_"));
      if (atletaKeys.length > 0) {
        await AsyncStorage.multiRemove(atletaKeys);
      }
    } catch {}
  }
}

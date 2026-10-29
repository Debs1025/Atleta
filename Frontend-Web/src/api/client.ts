import type {
  AuthResponse,
  AuthUser,
  OfficialLoginPayload,
  OfficialRegisterPayload,
  PasswordResetPayload,
  ConfirmPasswordResetPayload,
  OfficialSettings,
  OfficialDashboardResponse,
  OfficialScheduleItem,
  CreateMatchPayload,
  AdminLoginPayload,
  AdminCoachQueueItem,
  AdminCoachQueueResponse,
  AdminOfficialQueueResponse,
  SportConfiguration,
  SportsListResponse,
  CreateSportPayload,
} from './types';

const envApi = (import.meta.env.VITE_ATLETA_API || import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '') as string;
const rawBase = (envApi && envApi.trim() ? envApi.trim() : '').replace(/\/+$/, '');
export const BASE_URL = rawBase
  ? (rawBase.endsWith('/api/v1') ? rawBase : `${rawBase}/api/v1`)
  : '/api/v1';

const TOKEN_KEY = 'atleta_official_token';
const REFRESH_TOKEN_KEY = 'atleta_official_refresh_token';
const USER_KEY = 'atleta_official_user';
const PERSIST_KEY = 'atleta_persist_session';
const SETTINGS_KEY = 'atleta_official_settings';
const READ_NOTIFS_KEY = 'atleta_read_notification_ids';

export const getStoredReadNotificationIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch { }
  return new Set();
};

export const storeReadNotificationId = (id: string): void => {
  if (!id) return;
  try {
    const set = getStoredReadNotificationIds();
    set.add(id);
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(set)));
  } catch { }
};

export const storeAllReadNotificationIds = (ids: string[]): void => {
  if (!ids || ids.length === 0) return;
  try {
    const set = getStoredReadNotificationIds();
    ids.forEach((id) => id && set.add(id));
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(set)));
  } catch { }
};

// In-Memory and Session Client Cache for instant screen-to-screen navigation
const cache = new Map<string, { data: any; timestamp: number; version?: string }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache for smooth screen navigation without redundant re-fetching
const CACHE_VERSION = 'v5_live_fresh';

export const getCachedData = <T>(key: string): T | null => {
  const item = cache.get(key);
  if (item && item.version === CACHE_VERSION && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data as T;
  }
  try {
    const sessionItem = sessionStorage.getItem(`atleta_cache_${key}`);
    if (sessionItem) {
      const parsed = JSON.parse(sessionItem);
      if (parsed && parsed.version === CACHE_VERSION && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        cache.set(key, parsed);
        return parsed.data as T;
      } else {
        sessionStorage.removeItem(`atleta_cache_${key}`);
      }
    }
  } catch { }

  // Check persistent localStorage for instant startup render across reloads & logins
  try {
    const localItem = localStorage.getItem(`atleta_cache_${key}`);
    if (localItem) {
      const parsed = JSON.parse(localItem);
      if (parsed && parsed.version === CACHE_VERSION && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        cache.set(key, parsed);
        return parsed.data as T;
      } else {
        localStorage.removeItem(`atleta_cache_${key}`);
      }
    }
  } catch { }
  return null;
};

export const setCachedData = (key: string, data: any): void => {
  const entry = { data, timestamp: Date.now(), version: CACHE_VERSION };
  cache.set(key, entry);
  try {
    sessionStorage.setItem(`atleta_cache_${key}`, JSON.stringify(entry));
  } catch { }
  try {
    localStorage.setItem(`atleta_cache_${key}`, JSON.stringify(entry));
  } catch { }
};

export const invalidateCache = (prefix?: string): void => {
  if (!prefix) {
    cache.clear();
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith('atleta_cache_') || k.startsWith('atleta_cached_'))) toRemove.push(k);
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch { }
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('atleta_cache_') || k.startsWith('atleta_cached_'))) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch { }
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && (k.startsWith(`atleta_cache_${prefix}`) || k.startsWith(`atleta_cached_${prefix}`))) toRemove.push(k);
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch { }
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(`atleta_cache_${prefix}`) || k.startsWith(`atleta_cached_${prefix}`))) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch { }
  }
};

export const formatMatchIdSchema = (rawId: string): string => {
  if (!rawId) return '#MATCH-001';
  const clean = String(rawId).replace(/^#/, '').trim();
  return `#${clean}`;
};

export const getStoredOfficialSettings = (): OfficialSettings | null => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) || sessionStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  const keys = [TOKEN_KEY, 'atleta_auth_token', 'token', 'auth_token', 'accessToken', 'jwt'];
  for (const k of keys) {
    const val = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (val && val !== 'null' && val !== 'undefined') return val;
  }
  return null;
};

export const getStoredRefreshToken = (): string | null => {
  const keys = [REFRESH_TOKEN_KEY, 'atleta_refresh_token', 'refreshToken', 'refresh_token'];
  for (const k of keys) {
    const val = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (val && val !== 'null' && val !== 'undefined') return val;
  }
  return null;
};

export const getStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const storeAuthSession = (token: string, user: AuthUser, persist: boolean, refreshToken?: string): void => {
  // Purge any residual cached data from other user sessions
  invalidateCache();
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('atleta_cached_') || k.startsWith('atleta_cache_') || k.startsWith('atleta_admin_'))) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}

  const finalRefreshToken = refreshToken || (user as any)?.refreshToken || (user as any)?.refresh_token;

  if (persist) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(PERSIST_KEY, 'true');
    if (finalRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, finalRefreshToken);
    }
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    if (finalRefreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, finalRefreshToken);
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERSIST_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  setCachedData('user_me', user);

  // Instantly warm official app cache (including schedules) on login
  const role = user?.role;
  if (role !== 'SystemAdmin' && role !== 'System Admin' && role !== 'Admin') {
    setTimeout(() => {
      warmOfficialAppCache().catch(() => { });
    }, 10);
  }
};

export const clearAuthSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PERSIST_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(SETTINGS_KEY);
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('atleta_')) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('atleta_')) toRemove.push(k);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
  invalidateCache();
};

/* =========================================================================
   AUTHENTICATION INTERCEPTOR & AUTOMATIC TOKEN REFRESH QUEUE
   ========================================================================= */

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];
let lastRefreshFailureTime = 0;
const REFRESH_FAILURE_COOLDOWN_MS = 6000;

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string | null) {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach((cb) => {
    try {
      cb(token);
    } catch {}
  });
}

function isBypassAuthUrl(url: string | URL | Request): boolean {
  const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url || '';
  return (
    urlStr.includes('/auth/refresh') ||
    urlStr.includes('/users/refresh') ||
    urlStr.includes('/officials/refresh') ||
    urlStr.includes('/officials/login') ||
    urlStr.includes('/admin/login') ||
    urlStr.includes('/users/login') ||
    urlStr.includes('/users/password-reset')
  );
}

function attachAuthHeader(init?: RequestInit, tokenOverride?: string): RequestInit {
  const token = tokenOverride || getStoredToken();
  if (!token) return init || {};

  const options: RequestInit = { ...(init || {}) };
  if (options.headers instanceof Headers) {
    const newHeaders = new Headers(options.headers);
    newHeaders.set('Authorization', `Bearer ${token}`);
    options.headers = newHeaders;
  } else if (Array.isArray(options.headers)) {
    const newHeaders = new Headers(options.headers);
    newHeaders.set('Authorization', `Bearer ${token}`);
    options.headers = newHeaders;
  } else {
    options.headers = {
      ...((options.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return options;
}

export async function attemptTokenRefresh(): Promise<string | null> {
  const currentToken = getStoredToken();
  const currentRefreshToken = getStoredRefreshToken();

  // If no tokens exist, cannot refresh
  if (!currentToken && !currentRefreshToken) {
    return null;
  }

  // Prevent endless refresh loops if refresh recently failed
  if (Date.now() - lastRefreshFailureTime < REFRESH_FAILURE_COOLDOWN_MS) {
    return null;
  }

  const endpoints = [
    `${BASE_URL}/auth/refresh`,
    `${BASE_URL}/users/refresh`,
    `${BASE_URL}/officials/refresh`,
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentRefreshToken ? { 'x-refresh-token': currentRefreshToken } : {}),
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        },
        body: JSON.stringify({
          refreshToken: currentRefreshToken,
          refresh_token: currentRefreshToken,
          token: currentToken,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const newToken = data.token || data.accessToken || data.access_token || data.jwt;
        const newRefreshToken = data.refreshToken || data.refresh_token;

        if (newToken) {
          const persist = localStorage.getItem(PERSIST_KEY) === 'true';
          if (persist) {
            localStorage.setItem(TOKEN_KEY, newToken);
            if (newRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
          } else {
            sessionStorage.setItem(TOKEN_KEY, newToken);
            if (newRefreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
          }
          console.info('[AuthInterceptor] Access token refreshed successfully via', ep);
          return newToken;
        }
      }
    } catch {
      // Endpoint error or network failure, proceed to try fallback endpoint
    }
  }

  lastRefreshFailureTime = Date.now();
  return null;
}

/**
 * Authenticated Fetch Interceptor:
 * Automatically attaches Authorization Bearer tokens, pauses requests while token refresh is in progress,
 * and transparently retries requests on 401 Unauthorized using /auth/refresh without user disruption.
 */
export async function authFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  // If token refresh is in flight, pause this outgoing request until the refresh completes
  if (isRefreshing && !isBypassAuthUrl(input)) {
    await new Promise<string | null>((resolve) => {
      subscribeTokenRefresh((token) => resolve(token));
    });
  }

  const reqOptions = attachAuthHeader(init);
  let res = await fetch(input, reqOptions);

  // If 401 Unauthorized received on an authenticated endpoint
  if (res.status === 401 && !isBypassAuthUrl(input)) {
    if (isRefreshing) {
      // Refresh already in progress: queue this request to retry when ready
      return new Promise<Response>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          if (!newToken) {
            resolve(res);
            return;
          }
          try {
            const retriedOptions = attachAuthHeader(init, newToken);
            const retryRes = await fetch(input, retriedOptions);
            resolve(retryRes);
          } catch (err) {
            reject(err);
          }
        });
      });
    }

    // First request to encounter 401: lock and initiate token refresh
    isRefreshing = true;
    try {
      const newToken = await attemptTokenRefresh();
      if (newToken) {
        onTokenRefreshed(newToken);
        // Automatically retry the original failed request with the new token
        const retriedOptions = attachAuthHeader(init, newToken);
        res = await fetch(input, retriedOptions);
        return res;
      } else {
        onTokenRefreshed(null);
      }
    } catch {
      onTokenRefreshed(null);
    } finally {
      isRefreshing = false;
    }
  }

  return res;
}

export async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) {
      const retrySec = data?.retry_after_seconds ? ` Retry after ${data.retry_after_seconds}s.` : '';
      throw new Error(`Rate limit exceeded.${retrySec}`);
    }
    let message =
      (Array.isArray(data?.errors) ? data.errors.map((e: any) => e.message || e.field || e).join(', ') : null) ||
      data?.error ||
      data?.message ||
      (Array.isArray(data?.details) ? data.details.map((d: any) => d.message || d).join(', ') : null) ||
      `Request failed with status ${res.status}`;

    if (
      message.toLowerCase().includes('not found in firestore') ||
      message.toLowerCase().includes('user profile not found') ||
      message.toLowerCase().includes('user not found')
    ) {
      message = 'Account does not exist.';
    }

    throw new Error(message);
  }
  return data as T;
}

export const loginOfficial = async (payload: OfficialLoginPayload): Promise<AuthResponse> => {
  const email = payload.email.trim();
  const password = payload.password;

  let lastError: Error | null = null;
  let data: AuthResponse | null = null;
  const isLikelyAdmin = email.toLowerCase().includes('admin');

  // 1. If email indicates admin account, try /admin/login first
  if (isLikelyAdmin) {
    try {
      const adminRes = await fetch(`${BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (adminRes.ok) {
        data = await handleResponse<AuthResponse>(adminRes);
      } else {
        const errJson = await adminRes.json().catch(() => ({}));
        lastError = new Error(errJson.error || errJson.message || `Admin login failed (${adminRes.status})`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 2. Try officials login endpoint
  if (!data || !data.token) {
    try {
      const res = await fetch(`${BASE_URL}/officials/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        data = await handleResponse<AuthResponse>(res);
      } else {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error || errJson.message || `Login failed (${res.status})`;
        lastError = new Error(errMsg);
        if (res.status === 403) {
          throw lastError;
        }
      }
    } catch (err: any) {
      lastError = err;
      if (err?.message && (err.message.includes('pending') || err.message.includes('declined') || err.message.includes('approval'))) {
        throw err;
      }
    }
  }

  // 3. If still not authenticated, try admin login endpoint if not already tried
  if ((!data || !data.token) && !isLikelyAdmin) {
    try {
      const adminRes = await fetch(`${BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (adminRes.ok) {
        data = await handleResponse<AuthResponse>(adminRes);
      }
    } catch { }
  }

  // 3. Fallback to general users login endpoint
  if (!data || !data.token) {
    try {
      const userRes = await fetch(`${BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (userRes.ok) {
        data = await handleResponse<AuthResponse>(userRes);
      } else {
        const errJson = await userRes.json().catch(() => ({}));
        if (userRes.status === 403) {
          throw new Error(errJson.error || errJson.message || 'Access denied.');
        }
      }
    } catch (err: any) {
      if (err?.message && (err.message.includes('pending') || err.message.includes('declined') || err.message.includes('approval'))) {
        throw err;
      }
    }
  }

  if (data && data.token && data.user) {
    const refreshToken = (data as any).refreshToken || (data as any).refresh_token;
    storeAuthSession(data.token, data.user, Boolean(payload.savePassword), refreshToken);
    return data;
  }

  throw lastError || new Error('Invalid email or password.');
};

export const loginAdmin = async (payload: AdminLoginPayload): Promise<AuthResponse> => {
  return loginOfficial(payload as any);
};

export const getAdminProfile = async (forceRefresh = false): Promise<any> => {
  const cached = getCachedData<any>('admin_profile');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  try {
    const res = await authFetch(`${BASE_URL}/admin/profile`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await handleResponse<any>(res);
      setCachedData('admin_profile', data);
      return data;
    }
  } catch { }

  return getMe(forceRefresh);
};

export const getAdminCoachQueue = async (forceRefresh = false): Promise<AdminCoachQueueResponse> => {
  if (forceRefresh) {
    cache.delete('admin_coach_queue');
    try {
      sessionStorage.removeItem('atleta_cache_admin_coach_queue');
      localStorage.removeItem('atleta_cache_admin_coach_queue');
    } catch {}
  }
  const cached = getCachedData<AdminCoachQueueResponse>('admin_coach_queue');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  if (!token) return { total_pending: 0, queue: [] };

  try {
    const res = await authFetch(`${BASE_URL}/admin/coaches/queue`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const data = await handleResponse<AdminCoachQueueResponse>(res);
      const rawQueue = Array.isArray(data?.queue) ? data.queue : [];
      const filteredData: AdminCoachQueueResponse = {
        ...data,
        total_pending: rawQueue.filter((c: AdminCoachQueueItem) => {
          const st = (c.account_status || c.status || '').toLowerCase();
          return st !== 'active' && st !== 'verified' && st !== 'approved' && st !== 'rejected';
        }).length,
        queue: rawQueue,
      };
      setCachedData('admin_coach_queue', filteredData);
      return filteredData;
    } else {
      console.warn(`[getAdminCoachQueue] Failed with status ${res.status}: ${res.statusText}`);
    }
  } catch (err) {
    console.error('[getAdminCoachQueue] Error fetching coach queue:', err);
  }

  return cached || { total_pending: 0, queue: [] };
};


export const approveCoachAccreditation = async (coachId: string): Promise<any> => {
  const token = getStoredToken();
  const res = await authFetch(`${BASE_URL}/admin/coaches/${coachId.replace(/^coach_/, '')}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(7000),
  });
  const data = await handleResponse<any>(res);
  invalidateCache('admin_coach_queue');
  return data;
};

export const rejectCoachAccreditation = async (coachId: string, reason: string): Promise<any> => {
  const token = getStoredToken();
  const res = await authFetch(`${BASE_URL}/admin/coaches/${coachId.replace(/^coach_/, '')}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ rejection_reason: reason }),
    signal: AbortSignal.timeout(7000),
  });
  const data = await handleResponse<any>(res);
  invalidateCache('admin_coach_queue');
  return data;
};

export const getAdminOfficialQueue = async (forceRefresh = false): Promise<AdminOfficialQueueResponse> => {
  const cached = getCachedData<AdminOfficialQueueResponse>('admin_official_queue');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  if (!token) return { total_pending: 0, queue: [] };

  try {
    const res = await authFetch(`${BASE_URL}/admin/officials/queue`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(7000),
    });
    if (res.ok) {
      const data = await handleResponse<AdminOfficialQueueResponse>(res);
      setCachedData('admin_official_queue', data);
      return data;
    }
  } catch { }

  return cached || { total_pending: 0, queue: [] };
};

export const approveOfficialRegistration = async (officialId: string): Promise<any> => {
  const token = getStoredToken();
  const cleanId = officialId.replace(/^off_|^official_/, '');
  const res = await authFetch(`${BASE_URL}/admin/officials/${cleanId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(7000),
  });
  const data = await handleResponse<any>(res);
  invalidateCache('admin_official_queue');
  return data;
};

export const rejectOfficialRegistration = async (officialId: string, reason: string): Promise<any> => {
  const token = getStoredToken();
  const cleanId = officialId.replace(/^off_|^official_/, '');
  const res = await authFetch(`${BASE_URL}/admin/officials/${cleanId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ rejection_reason: reason }),
    signal: AbortSignal.timeout(7000),
  });
  const data = await handleResponse<any>(res);
  invalidateCache('admin_official_queue');
  return data;
};

export const resubmitCoachCredentials = async (payload: {
  coach_id?: string;
  user_id?: string;
  email?: string;
  documents?: string[];
  professional_documents?: string[];
  notes?: string;
}): Promise<any> => {
  const token = getStoredToken();
  const res = await authFetch(`${BASE_URL}/coaches/resubmit-credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const data = await handleResponse<any>(res);
  invalidateCache('admin_coach_queue');
  return data;
};

export const registerOfficial = async (payload: OfficialRegisterPayload): Promise<AuthResponse> => {
  const fullName = payload.full_legal_name.trim();
  const orgName = (payload.organization_name || payload.organization || '').trim();
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'Official';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  const res = await authFetch(`${BASE_URL}/users/official`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_legal_name: fullName,
      organization_name: orgName,
      email: payload.email.trim(),
      password: payload.password,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      license_number: payload.license_number || 'LIC-2026-001',
      sport_accreditation: payload.sport_accreditation || ['Basketball'],
      organization: orgName,
      phone_number: payload.phone_number?.trim() || 'N/A',
      assigned_sport: payload.assigned_sport?.trim() || 'Basketball',
    }),
  });
  const data = await handleResponse<AuthResponse>(res);
  return data;
};

export const requestPasswordReset = async (payload: PasswordResetPayload): Promise<{ message: string; sent?: boolean; reset_link?: string }> => {
  const redirect_url = payload.redirect_url || (typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined);
  const res = await authFetch(`${BASE_URL}/users/password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: payload.email.trim(), redirect_url }),
  });
  return handleResponse<{ message: string; sent?: boolean; reset_link?: string }>(res);
};

export const confirmPasswordReset = async (payload: ConfirmPasswordResetPayload): Promise<{ message: string; success?: boolean }> => {
  const res = await authFetch(`${BASE_URL}/users/password-reset/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: payload.token.trim(),
      new_password: payload.new_password,
      email: payload.email?.trim(),
    }),
  });
  return handleResponse<{ message: string; success?: boolean }>(res);
};


export const getMe = async (forceRefresh = false): Promise<AuthUser> => {
  const cached = getCachedData<AuthUser>('user_me');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  try {
    const res = await authFetch(`${BASE_URL}/users/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.status === 404 || res.status === 401) {
      const stored = getStoredUser();
      if (stored) return stored;
    }
    const data = await handleResponse<any>(res);
    const user = data.user || data;
    setCachedData('user_me', user);
    return user;
  } catch (err) {
    const stored = getStoredUser();
    if (stored) return stored;
    throw err;
  }
};

export const getStoredOfficialDashboard = (): OfficialDashboardResponse | null => {
  try {
    const raw = localStorage.getItem('atleta_cached_official_dashboard');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getOfficialDashboard = async (forceRefresh = false): Promise<OfficialDashboardResponse> => {
  const stored = getStoredOfficialDashboard();
  const cached = getCachedData<OfficialDashboardResponse>('official_dashboard') || stored;
  if (cached && !forceRefresh) {
    if (Array.isArray(cached.audit_queue)) {
      cached.audit_queue = cached.audit_queue.filter((item: any) => {
        const matchId = String(item.match_details?.match_id || item.match_id || '').replace(/^#/, '');
        return !isMatchDeleted(matchId);
      });
    }
    return cached;
  }

  const token = getStoredToken();
  const fetchEndpoints = [`${BASE_URL}/officials/dashboard`];
  if (typeof window !== 'undefined' && BASE_URL.startsWith('http')) {
    fetchEndpoints.push('/api/v1/officials/dashboard', '/api/officials/dashboard');
  }

  for (const ep of fetchEndpoints) {
    try {
      const res = await authFetch(ep, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.audit_queue)) {
          data.audit_queue = data.audit_queue.filter((item: any) => {
            const matchId = String(item.match_details?.match_id || item.match_id || '').replace(/^#/, '');
            return !isMatchDeleted(matchId);
          });
        }
        setCachedData('official_dashboard', data);
        try {
          localStorage.setItem('atleta_cached_official_dashboard', JSON.stringify(data));
        } catch {}
        return data;
      }
    } catch {}
  }

  const fallback: OfficialDashboardResponse = stored || ({
    total_matches: 0,
    pending_audits: 0,
    completed_audits: 0,
    audit_queue: [],
    upcoming_schedules: [],
    recent_matches: [],
  } as any);
  return fallback;
};

export const extractTeamString = (val: any): string => {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.toLowerCase().includes('[object') || trimmed === '') return '';
    return trimmed;
  }
  if (typeof val === 'object') {
    return (
      extractTeamString(val.name) ||
      extractTeamString(val.team_name) ||
      extractTeamString(val.home_team_name) ||
      extractTeamString(val.opponent_team_name) ||
      extractTeamString(val.away_team_name) ||
      extractTeamString(val.team_id) ||
      extractTeamString(val.school_name) ||
      extractTeamString(val.title) ||
      ''
    );
  }
  return String(val);
};

const coachNameCache = new Map<string, string>();

export const getCoachNameById = async (coachIdOrName: string): Promise<string> => {
  if (!coachIdOrName) return '';
  const trimmed = coachIdOrName.trim();

  // Never show official IDs as coach
  if (trimmed.toLowerCase().startsWith('off_') || trimmed.toLowerCase().startsWith('official_')) {
    return '';
  }

  // If already a human name, strip any prefix and return
  const isIdLike =
    trimmed.startsWith('coach_') ||
    trimmed.startsWith('user_') ||
    (trimmed.length >= 20 && !trimmed.includes(' '));

  if (!isIdLike) {
    return trimmed.replace(/^coach[_\s]*/i, '').trim();
  }

  const cleanId = trimmed.replace(/^coach_/, '');

  if (coachNameCache.has(cleanId)) {
    return coachNameCache.get(cleanId)!;
  }

  try {
    const res = await authFetch(`${BASE_URL}/coaches/${cleanId}`);
    if (res.ok) {
      const data = await res.json();
      const name = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.name;
      if (name) {
        coachNameCache.set(cleanId, name);
        return name;
      }
    }
  } catch { }

  return trimmed.replace(/^coach[_\s]*/i, '').trim();
};

export const getStoredOfficialSchedules = (month?: number, year?: number): OfficialScheduleItem[] => {
  const cacheKey = `official_schedules_${month ?? 'all'}_${year ?? 'all'}`;
  try {
    const raw = localStorage.getItem(`atleta_cached_${cacheKey}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const getOfficialSchedules = async (month?: number, year?: number, forceRefresh = false): Promise<OfficialScheduleItem[]> => {
  const cacheKey = `official_schedules_${month ?? 'all'}_${year ?? 'all'}`;
  const stored = getStoredOfficialSchedules(month, year);
  const cached = getCachedData<OfficialScheduleItem[]>(cacheKey) || (stored.length > 0 ? stored : null);
  if (cached && Array.isArray(cached) && cached.length > 0 && !forceRefresh) {
    return cached.filter((item) => {
      const matchId = String(item.match_id || '').replace(/^#/, '');
      return !isMatchDeleted(matchId);
    });
  }

  const token = getStoredToken();
  const params = new URLSearchParams();
  if (month !== undefined) params.append('month', String(month));
  if (year !== undefined) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const [data, masterMatches] = await Promise.all([
    authFetch(`${BASE_URL}/officials/schedules${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    getAllOfficialMatchesMaster(forceRefresh).catch(() => []),
  ]);

  const list: OfficialScheduleItem[] = Array.isArray(data)
    ? [...data]
    : Array.isArray(data?.schedules)
      ? [...data.schedules]
      : Array.isArray(data?.data)
        ? [...data.data]
        : [];

  // Fetch Coaches from List
  list.forEach((item) => {
    const cleanMatchId = String(item.match_id || '').replace(/^#/, '');
    const found = masterMatches.find((m) => String(m.match_id || '').replace(/^#/, '') === cleanMatchId);
    if (found) {
      const raw = found.raw_match || {};
      const resolvedCoaches = Array.isArray(raw.assigned_coaches) && raw.assigned_coaches.length > 0
        ? raw.assigned_coaches
        : Array.isArray(raw.coaches) && raw.coaches.length > 0
          ? raw.coaches
          : found.coaches && found.coaches !== 'Official Assigned' && !found.coaches.startsWith('Coach off_')
            ? [found.coaches]
            : [];
      if (!item.assigned_coaches || item.assigned_coaches.length === 0) {
        item.assigned_coaches = resolvedCoaches;
      }
      if (!item.coaches && resolvedCoaches.length > 0) {
        item.coaches = resolvedCoaches.join(', ');
      }
      const itemHome = extractTeamString(item.home_team) || extractTeamString(raw.home_team_name) || extractTeamString(raw.home_team) || extractTeamString(raw.team_id);
      if (itemHome) item.home_team = itemHome;

      const itemAway = extractTeamString(item.away_team) || extractTeamString(raw.opponent_team_name) || extractTeamString(raw.away_team_name) || extractTeamString(raw.away_team);
      if (itemAway) item.away_team = itemAway;
    }
  });

  const existingIds = new Set(list.map((s) => String(s.match_id || '').replace(/^#/, '')));

  const userMe = getStoredUser();

  for (const m of masterMatches) {
    const rawId = String(m.match_id || '').replace(/^#/, '');
    if (!rawId || existingIds.has(rawId)) continue;
    const raw = m.raw_match || {};

    const isMine = isMatchCreatedByOfficial(m, userMe);
    if (!isMine) continue;

    let dateStr = raw.match_date || raw.timestamp || raw.requested_at || (m as any).match_date || (m as any).scheduled_time || (m as any).date_time || '';
    let d = new Date(dateStr);
    if (isNaN(d.getTime()) && typeof dateStr === 'string' && dateStr) {
      d = new Date(dateStr.replace(/\s*\/\s*/g, ' ').trim());
    }

    const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    let mMonth = !isNaN(d.getTime()) ? d.getMonth() + 1 : undefined;
    let mYear = !isNaN(d.getTime()) ? d.getFullYear() : undefined;
    let uMonth = !isNaN(d.getTime()) ? d.getUTCMonth() + 1 : undefined;
    let uYear = !isNaN(d.getTime()) ? d.getUTCFullYear() : undefined;

    if (mMonth === undefined && typeof dateStr === 'string') {
      const upper = dateStr.toUpperCase();
      MONTH_NAMES.forEach((mName, idx) => {
        if (upper.includes(mName)) mMonth = idx + 1;
      });
      const yearMatch = upper.match(/\b(20\d\d)\b/);
      if (yearMatch) mYear = Number(yearMatch[1]);
    }

    const targetMonthName = month !== undefined && month >= 1 && month <= 12 ? MONTH_NAMES[month - 1] : '';
    const monthMatches = month === undefined ||
      mMonth === month ||
      uMonth === month ||
      (typeof dateStr === 'string' && (
        dateStr.includes(`-${String(month).padStart(2, '0')}-`) ||
        (Boolean(targetMonthName) && dateStr.toUpperCase().includes(targetMonthName))
      ));

    const yearMatches = year === undefined ||
      mYear === undefined ||
      mYear === year ||
      uYear === year ||
      (typeof dateStr === 'string' && dateStr.includes(String(year)));

    if (!monthMatches || !yearMatches) continue;

    const home = extractTeamString(raw.home_team_name) || extractTeamString(raw.home_team) || extractTeamString(raw.team_id) || '';
    const away = extractTeamString(raw.opponent_team_name) || extractTeamString(raw.away_team_name) || extractTeamString(raw.away_team) || '';
    const sport = m.sport || raw.sport_type || raw.sport || '';
    const venue = raw.location || raw.venue || '';
    const court = raw.court_number || raw.court || '';

    const resolvedCoaches = Array.isArray(raw.assigned_coaches) && raw.assigned_coaches.length > 0
      ? raw.assigned_coaches
      : Array.isArray(raw.coaches) && raw.coaches.length > 0
        ? raw.coaches
        : m.coaches && m.coaches !== 'Official Assigned' && !m.coaches.startsWith('Coach off_')
          ? [m.coaches]
          : [];

    const resolvedOffId = raw.official_id || raw.requested_by || (isMine ? (userMe?.uid || '') : '');
    const cleanScheduledTime = !isNaN(d.getTime()) ? d.toISOString() : dateStr;

    const userMatchName = String(
      raw.matchName ||
      raw.gameReferenceId ||
      raw.game_name ||
      raw.gameName ||
      raw.match_name ||
      m.matchName ||
      m.gameReferenceId ||
      m.game_name ||
      m.gameName ||
      m.match_name ||
      ''
    ).trim();

    list.push({
      schedule_id: `sched_${rawId}`,
      match_id: rawId,
      matchName: userMatchName || `${home} vs. ${away}`,
      match_name: userMatchName || `${home} vs. ${away}`,
      gameName: userMatchName || `${home} vs. ${away}`,
      gameReferenceId: raw.gameReferenceId || userMatchName || undefined,
      official_id: resolvedOffId,
      requested_by: raw.requested_by || (isMine ? (userMe?.uid || '') : ''),
      created_by: raw.created_by || (isMine ? (userMe?.uid || '') : ''),
      venue: venue,
      court_number: court,
      scheduled_time: cleanScheduledTime,
      month: mMonth || uMonth || month,
      year: mYear || uYear || year,
      sport: sport,
      home_team: home,
      away_team: away,
      assigned_coaches: resolvedCoaches,
      coaches: resolvedCoaches.length > 0 ? resolvedCoaches.join(', ') : m.coaches || '',
      coach_name: raw.coach_name || (resolvedCoaches.length > 0 ? resolvedCoaches[0] : ''),
      venue_logistics: {
        location: venue,
        court: court,
        sport: sport,
        home_team: home,
        away_team: away,
        time: cleanScheduledTime,
        coaches: resolvedCoaches.join(', '),
      },
      raw_match: { ...raw, ...m, match_id: rawId, official_id: resolvedOffId, match_date: cleanScheduledTime },
    });
    existingIds.add(rawId);
  }

  // Deduplicate list by canonical match ID to prevent duplicate games
  const deduplicatedMap = new Map<string, OfficialScheduleItem>();
  for (const item of list) {
    const rawMatchId = String(
      item.match_id ||
      (item as any).raw_match?.match_id ||
      item.schedule_id ||
      ''
    ).replace(/^#/, '').replace(/^sched_/, '').trim();

    const key = rawMatchId || String(item.schedule_id || Math.random());
    if (!deduplicatedMap.has(key)) {
      deduplicatedMap.set(key, item);
    }
  }

  const finalList = Array.from(deduplicatedMap.values()).filter((item) => {
    const matchId = String(item.match_id || '').replace(/^#/, '');
    return !isMatchDeleted(matchId);
  });

  setCachedData(cacheKey, finalList);
  try {
    localStorage.setItem(`atleta_cached_${cacheKey}`, JSON.stringify(finalList));
  } catch {}
  return finalList;
};

const DEFAULT_OFFICIAL_SETTINGS: OfficialSettings = {
  split_screen_defaults: true,
  discrepancy_presets: false,
  match_reminders: true,
  audit_notifications: true,
  auto_refresh: false,
};

export const getOfficialSettings = async (forceRefresh = false): Promise<OfficialSettings> => {
  const stored = getStoredOfficialSettings() || {};
  const cached = getCachedData<OfficialSettings>('official_settings') || stored;
  if (cached && Object.keys(cached).length > 0 && !forceRefresh) {
    return { ...DEFAULT_OFFICIAL_SETTINGS, ...cached };
  }

  const token = getStoredToken();
  try {
    const res = await authFetch(`${BASE_URL}/officials/settings`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await handleResponse<OfficialSettings>(res);
      const merged: OfficialSettings = { ...DEFAULT_OFFICIAL_SETTINGS, ...stored, ...(data || {}) };
      setCachedData('official_settings', merged);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch { }
      return merged;
    }
  } catch { }

  return { ...DEFAULT_OFFICIAL_SETTINGS, ...stored };
};

export const updateOfficialSettings = async (
  payload: Partial<OfficialSettings>
): Promise<OfficialSettings> => {
  const token = getStoredToken();
  const current = getStoredOfficialSettings() || getCachedData<OfficialSettings>('official_settings') || {};
  const updated: OfficialSettings = { ...DEFAULT_OFFICIAL_SETTINGS, ...current, ...payload };
  setCachedData('official_settings', updated);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch { }

  try {
    const res = await authFetch(`${BASE_URL}/officials/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const rawData = await handleResponse<any>(res);
      const serverData = (rawData && rawData.settings) ? rawData.settings : rawData;
      const finalSettings: OfficialSettings = { ...updated, ...(serverData || {}) };
      setCachedData('official_settings', finalSettings);
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(finalSettings));
      } catch { }
      return finalSettings;
    }
  } catch { }

  return updated;
};

export const CREATED_MATCHES_PREFIX = 'atleta_created_matches_';

export const recordOfficialCreatedMatchId = (rawMatchId: string, officialUid?: string): void => {
  if (!rawMatchId) return;
  try {
    const cleanId = String(rawMatchId).replace(/^#/, '');
    const uid = officialUid || getStoredUser()?.uid;
    const key = uid ? `${CREATED_MATCHES_PREFIX}${uid}` : 'atleta_created_matches_general';
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.includes(cleanId)) {
      existing.push(cleanId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch { }
};

export const getOfficialCreatedMatchIds = (officialUid?: string): Set<string> => {
  try {
    const uid = officialUid || getStoredUser()?.uid;
    const key = uid ? `${CREATED_MATCHES_PREFIX}${uid}` : 'atleta_created_matches_general';
    const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    const generalList: string[] = JSON.parse(localStorage.getItem('atleta_created_matches_general') || '[]');
    return new Set([...list, ...generalList]);
  } catch {
    return new Set();
  }
};

export const markMatchAsCertified = (rawMatchId: string): void => {
  if (!rawMatchId) return;
  try {
    const cleanId = String(rawMatchId).replace(/^#/, '');
    const key = 'atleta_certified_match_ids';
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.includes(cleanId)) {
      existing.push(cleanId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch { }
};

export const isMatchLocallyCertified = (rawMatchId: string): boolean => {
  if (!rawMatchId) return false;
  try {
    const cleanId = String(rawMatchId).replace(/^#/, '');
    const key = 'atleta_certified_match_ids';
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(existing) && existing.includes(cleanId);
  } catch {
    return false;
  }
};

export const isMatchDeleted = (rawId: string): boolean => {
  if (!rawId) return false;
  try {
    const cleanId = String(rawId).replace(/^#/, '');
    const list: string[] = JSON.parse(localStorage.getItem('atleta_deleted_matches') || '[]');
    return list.includes(cleanId);
  } catch {
    return false;
  }
};

export const recordDeletedMatch = (rawId: string): void => {
  if (!rawId) return;
  try {
    const cleanId = String(rawId).replace(/^#/, '');
    const list: string[] = JSON.parse(localStorage.getItem('atleta_deleted_matches') || '[]');
    if (!list.includes(cleanId)) {
      list.push(cleanId);
      localStorage.setItem('atleta_deleted_matches', JSON.stringify(list));
    }
    // Instantly purge from in-memory and persistent master match cache so it reflects immediately
    const cachedMaster = getCachedData<any[]>('all_official_matches_master');
    if (Array.isArray(cachedMaster)) {
      const filtered = cachedMaster.filter((m) => String(m.match_id || '').replace(/^#/, '') !== cleanId);
      setCachedData('all_official_matches_master', filtered);
      try { localStorage.setItem('atleta_cached_official_matches_master', JSON.stringify(filtered)); } catch {}
    } else {
      const rawMaster = localStorage.getItem('atleta_cached_official_matches_master');
      if (rawMaster) {
        try {
          const parsed = JSON.parse(rawMaster);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((m: any) => String(m.match_id || '').replace(/^#/, '') !== cleanId);
            localStorage.setItem('atleta_cached_official_matches_master', JSON.stringify(filtered));
          }
        } catch {}
      }
    }
  } catch { }
};

export const isMatchCreatedByOfficial = (
  item: import('./types').MatchSummaryItem,
  user: import('./types').AuthUser | null
): boolean => {
  const currentUser = user || getStoredUser();
  if (!currentUser) return false;

  const raw = item?.raw_match || {};
  const cleanId = String(item?.match_id || raw.match_id || (item as any)?.id || '').replace(/^#/, '');
  if (isMatchDeleted(cleanId)) return false;

  const myUid = currentUser.uid || (currentUser as any).user_id || '';
  const clean = (s: any) => String(s || '').trim().toLowerCase().replace(/^off_/, '');

  // Reject coach-logged matches unless explicitly owned by official
  const coachOwner = raw.logged_by_coach_id || raw.coach_id || (item as any)?.logged_by_coach_id;

  const userIds = new Set([
    currentUser.uid,
    currentUser.user_id,
    (currentUser as any).official_id,
    currentUser.uid ? `off_${currentUser.uid.replace(/^off_/, '')}` : null,
    currentUser.uid ? currentUser.uid.replace(/^off_/, '') : null,
    currentUser.email,
  ].filter(Boolean).map(clean) as string[]);

  // 1. Check locally tracked matches created or certified by this official
  const createdIds = getOfficialCreatedMatchIds(myUid);
  const candidateIds = [
    cleanId,
    raw.match_id ? String(raw.match_id).replace(/^#/, '') : null,
    raw.validation_id ? String(raw.validation_id).replace(/^#/, '') : null,
    raw.audit_id ? String(raw.audit_id).replace(/^#/, '') : null,
    raw.reference_id ? String(raw.reference_id).replace(/^#/, '') : null,
    (item as any)?.id ? String((item as any).id).replace(/^#/, '') : null,
  ].filter(Boolean) as string[];

  for (const cid of candidateIds) {
    if (createdIds.has(cid) || isMatchLocallyCertified(cid)) {
      return true;
    }
  }

  // 2. Check official_id directly on the match
  const officialOwners = [
    raw.official_id,
    (item as any)?.official_id,
    raw.certified_by,
    raw.validated_by,
  ].filter(Boolean).map(clean) as string[];

  for (const owner of officialOwners) {
    if (owner && userIds.has(owner)) return true;
  }

  // If coach-logged and official_id did not match, exclude
  if (coachOwner) return false;

  // 3. Check requested_by / created_by ONLY if matching this official
  const matchOwners = [
    raw.requested_by,
    raw.created_by,
    (item as any)?.requested_by,
    (item as any)?.created_by,
  ].filter(Boolean).map(clean) as string[];

  for (const owner of matchOwners) {
    if (owner && userIds.has(owner)) return true;
  }

  // 4. Check assigned officials array if present
  const assigned = (
    Array.isArray(raw.assigned_officials)
      ? raw.assigned_officials
      : Array.isArray((item as any)?.assigned_officials)
        ? (item as any).assigned_officials
        : []
  ).map(clean) as string[];

  for (const off of assigned) {
    if (off && userIds.has(off)) return true;
  }

  return false;
};

export const getStoredOfficialMatches = (
  currentUser?: import('./types').AuthUser | null
): import('./types').MatchSummaryItem[] => {
  const user = currentUser || getStoredUser();
  const list: import('./types').MatchSummaryItem[] = [];
  const existingIds = new Set<string>();

  // 1. Check in-memory master dataset
  const mem = getCachedData<import('./types').MatchSummaryItem[]>('all_official_matches_master');
  if (Array.isArray(mem) && mem.length > 0) {
    mem.forEach((m) => {
      const cid = String(m.match_id || '').replace(/^#/, '');
      if (!isMatchDeleted(cid) && isMatchCreatedByOfficial(m, user)) {
        list.push(m);
        existingIds.add(cid);
      }
    });
  }

  // 2. Check localStorage master dataset
  try {
    const rawMaster = localStorage.getItem('atleta_cached_official_matches_master');
    if (rawMaster) {
      const parsed = JSON.parse(rawMaster);
      if (Array.isArray(parsed)) {
        parsed.forEach((m: any) => {
          const cid = String(m.match_id || '').replace(/^#/, '');
          if (!existingIds.has(cid) && !isMatchDeleted(cid) && isMatchCreatedByOfficial(m, user)) {
            list.push(m);
            existingIds.add(cid);
          }
        });
      }
    }
  } catch {}

  // 3. Check localStorage official dashboard audit queue
  try {
    const rawDash = localStorage.getItem('atleta_cached_official_dashboard');
    if (rawDash) {
      const dash = JSON.parse(rawDash);
      const queue = Array.isArray(dash?.audit_queue) ? dash.audit_queue : [];
      queue.forEach((item: any, idx: number) => {
        const match = item.match_details || {};
        const rawId = String(match.match_id || item.match_id || `queue_${idx}`).replace(/^#/, '');
        if (isMatchDeleted(rawId) || existingIds.has(rawId)) return;
        if (!item.match_details && !item.home_team_name) return;

        const customMatchName = String(
          match.matchName ||
          match.match_name ||
          match.game_name ||
          match.gameName ||
          item.matchName ||
          item.match_name ||
          item.game_name ||
          item.gameName ||
          ''
        ).trim();
        const fallbackName = match.home_team_name && match.away_team_name ? `${match.home_team_name} vs. ${match.away_team_name}` : 'Tournament Match';

        const isAudited = item.status === 'Approved' || item.status === 'Audited' || match.is_certified === true || isMatchLocallyCertified(rawId);
        const assignedCoaches = Array.isArray(match.assigned_coaches) && match.assigned_coaches.length > 0
          ? match.assigned_coaches
          : Array.isArray(match.coaches) && match.coaches.length > 0
            ? match.coaches
            : [];
        const coach = assignedCoaches.length > 0
          ? assignedCoaches.join(', ')
          : match.coach_name
            ? `Coach ${match.coach_name}`
            : item.requested_by && !String(item.requested_by).startsWith('off_') && !String(item.requested_by).includes('@') && String(item.requested_by).length < 25
              ? `Coach ${item.requested_by}`
              : 'Assigned Coach';

        const fakeSummary: import('./types').MatchSummaryItem = {
          match_id: `#${rawId}`,
          validation_id: item.audit_id || rawId,
          match_name: customMatchName || fallbackName,
          matchName: customMatchName || fallbackName,
          match_class: customMatchName || fallbackName,
          sport: match.sport_type || 'Basketball',
          coaches: coach,
          date_time: match.match_date || item.requested_at || new Date().toISOString(),
          status: isAudited ? 'AUDITED' : 'PENDING',
          raw_match: { ...match, ...item },
        };

        if (isMatchCreatedByOfficial(fakeSummary, user)) {
          list.push(fakeSummary);
          existingIds.add(rawId);
        }
      });
    }
  } catch {}

  return list;
};

export const createOfficialMatch = async (payload: CreateMatchPayload): Promise<any> => {
  const token = getStoredToken();
  const idempotencyKey = crypto.randomUUID();

  const rawSport = String(payload.sport_type || '').trim();
  let normalizedSport = rawSport || 'Basketball';
  if (rawSport.toLowerCase().includes('swim')) {
    normalizedSport = 'Swimming';
  } else if (rawSport.toLowerCase().includes('track') || rawSport.toLowerCase().includes('field')) {
    normalizedSport = 'Track & Field';
  } else if (rawSport.toLowerCase().includes('basket')) {
    normalizedSport = 'Basketball';
  }

  const home = String(payload.home_team_name || payload.team_id || 'Home Team').trim() || 'Home Team';
  const away = String(payload.opponent_team_name || (payload as any).away_team_id || 'Opponent').trim() || 'Opponent';
  const location = String(payload.location || payload.venue || 'Tournament Sports Complex').trim() || 'Tournament Sports Complex';

  const rawPayload = payload as any;
  const playerStatsList = rawPayload.playerStats || rawPayload.player_stats || [];
  const rosterAthletesList = rawPayload.rosterAthletes || rawPayload.roster_athletes || [];
  const awayRosterAthletesList = rawPayload.awayRosterAthletes || rawPayload.away_roster_athletes || [];
  const scoresheetUrlVal = rawPayload.scoresheetUrl || rawPayload.scoresheet_url || '';

  let data: any = null;
  try {
    const bodyPayload = {
      ...rawPayload,
      match_id: rawPayload.match_id,
      team_id: home,
      home_team_id: home,
      home_team_name: home,
      opponent_team_name: away,
      away_team_id: away,
      sport_type: normalizedSport,
      match_date: payload.match_date || new Date().toISOString(),
      location: location,
      venue: location,
      court_number: payload.court_number || 1,
      participating_teams: Array.isArray(payload.participating_teams) && payload.participating_teams.length > 0
        ? payload.participating_teams
        : [home, away],
      matchName: payload.matchName || (payload as any).gameReferenceId || (payload as any).match_name || payload.game_name || (payload as any).gameName || `${home} vs ${away}`,
      match_name: payload.matchName || (payload as any).gameReferenceId || (payload as any).match_name || payload.game_name || (payload as any).gameName || `${home} vs ${away}`,
      gameName: payload.matchName || (payload as any).gameReferenceId || (payload as any).match_name || payload.game_name || (payload as any).gameName || `${home} vs ${away}`,
      game_name: payload.matchName || (payload as any).gameReferenceId || (payload as any).match_name || payload.game_name || (payload as any).gameName || `${home} vs ${away}`,
      gameReferenceId: (payload as any).gameReferenceId || payload.matchName || undefined,
      coaches: Array.isArray(payload.coaches) && payload.coaches.length > 0
        ? payload.coaches
        : (Array.isArray(rawPayload.assigned_coaches) && rawPayload.assigned_coaches.length > 0 ? rawPayload.assigned_coaches : (rawPayload.coach_name ? [rawPayload.coach_name] : [])),
      assigned_coaches: Array.isArray(payload.coaches) && payload.coaches.length > 0
        ? payload.coaches
        : (Array.isArray(rawPayload.assigned_coaches) && rawPayload.assigned_coaches.length > 0 ? rawPayload.assigned_coaches : (rawPayload.coach_name ? [rawPayload.coach_name] : [])),
      scoresheet_url: scoresheetUrlVal,
      scoresheetUrl: scoresheetUrlVal,
      player_stats: playerStatsList,
      playerStats: playerStatsList,
      race_results: rawPayload.race_results || rawPayload.raceResults,
      sport_specific_details: rawPayload.sport_specific_details || (rawPayload.race_results ? { race_results: rawPayload.race_results } : undefined),
      roster_athletes: rosterAthletesList,
      rosterAthletes: rosterAthletesList,
      away_roster_athletes: awayRosterAthletesList,
      awayRosterAthletes: awayRosterAthletesList,
      home_score: rawPayload.home_score,
      away_score: rawPayload.away_score,
      game_result: rawPayload.game_result,
      final_score: rawPayload.final_score,
      scoresheet_data: rawPayload.scoresheet_data,
      notes: rawPayload.notes || '',
    };

    let res = await authFetch(`${BASE_URL}/matches/official`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bodyPayload),
    });

    if (res.status === 404) {
      const fallbackEndpoints = [
        `${BASE_URL}/matches/create-official`,
        `${BASE_URL}/validations/official`,
        `${BASE_URL}/matches/create`,
        `${BASE_URL}/matches/submit`,
        `${BASE_URL}/matches`,
      ];
      if (typeof window !== 'undefined' && BASE_URL.startsWith('http')) {
        fallbackEndpoints.push('/api/v1/matches/official', '/api/matches/official');
      }
      for (const altEp of fallbackEndpoints) {
        try {
          const altRes = await authFetch(altEp, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': idempotencyKey,
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(bodyPayload),
          });
          if (altRes.ok) {
            res = altRes;
            break;
          }
        } catch {}
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create official match: ${res.status} ${errText}`);
    }
    data = await res.json();
  } catch (err: any) {
    console.error('createOfficialMatch API call failed:', err);
    throw err;
  }

  const createdId = data?.match?.match_id || data?.match_id;
  const user = getStoredUser();
  if (createdId && user?.uid) {
    recordOfficialCreatedMatchId(createdId, user.uid);
  }

  // Invalidate schedules so calendar picks up the new event without wiping match list
  invalidateCache('official_schedules');
  return data;
};

export const getOfficialNotifications = async (forceRefresh = false): Promise<{ unread_count: number; notifications: import('./types').OfficialNotificationItem[] }> => {
  const cached = getCachedData<{ unread_count: number; notifications: import('./types').OfficialNotificationItem[] }>('official_notifications');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const [notifsRes, scoresheetsRes] = await Promise.all([
    authFetch(`${BASE_URL}/officials/notifications`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
    authFetch(`${BASE_URL}/scoresheets/requests`, { headers }).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const rawList: any[] = Array.isArray(notifsRes)
    ? notifsRes
    : Array.isArray(notifsRes?.notifications)
      ? notifsRes.notifications
      : Array.isArray(notifsRes?.data)
        ? notifsRes.data
        : [];

  const scoresheetList: any[] = Array.isArray(scoresheetsRes)
    ? scoresheetsRes
    : Array.isArray(scoresheetsRes?.requests)
      ? scoresheetsRes.requests
      : [];

  // Merge scoresheet requests from /scoresheets/requests
  scoresheetList.forEach((req: any) => {
    const reqId = req.requestId || req.id;
    const notifKey = `req_${reqId}`;
    const matchTitle = req.matchName || req.match_name || `Match ${req.matchId || ''}`;
    const coachName = req.coachName || req.coach_name || 'Coach';
    const sportType = req.sportType || req.sport_type || 'BASKETBALL';
    const isFulfilled = req.status === 'fulfilled' || req.status === 'accepted';
    const isRejected = req.status === 'rejected';

    const existingIdx = rawList.findIndex(
      (n: any) =>
        n.notification_id === notifKey ||
        n.notification_id === `notif_${notifKey}` ||
        n.request_id === reqId ||
        (req.matchId && (n.match_id === req.matchId || n.reference_id === req.matchId))
    );

    const mappedItem = {
      notification_id: notifKey,
      request_id: reqId,
      official_id: req.officialId || '',
      type: 'SCORESHEET_REQUEST',
      title: `Scoresheet Request: ${matchTitle}`,
      message: `${coachName} requested the official scoresheet for ${matchTitle}.`,
      reference_id: req.matchId || reqId,
      match_id: req.matchId || null,
      match_name: matchTitle,
      requested_by_coach: coachName,
      coach_name: coachName,
      match_context: matchTitle,
      sport_discipline: sportType,
      status: req.status || 'pending',
      scoresheet_url: req.scoresheetUrl || req.scoresheet_url || null,
      is_read: Boolean(req.is_read_by_official || isFulfilled || isRejected),
      created_at: req.createdAt || req.created_at || new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      rawList[existingIdx] = {
        ...mappedItem,
        ...rawList[existingIdx],
        status: req.status || rawList[existingIdx].status || 'pending',
        scoresheet_url: req.scoresheetUrl || req.scoresheet_url || rawList[existingIdx].scoresheet_url || null,
        requested_by_coach: rawList[existingIdx].requested_by_coach || coachName,
        match_context: rawList[existingIdx].match_context || matchTitle,
        sport_discipline: rawList[existingIdx].sport_discipline || sportType,
      };
    } else {
      rawList.unshift(mappedItem);
    }
  });

  const readSet = getStoredReadNotificationIds();

  const notifications: import('./types').OfficialNotificationItem[] = rawList.map((n: any, idx: number) => {
    const id = n.notification_id || `notif_${idx}`;
    return {
      notification_id: id,
      official_id: n.official_id || '',
      type: n.type || 'AUDIT_REQUEST',
      title: n.title || '',
      message: n.message || '',
      reference_id: n.reference_id || null,
      request_id: n.request_id || (id.startsWith('req_') ? id.replace(/^req_/, '') : undefined),
      match_id: n.match_id || undefined,
      match_name: n.match_name || n.match_context || undefined,
      status: n.status || undefined,
      scoresheet_url: n.scoresheet_url || n.scoresheetUrl || undefined,
      is_read: Boolean(n.is_read) || readSet.has(id),
      created_at: n.created_at || n.timestamp || new Date().toISOString(),
      requested_by_coach: n.requested_by_coach || n.coach_name || n.requested_by || undefined,
      match_context: n.match_context || n.match_name || n.match_class || undefined,
      sport_discipline: n.sport_discipline || n.sport_type || n.sport || undefined,
    };
  });

  // Game Reminders: Notify official 3, 2, or 1 day before scheduled game/event for all 3 sports
  try {
    const schedules = await getOfficialSchedules().catch(() => []);
    const now = Date.now();
    schedules.forEach((s) => {
      const timeStr = s.scheduled_time || (s as any).match_date || s.venue_logistics?.time;
      if (!timeStr) return;
      const gameTime = new Date(timeStr).getTime();
      const diffDays = Math.ceil((gameTime - now) / (1000 * 60 * 60 * 24));
      if (diffDays >= 1 && diffDays <= 3) {
        const rawSport = (s.sport || (s as any).sport_type || s.venue_logistics?.sport || 'Basketball').trim();
        let sportName = rawSport;
        const lower = rawSport.toLowerCase();
        if (lower.includes('swim')) {
          sportName = 'Swimming';
        } else if (lower.includes('track') || lower.includes('field')) {
          sportName = 'Track & Field';
        } else if (lower.includes('basket')) {
          sportName = 'Basketball';
        }

        const matchTitle = s.home_team && s.away_team
          ? `${s.home_team} vs ${s.away_team}`
          : `${sportName} Scheduled Event`;
        const eventNoun = sportName === 'Basketball' ? 'Game' : sportName === 'Swimming' ? 'Meet' : 'Event';
        const venueLabel = s.venue || s.venue_logistics?.location || (sportName === 'Swimming' ? 'Aquatic Center' : sportName === 'Track & Field' ? 'Athletics Oval' : 'Main Court');
        const reminderId = `reminder_${s.schedule_id || s.match_id}_${diffDays}d`;

        if (!notifications.some((n) => n.notification_id === reminderId)) {
          notifications.unshift({
            notification_id: reminderId,
            official_id: s.official_id || '',
            type: 'SCHEDULE_UPDATE',
            title: `${sportName} ${eventNoun} in ${diffDays} Day${diffDays > 1 ? 's' : ''}`,
            message: `Scheduled ${sportName.toLowerCase()} reminder: ${matchTitle} is on ${new Date(gameTime).toLocaleDateString()} (${venueLabel}).`,
            is_read: readSet.has(reminderId),
            created_at: new Date().toISOString(),
            match_context: s.match_class || `${sportName} Competition`,
            sport_discipline: sportName,
          });
        }
      }
    });
  } catch { }

  const unread_count = notifications.filter((n) => !n.is_read).length;

  const result = { unread_count, notifications };
  setCachedData('official_notifications', result);
  return result;
};

export const markAllOfficialNotificationsAsRead = async (): Promise<void> => {
  const token = getStoredToken();
  // Optimistically update cache and local storage
  const cached = getCachedData<{ unread_count: number; notifications: import('./types').OfficialNotificationItem[] }>('official_notifications');
  if (cached) {
    storeAllReadNotificationIds(cached.notifications.map((n) => n.notification_id));
    setCachedData('official_notifications', {
      unread_count: 0,
      notifications: cached.notifications.map((n) => ({ ...n, is_read: true })),
    });
  }

  try {
    const res = await authFetch(`${BASE_URL}/officials/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      // Fallback to /notifications/read-all or POST
      await authFetch(`${BASE_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => { });
    }
  } catch {
  }
};

export const markOfficialNotificationAsRead = async (notificationId: string): Promise<void> => {
  if (!notificationId) return;
  storeReadNotificationId(notificationId);
  const token = getStoredToken();
  // Optimistically update cache
  const cached = getCachedData<{ unread_count: number; notifications: import('./types').OfficialNotificationItem[] }>('official_notifications');
  if (cached) {
    const updated = cached.notifications.map((n) =>
      n.notification_id === notificationId ? { ...n, is_read: true } : n
    );
    const unread = updated.filter((n) => !n.is_read).length;
    setCachedData('official_notifications', { unread_count: unread, notifications: updated });
  }

  try {
    await authFetch(`${BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
  }
};

export const getStoredOfficialProfile = (): any => {
  try {
    const raw = localStorage.getItem('atleta_cached_official_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getOfficialProfileData = async (forceRefresh = false): Promise<any> => {
  const stored = getStoredOfficialProfile() || getStoredUser();
  const cached = getCachedData<any>('official_profile') || stored;
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  try {
    const res = await authFetch(`${BASE_URL}/officials/profile`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      setCachedData('official_profile', data);
      try {
        localStorage.setItem('atleta_cached_official_profile', JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch {
  }

  return stored || getMe();
};

export const updateOfficialProfileData = async (payload: any): Promise<any> => {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const bodyData = {
    full_legal_name: payload.full_legal_name || payload.full_name,
    full_name: payload.full_legal_name || payload.full_name,
    phone_number: payload.phone_number,
    organization_name: payload.organization_name || payload.organization,
    organization: payload.organization_name || payload.organization,
    avatar_url: payload.avatar_url || payload.profile_image,
    profile_image: payload.avatar_url || payload.profile_image,
    ...payload,
  };

  try {
    const res = await authFetch(`${BASE_URL}/officials/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(bodyData),
    });
    if (res.ok) {
      const data = await res.json();
      setCachedData('official_profile', data);
      try {
        localStorage.setItem('atleta_cached_official_profile', JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch { }

  try {
    const res2 = await authFetch(`${BASE_URL}/officials/me`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(bodyData),
    });
    if (res2.ok) {
      const data = await res2.json();
      setCachedData('official_profile', data);
      return data;
    }
  } catch { }

  try {
    const res3 = await authFetch(`${BASE_URL}/users/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(bodyData),
    });
    if (res3.ok) {
      const data = await res3.json();
      setCachedData('official_profile', data);
      return data;
    }
  } catch { }

  setCachedData('official_profile', bodyData);
  return bodyData;
};


export const getAuditMatches = async (
  statusFilter: 'ALL' | 'PENDING' | 'PROCESSED' = 'ALL',
  sportFilter: string = 'ALL',
  forceRefresh = false
): Promise<import('./types').MatchSummaryItem[]> => {
  const normSport = sportFilter.toUpperCase().replace('&', 'AND').trim();
  const cacheKey = `audit_matches_${statusFilter}_${normSport}`;
  const cached = getCachedData<import('./types').MatchSummaryItem[]>(cacheKey);
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const [dashboardRes, matchesRes, pendingRes] = await Promise.all([
      authFetch(`${BASE_URL}/officials/dashboard`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      authFetch(`${BASE_URL}/matches?all=true`, { headers }).then((r) => (r.ok ? r.json() : { matches: [] })).catch(() => ({ matches: [] })),
      authFetch(`${BASE_URL}/validations/pending`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);

    let dashboardQueue: any[] = Array.isArray(dashboardRes?.audit_queue) ? dashboardRes.audit_queue : [];
    if (dashboardQueue.length === 0) {
      try {
        const raw = localStorage.getItem('atleta_cached_official_dashboard');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed?.audit_queue) && parsed.audit_queue.length > 0) {
            dashboardQueue = parsed.audit_queue;
          }
        }
      } catch {}
    }

    let allMatchesList: any[] = Array.isArray(matchesRes?.matches) ? matchesRes.matches : (Array.isArray(matchesRes) ? matchesRes : []);
    if (allMatchesList.length === 0) {
      try {
        const raw = localStorage.getItem('atleta_cached_official_matches_master');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            allMatchesList = parsed;
          }
        }
      } catch {}
    }

    const pendingValidations: any[] = Array.isArray(pendingRes) ? pendingRes : [];

    const userMe = getStoredUser();
    const myIds = new Set([
      userMe?.uid,
      userMe?.user_id,
      (userMe as any)?.official_id,
      userMe?.uid ? `off_${userMe.uid.replace(/^off_/, '')}` : null,
      userMe?.uid ? userMe.uid.replace(/^off_/, '') : null,
      userMe?.email,
    ].filter(Boolean) as string[]);

    dashboardQueue.forEach((item) => {
      const creator = item.requested_by || item.official_id;
      if (creator && userMe?.uid && (myIds.has(creator) || myIds.has(String(creator).replace(/^off_/, '')))) {
        const id = item.match_id || item.audit_id;
        if (id) recordOfficialCreatedMatchId(id, userMe.uid);
      }
    });

    pendingValidations.forEach((v) => {
      const creator = v.requested_by || v.official_id;
      if (creator && userMe?.uid && (myIds.has(creator) || myIds.has(String(creator).replace(/^off_/, '')))) {
        const id = v.match_id || v.validation_id;
        if (id) recordOfficialCreatedMatchId(id, userMe.uid);
      }
    });

    const combinedMap = new Map<string, import('./types').MatchSummaryItem>();

    const parseMatchItem = (raw: any, isAuditedOverride?: boolean) => {
      const match = raw.match_details || raw;
      const rawMatchId = String(match.match_id || raw.match_id || raw.audit_id || raw.id || '');
      if (!rawMatchId) return;

      const key = rawMatchId.replace(/^#/, '');
      const sRaw = String(raw.status || raw.verification_status || match.status || match.verification_status || '').toLowerCase().trim();
      const isCertified = Boolean(
        isAuditedOverride ||
        isMatchLocallyCertified(key) ||
        match.is_certified === true ||
        String(match.is_certified) === 'true' ||
        match.is_locked === true ||
        String(match.is_locked) === 'true' ||
        sRaw === 'approved' ||
        sRaw === 'audited' ||
        sRaw === 'certified' ||
        sRaw === 'certify'
      );
      const status: import('./types').AuditStatus = isCertified ? 'AUDITED' : 'PENDING';

      const homeTeam = (match.home_team_name || match.team_id || match.home_team || 'Home Team').toUpperCase();
      const awayTeam = (match.opponent_team_name || match.away_team_name || match.away_team || 'Opponent').toUpperCase();
      const sport = match.sport_type || match.sport || 'Basketball';
      const matchType = match.match_type ? ` (${match.match_type})` : '';

      const assignedList = Array.isArray(match.assigned_coaches) && match.assigned_coaches.length > 0
        ? match.assigned_coaches
        : Array.isArray(raw.assigned_coaches) && raw.assigned_coaches.length > 0
          ? raw.assigned_coaches
          : Array.isArray(match.coaches) && match.coaches.length > 0
            ? match.coaches
            : Array.isArray(raw.coaches) && raw.coaches.length > 0
              ? raw.coaches
              : [];

      let coaches = '';
      if (assignedList.length > 0) {
        coaches = assignedList.map((c: any) => String(c).trim()).filter(Boolean).join('\n');
      } else if (match.coach_name) {
        coaches = `Coach ${match.coach_name}`;
      } else if (raw.coach_name) {
        coaches = `Coach ${raw.coach_name}`;
      } else if (raw.requested_by && !String(raw.requested_by).startsWith('off_') && !String(raw.requested_by).includes('@') && String(raw.requested_by).length < 25) {
        coaches = `Coach ${raw.requested_by}`;
      } else {
        coaches = 'Official Assigned';
      }

      const d = new Date(match.match_date || match.timestamp || raw.requested_at || Date.now());
      const dateFormatted = !isNaN(d.getTime())
        ? `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()} / ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : 'DATE TBD';

      const customMatchName = String(
        match.matchName ||
        match.match_name ||
        match.game_name ||
        match.gameName ||
        raw.matchName ||
        raw.match_name ||
        raw.game_name ||
        raw.gameName ||
        ''
      ).trim();
      const matchNameDisplay = customMatchName || `${homeTeam} vs. ${awayTeam}${matchType}`;

      if (combinedMap.has(key)) {
        const existing = combinedMap.get(key)!;
        if (isCertified) existing.status = 'AUDITED';
        existing.raw_match = { ...existing.raw_match, ...match, ...raw };
        if (customMatchName) {
          existing.match_name = customMatchName;
          existing.matchName = customMatchName;
          existing.gameName = customMatchName;
          existing.gameReferenceId = customMatchName;
          existing.match_class = customMatchName;
        }
        if (
          (!existing.coaches || existing.coaches === 'Official Assigned' || existing.coaches.startsWith('Coach off_')) &&
          coaches &&
          coaches !== 'Official Assigned'
        ) {
          existing.coaches = coaches;
        }
      } else {
        combinedMap.set(key, {
          match_id: `#${key}`,
          validation_id: raw.validation_id || raw.audit_id || key,
          match_name: matchNameDisplay,
          matchName: matchNameDisplay,
          gameName: matchNameDisplay,
          gameReferenceId: raw.gameReferenceId || match.gameReferenceId || (customMatchName ? customMatchName : undefined),
          match_class: matchNameDisplay,
          sport,
          coaches,
          date_time: dateFormatted,
          status,
          raw_match: { ...match, ...raw },
        });
      }
    };

    // Process from all sources
    dashboardQueue.forEach((item) => parseMatchItem(item));
    pendingValidations.forEach((v) => parseMatchItem(v));
    allMatchesList.forEach((m) => parseMatchItem(m));

    let items = Array.from(combinedMap.values()).filter((item) => isMatchCreatedByOfficial(item, userMe));

    // Sort items chronologically by date/time
    items.sort((a, b) => {
      const timeA = new Date(a.raw_match?.match_date || a.raw_match?.timestamp || 0).getTime();
      const timeB = new Date(b.raw_match?.match_date || b.raw_match?.timestamp || 0).getTime();
      return timeB - timeA;
    });

    // Use genuine Firestore match_id from Match_Logs
    items = items.map((item) => {
      const dbMatchId = String(item.raw_match?.match_id || item.raw_match?.id || item.match_id || '').replace(/^#/, '').trim();
      const displayId = dbMatchId ? (dbMatchId.startsWith('#') ? dbMatchId : `#${dbMatchId}`) : '#MATCH-001';
      return {
        ...item,
        match_id: displayId,
      };
    });

    if (items.length > 0) {
      setCachedData('all_official_matches_master', items);
      try { localStorage.setItem('atleta_cached_official_matches_master', JSON.stringify(items)); } catch {}
    } else {
      // Don't wipe out valid local/stored matches when network request returns empty or fails
      const fallback = getStoredOfficialMatches(userMe);
      if (fallback.length > 0) {
        items = fallback;
        setCachedData('all_official_matches_master', fallback);
      }
    }

    // Filter by tab status
    if (statusFilter === 'PENDING') items = items.filter((i) => i.status === 'PENDING');
    else if (statusFilter === 'PROCESSED') items = items.filter((i) => i.status === 'AUDITED');

    // Filter by sport
    if (normSport && normSport !== 'ALL' && normSport !== 'ALL SPORTS') {
      const s = normSport.toLowerCase();
      items = items.filter((i) => {
        const itemSport = (i.sport || '').toLowerCase();
        if (s.includes('basket')) return itemSport.includes('basket');
        if (s.includes('swim')) return itemSport.includes('swim') || itemSport.includes('aquatic');
        if (s.includes('track') || s.includes('field')) return itemSport.includes('track') || itemSport.includes('field');
        return itemSport.includes(s);
      });
    }

    setCachedData(cacheKey, items);
    return items;
  } catch (error) {
    console.error('getAuditMatches error:', error);
    const fallback = getStoredOfficialMatches();
    if (fallback.length > 0) return fallback;
    return [];
  }
};

export const getAllOfficialMatchesMaster = async (
  forceRefresh = false
): Promise<import('./types').MatchSummaryItem[]> => {
  const cached = getCachedData<import('./types').MatchSummaryItem[]>('all_official_matches_master');
  if (cached && Array.isArray(cached) && cached.length > 0 && !forceRefresh) return cached;

  const stored = getStoredOfficialMatches();
  if (stored.length > 0 && !forceRefresh) {
    setCachedData('all_official_matches_master', stored);
    return stored;
  }

  const fetched = await getAuditMatches('ALL', 'ALL', forceRefresh);
  if (Array.isArray(fetched) && fetched.length > 0) {
    // Intelligently merge with stored matches so created matches are never lost on refresh
    const currentStored = getStoredOfficialMatches();
    const serverIds = new Set(fetched.map((m) => String(m.match_id || '').replace(/^#/, '')));
    const locallyPreserved = currentStored.filter((m) => {
      const id = String(m.match_id || '').replace(/^#/, '');
      return !serverIds.has(id);
    });
    const merged = [...locallyPreserved, ...fetched];
    setCachedData('all_official_matches_master', merged);
    try { localStorage.setItem('atleta_cached_official_matches_master', JSON.stringify(merged)); } catch {}
    return merged;
  }

  const fallback = getStoredOfficialMatches();
  if (fallback.length > 0) {
    setCachedData('all_official_matches_master', fallback);
    return fallback;
  }
  return fetched || [];
};

export const prefetchAllOfficialAuditMatches = async (): Promise<void> => {
  try {
    // Prime the master dataset first
    await getAllOfficialMatchesMaster(false);
  } catch (err) {
    console.warn('Background match prefetch failed:', err);
  }
};

// Load the data for official user
export const warmOfficialAppCache = async (): Promise<void> => {
  const token = getStoredToken();
  if (!token) return;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  // Prioritize primary dashboard metrics & matches so they are immediately available
  await Promise.allSettled([
    getMe(),
    getOfficialDashboard(),
    getAllOfficialMatchesMaster(),
  ]).catch(() => { });

  // Preload remaining secondary datasets in the background without blocking
  Promise.allSettled([
    getOfficialSchedules(currentMonth, currentYear),
    getOfficialSchedules(nextMonth, nextYear),
    getOfficialProfileData(),
    getOfficialSettings(),
    getOfficialNotifications(),
    getSports(false, true),
    prefetchAllOfficialAuditMatches(),
  ]).catch(() => { });
};

// Load the data for admin user
export const warmAdminAppCache = async (): Promise<void> => {
  const token = getStoredToken();
  if (!token) return;

  Promise.allSettled([
    getAdminProfile(),
    getAdminCoachQueue(),
    getSports(false, true),
  ]).catch(() => { });
};


// ─── SPORTS MANAGEMENT  ───────────────────────────────────────────────────

export const getSports = async (activeOnly = false, forceRefresh = false): Promise<SportsListResponse> => {
  const cacheKey = `sports_catalog_${activeOnly}`;
  const cached = getCachedData<SportsListResponse>(cacheKey);
  if (cached && !forceRefresh) return cached;

  const queryParts: string[] = [];
  if (activeOnly) queryParts.push('active=true');
  if (forceRefresh) queryParts.push(`_t=${Date.now()}`);
  const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  const res = await authFetch(`${BASE_URL}/sports${query}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(forceRefresh ? { 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' } : {}),
    },
    ...(forceRefresh ? { cache: 'no-store' as RequestCache } : {}),
  });
  const data = await handleResponse<SportsListResponse>(res);
  setCachedData(cacheKey, data);
  return data;
};

export const getSportById = async (sportId: string): Promise<{ message?: string; sport: SportConfiguration }> => {
  const token = getStoredToken();
  const res = await authFetch(`${BASE_URL}/sports/${encodeURIComponent(sportId)}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return handleResponse<{ message?: string; sport: SportConfiguration }>(res);
};

export const createSport = async (payload: CreateSportPayload): Promise<{ message: string; sport: SportConfiguration }> => {
  const token = getStoredToken();
  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp_${Date.now()}_${Math.random()}`;

  const res = await authFetch(`${BASE_URL}/sports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<{ message: string; sport: SportConfiguration }>(res);
  if (data?.sport) {
    const adminCat = getCachedData<SportConfiguration[]>('admin_sports_catalog') || [];
    const updated = [...adminCat.filter((s) => s.sport_id !== data.sport.sport_id), data.sport];
    setCachedData('admin_sports_catalog', updated);
    setCachedData('sports_catalog_false', { total_sports: updated.length, sports: updated });
    setCachedData('sports_catalog_true', {
      total_sports: updated.filter((s) => s.is_active !== false).length,
      sports: updated.filter((s) => s.is_active !== false),
    });
  } else {
    invalidateCache('sports_catalog');
    invalidateCache('admin_sports_catalog');
  }
  try {
    localStorage.setItem('atleta_sports_last_mutated', String(Date.now()));
  } catch { }
  return data;
};

export const updateSport = async (
  sportId: string,
  payload: Partial<CreateSportPayload> & { active?: boolean }
): Promise<{ message: string; sport: SportConfiguration }> => {
  const token = getStoredToken();
  const res = await authFetch(`${BASE_URL}/sports/${encodeURIComponent(sportId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<{ message: string; sport: SportConfiguration }>(res);
  const updatedSport = data.sport;
  if (updatedSport) {
    const cleanId = (updatedSport.sport_id || sportId).toLowerCase();
    const updateList = (list?: SportConfiguration[] | null) => {
      if (!Array.isArray(list)) return [updatedSport];
      const exists = list.some((s) => (s.sport_id || '').toLowerCase() === cleanId);
      return exists
        ? list.map((s) => ((s.sport_id || '').toLowerCase() === cleanId ? { ...s, ...updatedSport } : s))
        : [...list, updatedSport];
    };
    const adminCat = getCachedData<SportConfiguration[]>('admin_sports_catalog');
    if (adminCat) setCachedData('admin_sports_catalog', updateList(adminCat));

    const catFalse = getCachedData<SportsListResponse>('sports_catalog_false');
    if (catFalse && Array.isArray(catFalse.sports)) {
      const up = updateList(catFalse.sports);
      setCachedData('sports_catalog_false', { total_sports: up.length, sports: up });
    }
    const catTrue = getCachedData<SportsListResponse>('sports_catalog_true');
    if (catTrue && Array.isArray(catTrue.sports)) {
      const up = updateList(catTrue.sports).filter((s) => s.is_active !== false);
      setCachedData('sports_catalog_true', { total_sports: up.length, sports: up });
    }
  } else {
    invalidateCache('sports_catalog');
    invalidateCache('admin_sports_catalog');
  }
  try {
    localStorage.setItem('atleta_sports_last_mutated', String(Date.now()));
  } catch { }
  return data;
};

export const deleteSport = async (
  sportId: string
): Promise<{ message: string; sport_id: string }> => {
  const token = getStoredToken();
  const res = await authFetch(`${BASE_URL}/sports/${encodeURIComponent(sportId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  let data: { message: string; sport_id: string };
  if (res.status === 404) {
    data = { message: 'Sport already deleted from database.', sport_id: sportId };
  } else {
    data = await handleResponse<{ message: string; sport_id: string }>(res);
  }
  const cleanId = (data?.sport_id || sportId).toLowerCase();

  const filterList = (list?: SportConfiguration[] | null) => {
    if (!Array.isArray(list)) return [];
    return list.filter((s) => {
      const sId = (s.sport_id || '').toLowerCase();
      const sName = (s.sport_name || '').toLowerCase();
      return sId !== cleanId && sName !== cleanId;
    });
  };

  const adminCat = getCachedData<SportConfiguration[]>('admin_sports_catalog');
  if (adminCat) setCachedData('admin_sports_catalog', filterList(adminCat));

  const catFalse = getCachedData<SportsListResponse>('sports_catalog_false');
  if (catFalse && Array.isArray(catFalse.sports)) {
    const up = filterList(catFalse.sports);
    setCachedData('sports_catalog_false', { total_sports: up.length, sports: up });
  }

  const catTrue = getCachedData<SportsListResponse>('sports_catalog_true');
  if (catTrue && Array.isArray(catTrue.sports)) {
    const up = filterList(catTrue.sports);
    setCachedData('sports_catalog_true', { total_sports: up.length, sports: up });
  }

  try {
    localStorage.setItem('atleta_sports_last_mutated', String(Date.now()));
  } catch { }

  return data;
};

// Re-export extended client features (match details, tournament brackets, athlete profiling, scoresheet requests)
export * from './client2';

import type {
  AuthResponse,
  AuthUser,
  OfficialLoginPayload,
  OfficialRegisterPayload,
  PasswordResetPayload,
  OfficialSettings,
  OfficialDashboardResponse,
  OfficialScheduleItem,
  CreateMatchPayload,
} from './types';

const BASE_URL = (import.meta.env.VITE_ATLETA_API || '').replace(/\/+$/, '');

const TOKEN_KEY = 'atleta_official_token';
const USER_KEY = 'atleta_official_user';
const PERSIST_KEY = 'atleta_persist_session';

// In-Memory Client Cache for instant screen-to-screen navigation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

export const getCachedData = <T>(key: string): T | null => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
};

export const setCachedData = (key: string, data: any): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const invalidateCache = (prefix?: string): void => {
  if (!prefix) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  }
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
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

export const storeAuthSession = (token: string, user: AuthUser, persist: boolean): void => {
  if (persist) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(PERSIST_KEY, 'true');
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(PERSIST_KEY);
  }
  setCachedData('user_me', user);
};

export const clearAuthSession = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PERSIST_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  invalidateCache();
};

async function handleResponse<T>(res: Response): Promise<T> {
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
  const res = await fetch(`${BASE_URL}/users/official/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });
  const data = await handleResponse<AuthResponse>(res);
  if (data.token && data.user) {
    storeAuthSession(data.token, data.user, Boolean(payload.savePassword));
  }
  return data;
};

export const registerOfficial = async (payload: OfficialRegisterPayload): Promise<AuthResponse> => {
  const fullName = payload.full_legal_name.trim();
  const orgName = (payload.organization_name || payload.organization || '').trim();
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'Official';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  const res = await fetch(`${BASE_URL}/users/official`, {
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

export const requestPasswordReset = async (payload: PasswordResetPayload): Promise<{ message: string }> => {
  const res = await fetch(`${BASE_URL}/users/password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: payload.email.trim() }),
  });
  return handleResponse<{ message: string }>(res);
};

export const getMe = async (forceRefresh = false): Promise<AuthUser> => {
  const cached = getCachedData<AuthUser>('user_me');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await handleResponse<any>(res);
  const user = data.user || data;
  setCachedData('user_me', user);
  return user;
};

export const getOfficialDashboard = async (forceRefresh = false): Promise<OfficialDashboardResponse> => {
  const cached = getCachedData<OfficialDashboardResponse>('official_dashboard');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/officials/dashboard`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await handleResponse<OfficialDashboardResponse>(res);
  setCachedData('official_dashboard', data);
  return data;
};

export const getOfficialSchedules = async (month?: number, year?: number, forceRefresh = false): Promise<OfficialScheduleItem[]> => {
  const cacheKey = `official_schedules_${month ?? 'all'}_${year ?? 'all'}`;
  const cached = getCachedData<OfficialScheduleItem[]>(cacheKey);
  if (cached && Array.isArray(cached) && !forceRefresh) return cached;

  const token = getStoredToken();
  const params = new URLSearchParams();
  if (month !== undefined) params.append('month', String(month));
  if (year !== undefined) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE_URL}/officials/schedules${qs}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await handleResponse<any>(res);
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.schedules)
    ? data.schedules
    : Array.isArray(data?.data)
    ? data.data
    : [];
  setCachedData(cacheKey, list);
  return list;
};

export const getOfficialSettings = async (forceRefresh = false): Promise<OfficialSettings> => {
  const cached = getCachedData<OfficialSettings>('official_settings');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/officials/settings`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await handleResponse<OfficialSettings>(res);
  setCachedData('official_settings', data);
  return data;
};

export const updateOfficialSettings = async (settings: Partial<OfficialSettings>): Promise<OfficialSettings> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/officials/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(settings),
  });
  const data = await handleResponse<OfficialSettings>(res);
  setCachedData('official_settings', data);
  return data;
};

export const createOfficialMatch = async (payload: CreateMatchPayload): Promise<any> => {
  const token = getStoredToken();
  const idempotencyKey = crypto.randomUUID();
  const res = await fetch(`${BASE_URL}/matches/official`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      team_id: payload.team_id || 'team_001',
      sport_type: payload.sport_type || 'BASKETBALL',
      match_date: payload.match_date || new Date().toISOString(),
      location: payload.location || payload.venue || 'Main Sports Complex',
      court_number: payload.court_number || 1,
      opponent_team_name: payload.opponent_team_name,
      home_team_name: payload.home_team_name || 'Home Team',
    }),
  });
  const data = await handleResponse<any>(res);
  // Invalidate dashboard and schedule cache so new match is shown
  invalidateCache('official_dashboard');
  invalidateCache('official_schedules');
  return data;
};

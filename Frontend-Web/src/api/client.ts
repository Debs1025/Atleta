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
  AdminLoginPayload,
  AdminCoachQueueResponse,
  SportConfiguration,
  SportsListResponse,
  CreateSportPayload,
} from './types';

const rawApi = (import.meta.env.VITE_ATLETA_API || '').trim().replace(/\/+$/, '');
const BASE_URL = rawApi ? (rawApi.endsWith('/api/v1') ? rawApi : `${rawApi}/api/v1`) : '';

const TOKEN_KEY = 'atleta_official_token';
const USER_KEY = 'atleta_official_user';
const PERSIST_KEY = 'atleta_persist_session';
const SETTINGS_KEY = 'atleta_official_settings';

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

export const getStoredOfficialSettings = (): OfficialSettings | null => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) || sessionStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
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
  localStorage.removeItem(SETTINGS_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(SETTINGS_KEY);
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
  const email = payload.email.trim();
  const password = payload.password;

  try {
    const res = await fetch(`${BASE_URL}/users/official/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await handleResponse<AuthResponse>(res);
      if (data.token && data.user) {
        storeAuthSession(data.token, data.user, Boolean(payload.savePassword));
      }
      return data;
    }
  } catch { }

  try {
    const res = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await handleResponse<AuthResponse>(res);
      if (data.token && data.user) {
        data.user.role = data.user.role || 'SystemAdmin';
        storeAuthSession(data.token, data.user, Boolean(payload.savePassword));
      }
      return data;
    }
  } catch { }

  // 3. Fallback to general user login route
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse<AuthResponse>(res);
  if (data.token && data.user) {
    storeAuthSession(data.token, data.user, Boolean(payload.savePassword));
  }
  return data;
};

export const loginAdmin = async (payload: AdminLoginPayload): Promise<AuthResponse> => {
  const email = payload.email.trim();
  const password = payload.password;

  // Try admin login endpoint
  let data: AuthResponse | null = null;
  try {
    const res = await fetch(`${BASE_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      data = await handleResponse<AuthResponse>(res);
    }
  } catch { }

  // Fallback to general user login
  if (!data || !data.token) {
    const userRes = await fetch(`${BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    data = await handleResponse<AuthResponse>(userRes);
  }

  if (data && data.token && data.user) {
    if (!data.user.role || data.user.role === 'User' || data.user.role === 'System Admin') {
      data.user.role = 'SystemAdmin';
    }
    storeAuthSession(data.token, data.user, Boolean(payload.savePassword));
    return data;
  }

  throw new Error('Invalid email or password.');
};

export const getAdminProfile = async (forceRefresh = false): Promise<any> => {
  const cached = getCachedData<any>('admin_profile');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  try {
    const res = await fetch(`${BASE_URL}/admin/profile`, {
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
  const cached = getCachedData<AdminCoachQueueResponse>('admin_coach_queue');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  if (!token) return { total_pending: 0, queue: [] };

  try {
    const res = await fetch(`${BASE_URL}/admin/coaches/queue`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(7000),
    });
    if (res.ok) {
      const data = await handleResponse<AdminCoachQueueResponse>(res);
      setCachedData('admin_coach_queue', data);
      return data;
    }
  } catch { }

  return cached || { total_pending: 0, queue: [] };
};


export const approveCoachAccreditation = async (coachId: string): Promise<any> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/admin/coaches/${coachId.replace(/^coach_/, '')}/approve`, {
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
  const res = await fetch(`${BASE_URL}/admin/coaches/${coachId.replace(/^coach_/, '')}/reject`, {
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

export const changeOfficialPassword = async (password: string): Promise<{ message: string }> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/users/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ password }),
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
    const res = await fetch(`${BASE_URL}/coaches/${cleanId}`);
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

export const getOfficialSchedules = async (month?: number, year?: number, forceRefresh = false): Promise<OfficialScheduleItem[]> => {
  const cacheKey = `official_schedules_${month ?? 'all'}_${year ?? 'all'}`;
  const cached = getCachedData<OfficialScheduleItem[]>(cacheKey);
  if (cached && Array.isArray(cached) && !forceRefresh) return cached;

  const token = getStoredToken();
  const params = new URLSearchParams();
  if (month !== undefined) params.append('month', String(month));
  if (year !== undefined) params.append('year', String(year));

  const qs = params.toString() ? `?${params.toString()}` : '';
  const [data, masterMatches] = await Promise.all([
    fetch(`${BASE_URL}/officials/schedules${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).then((r) => handleResponse<any>(r)).catch(() => null),
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

    const dateStr = raw.match_date || (m as any).match_date || (m as any).scheduled_time || raw.timestamp || new Date().toISOString();
    const d = new Date(dateStr);
    const mMonth = !isNaN(d.getTime()) ? d.getMonth() + 1 : undefined;
    const mYear = !isNaN(d.getTime()) ? d.getFullYear() : undefined;
    const uMonth = !isNaN(d.getTime()) ? d.getUTCMonth() + 1 : undefined;
    const uYear = !isNaN(d.getTime()) ? d.getUTCFullYear() : undefined;

    const monthMatches = month === undefined || mMonth === month || uMonth === month || (typeof dateStr === 'string' && dateStr.includes(`-${String(month).padStart(2, '0')}-`));
    const yearMatches = year === undefined || mYear === year || uYear === year || (typeof dateStr === 'string' && dateStr.includes(String(year)));

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

    list.push({
      schedule_id: `sched_${rawId}`,
      match_id: rawId,
      official_id: resolvedOffId,
      requested_by: raw.requested_by || (isMine ? (userMe?.uid || '') : ''),
      created_by: raw.created_by || (isMine ? (userMe?.uid || '') : ''),
      venue: venue,
      court_number: court,
      scheduled_time: dateStr,
      month: mMonth || uMonth,
      year: mYear || uYear,
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
        time: dateStr,
        coaches: resolvedCoaches.join(', '),
      },
      raw_match: { ...raw, ...m, match_id: rawId, official_id: resolvedOffId, match_date: dateStr },
    });
    existingIds.add(rawId);
  }

  const finalList = list.filter((s) => {
    return isMatchCreatedByOfficial(s as any, userMe);
  });

  setCachedData(cacheKey, finalList);
  return finalList;
};

export const getOfficialSettings = async (forceRefresh = false): Promise<OfficialSettings> => {
  const cached = getCachedData<OfficialSettings>('official_settings') || getStoredOfficialSettings();
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
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch { }
  return data;
};

export const updateOfficialSettings = async (
  payload: Partial<OfficialSettings>
): Promise<OfficialSettings> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/officials/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<OfficialSettings>(res);
  setCachedData('official_settings', data);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch { }
  return data;
};

const CREATED_MATCHES_PREFIX = 'atleta_created_matches_';

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

export const isMatchCreatedByOfficial = (
  item: import('./types').MatchSummaryItem,
  user: import('./types').AuthUser | null
): boolean => {
  const currentUser = user || getStoredUser() || getCachedData<import('./types').AuthUser>('user_me');
  const raw = item.raw_match || {};
  const cleanId = String(item.match_id || raw.match_id || '').replace(/^#/, '');

  // 1. Check locally tracked created & certified matches
  const myUid = currentUser?.uid || (currentUser as any)?.user_id || (currentUser as any)?.id;
  const createdIds = getOfficialCreatedMatchIds(myUid);
  const candidateIds = [
    cleanId,
    item.match_id ? String(item.match_id).replace(/^#/, '') : null,
    item.validation_id ? String(item.validation_id).replace(/^#/, '') : null,
    raw.match_id ? String(raw.match_id).replace(/^#/, '') : null,
    raw.validation_id ? String(raw.validation_id).replace(/^#/, '') : null,
    raw.audit_id ? String(raw.audit_id).replace(/^#/, '') : null,
    raw.reference_id ? String(raw.reference_id).replace(/^#/, '') : null,
    (item as any).id ? String((item as any).id).replace(/^#/, '') : null,
    (raw as any).id ? String((raw as any).id).replace(/^#/, '') : null,
  ].filter(Boolean) as string[];

  for (const cid of candidateIds) {
    if (createdIds.has(cid) || isMatchLocallyCertified(cid)) {
      return true;
    }
  }

  if (!currentUser) return false;

  const clean = (s: any) => String(s || '').trim().toLowerCase().replace(/^off_/, '');

  // 2. Check IDs for this official user (case-insensitive)
  const userIds = new Set(
    [
      currentUser.uid,
      currentUser.user_id,
      (currentUser as any).id,
      (currentUser as any).official_id,
      currentUser.email,
      (currentUser as any).name,
      currentUser.full_name,
      (currentUser as any).full_legal_name,
      currentUser.uid ? `off_${currentUser.uid.replace(/^off_/, '')}` : null,
      currentUser.uid ? currentUser.uid.replace(/^off_/, '') : null,
      (currentUser as any).official_id ? String((currentUser as any).official_id).replace(/^off_/, '') : null,
      (currentUser as any).official_id ? `off_${String((currentUser as any).official_id).replace(/^off_/, '')}` : null,
    ].filter(Boolean).map(clean)
  );

  // Candidate creator/official fields on the match record
  const matchOwners = [
    raw.official_id,
    raw.requested_by,
    raw.created_by,
    raw.creator_id,
    raw.creator,
    raw.user_id,
    raw.author_id,
    raw.certified_by,
    raw.validated_by,
    raw.assigned_to,
    (item as any).official_id,
    (item as any).requested_by,
    (item as any).created_by,
    (item as any).creator_id,
    (item as any).creator,
    (item as any).user_id,
  ].filter(Boolean).map(clean);

  for (const owner of matchOwners) {
    if (owner && userIds.has(owner)) return true;
  }

  // 3. Check assigned_officials array if present
  const assigned = (
    Array.isArray(raw.assigned_officials)
      ? raw.assigned_officials
      : Array.isArray((item as any).assigned_officials)
        ? (item as any).assigned_officials
        : []
  ).map(clean);

  for (const off of assigned) {
    if (off && userIds.has(off)) return true;
  }

  if (raw.created_via === 'OFFICIAL_PORTAL' || raw.source === 'OFFICIAL_PORTAL' || raw.match_type === 'OFFICIAL') {
    return true;
  }

  return false;
};

export const createOfficialMatch = async (payload: CreateMatchPayload): Promise<any> => {
  const token = getStoredToken();
  const idempotencyKey = crypto.randomUUID();

  const sportName = String(payload.sport_type || 'Basketball').trim();
  const home = String(payload.home_team_name || payload.team_id || 'Home Team').trim() || 'Home Team';
  const away = String(payload.opponent_team_name || (payload as any).away_team_id || 'Opponent').trim() || 'Opponent';
  const location = String(payload.location || payload.venue || 'Tournament Sports Complex').trim() || 'Tournament Sports Complex';

  const res = await fetch(`${BASE_URL}/matches/official`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      team_id: home,
      home_team_id: home,
      home_team_name: home,
      opponent_team_name: away,
      away_team_id: away,
      sport_type: sportName,
      match_date: payload.match_date || new Date().toISOString(),
      location: location,
      venue: location,
      court_number: payload.court_number || 1,
      participating_teams: Array.isArray(payload.participating_teams) && payload.participating_teams.length > 0
        ? payload.participating_teams
        : [home, away],
      game_name: payload.game_name || `${home} vs ${away}`,
      coaches: Array.isArray(payload.coaches) ? payload.coaches : [],
      assigned_coaches: Array.isArray(payload.coaches) ? payload.coaches : [],
    }),
  });
  const data = await handleResponse<any>(res);
  const createdId = data?.match?.match_id || data?.match_id || data?.data?.match_id || data?.id;
  const user = getStoredUser();
  if (createdId) {
    const rawIdStr = String(createdId);
    recordOfficialCreatedMatchId(rawIdStr, user?.uid);
    recordOfficialCreatedMatchId(rawIdStr.replace(/^#/, ''), user?.uid);
  }

  // Invalidate dashboard, schedules, and match queue caches so new match reflects instantly everywhere
  invalidateCache('official_dashboard');
  invalidateCache('official_schedules');
  invalidateCache('all_official_matches_master');
  invalidateCache();
  return data;
};

const READ_NOTIFS_KEY = 'atleta_read_notification_ids';

export const getStoredReadNotificationIds = (): Set<string> => {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(READ_NOTIFS_KEY) || '[]');
    return new Set(list);
  } catch {
    return new Set();
  }
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

export const getOfficialNotifications = async (forceRefresh = false): Promise<{ unread_count: number; notifications: import('./types').OfficialNotificationItem[] }> => {
  const cached = getCachedData<{ unread_count: number; notifications: import('./types').OfficialNotificationItem[] }>('official_notifications');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/officials/notifications`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await handleResponse<any>(res);
  const rawList: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.notifications)
      ? data.notifications
      : Array.isArray(data?.data)
        ? data.data
        : [];

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
      is_read: Boolean(n.is_read) || readSet.has(id),
      created_at: n.created_at || new Date().toISOString(),
      requested_by_coach: n.requested_by_coach || n.requested_by || undefined,
      match_context: n.match_context || n.match_class || undefined,
      sport_discipline: n.sport_discipline || n.sport || undefined,
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
  // Update Officials Notification Cached Data
  const cached = getCachedData<{ unread_count: number; notifications: import('./types').OfficialNotificationItem[] }>('official_notifications');
  if (cached) {
    storeAllReadNotificationIds(cached.notifications.map((n) => n.notification_id));
    setCachedData('official_notifications', {
      unread_count: 0,
      notifications: cached.notifications.map((n) => ({ ...n, is_read: true })),
    });
  }

  try {
    const res = await fetch(`${BASE_URL}/officials/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      // Fallback to /notifications/read-all or POST
      await fetch(`${BASE_URL}/notifications/read-all`, {
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
    await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
  }
};

export const getOfficialProfileData = async (forceRefresh = false): Promise<any> => {
  const cached = getCachedData<any>('official_profile');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  try {
    const res = await fetch(`${BASE_URL}/officials/profile`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      setCachedData('official_profile', data);
      return data;
    }
  } catch {
  }

  return getMe();
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
    const res = await fetch(`${BASE_URL}/officials/profile`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(bodyData),
    });
    if (res.ok) {
      const data = await res.json();
      setCachedData('official_profile', data);
      return data;
    }
  } catch { }

  try {
    const res2 = await fetch(`${BASE_URL}/officials/me`, {
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
    const res3 = await fetch(`${BASE_URL}/users/profile`, {
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
      fetch(`${BASE_URL}/officials/dashboard`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${BASE_URL}/matches?all=true`, { headers }).then((r) => (r.ok ? r.json() : { matches: [] })).catch(() => ({ matches: [] })),
      fetch(`${BASE_URL}/validations/pending`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);

    const dashboardQueue: any[] = Array.isArray(dashboardRes?.audit_queue) ? dashboardRes.audit_queue : [];
    const allMatchesList: any[] = Array.isArray(matchesRes?.matches) ? matchesRes.matches : (Array.isArray(matchesRes) ? matchesRes : []);
    const pendingValidations: any[] = Array.isArray(pendingRes) ? pendingRes : [];

    const userMe = getStoredUser();

    dashboardQueue.forEach((item) => {
      const id = item.match_id || item.audit_id;
      if (id) {
        const rawId = String(id);
        recordOfficialCreatedMatchId(rawId, userMe?.uid);
        recordOfficialCreatedMatchId(rawId.replace(/^#/, ''), userMe?.uid);
      }
    });

    pendingValidations.forEach((v) => {
      const id = v.match_id || v.validation_id;
      if (id) {
        const rawId = String(id);
        recordOfficialCreatedMatchId(rawId, userMe?.uid);
        recordOfficialCreatedMatchId(rawId.replace(/^#/, ''), userMe?.uid);
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

      if (combinedMap.has(key)) {
        const existing = combinedMap.get(key)!;
        if (isCertified) existing.status = 'AUDITED';
        existing.raw_match = { ...existing.raw_match, ...match, ...raw };
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
          match_class: `${homeTeam} vs. ${awayTeam}${matchType}`,
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

    let items = Array.from(combinedMap.values());
    setCachedData('all_official_matches_master', items);

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
    return [];
  }
};

export const getAllOfficialMatchesMaster = async (
  forceRefresh = false
): Promise<import('./types').MatchSummaryItem[]> => {
  const cached = getCachedData<import('./types').MatchSummaryItem[]>('all_official_matches_master');
  if (cached && !forceRefresh) return cached;
  return getAuditMatches('ALL', 'ALL', forceRefresh);
};

export const prefetchAllOfficialAuditMatches = async (): Promise<void> => {
  try {
    // Prime the master dataset first
    await getAllOfficialMatchesMaster(true);
  } catch (err) {
    console.warn('Background match prefetch failed:', err);
  }
};

export const getMatchAuditDetail = async (
  rawMatchId: string,
  forceRefresh = false
): Promise<import('./types').MatchAuditDetail | null> => {
  const matchId = rawMatchId.replace(/^#/, '');
  const cacheKey = `match_audit_detail_${matchId}`;
  const cached = getCachedData<import('./types').MatchAuditDetail>(cacheKey);
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const [detailsRes, boxscoreRes, pendingRes] = await Promise.all([
      fetch(`${BASE_URL}/matches/${matchId}/details`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${BASE_URL}/matches/${matchId}/boxscore`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${BASE_URL}/validations/pending`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);

    const details = detailsRes || {};
    const boxscore = boxscoreRes || {};
    const match = details.match || boxscore.match || details;
    const pendingVal = Array.isArray(pendingRes) ? pendingRes.find((p: any) => p.match_id === matchId) : null;
    const validationId = pendingVal?.validation_id || match?.validation_id || matchId;

    const homeTeamName = (match.home_team_name || match.team_summary?.team_name || match.team_id || 'TEAM 1').toUpperCase();
    const awayTeamName = (match.opponent_team_name || match.away_team_name || match.team_summary?.opponent_team_name || 'TEAM 2').toUpperCase();
    const sportType = match.sport_type || 'Basketball';
    const leagueClass = match.match_type
      ? `${sportType.toUpperCase()} • ${match.match_type.toUpperCase()}`
      : `${sportType.toUpperCase()} • MEN'S VARSITY LEAGUE`;

    const d = new Date(match.match_date || match.timestamp || Date.now());
    const matchDateFormatted = !isNaN(d.getTime())
      ? `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} / ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`
      : 'DATE TBD';

    const playerMetrics: any[] = boxscore.player_metrics || details.player_metrics || match.player_stats || [];

    // Check if individual sport (Swimming or Track & Field)
    const isIndividual = sportType.toLowerCase().includes('swim') || sportType.toLowerCase().includes('track') || sportType.toLowerCase().includes('field');

    const raceResults: import('./types').RaceResultRow[] = [];
    if (isIndividual) {
      const rawRace = details.sport_specific_details?.race_results || playerMetrics;
      rawRace.forEach((p: any, idx: number) => {
        const stats = p.sport_stats || p.stats || p;
        raceResults.push({
          athlete_id: p.athlete_id,
          placement_rank: p.placement_rank || (idx + 1),
          athlete_name: p.athlete_name || p.player_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Athlete ${idx + 1}`,
          team_name: p.team_name || p.team || homeTeamName,
          distance: p.distance || (stats.distance_meters ? `${stats.distance_meters}m` : '100m'),
          finish_time: p.formatted_finish_time || p.time || stats.time || stats.formatted_time || '00:00.00',
          split_times: p.split_times || stats.split_times || [],
          efficiency: p.calculated_player_efficiency || stats.calculated_player_efficiency || 0,
          is_disqualified: Boolean(p.is_disqualified || stats.is_disqualified),
        });
      });
    }

    const homePlayers: import('./types').BoxScoreRow[] = [];
    const awayPlayers: import('./types').BoxScoreRow[] = [];

    const mapPlayerToRow = (p: any, idx: number): import('./types').BoxScoreRow => {
      const stats = p.sport_stats || p.stats || p || {};
      const fga = Number(stats.fg_attempted || stats.fga || 0);
      const fgm = Number(stats.fg_made || stats.fgm || 0);
      const fgPct = fga > 0 ? `${((fgm / fga) * 100).toFixed(1)}%` : `${stats.fg_pct || 0}%`;

      const tpa = Number(stats.three_p_attempted || stats.three_attempted || 0);
      const tpm = Number(stats.three_p_made || stats.three_made || 0);
      const threePct = tpa > 0 ? `${((tpm / tpa) * 100).toFixed(1)}%` : `${stats.three_p_pct || stats.three_pct || 0}%`;

      const fta = Number(stats.ft_attempted || stats.fta || 0);
      const ftm = Number(stats.ft_made || stats.ftm || 0);
      const ftPct = fta > 0 ? `${((ftm / fta) * 100).toFixed(1)}%` : `${stats.ft_pct || 0}%`;

      const jersey = p.jersey_number !== undefined && p.jersey_number !== null
        ? String(p.jersey_number).padStart(2, '0')
        : String(idx + 1).padStart(2, '0');

      const fullName = p.player_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || `PLAYER ${jersey}`;
      const pos = p.position && p.position !== 'Unassigned' ? ` (${p.position[0]})` : '';

      return {
        jersey_no: jersey,
        player_name: `${fullName}${pos}`,
        position: p.position || 'G',
        minutes: stats.minutes || '00:00',
        pts: Number(stats.points ?? stats.pts ?? 0),
        reb: Number((stats.offensive_rebounds || 0) + (stats.defensive_rebounds || 0) || stats.rebounds || stats.reb || 0),
        ast: Number(stats.assists ?? stats.ast ?? 0),
        stl: Number(stats.steals ?? stats.stl ?? 0),
        blk: Number(stats.blocks ?? stats.blk ?? 0),
        fg_pct: fgPct,
        three_p_pct: threePct,
        ft_pct: ftPct,
      };
    };

    playerMetrics.forEach((p, idx) => {
      const pTeam = (p.team_name || p.team || '').toUpperCase();
      const isHome = pTeam === homeTeamName || !pTeam || idx % 2 === 0;
      const row = mapPlayerToRow(p, idx);
      if (isHome) {
        homePlayers.push(row);
      } else {
        awayPlayers.push(row);
      }
    });

    const computeTotals = (rows: import('./types').BoxScoreRow[], fallbackScore: number): import('./types').BoxScoreRow => {
      let pts = 0, reb = 0, ast = 0, stl = 0, blk = 0;
      rows.forEach((r) => {
        pts += r.pts;
        reb += r.reb;
        ast += r.ast;
        stl += r.stl;
        blk += r.blk;
      });
      return {
        jersey_no: '',
        player_name: 'TEAM TOTALS',
        minutes: rows.length > 0 ? '200:00' : '00:00',
        pts: pts > 0 ? pts : fallbackScore,
        reb,
        ast,
        stl,
        blk,
        fg_pct: '0.0%',
        three_p_pct: '0.0%',
        ft_pct: '0.0%',
      };
    };

    const homeScore = match.home_score !== undefined ? Number(match.home_score) : homePlayers.reduce((a, b) => a + b.pts, 0);
    const awayScore = match.away_score !== undefined ? Number(match.away_score) : awayPlayers.reduce((a, b) => a + b.pts, 0);

    const homeTotals = computeTotals(homePlayers, homeScore);
    const awayTotals = computeTotals(awayPlayers, awayScore);

    const cachedMaster = getCachedData<import('./types').MatchSummaryItem[]>('all_official_matches_master');
    const cachedItem = cachedMaster?.find((m) => m.match_id.replace(/^#/, '') === matchId);
    const cachedRaw = cachedItem?.raw_match || {};

    const assignedCoaches: string[] =
      (Array.isArray(pendingVal?.match_details?.assigned_coaches) && pendingVal.match_details.assigned_coaches.length > 0 ? pendingVal.match_details.assigned_coaches : null) ||
      (Array.isArray(match.assigned_coaches) && match.assigned_coaches.length > 0 ? match.assigned_coaches : null) ||
      (Array.isArray(cachedRaw.assigned_coaches) && cachedRaw.assigned_coaches.length > 0 ? cachedRaw.assigned_coaches : null) ||
      (Array.isArray(match.coaches) && match.coaches.length > 0 ? match.coaches : null) ||
      (Array.isArray(cachedRaw.coaches) && cachedRaw.coaches.length > 0 ? cachedRaw.coaches : null) ||
      (cachedItem?.coaches && cachedItem.coaches !== 'Official Assigned' && !cachedItem.coaches.startsWith('Coach off_') ? cachedItem.coaches.split('\n') : []);

    const coachName = match.coach_name || cachedRaw.coach_name || (assignedCoaches.length > 0 ? assignedCoaches.join(', ') : undefined);

    const result: import('./types').MatchAuditDetail = {
      match_id: matchId,
      validation_id: validationId,
      game_name: match.match_name || match.game_name || `${homeTeamName} vs ${awayTeamName}`,
      sport_type: sportType,
      league_class: leagueClass,
      match_date_formatted: matchDateFormatted,
      home_team: {
        name: homeTeamName,
        score: homeScore,
        result: homeScore >= awayScore ? 'WIN' : 'LOSE',
        roster_stats: homePlayers,
        team_totals: homeTotals,
      },
      away_team: {
        name: awayTeamName,
        score: awayScore,
        result: awayScore > homeScore ? 'WIN' : 'LOSE',
        roster_stats: awayPlayers,
        team_totals: awayTotals,
      },
      race_results: raceResults,
      scoresheet_url: typeof match.scoresheet_url === 'string' && match.scoresheet_url.trim() ? match.scoresheet_url.trim() : (typeof pendingVal?.scoresheet_url === 'string' ? pendingVal.scoresheet_url.trim() : undefined),
      audit_context_notes: typeof match.notes === 'string'
        ? match.notes
        : Array.isArray(match.notes) && match.notes.length > 0
          ? match.notes.filter((n: any) => typeof n === 'string').join('\n')
          : (typeof pendingVal?.context_notes === 'string' ? pendingVal.context_notes : ''),
      is_certified: Boolean(match.is_certified || match.is_locked),
      assigned_coaches: assignedCoaches,
      coach_name: coachName,
    };

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error('getMatchAuditDetail error:', error);
    return null;
  }
};

export const prefetchMatchAuditDetail = (rawMatchId: string): void => {
  if (!rawMatchId) return;
  const matchId = rawMatchId.replace(/^#/, '');
  getMatchAuditDetail(matchId, false).catch(() => { });
};

export const certifyMatchValidation = async (
  validationId: string,
  payload: { context_notes?: string; scoresheet_url?: string }
): Promise<any> => {
  const token = getStoredToken();
  const cleanPayload: Record<string, string> = {
    context_notes: typeof payload.context_notes === 'string'
      ? payload.context_notes
      : Array.isArray(payload.context_notes)
        ? (payload.context_notes as any[]).join('\n')
        : String(payload.context_notes ?? ''),
  };

  if (typeof payload.scoresheet_url === 'string' && payload.scoresheet_url.trim().length > 0) {
    cleanPayload.scoresheet_url = payload.scoresheet_url.trim();
  }

  const res = await fetch(`${BASE_URL}/validations/${validationId}/certify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cleanPayload),
  });
  const data = await handleResponse<any>(res);
  const user = getStoredUser();
  const actualMatchId = data?.match?.match_id || data?.validation?.match_id || data?.match_id;
  if (actualMatchId) {
    const mKey = String(actualMatchId).replace(/^#/, '');
    markMatchAsCertified(mKey);
    if (user?.uid) recordOfficialCreatedMatchId(mKey, user.uid);
  }
  if (validationId) {
    const vKey = String(validationId).replace(/^#/, '');
    markMatchAsCertified(vKey);
    if (user?.uid) recordOfficialCreatedMatchId(vKey, user.uid);
  }
  invalidateCache();
  return data;
};

export const downloadCertifiedMatchPdf = async (matchId: string): Promise<Blob> => {
  const cleanId = matchId.replace(/^#/, '');
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/matches/${cleanId}/pdf`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to download certified match PDF' }));
    throw new Error(err.error || 'Failed to download certified match PDF');
  }
  return res.blob();
};

export const deleteOfficialMatch = async (matchId: string): Promise<any> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/matches/${matchId.replace(/^#/, '')}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await handleResponse<any>(res);
  invalidateCache();
  return data;
};

export const uploadScoresheetFile = async (matchId: string, file: File): Promise<any> => {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('scoresheet', file);
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/matches/${matchId.replace(/^#/, '')}/scoresheet`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  const data = await handleResponse<any>(res);
  invalidateCache();
  return data;
};

export const scanScoresheetStandalone = async (file: File): Promise<any> => {
  const token = getStoredToken();
  const formData = new FormData();
  formData.append('scoresheet', file);
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/matches/scan-scoresheet`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  return handleResponse<any>(res);
};

export const fetchBrowseTeams = async (sport?: string): Promise<any[]> => {
  const token = getStoredToken();
  const qs = sport ? `?sport=${encodeURIComponent(sport)}` : '';
  try {
    const res = await fetch(`${BASE_URL}/teams/browse${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.teams) ? data.teams : Array.isArray(data) ? data : [];
    }
  } catch { }
  return [];
};

// Sport Addition

export const getSports = async (activeOnly = false, forceRefresh = false): Promise<SportsListResponse> => {
  const cacheKey = `sports_catalog_${activeOnly}`;
  const cached = getCachedData<SportsListResponse>(cacheKey);
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const query = activeOnly ? '?active=true' : '';
  const res = await fetch(`${BASE_URL}/sports${query}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await handleResponse<SportsListResponse>(res);
  setCachedData(cacheKey, data);
  return data;
};

export const getSportById = async (sportId: string): Promise<{ message?: string; sport: SportConfiguration }> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/sports/${encodeURIComponent(sportId)}`, {
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

  const res = await fetch(`${BASE_URL}/sports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<{ message: string; sport: SportConfiguration }>(res);
  invalidateCache('sports_catalog');
  return data;
};

export const updateSport = async (
  sportId: string,
  payload: Partial<CreateSportPayload> & { active?: boolean }
): Promise<{ message: string; sport: SportConfiguration }> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/sports/${encodeURIComponent(sportId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<{ message: string; sport: SportConfiguration }>(res);
  invalidateCache('sports_catalog');
  return data;
};

export const DEFAULT_FALLBACK_SPORTS: SportConfiguration[] = [
  {
    sport_id: 'sport_basketball',
    sport_name: 'Basketball',
    short_identifier: 'BKT',
    configurable_stats: [
      { stat_name_key: 'points', measurement_category: 'Cumulative Total', label: 'Points' },
      { stat_name_key: 'rebounds', measurement_category: 'Cumulative Total', label: 'Rebounds' },
      { stat_name_key: 'assists', measurement_category: 'Cumulative Total', label: 'Assists' },
      { stat_name_key: 'steals', measurement_category: 'Cumulative Total', label: 'Steals' },
      { stat_name_key: 'blocks', measurement_category: 'Cumulative Total', label: 'Blocks' },
    ],
    positions: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    sport_id: 'sport_swimming',
    sport_name: 'Swimming',
    short_identifier: 'SWM',
    configurable_stats: [
      { stat_name_key: 'finish_time', measurement_category: 'Time (ms)', label: 'Finish Time' },
      { stat_name_key: 'split_times', measurement_category: 'Time (ms)', label: 'Split Times' },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    sport_id: 'sport_track_field',
    sport_name: 'Track & Field',
    short_identifier: 'TRK',
    configurable_stats: [
      { stat_name_key: 'finish_time', measurement_category: 'Time (ms)', label: 'Finish Time' },
      { stat_name_key: 'distance', measurement_category: 'Distance (m)', label: 'Distance' },
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const getActiveSportsList = async (forceRefresh = false): Promise<SportConfiguration[]> => {
  try {
    const res = await getSports(true, forceRefresh);
    const list = Array.isArray(res?.sports) ? res.sports : [];
    const active = list.filter((s) => s.is_active !== false);
    if (active.length > 0) return active;
  } catch (err) {
    console.warn('Failed to fetch active sports from server, using fallback catalog:', err);
  }
  return DEFAULT_FALLBACK_SPORTS;
};

export const isIndividualSportType = (
  sportName?: string,
  sportConfig?: SportConfiguration | null
): boolean => {
  const norm = String(sportName || '').toLowerCase().trim();
  if (sportConfig) {
    const hasTimeOrDistance = sportConfig.configurable_stats?.some(
      (s) => s.measurement_category === 'Time (ms)' || s.measurement_category === 'Distance (m)'
    );
    if (hasTimeOrDistance) return true;
    const rules = (sportConfig.scoring_rules as any) || {};
    if (rules.is_individual || rules.match_type === 'INDIVIDUAL' || rules.format === 'RACE') return true;
  }
  return (
    norm.includes('swim') ||
    norm.includes('track') ||
    norm.includes('field') ||
    norm.includes('race') ||
    norm.includes('aquatic') ||
    norm.includes('athletics')
  );
};

export const getSportBadgeCode = (
  sportName?: string,
  sportIdentifier?: string
): string => {
  if (sportIdentifier && sportIdentifier.trim()) {
    return sportIdentifier.trim().substring(0, 3).toUpperCase();
  }
  const norm = String(sportName || '').toUpperCase().trim();
  if (norm.includes('SWIM')) return 'SW';
  if (norm.includes('TRACK') || norm.includes('FIELD')) return 'TF';
  if (norm.includes('BASKET')) return 'BB';
  if (norm.includes('VOLLEY')) return 'VB';
  if (norm.includes('FOOT') || norm.includes('SOCCER')) return 'FB';
  if (norm.includes('BADMINTON')) return 'BD';
  if (norm.includes('TENNIS')) return 'TN';
  if (norm.includes('TABLE') || norm.includes('PING')) return 'TT';
  const words = norm.split(/[\s&_-]+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return norm.substring(0, 2).toUpperCase() || 'SP';
};




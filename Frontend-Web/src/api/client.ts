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
  AdminRegisterPayload,
  AdminCoachQueueResponse,
} from './types';

const BASE_URL = (import.meta.env.VITE_ATLETA_API || '').replace(/\/+$/, '');

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
  } catch {}

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
  } catch {}

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
  } catch {}

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



export const registerAdmin = async (payload: AdminRegisterPayload): Promise<AuthResponse> => {
  const fullName = payload.full_name.trim();
  const email = payload.email.trim();
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'Admin';
  const lastName = nameParts.slice(1).join(' ') || 'User';

  // Try admin/register first
  try {
    const res = await fetch(`${BASE_URL}/admin/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password: payload.password,
        department_code: payload.department_code || 'SYS_ADMIN',
        clearance_level: payload.clearance_level || 4,
        rbac_compliance_accepted: payload.rbac_compliance_accepted ?? true,
      }),
    });
    if (res.ok) {
      const data = await handleResponse<AuthResponse>(res);
      if (data.token && data.user) {
        storeAuthSession(data.token, data.user, true);
      }
      return data;
    }
  } catch {}

  // Fallback to /users/register with System Admin role (compatible with general user register endpoint)
  const res = await fetch(`${BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email,
      password: payload.password,
      role: 'System Admin',
      department_code: payload.department_code || 'SYS_ADMIN',
      clearance_level: payload.clearance_level || 4,
      institution: payload.institution || 'Ateneo de Naga University',
      admin_security_key: 'atleta_admin_key_2026',
    }),
  });

  const data = await handleResponse<AuthResponse>(res);
  if (data.token && data.user) {
    data.user.role = 'SystemAdmin';
    storeAuthSession(data.token, data.user, true);
  }
  return data;
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
  } catch {}

  return getMe(forceRefresh);
};

export const getAdminCoachQueue = async (forceRefresh = false): Promise<AdminCoachQueueResponse> => {
  const cached = getCachedData<AdminCoachQueueResponse>('admin_coach_queue');
  if (cached && !forceRefresh) return cached;

  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/admin/coaches/queue`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await handleResponse<AdminCoachQueueResponse>(res);
  setCachedData('admin_coach_queue', data);
  return data;
};

export const approveCoachAccreditation = async (coachId: string): Promise<any> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/admin/coaches/${coachId.replace(/^coach_/, '')}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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

  const existingIds = new Set(list.map((s) => String(s.match_id || '').replace(/^#/, '')));

  for (const m of masterMatches) {
    const rawId = String(m.match_id || '').replace(/^#/, '');
    if (!rawId || existingIds.has(rawId)) continue;
    const raw = m.raw_match || {};
    const dateStr = raw.match_date || raw.timestamp || new Date().toISOString();
    const d = new Date(dateStr);
    const mMonth = !isNaN(d.getTime()) ? d.getMonth() + 1 : undefined;
    const mYear = !isNaN(d.getTime()) ? d.getFullYear() : undefined;

    if (month !== undefined && mMonth !== undefined && mMonth !== month) continue;
    if (year !== undefined && mYear !== undefined && mYear !== year) continue;

    const home = raw.home_team_name || raw.team_id || raw.home_team || '';
    const away = raw.opponent_team_name || raw.away_team_name || raw.away_team || '';
    const sport = m.sport || raw.sport_type || raw.sport || '';
    const venue = raw.location || raw.venue || '';
    const court = raw.court_number || raw.court || '';

    list.push({
      schedule_id: `sched_${rawId}`,
      match_id: rawId,
      official_id: raw.official_id || '',
      venue: venue,
      court_number: court,
      scheduled_time: dateStr,
      month: mMonth,
      year: mYear,
      sport: sport,
      home_team: home,
      away_team: away,
      venue_logistics: {
        location: venue,
        court: court,
        sport: sport,
        home_team: home,
        away_team: away,
        time: dateStr,
      },
    });
    existingIds.add(rawId);
  }

  setCachedData(cacheKey, list);
  return list;
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
  } catch {}
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
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
  } catch {}
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
      location: payload.location || payload.venue || 'Tournament Sports Complex',
      court_number: payload.court_number || 1,
      opponent_team_name: payload.opponent_team_name,
      home_team_name: payload.home_team_name || 'Home Team',
      participating_teams: payload.participating_teams,
      game_name: payload.game_name,
      coaches: payload.coaches,
      assigned_coaches: payload.coaches,
    }),
  });
  const data = await handleResponse<any>(res);
  // Invalidate dashboard, schedules, and match queue caches so new match reflects instantly everywhere
  invalidateCache('official_dashboard');
  invalidateCache('official_schedules');
  invalidateCache('all_official_matches_master');
  invalidateCache();
  return data;
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

  const notifications: import('./types').OfficialNotificationItem[] = rawList.map((n: any, idx: number) => ({
    notification_id: n.notification_id || `notif_${idx}`,
    official_id: n.official_id || '',
    type: n.type || 'AUDIT_REQUEST',
    title: n.title || '',
    message: n.message || '',
    reference_id: n.reference_id || null,
    is_read: Boolean(n.is_read),
    created_at: n.created_at || new Date().toISOString(),
    requested_by_coach: n.requested_by_coach || n.requested_by || undefined,
    match_context: n.match_context || n.match_class || undefined,
    sport_discipline: n.sport_discipline || n.sport || undefined,
  }));

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
            is_read: false,
            created_at: new Date().toISOString(),
            match_context: s.match_class || `${sportName} Competition`,
            sport_discipline: sportName,
          });
        }
      }
    });
  } catch {}

  const unread_count = typeof data?.unread_count === 'number'
    ? data.unread_count
    : notifications.filter((n) => !n.is_read).length;

  const result = { unread_count, notifications };
  setCachedData('official_notifications', result);
  return result;
};

export const markAllOfficialNotificationsAsRead = async (): Promise<void> => {
  const token = getStoredToken();
  // Optimistically update cache
  const cached = getCachedData<{ unread_count: number; notifications: import('./types').OfficialNotificationItem[] }>('official_notifications');
  if (cached) {
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
      }).catch(() => {});
    }
  } catch {
  }
};

export const markOfficialNotificationAsRead = async (notificationId: string): Promise<void> => {
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
      fetch(`${BASE_URL}/matches`, { headers }).then((r) => (r.ok ? r.json() : { matches: [] })).catch(() => ({ matches: [] })),
      fetch(`${BASE_URL}/validations/pending`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);

    const dashboardQueue: any[] = Array.isArray(dashboardRes?.audit_queue) ? dashboardRes.audit_queue : [];
    const allMatchesList: any[] = Array.isArray(matchesRes?.matches) ? matchesRes.matches : (Array.isArray(matchesRes) ? matchesRes : []);
    const pendingValidations: any[] = Array.isArray(pendingRes) ? pendingRes : [];

    const combinedMap = new Map<string, import('./types').MatchSummaryItem>();

    const parseMatchItem = (raw: any, isAuditedOverride?: boolean) => {
      const match = raw.match_details || raw;
      const rawMatchId = String(match.match_id || raw.match_id || raw.audit_id || raw.id || '');
      if (!rawMatchId) return;

      const key = rawMatchId.replace(/^#/, '');
      const sRaw = String(raw.status || raw.verification_status || match.status || match.verification_status || '').toLowerCase().trim();
      const isCertified = Boolean(
        isAuditedOverride ||
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
      const coaches = match.assigned_coaches?.length ? match.assigned_coaches.join('\n') : (match.coach_name || raw.requested_by ? `Coach ${match.coach_name || raw.requested_by}` : 'Official Assigned');
      const d = new Date(match.match_date || match.timestamp || raw.requested_at || Date.now());
      const dateFormatted = !isNaN(d.getTime())
        ? `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()} / ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : 'DATE TBD';

      if (combinedMap.has(key)) {
        const existing = combinedMap.get(key)!;
        if (isCertified) existing.status = 'AUDITED';
        existing.raw_match = { ...existing.raw_match, ...match };
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
      scoresheet_url: match.scoresheet_url || pendingVal?.scoresheet_url,
      audit_context_notes: match.notes || pendingVal?.context_notes || '',
      is_certified: Boolean(match.is_certified || match.is_locked),
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
  getMatchAuditDetail(matchId, false).catch(() => {});
};

export const certifyMatchValidation = async (
  validationId: string,
  payload: { context_notes?: string; scoresheet_url?: string }
): Promise<any> => {
  const token = getStoredToken();
  const res = await fetch(`${BASE_URL}/validations/${validationId}/certify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<any>(res);
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
  } catch {}
  return [];
};


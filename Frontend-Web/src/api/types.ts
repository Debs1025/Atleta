export interface OfficialLoginPayload {
  email: string;
  password: string;
  savePassword?: boolean;
}

export interface OfficialRegisterPayload {
  email: string;
  password: string;
  full_legal_name: string;
  organization_name: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  license_number?: string;
  sport_accreditation?: string[];
  organization?: string;
  phone_number?: string;
  assigned_sport?: string;
}

export interface PasswordResetPayload {
  email: string;
}

export interface OfficialSettings {
  setting_id?: string;
  official_id?: string;
  split_screen_defaults: boolean;
  discrepancy_presets: boolean;
  match_reminders: boolean;
  updated_at?: string;
}

export interface AuthUser {
  uid: string;
  user_id?: string;
  role: string;
  full_legal_name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  organization_name?: string;
  organization?: string;
  phone_number?: string;
  license_number?: string;
  official_license_number?: string;
  sport_accreditation?: string[];
  avatar_url?: string;
  profile_image?: string;
  photo_url?: string;
  profile?: Record<string, unknown>;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  message?: string;
}

export interface AuditQueueItem {
  audit_id: string;
  match_id: string;
  requested_by?: string;
  status: string;
  requested_at?: string;
  match_details?: {
    match_id?: string;
    sport_type?: string;
    home_team_name?: string;
    away_team_name?: string;
    match_date?: string;
    coach_name?: string;
    status?: string;
    division?: string;
    [key: string]: any;
  } | null;
}

export interface OfficialDashboardResponse {
  total_matches: number;
  pending_count: number;
  audited_count: number;
  audit_queue: AuditQueueItem[];
}

export interface OfficialScheduleItem {
  schedule_id: string;
  match_id: string;
  official_id: string;
  venue?: string;
  court_number?: string | number;
  scheduled_time: string;
  month?: number;
  year?: number;
  assigned_officials?: string[];
  venue_logistics?: {
    location?: string;
    sport?: string;
    court?: string | number;
    home_team?: string;
    away_team?: string;
    time?: string;
    [key: string]: any;
  } | null;
  sport?: string;
  match_class?: string;
  home_team?: string;
  away_team?: string;
}

export interface CreateMatchPayload {
  team_id?: string;
  sport_type: string;
  match_date: string;
  location?: string;
  venue?: string;
  court_number?: string | number;
  opponent_team_name: string;
  home_team_name?: string;
  participating_teams?: string[];
  game_name?: string;
  coaches?: string[];
}

export type AuditStatus = 'PENDING' | 'AUDITED' | 'REJECTED';

export interface BoxScoreRow {
  jersey_no: string;
  player_name: string;
  position?: string;
  minutes: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fg_pct: string;
  three_p_pct: string;
  ft_pct: string;
}

export interface RaceResultRow {
  athlete_id?: string;
  placement_rank: number | string;
  athlete_name: string;
  team_name?: string;
  distance: string;
  finish_time: string;
  split_times?: string[] | number[];
  efficiency?: number;
  is_disqualified?: boolean;
}

export interface MatchAuditDetail {
  match_id: string;
  validation_id: string;
  game_name: string;
  sport_type: string;
  league_class: string;
  match_date_formatted: string;
  home_team: {
    name: string;
    score: number;
    result: 'WIN' | 'LOSE';
    roster_stats: BoxScoreRow[];
    team_totals: BoxScoreRow;
  };
  away_team: {
    name: string;
    score: number;
    result: 'WIN' | 'LOSE';
    roster_stats: BoxScoreRow[];
    team_totals: BoxScoreRow;
  };
  race_results?: RaceResultRow[];
  scoresheet_url?: string;
  audit_context_notes?: string;
  is_certified?: boolean;
  is_locked?: boolean;
}

export interface MatchSummaryItem {
  match_id: string;
  validation_id?: string;
  match_class: string;
  sport: string;
  coaches: string;
  date_time: string;
  status: AuditStatus;
  raw_match?: any;
}

export type OfficialNotificationType = 'AUDIT_REQUEST' | 'SCHEDULE_UPDATE' | 'SCHEDULE_UPDATES' | string;

export interface OfficialNotificationItem {
  notification_id: string;
  official_id: string;
  type: OfficialNotificationType;
  title: string;
  message: string;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
  requested_by_coach?: string;
  match_context?: string;
  sport_discipline?: string;
  [key: string]: any;
}


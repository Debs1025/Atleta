// ─── Match Log Entity ────────────────────────────────────────────────────────
// Stored in Firestore "Match_Logs" collection.

export type SportType = 'Basketball' | 'Swimming' | 'Track & Field' | string;
export type GameResult = 'WIN' | 'LOSS' | 'DRAW' | 'COMPLETED';
export type ValidationStatus = 'Pending' | 'Approved' | 'Rejected';
export type CreatorRole = 'OFFICIAL' | 'COACH' | 'SYSTEM';

export interface MatchCoachParticipant {
  coach_id: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  contact_number?: string;
  team_id?: string;
  team_name?: string;
  role?: string;
}

export interface MatchAthleteParticipant {
  athlete_id: string;
  user_id?: string;
  player_name?: string;
  jersey_number?: number | null;
  team_id?: string;
  team_name?: string;
  position?: string;
  stats?: Record<string, any>;
}

export interface MatchTeamParticipant {
  team_id: string;
  team_name: string;
  coach_id?: string;
  coach_name?: string;
  score?: number;
  roster?: MatchAthleteParticipant[];
}

export interface MatchLog {
  match_id: string;               // Primary Key (e.g. MATCH-0001 or MATCH-OFF-0001)
  team_id: string;                // Foreign Key -> Teams.team_id, Required
  home_team_id?: string;          // Optional Home Team ID
  away_team_id?: string;          // Optional Away Team ID
  home_team_name?: string;        // Home Team Name
  away_team_name?: string;        // Away Team Name
  opponent_team_name: string;     // Required
  logged_by_coach_id?: string;    // Foreign Key -> Coach.coach_id
  official_id?: string;           // Foreign Key -> Official_Profiles.official_id
  created_by_role: CreatorRole;   // 'OFFICIAL' | 'COACH'
  is_official: boolean;           // true for official matches
  sport_type: SportType;          // "Basketball" | "Swimming" | "Track & Field" | dynamic
  event_name?: string;            // e.g. "100m Freestyle", "Men's Basketball Finals"
  match_type: string;             // (e.g. "Official Match", "Tournament", "Dual Meet")
  match_date: string;             // DateTime ISO string, Required
  location: string;               // Required
  venue: string;                  // Required Venue name / court / pool / track facility
  court_number?: string | number; // Court/Lane/Field number
  game_result: GameResult;        // ("WIN" | "LOSS" | "DRAW" | "COMPLETED")
  home_score?: number;
  away_score?: number;
  participating_teams?: MatchTeamParticipant[];
  coaches?: MatchCoachParticipant[];
  assigned_coaches?: string[];    // Array of Coach IDs
  assigned_officials?: string[];  // Array of Official IDs
  roster_athletes?: string[];     // Array of Athlete IDs
  athlete_rosters?: MatchAthleteParticipant[]; // Deep athlete details
  player_stats?: any[];           // Detailed array of player stats from both teams
  scoresheet_data?: Record<string, any>; // Extracted OCR JSON payload
  scoresheet_url?: string;        // Optional URL of uploaded scoresheet
  notes?: string;                 // Text, Optional
  idempotency_key?: string;       // Optional idempotency key string
  reference_id?: string;          // Optional reference ID for official match instances
  is_certified?: boolean;         // Default: false, locked when true
  is_locked?: boolean;            // Default: false, locked when true
  is_invalidated?: boolean;       // Optional flag for disputed match records
  audit_status?: string;          // 'Pending' | 'Approved' | 'Rejected'
  verification_status?: string;   // 'Pending' | 'Certify' | 'Reject'
  timestamp: string;              // DateTime ISO string, Required
  created_at?: string;
  updated_at?: string;
}

// ─── Official Audit (Validation) Entity ────────────────────────────────────
// Stored in Firestore "Official_Audits" collection.

export interface OfficialAudit {
  validation_id: string;          // Primary Key (e.g. AUDIT-0001)
  audit_id?: string;              // Alias for validation_id
  match_id: string;               // Foreign Key -> Match_Logs.match_id / Match_Logs_Official.match_id
  official_id: string | null;     // Foreign Key -> Official_Profiles.official_id
  status: ValidationStatus;       // Enum ("Pending" | "Approved" | "Rejected", Default: "Pending")
  verification_status?: 'Pending' | 'Certify' | 'Reject';
  scoresheet_url?: string;        // Optional
  scoresheet_data?: Record<string, any>; // Optional parsed OCR JSON
  context_notes?: string;         // Optional
  certified_at?: string;          // Optional ISO DateTime
  requested_by?: string;          // coach_id or official_id or system
  requested_by_coach_id?: string;
  requested_at?: string;
  created_at: string;             // ISO DateTime, Required
}

// ─── Sport Specific Stats ───────────────────────────────────────────────────

export interface BasketballStats {
  points: number;
  assists: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  fouls: number;
  turnovers: number;
  steals: number;
  blocks?: number;
  fg_made: number;
  fg_attempted: number;
  ft_made: number;
  ft_attempted: number;
  three_pt_made?: number;
  three_pt_attempted?: number;
  true_shooting_pct?: number;     // Computed TS%
}

export interface SwimmingStats {
  event_name: string;
  stroke_type?: string;          // "Freestyle" | "Breaststroke" | "Backstroke" | "Butterfly" | "Medley"
  distance_meters: number;
  finish_time_ms: number;
  split_times_ms: number[];
  heat_number?: number;
  lane_number?: number;
  placement_rank?: number;
  is_disqualified: boolean;
  disqualification_reason?: string;
}

export interface TrackFieldStats {
  event_name: string;
  category?: 'Track' | 'Field';
  distance_meters?: number;
  finish_time_ms?: number;
  split_times_ms?: number[];
  attempts?: number[];
  valid_mark_meters?: number;    // For Long Jump, High Jump, Shot Put, Javelin
  heat_number?: number;
  lane_number?: number;
  placement_rank?: number;
  is_disqualified: boolean;
  disqualification_reason?: string;
}

export interface IndividualSportStats {
  event_name: string;
  distance_meters: number;
  finish_time_ms: number;
  split_times_ms: number[];
  is_disqualified: boolean;
  placement_rank?: number;
}

export type SportStatsPayload = BasketballStats | SwimmingStats | TrackFieldStats | IndividualSportStats | Record<string, any>;

// ─── Performance Metrics Entity ─────────────────────────────────────────────
// Stored in Firestore "Performance_Metrics" collection.

export interface PerformanceMetric {
  metric_id: string;              // Primary Key, Required
  athlete_id: string;             // Foreign Key -> Athlete.athlete_id, Required
  player_name?: string;           // Optional Player Name
  team_name?: string;             // Optional Team Name (Home or Opponent)
  team?: string;                  // Optional Team Name alias
  match_id: string;               // Foreign Key -> Match_Logs.match_id, Required
  sport_category: string;         // Required
  sport_stats: SportStatsPayload; // Map / JSON Object
  calculated_player_efficiency: number; // Computed Float
  timestamp: string;              // DateTime ISO string, Required
}

// ─── API Payload & Response DTOs ───────────────────────────────────────────

export interface PlayerStatSubmission {
  athlete_id: string;
  player_name?: string;
  team_name?: string;
  team_id?: string;
  jersey_number?: number | null;
  position?: string;
  stats: Record<string, any>;
}

export interface MatchSubmissionPayload {
  team_id: string;
  home_team_id?: string;
  away_team_id?: string;
  home_team_name?: string;
  opponent_team_name: string;
  sport_type: SportType;
  event_name?: string;
  match_type: string;
  match_date: string;
  location: string;
  venue?: string;
  game_result: GameResult;
  home_score?: number;
  away_score?: number;
  coaches?: MatchCoachParticipant[];
  assigned_coaches?: string[];
  athlete_rosters?: MatchAthleteParticipant[];
  player_stats?: PlayerStatSubmission[];
  scoresheet_data?: Record<string, any>;
  scoresheet_url?: string;
  notes?: string;
}

export interface CreateOfficialMatchPayload {
  reference_id?: string;
  team_id?: string;
  home_team_id?: string;
  away_team_id?: string;
  home_team_name?: string;
  opponent_team_name?: string;
  away_team_name?: string;
  sport_type: SportType;
  event_name?: string;
  match_type?: string;
  match_date: string;
  location: string;
  venue: string;                  // Required
  court_number?: string | number;
  scheduled_time?: string;
  game_result?: GameResult;
  home_score?: number;
  away_score?: number;
  participating_teams?: MatchTeamParticipant[];
  coaches?: MatchCoachParticipant[];
  assigned_coaches?: string[];
  athlete_rosters?: MatchAthleteParticipant[];
  roster_athletes?: string[];
  player_stats?: PlayerStatSubmission[];
  scoresheet_data?: Record<string, any>;
  scoresheet_url?: string;
  notes?: string;
  official_id?: string;
}

export interface ParsedScoresheetResult {
  match_id?: string;
  filename?: string;
  scoresheet_url?: string;
  match_info?: {
    sport_type: string;
    event_name?: string;
    home_team_name?: string;
    opponent_team_name?: string;
    game_result?: string;
    final_score?: string;
    venue?: string;
  };
  team_scores?: { team: string; score: number; is_home?: boolean }[];
  player_summary?: {
    player_name: string;
    team_name?: string;
    jersey_number?: number;
    points?: number;
    rebounds?: number;
    assists?: number;
    fouls?: number;
    steals?: number;
    blocks?: number;
    turnovers?: number;
    finish_time_ms?: number;
    distance_meters?: number;
    stroke_type?: string;
    event_name?: string;
  }[];
  parsed_tables?: {
    team_scores: { team: string; score: number }[];
    player_summary: any[];
  };
  raw_ocr_text?: string;
  processed_at: string;
}

export interface BoxscorePlayerMetric {
  metric_id: string;
  athlete_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  team_name?: string;
  position: string;
  jersey_number?: number | null;
  sport_stats: SportStatsPayload;
  calculated_player_efficiency: number;
}

export interface BoxscoreResponse {
  match: MatchLog;
  team_summary: {
    team_id: string;
    team_name: string;
    opponent_team_name: string;
    game_result: GameResult;
    match_date: string;
    location: string;
    venue?: string;
  };
  player_metrics: BoxscorePlayerMetric[];
}

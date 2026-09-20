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
  organization?: string;
  phone_number?: string;
  assigned_sport?: string;
}

export interface PasswordResetPayload {
  email: string;
}

export interface OfficialSettingsPayload {
  split_screen_defaults?: boolean;
  discrepancy_presets?: boolean;
  match_reminders?: boolean;
}

export interface AuthUser {
  uid: string;
  role: string;
  full_legal_name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  organization_name?: string;
  organization?: string;
  assigned_sport?: string;
  profile?: Record<string, unknown>;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  message?: string;
}

export interface TeamScoreItem {
  team: string;
  score: number;
}

export interface DetectedAthleteStat {
  athlete_id: string;
  player_name: string;
  team_name?: string;
  jersey_number?: number;
  pts?: number;
  ast?: number;
  to?: number;
  reb?: number;
  stl?: number;
  blk?: number;
  min?: number;
  fg_pct?: string;
  time?: string;
  event?: string;
  stroke_count?: number;
  distance_m?: number;
  split?: string;
  split_2?: string;
  pace?: string;
  reaction_sec?: string;
}

export interface ExpandedPerformanceMetrics {
  shooting_efficiency?: {
    ft_made: number;
    ft_attempts: number;
    pt2_made: number;
    pt2_attempts: number;
    pt3_made: number;
    pt3_attempts: number;
  };
  possession_errors?: {
    key_drives: number;
    assists: number;
    turnovers: number;
    scv_12s: number;
  };
}

export interface RawOCRDetectedData {
  team_name: string;
  opponent_team_name?: string;
  final_score?: string;
  game_result?: string;
  team_scores?: TeamScoreItem[];
  teams?: string[];
  sport_type: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  athlete_overview: DetectedAthleteStat[];
  expanded_metrics: ExpandedPerformanceMetrics;
}

export interface UploadedFileItem {
  upload_id: string;
  file_name: string;
  file_size_bytes: number;
  uploaded_at_relative: string;
  file_type: 'PDF' | 'CSV' | 'JSON' | 'IMAGE';
  file_url: string;
  raw_file?: File;
}

export type SportCategory = 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD' | string;

export interface SportConfigurationItem {
  sport_id: string;
  sport_name: string;
  short_identifier?: string;
  category?: string;
  is_active?: boolean;
  is_timed_sport?: boolean;
  measurement_type?: string;
  positions?: string[];
  configurable_stats?: any[];
}

export interface BasketballStats {
  pts: number;
  ast: number;
  reb: number;
  pf: number;
  stl: number;
  to: number;
  blk?: number;
}

export interface TimingStats {
  timer_seconds: number;
  formatted_time: string; // e.g. "00:00.00"
  distance_meters: number;
  split_times: string[];
  is_foul_dq: boolean;
}

export interface AthleteRosterItem {
  athlete_id: string;
  jersey_number: string;
  last_name: string;
  full_name: string;
  position_or_event: string; // e.g. "Point Guard", "100M Free", "Discus Throw"
  is_active_on_field: boolean;
  avatar_url?: string;
  sport_type?: string;
  team_name?: string;
  team_id?: string;
  // Dynamic Sport-Specific Stats:
  basketball_stats?: BasketballStats;
  timing_stats?: TimingStats;
  custom_stats?: Record<string, any>;
  [key: string]: any;
}

export interface MatchLogSessionState {
  match_id: string;
  sport_type: SportCategory;
  team_name: string;
  opponent_team_name: string;
  game_name: string;
  game_type: 'Tournament' | 'Practice' | 'Tune-Up' | string;
  game_result: 'Win' | 'Lose' | 'WIN' | 'LOSE' | 'TIE' | string;
  date_time: string;
  location: string;
  notes: string;
  active_roster: AthleteRosterItem[];
  bench_roster: AthleteRosterItem[];
  // Data Dictionary & Operational match schema attributes:
  tournament_id?: string | null;
  home_team_id?: string;
  home_team_name?: string;
  away_team_id?: string;
  away_team_name?: string;
  home_score?: number;
  away_score?: number;
  assigned_coaches?: string[];
  official_id?: string | null;
  reference_id?: string;
  ocr_extracted_data_url?: string | null;
  is_official?: boolean;
  is_certified?: boolean;
  is_locked?: boolean;
  playerStats?: any[];
  player_stats?: any[];
  rosterAthletes?: string[];
  roster_athletes?: string[];
  awayRosterAthletes?: string[];
  away_roster_athletes?: string[];
  scoresheetUrl?: string;
  scoresheet_url?: string;
  created_at?: string;
  timestamp?: string;
  [key: string]: any;
}

export type SportCategory = 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';

export interface BasketballStats {
  pts: number;
  ast: number;
  reb: number;
  pf: number;
  stl: number;
  to: number;
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
  // Dynamic Sport-Specific Stats:
  basketball_stats?: BasketballStats;
  timing_stats?: TimingStats;
}

export interface MatchLogSessionState {
  match_id: string;
  sport_type: SportCategory;
  team_name: string;
  opponent_team_name: string;
  game_name: string;
  game_type: 'Tournament' | 'Practice' | 'Tune-Up';
  game_result: 'Win' | 'Lose';
  date_time: string;
  location: string;
  notes: string;
  active_roster: AthleteRosterItem[];
  bench_roster: AthleteRosterItem[];
}

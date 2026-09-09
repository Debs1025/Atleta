export interface AthleteDiscoveryItem {
  athlete_id: string;
  full_name: string;
  province: string; // e.g. "Albay"
  recruitment_status: 'Available' | 'Recruited' | string;
  position_tag: string; // e.g. "PG", "SWIMMING", "TRACK AND FIELD"
  sport_category: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  biometrics: {
    height_ft: string; // "6'2""
    weight_lbs: string; // "185 lbs"
    wingspan_ft: string; // "6'5""
  };
  stats: {
    ppg?: number;
    rpg?: number;
    ast?: number;
    fg_pct?: number;
    times_100m?: string;
    times_200m?: string;
    times_400m?: string;
    times_50m_free?: string;
  };
  calculated_per: number; // e.g. 32.4
  efficiency_pct: number; // e.g. 88
  contact_info: {
    email: string;
    facebook: string;
    phone: string;
  };
  avatar_url?: string;
  jersey_number?: string;
}

export interface ScoutingProposalItem {
  scout_id: string;
  athlete_id: string;
  athlete_name: string;
  sport_category: string;
  offer_status: 'ACCEPTED' | 'PENDING' | 'DECLINED';
  date_added_relative: string; // e.g. "Added 2 days ago"
  created_at: string;
  avatar_url?: string;
}

export interface DiscoveryTeamItem {
  team_id: string;
  team_name: string;
  sport_category: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  division_tag: string;
  description: string;
  head_coach: string;
  season_record: string;
  logo_url?: string;
  banner_url?: string;
  roster: AthleteDiscoveryItem[];
}

export interface DiscoveryMatchPlayerStat {
  player: string;
  role_team?: string;
  pts?: number;
  reb?: number;
  ast?: number;
  fg_pct?: number;
  time_50m?: string;
  time_100m?: string;
  time_200m?: string;
  time_400m?: string;
  final_time?: string;
}

export interface DiscoveryMatchItem {
  match_id: string;
  sport_category: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  headline: string;
  time_venue: string;
  team1_name: string;
  team2_name: string;
  team1_score: number | string;
  team2_score: number | string;
  status: string;
  player_stats?: DiscoveryMatchPlayerStat[];
  dynamics_data?: number[];
}

export interface DiscoveryEventItem {
  event_id: string;
  event_name: string;
  date_range: string;
  matches: DiscoveryMatchItem[];
}

export type DiscoveryTab = 'PLAYERS' | 'TEAMS' | 'EVENTS';
export type SportCategoryFilter = 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';

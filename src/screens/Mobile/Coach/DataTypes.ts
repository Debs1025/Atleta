// Coach Side Data Types with Mock Testing Data
export interface CredentialItem {
  id: string;
  title: string;
  type: 'certified' | 'manager' | 'degree' | string;
  icon_name: 'shield-check' | 'user-plus' | 'star' | string;
}

export interface UploadedDocument {
  id: string;
  file_name: string;
  file_type: 'PDF' | 'JPG' | 'PNG';
  file_url: string;
}

export interface CoachProfileState {
  coach_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role_title: string; // e.g., "BASKETBALL COACH"
  sports_focus: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  avatar_url?: string;
  regional_affiliations: {
    association_name: string;
    office_name: string;
  };
  credentials: CredentialItem[];
  uploaded_documents: UploadedDocument[];
  system_statistics: {
    total_athletes: number;
    metric_logs: number;
  };
  last_updated: string; // e.g., "OCT 24, 2023"
}

// With sample datas
export const DEFAULT_COACH_PROFILE: CoachProfileState = {
  coach_id: "coach_erick_001",
  user_id: "usr_coach_01",
  first_name: "Erick Nathaniel",
  last_name: "De Belen",
  full_name: "ERICK NATHANIEL S. DE BELEN",
  email: "coach@gmail.com",
  role_title: "BASKETBALL COACH",
  sports_focus: "BASKETBALL",
  regional_affiliations: {
    association_name: "Bicol Region Athletic Association (BRAA)",
    office_name: "Albay Provincial Sports Office",
  },
  credentials: [
    {
      id: "cred_1",
      title: "Certified Basketball Coach",
      type: "certified",
      icon_name: "shield-check",
    },
    {
      id: "cred_2",
      title: "Athlete Roster Manager",
      type: "manager",
      icon_name: "user-plus",
    },
    {
      id: "cred_3",
      title: "Bachelors In Sport Sciences",
      type: "degree",
      icon_name: "star",
    },
  ],
  uploaded_documents: [
    {
      id: "doc_1",
      file_name: "Coaching License.pdf",
      file_type: "PDF",
      file_url: "file://coaching_license.pdf",
    },
  ],
  system_statistics: {
    total_athletes: 42,
    metric_logs: 156,
  },
  last_updated: "OCT 24, 2023",
};

export interface UserCoach {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  role: "Coach";
  coach_id: string;
  current_institution: string;
  athlete_managed: string[]; // List of athlete UUIDs
}

export interface RosterAthlete {
  athlete_id: string;
  user_id: string;
  full_name: string;
  position: "PG" | "SG" | "SF" | "PF" | "C" | string;
  jersey_number: string;
  sport_type: string;
  is_eligibility_verified: boolean;
  event_distance?: string;
  stroke_style?: string;
  avatar_url?: string;
  missing_documents?: string[];
}

export interface Team {
  team_id: string;
  team_name: string;
  sport_type: "BASKETBALL" | "TRACK AND FIELD" | "SWIMMING";
  division: string; // e.g. "Elite Professional"
  season_record: {
    wins: number;
    losses: number;
  };
  coach_id: string;
  roster_list: RosterAthlete[];
  created_at: string;
}

export type NavigationTab = "Home" | "Teams" | "Discovery" | "Performance";

// Create Team 
export interface AthleteItem {
  athlete_id: string;
  id_number: string; // e.g. "42019"
  full_name: string;
  grad_class: string; // e.g. "Class of 2025"
  primary_position: string; // e.g. "Point Guard"
  jersey_number?: string;
  event_distance?: string;
  stroke_style?: string;
  is_verified: boolean;
  missing_documents?: string[]; // e.g. ["Missing PSA Registration", "Residency proof expired"]
  avatar_url?: string;
  status_tag?: "ACTIVE ROTATION" | "RESTRICTED" | "INACTIVE";
}

export interface TeamDetailsState {
  team_name: string;
  sport_type: "BASKETBALL" | "TRACK AND FIELD" | "SWIMMING" | "";
  division: string;
  selected_roster: AthleteItem[];
}



export interface CoachSettingsData {
  setting_id: string;
  coach_id: string;
  data_sync_preference: "Manual" | "Automatic";
  game_log_updates: boolean;
  recruitment_inquiries: boolean;
  updated_at: string;
}

export const DEFAULT_COACH_SETTINGS: CoachSettingsData = {
  setting_id: "set_coach_01",
  coach_id: "coach_erick_001",
  data_sync_preference: "Manual",
  game_log_updates: true,
  recruitment_inquiries: true,
  updated_at: "2026-08-07",
};

export interface AthleteNotification {
  notification_id: string;
  target_athlete_id: string;
  type: "ACTION_REQUIRED";
  title: string;
  message_body: string;
  highlighted_text: string;
  relative_time: string;
  action_label: string;
}

export const MOCK_ATHLETE_ITEMS: AthleteItem[] = [];

export const MOCK_COACH: UserCoach = {
  user_id: "",
  first_name: "Coach",
  last_name: "",
  email: "",
  contact_number: "",
  role: "Coach",
  coach_id: "",
  current_institution: "University Athletics",
  athlete_managed: [],
};

export const MOCK_ATHLETES_POOL: RosterAthlete[] = [];

export const INITIAL_TEAMS: Team[] = [];

//Athlete Performance Schemas with sample data for testing
export interface WorkloadTargetState {
  target_7day_effort_pts: number;
  current_7day_acute_load: number;
  current_28day_chronic_load: number;
  calculated_acwr: number;
  workout_score: number;
  fatigue_meter: number;
  routine_score: number;
  body_stress_pts: number;
}

export interface AthletePerformanceProfile {
  athlete_id: string;
  user_id: string;
  full_name: string;
  birthdate: string; // e.g. "March 12, 2006"
  position_or_event: string; // e.g. "Point Guard", "200m Swimmer"
  location_province: string; // e.g. "Camaligan, PHI"
  team_name: string; // e.g. "Pacific Waves"
  rating_score: number; // e.g. 88
  sport_category: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  biometrics: {
    height_ft: string; // "6'2""
    weight_lbs: string; // "185 lbs"
    wingspan_ft: string; // "6'8""
    vertical_jump_in: string; // "42""
  };
  averages: {
    ppg?: number;
    rpg?: number;
    apg?: number;
    per_score?: number;
    games_played?: number;
    wins?: number;
    fg_percentage?: number;
    three_pt_percentage?: number;
    ft_percentage?: number;
    bpg?: number;
    spg?: number;
    // Track & Field specific
    pb_100m?: string;
    pb_200m?: string;
    avg_100m?: string;
    avg_200m?: string;
    reaction_time_s?: string;
    top_speed_kmh?: number;
    stride_freq_hz?: number;
    start_rating_pct?: number;
    win_rate_pct?: number;
    // Swimming specific
    pb_50m_free?: string;
    pb_100m_free?: string;
    avg_100m_free?: string;
    avg_200m_free?: string;
    stroke_efficiency_pct?: number;
    stroke_rate_pm?: number;
    flip_turn_s?: string;
    swim_index_score?: number;
    podiums_count?: number;
  };
  radar_competencies: {
    speed: number;
    power: number;
    agility: number;
    iq: number;
    tech: number;
  };
  scoring_trends_last_10: number[]; // e.g. [14, 18, 15, 22, 28, 25, 30]
  eligibility_documents: {
    psa_verified: boolean;
    residency_verified: boolean;
  };
  workload_analytics: WorkloadTargetState;
}

export interface MatchHistoryItem {
  match_id: string;
  sport_category: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  event_or_opponent: string; // e.g. "vs. BLUE EAGLES", "100m Freestyle", "200M DASH (REGIONAL)"
  date_formatted: string; // e.g. "OCT 24", "SEPT 29"
  date_group: string; // e.g. "OCTOBER 2026"
  result_badge_text: string; // e.g. "RESULT W", "RESULT 1ST", "RESULT 3rd"
  score_or_time_summary: string; // e.g. "98 - 92", "54.12s - 1st Place", "23.45s - 1st Place"
  is_official: boolean;
  full_date?: string; // e.g. "May 24, 2024"
  game_type?: string; // e.g. "TUNE UP GAME", "FINALS"
  entries_count?: number;
  home_team?: string;
  away_team?: string;
  home_score?: number;
  away_score?: number;
  leaderboard_entries?: {
    rank: number;
    name: string;
    detail?: string;
    time_or_score: string;
  }[];
  player_stats?: {
    name: string;
    pts: number;
    ast: number;
    reb: number;
  }[];
  coach_notes?: string[];
}

export const MOCK_PERFORMANCE_ATHLETES: AthletePerformanceProfile[] = [];

export const MOCK_MATCH_HISTORY: MatchHistoryItem[] = [];



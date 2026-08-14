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

// For testing only, replace after integrating the backend API
export const MOCK_ATHLETE_ITEMS: AthleteItem[] = [
  {
    athlete_id: "ath_101",
    id_number: "42019",
    full_name: "Marcus Thorne",
    grad_class: "Class of 2025",
    primary_position: "Point Guard",
    jersey_number: "42",
    is_verified: true,
    status_tag: "ACTIVE ROTATION",
  },
  {
    athlete_id: "ath_102",
    id_number: "39822",
    full_name: "Julian Vance",
    grad_class: "Class of 2024",
    primary_position: "Shooting Guard",
    jersey_number: "22",
    is_verified: false,
    missing_documents: ["Missing PSA Registration", "Residency proof expired"],
    status_tag: "RESTRICTED",
  },
  {
    athlete_id: "ath_103",
    id_number: "55102",
    full_name: "Elena Rodriguez",
    grad_class: "Class of 2025",
    primary_position: "Point Guard",
    jersey_number: "11",
    is_verified: true,
    status_tag: "ACTIVE ROTATION",
  },
  {
    athlete_id: "ath_104",
    id_number: "18402",
    full_name: "Julian Mercer",
    grad_class: "Class of 2025",
    primary_position: "Quarterback",
    jersey_number: "18",
    is_verified: true,
    status_tag: "ACTIVE ROTATION",
  },
  {
    athlete_id: "ath_105",
    id_number: "07119",
    full_name: "Kaleb Rossi",
    grad_class: "Class of 2026",
    primary_position: "Linebacker",
    jersey_number: "07",
    is_verified: false,
    missing_documents: ["Medical Clearance Expired"],
    status_tag: "RESTRICTED",
  },
  {
    athlete_id: "ath_106",
    id_number: "33910",
    full_name: "Dominic Hayes",
    grad_class: "Class of 2025",
    primary_position: "Safety",
    jersey_number: "33",
    is_verified: true,
    status_tag: "ACTIVE ROTATION",
  },
];



// For testing only, remove when the backend is available
export const MOCK_COACH: UserCoach = {
  user_id: "usr_coach_01",
  first_name: "Erick",
  last_name: "Gonzales",
  email: "erick.coach@atleta.ph",
  contact_number: "09171234567",
  role: "Coach",
  coach_id: "coach_erick_001",
  current_institution: "Camarines Sur Sports Academy",
  athlete_managed: ["ath_01", "ath_02", "ath_03", "ath_04", "ath_05", "ath_06"],
};

export const MOCK_ATHLETES_POOL: RosterAthlete[] = [
  {
    athlete_id: "ath_01",
    user_id: "usr_ath_01",
    full_name: "J. Dela Cruz",
    position: "PG",
    jersey_number: "24",
    sport_type: "BASKETBALL",
    is_eligibility_verified: true,
  },
  {
    athlete_id: "ath_02",
    user_id: "usr_ath_02",
    full_name: "A. Rivera",
    position: "SF",
    jersey_number: "11",
    sport_type: "BASKETBALL",
    is_eligibility_verified: true,
  },
  {
    athlete_id: "ath_03",
    user_id: "usr_ath_03",
    full_name: "M. Santos",
    position: "C",
    jersey_number: "05",
    sport_type: "BASKETBALL",
    is_eligibility_verified: true,
  },
  {
    athlete_id: "ath_04",
    user_id: "usr_ath_04",
    full_name: "G. Pelonio",
    position: "C",
    jersey_number: "10",
    sport_type: "BASKETBALL",
    is_eligibility_verified: true,
  },
  {
    athlete_id: "ath_05",
    user_id: "usr_ath_05",
    full_name: "Marcus Rivera",
    position: "SG",
    jersey_number: "23",
    sport_type: "BASKETBALL",
    is_eligibility_verified: true,
  },
  {
    athlete_id: "ath_06",
    user_id: "usr_ath_06",
    full_name: "Javi Villamor",
    position: "PF",
    jersey_number: "08",
    sport_type: "BASKETBALL",
    is_eligibility_verified: true,
  },
  {
    athlete_id: "ath_07",
    user_id: "usr_ath_07",
    full_name: "Aris Mendoza",
    position: "PG",
    jersey_number: "11",
    sport_type: "BASKETBALL",
    is_eligibility_verified: true,
  },
  {
    athlete_id: "ath_08",
    user_id: "usr_ath_08",
    full_name: "Christian Bautista",
    position: "SF",
    jersey_number: "15",
    sport_type: "BASKETBALL",
    is_eligibility_verified: false,
    missing_documents: ["PSA Birth Certificate", "Medical Clearance"],
  },
];

export const INITIAL_TEAMS: Team[] = [
  {
    team_id: "team_01",
    team_name: "Camarines Sur Panthers",
    sport_type: "BASKETBALL",
    division: "Elite Professional",
    season_record: { wins: 14, losses: 2 },
    coach_id: "coach_erick_001",
    created_at: "2026-01-10",
    roster_list: [
      {
        athlete_id: "ath_05",
        user_id: "usr_ath_05",
        full_name: "Marcus Rivera",
        position: "SG",
        jersey_number: "23",
        sport_type: "BASKETBALL",
        is_eligibility_verified: true,
      },
      {
        athlete_id: "ath_06",
        user_id: "usr_ath_06",
        full_name: "Javi Villamor",
        position: "PF",
        jersey_number: "08",
        sport_type: "BASKETBALL",
        is_eligibility_verified: true,
      },
      {
        athlete_id: "ath_07",
        user_id: "usr_ath_07",
        full_name: "Aris Mendoza",
        position: "PG",
        jersey_number: "11",
        sport_type: "BASKETBALL",
        is_eligibility_verified: true,
      },
      {
        athlete_id: "ath_01",
        user_id: "usr_ath_01",
        full_name: "J. Dela Cruz",
        position: "PG",
        jersey_number: "24",
        sport_type: "BASKETBALL",
        is_eligibility_verified: true,
      },
    ],
  },
  {
    team_id: "team_02",
    team_name: "Northern Wasp Elite",
    sport_type: "BASKETBALL",
    division: "Division 1",
    season_record: { wins: 10, losses: 4 },
    coach_id: "coach_erick_001",
    created_at: "2026-02-01",
    roster_list: [
      {
        athlete_id: "ath_03",
        user_id: "usr_ath_03",
        full_name: "M. Santos",
        position: "C",
        jersey_number: "05",
        sport_type: "BASKETBALL",
        is_eligibility_verified: true,
      },
      {
        athlete_id: "ath_04",
        user_id: "usr_ath_04",
        full_name: "G. Pelonio",
        position: "C",
        jersey_number: "10",
        sport_type: "BASKETBALL",
        is_eligibility_verified: true,
      },
    ],
  },
  {
    team_id: "team_03",
    team_name: "Metro City Swimming Club",
    sport_type: "SWIMMING",
    division: "National Varsity",
    season_record: { wins: 18, losses: 1 },
    coach_id: "coach_erick_001",
    created_at: "2026-01-15",
    roster_list: [
      {
        athlete_id: "ath_sw_01",
        user_id: "usr_sw_01",
        full_name: "Diego Cruz",
        position: "50m Freestyle",
        jersey_number: "01",
        sport_type: "SWIMMING",
        stroke_style: "Freestyle",
        is_eligibility_verified: true,
      },
      {
        athlete_id: "ath_sw_02",
        user_id: "usr_sw_02",
        full_name: "Sienna Reyes",
        position: "100m Butterfly",
        jersey_number: "04",
        sport_type: "SWIMMING",
        stroke_style: "Butterfly",
        is_eligibility_verified: true,
      },
      {
        athlete_id: "ath_sw_03",
        user_id: "usr_sw_03",
        full_name: "Lucas Tan",
        position: "200m Backstroke",
        jersey_number: "09",
        sport_type: "SWIMMING",
        stroke_style: "Backstroke",
        is_eligibility_verified: true,
      },
    ],
  },
  {
    team_id: "team_04",
    team_name: "Central Sprinters",
    sport_type: "TRACK AND FIELD",
    division: "Regional Premier",
    season_record: { wins: 12, losses: 3 },
    coach_id: "coach_erick_001",
    created_at: "2026-02-10",
    roster_list: [
      {
        athlete_id: "ath_tf_01",
        user_id: "usr_tf_01",
        full_name: "Gabriel Santos",
        position: "100m Sprint",
        jersey_number: "07",
        sport_type: "TRACK AND FIELD",
        event_distance: "100m",
        is_eligibility_verified: true,
      },
      {
        athlete_id: "ath_tf_02",
        user_id: "usr_tf_02",
        full_name: "Mia Gonzales",
        position: "400m Hurdles",
        jersey_number: "14",
        sport_type: "TRACK AND FIELD",
        event_distance: "400m",
        is_eligibility_verified: true,
      },
      {
        athlete_id: "ath_tf_03",
        user_id: "usr_tf_03",
        full_name: "Noah Perez",
        position: "Long Jump",
        jersey_number: "21",
        sport_type: "TRACK AND FIELD",
        event_distance: "Field Event",
        is_eligibility_verified: true,
      },
    ],
  },
];

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

export const MOCK_PERFORMANCE_ATHLETES: AthletePerformanceProfile[] = [
  {
    athlete_id: "ath_perf_01",
    user_id: "usr_ath_01",
    full_name: "Marcus Thorne",
    birthdate: "March 12, 2006",
    position_or_event: "Point Guard",
    location_province: "Camaligan, PHI",
    team_name: "Pacific Waves",
    rating_score: 88,
    sport_category: "BASKETBALL",
    biometrics: {
      height_ft: "6'2\"",
      weight_lbs: "185 lbs",
      wingspan_ft: "6'8\"",
      vertical_jump_in: "42\"",
    },
    averages: {
      ppg: 22.4,
      rpg: 8.5,
      apg: 6.2,
      per_score: 10.2,
      games_played: 18,
      wins: 14,
      fg_percentage: 52.4,
      three_pt_percentage: 38.9,
      ft_percentage: 88.1,
      bpg: 1.2,
      spg: 1.5,
    },
    radar_competencies: {
      speed: 88,
      power: 76,
      agility: 92,
      iq: 85,
      tech: 80,
    },
    scoring_trends_last_10: [14, 18, 15, 22, 28, 25, 30, 24, 26, 29],
    eligibility_documents: {
      psa_verified: true,
      residency_verified: true,
    },
    workload_analytics: {
      target_7day_effort_pts: 350,
      current_7day_acute_load: 420,
      current_28day_chronic_load: 320,
      calculated_acwr: 1.31,
      workout_score: 88,
      fatigue_meter: 64,
      routine_score: 92,
      body_stress_pts: 45,
    },
  },
  {
    athlete_id: "ath_perf_02",
    user_id: "usr_ath_02",
    full_name: "Gerard Pelonio",
    birthdate: "March 12, 2006",
    position_or_event: "Point Guard",
    location_province: "Camaligan, PHI",
    team_name: "Pacific Waves",
    rating_score: 88,
    sport_category: "BASKETBALL",
    biometrics: {
      height_ft: "6'2\"",
      weight_lbs: "185 lbs",
      wingspan_ft: "6'8\"",
      vertical_jump_in: "42\"",
    },
    averages: {
      ppg: 22.4,
      rpg: 8.5,
      apg: 6.2,
      per_score: 10.2,
      games_played: 18,
      wins: 14,
      fg_percentage: 52.4,
      three_pt_percentage: 38.9,
      ft_percentage: 88.1,
      bpg: 1.2,
      spg: 1.5,
    },
    radar_competencies: {
      speed: 85,
      power: 80,
      agility: 90,
      iq: 88,
      tech: 84,
    },
    scoring_trends_last_10: [16, 20, 18, 24, 26, 22, 28, 30, 27, 32],
    eligibility_documents: {
      psa_verified: true,
      residency_verified: true,
    },
    workload_analytics: {
      target_7day_effort_pts: 400,
      current_7day_acute_load: 580,
      current_28day_chronic_load: 310,
      calculated_acwr: 1.87,
      workout_score: 92,
      fatigue_meter: 82,
      routine_score: 85,
      body_stress_pts: 78,
    },
  },
  {
    athlete_id: "ath_perf_03",
    user_id: "usr_ath_03",
    full_name: "Elena Rossi",
    birthdate: "November 4, 2005",
    position_or_event: "Forward",
    location_province: "Torino, ITA",
    team_name: "Torino Elite",
    rating_score: 92,
    sport_category: "BASKETBALL",
    biometrics: {
      height_ft: "6'0\"",
      weight_lbs: "165 lbs",
      wingspan_ft: "6'4\"",
      vertical_jump_in: "38\"",
    },
    averages: {
      ppg: 26.8,
      rpg: 10.4,
      apg: 4.8,
      per_score: 28.5,
      games_played: 22,
      wins: 18,
      fg_percentage: 55.2,
      three_pt_percentage: 41.5,
      ft_percentage: 90.2,
      bpg: 2.1,
      spg: 1.8,
    },
    radar_competencies: {
      speed: 92,
      power: 88,
      agility: 94,
      iq: 96,
      tech: 90,
    },
    scoring_trends_last_10: [22, 25, 24, 30, 28, 32, 29, 31, 35, 33],
    eligibility_documents: {
      psa_verified: true,
      residency_verified: true,
    },
    workload_analytics: {
      target_7day_effort_pts: 380,
      current_7day_acute_load: 390,
      current_28day_chronic_load: 350,
      calculated_acwr: 1.11,
      workout_score: 95,
      fatigue_meter: 40,
      routine_score: 96,
      body_stress_pts: 30,
    },
  },
  {
    athlete_id: "ath_perf_04",
    user_id: "usr_ath_04",
    full_name: "Julian Kim",
    birthdate: "August 19, 2006",
    position_or_event: "200m Swimmer",
    location_province: "Seoul, KOR",
    team_name: "Seoul Stars",
    rating_score: 85,
    sport_category: "SWIMMING",
    biometrics: {
      height_ft: "6'1\"",
      weight_lbs: "175 lbs",
      wingspan_ft: "6'6\"",
      vertical_jump_in: "34\"",
    },
    averages: {
      per_score: 18.4,
      games_played: 12,
      wins: 10,
      pb_50m_free: "23.45s",
      pb_100m_free: "51.12s",
      avg_100m_free: "52.10s",
      avg_200m_free: "1:54.20",
      stroke_efficiency_pct: 88.5,
      stroke_rate_pm: 42,
      flip_turn_s: "0.85s",
      swim_index_score: 854,
      podiums_count: 12,
    },
    radar_competencies: {
      speed: 90,
      power: 82,
      agility: 80,
      iq: 86,
      tech: 88,
    },
    scoring_trends_last_10: [55, 54, 54, 53, 53, 52, 52, 51, 51, 50],
    eligibility_documents: {
      psa_verified: true,
      residency_verified: true,
    },
    workload_analytics: {
      target_7day_effort_pts: 320,
      current_7day_acute_load: 340,
      current_28day_chronic_load: 300,
      calculated_acwr: 1.13,
      workout_score: 84,
      fatigue_meter: 50,
      routine_score: 88,
      body_stress_pts: 38,
    },
  },
  {
    athlete_id: "ath_perf_05",
    user_id: "usr_ath_05",
    full_name: "Sarah Chen",
    birthdate: "January 24, 2005",
    position_or_event: "100m Sprinter",
    location_province: "Metro United, PHI",
    team_name: "Metro United",
    rating_score: 91,
    sport_category: "TRACK AND FIELD",
    biometrics: {
      height_ft: "5'9\"",
      weight_lbs: "140 lbs",
      wingspan_ft: "5'11\"",
      vertical_jump_in: "36\"",
    },
    averages: {
      per_score: 24.2,
      games_played: 15,
      wins: 13,
      pb_100m: "10.12s",
      pb_200m: "20.85s",
      avg_100m: "10.24s",
      avg_200m: "21.05s",
      reaction_time_s: "0.14s",
      top_speed_kmh: 36.2,
      stride_freq_hz: 4.2,
      start_rating_pct: 94,
      win_rate_pct: 86.7,
      podiums_count: 14,
    },
    radar_competencies: {
      speed: 98,
      power: 86,
      agility: 92,
      iq: 88,
      tech: 90,
    },
    scoring_trends_last_10: [11, 11, 10, 10, 10, 10, 10, 10, 10, 10],
    eligibility_documents: {
      psa_verified: true,
      residency_verified: true,
    },
    workload_analytics: {
      target_7day_effort_pts: 360,
      current_7day_acute_load: 400,
      current_28day_chronic_load: 330,
      calculated_acwr: 1.21,
      workout_score: 90,
      fatigue_meter: 55,
      routine_score: 91,
      body_stress_pts: 42,
    },
  },
  {
    athlete_id: "ath_perf_06",
    user_id: "usr_ath_06",
    full_name: "Dominic Vance",
    birthdate: "May 30, 2007",
    position_or_event: "50M Free",
    location_province: "Highland, PHI",
    team_name: "Highland Rangers",
    rating_score: 79,
    sport_category: "SWIMMING",
    biometrics: {
      height_ft: "6'0\"",
      weight_lbs: "170 lbs",
      wingspan_ft: "6'3\"",
      vertical_jump_in: "32\"",
    },
    averages: {
      per_score: 14.5,
      games_played: 10,
      wins: 6,
      pb_50m_free: "24.12s",
      pb_100m_free: "52.80s",
      avg_100m_free: "53.40s",
      avg_200m_free: "1:56.50",
      stroke_efficiency_pct: 84.0,
      stroke_rate_pm: 40,
      flip_turn_s: "0.92s",
      swim_index_score: 780,
      podiums_count: 6,
    },
    radar_competencies: {
      speed: 78,
      power: 75,
      agility: 76,
      iq: 80,
      tech: 82,
    },
    scoring_trends_last_10: [26, 26, 25, 25, 25, 24, 24, 24, 23, 23],
    eligibility_documents: {
      psa_verified: true,
      residency_verified: true,
    },
    workload_analytics: {
      target_7day_effort_pts: 300,
      current_7day_acute_load: 280,
      current_28day_chronic_load: 290,
      calculated_acwr: 0.96,
      workout_score: 78,
      fatigue_meter: 35,
      routine_score: 80,
      body_stress_pts: 25,
    },
  },
];

export const MOCK_MATCH_HISTORY: MatchHistoryItem[] = [
  {
    match_id: "match_101",
    sport_category: "BASKETBALL",
    event_or_opponent: "vs. BLUE EAGLES",
    date_formatted: "OCT 24",
    date_group: "OCTOBER 2026",
    result_badge_text: "RESULT W",
    score_or_time_summary: "98 - 92",
    is_official: true,
    full_date: "Oct 24, 2026",
    game_type: "SEASON GAME",
    home_team: "ATENEO",
    away_team: "BLUE EAGLES",
    home_score: 98,
    away_score: 92,
    player_stats: [
      { name: "Pelonio G.", pts: 32, ast: 8, reb: 5 },
      { name: "Petalio J.", pts: 22, ast: 3, reb: 4 },
      { name: "Dela Cruz J.", pts: 12, ast: 11, reb: 14 },
      { name: "De Belen E.", pts: 18, ast: 2, reb: 6 },
      { name: "Bicardo A.", pts: 14, ast: 1, reb: 12 },
    ],
    coach_notes: [
      "Defensive transition was slow in the first half.",
    ],
  },
  {
    match_id: "match_102",
    sport_category: "SWIMMING",
    event_or_opponent: "100m Freestyle - Finals",
    date_formatted: "OCT 18",
    date_group: "OCTOBER 2026",
    result_badge_text: "RESULT 1ST",
    score_or_time_summary: "54.12s - 1st Place",
    is_official: true,
    full_date: "May 24, 2024",
    game_type: "TUNE UP GAME",
    entries_count: 8,
    leaderboard_entries: [
      { rank: 1, name: "M. REYES", detail: "ATENEO", time_or_score: "54.12s" },
      { rank: 2, name: "J. SANTOS", detail: "DLSU", time_or_score: "54.80s" },
      { rank: 3, name: "L. GARCIA", detail: "UP", time_or_score: "55.08s" },
      { rank: 4, name: "R. PUNO", detail: "UST", time_or_score: "56.12s" },
    ],
    coach_notes: [
      "The reaction time was a bit too late.",
    ],
  },
  {
    match_id: "match_103",
    sport_category: "TRACK AND FIELD",
    event_or_opponent: "100m Dash",
    date_formatted: "OCT 10",
    date_group: "OCTOBER 2026",
    result_badge_text: "RESULT 1ST",
    score_or_time_summary: "9.82s - 1st Place",
    is_official: true,
    full_date: "May 24, 2024",
    game_type: "TUNE UP GAME",
    entries_count: 8,
    leaderboard_entries: [
      { rank: 1, name: "MARCUS REED", detail: "LANE 4 • USA", time_or_score: "9.82s" },
      { rank: 2, name: "GERARD PELONIO", detail: "LANE 5 • ATENEO", time_or_score: "10.45s" },
      { rank: 3, name: "ANDRE GG", detail: "LANE 3 • ATENEO", time_or_score: "10.54s" },
      { rank: 4, name: "KEVIN DIALLO", detail: "LANE 6 • FRA", time_or_score: "11.12s" },
    ],
    coach_notes: [
      "The reaction time was a bit too late.",
    ],
  },
  {
    match_id: "match_104",
    sport_category: "TRACK AND FIELD",
    event_or_opponent: "200M DASH (FINAL)",
    date_formatted: "SEP 29",
    date_group: "SEPTEMBER 2026",
    result_badge_text: "RESULT 3rd",
    score_or_time_summary: "23.45s - 1st Place",
    is_official: true,
    full_date: "Sep 29, 2026",
    game_type: "REGIONAL FINALS",
    entries_count: 8,
    leaderboard_entries: [
      { rank: 1, name: "GERARD PELONIO", detail: "LANE 4 • ATENEO", time_or_score: "23.45s" },
      { rank: 2, name: "MARCUS REED", detail: "LANE 5 • USA", time_or_score: "23.88s" },
      { rank: 3, name: "ANDRE GG", detail: "LANE 2 • ATENEO", time_or_score: "24.12s" },
      { rank: 4, name: "KEVIN DIALLO", detail: "LANE 6 • FRA", time_or_score: "24.90s" },
    ],
    coach_notes: [
      "Strong acceleration on the curve transition.",
    ],
  },
  {
    match_id: "match_105",
    sport_category: "BASKETBALL",
    event_or_opponent: "VS. GOLDEN PAWNS",
    date_formatted: "SEP 22",
    date_group: "SEPTEMBER 2026",
    result_badge_text: "RESULT W",
    score_or_time_summary: "112 - 105",
    is_official: true,
    full_date: "Sep 22, 2026",
    game_type: "CHAMPIONSHIP",
    home_team: "PACIFIC WAVES",
    away_team: "GOLDEN PAWNS",
    home_score: 112,
    away_score: 105,
    player_stats: [
      { name: "Thorne M.", pts: 38, ast: 12, reb: 6 },
      { name: "Pelonio G.", pts: 28, ast: 6, reb: 8 },
      { name: "Rivera A.", pts: 20, ast: 4, reb: 11 },
      { name: "Santos M.", pts: 16, ast: 2, reb: 14 },
      { name: "Villamor J.", pts: 10, ast: 5, reb: 7 },
    ],
    coach_notes: [
      "High tempo offense was key in overtime push.",
    ],
  },
  {
    match_id: "match_106",
    sport_category: "SWIMMING",
    event_or_opponent: "200m Medley - Finals",
    date_formatted: "SEP 15",
    date_group: "SEPTEMBER 2026",
    result_badge_text: "RESULT W",
    score_or_time_summary: "1:58.42 - 1st Place",
    is_official: true,
    full_date: "Sep 15, 2026",
    game_type: "NATIONAL MEET",
    entries_count: 8,
    leaderboard_entries: [
      { rank: 1, name: "JULIAN KIM", detail: "SEOUL STARS", time_or_score: "1:58.42" },
      { rank: 2, name: "M. REYES", detail: "ATENEO", time_or_score: "2:00.15" },
      { rank: 3, name: "DOMINIC VANCE", detail: "HIGHLAND", time_or_score: "2:02.30" },
      { rank: 4, name: "L. GARCIA", detail: "UP", time_or_score: "2:04.12" },
    ],
    coach_notes: [
      "Breaststroke turn split improved by 0.8s.",
    ],
  },
];


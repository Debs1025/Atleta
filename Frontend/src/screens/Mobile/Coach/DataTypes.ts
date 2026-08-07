// Coach Side Data Types
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

// Create Team Wizard & Roster Builder Interfaces
export interface AthleteItem {
  athlete_id: string;
  id_number: string; // e.g. "42019"
  full_name: string;
  grad_class: string; // e.g. "Class of 2025"
  primary_position: string; // e.g. "Point Guard"
  jersey_number?: string;
  is_verified: boolean;
  missing_documents?: string[]; // e.g. ["Missing PSA Registration", "Residency proof expired"]
  avatar_url?: string;
  status_tag?: "ACTIVE ROTATION" | "RESTRICTED" | "INACTIVE";
}

export interface TeamWizardState {
  team_name: string;
  sport_type: "BASKETBALL" | "TRACK AND FIELD" | "SWIMMING" | "VOLLEYBALL" | "";
  division: string;
  selected_roster: AthleteItem[];
}

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
    roster_list: [],
  },
  {
    team_id: "team_04",
    team_name: "Central Sprinters",
    sport_type: "TRACK AND FIELD",
    division: "Regional Premier",
    season_record: { wins: 12, losses: 3 },
    coach_id: "coach_erick_001",
    created_at: "2026-02-10",
    roster_list: [],
  },
];

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

// ─── Team Entity ─────────────────────────────────────────────────────────────
// Stored in Firestore "Teams" collection.

export interface Team {
  team_id: string;                // Primary Key, Required
  team_name: string;              // Required, Max 255
  sport_type: string;             // Required
  region: string;                 // Required
  description?: string;           // Optional
  mission_statement?: string;     // Optional
  established_year?: number;      // Optional
  coach_id: string;               // Foreign Key -> Coach.coach_id, Required
  roster_list: string[];          // Array of athlete_id strings
  timestamp: string;              // ISO datetime
}

// ─── Coach Entity ────────────────────────────────────────────────────────────
// Stored in Firestore "Coach_Profiles" collection.

export interface Coach {
  coach_id: string;               // Primary Key, Required
  user_id: string;                // Foreign Key -> Users.user_id, Required
  first_name?: string;
  last_name?: string;
  years_of_experience: number;    // Required
  current_institution: string;    // Required
  quote?: string;                 // Optional
}

// ─── Roster Athlete (enriched for roster context) ────────────────────────────

export interface RosterAthlete {
  athlete_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  position: string;
  sport_type: string;
  avatar_url?: string;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface TeamSummary {
  team_id: string;
  team_name: string;
  sport_type: string;
  region: string;
  athlete_count: number;
  coach_name: string;
  established_year?: number;
}

export interface TeamDetailResponse {
  team_id: string;
  team_name: string;
  sport_type: string;
  region: string;
  description: string | null;
  mission_statement: string | null;
  established_year: number | null;
  athlete_count: number;
  coach: {
    coach_id: string;
    full_name: string;
    years_of_experience: number;
    current_institution: string;
    quote: string | null;
  };
  roster: RosterAthlete[];
  timestamp: string;
}

export interface AthleteTeamResponse {
  athlete_id: string;
  team: {
    team_id: string;
    team_name: string;
    sport_type: string;
    region: string;
    description: string | null;
  };
  coach: {
    coach_id: string;
    full_name: string;
    current_institution: string;
  };
  roster: RosterAthlete[];
}

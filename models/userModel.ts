// User roles enum
export type UserRole = 'Athlete' | 'Coach' | 'Official' | 'System Admin';

// Base user stored in the "Users" collection
export interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number?: string | null;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

// Athlete_Profiles Subtype
export interface AthleteProfile {
  athlete_id: string;
  user_id: string;
  birthdate: string;
  gender: string;
  province: string;
  sport_type: string;
  recruitment_status?: string | null;
  leaderboard_rank?: number | null;
  eligibility_documents?: string[];
  achievements?: string[];
  created_at: Date;
  updated_at: Date;
}

// Coach_Profiles Subtype
export interface CoachProfile {
  coach_id: string;
  user_id: string;
  professional_documents?: string[];
  years_of_experience: number;
  current_institution: string;
  athlete_managed?: string[];
  created_at: Date;
  updated_at: Date;
}

// Official_Profiles Subtype
export interface OfficialProfile {
  official_id: string;
  user_id: string;
  tournament_affiliation: string;
  created_at: Date;
  updated_at: Date;
}

// Admin_Profiles Subtype
export interface AdminProfile {
  admin_id: string;
  user_id: string;
  admin_security_key: string; // Encrypted/Hashed
  created_at: Date;
  updated_at: Date;
}

// Maps role to its Firestore collection name
export const ROLE_COLLECTION_MAP: Record<UserRole, string> = {
  'Athlete': 'Athlete_Profiles',
  'Coach': 'Coach_Profiles',
  'Official': 'Official_Profiles',
  'System Admin': 'Admin_Profiles',
};

// Maps role to its granular permission scopes
export const ROLE_PERMISSIONS_MAP: Record<UserRole, string[]> = {
  'Athlete': ['read:profile', 'update:profile', 'read:stats', 'view:notifications'],
  'Coach': ['read:profile', 'update:profile', 'manage:athletes', 'certify:matches'],
  'Official': ['read:profile', 'certify:matches', 'manage:tournaments'],
  'System Admin': ['*'],
};

// Registration request body
export interface RegisterUserDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  contact_number?: string;
  role: UserRole;

  // Athlete Subtype fields
  birthdate?: string;
  gender?: string;
  province?: string;
  sport_type?: string;
  recruitment_status?: string;
  leaderboard_rank?: number;
  eligibility_documents?: string[];
  achievements?: string[];

  // Coach Subtype fields
  professional_documents?: string[];
  years_of_experience?: number;
  current_institution?: string;
  athlete_managed?: string[];

  // Official Subtype fields
  tournament_affiliation?: string;

  // System Admin Subtype fields
  admin_security_key?: string;
}

// Login request body
export interface LoginUserDto {
  email: string;
  password: string;
}

// Password reset request body
export interface PasswordResetRequestDto {
  email: string;
}

// Password reset confirmation body
export interface PasswordResetConfirmDto {
  token: string;
  new_password: string;
}

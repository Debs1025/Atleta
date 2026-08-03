// User roles enum
export type UserRole = 'Athlete' | 'Coach' | 'Official' | 'System Admin';

// Base user stored in the "Users" collection
export interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

// Role-specific subtype profiles
export interface AthleteProfile {
  user_id: string;
  birthdate: string;
  gender: 'Male' | 'Female';
  province: string;
  sport_type: 'Basketball' | 'Swimming' | 'Track and Field';
  created_at: Date;
  updated_at: Date;
}

export interface CoachProfile {
  user_id: string;
  certification_license_num?: string;
  years_of_experience: number;
  current_institution: string;
  eligible_document?: {
    name: string;
    mimeType: string;
    size?: number;
  };
  created_at: Date;
  updated_at: Date;
}

export interface OfficialProfile {
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface AdminProfile {
  user_id: string;
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

// Registration request body
export interface RegisterUserDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  contact_number?: string;
  role: UserRole;
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

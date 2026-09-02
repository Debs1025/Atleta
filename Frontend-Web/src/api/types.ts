export interface OfficialLoginPayload {
  email: string;
  password: string;
  savePassword?: boolean;
}

export interface OfficialRegisterPayload {
  email: string;
  password: string;
  full_legal_name: string;
  organization_name: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
  phone_number?: string;
  assigned_sport?: string;
}

export interface PasswordResetPayload {
  email: string;
}

export interface OfficialSettingsPayload {
  split_screen_defaults?: boolean;
  discrepancy_presets?: boolean;
  match_reminders?: boolean;
}

export interface AuthUser {
  uid: string;
  role: string;
  full_legal_name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  organization_name?: string;
  organization?: string;
  assigned_sport?: string;
  profile?: Record<string, unknown>;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  message?: string;
}

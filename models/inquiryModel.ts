// ─── Public Coach Profile Entity ─────────────────────────────────────────────

export interface CoachPublicProfile {
  coach_id: string;               // Primary Key, UUID, Required
  user_id: string;                // Foreign Key -> Users.user_id, Required
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  contact_number?: string | null;
  years_of_experience: number;    // Required
  current_institution: string;    // Required
  quote?: string | null;          // Optional
  specialties?: string[];         // Optional
  success_rate?: number | null;   // Optional
  professional_documents?: string[]; // Optional
  sport_type?: string;
  avatar_url?: string | null;
}

// ─── Scouting Registry / Inquiry Entity ─────────────────────────────────────

export type InquiryStatus = 'Pending' | 'Accepted' | 'Declined';

export interface RecruitmentInquiry {
  inquiry_id: string;             // Primary Key, UUID, Required
  athlete_id: string;             // Foreign Key -> Athlete.athlete_id, Required
  coach_id: string;               // Foreign Key -> Coach.coach_id, Required
  message?: string | null;        // Optional, Max 1000 characters
  status: InquiryStatus;          // Default: "Pending"
  decline_reason?: string | null; // Optional, populated when status is "Declined"
  sent_at: string;                // ISO DateTime string, Default: NOW()
  updated_at: string;             // ISO DateTime string, Default: NOW()
}

// ─── Enriched Inquiry Response for Inquiry Tracker ──────────────────────────

export interface EnrichedInquiry extends RecruitmentInquiry {
  coach_name: string;
  current_institution: string;
  sport_type: string;
}

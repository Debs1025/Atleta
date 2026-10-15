// ─── Tournament Registry Entity ─────────────────────────────────────────────
// Stored in Firestore "Tournament_Registry" collection.

export interface TournamentRegistry {
  org_id: string;               // Primary Key, String/UUID, Required
  name: string;                 // Tournament or organization name
  organization_name: string;    // Organization name, Required
  registered_by: string;        // String (email or UUID)
  status: 'Active' | 'Inactive' | string; // Enum, Required
  created_at: string;           // Timestamp/ISO8601, Required
  updated_at?: string;          // Timestamp/ISO8601
  [key: string]: any;
}

export interface RegisterTournamentDto {
  name: string;
  organization_name?: string;
  registered_by: string;
  status?: 'Active' | 'Inactive';
}

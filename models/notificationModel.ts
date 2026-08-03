export type NotificationType =
  | 'Recruitment_Inquiry'
  | 'Inquiry_Status_Update'
  | 'Document_Action_Required';

export interface Notification {
  notification_id: string; // Primary Key (UUID)
  recipient_user_id: string; // Foreign Key (UUID)
  type: NotificationType;
  message_body: string;
  is_read: boolean;
  timestamp: string; // ISO 8601 Timestamp
}

export interface ShootingEfficiency {
  fg_pct: number;
  three_pct: number;
  ft_pct: number;
  efg_pct: number; // Effective Field Goal % = (FG + 0.5 * 3PM) / FGA
}

export interface FiveGameTrendItem {
  id: string;
  opponent: string;
  result: 'Win' | 'Lose';
  score: string;
  date: string;
  points: number;
}

export interface CurrentTeamSummary {
  team_id: string;
  team_name: string;
  coach_name: string;
  record: string;
  jersey_number?: number;
}

export interface AthleteHomeSummary {
  athlete_id: string;
  sport_category: string;
  personal_analytics: {
    ppg: number;
    rpg: number;
    apg: number;
    bpg: number;
    efficiency_rating: number;
    scoring_trend: number[];
    radar_competencies: {
      speed: number;
      agility: number;
      power: number;
      iq: number;
      tech: number;
    };
  };
  shooting_efficiency: ShootingEfficiency;
  five_game_trend: FiveGameTrendItem[];
  current_team_summary: CurrentTeamSummary | null;
}

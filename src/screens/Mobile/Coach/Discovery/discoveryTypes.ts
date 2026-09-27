export interface AthleteDiscoveryItem {
  athlete_id: string;
  full_name: string;
  province: string; // e.g. "Albay"
  recruitment_status: 'Available' | 'Recruited' | string;
  position_tag: string; // e.g. "PG", "SWIMMING", "TRACK AND FIELD"
  sport_category: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  biometrics: {
    height_ft: string; // "6'2""
    weight_lbs: string; // "185 lbs"
    wingspan_ft: string; // "6'5""
  };
  stats: {
    ppg?: number;
    rpg?: number;
    ast?: number;
    fg_pct?: number;
    times_100m?: string;
    times_200m?: string;
    times_400m?: string;
    times_50m_free?: string;
  };
  calculated_per: number; // e.g. 32.4
  efficiency_pct: number; // e.g. 88
  contact_info: {
    email: string;
    facebook: string;
    phone: string;
  };
  avatar_url?: string;
  jersey_number?: string;
}

export interface ScoutingProposalItem {
  scout_id: string;
  athlete_id: string;
  athlete_name: string;
  sport_category: string;
  offer_status: 'ACCEPTED' | 'PENDING' | 'DECLINED';
  date_added_relative: string; // e.g. "Added 2 days ago"
  created_at: string;
  avatar_url?: string;
}

export interface DiscoveryTeamItem {
  team_id: string;
  team_name: string;
  sport_category: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  division_tag: string;
  description: string;
  head_coach: string;
  season_record: string;
  logo_url?: string;
  banner_url?: string;
  roster: AthleteDiscoveryItem[];
}

export interface DiscoveryMatchPlayerStat {
  player: string;
  role_team?: string;
  pts?: number;
  reb?: number;
  ast?: number;
  fg_pct?: number;
  time_50m?: string;
  time_100m?: string;
  time_200m?: string;
  time_400m?: string;
  final_time?: string;
}

export interface DiscoveryMatchItem {
  match_id: string;
  sport_category: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  headline: string;
  time_venue: string;
  team1_name: string;
  team2_name: string;
  team1_score: number | string;
  team2_score: number | string;
  status: string;
  player_stats?: DiscoveryMatchPlayerStat[];
  dynamics_data?: number[];
}

export interface DiscoveryEventItem {
  event_id: string;
  event_name: string;
  date_range: string;
  matches: DiscoveryMatchItem[];
}

export type DiscoveryTab = 'PLAYERS' | 'TEAMS' | 'EVENTS';
export type SportCategoryFilter = 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';

export type RankingSortMetric = 'PER' | 'PPG' | 'RPG' | 'AST' | 'FG_PCT' | 'EFF' | 'TIME_50M' | 'TIME_100M' | 'TIME_200M' | 'TIME_400M';

export interface MetricOption {
  key: RankingSortMetric;
  label: string;
}

export const SPORT_METRICS: Record<SportCategoryFilter, MetricOption[]> = {
  BASKETBALL: [
    { key: 'PER', label: 'PER Score' },
    { key: 'PPG', label: 'Points (PPG)' },
    { key: 'RPG', label: 'Rebounds (RPG)' },
    { key: 'AST', label: 'Assists (AST)' },
    { key: 'EFF', label: 'Efficiency %' },
    { key: 'FG_PCT', label: 'Field Goal %' },
  ],
  SWIMMING: [
    { key: 'PER', label: 'PER Score' },
    { key: 'EFF', label: 'Efficiency %' },
    { key: 'TIME_50M', label: '50m Free' },
    { key: 'TIME_100M', label: '100m Free' },
    { key: 'TIME_200M', label: '200m Free' },
  ],
  'TRACK AND FIELD': [
    { key: 'PER', label: 'PER Score' },
    { key: 'EFF', label: 'Efficiency %' },
    { key: 'TIME_100M', label: '100m Sprint' },
    { key: 'TIME_200M', label: '200m Sprint' },
    { key: 'TIME_400M', label: '400m Sprint' },
  ],
};

export interface AdvancedAthleteFilters {
  position: string;
  minPpg: number;
  minPer: number;
  minEff: number;
  heightRange: string; // "ALL" | "<5'9" | "5'9-6'1" | "6'2-6'5" | "6'6+"
  weightRange: string; // "ALL" | "<150" | "150-180" | "180-210" | "210+"
  sortBy?: RankingSortMetric;
}

export const DEFAULT_ADVANCED_FILTERS: AdvancedAthleteFilters = {
  position: 'ALL',
  minPpg: 0,
  minPer: 0,
  minEff: 0,
  heightRange: 'ALL',
  weightRange: 'ALL',
  sortBy: 'PER',
};

export function matchesPosition(athletePos: string, filterPos: string): boolean {
  if (!filterPos || filterPos === 'ALL') return true;
  const a = (athletePos || '').toLowerCase().trim();
  const f = filterPos.toLowerCase().trim();

  if (a === f || a.includes(f) || f.includes(a)) return true;

  // Basketball aliases
  if (f.includes('point') || f === 'pg') {
    return a.includes('point') || a === 'pg' || a.includes('guard') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('shooting') || f === 'sg') {
    return a.includes('shooting') || a === 'sg' || a.includes('guard') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('small') || f === 'sf') {
    return a.includes('small') || a === 'sf' || a.includes('forward') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('power') || f === 'pf') {
    return a.includes('power') || a === 'pf' || a.includes('forward') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('center') || f === 'c') {
    return a.includes('center') || a === 'c' || a === 'player' || a === 'unassigned';
  }
  if (f === 'guard') {
    return a.includes('guard') || a === 'pg' || a === 'sg' || a === 'player' || a === 'unassigned';
  }
  if (f === 'forward') {
    return a.includes('forward') || a === 'sf' || a === 'pf' || a === 'player' || a === 'unassigned';
  }

  // Swimming aliases
  if (f.includes('free') || f === 'freestyle') {
    return a.includes('free') || a.includes('swim') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('back')) {
    return a.includes('back') || a.includes('swim') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('breast')) {
    return a.includes('breast') || a.includes('swim') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('fly') || f.includes('butter')) {
    return a.includes('fly') || a.includes('butter') || a.includes('swim') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('medley')) {
    return a.includes('medley') || a.includes('im') || a.includes('swim') || a === 'player' || a === 'unassigned';
  }

  // Track & Field aliases
  if (f.includes('sprint') || f === '100m' || f === '200m' || f === '400m') {
    return a.includes('sprint') || a.includes('100m') || a.includes('200m') || a.includes('400m') || a.includes('track') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('hurdle')) {
    return a.includes('hurdle') || a.includes('track') || a === 'player' || a === 'unassigned';
  }
  if (f.includes('jump')) {
    return a.includes('jump') || a.includes('track') || a === 'player' || a === 'unassigned';
  }

  return false;
}

export function matchesAthleteFilters(
  athlete: AthleteDiscoveryItem,
  filters: AdvancedAthleteFilters,
  searchQuery?: string
): boolean {
  // 1. Position Filter
  if (!matchesPosition(athlete.position_tag, filters.position)) {
    return false;
  }

  // 2. Key Stat Thresholds
  if (filters.minPpg > 0 && Number(athlete.stats?.ppg || 0) < filters.minPpg) {
    return false;
  }
  if (filters.minPer > 0 && Number(athlete.calculated_per || 0) < filters.minPer) {
    return false;
  }
  if (filters.minEff > 0 && Number(athlete.efficiency_pct || 0) < filters.minEff) {
    return false;
  }

  // 3. Physical Traits (Height)
  if (filters.heightRange && filters.heightRange !== 'ALL') {
    const heightMatch = (athlete.biometrics?.height_ft || '').match(/(\d+)'\s*(\d+)?/);
    const totalInches = heightMatch
      ? parseInt(heightMatch[1], 10) * 12 + parseInt(heightMatch[2] || '0', 10)
      : 0;

    if (totalInches > 0) {
      if (filters.heightRange === '<5\'9' && !(totalInches < 69)) return false;
      if (filters.heightRange === '5\'9-6\'1' && !(totalInches >= 69 && totalInches <= 73)) return false;
      if (filters.heightRange === '6\'2-6\'5' && !(totalInches >= 74 && totalInches <= 77)) return false;
      if (filters.heightRange === '6\'6+' && !(totalInches >= 78)) return false;
    }
  }

  // 4. Physical Traits (Weight)
  if (filters.weightRange && filters.weightRange !== 'ALL') {
    const weightMatch = (athlete.biometrics?.weight_lbs || '').match(/(\d+)/);
    const totalLbs = weightMatch ? parseInt(weightMatch[1], 10) : 0;

    if (totalLbs > 0) {
      if (filters.weightRange === '<150' && !(totalLbs < 150)) return false;
      if (filters.weightRange === '150-180' && !(totalLbs >= 150 && totalLbs <= 180)) return false;
      if (filters.weightRange === '180-210' && !(totalLbs >= 180 && totalLbs <= 210)) return false;
      if (filters.weightRange === '210+' && !(totalLbs >= 210)) return false;
    }
  }

  // 5. Search Query
  if (searchQuery) {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const completeStatMatch = q.match(/^(ppg|ast|fg|per|eff)\s*(>|>=|<|<=|=)\s*(\d+(\.\d+)?)$/i);
      if (completeStatMatch) {
        const statName = completeStatMatch[1].toLowerCase();
        const op = completeStatMatch[2];
        const val = parseFloat(completeStatMatch[3]);

        let targetVal: number | undefined;
        if (statName === 'ppg') targetVal = athlete.stats?.ppg;
        else if (statName === 'ast') targetVal = athlete.stats?.ast;
        else if (statName === 'fg') targetVal = athlete.stats?.fg_pct;
        else if (statName === 'per') targetVal = athlete.calculated_per;
        else if (statName === 'eff') targetVal = athlete.efficiency_pct;

        if (targetVal === undefined) return false;

        if (op === '>' && !(targetVal > val)) return false;
        if (op === '>=' && !(targetVal >= val)) return false;
        if (op === '<' && !(targetVal < val)) return false;
        if (op === '<=' && !(targetVal <= val)) return false;
        if (op === '=' && !(targetVal === val)) return false;
        return true;
      }

      const partialStatMatch = q.match(/^(ppg|ast|fg|per|eff|p|pp|a|as|f|e|ef)(\s*(>|>=|<|<=|=)?)?\s*$/i);
      if (partialStatMatch) {
        return true;
      }

      return (
        athlete.full_name.toLowerCase().includes(q) ||
        athlete.province.toLowerCase().includes(q) ||
        athlete.position_tag.toLowerCase().includes(q) ||
        athlete.recruitment_status.toLowerCase().includes(q)
      );
    }
  }

  return true;
}

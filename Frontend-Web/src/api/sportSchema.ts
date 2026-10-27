import type { SportConfiguration } from './types';

// Expected metric validation ranges to prevent OCR optical truncation, close digit confusion, or runaway values
export const METRIC_RANGES: Record<string, { min: number; max: number }> = {
  jersey_number: { min: 0, max: 99 },
  points: { min: 0, max: 250 },
  pts: { min: 0, max: 250 },
  score: { min: 0, max: 250 },
  assists: { min: 0, max: 50 },
  ast: { min: 0, max: 50 },
  rebounds: { min: 0, max: 60 },
  reb: { min: 0, max: 60 },
  offensive_rebounds: { min: 0, max: 30 },
  oreb: { min: 0, max: 30 },
  defensive_rebounds: { min: 0, max: 40 },
  dreb: { min: 0, max: 40 },
  steals: { min: 0, max: 25 },
  stl: { min: 0, max: 25 },
  blocks: { min: 0, max: 25 },
  blk: { min: 0, max: 25 },
  fouls: { min: 0, max: 10 },
  pf: { min: 0, max: 10 },
  personal_fouls: { min: 0, max: 10 },
  turnovers: { min: 0, max: 35 },
  to: { min: 0, max: 35 },
  minutes: { min: 0, max: 120 },
  min: { min: 0, max: 120 },
  fg_made: { min: 0, max: 60 },
  fgm: { min: 0, max: 60 },
  fg_attempted: { min: 0, max: 90 },
  fga: { min: 0, max: 90 },
  three_made: { min: 0, max: 35 },
  three_attempted: { min: 0, max: 50 },
  ft_made: { min: 0, max: 40 },
  ft_attempted: { min: 0, max: 50 },
  // Volleyball
  kills: { min: 0, max: 80 },
  attack_errors: { min: 0, max: 35 },
  attack_attempts: { min: 0, max: 120 },
  service_aces: { min: 0, max: 25 },
  service_errors: { min: 0, max: 25 },
  reception_errors: { min: 0, max: 25 },
  digs: { min: 0, max: 60 },
  block_points: { min: 0, max: 30 },
  block_solos: { min: 0, max: 20 },
  block_assists: { min: 0, max: 30 },
  sets_played: { min: 0, max: 10 },
  // Soccer
  goals: { min: 0, max: 15 },
  shots: { min: 0, max: 35 },
  shots_on_target: { min: 0, max: 30 },
  saves: { min: 0, max: 40 },
  tackles: { min: 0, max: 40 },
  fouls_committed: { min: 0, max: 20 },
  yellow_cards: { min: 0, max: 2 },
  red_cards: { min: 0, max: 1 },
  // Swimming & Track
  stroke_count: { min: 0, max: 500 },
  stroke_rate: { min: 0, max: 250 },
  lap_count: { min: 0, max: 200 },
  heat: { min: 1, max: 50 },
  lane: { min: 1, max: 20 },
  placement_rank: { min: 1, max: 500 },
  rank: { min: 1, max: 500 },
  distance_m: { min: 0, max: 100000 },
};

export const STAT_ALIAS_MAP: Record<string, string[]> = {
  finish_time_ms: ['finish_time', 'time', 'result_time', 'mark_time_ms', 'mark_time'],
  finish_time: ['finish_time_ms', 'time', 'result_time', 'mark_time_ms'],
  time: ['finish_time', 'finish_time_ms', 'result_time'],
  split_times_ms: ['split', 'split_time', 'split_1', 'lap_splits', 'split_times'],
  split: ['split_times_ms', 'split_time', 'split_1', 'lap_splits'],
  split_time: ['split', 'split_times_ms', 'split_1', 'lap_splits'],
  lap_splits: ['split', 'split_times_ms', 'split_time', 'split_times'],
  split_times: ['split', 'split_times_ms', 'split_time', 'lap_splits'],
  points: ['pts', 'score', 'total_points'],
  pts: ['points', 'score', 'total_points'],
  assists: ['ast'],
  ast: ['assists'],
  rebounds: ['reb', 'total_rebounds'],
  reb: ['rebounds', 'total_rebounds'],
  offensive_rebounds: ['oreb', 'orb', 'off_reb'],
  oreb: ['offensive_rebounds', 'orb', 'off_reb'],
  defensive_rebounds: ['dreb', 'drb', 'def_reb'],
  dreb: ['defensive_rebounds', 'drb', 'def_reb'],
  steals: ['stl'],
  stl: ['steals'],
  blocks: ['blk', 'block_points'],
  blk: ['blocks', 'block_points'],
  fouls: ['pf', 'personal_fouls', 'foul', 'f'],
  pf: ['fouls', 'personal_fouls', 'foul', 'f'],
  personal_fouls: ['fouls', 'pf'],
  turnovers: ['to', 'tov'],
  to: ['turnovers', 'tov'],
  minutes: ['min'],
  min: ['minutes'],
  fg_pct: ['field_goal_pct', 'fg_percentage'],
  fg_made: ['fgm', 'pt2_made', 'two_made'],
  fgm: ['fg_made', 'pt2_made'],
  fg_attempted: ['fga', 'pt2_attempts', 'two_attempted'],
  fga: ['fg_attempted', 'pt2_attempts'],
  three_made: ['three_pt_made', 'pt3_made', '3pm'],
  three_attempted: ['three_pt_attempted', 'pt3_attempts', '3pa'],
  ft_made: ['ftm'],
  ft_attempted: ['fta'],
  // Volleyball
  kills: ['kill_points', 'k'],
  attack_errors: ['att_err', 'ae'],
  attack_attempts: ['total_attacks', 'ta', 'att'],
  hitting_pct: ['hit_pct', 'spike_accuracy'],
  service_aces: ['aces', 'sa', 'ace'],
  aces: ['service_aces', 'sa', 'ace'],
  service_errors: ['serv_err', 'se'],
  reception_errors: ['rec_err', 're'],
  digs: ['dig'],
  block_points: ['blocks', 'blk', 'tb'],
  sets_played: ['sp', 'sets'],
  set_scores: ['set_score', 'sets'],
  // Individual / Timed
  distance_meters: ['distance_m', 'distance', 'mark_distance_m'],
  distance_m: ['distance_meters', 'distance', 'mark_distance_m'],
  distance: ['distance_m', 'distance_meters'],
  stroke_rate: ['stroke_count', 'strokes', 'cadence', 'stroke_cadence'],
  stroke_count: ['stroke_rate', 'strokes'],
  heat_number: ['heat'],
  heat: ['heat_number'],
  lane_number: ['lane'],
  lane: ['lane_number'],
  placement_rank: ['rank', 'place'],
  rank: ['placement_rank', 'place'],
  wind: ['wind_gauge'],
  // Badminton / Racket Sports
  smash_winners: ['smashes', 'smash', 'smash_winner'],
  smashes: ['smash_winners', 'smash'],
  net_kills: ['net_kill'],
  unforced_errors: ['errors', 'unforced_error', 'err'],
  service_faults: ['faults', 'service_fault', 'fault'],
  games_won: ['sets', 'sets_won', 'games'],
  game_scores: ['game_score', 'scores'],
  smash_win_pct: ['smash_pct', 'smash_percentage', 'smash_win_percentage'],
};

/**
 * Robust numerical parser with optical disambiguation and metric clamping
 */
export function parseRobustStatNum(val: any, metricKey?: string, fallback: number = 0): number {
  if (val === undefined || val === null) return fallback;
  if (typeof val === 'number') {
    if (isNaN(val)) return fallback;
    return clampMetric(val, metricKey);
  }

  let s = String(val).trim();
  if (!s) return fallback;

  // 1. Tally mark detection: e.g. "///", "||||", "III", "••••"
  if (/^[/|I•\-•*]+$/.test(s)) {
    return clampMetric(s.length, metricKey);
  }

  // 2. Disambiguate common OCR optical character confusions on close numerical digits
  if (/^[0-9OolISsB\s/.\-]+$/.test(s)) {
    s = s
      .replace(/(?<=\d)[Oo](?=\d|$)/g, '0')
      .replace(/^[Oo](?=\d)/g, '0')
      .replace(/(?<=\d)[lI](?=\d|$)/g, '1')
      .replace(/^[lI](?=\d)/g, '1')
      .replace(/(?<=\d)[Ss](?=\d|$)/g, '5')
      .replace(/(?<=\d)[B](?=\d|$)/g, '8');
  }

  // 3. Fraction / Split ratio format: "4/5" (made/attempted) or "4-5"
  if (s.includes('/') || (s.includes('-') && !s.startsWith('-'))) {
    const parts = s.split(/[/-]/);
    const parsed = parseFloat(parts[0].replace(/[^0-9.-]/g, ''));
    if (!isNaN(parsed)) {
      return clampMetric(parsed, metricKey);
    }
  }

  // 4. Standard numerical cleanup
  const clean = s.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return fallback;

  return clampMetric(parsed, metricKey);
}

function clampMetric(num: number, metricKey?: string): number {
  if (metricKey) {
    const range = METRIC_RANGES[metricKey.toLowerCase()];
    if (range) {
      if (num < range.min) return range.min;
      if (num > range.max) return range.max;
    }
  }
  return num < 0 ? 0 : num;
}

/**
 * Reads stat value from athlete row across direct fields, aliases, and nested .stats
 */
export function getMetricValue(a: any, key: string, fallback: any = ''): any {
  if (!a) return fallback;
  if (a[key] !== undefined && a[key] !== null && a[key] !== '') return a[key];
  if (a.stats && a.stats[key] !== undefined && a.stats[key] !== null && a.stats[key] !== '') return a.stats[key];
  if (a.sport_stats && a.sport_stats[key] !== undefined && a.sport_stats[key] !== null && a.sport_stats[key] !== '') return a.sport_stats[key];

  const aliases = STAT_ALIAS_MAP[key] || [];
  for (const alt of aliases) {
    if (a[alt] !== undefined && a[alt] !== null && a[alt] !== '') return a[alt];
    if (a.stats && a.stats[alt] !== undefined && a.stats[alt] !== null && a.stats[alt] !== '') return a.stats[alt];
    if (a.sport_stats && a.sport_stats[alt] !== undefined && a.sport_stats[alt] !== null && a.sport_stats[alt] !== '') return a.sport_stats[alt];
  }

  return fallback;
}

/**
 * Updates a stat value on an athlete row across direct fields and aliases
 */
export function setMetricValue(a: any, key: string, value: any): void {
  a[key] = value;
  if (!a.stats || typeof a.stats !== 'object') a.stats = {};
  a.stats[key] = value;

  const aliases = STAT_ALIAS_MAP[key] || [];
  for (const alt of aliases) {
    a[alt] = value;
    a.stats[alt] = value;
  }
}

export interface DynamicSportColumn {
  key: string;
  label: string;
  isNumeric: boolean;
  category?: string;
  formula?: string;
  placeholder?: string;
}

export type SportColumnDef = DynamicSportColumn;

/**
 * Dynamically resolves table columns based on Firestore admin sport configuration + detected scoresheet metrics
 */
export function resolveSportColumns(
  sportType: string,
  activeSportConfig?: SportConfiguration | null,
  sampleAthletes?: any[]
): DynamicSportColumn[] {
  const norm = (sportType || '').trim().toUpperCase();
  const isVolleyball = norm.includes('VOLLEY');
  const isSoccer = norm.includes('SOCCER') || norm.includes('FOOTBALL');
  const isSwimming = norm.includes('SWIM');
  const isTrack = norm.includes('TRACK') || norm.includes('FIELD') || norm.includes('ATHLETIC') || norm.includes('RUN');
  const isIndividual = isSwimming || isTrack;
  const isBasketball = norm.includes('BASKET') || (!isVolleyball && !isSoccer && !isIndividual && !norm.includes('PICKLE') && !norm.includes('BADM') && !norm.includes('TENNIS') && !norm.includes('BASEBALL'));

  const cols: DynamicSportColumn[] = [];
  const addedKeys = new Set<string>();

  // 1. Dynamic Firestore Admin Sport Schema Configured Stats
  if (activeSportConfig) {
    if (Array.isArray(activeSportConfig.configurable_stats) && activeSportConfig.configurable_stats.length > 0) {
      activeSportConfig.configurable_stats.forEach((cs) => {
        const key = cs.stat_name_key.trim();
        if (!addedKeys.has(key)) {
          addedKeys.add(key);
          const cat = cs.measurement_category || 'Count';
          const isNum = cat !== 'Percentage' && cat !== 'Time (ms)';
          cols.push({
            key,
            label: (cs.label || key.replace(/_/g, ' ')).toUpperCase(),
            isNumeric: isNum,
            category: cat,
            formula: cs.formula,
          });
        }
      });
    }

    if (activeSportConfig.stat_schema && typeof activeSportConfig.stat_schema === 'object') {
      Object.entries(activeSportConfig.stat_schema).forEach(([key, val]) => {
        const cleanKey = key.trim();
        if (!addedKeys.has(cleanKey)) {
          addedKeys.add(cleanKey);
          const cat = val.measurement_category || 'Count';
          const isNum = cat !== 'Percentage' && cat !== 'Time (ms)';
          cols.push({
            key: cleanKey,
            label: (val.display_label || cleanKey.replace(/_/g, ' ')).toUpperCase(),
            isNumeric: isNum,
            category: cat,
            formula: val.formula,
          });
        }
      });
    }

    const genericMetrics = (activeSportConfig as any).performance_metrics || (activeSportConfig as any).metrics || (activeSportConfig as any).custom_metrics;
    if (Array.isArray(genericMetrics) && genericMetrics.length > 0) {
      genericMetrics.forEach((m: any) => {
        const key = (m.metric_key || m.key || m.name || '').trim();
        if (key && !addedKeys.has(key)) {
          addedKeys.add(key);
          const isNum = m.data_type === 'number' || m.isNumeric !== false;
          cols.push({
            key,
            label: (m.label || key.replace(/_/g, ' ')).toUpperCase(),
            isNumeric: isNum,
            category: m.category || (isNum ? 'Count' : 'Text'),
          });
        }
      });
    }
  }

  // 2. Canonical Sport Schema Defaults (when admin schema is missing or incomplete)
  if (cols.length === 0) {
    if (isBasketball) {
      [
        { key: 'pts', label: 'PTS', isNumeric: true },
        { key: 'reb', label: 'REB', isNumeric: true },
        { key: 'ast', label: 'AST', isNumeric: true },
        { key: 'stl', label: 'STL', isNumeric: true },
        { key: 'blk', label: 'BLK', isNumeric: true },
        { key: 'fouls', label: 'FOULS', isNumeric: true },
        { key: 'to', label: 'TO', isNumeric: true },
        { key: 'min', label: 'MIN', isNumeric: true },
        { key: 'fg_pct', label: 'FG%', isNumeric: false },
      ].forEach((c) => {
        addedKeys.add(c.key);
        cols.push(c);
      });
    } else if (isVolleyball) {
      [
        { key: 'kills', label: 'KILLS', isNumeric: true },
        { key: 'attack_errors', label: 'ATK ERR', isNumeric: true },
        { key: 'attack_attempts', label: 'ATTEMPTS', isNumeric: true },
        { key: 'hitting_pct', label: 'HIT %', isNumeric: false },
        { key: 'service_aces', label: 'ACES', isNumeric: true },
        { key: 'digs', label: 'DIGS', isNumeric: true },
        { key: 'block_points', label: 'BLK PTS', isNumeric: true },
        { key: 'ast', label: 'AST', isNumeric: true },
        { key: 'sets_played', label: 'SETS', isNumeric: true },
        { key: 'pts', label: 'PTS', isNumeric: true },
      ].forEach((c) => {
        addedKeys.add(c.key);
        cols.push(c);
      });
    } else if (norm.includes('PICKLE')) {
      [
        { key: 'pts', label: 'POINTS', isNumeric: true },
        { key: 'games_won', label: 'GAMES', isNumeric: true },
        { key: 'service_aces', label: 'ACES', isNumeric: true },
        { key: 'service_faults', label: 'FAULTS', isNumeric: true },
        { key: 'unforced_errors', label: 'ERRORS', isNumeric: true },
      ].forEach((c) => {
        addedKeys.add(c.key);
        cols.push(c);
      });
    } else if (norm.includes('BADM')) {
      [
        { key: 'games_won', label: 'SETS', isNumeric: true },
        { key: 'game_scores', label: 'GAME SCORES', isNumeric: false },
        { key: 'pts', label: 'TOTAL PTS', isNumeric: true },
        { key: 'smash_winners', label: 'SMASHES', isNumeric: true },
        { key: 'net_kills', label: 'NET KILLS', isNumeric: true },
        { key: 'unforced_errors', label: 'ERRORS', isNumeric: true },
        { key: 'service_faults', label: 'FAULTS', isNumeric: true },
      ].forEach((c) => {
        addedKeys.add(c.key);
        cols.push(c);
      });
    } else if (isSoccer) {
      [
        { key: 'goals', label: 'GOALS', isNumeric: true },
        { key: 'ast', label: 'AST', isNumeric: true },
        { key: 'shots', label: 'SHOTS', isNumeric: true },
        { key: 'shots_on_target', label: 'SOT', isNumeric: true },
        { key: 'saves', label: 'SAVES', isNumeric: true },
        { key: 'tackles', label: 'TACKLES', isNumeric: true },
        { key: 'fouls', label: 'FOULS', isNumeric: true },
        { key: 'min', label: 'MIN', isNumeric: true },
      ].forEach((c) => {
        addedKeys.add(c.key);
        cols.push(c);
      });
    } else if (isSwimming) {
      [
        { key: 'finish_time', label: 'FINISH TIME', isNumeric: false },
        { key: 'split', label: 'SPLIT', isNumeric: false },
        { key: 'distance_m', label: 'DISTANCE (M)', isNumeric: true },
        { key: 'lap_count', label: 'LAPS', isNumeric: true },
        { key: 'stroke_rate', label: 'STROKE RATE', isNumeric: true },
        { key: 'heat', label: 'HEAT', isNumeric: true },
        { key: 'lane', label: 'LANE', isNumeric: true },
      ].forEach((c) => {
        addedKeys.add(c.key);
        cols.push(c);
      });
    } else if (isTrack) {
      [
        { key: 'finish_time', label: 'FINISH TIME', isNumeric: false },
        { key: 'split', label: 'SPLIT', isNumeric: false },
        { key: 'distance_m', label: 'DISTANCE (M)', isNumeric: true },
        { key: 'wind', label: 'WIND', isNumeric: false },
        { key: 'heat', label: 'HEAT', isNumeric: true },
        { key: 'lane', label: 'LANE', isNumeric: true },
      ].forEach((c) => {
        addedKeys.add(c.key);
        cols.push(c);
      });
    } else {
      // General multi-sport fallback
      [
        { key: 'pts', label: 'POINTS', isNumeric: true },
        { key: 'ast', label: 'ASSISTS', isNumeric: true },
        { key: 'reb', label: 'REBOUNDS / DIGS', isNumeric: true },
        { key: 'fouls', label: 'FOULS', isNumeric: true },
      ].forEach((c) => {
        addedKeys.add(c.key);
        cols.push(c);
      });
    }
  }

  // 3. Dynamic Discovery: Inspect athlete records for genuine secondary stats extracted from scoresheet
  const SYSTEM_KEYS = new Set([
    'athlete_id', 'row_uid', 'player_name', 'athlete_name', 'team_name', 'jersey_number', 'jersey_no', 'position',
    'event', 'event_id', 'rank', 'placement_rank', 'stats', 'sport_stats',
    'calculated_efficiency', 'calculated_player_efficiency', 'true_shooting_pct',
    'result_time', 'time',
  ]);

  const CROSS_SPORT_KEYS: Record<string, Set<string>> = {
    basketball: new Set(['kills', 'attack_errors', 'attack_attempts', 'hitting_pct', 'service_aces', 'service_errors', 'reception_errors', 'digs', 'block_solos', 'block_assists', 'block_points', 'sets_played', 'goals', 'shots', 'shots_on_target', 'saves', 'tackles', 'smash_winners', 'net_kills']),
    volleyball: new Set(['goals', 'shots', 'shots_on_target', 'saves', 'tackles', 'fg_made', 'fg_attempted', 'three_made', 'three_attempted', 'ft_made', 'ft_attempted', 'fg_pct', 'three_p_pct', 'ft_pct', 'smash_winners', 'net_kills']),
    soccer: new Set(['kills', 'attack_errors', 'attack_attempts', 'hitting_pct', 'service_aces', 'digs', 'fg_made', 'fg_attempted', 'three_made', 'three_attempted', 'ft_made', 'ft_attempted', 'fg_pct', 'three_p_pct', 'ft_pct', 'smash_winners', 'net_kills']),
    badminton: new Set(['kills', 'attack_errors', 'attack_attempts', 'hitting_pct', 'digs', 'goals', 'shots', 'shots_on_target', 'saves', 'tackles', 'fg_made', 'fg_attempted', 'three_made', 'three_attempted', 'ft_made', 'ft_attempted', 'fg_pct', 'three_p_pct', 'ft_pct', 'reb', 'rebounds', 'assists', 'ast', 'blocks', 'blk', 'turnovers', 'to', 'tov', 'fgm', 'fga', '3pm', '3pa', 'ftm', 'fta', 'steals', 'stl', 'fouls', 'pf']),
  };

  const ignoredForSport = isBasketball ? CROSS_SPORT_KEYS.basketball : isVolleyball ? CROSS_SPORT_KEYS.volleyball : isSoccer ? CROSS_SPORT_KEYS.soccer : norm.includes('BADM') ? CROSS_SPORT_KEYS.badminton : null;

  // Check if key or any of its aliases is already added
  const isKeyOrAliasAdded = (key: string): boolean => {
    if (addedKeys.has(key)) return true;
    const aliases = STAT_ALIAS_MAP[key] || [];
    for (const alt of aliases) {
      if (addedKeys.has(alt)) return true;
    }
    for (const added of addedKeys) {
      const addedAliases = STAT_ALIAS_MAP[added] || [];
      if (addedAliases.includes(key)) return true;
    }
    return false;
  };

  if (Array.isArray(sampleAthletes) && sampleAthletes.length > 0) {
    sampleAthletes.forEach((a) => {
      const checkAndAdd = (k: string, val: any) => {
        if (SYSTEM_KEYS.has(k)) return;
        if (ignoredForSport && ignoredForSport.has(k)) return;
        if (isKeyOrAliasAdded(k)) return;
        if (val === undefined || val === null || val === '') return;
        // Don't create new columns for stats that are uniformly 0
        if (typeof val === 'number' && val === 0) return;

        addedKeys.add(k);
        const isNum = typeof val === 'number';
        cols.push({
          key: k,
          label: k.replace(/_/g, ' ').toUpperCase(),
          isNumeric: isNum,
        });
      };

      Object.keys(a).forEach((k) => checkAndAdd(k, a[k]));

      if (a.stats && typeof a.stats === 'object') {
        Object.keys(a.stats).forEach((k) => checkAndAdd(k, a.stats[k]));
      }
    });
  }

  return cols;
}

/**
 * Calculates match scores dynamically based on the active sport configuration and scoring rules
 */
export function calculateDynamicMatchScore(
  sportType: string,
  homeTeamName: string,
  awayTeamName: string,
  athletes: any[],
  teamScores?: Array<{ team: string; score: number }>,
  scoringRules?: Record<string, any>
): { homeScore: number; awayScore: number; scoreUnit: string } {
  const norm = (sportType || '').trim().toUpperCase();
  const isVolleyball = norm.includes('VOLLEY');
  const isSoccer = norm.includes('SOCCER') || norm.includes('FOOTBALL');
  const isBadminton = norm.includes('BADM');
  const isIndividual = norm.includes('SWIM') || norm.includes('TRACK') || norm.includes('FIELD') || norm.includes('RUN') || norm.includes('ATHLETIC');

  const customUnit = typeof scoringRules?.primary_score_unit === 'string' ? scoringRules.primary_score_unit : undefined;
  const scoreUnit = customUnit || (isVolleyball ? 'SETS' : isBadminton ? 'SETS' : isSoccer ? 'GOALS' : isIndividual ? 'PTS' : 'PTS');

  const homeAthletes = athletes.filter((a) => (a.team_name || '').toUpperCase() === homeTeamName.toUpperCase());
  const awayAthletes = athletes.filter((a) => (a.team_name || '').toUpperCase() === awayTeamName.toUpperCase());

  // 1. If explicit team scores were parsed from scoresheet table headers, honor them
  if (Array.isArray(teamScores) && teamScores.length >= 2) {
    const homeItem = teamScores.find((t) => (t.team || '').toUpperCase() === homeTeamName.toUpperCase()) || teamScores[0];
    const awayItem = teamScores.find((t) => (t.team || '').toUpperCase() === awayTeamName.toUpperCase()) || teamScores[1];
    if (homeItem?.score !== undefined && awayItem?.score !== undefined) {
      return {
        homeScore: Number(homeItem.score),
        awayScore: Number(awayItem.score),
        scoreUnit,
      };
    }
  }

  // 2. Dynamic scoring calculation based on sport category
  if (isVolleyball) {
    const homeKills = homeAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'kills', 0), 'kills'), 0);
    const homeAces = homeAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'service_aces', 0), 'service_aces'), 0);
    const homeBlocks = homeAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'block_points', 0), 'block_points'), 0);
    const homeTotal = homeKills + homeAces + homeBlocks;

    const awayKills = awayAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'kills', 0), 'kills'), 0);
    const awayAces = awayAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'service_aces', 0), 'service_aces'), 0);
    const awayBlocks = awayAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'block_points', 0), 'block_points'), 0);
    const awayTotal = awayKills + awayAces + awayBlocks;

    return {
      homeScore: homeTotal > 0 ? homeTotal : homeAthletes.length,
      awayScore: awayTotal > 0 ? awayTotal : awayAthletes.length,
      scoreUnit,
    };
  }

  if (isBadminton) {
    // In badminton matches/ties, score is measured in SETS / MATCHES WON (e.g. 3 - 1 or 2 - 0 / 2 - 1)
    const homeSets = homeAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'games_won', getMetricValue(a, 'sets', 0)), 'games_won'), 0);
    const awaySets = awayAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'games_won', getMetricValue(a, 'sets', 0)), 'games_won'), 0);
    return {
      homeScore: homeSets,
      awayScore: awaySets,
      scoreUnit: 'SETS',
    };
  }

  if (isSoccer) {
    const homeGoals = homeAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'goals', 0), 'goals'), 0);
    const awayGoals = awayAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'goals', 0), 'goals'), 0);
    return {
      homeScore: homeGoals,
      awayScore: awayGoals,
      scoreUnit,
    };
  }

  // Default: Sum points
  const homePts = homeAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'pts', getMetricValue(a, 'points', 0)), 'points'), 0);
  const awayPts = awayAthletes.reduce((sum, a) => sum + parseRobustStatNum(getMetricValue(a, 'pts', getMetricValue(a, 'points', 0)), 'points'), 0);

  return {
    homeScore: homePts,
    awayScore: awayPts,
    scoreUnit,
  };
}

/**
 * Parse time string into total seconds for numerical sorting.
 * Supports MM:SS.ms, HH:MM:SS.ms, SS.ms, etc.
 */
export function parseTimeToSeconds(timeVal: any): number {
  if (timeVal === undefined || timeVal === null) return 999999;
  if (typeof timeVal === 'number') return timeVal > 0 ? timeVal : 999999;
  const str = String(timeVal).trim().toLowerCase().replace(/[^\d:.]/g, '');
  if (!str) return 999999;

  const parts = str.split(':');
  if (parts.length === 3) {
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const m = parseFloat(parts[0]) || 0;
    const s = parseFloat(parts[1]) || 0;
    return m * 60 + s;
  }
  const s = parseFloat(parts[0]);
  return isNaN(s) || s <= 0 ? 999999 : s;
}

/**
 * Sorts race athletes in ascending order (fastest/lowest time first).
 * Re-indexes placement_rank: 1, 2, 3... and preserves DQ at the end.
 */
export function sortRaceResultsByTime(results: any[]): any[] {
  if (!Array.isArray(results) || results.length === 0) return [];
  const list = [...results];

  list.sort((a, b) => {
    // Disqualified goes to the end
    if (a.is_disqualified && !b.is_disqualified) return 1;
    if (!a.is_disqualified && b.is_disqualified) return -1;

    const timeA = parseTimeToSeconds(a.finish_time || a.time || a.mark_time);
    const timeB = parseTimeToSeconds(b.finish_time || b.time || b.mark_time);

    if (timeA !== timeB) return timeA - timeB;

    const rankA = Number(a.placement_rank || a.rank || 999);
    const rankB = Number(b.placement_rank || b.rank || 999);
    return rankA - rankB;
  });

  return list.map((item, idx) => ({
    ...item,
    placement_rank: String(idx + 1),
  }));
}

/**
 * Sorts roster athletes by their sport's primary scoring metric (descending).
 * Basketball: PTS
 * Volleyball: KILLS or PTS
 * Soccer: GOALS or PTS
 * Badminton: TOTAL PTS or SMASHES
 * Custom: Highest primary metric
 */
export function sortAthletesByPrimaryMetric(
  athletes: any[],
  sportType: string,
  activeSportConfig?: SportConfiguration | null
): any[] {
  if (!Array.isArray(athletes) || athletes.length === 0) return [];
  const norm = (sportType || '').trim().toUpperCase();
  const list = [...athletes];

  let primaryKey = 'pts';
  if (norm.includes('BASKET')) {
    primaryKey = 'pts';
  } else if (norm.includes('VOLLEY')) {
    primaryKey = 'kills';
  } else if (norm.includes('SOCCER') || norm.includes('FOOTBALL')) {
    primaryKey = 'goals';
  } else if (norm.includes('BADM')) {
    primaryKey = 'pts';
  } else if (norm.includes('PICKLE')) {
    primaryKey = 'points';
  } else if (activeSportConfig) {
    const stats = activeSportConfig.configurable_stats || [];
    if (stats.length > 0) {
      primaryKey = stats[0].stat_name_key;
    }
  }

  list.sort((a, b) => {
    let valA = Number(getMetricValue(a, primaryKey, 0)) || 0;
    let valB = Number(getMetricValue(b, primaryKey, 0)) || 0;

    if (valA === valB && primaryKey !== 'pts' && primaryKey !== 'points') {
      valA = Number(getMetricValue(a, 'pts', getMetricValue(a, 'points', 0))) || 0;
      valB = Number(getMetricValue(b, 'pts', getMetricValue(b, 'points', 0))) || 0;
    }

    return valB - valA;
  });

  return list;
}


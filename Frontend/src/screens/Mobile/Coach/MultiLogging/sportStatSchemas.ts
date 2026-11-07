import { getSportsOfflineFirst } from "../../../../services/firebaseClient";

export interface SportStatAction {
  label: string;
  statKey: 'pts' | 'ast' | 'reb' | 'stl' | 'blk' | 'pf' | 'to' | string;
  delta: number;
  icon?: string;
  color?: string;
  sublabel?: string;
}

export interface SportStatCategoryGroup {
  name: string;
  icon?: string;
  color?: string;
  actions: SportStatAction[];
}

export interface SportStatHeader {
  label: string;
  key: 'pts' | 'ast' | 'reb' | 'stl' | 'blk' | 'pf' | 'to' | string;
  shortLabel?: string;
  width?: number;
}

export interface SportStatSchema {
  sportDisplayName: string;
  isTimed: boolean;
  formatSummary: (stats: any, customStats?: any) => string;
  primaryActions: SportStatAction[];
  secondaryActions: SportStatAction[];
  actionCategories?: SportStatCategoryGroup[];
  multiPointOptions: SportStatAction[];
  tableHeaders: SportStatHeader[];
  configurable_stats?: any[];
}

let cachedDynamicConfigs: any[] = [];

/**
 * Useless, redundant, or impossible-to-log-live stats filtered out from coach multi-logging.
 */
export const USELESS_STAT_KEYS = new Set([
  'fg_attempted',
  'field_goals_attempted',
  'fga',
  'ft_attempted',
  'free_throws_attempted',
  'fta',
  '3pt_attempted',
  'three_point_attempted',
  'shots_attempted',
  'fg_made',
  'field_goals_made',
  'ft_made',
  'free_throws_made',
  'stroke_rate',
  'cadence',
  'heart_rate',
  'pace_seconds',
]);

/**
 * Fetch and cache dynamic sport configurations directly from Firestore.
 */
export async function loadDynamicSportsSchemas(forceRefresh: boolean = false): Promise<any[]> {
  try {
    const configs = await getSportsOfflineFirst(forceRefresh);
    if (Array.isArray(configs) && configs.length > 0) {
      cachedDynamicConfigs = configs;
      return configs;
    }
  } catch (err) {
    console.warn("loadDynamicSportsSchemas note:", err);
  }
  return cachedDynamicConfigs;
}

// -------------------------------------------------------------
// Curated Sport Schema Definitions
// -------------------------------------------------------------

const BASKETBALL_SCHEMA: SportStatSchema = {
  sportDisplayName: 'BASKETBALL',
  isTimed: false,
  formatSummary: (s: any, c?: any) => {
    const pts = s?.pts ?? c?.points ?? 0;
    const reb = s?.reb ?? c?.rebounds ?? (Number(c?.offensive_rebounds || 0) + Number(c?.defensive_rebounds || 0));
    const ast = s?.ast ?? c?.assists ?? 0;
    return `${pts} PTS • ${reb} REB • ${ast} AST`;
  },
  primaryActions: [
    { label: '+2 PTS', statKey: 'pts', delta: 2 },
    { label: '+REB', statKey: 'reb', delta: 1 },
    { label: '+AST', statKey: 'ast', delta: 1 },
  ],
  multiPointOptions: [
    { label: '+1 PT (FT)', statKey: 'pts', delta: 1, icon: 'radio-button-on-outline', color: '#38BDF8' },
    { label: '+2 PTS (FG)', statKey: 'pts', delta: 2, icon: 'basketball-outline', color: '#00D2FF' },
    { label: '+3 PTS (3PT)', statKey: 'pts', delta: 3, icon: 'flame-outline', color: '#F59E0B' },
  ],
  secondaryActions: [
    { label: 'STEAL (+1 STL)', statKey: 'stl', delta: 1, icon: 'hand-left-outline', color: '#8B5CF6' },
    { label: 'BLOCK (+1 BLK)', statKey: 'blk', delta: 1, icon: 'shield-checkmark-outline', color: '#10B981' },
    { label: 'FOUL (+1 PF)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
    { label: 'TURNOVER (+1 TO)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F97316' },
  ],
  actionCategories: [
    {
      name: 'SCORING & SHOTS',
      icon: 'basketball-outline',
      color: '#00D2FF',
      actions: [
        { label: '+1 PT (Free Throw)', statKey: 'pts', delta: 1, icon: 'radio-button-on-outline', color: '#38BDF8' },
        { label: '+2 PTS (Field Goal)', statKey: 'pts', delta: 2, icon: 'basketball-outline', color: '#00D2FF' },
        { label: '+3 PTS (3-Pointer)', statKey: 'pts', delta: 3, icon: 'flame-outline', color: '#F59E0B' },
      ],
    },
    {
      name: 'DEFENSE & PLAYMAKING',
      icon: 'shield-outline',
      color: '#10B981',
      actions: [
        { label: '+1 REB (Rebound)', statKey: 'reb', delta: 1, icon: 'shield-outline', color: '#10B981' },
        { label: '+1 AST (Assist)', statKey: 'ast', delta: 1, icon: 'share-outline', color: '#38BDF8' },
        { label: '+1 STL (Steal)', statKey: 'stl', delta: 1, icon: 'hand-left-outline', color: '#8B5CF6' },
        { label: '+1 BLK (Block)', statKey: 'blk', delta: 1, icon: 'shield-checkmark-outline', color: '#06B6D4' },
      ],
    },
    {
      name: 'FOULS & TURNOVERS',
      icon: 'warning-outline',
      color: '#EF4444',
      actions: [
        { label: '+1 FOUL (Personal Foul)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: '+1 TURNOVER (Turnover)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F97316' },
      ],
    },
  ],
  tableHeaders: [
    { label: 'PTS', key: 'pts' },
    { label: 'REB', key: 'reb' },
    { label: 'AST', key: 'ast' },
    { label: 'STL', key: 'stl' },
    { label: 'BLK', key: 'blk' },
    { label: 'FOUL', key: 'pf' },
    { label: 'TO', key: 'to' },
  ],
};

const VOLLEYBALL_SCHEMA: SportStatSchema = {
  sportDisplayName: 'VOLLEYBALL',
  isTimed: false,
  formatSummary: (s: any, c?: any) => {
    const kills = s?.pts ?? c?.kills ?? 0;
    const aces = s?.ast ?? c?.aces ?? 0;
    const blks = s?.blk ?? c?.blocks ?? 0;
    return `${kills} KILLS • ${aces} ACES • ${blks} BLKS`;
  },
  primaryActions: [
    { label: '+KILL', statKey: 'pts', delta: 1 },
    { label: '+ACE', statKey: 'ast', delta: 1 },
    { label: '+BLOCK', statKey: 'blk', delta: 1 },
  ],
  multiPointOptions: [],
  secondaryActions: [
    { label: 'DIG (+1 DIG)', statKey: 'reb', delta: 1, icon: 'hand-left-outline', color: '#10B981' },
    { label: 'ASSIST (+1 AST)', statKey: 'stl', delta: 1, icon: 'share-outline', color: '#38BDF8' },
    { label: 'FAULT (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
    { label: 'SERVICE ERR', statKey: 'to', delta: 1, icon: 'close-circle-outline', color: '#F97316' },
  ],
  actionCategories: [
    {
      name: 'ATTACKING & SCORING',
      icon: 'flash-outline',
      color: '#00D2FF',
      actions: [
        { label: '+1 KILL (Spike)', statKey: 'pts', delta: 1, icon: 'flash-outline', color: '#00D2FF' },
        { label: '+1 ACE (Service)', statKey: 'ast', delta: 1, icon: 'star-outline', color: '#F59E0B' },
        { label: '+1 ASSIST (Set)', statKey: 'stl', delta: 1, icon: 'share-outline', color: '#38BDF8' },
      ],
    },
    {
      name: 'DEFENSE & RECEPTION',
      icon: 'shield-outline',
      color: '#10B981',
      actions: [
        { label: '+1 BLOCK', statKey: 'blk', delta: 1, icon: 'shield-outline', color: '#10B981' },
        { label: '+1 DIG', statKey: 'reb', delta: 1, icon: 'hand-left-outline', color: '#8B5CF6' },
      ],
    },
    {
      name: 'ERRORS & FAULTS',
      icon: 'warning-outline',
      color: '#EF4444',
      actions: [
        { label: '+1 SERVICE ERROR', statKey: 'to', delta: 1, icon: 'close-circle-outline', color: '#EF4444' },
        { label: '+1 NET / FAULT', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#F97316' },
      ],
    },
  ],
  tableHeaders: [
    { label: 'KILL', key: 'pts' },
    { label: 'ACE', key: 'ast' },
    { label: 'BLK', key: 'blk' },
    { label: 'DIG', key: 'reb' },
    { label: 'AST', key: 'stl' },
    { label: 'FLT', key: 'pf' },
    { label: 'ERR', key: 'to' },
  ],
};

const SOCCER_SCHEMA: SportStatSchema = {
  sportDisplayName: 'SOCCER',
  isTimed: true,
  formatSummary: (s: any, c?: any) => {
    const goals = s?.pts ?? c?.goals ?? 0;
    const ast = s?.ast ?? c?.assists ?? 0;
    const saves = s?.reb ?? c?.saves ?? 0;
    return `${goals} GOALS • ${ast} AST • ${saves} SAVES`;
  },
  primaryActions: [
    { label: '+GOAL', statKey: 'pts', delta: 1 },
    { label: '+AST', statKey: 'ast', delta: 1 },
    { label: '+SAVE', statKey: 'reb', delta: 1 },
  ],
  multiPointOptions: [],
  secondaryActions: [
    { label: 'TACKLE (+1)', statKey: 'stl', delta: 1, icon: 'shield-outline', color: '#10B981' },
    { label: 'BLOCK (+1)', statKey: 'blk', delta: 1, icon: 'shield-checkmark-outline', color: '#00D2FF' },
    { label: 'FOUL (+1)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
    { label: 'OFFSIDE / TO', statKey: 'to', delta: 1, icon: 'flag-outline', color: '#F97316' },
  ],
  actionCategories: [
    {
      name: 'SCORING & ATTACKING',
      icon: 'football-outline',
      color: '#00D2FF',
      actions: [
        { label: '+1 GOAL', statKey: 'pts', delta: 1, icon: 'football-outline', color: '#00D2FF' },
        { label: '+1 ASSIST', statKey: 'ast', delta: 1, icon: 'share-outline', color: '#38BDF8' },
      ],
    },
    {
      name: 'DEFENSE & GOALKEEPING',
      icon: 'shield-outline',
      color: '#10B981',
      actions: [
        { label: '+1 SAVE', statKey: 'reb', delta: 1, icon: 'hand-left-outline', color: '#10B981' },
        { label: '+1 TACKLE', statKey: 'stl', delta: 1, icon: 'shield-outline', color: '#8B5CF6' },
        { label: '+1 BLOCK', statKey: 'blk', delta: 1, icon: 'shield-checkmark-outline', color: '#06B6D4' },
      ],
    },
    {
      name: 'DISCIPLINE & FOULS',
      icon: 'warning-outline',
      color: '#EF4444',
      actions: [
        { label: '+1 FOUL', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: '+1 YELLOW CARD', statKey: 'yc', delta: 1, icon: 'card-outline', color: '#F59E0B' },
        { label: '+1 OFFSIDE / TO', statKey: 'to', delta: 1, icon: 'flag-outline', color: '#F97316' },
      ],
    },
  ],
  tableHeaders: [
    { label: 'GOAL', key: 'pts' },
    { label: 'AST', key: 'ast' },
    { label: 'SAVE', key: 'reb' },
    { label: 'TCK', key: 'stl' },
    { label: 'BLK', key: 'blk' },
    { label: 'FOUL', key: 'pf' },
    { label: 'TO', key: 'to' },
  ],
};

const PICKLEBALL_SCHEMA: SportStatSchema = {
  sportDisplayName: 'PICKLEBALL',
  isTimed: false,
  formatSummary: (s: any, c?: any) => {
    const pts = s?.pts ?? c?.pts ?? 0;
    const win = s?.ast ?? c?.winners ?? 0;
    const dink = s?.reb ?? c?.dinks ?? 0;
    return `${pts} PTS • ${win} WINNERS • ${dink} DINKS`;
  },
  primaryActions: [
    { label: '+POINT', statKey: 'pts', delta: 1 },
    { label: '+WINNER', statKey: 'ast', delta: 1 },
    { label: '+DINK', statKey: 'reb', delta: 1 },
  ],
  multiPointOptions: [],
  secondaryActions: [
    { label: 'ACE (+1)', statKey: 'stl', delta: 1, icon: 'star-outline', color: '#38BDF8' },
    { label: 'VOLLEY (+1)', statKey: 'blk', delta: 1, icon: 'sparkles-outline', color: '#8B5CF6' },
    { label: 'FAULT (+1)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
    { label: 'UNFORCED ERR', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F97316' },
  ],
  actionCategories: [
    {
      name: 'ATTACKING & SCORING',
      icon: 'flash-outline',
      color: '#00D2FF',
      actions: [
        { label: '+1 POINT', statKey: 'pts', delta: 1, icon: 'radio-button-on-outline', color: '#00D2FF' },
        { label: '+1 WINNER', statKey: 'ast', delta: 1, icon: 'flash-outline', color: '#F59E0B' },
        { label: '+1 ACE', statKey: 'stl', delta: 1, icon: 'star-outline', color: '#38BDF8' },
        { label: '+1 VOLLEY', statKey: 'blk', delta: 1, icon: 'sparkles-outline', color: '#8B5CF6' },
      ],
    },
    {
      name: 'COURT CONTROL',
      icon: 'shield-outline',
      color: '#10B981',
      actions: [
        { label: '+1 DINK', statKey: 'reb', delta: 1, icon: 'shield-outline', color: '#10B981' },
      ],
    },
    {
      name: 'ERRORS & FAULTS',
      icon: 'warning-outline',
      color: '#EF4444',
      actions: [
        { label: '+1 FAULT', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: '+1 UNFORCED ERR', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F97316' },
      ],
    },
  ],
  tableHeaders: [
    { label: 'PTS', key: 'pts' },
    { label: 'WIN', key: 'ast' },
    { label: 'DINK', key: 'reb' },
    { label: 'VLY', key: 'blk' },
    { label: 'ACE', key: 'stl' },
    { label: 'FLT', key: 'pf' },
    { label: 'ERR', key: 'to' },
  ],
};

const BADMINTON_SCHEMA: SportStatSchema = {
  sportDisplayName: 'BADMINTON',
  isTimed: false,
  formatSummary: (s: any, c?: any) => {
    const pts = s?.pts ?? c?.pts ?? 0;
    const smash = s?.ast ?? c?.smash ?? 0;
    const drops = s?.reb ?? c?.drops ?? 0;
    return `${pts} PTS • ${smash} SMASH • ${drops} DROPS`;
  },
  primaryActions: [
    { label: '+POINT', statKey: 'pts', delta: 1 },
    { label: '+SMASH', statKey: 'ast', delta: 1 },
    { label: '+DROP', statKey: 'reb', delta: 1 },
  ],
  multiPointOptions: [],
  secondaryActions: [
    { label: 'ACE (+1)', statKey: 'stl', delta: 1, icon: 'star-outline', color: '#38BDF8' },
    { label: 'NET PLAY (+1)', statKey: 'blk', delta: 1, icon: 'grid-outline', color: '#8B5CF6' },
    { label: 'FAULT (+1)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
    { label: 'UNFORCED ERR', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F97316' },
  ],
  actionCategories: [
    {
      name: 'ATTACKING & SCORING',
      icon: 'flash-outline',
      color: '#00D2FF',
      actions: [
        { label: '+1 POINT', statKey: 'pts', delta: 1, icon: 'radio-button-on-outline', color: '#00D2FF' },
        { label: '+1 SMASH', statKey: 'ast', delta: 1, icon: 'flash-outline', color: '#F59E0B' },
        { label: '+1 ACE', statKey: 'stl', delta: 1, icon: 'star-outline', color: '#38BDF8' },
      ],
    },
    {
      name: 'NET & COURT CONTROL',
      icon: 'shield-outline',
      color: '#10B981',
      actions: [
        { label: '+1 DROP SHOT', statKey: 'reb', delta: 1, icon: 'shield-outline', color: '#10B981' },
        { label: '+1 NET PLAY', statKey: 'blk', delta: 1, icon: 'grid-outline', color: '#8B5CF6' },
      ],
    },
    {
      name: 'ERRORS & FAULTS',
      icon: 'warning-outline',
      color: '#EF4444',
      actions: [
        { label: '+1 SERVICE FAULT', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: '+1 UNFORCED ERR', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F97316' },
      ],
    },
  ],
  tableHeaders: [
    { label: 'PTS', key: 'pts' },
    { label: 'SMASH', key: 'ast' },
    { label: 'DROP', key: 'reb' },
    { label: 'NET', key: 'blk' },
    { label: 'ACE', key: 'stl' },
    { label: 'FLT', key: 'pf' },
    { label: 'ERR', key: 'to' },
  ],
};

const SWIMMING_SCHEMA: SportStatSchema = {
  sportDisplayName: 'SWIMMING',
  isTimed: true,
  formatSummary: (s: any, c?: any) => {
    const time = s?.finish_time ?? s?.time ?? c?.finish_time ?? c?.time ?? '--';
    const pts = s?.pts ?? s?.points ?? c?.pts ?? c?.points ?? 0;
    return `${time} • ${pts} PTS`;
  },
  primaryActions: [
    { label: '+POINT', statKey: 'pts', delta: 1 },
    { label: '-POINT', statKey: 'pts', delta: -1 },
  ],
  multiPointOptions: [],
  secondaryActions: [
    { label: 'DQ / FAULT (+1)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
    { label: 'FALSE START (+1)', statKey: 'to', delta: 1, icon: 'alert-circle-outline', color: '#F97316' },
  ],
  actionCategories: [
    {
      name: 'RACE METRICS',
      icon: 'water-outline',
      color: '#00D2FF',
      actions: [
        { label: '+1 POINT', statKey: 'pts', delta: 1, icon: 'add-circle-outline', color: '#00D2FF' },
        { label: '-1 POINT', statKey: 'pts', delta: -1, icon: 'remove-circle-outline', color: '#94A3B8' },
      ],
    },
    {
      name: 'INFRACTIONS & FAULTS',
      icon: 'warning-outline',
      color: '#EF4444',
      actions: [
        { label: '+1 DQ / FAULT', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: '+1 FALSE START', statKey: 'to', delta: 1, icon: 'alert-circle-outline', color: '#F97316' },
      ],
    },
  ],
  tableHeaders: [
    { label: 'FINISH TIME', shortLabel: 'FINISH TIME', key: 'finish_time', width: 115 },
    { label: 'SEED TIME', shortLabel: 'SEED TIME', key: 'seed_time', width: 105 },
    { label: 'POINTS', shortLabel: 'POINTS', key: 'pts', width: 80 },
    { label: 'PLACE', shortLabel: 'PLACE', key: 'rank', width: 70 },
  ],
};

const TRACK_FIELD_SCHEMA: SportStatSchema = {
  sportDisplayName: 'TRACK & FIELD',
  isTimed: true,
  formatSummary: (s: any, c?: any) => {
    const att = s?.reb ?? c?.attempts ?? 0;
    const splits = s?.ast ?? c?.splits ?? 0;
    return `${att} ATTEMPTS • ${splits} SPLITS`;
  },
  primaryActions: [
    { label: '+ATTEMPT', statKey: 'reb', delta: 1 },
    { label: '+SPLIT', statKey: 'ast', delta: 1 },
    { label: '+CLEAR', statKey: 'stl', delta: 1 },
  ],
  multiPointOptions: [],
  secondaryActions: [
    { label: 'CLEAR (+1)', statKey: 'stl', delta: 1, icon: 'checkmark-circle-outline', color: '#10B981' },
    { label: 'FOUL (+1)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
    { label: 'FAILED ATTEMPT', statKey: 'to', delta: 1, icon: 'close-circle-outline', color: '#F97316' },
  ],
  actionCategories: [
    {
      name: 'ATTEMPTS & EXECUTION',
      icon: 'speedometer-outline',
      color: '#00D2FF',
      actions: [
        { label: '+1 ATTEMPT', statKey: 'reb', delta: 1, icon: 'add-circle-outline', color: '#00D2FF' },
        { label: '+1 SPLIT', statKey: 'ast', delta: 1, icon: 'timer-outline', color: '#38BDF8' },
        { label: '+1 CLEAR / MARK', statKey: 'stl', delta: 1, icon: 'checkmark-circle-outline', color: '#10B981' },
      ],
    },
    {
      name: 'FOULS & FAILS',
      icon: 'warning-outline',
      color: '#EF4444',
      actions: [
        { label: '+1 FOUL / FAULT', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: '+1 FAILED ATTEMPT', statKey: 'to', delta: 1, icon: 'close-circle-outline', color: '#F97316' },
      ],
    },
  ],
  tableHeaders: [
    { label: 'ATT', key: 'reb' },
    { label: 'SPLITS', key: 'ast' },
    { label: 'CLR', key: 'stl' },
    { label: 'FLT', key: 'pf' },
    { label: 'FAILS', key: 'to' },
  ],
};

/**
 * Build dynamic UI schema from a Firestore Sports_Configurations document,
 * filtering out useless/formula stats and grouping into clean categories.
 */
export function buildSportStatSchemaFromConfig(sportConfig: any): SportStatSchema {
  const sportName = String(sportConfig.sport_name || sportConfig.name || "SPORT").toUpperCase().trim();

  // Route known standard sports to their curated schemas immediately
  if (sportName.includes('BASKET')) return BASKETBALL_SCHEMA;
  if (sportName.includes('VOLLEY')) return VOLLEYBALL_SCHEMA;
  if (sportName.includes('SOCCER') || sportName.includes('FOOTBALL')) return SOCCER_SCHEMA;
  if (sportName.includes('PICKLE')) return PICKLEBALL_SCHEMA;
  if (sportName.includes('BADMINTON')) return BADMINTON_SCHEMA;
  if (sportName.includes('SWIM')) return SWIMMING_SCHEMA;
  if (sportName.includes('TRACK') || sportName.includes('FIELD') || sportName.includes('RUN')) return TRACK_FIELD_SCHEMA;

  const rawStats: any[] = Array.isArray(sportConfig.configurable_stats)
    ? sportConfig.configurable_stats
    : Array.isArray(sportConfig.metric_keys)
    ? sportConfig.metric_keys
    : [];

  // Filter out useless attempt and formula stats
  const configurableStats = rawStats.filter((stat: any) => {
    const rawKey = String(stat.stat_name_key || stat.key || "").toLowerCase().trim();
    if (USELESS_STAT_KEYS.has(rawKey)) return false;
    if (stat.measurement_category === "Percentage") return false;
    if (stat.formula) return false;
    return true;
  });

  const isTimed = Boolean(
    sportConfig.is_timed_sport ||
    String(sportConfig.category || "").toLowerCase().includes("timed") ||
    configurableStats.some((s: any) => s.measurement_category === "Time (ms)")
  );

  const ACTION_ICONS = [
    "flash-outline",
    "star-outline",
    "shield-outline",
    "share-outline",
    "warning-outline",
    "refresh-outline",
    "heart-outline",
    "speedometer-outline",
  ];

  const ACTION_COLORS = [
    "#00D2FF",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EC4899",
    "#3B82F6",
    "#EF4444",
    "#14B8A6",
  ];

  const tableHeaders: SportStatHeader[] = configurableStats.map((stat: any) => {
    const rawKey = String(stat.stat_name_key || stat.key || "").trim();
    const label = String(stat.label || rawKey.replace(/_/g, " ")).toUpperCase();
    return {
      label,
      key: rawKey,
    };
  });

  const primaryActions: SportStatAction[] = configurableStats.slice(0, 3).map((stat: any) => {
    const rawKey = String(stat.stat_name_key || stat.key || "").trim();
    let label = String(stat.label || rawKey.replace(/_/g, " ")).toUpperCase();
    if (label.length > 8) {
      label = label.split(' ')[0] || label.slice(0, 8);
    }
    return {
      label: `+${label}`,
      statKey: rawKey,
      delta: 1,
    };
  });

  const secondaryActions: SportStatAction[] = configurableStats.slice(3).map((stat: any, idx: number) => {
    const rawKey = String(stat.stat_name_key || stat.key || "").trim();
    const cleanLabel = String(stat.label || rawKey.replace(/_/g, " ")).toUpperCase();
    return {
      label: `${cleanLabel} (+1)`,
      statKey: rawKey,
      delta: 1,
      icon: ACTION_ICONS[idx % ACTION_ICONS.length],
      color: ACTION_COLORS[idx % ACTION_COLORS.length],
    };
  });

  const formatSummary = (stats: any, customStats?: any) => {
    if (!stats && !customStats) return "0 STATS";
    const primaryItems = configurableStats.slice(0, 3).map((s: any) => {
      const k = String(s.stat_name_key || s.key || "");
      const val = stats?.[k] ?? stats?.[k.toLowerCase()] ?? customStats?.[k] ?? 0;
      let lbl = String(s.label || k.replace(/_/g, " ")).toUpperCase();
      if (lbl.length > 6) {
        lbl = lbl.split(' ')[0] || lbl.slice(0, 6);
      }
      return `${val} ${lbl}`;
    });
    return primaryItems.length > 0 ? primaryItems.join(" • ") : "0 STATS";
  };

  const actionCategories: SportStatCategoryGroup[] = [
    {
      name: 'SCORING & PRIMARY ACTIONS',
      icon: 'flash-outline',
      color: '#00D2FF',
      actions: primaryActions,
    },
  ];

  if (secondaryActions.length > 0) {
    actionCategories.push({
      name: 'ADDITIONAL STATS',
      icon: 'shield-outline',
      color: '#10B981',
      actions: secondaryActions,
    });
  }

  return {
    sportDisplayName: sportName,
    isTimed,
    formatSummary,
    primaryActions: primaryActions.length > 0 ? primaryActions : [
      { label: "+1 PT", statKey: "pts", delta: 1 },
      { label: "+1 AST", statKey: "ast", delta: 1 },
      { label: "+1 REB", statKey: "reb", delta: 1 },
    ],
    secondaryActions,
    actionCategories,
    multiPointOptions: [],
    tableHeaders: tableHeaders.length > 0 ? tableHeaders : [
      { label: "PTS", key: "pts" },
      { label: "AST", key: "ast" },
      { label: "REB", key: "reb" },
    ],
    configurable_stats: configurableStats,
  };
}

export function getSportStatSchema(rawSport: string = 'BASKETBALL', customConfigs?: any[]): SportStatSchema {
  const sport = (rawSport || 'BASKETBALL').toUpperCase().trim();

  // Check known standard sports first
  if (sport.includes('BASKET')) return BASKETBALL_SCHEMA;
  if (sport.includes('VOLLEY')) return VOLLEYBALL_SCHEMA;
  if (sport.includes('SOCCER') || sport.includes('FOOTBALL')) return SOCCER_SCHEMA;
  if (sport.includes('PICKLE')) return PICKLEBALL_SCHEMA;
  if (sport.includes('BADMINTON')) return BADMINTON_SCHEMA;
  if (sport.includes('SWIM')) return SWIMMING_SCHEMA;
  if (sport.includes('TRACK') || sport.includes('FIELD') || sport.includes('RUN')) return TRACK_FIELD_SCHEMA;

  const configsToSearch = (Array.isArray(customConfigs) && customConfigs.length > 0)
    ? customConfigs
    : cachedDynamicConfigs;

  // Check dynamic custom sport from Firestore
  if (configsToSearch.length > 0) {
    const matched = configsToSearch.find((c: any) => {
      const cName = String(c.sport_name || c.name || "").toUpperCase().trim();
      const cId = String(c.sport_id || c.id || "").toUpperCase().trim();
      const cShort = String(c.short_identifier || "").toUpperCase().trim();
      return (
        cName === sport ||
        cId === sport ||
        (cShort.length > 0 && cShort === sport) ||
        sport.includes(cName) ||
        (cName.length > 0 && cName.includes(sport))
      );
    });

    if (matched && Array.isArray(matched.configurable_stats) && matched.configurable_stats.length > 0) {
      return buildSportStatSchemaFromConfig(matched);
    }
  }

  // Fallback default
  return BASKETBALL_SCHEMA;
}

import { getSportsOfflineFirst } from "../../../../services/firebaseClient";

export interface SportStatAction {
  label: string;
  statKey: 'pts' | 'ast' | 'reb' | 'stl' | 'blk' | 'pf' | 'to' | string;
  delta: number;
  icon?: string;
  color?: string;
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
  formatSummary: (stats: any) => string;
  primaryActions: SportStatAction[];
  secondaryActions: SportStatAction[];
  multiPointOptions: SportStatAction[];
  tableHeaders: SportStatHeader[];
  configurable_stats?: any[];
}

let cachedDynamicConfigs: any[] = [];

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

/**
 * Build dynamic UI schema from a Firestore Sports_Configurations document.
 */
export function buildSportStatSchemaFromConfig(sportConfig: any): SportStatSchema {
  const sportName = String(sportConfig.sport_name || sportConfig.name || "SPORT").toUpperCase();
  const configurableStats: any[] = Array.isArray(sportConfig.configurable_stats)
    ? sportConfig.configurable_stats
    : Array.isArray(sportConfig.metric_keys)
    ? sportConfig.metric_keys
    : [];

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
    const cleanLabel = String(stat.label || rawKey.replace(/_/g, " ")).toUpperCase().slice(0, 6);
    return {
      label: `+${cleanLabel}`,
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

  const formatSummary = (stats: any) => {
    if (!stats) return "NO STATS RECORDED";
    const primaryItems = configurableStats.slice(0, 3).map((s: any) => {
      const k = String(s.stat_name_key || s.key || "");
      const val = stats[k] ?? stats[k.toLowerCase()] ?? stats.pts ?? 0;
      const lbl = String(s.label || k.replace(/_/g, " ")).toUpperCase().slice(0, 5);
      return `${val} ${lbl}`;
    });
    return primaryItems.length > 0 ? primaryItems.join(" • ") : "0 STATS";
  };

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
  const sport = (rawSport || 'BASKETBALL').toUpperCase();
  const configsToSearch = (Array.isArray(customConfigs) && customConfigs.length > 0)
    ? customConfigs
    : cachedDynamicConfigs;

  // 1. Check if Firestore dynamic schema exists for this sport
  if (configsToSearch.length > 0) {
    const matched = configsToSearch.find((c: any) => {
      const cName = String(c.sport_name || c.name || "").toUpperCase();
      const cId = String(c.sport_id || c.id || "").toUpperCase();
      const cShort = String(c.short_identifier || "").toUpperCase();
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

  // 2. Built-in sport schema definitions
  if (sport.includes('VOLLEY')) {
    return {
      sportDisplayName: 'VOLLEYBALL',
      isTimed: false,
      formatSummary: (s) =>
        `${s.pts || 0} KILLS • ${s.ast || 0} ACES • ${s.blk || 0} BLKS • ${s.reb || 0} DIGS`,
      primaryActions: [
        { label: '+KILL', statKey: 'pts', delta: 1 },
        { label: '+ACE', statKey: 'ast', delta: 1 },
        { label: '+BLOCK', statKey: 'blk', delta: 1 },
      ],
      secondaryActions: [
        { label: 'DIG (+1 DIG)', statKey: 'reb', delta: 1, icon: 'shield-outline', color: '#10B981' },
        { label: 'ASSIST (+1 AST)', statKey: 'stl', delta: 1, icon: 'share-outline', color: '#00D2FF' },
        { label: 'FAULT (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: 'ATTACK ERR (+1 ERR)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F59E0B' },
      ],
      multiPointOptions: [],
      tableHeaders: [
        { label: 'KILLS', key: 'pts' },
        { label: 'ACES', key: 'ast' },
        { label: 'BLKS', key: 'blk' },
        { label: 'DIGS', key: 'reb' },
        { label: 'FLTS', key: 'pf' },
        { label: 'ERRS', key: 'to' },
      ],
    };
  }

  if (sport.includes('PICKLE')) {
    return {
      sportDisplayName: 'PICKLEBALL',
      isTimed: false,
      formatSummary: (s) =>
        `${s.pts || 0} PTS • ${s.ast || 0} WINNERS • ${s.reb || 0} DINKS`,
      primaryActions: [
        { label: '+PT', statKey: 'pts', delta: 1 },
        { label: '+WINNER', statKey: 'ast', delta: 1 },
        { label: '+DINK', statKey: 'reb', delta: 1 },
      ],
      secondaryActions: [
        { label: 'FAULT (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: 'UNFORCED ERR (+1 ERR)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F59E0B' },
        { label: 'VOLLEY (+1 VLY)', statKey: 'blk', delta: 1, icon: 'flash-outline', color: '#00D2FF' },
        { label: 'ACE (+1 ACE)', statKey: 'stl', delta: 1, icon: 'star-outline', color: '#10B981' },
      ],
      multiPointOptions: [],
      tableHeaders: [
        { label: 'PTS', key: 'pts' },
        { label: 'WINNERS', key: 'ast' },
        { label: 'DINKS', key: 'reb' },
        { label: 'VOLLEYS', key: 'blk' },
        { label: 'FAULTS', key: 'pf' },
        { label: 'ERRORS', key: 'to' },
      ],
    };
  }

  if (sport.includes('SWIM')) {
    return {
      sportDisplayName: 'SWIMMING',
      isTimed: true,
      formatSummary: (s) =>
        `${s.pts || 0} PTS • ${s.ast || 0} SPLITS • ${s.reb || 0} LAPS`,
      primaryActions: [
        { label: '+POINT', statKey: 'pts', delta: 1 },
        { label: '+SPLIT', statKey: 'ast', delta: 1 },
        { label: '+LAP', statKey: 'reb', delta: 1 },
      ],
      secondaryActions: [
        { label: 'STROKE (+1 STR)', statKey: 'stl', delta: 1, icon: 'water-outline', color: '#00D2FF' },
        { label: 'TURN (+1 TRN)', statKey: 'blk', delta: 1, icon: 'repeat-outline', color: '#10B981' },
        { label: 'DQ / FAULT (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: 'FALSE START (+1 ERR)', statKey: 'to', delta: 1, icon: 'alert-circle-outline', color: '#F59E0B' },
      ],
      multiPointOptions: [],
      tableHeaders: [
        { label: 'PTS', key: 'pts' },
        { label: 'SPLITS', key: 'ast' },
        { label: 'LAPS', key: 'reb' },
        { label: 'STR', key: 'stl' },
        { label: 'TRN', key: 'blk' },
        { label: 'FLT', key: 'pf' },
        { label: 'ERR', key: 'to' },
      ],
    };
  }

  if (sport.includes('TRACK') || sport.includes('FIELD') || sport.includes('RUN')) {
    return {
      sportDisplayName: 'TRACK & FIELD',
      isTimed: true,
      formatSummary: (s) =>
        `${s.pts || 0} PTS • ${s.ast || 0} SPLITS • ${s.reb || 0} ATTEMPTS`,
      primaryActions: [
        { label: '+POINT', statKey: 'pts', delta: 1 },
        { label: '+SPLIT', statKey: 'ast', delta: 1 },
        { label: '+ATTEMPT', statKey: 'reb', delta: 1 },
      ],
      secondaryActions: [
        { label: 'CLEAR (+1 CLR)', statKey: 'stl', delta: 1, icon: 'checkmark-circle-outline', color: '#10B981' },
        { label: 'PACE (+1 PACE)', statKey: 'blk', delta: 1, icon: 'speedometer-outline', color: '#00D2FF' },
        { label: 'FOUL (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: 'FAILED ATTEMPT', statKey: 'to', delta: 1, icon: 'close-circle-outline', color: '#F59E0B' },
      ],
      multiPointOptions: [],
      tableHeaders: [
        { label: 'PTS', key: 'pts' },
        { label: 'SPLITS', key: 'ast' },
        { label: 'ATT', key: 'reb' },
        { label: 'CLR', key: 'stl' },
        { label: 'PACE', key: 'blk' },
        { label: 'FLTS', key: 'pf' },
        { label: 'FAILS', key: 'to' },
      ],
    };
  }

  if (sport.includes('BADMINTON')) {
    return {
      sportDisplayName: 'BADMINTON',
      isTimed: false,
      formatSummary: (s) =>
        `${s.pts || 0} PTS • ${s.ast || 0} SMASHES • ${s.reb || 0} DROPS`,
      primaryActions: [
        { label: '+PT', statKey: 'pts', delta: 1 },
        { label: '+SMASH', statKey: 'ast', delta: 1 },
        { label: '+DROP', statKey: 'reb', delta: 1 },
      ],
      secondaryActions: [
        { label: 'NET PLAY (+1 NET)', statKey: 'blk', delta: 1, icon: 'grid-outline', color: '#00D2FF' },
        { label: 'ACE (+1 ACE)', statKey: 'stl', delta: 1, icon: 'star-outline', color: '#10B981' },
        { label: 'FAULT (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: 'UNFORCED ERR (+1 ERR)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F59E0B' },
      ],
      multiPointOptions: [],
      tableHeaders: [
        { label: 'PTS', key: 'pts' },
        { label: 'SMASH', key: 'ast' },
        { label: 'DROPS', key: 'reb' },
        { label: 'NET', key: 'blk' },
        { label: 'ACES', key: 'stl' },
        { label: 'FLTS', key: 'pf' },
        { label: 'ERRS', key: 'to' },
      ],
    };
  }

  if (sport.includes('SOCCER') || sport.includes('FOOTBALL')) {
    return {
      sportDisplayName: 'SOCCER',
      isTimed: true,
      formatSummary: (s) =>
        `${s.pts || 0} GOALS • ${s.ast || 0} AST • ${s.reb || 0} SAVES`,
      primaryActions: [
        { label: '+GOAL', statKey: 'pts', delta: 1 },
        { label: '+AST', statKey: 'ast', delta: 1 },
        { label: '+SAVE', statKey: 'reb', delta: 1 },
      ],
      secondaryActions: [
        { label: 'TACKLE (+1 TCK)', statKey: 'stl', delta: 1, icon: 'shield-outline', color: '#10B981' },
        { label: 'BLOCK (+1 BLK)', statKey: 'blk', delta: 1, icon: 'shield-checkmark-outline', color: '#00D2FF' },
        { label: 'FOUL (+1 FLT)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
        { label: 'OFFSIDE / TO', statKey: 'to', delta: 1, icon: 'flag-outline', color: '#F59E0B' },
      ],
      multiPointOptions: [],
      tableHeaders: [
        { label: 'GOALS', key: 'pts' },
        { label: 'AST', key: 'ast' },
        { label: 'SAVES', key: 'reb' },
        { label: 'TCK', key: 'stl' },
        { label: 'BLKS', key: 'blk' },
        { label: 'FOULS', key: 'pf' },
        { label: 'TO', key: 'to' },
      ],
    };
  }

  // Default Basketball schema
  return {
    sportDisplayName: sport || 'BASKETBALL',
    isTimed: false,
    formatSummary: (s) =>
      `${s.pts || 0} PTS • ${s.ast || 0} AST • ${s.reb || 0} REB`,
    primaryActions: [
      { label: '+PTS', statKey: 'pts', delta: 1 },
      { label: '+AST', statKey: 'ast', delta: 1 },
      { label: '+REB', statKey: 'reb', delta: 1 },
    ],
    secondaryActions: [
      { label: 'FOUL (+1 PF)', statKey: 'pf', delta: 1, icon: 'warning-outline', color: '#EF4444' },
      { label: 'TURNOVER (+1 TO)', statKey: 'to', delta: 1, icon: 'refresh-outline', color: '#F59E0B' },
      { label: 'STEAL (+1 STL)', statKey: 'stl', delta: 1, icon: 'hand-left-outline', color: '#10B981' },
      { label: 'BLOCK (+1 BLK)', statKey: 'blk', delta: 1, icon: 'shield-checkmark-outline', color: '#00D2FF' },
    ],
    multiPointOptions: [
      { label: '+2 PTS (FG)', statKey: 'pts', delta: 2 },
      { label: '+3 PTS (3PT)', statKey: 'pts', delta: 3 },
    ],
    tableHeaders: [
      { label: 'PTS', key: 'pts' },
      { label: 'REB', key: 'reb' },
      { label: 'AST', key: 'ast' },
      { label: 'STL', key: 'stl' },
      { label: 'BLK', key: 'blk' },
      { label: 'PF', key: 'pf' },
      { label: 'TO', key: 'to' },
    ],
  };
}

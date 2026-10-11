import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Save,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Trophy,
  Layers,
} from 'lucide-react';
import type { RawOCRDetectedData, DetectedAthleteStat, SportConfiguration } from '../../api/types';
import { submitVerifiedMatch, getSports } from '../../api/client';
import { INITIAL_DEFAULT_SPORTS } from '../../SysAdmin/Sports_Management/SportPage';
import { styles } from './styles/OCROutputView';

interface OCROutputViewProps {
  rawOCRData: RawOCRDetectedData;
  onBack: () => void;
  onSaveSuccess: () => void;
}

export interface DynamicColumn {
  key: string;
  label: string;
  isNumeric: boolean;
}

// Common aliases map for mapping between admin stat schema keys and OCR extracted keys
const STAT_ALIAS_MAP: Record<string, string[]> = {
  finish_time_ms: ['finish_time', 'time', 'result_time', 'mark_time_ms', 'mark_time'],
  finish_time: ['finish_time_ms', 'time', 'result_time', 'mark_time_ms'],
  time: ['finish_time', 'finish_time_ms', 'result_time'],
  split_times_ms: ['split', 'split_time', 'split_1', 'lap_splits'],
  split: ['split_times_ms', 'split_time', 'split_1', 'lap_splits'],
  lap_splits: ['split', 'split_times_ms', 'split_time'],
  points: ['pts'],
  pts: ['points'],
  assists: ['ast'],
  ast: ['assists'],
  rebounds: ['reb', 'total_rebounds'],
  reb: ['rebounds', 'total_rebounds'],
  steals: ['stl'],
  stl: ['steals'],
  blocks: ['blk', 'block_points'],
  blk: ['blocks', 'block_points'],
  turnovers: ['to'],
  to: ['turnovers'],
  distance_meters: ['distance_m', 'distance', 'mark_distance_m'],
  distance_m: ['distance_meters', 'distance', 'mark_distance_m'],
  mark_distance_m: ['distance_m', 'distance_meters', 'distance'],
  mark_time_ms: ['finish_time', 'time', 'finish_time_ms'],
  stroke_rate: ['stroke_count', 'strokes', 'cadence', 'stroke_cadence'],
  stroke_count: ['stroke_rate', 'strokes', 'cadence', 'stroke_cadence'],
  stroke_cadence: ['stroke_rate', 'stroke_count', 'cadence'],
  lap_count: ['laps', 'lap_splits'],
  heat_number: ['heat'],
  heat: ['heat_number'],
  lane_number: ['lane'],
  lane: ['lane_number'],
  reaction_time_ms: ['reaction_sec', 'reaction_time_s', 'reaction_time'],
  reaction_sec: ['reaction_time_ms', 'reaction_time_s'],
  third_shot_drops: ['third_shot', 'third_shots'],
  unforced_errors: ['unforced_err', 'errors'],
  winners: ['smash_winners', 'forehand_winners', 'backhand_winners'],
};

// Helper to look up an athlete metric value by key or alias
const getAthleteStatValue = (a: DetectedAthleteStat, key: string): any => {
  if (a[key] !== undefined && a[key] !== null && a[key] !== '') return a[key];
  if (a.stats && a.stats[key] !== undefined && a.stats[key] !== null && a.stats[key] !== '') return a.stats[key];

  const aliases = STAT_ALIAS_MAP[key] || [];
  for (const alt of aliases) {
    if (a[alt] !== undefined && a[alt] !== null && a[alt] !== '') return a[alt];
    if (a.stats && a.stats[alt] !== undefined && a.stats[alt] !== null && a.stats[alt] !== '') return a.stats[alt];
  }

  return '';
};

// Helper to ensure each athlete row has a distinct row_uid (Scenario 1 Disambiguation)
const ensureAthleteRowUids = (athletes: DetectedAthleteStat[]): DetectedAthleteStat[] => {
  return athletes.map((a, idx) => {
    const rawEvt = a.event || a.discipline || (a.stats?.event) || '';
    const cleanEvt = rawEvt ? String(rawEvt).trim().toLowerCase().replace(/[^a-z0-9]/g, '_') : 'event';
    const baseId = a.athlete_id || `ath_${idx + 1}`;
    const rowUid = a.row_uid || `${baseId}_${cleanEvt}_${idx + 1}`;
    const eventId = a.event_id || (rawEvt ? `EVT-${cleanEvt.toUpperCase()}` : undefined);

    const safeStats = {
      ...(typeof a.stats === 'object' && a.stats !== null ? a.stats : {}),
      event: rawEvt,
      event_id: eventId,
    };

    return {
      ...a,
      athlete_id: baseId,
      row_uid: rowUid,
      event: rawEvt,
      event_id: eventId,
      stats: safeStats,
    };
  });
};

export const OCROutputView: React.FC<OCROutputViewProps> = ({
  rawOCRData,
  onBack,
  onSaveSuccess,
}) => {
  // Determine list of matches (batch vs single)
  const matchesList = useMemo(() => {
    if (rawOCRData.batch_matches && rawOCRData.batch_matches.length > 0) {
      return rawOCRData.batch_matches;
    }
    return [rawOCRData];
  }, [rawOCRData]);

  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const [savedMatches, setSavedMatches] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dynamic Sports Configurations fetched from Backend Admin API
  const [configuredSports, setConfiguredSports] = useState<SportConfiguration[]>(() => INITIAL_DEFAULT_SPORTS);

  useEffect(() => {
    let mounted = true;
    getSports()
      .then((res) => {
        if (mounted && res && Array.isArray(res.sports) && res.sports.length > 0) {
          setConfiguredSports(res.sports);
        }
      })
      .catch(() => {
        // Fallback to INITIAL_DEFAULT_SPORTS
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Per-match athlete state dictionary with guaranteed row_uid disambiguation
  const [athleteStatsMap, setAthleteStatsMap] = useState<Record<number, DetectedAthleteStat[]>>(() => {
    const initial: Record<number, DetectedAthleteStat[]> = {};
    const list = (rawOCRData.batch_matches && rawOCRData.batch_matches.length > 0)
      ? rawOCRData.batch_matches
      : [rawOCRData];
    list.forEach((m, idx) => {
      initial[idx] = ensureAthleteRowUids(m.athlete_overview || []);
    });
    return initial;
  });

  const currentMatch = matchesList[activeMatchIndex] || rawOCRData;
  const athleteStats = athleteStatsMap[activeMatchIndex] || [];

  // Helper to update athlete stats for active match using row_uid
  const updateActiveAthleteStats = (
    updater: (prev: DetectedAthleteStat[]) => DetectedAthleteStat[]
  ) => {
    setAthleteStatsMap((prev) => ({
      ...prev,
      [activeMatchIndex]: updater(prev[activeMatchIndex] || []),
    }));
  };

  // Sport type identification
  const sportType = (currentMatch.sport_type || 'BASKETBALL').trim().toUpperCase();
  const isVolleyball = sportType.includes('VOLLEY');
  const isSoccer = sportType.includes('SOCCER') || sportType.includes('FOOTBALL');
  const isIndividual =
    sportType.includes('SWIM') ||
    sportType.includes('RUN') ||
    sportType.includes('TRACK') ||
    sportType.includes('ATHLETIC') ||
    sportType.includes('TIME');
  const isBasketball = !isVolleyball && !isSoccer && !isIndividual;

  // Match configured sport schema from admin /sports API
  const activeSportConfig = useMemo<SportConfiguration | null>(() => {
    const norm = sportType.trim().toUpperCase();
    const exact = configuredSports.find(
      (s) =>
        s.sport_name.trim().toUpperCase() === norm ||
        s.short_identifier.trim().toUpperCase() === norm ||
        norm.includes(s.sport_name.trim().toUpperCase()) ||
        s.sport_name.trim().toUpperCase().includes(norm)
    );
    if (exact) return exact;

    const fallback = INITIAL_DEFAULT_SPORTS.find(
      (s) =>
        s.sport_name.trim().toUpperCase() === norm ||
        s.short_identifier.trim().toUpperCase() === norm ||
        norm.includes(s.sport_name.trim().toUpperCase()) ||
        s.sport_name.trim().toUpperCase().includes(norm)
    );
    return fallback || null;
  }, [configuredSports, sportType]);

  // Dynamically resolve table columns based on admin sport schema + detected metrics
  const dynamicColumns = useMemo<DynamicColumn[]>(() => {
    const cols: DynamicColumn[] = [];
    const addedKeys = new Set<string>();

    // 1. If admin configured stats exist for this sport, use them
    if (activeSportConfig && Array.isArray(activeSportConfig.configurable_stats) && activeSportConfig.configurable_stats.length > 0) {
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
          });
        }
      });
    }

    // 2. Default presets
    if (cols.length === 0) {
      if (isBasketball) {
        [
          { key: 'pts', label: 'PTS', isNumeric: true },
          { key: 'ast', label: 'AST', isNumeric: true },
          { key: 'to', label: 'TO', isNumeric: true },
          { key: 'reb', label: 'REB', isNumeric: true },
          { key: 'stl', label: 'STL', isNumeric: true },
          { key: 'blk', label: 'BLK', isNumeric: true },
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
        ].forEach((c) => {
          addedKeys.add(c.key);
          cols.push(c);
        });
      } else if (isSoccer) {
        [
          { key: 'goals', label: 'GOALS', isNumeric: true },
          { key: 'shots', label: 'SHOTS', isNumeric: true },
          { key: 'shots_on_target', label: 'SOT', isNumeric: true },
          { key: 'saves', label: 'SAVES', isNumeric: true },
          { key: 'tackles', label: 'TACKLES', isNumeric: true },
          { key: 'min', label: 'MIN', isNumeric: true },
        ].forEach((c) => {
          addedKeys.add(c.key);
          cols.push(c);
        });
      } else if (isIndividual) {
        [
          { key: 'split', label: 'SPLIT', isNumeric: false },
          { key: 'time', label: 'TIME', isNumeric: false },
          { key: 'finish_time', label: 'FINISH TIME', isNumeric: false },
        ].forEach((c) => {
          addedKeys.add(c.key);
          cols.push(c);
        });
      }
    }

    // 3. Dynamic Discovery: Inspect athlete records for any custom stats detected on scoresheet
    const SYSTEM_KEYS = new Set([
      'athlete_id', 'row_uid', 'player_name', 'team_name', 'jersey_number', 'position',
      'event', 'event_id', 'heat', 'lane', 'rank', 'placement_rank', 'stats', 'sport_stats',
      'calculated_efficiency', 'calculated_player_efficiency', 'true_shooting_pct',
      'fg_made', 'fg_attempted', 'ft_made', 'ft_attempted', 'three_made', 'three_attempted',
      'offensive_rebounds', 'defensive_rebounds', 'result_time',
    ]);

    athleteStats.forEach((a) => {
      Object.keys(a).forEach((k) => {
        if (!SYSTEM_KEYS.has(k) && !addedKeys.has(k)) {
          const val = (a as any)[k];
          if (val !== undefined && val !== null && val !== '') {
            addedKeys.add(k);
            const isNum = typeof val === 'number';
            cols.push({
              key: k,
              label: k.replace(/_/g, ' ').toUpperCase(),
              isNumeric: isNum,
            });
          }
        }
      });

      if (a.stats && typeof a.stats === 'object') {
        const statsObj = a.stats as Record<string, any>;
        Object.keys(statsObj).forEach((k) => {
          if (!SYSTEM_KEYS.has(k) && !addedKeys.has(k)) {
            const val = statsObj[k];
            if (val !== undefined && val !== null && val !== '') {
              addedKeys.add(k);
              const isNum = typeof val === 'number';
              cols.push({
                key: k,
                label: k.replace(/_/g, ' ').toUpperCase(),
                isNumeric: isNum,
              });
            }
          }
        });
      }
    });

    return cols;
  }, [activeSportConfig, isBasketball, isVolleyball, isSoccer, isIndividual, athleteStats]);

  // Teams list for active match
  const teamList = useMemo(() => {
    const set = new Set<string>();
    if (currentMatch.teams && Array.isArray(currentMatch.teams)) {
      currentMatch.teams.forEach((t) => set.add(String(t).trim().toUpperCase()));
    }
    if (currentMatch.team_scores && Array.isArray(currentMatch.team_scores)) {
      currentMatch.team_scores.forEach((t) => set.add(String(t.team).trim().toUpperCase()));
    }
    if (currentMatch.team_name) set.add(String(currentMatch.team_name).trim().toUpperCase());
    if (currentMatch.opponent_team_name) set.add(String(currentMatch.opponent_team_name).trim().toUpperCase());
    athleteStats.forEach((a) => {
      if (a.team_name) set.add(String(a.team_name).trim().toUpperCase());
    });
    return Array.from(set).filter((t) => t.length > 0);
  }, [currentMatch, athleteStats]);

  // Filtered athletes based on active tab
  const visibleAthletes = useMemo(() => {
    if (selectedTeamFilter === 'ALL') return athleteStats;
    return athleteStats.filter(
      (a) => (a.team_name || '').toUpperCase() === selectedTeamFilter.toUpperCase()
    );
  }, [athleteStats, selectedTeamFilter]);

  // Dynamic Totals across all numeric columns
  const columnTotals = useMemo(() => {
    const totalsMap: Record<string, number> = {};
    dynamicColumns.forEach((col) => {
      if (col.isNumeric) {
        totalsMap[col.key] = visibleAthletes.reduce((sum, a) => {
          const val = getAthleteStatValue(a, col.key);
          const num = typeof val === 'number' ? val : parseFloat(val);
          return sum + (isNaN(num) ? 0 : num);
        }, 0);
      }
    });
    return totalsMap;
  }, [dynamicColumns, visibleAthletes]);

  // Legacy Totals for predefined sports
  const totals = useMemo(() => {
    if (isBasketball) {
      return visibleAthletes.reduce(
        (acc, curr) => {
          acc.pts += curr.pts || curr.points || 0;
          acc.ast += curr.ast || curr.assists || 0;
          acc.to += curr.to || curr.turnovers || 0;
          acc.reb += curr.reb || curr.rebounds || 0;
          acc.stl += curr.stl || curr.steals || 0;
          acc.blk += curr.blk || curr.blocks || 0;
          acc.min += curr.min || curr.minutes || 0;
          return acc;
        },
        { pts: 0, ast: 0, to: 0, reb: 0, stl: 0, blk: 0, min: 0 }
      );
    }
    if (isVolleyball) {
      return visibleAthletes.reduce(
        (acc, curr) => {
          acc.kills += curr.kills || 0;
          acc.attack_errors += curr.attack_errors || 0;
          acc.attack_attempts += curr.attack_attempts || 0;
          acc.service_aces += curr.service_aces || 0;
          acc.digs += curr.digs || 0;
          acc.block_points += curr.block_points || 0;
          return acc;
        },
        { kills: 0, attack_errors: 0, attack_attempts: 0, service_aces: 0, digs: 0, block_points: 0 }
      );
    }
    if (isSoccer) {
      return visibleAthletes.reduce(
        (acc, curr) => {
          acc.goals += curr.goals || 0;
          acc.shots += curr.shots || 0;
          acc.shots_on_target += curr.shots_on_target || 0;
          acc.saves += curr.saves || 0;
          acc.tackles += curr.tackles || 0;
          return acc;
        },
        { goals: 0, shots: 0, shots_on_target: 0, saves: 0, tackles: 0 }
      );
    }
    return {};
  }, [visibleAthletes, isBasketball, isVolleyball, isSoccer]);

  // Stat Change Handler using row_uid (Scenario 1 Disambiguation & Scenario 2 In-Place Editing)
  const handleStatChange = (
    targetRowUid: string,
    field: string,
    value: string
  ) => {
    updateActiveAthleteStats((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((a) => (a.row_uid || a.athlete_id) === targetRowUid);
      if (idx === -1) return prev;

      const currentAthlete = { ...updated[idx] };
      const currentStats = { ...(currentAthlete.stats || {}) };

      const matchedCol = dynamicColumns.find((c) => c.key === field);
      const isStringField =
        field === 'fg_pct' ||
        field === 'hitting_pct' ||
        field === 'time' ||
        field === 'finish_time' ||
        field === 'split' ||
        field === 'event' ||
        field === 'event_id' ||
        field === 'position' ||
        field === 'player_name' ||
        field === 'team_name' ||
        (matchedCol && !matchedCol.isNumeric);

      let parsedVal: any = value;
      if (!isStringField) {
        const num = parseFloat(value);
        parsedVal = isNaN(num) ? 0 : num;
      }

      currentAthlete[field] = parsedVal;
      currentStats[field] = parsedVal;

      const aliases = STAT_ALIAS_MAP[field] || [];
      aliases.forEach((alt) => {
        currentAthlete[alt] = parsedVal;
        currentStats[alt] = parsedVal;
      });

      currentAthlete.stats = currentStats;
      updated[idx] = currentAthlete;
      return updated;
    });
  };

  // Toggle Athlete Team between Home and Away (targeted via row_uid)
  const handleToggleTeam = (targetRowUid: string) => {
    updateActiveAthleteStats((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((a) => (a.row_uid || a.athlete_id) === targetRowUid);
      if (idx === -1) return prev;
      const current = (updated[idx].team_name || '').toUpperCase();
      const home = (currentMatch.team_name || 'HOME').toUpperCase();
      const away = (currentMatch.opponent_team_name || 'AWAY').toUpperCase();
      const nextTeam = current === home ? away : home;
      updated[idx] = {
        ...updated[idx],
        team_name: nextTeam,
      };
      return updated;
    });
  };

  // Dynamic Scores for Home / Away Banner
  const homeTeamName = (currentMatch.team_name || 'HOME TEAM').toUpperCase();
  const awayTeamName = (currentMatch.opponent_team_name || 'AWAY TEAM').toUpperCase();

  const homeScore = useMemo(() => {
    const homePlayers = athleteStats.filter((a) => (a.team_name || '').toUpperCase() === homeTeamName);
    if (isBasketball) return homePlayers.reduce((s, a) => s + (a.pts || a.points || 0), 0);
    if (isVolleyball) {
      const scoreObj = (currentMatch.team_scores || []).find((t) => (t.team || '').toUpperCase() === homeTeamName);
      if (scoreObj && scoreObj.score !== undefined) return scoreObj.score;
      return homePlayers.reduce((s, a) => s + (a.kills || 0) + (a.service_aces || 0) + (a.block_points || 0), 0);
    }
    if (isSoccer) {
      const scoreObj = (currentMatch.team_scores || []).find((t) => (t.team || '').toUpperCase() === homeTeamName);
      if (scoreObj && scoreObj.score !== undefined) return scoreObj.score;
      return homePlayers.reduce((s, a) => s + (a.goals || 0), 0);
    }
    return homePlayers.length;
  }, [athleteStats, homeTeamName, isBasketball, isVolleyball, isSoccer, currentMatch]);

  const awayScore = useMemo(() => {
    const awayPlayers = athleteStats.filter((a) => (a.team_name || '').toUpperCase() === awayTeamName);
    if (isBasketball) return awayPlayers.reduce((s, a) => s + (a.pts || a.points || 0), 0);
    if (isVolleyball) {
      const scoreObj = (currentMatch.team_scores || []).find((t) => (t.team || '').toUpperCase() === awayTeamName);
      if (scoreObj && scoreObj.score !== undefined) return scoreObj.score;
      return awayPlayers.reduce((s, a) => s + (a.kills || 0) + (a.service_aces || 0) + (a.block_points || 0), 0);
    }
    if (isSoccer) {
      const scoreObj = (currentMatch.team_scores || []).find((t) => (t.team || '').toUpperCase() === awayTeamName);
      if (scoreObj && scoreObj.score !== undefined) return scoreObj.score;
      return awayPlayers.reduce((s, a) => s + (a.goals || 0), 0);
    }
    return awayPlayers.length;
  }, [athleteStats, awayTeamName, isBasketball, isVolleyball, isSoccer, currentMatch]);

  const dynamicResult = useMemo(() => {
    if (homeScore > awayScore) {
      return { homeBadge: 'WIN', awayBadge: 'LOSS', summary: `${homeTeamName} WINS`, finalScore: `${homeScore} - ${awayScore}` };
    }
    if (awayScore > homeScore) {
      return { homeBadge: 'LOSS', awayBadge: 'WIN', summary: `${awayTeamName} WINS`, finalScore: `${homeScore} - ${awayScore}` };
    }
    if (homeScore > 0 || awayScore > 0) {
      return { homeBadge: 'DRAW', awayBadge: 'DRAW', summary: 'TIED MATCH', finalScore: `${homeScore} - ${awayScore}` };
    }
    return { homeBadge: 'PENDING', awayBadge: 'PENDING', summary: 'Awaiting match data', finalScore: '0 - 0' };
  }, [homeScore, awayScore, homeTeamName, awayTeamName]);

  const scoreUnit = isVolleyball ? 'SETS' : isSoccer ? 'GOALS' : 'PTS';

  // Save / Commit verified match data to database (Scenario 2: dynamic schema without truncation)
  const handleSaveMatch = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const payload = {
        team_id: currentMatch.team_name || 'team_official',
        sport_type: sportType,
        match_name: `${homeTeamName} vs ${awayTeamName}`,
        match_type: 'Official Match',
        match_date: currentMatch.match_date || new Date().toISOString(),
        location: currentMatch.location || 'Tournament Arena',
        opponent_team_name: awayTeamName,
        game_result: dynamicResult.homeBadge,
        final_score: currentMatch.final_score || dynamicResult.finalScore,
        home_score: homeScore,
        away_score: awayScore,
        notes: `Official OCR Logged Match (${sportType} - ${homeTeamName}: ${homeScore} vs ${awayTeamName}: ${awayScore})`,
        player_stats: athleteStats.map((a) => {
          const completeStats: Record<string, any> = {
            ...(a.stats || {}),
          };

          dynamicColumns.forEach((col) => {
            const val = getAthleteStatValue(a, col.key);
            if (val !== undefined && val !== null && val !== '') {
              completeStats[col.key] = val;
            }
          });

          const athleteEvent = a.event || a.discipline || completeStats.event || '';
          const athleteEventId = a.event_id || (athleteEvent ? `EVT-${athleteEvent.toLowerCase().replace(/[^a-z0-9]/g, '_').toUpperCase()}` : undefined);
          const athleteFinishTime = a.finish_time || a.time || completeStats.finish_time || completeStats.time || '';
          const athleteSplit = a.split || completeStats.split || '';
          const athleteRank = a.placement_rank || a.rank || completeStats.placement_rank || completeStats.rank || '';

          completeStats.event = athleteEvent;
          completeStats.event_id = athleteEventId;
          completeStats.finish_time = athleteFinishTime;
          completeStats.split = athleteSplit;
          completeStats.placement_rank = athleteRank;

          return {
            athlete_id: a.athlete_id,
            row_uid: a.row_uid,
            player_name: a.player_name,
            team_name: a.team_name,
            jersey_number: a.jersey_number,
            position: a.position,
            event: athleteEvent,
            event_id: athleteEventId,
            heat: a.heat !== undefined ? a.heat : completeStats.heat,
            lane: a.lane !== undefined ? a.lane : completeStats.lane,
            placement_rank: athleteRank,
            finish_time: athleteFinishTime,
            time: athleteFinishTime,
            split: athleteSplit,
            // Dynamic stats dictionary without truncation
            stats: completeStats,
            // Direct top-level metrics for backward compatibility
            pts: completeStats.pts ?? completeStats.points ?? 0,
            ast: completeStats.ast ?? completeStats.assists ?? 0,
            reb: completeStats.reb ?? completeStats.rebounds ?? 0,
            stl: completeStats.stl ?? completeStats.steals ?? 0,
            blk: completeStats.blk ?? completeStats.blocks ?? 0,
            to: completeStats.to ?? completeStats.turnovers ?? 0,
            min: completeStats.min ?? completeStats.minutes ?? 0,
            kills: completeStats.kills ?? 0,
            attack_errors: completeStats.attack_errors ?? 0,
            attack_attempts: completeStats.attack_attempts ?? 0,
            service_aces: completeStats.service_aces ?? 0,
            digs: completeStats.digs ?? 0,
            block_points: completeStats.block_points ?? 0,
            goals: completeStats.goals ?? 0,
            shots: completeStats.shots ?? 0,
            shots_on_target: completeStats.shots_on_target ?? 0,
            saves: completeStats.saves ?? 0,
            tackles: completeStats.tackles ?? 0,
          };
        }),
      };

      await submitVerifiedMatch(payload);

      const nextSaved = Array.from(new Set([...savedMatches, activeMatchIndex]));
      setSavedMatches(nextSaved);

      if (matchesList.length > 1 && nextSaved.length < matchesList.length) {
        setFeedback({
          type: 'success',
          message: `Match ${activeMatchIndex + 1} (${sportType}) logged successfully! Switch tabs to review other matches.`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `All verified match statistics logged into the Firestore database!`,
        });
        setTimeout(() => {
          onSaveSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit verified match statistics.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Determine if using custom/non-standard dynamic sport schema
  const isCustomOrNonStandard = !isBasketball && !isVolleyball && !isSoccer && !isIndividual;

  return (
    <div style={styles.container}>
      {/* Batch Match Tabs (If multiple matches detected) */}
      {matchesList.length > 1 && (
        <div style={styles.batchTabsWrap}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <Layers style={{ width: 16, height: 16, color: '#0B132B' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0B132B', textTransform: 'uppercase' }}>
              Batch Matches ({matchesList.length}):
            </span>
          </div>
          {matchesList.map((m, idx) => {
            const mSport = (m.sport_type || 'MATCH').toUpperCase();
            const mHome = (m.team_name || 'HOME').toUpperCase();
            const mAway = (m.opponent_team_name || 'AWAY').toUpperCase();
            const isSaved = savedMatches.includes(idx);
            const isActive = activeMatchIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveMatchIndex(idx);
                  setSelectedTeamFilter('ALL');
                  setFeedback(null);
                }}
                style={{
                  ...styles.batchTab,
                  ...(isActive ? styles.batchTabActive : {}),
                }}
              >
                <span>M{idx + 1}: {mSport} • {mHome} vs {mAway}</span>
                {isSaved && <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Top Action Bar */}
      <div style={styles.topBar}>
        <button type="button" onClick={onBack} style={styles.backBtn}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
          <span>BACK TO UPLOADER</span>
        </button>

        <div style={styles.actionGroup}>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            style={{
              ...styles.editToggleBtn,
              ...(isEditing ? styles.editToggleBtnActive : {}),
            }}
          >
            {isEditing ? (
              <>
                <CheckCircle2 style={{ width: 14, height: 14 }} />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <Edit2 style={{ width: 14, height: 14 }} />
                <span>Edit Box Score</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveMatch}
            disabled={saving}
            style={{
              ...styles.saveBtn,
              ...(saving ? styles.saveBtnDisabled : {}),
            }}
          >
            {saving ? (
              <>
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                <span>Submitting to Database...</span>
              </>
            ) : (
              <>
                <Save style={{ width: 14, height: 14 }} />
                <span>
                  {savedMatches.includes(activeMatchIndex)
                    ? 'Update Verified Match'
                    : matchesList.length > 1
                    ? `Log Match ${activeMatchIndex + 1}`
                    : 'Confirm & Log Match'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div style={feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}>
          <ShieldCheck style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Dynamic Match Scoreboard Banner (Aligned with Mobile) */}
      <div style={styles.scoreBanner}>
        {/* Banner Top Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy style={{ width: 16, height: 16, color: '#00C8FF' }} />
            <span style={{ fontSize: '12px', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#FFFFFF' }}>
              MATCH SCOREBOARD • {sportType}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              backgroundColor: '#00C8FF',
              color: '#0B132B',
              fontSize: '11px',
              fontWeight: 900,
              padding: '3px 10px',
              letterSpacing: '0.05em',
              borderRadius: '2px',
            }}>
              FINAL: {currentMatch.final_score || dynamicResult.finalScore}
            </span>
            <span style={{
              backgroundColor: dynamicResult.homeBadge === 'DRAW' ? '#F59E0B' : dynamicResult.homeBadge === 'PENDING' ? '#475569' : '#10B981',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 900,
              padding: '3px 10px',
              letterSpacing: '0.05em',
              borderRadius: '2px',
            }}>
              {dynamicResult.summary}
            </span>
          </div>
        </div>

        <div style={styles.scoreBannerInner}>
          <div style={styles.teamCol}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={styles.teamTag}>HOME TEAM</span>
              <span style={{
                fontSize: '9.5px',
                fontWeight: 900,
                padding: '1px 6px',
                backgroundColor: dynamicResult.homeBadge === 'WIN' ? '#10B981' : dynamicResult.homeBadge === 'DRAW' ? '#F59E0B' : dynamicResult.homeBadge === 'PENDING' ? '#334155' : '#EF4444',
                color: '#FFFFFF',
                borderRadius: '2px',
              }}>
                {dynamicResult.homeBadge}
              </span>
            </div>
            <h2 style={styles.teamName}>{homeTeamName}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={styles.teamScore}>{homeScore}</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#94A3B8' }}>{scoreUnit}</span>
            </div>
          </div>

          <div style={styles.vsCenter}>
            <span style={styles.vsBadge}>VS</span>
            <span style={styles.sportBadge}>
              <Trophy style={{ width: 14, height: 14, color: '#FBBF24' }} />
              <span>{sportType}</span>
            </span>
          </div>

          <div style={styles.teamColRight}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', justifyContent: 'flex-end' }}>
              <span style={{
                fontSize: '9.5px',
                fontWeight: 900,
                padding: '1px 6px',
                backgroundColor: dynamicResult.awayBadge === 'WIN' ? '#10B981' : dynamicResult.awayBadge === 'DRAW' ? '#F59E0B' : dynamicResult.awayBadge === 'PENDING' ? '#334155' : '#EF4444',
                color: '#FFFFFF',
                borderRadius: '2px',
              }}>
                {dynamicResult.awayBadge}
              </span>
              <span style={styles.teamTag}>AWAY TEAM</span>
            </div>
            <h2 style={styles.teamName}>{awayTeamName}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', justifyContent: 'flex-end' }}>
              <span style={styles.teamScore}>{awayScore}</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#94A3B8' }}>{scoreUnit}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Filter Tabs */}
      <div style={styles.filterTabsWrap}>
        <button
          type="button"
          onClick={() => setSelectedTeamFilter('ALL')}
          style={{
            ...styles.filterTab,
            ...(selectedTeamFilter === 'ALL' ? styles.filterTabActive : {}),
          }}
        >
          All Players ({athleteStats.length})
        </button>
        {teamList.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedTeamFilter(t)}
            style={{
              ...styles.filterTab,
              ...(selectedTeamFilter === t ? styles.filterTabActive : {}),
            }}
          >
            {t} ({athleteStats.filter((a) => (a.team_name || '').toUpperCase() === t).length})
          </button>
        ))}
      </div>

      {/* Box Score Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <span style={styles.tableTitle}>
            EXTRACTED {sportType} STATS ({visibleAthletes.length} ATHLETES)
          </span>
          <span style={styles.tableSubtitle}>
            {isEditing ? 'Editing Mode Active: tap numbers to edit' : 'Tap team badge to toggle Home/Away'}
          </span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              {/* Basketball Header */}
              {isBasketball && (
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.thCenter, width: '48px' }}>#</th>
                  <th style={styles.th}>Athlete Name</th>
                  <th style={styles.th}>Team</th>
                  <th style={styles.thCenter}>PTS</th>
                  <th style={styles.thCenter}>AST</th>
                  <th style={styles.thCenter}>TO</th>
                  <th style={styles.thCenter}>REB</th>
                  <th style={styles.thCenter}>STL</th>
                  <th style={styles.thCenter}>BLK</th>
                  <th style={styles.thCenter}>MIN</th>
                  <th style={styles.thCenter}>FG%</th>
                </tr>
              )}

              {/* Volleyball Header */}
              {isVolleyball && (
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.thCenter, width: '48px' }}>#</th>
                  <th style={styles.th}>Athlete Name</th>
                  <th style={styles.th}>Team</th>
                  <th style={styles.thCenter}>KILLS</th>
                  <th style={styles.thCenter}>ATK ERR</th>
                  <th style={styles.thCenter}>ATTEMPTS</th>
                  <th style={styles.thCenter}>HIT %</th>
                  <th style={styles.thCenter}>ACES</th>
                  <th style={styles.thCenter}>DIGS</th>
                  <th style={styles.thCenter}>BLK PTS</th>
                </tr>
              )}

              {/* Soccer Header */}
              {isSoccer && (
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.thCenter, width: '48px' }}>#</th>
                  <th style={styles.th}>Athlete Name</th>
                  <th style={styles.th}>Team</th>
                  <th style={styles.thCenter}>GOALS</th>
                  <th style={styles.thCenter}>SHOTS</th>
                  <th style={styles.thCenter}>SOT</th>
                  <th style={styles.thCenter}>SAVES</th>
                  <th style={styles.thCenter}>TACKLES</th>
                  <th style={styles.thCenter}>MIN</th>
                </tr>
              )}

              {/* Individual / Timed Sports Header (Scenario 2: dynamic columns for sport-specific metrics) */}
              {isIndividual && (
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.thCenter, width: '48px' }}>RANK</th>
                  <th style={styles.th}>Athlete Name</th>
                  <th style={styles.th}>Team / Affiliation</th>
                  <th style={styles.th}>EVENT</th>
                  {dynamicColumns.map((col) => (
                    <th key={col.key} style={styles.thCenter}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              )}

              {/* Custom Admin / Non-standard Sports Header */}
              {isCustomOrNonStandard && (
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.thCenter, width: '48px' }}>#</th>
                  <th style={styles.th}>Athlete Name</th>
                  <th style={styles.th}>Team</th>
                  {dynamicColumns.map((col) => (
                    <th key={col.key} style={styles.thCenter}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              )}
            </thead>

            <tbody>
              {visibleAthletes.map((a, rowIdx) => {
                const isHome = (a.team_name || '').toUpperCase() === homeTeamName;
                const rowIdentity = a.row_uid || a.athlete_id;

                return (
                  <tr key={rowIdentity} style={styles.tbodyRow}>
                    <td style={styles.tdNum}>
                      {isIndividual
                        ? a.placement_rank ? `#${a.placement_rank}` : `#${rowIdx + 1}`
                        : a.jersey_number ? `#${a.jersey_number}` : '-'}
                    </td>
                    <td style={styles.tdAthleteName}>{a.player_name}</td>
                    <td style={styles.tdTeam}>
                      <button
                        type="button"
                        onClick={() => handleToggleTeam(rowIdentity)}
                        title="Click to toggle Home / Away"
                        style={isHome ? styles.teamBadgeHome : styles.teamBadgeAway}
                      >
                        <span>{a.team_name || (isHome ? 'HOME' : 'AWAY')}</span>
                        <RefreshCw style={{ width: 10, height: 10, opacity: 0.6 }} />
                      </button>
                    </td>

                    {/* Basketball Cells */}
                    {isBasketball && (
                      <>
                        {(['pts', 'ast', 'to', 'reb', 'stl', 'blk', 'min'] as const).map((stat) => (
                          <td key={stat} style={styles.tdStat}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={a[stat] ?? 0}
                                onChange={(e) => handleStatChange(rowIdentity, stat, e.target.value)}
                                style={styles.statInput}
                              />
                            ) : (
                              a[stat] ?? 0
                            )}
                          </td>
                        ))}
                        <td style={styles.tdFgPct}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.fg_pct || '0%'}
                              onChange={(e) => handleStatChange(rowIdentity, 'fg_pct', e.target.value)}
                              style={{ ...styles.statInput, width: '64px' }}
                            />
                          ) : (
                            a.fg_pct || '0%'
                          )}
                        </td>
                      </>
                    )}

                    {/* Volleyball Cells */}
                    {isVolleyball && (
                      <>
                        {(['kills', 'attack_errors', 'attack_attempts'] as const).map((stat) => (
                          <td key={stat} style={styles.tdStat}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={a[stat] ?? 0}
                                onChange={(e) => handleStatChange(rowIdentity, stat, e.target.value)}
                                style={styles.statInput}
                              />
                            ) : (
                              a[stat] ?? 0
                            )}
                          </td>
                        ))}
                        <td style={styles.tdFgPct}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.hitting_pct || '0%'}
                              onChange={(e) => handleStatChange(rowIdentity, 'hitting_pct', e.target.value)}
                              style={{ ...styles.statInput, width: '64px' }}
                            />
                          ) : (
                            a.hitting_pct || '0%'
                          )}
                        </td>
                        {(['service_aces', 'digs', 'block_points'] as const).map((stat) => (
                          <td key={stat} style={styles.tdStat}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={a[stat] ?? 0}
                                onChange={(e) => handleStatChange(rowIdentity, stat, e.target.value)}
                                style={styles.statInput}
                              />
                            ) : (
                              a[stat] ?? 0
                            )}
                          </td>
                        ))}
                      </>
                    )}

                    {/* Soccer Cells */}
                    {isSoccer && (
                      <>
                        {(['goals', 'shots', 'shots_on_target', 'saves', 'tackles', 'min'] as const).map((stat) => (
                          <td key={stat} style={styles.tdStat}>
                            {isEditing ? (
                              <input
                                type="number"
                                value={a[stat] ?? 0}
                                onChange={(e) => handleStatChange(rowIdentity, stat, e.target.value)}
                                style={styles.statInput}
                              />
                            ) : (
                              a[stat] ?? 0
                            )}
                          </td>
                        ))}
                      </>
                    )}

                    {/* Individual / Timed Sports Cells (Scenario 1 Disambiguation & Scenario 2 Dynamic Schema) */}
                    {isIndividual && (
                      <>
                        <td style={styles.tdStat}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.event || '-'}
                              onChange={(e) => handleStatChange(rowIdentity, 'event', e.target.value)}
                              style={{ ...styles.statInput, width: '100px' }}
                            />
                          ) : (
                            a.event || '-'
                          )}
                        </td>
                        {dynamicColumns.map((col) => {
                          const val = getAthleteStatValue(a, col.key);
                          return (
                            <td key={col.key} style={styles.tdStat}>
                              {isEditing ? (
                                <input
                                  type={col.isNumeric ? 'number' : 'text'}
                                  value={val}
                                  onChange={(e) => handleStatChange(rowIdentity, col.key, e.target.value)}
                                  style={{
                                    ...styles.statInput,
                                    width: col.isNumeric ? '56px' : '85px',
                                  }}
                                />
                              ) : (
                                val !== '' && val !== undefined ? val : '-'
                              )}
                            </td>
                          );
                        })}
                      </>
                    )}

                    {/* Custom Admin / Non-standard Sports Cells */}
                    {isCustomOrNonStandard && (
                      <>
                        {dynamicColumns.map((col) => {
                          const val = getAthleteStatValue(a, col.key);
                          return (
                            <td key={col.key} style={styles.tdStat}>
                              {isEditing ? (
                                <input
                                  type={col.isNumeric ? 'number' : 'text'}
                                  value={val}
                                  onChange={(e) => handleStatChange(rowIdentity, col.key, e.target.value)}
                                  style={{
                                    ...styles.statInput,
                                    width: col.isNumeric ? '56px' : '85px',
                                  }}
                                />
                              ) : (
                                val !== '' && val !== undefined ? val : '-'
                              )}
                            </td>
                          );
                        })}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>

            {/* Totals Row */}
            <tfoot>
              <tr style={styles.tfootRow}>
                <td style={styles.tfootTdTotalLabel} colSpan={3}>
                  TOTALS ({visibleAthletes.length} Athletes)
                </td>

                {isBasketball && (
                  <>
                    <td style={styles.tfootTdStatHighlight}>{(totals as any).pts}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).ast}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).to}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).reb}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).stl}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).blk}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).min}</td>
                    <td style={styles.tfootTdDash}>-</td>
                  </>
                )}

                {isVolleyball && (
                  <>
                    <td style={styles.tfootTdStatHighlight}>{(totals as any).kills}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).attack_errors}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).attack_attempts}</td>
                    <td style={styles.tfootTdDash}>-</td>
                    <td style={styles.tfootTdStat}>{(totals as any).service_aces}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).digs}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).block_points}</td>
                  </>
                )}

                {isSoccer && (
                  <>
                    <td style={styles.tfootTdStatHighlight}>{(totals as any).goals}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).shots}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).shots_on_target}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).saves}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).tackles}</td>
                    <td style={styles.tfootTdDash}>-</td>
                  </>
                )}

                {isIndividual && (
                  <>
                    <td style={styles.tfootTdDash}>-</td>
                    {dynamicColumns.map((col) => {
                      if (col.isNumeric) {
                        const sum = columnTotals[col.key] || 0;
                        return (
                          <td key={col.key} style={styles.tfootTdStatHighlight}>
                            {Number.isInteger(sum) ? sum : sum.toFixed(1)}
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} style={styles.tfootTdDash}>
                          -
                        </td>
                      );
                    })}
                  </>
                )}

                {isCustomOrNonStandard && (
                  <>
                    {dynamicColumns.map((col) => {
                      if (col.isNumeric) {
                        const sum = columnTotals[col.key] || 0;
                        return (
                          <td key={col.key} style={styles.tfootTdStatHighlight}>
                            {Number.isInteger(sum) ? sum : sum.toFixed(1)}
                          </td>
                        );
                      }
                      return (
                        <td key={col.key} style={styles.tfootTdDash}>
                          -
                        </td>
                      );
                    })}
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

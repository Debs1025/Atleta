import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  G,
} from "react-native-svg";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../../../services/firebaseClient";
import { requestAuthenticatedJson } from "../Authentication/authShared";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const fontPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

const fontBoldPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

export interface EventProgressionRecord {
  id: string;
  meet_name: string;
  location: string;
  date: string;
  display_date: string;
  formatted_value: string;
  numeric_value: number;
  unit: string;
  is_lower_better: boolean;
  rank?: number | string;
  qts?: string;
  is_official?: boolean;
  notes?: string;
  delta_from_previous?: number;
  delta_display?: string;
  is_improvement?: boolean;
  is_personal_best?: boolean;
}

export interface EventProgressionData {
  athlete_id: string;
  athlete_name: string;
  sport: string;
  metric_key: string;
  event_title: string;
  current_mark: string;
  personal_best: string;
  is_lower_better: boolean;
  total_records: number;
  records: EventProgressionRecord[];
  sparkline_points: { x: number; y: number; label: string; value: number }[];
}

export interface EventFilterOption {
  key: string;
  label: string;
  shortLabel: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  isDistance?: boolean;
}

const SWIMMING_EVENTS: EventFilterOption[] = [
  { key: "50m_free", label: "50m Freestyle", shortLabel: "50M FREE", iconName: "water-outline" },
  { key: "100m_free", label: "100m Freestyle", shortLabel: "100M FREE", iconName: "water-outline" },
  { key: "200m_free", label: "200m Freestyle", shortLabel: "200M FREE", iconName: "water-outline" },
  { key: "400m_free", label: "400m Freestyle", shortLabel: "400M FREE", iconName: "water-outline" },
  { key: "800m_free", label: "800m Freestyle", shortLabel: "800M FREE", iconName: "water-outline" },
  { key: "1500m_free", label: "1500m Freestyle", shortLabel: "1500M FREE", iconName: "water-outline" },
  { key: "50m_back", label: "50m Backstroke", shortLabel: "50M BACK", iconName: "water-outline" },
  { key: "100m_back", label: "100m Backstroke", shortLabel: "100M BACK", iconName: "water-outline" },
  { key: "200m_back", label: "200m Backstroke", shortLabel: "200M BACK", iconName: "water-outline" },
  { key: "50m_breast", label: "50m Breaststroke", shortLabel: "50M BREAST", iconName: "shield-outline" },
  { key: "100m_breast", label: "100m Breaststroke", shortLabel: "100M BREAST", iconName: "shield-outline" },
  { key: "200m_breast", label: "200m Breaststroke", shortLabel: "200M BREAST", iconName: "shield-outline" },
  { key: "50m_fly", label: "50m Butterfly", shortLabel: "50M FLY", iconName: "flame-outline" },
  { key: "100m_fly", label: "100m Butterfly", shortLabel: "100M FLY", iconName: "flame-outline" },
  { key: "200m_fly", label: "200m Butterfly", shortLabel: "200M FLY", iconName: "flame-outline" },
  { key: "200m_im", label: "200m Medley (IM)", shortLabel: "200M IM", iconName: "star-outline" },
  { key: "400m_im", label: "400m Medley (IM)", shortLabel: "400M IM", iconName: "star-outline" },
  { key: "flip_turn", label: "Flip Turn Split", shortLabel: "FLIP TURN", iconName: "refresh-outline" },
];

const TRACK_EVENTS: EventFilterOption[] = [
  { key: "100m", label: "100m Dash", shortLabel: "100M DASH", iconName: "speedometer-outline" },
  { key: "200m", label: "200m Dash", shortLabel: "200M DASH", iconName: "speedometer-outline" },
  { key: "400m", label: "400m Dash", shortLabel: "400M DASH", iconName: "speedometer-outline" },
  { key: "800m", label: "800m Run", shortLabel: "800M RUN", iconName: "navigate-outline" },
  { key: "1500m", label: "1500m Run", shortLabel: "1500M RUN", iconName: "navigate-outline" },
  { key: "pole_vault", label: "Pole Vault", shortLabel: "POLE VAULT", isDistance: true, iconName: "trending-up-outline" },
  { key: "high_jump", label: "High Jump", shortLabel: "HIGH JUMP", isDistance: true, iconName: "arrow-up-circle-outline" },
  { key: "long_jump", label: "Long Jump", shortLabel: "LONG JUMP", isDistance: true, iconName: "trending-up-outline" },
  { key: "triple_jump", label: "Triple Jump", shortLabel: "TRIPLE JUMP", isDistance: true, iconName: "trending-up-outline" },
  { key: "shot_put", label: "Shot Put", shortLabel: "SHOT PUT", isDistance: true, iconName: "barbell-outline" },
  { key: "discus", label: "Discus Throw", shortLabel: "DISCUS", isDistance: true, iconName: "disc-outline" },
  { key: "javelin", label: "Javelin Throw", shortLabel: "JAVELIN", isDistance: true, iconName: "send-outline" },
  { key: "reaction", label: "Reaction Time", shortLabel: "REACTION", iconName: "flash-outline" },
];

export function parseToNumeric(raw: any): number {
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  const str = String(raw).trim().toLowerCase().replace(/s$/, "").replace(/m$/, "");
  if (str.includes(":")) {
    const parts = str.split(":");
    if (parts.length === 2) {
      const min = parseFloat(parts[0]) || 0;
      const sec = parseFloat(parts[1]) || 0;
      return +(min * 60 + sec).toFixed(2);
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export function isTargetEvent(eventStr: string, key: string): boolean {
  if (!eventStr) return false;
  const e = eventStr.toUpperCase();
  const k = key.toLowerCase();

  const cleanE = e.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanK = k.replace(/[^a-z0-9]/g, '');
  if (cleanE === cleanK || cleanE.includes(cleanK) || cleanK.includes(cleanE)) return true;

  if (k === "50m_free") return e.includes("50") && (e.includes("FREE") || e.includes("SWIM"));
  if (k === "100m_free") return e.includes("100") && (e.includes("FREE") || e.includes("SWIM"));
  if (k === "200m_free") return e.includes("200") && (e.includes("FREE") || e.includes("SWIM"));
  if (k === "400m_free") return e.includes("400") && (e.includes("FREE") || e.includes("SWIM"));
  if (k === "800m_free") return e.includes("800") && (e.includes("FREE") || e.includes("SWIM"));
  if (k === "1500m_free") return e.includes("1500") && (e.includes("FREE") || e.includes("SWIM"));
  if (k.includes("back")) return e.includes("BACK") && (!k.includes("50") || e.includes("50")) && (!k.includes("100") || e.includes("100")) && (!k.includes("200") || e.includes("200"));
  if (k.includes("fly")) return (e.includes("FLY") || e.includes("BUTTERFLY")) && (!k.includes("50") || e.includes("50")) && (!k.includes("100") || e.includes("100")) && (!k.includes("200") || e.includes("200"));
  if (k.includes("breast")) return e.includes("BREAST") && (!k.includes("50") || e.includes("50")) && (!k.includes("100") || e.includes("100")) && (!k.includes("200") || e.includes("200"));
  if (k.includes("im")) return (e.includes("IM") || e.includes("MEDLEY")) && (!k.includes("200") || e.includes("200")) && (!k.includes("400") || e.includes("400"));
  if (k === "flip_turn") return e.includes("FLIP") || e.includes("TURN");

  if (k === "100m") return e.includes("100") && (e.includes("DASH") || e.includes("MD") || e.includes("RUN") || e.includes("SPRINT") || (!e.includes("FREE") && !e.includes("SWIM")));
  if (k === "200m") return e.includes("200") && (e.includes("DASH") || e.includes("MD") || e.includes("RUN") || e.includes("SPRINT") || (!e.includes("FREE") && !e.includes("SWIM")));
  if (k === "400m") return e.includes("400") && (e.includes("DASH") || e.includes("MD") || e.includes("RUN"));
  if (k === "800m") return e.includes("800");
  if (k === "1500m") return e.includes("1500");
  if (k === "pole_vault") return e.includes("POLE") || e.includes("VAULT");
  if (k === "high_jump") return e.includes("HIGH") && e.includes("JUMP");
  if (k === "long_jump") return e.includes("LONG") && e.includes("JUMP");
  if (k === "triple_jump") return e.includes("TRIPLE") && e.includes("JUMP");
  if (k === "shot_put") return e.includes("SHOT") && e.includes("PUT");
  if (k === "discus") return e.includes("DISCUS");
  if (k === "javelin") return e.includes("JAVELIN");
  if (k === "reaction") return e.includes("REACTION") || e.includes("START");

  return false;
}

export function matchesAthlete(p: any, targetId: string, targetName: string): boolean {
  if (!p) return false;
  const pId = String(p.athlete_id || p.user_id || p.id || "").toLowerCase().trim();
  const cleanPId = pId.replace(/^ath_/, "");
  const tId = String(targetId || "").toLowerCase().trim();
  const cleanTId = tId.replace(/^ath_/, "");

  if (cleanTId && cleanPId && (cleanTId === cleanPId || tId === pId)) {
    return true;
  }

  const pName = (p.player_name || p.name || p.full_name || p.athlete_name || "").toLowerCase().trim();
  const tName = (targetName || "").toLowerCase().trim();
  if (pName && tName) {
    if (pName === tName) return true;
    if (pName.includes(tName) || tName.includes(pName)) return true;
    const pParts = pName.split(/\s+/).filter(Boolean);
    const tParts = tName.split(/\s+/).filter(Boolean);
    const pLast = pParts[pParts.length - 1];
    const tLast = tParts[tParts.length - 1];
    if (pLast && tLast && pLast.length > 2 && pLast === tLast) {
      return true;
    }
  }
  return false;
}

export function resolveBaselinePersonalBest(
  eventKey: string,
  sport: string,
  avg: any = {},
  stats: any = {}
): string {
  const combined = { ...stats, ...avg };
  const cleanKey = eventKey.toLowerCase().replace(/[^a-z0-9]/g, '_');

  const directKeys = [
    `pb_${cleanKey}`,
    `avg_${cleanKey}`,
    `times_${cleanKey}`,
    cleanKey,
    `pb_${eventKey}`,
  ];
  for (const k of directKeys) {
    if (combined[k] && combined[k] !== "-" && combined[k] !== "N/A" && combined[k] !== "00:00.00") {
      return String(combined[k]);
    }
  }

  const isSwim = sport.toUpperCase().includes("SWIM");
  if (isSwim) {
    if (cleanKey.includes("50") && cleanKey.includes("free")) return combined.pb_50m_free || combined.times_50m_free || "N/A";
    if (cleanKey.includes("100") && cleanKey.includes("free")) return combined.pb_100m_free || combined.avg_100m_free || "N/A";
    if (cleanKey.includes("200") && cleanKey.includes("free")) return combined.avg_200m_free || combined.pb_200m || "N/A";
    if (cleanKey.includes("400") && cleanKey.includes("free")) return combined.pb_400m_free || "N/A";
    if (cleanKey.includes("800") && cleanKey.includes("free")) return combined.pb_800m_free || "N/A";
    if (cleanKey.includes("1500") && cleanKey.includes("free")) return combined.pb_1500m_free || "N/A";
    if (cleanKey.includes("back")) return combined.pb_100m_back || combined.times_100m_back || combined.pb_50m_back || combined.pb_200m_back || "N/A";
    if (cleanKey.includes("fly")) return combined.pb_100m_fly || combined.times_100m_fly || combined.pb_50m_fly || combined.pb_200m_fly || "N/A";
    if (cleanKey.includes("breast")) return combined.pb_100m_breast || combined.times_100m_breast || combined.pb_50m_breast || combined.pb_200m_breast || "N/A";
    if (cleanKey.includes("im")) return combined.pb_200m_im || combined.times_200m_im || combined.pb_400m_im || "N/A";
    if (cleanKey.includes("turn")) return combined.flip_turn_s || "N/A";
  } else {
    if (cleanKey.includes("100")) return combined.pb_100m || combined.avg_100m || combined.times_100m || "N/A";
    if (cleanKey.includes("200")) return combined.pb_200m || combined.avg_200m || combined.times_200m || "N/A";
    if (cleanKey.includes("400")) return combined.pb_400m || combined.times_400m || "N/A";
    if (cleanKey.includes("800")) return combined.pb_800m || combined.times_800m || "N/A";
    if (cleanKey.includes("1500")) return combined.pb_1500m || combined.times_1500m || "N/A";
    if (cleanKey.includes("vault")) return combined.pb_pole_vault || combined.pole_vault || "N/A";
    if (cleanKey.includes("high") && cleanKey.includes("jump")) return combined.pb_high_jump || combined.high_jump || "N/A";
    if (cleanKey.includes("long") && cleanKey.includes("jump")) return combined.pb_long_jump || combined.long_jump || "N/A";
    if (cleanKey.includes("triple")) return combined.pb_triple_jump || combined.triple_jump || "N/A";
    if (cleanKey.includes("shot")) return combined.pb_shot_put || combined.shot_put || "N/A";
    if (cleanKey.includes("discus")) return combined.pb_discus || combined.discus || "N/A";
    if (cleanKey.includes("javelin")) return combined.pb_javelin || combined.javelin || "N/A";
    if (cleanKey.includes("reaction")) return combined.reaction_time_s || combined.reaction_time || "N/A";
  }
  return "N/A";
}

export function buildEmptyProgression(
  eventOpt: EventFilterOption,
  athId: string,
  athName: string,
  sport: string,
  avg: any = {},
  stats: any = {}
): EventProgressionData {
  const isDistance = !!eventOpt.isDistance;
  const isLowerBetter = !isDistance;
  const pb = resolveBaselinePersonalBest(eventOpt.key, sport, avg, stats);

  return {
    athlete_id: athId,
    athlete_name: athName,
    sport,
    metric_key: eventOpt.key,
    event_title: eventOpt.label,
    current_mark: pb,
    personal_best: pb,
    is_lower_better: isLowerBetter,
    total_records: 0,
    records: [],
    sparkline_points: [],
  };
}

export interface EventTimeHistorySectionProps {
  athleteId: string;
  athleteName: string;
  sportCategory: string;
  profileAverages?: any;
  profileStats?: any;
  matches?: any[];
}

export const EventTimeHistorySection: React.FC<EventTimeHistorySectionProps> = ({
  athleteId,
  athleteName,
  sportCategory = "SWIMMING",
  profileAverages = {},
  profileStats = {},
  matches = [],
}) => {
  const normSport = (sportCategory || "").toUpperCase();
  const isSwim = normSport.includes("SWIM");

  const availableEvents = useMemo(() => {
    return isSwim ? SWIMMING_EVENTS : TRACK_EVENTS;
  }, [isSwim]);

  const [selectedEventKey, setSelectedEventKey] = useState<string>(
    availableEvents[0]?.key || "100m"
  );

  const selectedEventOption = useMemo(() => {
    return availableEvents.find((e) => e.key === selectedEventKey) || availableEvents[0];
  }, [availableEvents, selectedEventKey]);

  const [data, setData] = useState<EventProgressionData>(() =>
    buildEmptyProgression(
      availableEvents[0],
      athleteId,
      athleteName,
      normSport,
      profileAverages,
      profileStats
    )
  );

  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDropdownModalOpen, setIsDropdownModalOpen] = useState<boolean>(false);

  // Strictly Real Data Fetching from Firestore Match_Logs & matches prop
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const isDistance = !!selectedEventOption.isDistance;
    const isLowerBetter = !isDistance;
    const unit = isDistance ? "m" : "s";

    const fetchRealData = async () => {
      const extracted: EventProgressionRecord[] = [];
      const seenMatchIds = new Set<string>();

      const processSingleMatch = (m: any) => {
        if (!m) return;
        const mId = m.match_id || m.id || m.metric_id;
        if (mId && seenMatchIds.has(mId)) return;

        // Case A: The item is an individual Performance_Metrics record or player's match_history doc
        const isIndividualMetric =
          Boolean(m.metric_id) ||
          (Boolean(m.athlete_id) && matchesAthlete(m, athleteId, athleteName) && Boolean(m.finish_time || m.time || m.mark || m.formatted_time));

        if (isIndividualMetric) {
          const rowEvent = m.event_key || m.event || m.event_name || m.position || m.meet_name || "";
          if (isTargetEvent(rowEvent, selectedEventKey)) {
            const rawVal = isDistance
              ? (m.mark || m.distance || m.distance_meters || m.time_or_distance)
              : (m.finish_time || m.time || m.formatted_time || m.time_or_distance);
            const numVal = parseToNumeric(rawVal);
            if (numVal > 0) {
              if (mId) seenMatchIds.add(mId);
              const mDate = m.match_date || m.date || m.timestamp || m.created_at || new Date().toISOString();
              const d = new Date(mDate);
              const displayDate = !isNaN(d.getTime())
                ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Official Meet";

              extracted.push({
                id: `${mId || m.metric_id}_${athleteId}`,
                meet_name: m.meet_name || m.custom_game_title || m.game_name || m.match_name || "Official Meet",
                location: m.location || "Official Sports Complex",
                date: !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString(),
                display_date: displayDate,
                formatted_value: String(rawVal).trim().endsWith(unit) ? String(rawVal).trim() : `${rawVal}${unit}`,
                numeric_value: numVal,
                unit,
                is_lower_better: isLowerBetter,
                rank: m.rank || m.place || m.placement_rank || 1,
                qts: m.qts || undefined,
                is_official: m.is_official !== false,
                notes: m.notes || undefined,
              });
              return;
            }
          }
        }

        // Case B: The item is a full match scorecard containing player_stats / playerStats
        const playerStats = Array.isArray(m.player_stats) && m.player_stats.length > 0
          ? m.player_stats
          : (Array.isArray(m.playerStats) && m.playerStats.length > 0
            ? m.playerStats
            : (Array.isArray(m.players) ? m.players : []));

        let hasMatchedPlayer = false;
        playerStats.forEach((p: any) => {
          if (matchesAthlete(p, athleteId, athleteName)) {
            const rowEvent = p.event_key || p.event || p.event_name || p.position || m.event_or_opponent || m.event_name || "";
            if (isTargetEvent(rowEvent, selectedEventKey)) {
              const rawVal = isDistance
                ? (p.mark || p.distance || p.distance_meters || p.time_or_distance)
                : (p.finish_time || p.time || p.formatted_time || p.time_or_distance);
              const numVal = parseToNumeric(rawVal);
              if (numVal > 0) {
                hasMatchedPlayer = true;
                const mDate = m.match_date || m.date || m.timestamp || m.full_date || m.created_at || new Date().toISOString();
                const d = new Date(mDate);
                const displayDate = !isNaN(d.getTime())
                  ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "Official Meet";

                extracted.push({
                  id: `${mId}_${p.athlete_id || p.index || Math.random().toString(36).substring(2, 6)}`,
                  meet_name: m.custom_game_title || m.game_name || m.match_name || m.event_or_opponent || "Official Match",
                  location: m.location || "Official Sports Complex",
                  date: !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString(),
                  display_date: displayDate,
                  formatted_value: String(rawVal).trim().endsWith(unit) ? String(rawVal).trim() : `${rawVal}${unit}`,
                  numeric_value: numVal,
                  unit,
                  is_lower_better: isLowerBetter,
                  rank: p.rank || p.place || p.placement_rank || m.rank || m.place || 1,
                  qts: p.qts || undefined,
                  is_official: m.is_official !== false,
                  notes: p.notes || undefined,
                });
              }
            }
          }
        });

        if (hasMatchedPlayer && mId) {
          seenMatchIds.add(mId);
        }
      };

      // 1. Process matches passed via props
      if (Array.isArray(matches) && matches.length > 0) {
        matches.forEach(processSingleMatch);
      }

      // 2. Query local offline matches cache (atleta_offline_matches_cache)
      try {
        const localMatchesRaw = await AsyncStorage.getItem("atleta_offline_matches_cache");
        if (localMatchesRaw) {
          const localMatches = JSON.parse(localMatchesRaw);
          if (Array.isArray(localMatches)) {
            localMatches.forEach(processSingleMatch);
          }
        }
      } catch (_) {}

      // 3. Query coach dashboard cache (coach_dashboard_cache)
      try {
        const coachCacheRaw = await AsyncStorage.getItem("coach_dashboard_cache");
        if (coachCacheRaw) {
          const coachCache = JSON.parse(coachCacheRaw);
          if (Array.isArray(coachCache.matchHistoryList)) {
            coachCache.matchHistoryList.forEach(processSingleMatch);
          }
        }
      } catch (_) {}

      // 4. Query Firestore Match_Logs collection
      try {
        const snap = await getDocs(query(collection(db, "Match_Logs"), limit(60)));
        if (snap && !snap.empty) {
          snap.forEach((doc) => {
            processSingleMatch({ id: doc.id, ...doc.data() });
          });
        }
      } catch (_) {}

      // 5. Query Firestore Performance_Metrics collection
      try {
        const metricsSnap = await getDocs(query(collection(db, "Performance_Metrics"), limit(60)));
        if (metricsSnap && !metricsSnap.empty) {
          metricsSnap.forEach((doc) => {
            processSingleMatch({ id: doc.id, ...doc.data() });
          });
        }
      } catch (_) {}

      // 3. Fallback to authenticated backend endpoint if Firestore client was blocked
      if (extracted.length === 0) {
        try {
          const rawAthId = athleteId || "";
          const cleanId = rawAthId.startsWith("ath_") ? rawAthId.replace("ath_", "") : rawAthId;
          const url = `/athlete/${cleanId}/progression-history?metric=${encodeURIComponent(
            selectedEventKey
          )}&sport=${encodeURIComponent(normSport)}`;
          const res: any = await requestAuthenticatedJson(url, "GET");
          if (res && Array.isArray(res.records) && res.records.length > 0) {
            if (!isCancelled) {
              setData(res);
              setIsLoading(false);
              return;
            }
          }
        } catch (apiErr) {
          // No backend records
        }
      }

      if (isCancelled) return;

      // STRICTLY REAL DATA: If no real matches exist in Firestore, return clean empty state
      if (extracted.length === 0) {
        setData(
          buildEmptyProgression(
            selectedEventOption,
            athleteId,
            athleteName,
            normSport,
            profileAverages,
            profileStats
          )
        );
        setSelectedPointIndex(null);
        setIsLoading(false);
        return;
      }

      // Sort chronological: oldest to newest
      extracted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Determine genuine Personal Best across recorded meets
      let bestNum = extracted[0].numeric_value;
      extracted.forEach((r) => {
        if (isLowerBetter) {
          if (r.numeric_value <= bestNum) bestNum = r.numeric_value;
        } else {
          if (r.numeric_value >= bestNum) bestNum = r.numeric_value;
        }
      });

      // Calculate deltas between consecutive real meets
      const calculated: EventProgressionRecord[] = [];
      for (let i = 0; i < extracted.length; i++) {
        const cur = extracted[i];
        const prev = i > 0 ? extracted[i - 1] : null;

        let delta = 0;
        let isImprovement = false;
        let deltaDisplay = "Baseline";

        if (prev) {
          delta = +(cur.numeric_value - prev.numeric_value).toFixed(2);
          if (isLowerBetter) {
            if (delta < 0) {
              isImprovement = true;
              deltaDisplay = `↓ ${Math.abs(delta).toFixed(2)}${unit} Faster`;
            } else if (delta > 0) {
              isImprovement = false;
              deltaDisplay = `+${delta.toFixed(2)}${unit}`;
            } else {
              deltaDisplay = `0.00${unit}`;
            }
          } else {
            if (delta > 0) {
              isImprovement = true;
              deltaDisplay = `↑ +${delta.toFixed(2)}${unit} Farther`;
            } else if (delta < 0) {
              isImprovement = false;
              deltaDisplay = `${delta.toFixed(2)}${unit}`;
            } else {
              deltaDisplay = `0.00${unit}`;
            }
          }
        }

        const isPB = cur.numeric_value === bestNum;
        calculated.push({
          ...cur,
          delta_from_previous: prev ? delta : undefined,
          delta_display: deltaDisplay,
          is_improvement: isImprovement,
          is_personal_best: isPB,
        });
      }

      const sparklinePoints = calculated.map((r, idx) => ({
        x: idx,
        y: r.numeric_value,
        label: r.display_date,
        value: r.numeric_value,
      }));

      // Display newest meets at the top
      const displayRecords = [...calculated].reverse();

      const profilePB = resolveBaselinePersonalBest(selectedEventKey, normSport, profileAverages, profileStats);
      const genuinePB = displayRecords.find((r) => r.is_personal_best)?.formatted_value || (profilePB !== "N/A" ? profilePB : displayRecords[0]?.formatted_value);

      setData({
        athlete_id: athleteId,
        athlete_name: athleteName,
        sport: normSport,
        metric_key: selectedEventOption.key,
        event_title: selectedEventOption.label,
        current_mark: displayRecords[0]?.formatted_value || "N/A",
        personal_best: genuinePB,
        is_lower_better: isLowerBetter,
        total_records: displayRecords.length,
        records: displayRecords,
        sparkline_points: sparklinePoints,
      });

      setSelectedPointIndex(null);
      setIsLoading(false);
    };

    fetchRealData();

    return () => {
      isCancelled = true;
    };
  }, [selectedEventKey, athleteId, normSport, matches]);

  // Sparkline Chart Calculation for 2+ Real Meets
  const sparklineChart = useMemo(() => {
    if (!data || !data.records || data.records.length < 2) return null;

    const chrono = [...data.records].reverse();
    const chartWidth = SCREEN_WIDTH - 64;
    const chartHeight = 100;
    const padX = 24;
    const padY = 20;
    const availW = chartWidth - padX * 2;
    const availH = chartHeight - padY * 2;

    const values = chrono.map((c) => c.numeric_value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const points = chrono.map((item, idx) => {
      const x = padX + (idx / (chrono.length - 1)) * availW;
      const norm = data.is_lower_better
        ? (maxVal - item.numeric_value) / range
        : (item.numeric_value - minVal) / range;
      const y = padY + (1 - norm) * availH;

      return {
        x,
        y,
        chronoIndex: idx,
        record: item,
      };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) * 0.45;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) * 0.55;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

    return {
      chartWidth,
      chartHeight,
      points,
      pathD,
      areaD,
      minVal,
      maxVal,
      unit: data.records[0]?.unit || (data.is_lower_better ? "s" : "m"),
    };
  }, [data]);

  return (
    <View style={styles.container}>
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER TITLE WITH VERIFIED BADGE
      ───────────────────────────────────────────────────────────── */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleLeft}>
          <View style={styles.cyanAccentBar} />
          <Text style={styles.sectionTitle}>EVENT & TIME HISTORY</Text>
        </View>
        <View style={styles.officialBadge}>
          <Ionicons name="ribbon-outline" size={11} color="#00C8FF" />
          <Text style={styles.officialBadgeText}>VERIFIED MATCH DATA</Text>
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>
        Select an event to view all recorded competition marks from official scoresheets.
      </Text>

      {/* ─────────────────────────────────────────────────────────────
          2. EVENT TYPE DROPDOWN TRIGGER & QUICK PILLS
      ───────────────────────────────────────────────────────────── */}
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setIsDropdownModalOpen(true)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="filter" size={16} color="#00C8FF" />
            <View>
              <Text style={styles.dropdownTriggerSub}>EVENT TYPE</Text>
              <Text style={styles.dropdownTriggerTitle}>{selectedEventOption.label}</Text>
            </View>
          </View>
          <View style={styles.dropdownTriggerBadge}>
            <Text style={styles.dropdownTriggerBadgeText}>CHOOSE</Text>
            <Ionicons name="chevron-down" size={14} color="#00C8FF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal Dropdown Picker */}
      <Modal
        visible={isDropdownModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDropdownModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsDropdownModalOpen(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Event Type</Text>
                <Text style={styles.modalSubtitle}>
                  Filter stats for {sportCategory}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsDropdownModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {availableEvents.map((evt) => {
                const isSelected = selectedEventKey === evt.key;
                return (
                  <TouchableOpacity
                    key={evt.key}
                    style={[
                      styles.modalOptionItem,
                      isSelected && styles.modalOptionItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedEventKey(evt.key);
                      setIsDropdownModalOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View
                        style={[
                          styles.modalOptionIconBox,
                          isSelected && styles.modalOptionIconBoxSelected,
                        ]}
                      >
                        <Ionicons
                          name={evt.iconName || "trophy-outline"}
                          size={16}
                          color={isSelected ? "#00C8FF" : "#64748B"}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.modalOptionLabel,
                            isSelected && styles.modalOptionLabelSelected,
                          ]}
                        >
                          {evt.label}
                        </Text>
                        <Text style={styles.modalOptionSub}>
                          {evt.shortLabel} {evt.isDistance ? "• Distance Event" : "• Timed Event"}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#00C8FF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPillsScroll}
      >
        {availableEvents.map((evt) => {
          const isActive = selectedEventKey === evt.key;
          return (
            <TouchableOpacity
              key={evt.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setSelectedEventKey(evt.key)}
              activeOpacity={0.8}
            >
              {evt.iconName && (
                <Ionicons
                  name={evt.iconName}
                  size={13}
                  color={isActive ? "#00C8FF" : "#64748B"}
                />
              )}
              <Text
                style={[
                  styles.filterPillText,
                  isActive && styles.filterPillTextActive,
                ]}
              >
                {evt.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─────────────────────────────────────────────────────────────
          3. KPI SUMMARY TILES
      ───────────────────────────────────────────────────────────── */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel}>PERSONAL BEST</Text>
            <Ionicons name="trophy-outline" size={12} color="#FFD700" />
          </View>
          <Text style={styles.kpiValueGold} numberOfLines={1}>
            {data?.personal_best || "N/A"}
          </Text>
          <Text style={styles.kpiSub}>
            {data?.total_records > 0 ? "Official Record" : "Profile Baseline"}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel}>LATEST MARK</Text>
            <Ionicons name="timer-outline" size={12} color="#00C8FF" />
          </View>
          <Text style={styles.kpiValueCyan} numberOfLines={1}>
            {data?.records && data.records.length > 0
              ? data.records[0].formatted_value
              : "N/A"}
          </Text>
          <Text style={styles.kpiSub}>
            {data?.records && data.records.length > 0 ? "Most Recent Meet" : "No Meets Yet"}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <Text style={styles.kpiLabel}>TIMES LOGGED</Text>
            <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
          </View>
          <Text style={styles.kpiValueWhite} numberOfLines={1}>
            {data?.total_records || 0}
          </Text>
          <Text style={styles.kpiSub}>Recorded Meets</Text>
        </View>
      </View>

      {/* ─────────────────────────────────────────────────────────────
          4. PERFORMANCE TREND (SVG) - SHOWN FOR 2+ MEETS
      ───────────────────────────────────────────────────────────── */}
      {sparklineChart && sparklineChart.points.length >= 2 ? (
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={styles.chartTitle}>
                {selectedEventOption.shortLabel} TREND
              </Text>
              <Text style={styles.chartSubtitle}>
                {data.is_lower_better
                  ? "Higher curve = Faster time"
                  : "Higher curve = Farther distance"}
              </Text>
            </View>

            <View style={styles.liveIndicatorBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>PROGRESSION</Text>
            </View>
          </View>

          {/* Interactive Selected Point Tooltip */}
          {selectedPointIndex !== null && sparklineChart.points[selectedPointIndex] && (
            <View style={styles.tooltipCard}>
              <View style={styles.tooltipRow}>
                <Text style={styles.tooltipMeet} numberOfLines={1}>
                  {sparklineChart.points[selectedPointIndex].record.meet_name}
                </Text>
                <Text style={styles.tooltipDate}>
                  {sparklineChart.points[selectedPointIndex].record.display_date}
                </Text>
              </View>
              <Text style={styles.tooltipValue}>
                {sparklineChart.points[selectedPointIndex].record.formatted_value}
                {sparklineChart.points[selectedPointIndex].record.is_personal_best ? " (PB 🏆)" : ""}
              </Text>
            </View>
          )}

          {/* Clean Vector Sparkline Chart */}
          <Svg
            width={sparklineChart.chartWidth}
            height={sparklineChart.chartHeight}
            style={{ marginTop: 12 }}
          >
            <Defs>
              <LinearGradient id="eventChartGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#00C8FF" stopOpacity="0.32" />
                <Stop offset="100%" stopColor="#00C8FF" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Subtle horizontal baseline markers */}
            <Line
              x1="24"
              y1={sparklineChart.chartHeight / 2}
              x2={sparklineChart.chartWidth - 24}
              y2={sparklineChart.chartHeight / 2}
              stroke="rgba(255, 255, 255, 0.04)"
              strokeDasharray="4 4"
            />
            <Line
              x1="24"
              y1={sparklineChart.chartHeight - 20}
              x2={sparklineChart.chartWidth - 24}
              y2={sparklineChart.chartHeight - 20}
              stroke="rgba(255, 255, 255, 0.06)"
            />

            {/* Gradient filled area */}
            <Path d={sparklineChart.areaD} fill="url(#eventChartGradient)" />

            {/* Smooth trend curve */}
            <Path
              d={sparklineChart.pathD}
              fill="none"
              stroke="#00C8FF"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {sparklineChart.points.map((pt, idx) => {
              const isSelected = selectedPointIndex === idx;
              const isPB = pt.record.is_personal_best;

              return (
                <G key={pt.record.id || idx}>
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : isPB ? 5 : 4}
                    fill={isPB ? "#F59E0B" : "#00C8FF"}
                    stroke="#070D19"
                    strokeWidth={2}
                  />
                  {isSelected && (
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={9}
                      fill="none"
                      stroke="#00C8FF"
                      strokeWidth={1.5}
                      strokeOpacity={0.6}
                    />
                  )}
                </G>
              );
            })}
          </Svg>

          {/* Chronological points tap trigger row */}
          <View style={styles.pointsClickBar}>
            {sparklineChart.points.map((pt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.pointHitArea}
                onPress={() => setSelectedPointIndex(idx)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pointDateLabel,
                    selectedPointIndex === idx && styles.pointDateLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {pt.record.display_date.split(",")[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : data?.records && data.records.length === 1 ? (
        <View style={styles.singleMeetNoticeCard}>
          <Ionicons name="information-circle-outline" size={16} color="#00C8FF" />
          <Text style={styles.singleMeetNoticeText}>
            1 official match logged ({data.records[0].formatted_value}). Log 2 or more matches to render performance trend curve.
          </Text>
        </View>
      ) : null}

      {/* ─────────────────────────────────────────────────────────────
          5. ALL RECORDED TIMES (STRICTLY REAL MATCH LOGS)
      ───────────────────────────────────────────────────────────── */}
      <View style={styles.allRecordsHeader}>
        <Text style={styles.allRecordsTitle}>
          ALL RECORDED TIMES ({data?.records?.length || 0})
        </Text>
        {data?.records && data.records.length > 0 && (
          <Text style={styles.allRecordsNotice}>Newest to Oldest</Text>
        )}
      </View>

      {data?.records && data.records.length > 0 ? (
        data.records.map((item, idx) => {
          const isPB = item.is_personal_best;
          const rankNum = typeof item.rank === "number" ? item.rank : parseInt(String(item.rank).replace(/[^\d]/g, ""), 10);
          const isFirstPlace = rankNum === 1 || String(item.rank).toLowerCase().includes("1st");
          const isSecondPlace = rankNum === 2 || String(item.rank).toLowerCase().includes("2nd");
          const isThirdPlace = rankNum === 3 || String(item.rank).toLowerCase().includes("3rd");
          const isPodium = isFirstPlace || isSecondPlace || isThirdPlace;
          const badgeText = isFirstPlace ? "1st Place" : isSecondPlace ? "2nd Place" : isThirdPlace ? "3rd Place" : (rankNum ? `Rank #${rankNum}` : String(item.rank));
          const badgeColor = isFirstPlace ? "#FFD700" : isSecondPlace ? "#CBD5E1" : isThirdPlace ? "#F97316" : "#38BDF8";
          const badgeBg = isFirstPlace ? "rgba(245, 158, 11, 0.15)" : isSecondPlace ? "rgba(226, 232, 240, 0.12)" : isThirdPlace ? "rgba(249, 115, 22, 0.15)" : "rgba(56, 189, 248, 0.12)";
          const badgeBorder = isFirstPlace ? "rgba(245, 158, 11, 0.3)" : isSecondPlace ? "rgba(203, 213, 225, 0.3)" : isThirdPlace ? "rgba(249, 115, 22, 0.3)" : "rgba(56, 189, 248, 0.25)";

          return (
            <View
              key={item.id || idx}
              style={[styles.meetCard, isPB && styles.meetCardPB]}
            >
              {/* Meet Name & Rank Row */}
              <View style={styles.meetTopRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.meetNameText} numberOfLines={1}>
                    {item.meet_name}
                  </Text>
                  <Text style={styles.meetLocationDateText}>
                    {item.location} • {item.display_date}
                  </Text>
                </View>

                {item.rank ? (
                  <View
                    style={[
                      styles.rankBadge,
                      { backgroundColor: badgeBg, borderColor: badgeBorder, borderWidth: 1 }
                    ]}
                  >
                    <Ionicons
                      name={isPodium ? (isFirstPlace ? "trophy" : "ribbon") : "flag-outline"}
                      size={11}
                      color={badgeColor}
                    />
                    <Text
                      style={[
                        styles.rankBadgeText,
                        { color: badgeColor, fontWeight: "900" },
                      ]}
                    >
                      {badgeText}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Mark Value & Badges Row */}
              <View style={styles.meetBottomRow}>
                <View style={styles.markGroup}>
                  <Text style={styles.markValueText}>{item.formatted_value}</Text>
                  {item.qts && (
                    <Text style={styles.qtsText}>QTS: {item.qts}</Text>
                  )}
                </View>

                <View style={styles.badgesGroup}>
                  {isPB && (
                    <View style={styles.pbBadge}>
                      <Ionicons name="sparkles" size={10} color="#F59E0B" />
                      <Text style={styles.pbBadgeText}>PERSONAL BEST</Text>
                    </View>
                  )}

                  {item.delta_display && item.delta_display !== "Baseline" ? (
                    <View
                      style={[
                        styles.deltaBadge,
                        item.is_improvement && styles.deltaBadgeImproved,
                      ]}
                    >
                      <Text
                        style={[
                          styles.deltaText,
                          item.is_improvement && styles.deltaTextImproved,
                        ]}
                      >
                        {item.delta_display}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="timer-outline" size={32} color="#475569" />
          <Text style={styles.emptyTitle}>NO MATCH RECORDS</Text>
          <Text style={styles.emptyText}>
            No official match records found for {selectedEventOption.label}.
          </Text>
          <Text style={styles.emptySubtext}>
            Competition times will appear here as soon as match scorecards are logged or verified.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cyanAccentBar: {
    width: 3,
    height: 14,
    backgroundColor: "#00C8FF",
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.2,
    fontFamily: fontBoldPlatform,
  },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 200, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.25)",
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00C8FF",
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 14,
    lineHeight: 16,
  },

  /* FILTER PILLS */
  filterPillsScroll: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 16,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D192E",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterPillActive: {
    backgroundColor: "rgba(0, 200, 255, 0.15)",
    borderColor: "#00C8FF",
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  filterPillTextActive: {
    color: "#00C8FF",
    fontWeight: "900",
  },

  /* KPI ROW */
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#0D192E",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  kpiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
  },
  kpiValueGold: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFD700",
    fontFamily: fontBoldPlatform,
  },
  kpiValueCyan: {
    fontSize: 18,
    fontWeight: "900",
    color: "#00C8FF",
    fontFamily: fontBoldPlatform,
  },
  kpiValueWhite: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: fontBoldPlatform,
  },
  kpiSub: {
    fontSize: 9,
    color: "#475569",
    marginTop: 2,
  },

  /* CHART CARD */
  chartCard: {
    backgroundColor: "#0D192E",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.14)",
    marginBottom: 16,
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.8,
    fontFamily: fontBoldPlatform,
  },
  chartSubtitle: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  liveIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 200, 255, 0.1)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00C8FF",
  },
  liveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#00C8FF",
    letterSpacing: 0.8,
  },
  tooltipCard: {
    backgroundColor: "rgba(7, 13, 25, 0.95)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.3)",
    marginTop: 10,
  },
  tooltipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  tooltipMeet: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  tooltipDate: {
    fontSize: 10,
    color: "#64748B",
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: "900",
    color: "#00C8FF",
    fontFamily: fontBoldPlatform,
  },
  pointsClickBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 6,
  },
  pointHitArea: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  pointDateLabel: {
    fontSize: 9,
    color: "#64748B",
    fontWeight: "700",
  },
  pointDateLabelActive: {
    color: "#00C8FF",
    fontWeight: "900",
  },

  /* SINGLE MEET CARD */
  singleMeetNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0, 200, 255, 0.08)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.2)",
    marginBottom: 16,
  },
  singleMeetNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#94A3B8",
    lineHeight: 16,
  },

  /* ALL RECORDS LIST */
  allRecordsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  allRecordsTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1,
    fontFamily: fontBoldPlatform,
  },
  allRecordsNotice: {
    fontSize: 10,
    color: "#64748B",
  },
  meetCard: {
    backgroundColor: "#0D192E",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 10,
  },
  meetCardPB: {
    borderColor: "rgba(245, 158, 11, 0.3)",
    backgroundColor: "#0E1C33",
  },
  meetTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  meetNameText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: fontBoldPlatform,
  },
  meetLocationDateText: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 3,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rankBadgeFirst: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
  },
  rankBadgeTextFirst: {
    color: "#FFD700",
    fontWeight: "900",
  },
  meetBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: 10,
  },
  markGroup: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  markValueText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#00C8FF",
    fontFamily: fontBoldPlatform,
  },
  qtsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  badgesGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pbBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  pbBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#FFD700",
    letterSpacing: 0.5,
  },
  deltaBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deltaBadgeImproved: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  deltaText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
  },
  deltaTextImproved: {
    color: "#10B981",
  },

  /* EMPTY STATE */
  emptyCard: {
    backgroundColor: "#0D192E",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderStyle: "dashed",
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  emptySubtext: {
    fontSize: 11,
    color: "#475569",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
    maxWidth: 280,
  },

  /* DROPDOWN & MODAL STYLES */
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0B1528",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#00C8FF",
  },
  dropdownTriggerSub: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dropdownTriggerTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  dropdownTriggerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 200, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.25)",
  },
  dropdownTriggerBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#00C8FF",
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0B1528",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "#0F1E36",
    borderWidth: 1,
    borderColor: "transparent",
  },
  modalOptionItemSelected: {
    backgroundColor: "rgba(0, 200, 255, 0.12)",
    borderColor: "#00C8FF",
  },
  modalOptionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionIconBoxSelected: {
    backgroundColor: "rgba(0, 200, 255, 0.2)",
  },
  modalOptionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#CBD5E1",
  },
  modalOptionLabelSelected: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  modalOptionSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
});

export default EventTimeHistorySection;

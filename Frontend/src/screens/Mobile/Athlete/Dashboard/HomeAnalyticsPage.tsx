import React, { useEffect, useState, useRef } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  LayoutChangeEvent,
  TouchableOpacity,
} from "react-native";
import { AthleteAllStatsModal } from "./AthleteAllStatsModal";
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Line,
  Circle,
  Text as SvgText,
  G,
} from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/HomeAnalyticsPage";
import { Coach } from "../Teams/Teams";
import { getSportsOfflineFirst } from "../../../../services/firebaseClient";


export interface PastTeamStatsSummary {
  matches_played: number;
  total_points: number;
  ppg: number;
  total_rebounds: number;
  rpg: number;
  total_assists: number;
  apg: number;
  total_steals: number;
  spg: number;
  total_blocks: number;
  bpg: number;
  total_turnovers?: number;
  total_fouls?: number;
  fg_pct: number;
  three_pct: number;
  ft_pct: number;
  efficiency_rating: number;
  wins?: number;
  losses?: number;
  best_time?: string | number;
  top_sprint_time?: string | number;
}

export interface PastTeamAffiliation {
  team_id: string;
  team_name: string;
  sport_type: string;
  division?: string;
  logo_url?: string;
  coach_name?: string;
  coach_id?: string;
  jersey_number?: number | string | null;
  position?: string;
  joined_at?: string;
  terminated_at?: string;
  status: 'Terminated' | 'Former' | 'Released';
  termination_reason?: string;
  stats_summary: PastTeamStatsSummary;
}

export interface TeamAffiliation {
  team_id: string;
  team_name: string;
  sport_type: string;
  division?: string;
  logo_url?: string;
  banner_url?: string;
  head_coach: Coach;
  is_verified: boolean;
}

export interface AthleteAnalytics {
  // Basketball
  points_per_game?: number;
  assists_per_game?: number;
  rebounds_per_game?: number;
  field_goal_percentage?: number;
  free_throw_percentage?: number;
  last_5_games_scores?: number[];

  // Swimming
  best_time?: string | number;
  best_time_formatted?: string;
  split_time?: string | number;
  split_time_formatted?: string;
  total_distance_m?: number;
  lap_count?: number;
  turn_efficiency_pct?: number;
  stroke_efficiency_pct?: number;
  recent_swim_times?: (number | string)[];

  // Track & Field
  top_sprint_time?: string | number;
  top_sprint_formatted?: string;
  top_distance_m?: number;
  average_pace?: string;
  recent_track_marks?: (number | string)[];

  // Generic / Custom Sports
  [key: string]: any;
}

export interface EligibleDocument {
  id: string;
  title: string;
  category: "BIRTH_CERTIFICATE" | "MEDICAL_CLEARANCE" | "SCHOOL_ID" | "OTHER";
  fileName?: string;
  fileUri?: string;
  status: "PENDING" | "UPLOADED" | "VERIFIED";
  uploadedAt?: string;
}

export interface BasketballAdvancedStats {
  true_shooting_pct: number;
  usage_rate_pct: number;
  off_def_rebound_ratio: string;
  points_off_turnovers: number;
  plus_minus: string;
}

export interface VolleyballAdvancedStats {
  kill_pct: number;
  passing_accuracy_pct: number;
  aces_to_errors_ratio: string;
  dig_to_kill_conversion_pct: number;
}

export interface GeneralSportAdvancedStats {
  consistency_pct: number;
  srpe_correlation: string;
  coach_rating_trend: string;
  rating_score: number;
}

export interface AdvancedCoachStats {
  has_coach_logs: boolean;
  total_matches_logged: number;
  sport: string;
  basketball?: BasketballAdvancedStats;
  volleyball?: VolleyballAdvancedStats;
  general?: GeneralSportAdvancedStats;
}

export interface AthleteProfile {
  athlete_id: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender?: string;
  province?: string;
  category: string;
  height_cm: number;
  weight_kg: number;
  wingspan_cm: number;
  vertical_cm?: number;
  vertical_jump_cm?: number;
  vertical_leap_in?: number;
  recruitment_status?: string;
  leaderboard_rank?: number | string;
  achievements?: string[];
  avatar_url?: string;
  current_affiliation: TeamAffiliation;
  analytics?: AthleteAnalytics;
  workload_analytics?: any;
  eligible_documents?: EligibleDocument[];
  auth_provider?: string;
  sport_type?: string;
  player_status?: 'Active' | 'Injured' | 'Prone to Injury' | 'Recovering' | 'Day-to-Day' | string;
  playerStatus?: 'Active' | 'Injured' | 'Prone to Injury' | 'Recovering' | 'Day-to-Day' | string;
  injury_notes?: string;
  injuryNotes?: string;
  excel_tags?: string[];
  excelTags?: string[];
  specialties?: string[];
  past_teams?: PastTeamAffiliation[];
  advanced_coach_stats?: AdvancedCoachStats;
  [key: string]: any;
}

interface HomeAnalyticsPageProps {
  profile: AthleteProfile;
  loading?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToCoaches?: () => void;
  onNavigateToTeamProfile?: () => void;
  onViewCoachProfile?: (coachId?: string) => void;
}

export function HomeAnalyticsPage({
  profile,
  loading = false,
  onRefresh,
  isRefreshing,
  onNavigateToProfile,
  onNavigateToCoaches,
  onNavigateToTeamProfile,
  onViewCoachProfile,
}: HomeAnalyticsPageProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [dynamicSports, setDynamicSports] = useState<any[]>([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");
  const [chartMode, setChartMode] = useState<"PERFORMANCE" | "WORKLOAD">("PERFORMANCE");
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [chartCanvasWidth, setChartCanvasWidth] = useState<number>(330);
  const [showAllStatsModal, setShowAllStatsModal] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    getSportsOfflineFirst()
      .then((sports: any) => {
        if (isMounted && Array.isArray(sports)) {
          setDynamicSports(sports);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <HomeSkeletonLoader />;
  }

  const rawP = (profile || {}) as any;
  const rawPStats = rawP?.stats || {};
  const rawPAverages = rawP?.averages || {};
  const analytics = profile?.analytics || {};

  // Resolve active past team if filter is active
  const pastTeamsList: PastTeamAffiliation[] = Array.isArray(profile?.past_teams) ? profile.past_teams : [];
  const activePastTeam = pastTeamsList.find((t) => t.team_id === selectedTeamFilter);

  // Resolve active sport name (use past team's sport if filtered)
  const rawSportName = String(
    (activePastTeam?.sport_type) ||
    profile?.category ||
    profile?.sport_type ||
    rawP?.sport_type ||
    rawP?.sport ||
    "BASKETBALL"
  ).trim();

  const upperSport = rawSportName.toUpperCase();

  // Find matching configuration from admin-created catalog if available
  const matchedAdminSport = dynamicSports.find((s: any) => {
    const sName = String(s.sport_name || s.name || s.id || '').toUpperCase();
    const sShort = String(s.short_identifier || '').toUpperCase();
    return sName === upperSport || sShort === upperSport || upperSport.includes(sName);
  });

  const team = profile?.current_affiliation || {
    team_id: "",
    team_name: "Unassigned Team",
    sport_type: rawSportName,
    head_coach: { coach_id: "", full_name: "No Coach Assigned", role_title: "Coach" },
    is_verified: false,
  };

  const advStats: AdvancedCoachStats =
    profile?.advanced_coach_stats ||
    rawP?.advanced_coach_stats ||
    deriveClientAdvancedCoachStats(upperSport, { ...rawPStats, ...rawPAverages, ...analytics }, profile?.workload_analytics);

  const hasCoachLogs = Boolean(advStats?.has_coach_logs);

  // Build stats when filtering by past team
  const displayStats = activePastTeam
    ? {
        points_per_game: activePastTeam.stats_summary?.ppg || 0,
        ppg: activePastTeam.stats_summary?.ppg || 0,
        assists_per_game: activePastTeam.stats_summary?.apg || 0,
        apg: activePastTeam.stats_summary?.apg || 0,
        rebounds_per_game: activePastTeam.stats_summary?.rpg || 0,
        rpg: activePastTeam.stats_summary?.rpg || 0,
        steals_per_game: activePastTeam.stats_summary?.spg || 0,
        blocks_per_game: activePastTeam.stats_summary?.bpg || 0,
        field_goal_percentage: activePastTeam.stats_summary?.fg_pct || 0,
        free_throw_percentage: activePastTeam.stats_summary?.ft_pct || 0,
        three_pt_percentage: activePastTeam.stats_summary?.three_pct || 0,
        efficiency_rating: activePastTeam.stats_summary?.efficiency_rating || 0,
        games_played: activePastTeam.stats_summary?.matches_played || 0,
        last_5_games_scores: activePastTeam.stats_summary?.ppg ? [activePastTeam.stats_summary.ppg] : [],
      }
    : rawPStats;

  const displayAverages = activePastTeam
    ? {
        ppg: activePastTeam.stats_summary?.ppg || 0,
        apg: activePastTeam.stats_summary?.apg || 0,
        rpg: activePastTeam.stats_summary?.rpg || 0,
        fg_percentage: activePastTeam.stats_summary?.fg_pct || 0,
        free_throw_percentage: activePastTeam.stats_summary?.ft_pct || 0,
        efficiency_rating: activePastTeam.stats_summary?.efficiency_rating || 0,
      }
    : rawPAverages;

  const displayAnalytics = activePastTeam
    ? {
        points_per_game: activePastTeam.stats_summary?.ppg || 0,
        assists_per_game: activePastTeam.stats_summary?.apg || 0,
        rebounds_per_game: activePastTeam.stats_summary?.rpg || 0,
        field_goal_percentage: activePastTeam.stats_summary?.fg_pct || 0,
        free_throw_percentage: activePastTeam.stats_summary?.ft_pct || 0,
        last_5_games_scores: activePastTeam.stats_summary?.ppg ? [activePastTeam.stats_summary.ppg] : [],
      }
    : analytics;

  // Build Sport Layout Config
  const layout = deriveSportDashboardLayout(upperSport, rawSportName, displayAnalytics, displayStats, displayAverages, matchedAdminSport);

  const activeScores = layout.scores || [];
  const maxScore = activeScores.length > 0 ? Math.max(...activeScores, 0) : 0;

  // Resolve data points for the progression chart
  const matchProgList: any[] = Array.isArray(profile?.match_progression) ? profile.match_progression : [];
  const workloadLogsList: any[] = Array.isArray(profile?.workload_analytics?.weekly_logs) ? profile.workload_analytics.weekly_logs : [];

  const chartDataPoints: { id: string; label: string; date: string; value: number; opponent: string }[] = (() => {
    if (chartMode === "PERFORMANCE") {
      if (matchProgList.length > 0) {
        return matchProgList.slice(-7).map((item, idx) => ({
          id: item.id || `mp_${idx}`,
          label: item.label || item.date || `G${idx + 1}`,
          date: item.date || `Game ${idx + 1}`,
          value: Number(item.points ?? item.score ?? 0),
          opponent: item.opponent || `Certified Match`,
        }));
      }
      if (activeScores.length > 0) {
        return activeScores.slice(-7).map((score, idx) => ({
          id: `score_${idx}`,
          label: `${layout.chartPrefix || "G"}${idx + 1}`,
          date: `Game ${idx + 1}`,
          value: Number(score),
          opponent: `Match ${idx + 1}`,
        }));
      }
      return [];
    } else {
      // WORKLOAD INTENSITY
      if (workloadLogsList.length > 0) {
        return workloadLogsList.slice(-7).map((log: any, idx: number) => ({
          id: `wl_${idx}`,
          label: String(log.date || `D${idx + 1}`).slice(-5),
          date: log.date ? `Date: ${log.date}` : `Day ${idx + 1}`,
          value: Number(log.srpe || 7.0),
          opponent: log.duration_minutes ? `${log.duration_minutes} min session` : `Training Load`,
        }));
      }
      if (matchProgList.length > 0) {
        return matchProgList.slice(-7).map((item, idx) => ({
          id: item.id || `mp_wl_${idx}`,
          label: item.label || item.date || `G${idx + 1}`,
          date: item.date || `Game ${idx + 1}`,
          value: Number(item.workload_intensity || 7.5),
          opponent: `Session Exertion`,
        }));
      }
      if (activeScores.length > 0) {
        return activeScores.slice(-7).map((score, idx) => {
          const pseudoLoad = Number(Math.min(10, Math.max(5, (Number(score) / (maxScore || 1)) * 4 + 5)).toFixed(1));
          return {
            id: `pseudo_wl_${idx}`,
            label: `M${idx + 1}`,
            date: `Game ${idx + 1}`,
            value: pseudoLoad,
            opponent: `Estimated Match Load`,
          };
        });
      }
      return [];
    }
  })();

  const chartValues = chartDataPoints.map((p) => p.value);
  const chartCount = chartDataPoints.length;
  const chartUnit = chartMode === "PERFORMANCE" ? (layout.isTimed ? "SEC" : "PTS") : "sRPE";

  const chartAvg = chartCount > 0 ? Number((chartValues.reduce((a, b) => a + b, 0) / chartCount).toFixed(1)) : 0;
  const chartMax = chartCount > 0 ? Math.max(...chartValues) : 0;
  const chartCurrentVal =
    selectedPointIndex !== null && chartDataPoints[selectedPointIndex]
      ? chartDataPoints[selectedPointIndex].value
      : chartCount > 0
      ? chartDataPoints[chartCount - 1].value
      : 0;
  const chartTrendPct =
    chartCount >= 2
      ? Number((((chartValues[chartCount - 1] - chartValues[0]) / Math.max(1, chartValues[0])) * 100).toFixed(1))
      : 0;

  // Chart coordinate engine
  const chartHeight = 175;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 22;
  const padBottom = 26;
  const effW = Math.max(120, chartCanvasWidth - padLeft - padRight);
  const effH = Math.max(60, chartHeight - padTop - padBottom);

  const rawMin = chartCount > 0 ? Math.min(...chartValues) : 0;
  const rawMax = chartCount > 0 ? Math.max(...chartValues) : 10;
  let dispMin: number;
  let dispMax: number;

  if (rawMin === rawMax) {
    const pad = rawMin > 0 ? Math.max(2, rawMin * 0.25) : 5;
    dispMin = Math.max(0, rawMin - pad);
    dispMax = rawMax + pad;
  } else {
    const diff = rawMax - rawMin;
    dispMin = Math.max(0, Math.floor(rawMin - diff * 0.18));
    dispMax = Math.ceil(rawMax + diff * 0.18);
  }

  const chartCoords = chartDataPoints.map((pt, idx) => {
    let x: number;
    if (chartCount === 1) {
      x = padLeft + effW / 2;
    } else {
      x = padLeft + (idx / (chartCount - 1)) * effW;
    }
    const y = padTop + (1 - (pt.value - dispMin) / Math.max(1, dispMax - dispMin)) * effH;
    return {
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      ...pt,
    };
  });

  let linePathD = "";
  let areaFillD = "";

  if (chartCount === 1) {
    linePathD = `M ${padLeft} ${chartCoords[0].y} L ${chartCanvasWidth - padRight} ${chartCoords[0].y}`;
    areaFillD = "";
  } else if (chartCount === 2) {
    linePathD = `M ${chartCoords[0].x} ${chartCoords[0].y} L ${chartCoords[1].x} ${chartCoords[1].y}`;
    areaFillD = `${linePathD} L ${chartCoords[1].x} ${chartHeight - padBottom} L ${chartCoords[0].x} ${chartHeight - padBottom} Z`;
  } else if (chartCount >= 3) {
    linePathD = `M ${chartCoords[0].x} ${chartCoords[0].y}`;
    for (let i = 0; i < chartCoords.length - 1; i++) {
      const p0 = chartCoords[i];
      const p1 = chartCoords[i + 1];
      const midX = (p0.x + p1.x) / 2;
      linePathD += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    areaFillD = `${linePathD} L ${chartCoords[chartCoords.length - 1].x} ${chartHeight - padBottom} L ${chartCoords[0].x} ${chartHeight - padBottom} Z`;
  }

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={styles.dashboardContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!isRefreshing}
            onRefresh={onRefresh}
            tintColor="#00C8FF"
            colors={["#00C8FF"]}
          />
        ) : undefined
      }
    >
      {/* Category / Sport Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{layout.badge}</Text>
      </View>

      {/* Section Heading & Team Filter Controls */}
      <View style={styles.sectionHeadingContainer}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={styles.mainTitle}>
              {activePastTeam ? `${activePastTeam.team_name} Stats` : "Personal Analytics"}
            </Text>
            <View style={[styles.activeUnderline, activePastTeam && { backgroundColor: "#EF4444" }]} />
          </View>
          <TouchableOpacity
            onPress={() => setShowAllStatsModal(true)}
            style={styles.viewAllStatsHeaderButton}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllStatsHeaderButtonText}>VIEW ALL STATS</Text>
            <Ionicons name="chevron-forward" size={13} color="#00C8FF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- PAST TEAMS STATS FILTER BAR --- */}
      {pastTeamsList.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="filter-circle-outline" size={16} color="#38BDF8" />
              <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" }}>
                FILTER STATS BY TEAM
              </Text>
            </View>
            {selectedTeamFilter !== "ALL" && (
              <Pressable
                onPress={() => setSelectedTeamFilter("ALL")}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons name="refresh-outline" size={13} color="#94A3B8" />
                <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>Reset All</Text>
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {/* OVERALL CAREER / CURRENT TEAM PILL */}
            <Pressable
              onPress={() => setSelectedTeamFilter("ALL")}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selectedTeamFilter === "ALL" ? "#38BDF8" : "#111C35",
                borderWidth: 1,
                borderColor: selectedTeamFilter === "ALL" ? "#38BDF8" : "#223354",
              }}
            >
              <Text
                style={{
                  color: selectedTeamFilter === "ALL" ? "#080F21" : "#94A3B8",
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {profile.current_affiliation?.team_name && profile.current_affiliation.team_name !== "Unassigned Team"
                  ? `Active: ${profile.current_affiliation.team_name}`
                  : "Overall Career"}
              </Text>
            </Pressable>

            {/* PAST TEAMS PILLS */}
            {pastTeamsList.map((pastTeam, idx) => {
              const isSelected = selectedTeamFilter === pastTeam.team_id;
              return (
                <Pressable
                  key={pastTeam.team_id || idx}
                  onPress={() => setSelectedTeamFilter(pastTeam.team_id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isSelected ? "#EF4444" : "#111C35",
                    borderWidth: 1,
                    borderColor: isSelected ? "#EF4444" : "#EF444455",
                  }}
                >
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={isSelected ? "#FFFFFF" : "#EF4444"}
                  />
                  <Text
                    style={{
                      color: isSelected ? "#FFFFFF" : "#FCA5A5",
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    {pastTeam.team_name} (Past)
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* --- PAST TEAM STATS ACTIVE BANNER --- */}
      {activePastTeam && (
        <View style={{
          backgroundColor: "#161B26",
          borderRadius: 16,
          padding: 16,
          borderWidth: 1.5,
          borderColor: "#EF4444",
          marginBottom: 16,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <View style={{ backgroundColor: "#EF4444", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }}>
                    TERMINATED FROM TEAM
                  </Text>
                </View>
                <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "600" }}>
                  {activePastTeam.sport_type}
                </Text>
              </View>
              <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900" }}>
                {activePastTeam.team_name}
              </Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
                Coach {activePastTeam.coach_name || "Head Coach"} • Jersey #{activePastTeam.jersey_number ?? "--"} • {activePastTeam.position || "Player"}
              </Text>
              <Text style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>
                Left: {new Date(activePastTeam.terminated_at || "").toLocaleDateString()}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedTeamFilter("ALL")}
              style={{ padding: 6 }}
            >
              <Ionicons name="close-circle-outline" size={24} color="#EF4444" />
            </Pressable>
          </View>

          {/* Quick Summary Strip */}
          <View style={{
            flexDirection: "row",
            justifyContent: "space-around",
            backgroundColor: "#0D1321",
            borderRadius: 10,
            paddingVertical: 10,
            marginTop: 12,
            borderWidth: 1,
            borderColor: "#1E293B",
          }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "800" }}>GAMES</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginTop: 2 }}>
                {activePastTeam.stats_summary?.matches_played || 0}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#1E293B" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "800" }}>TOTAL PTS</Text>
              <Text style={{ color: "#38BDF8", fontSize: 16, fontWeight: "900", marginTop: 2 }}>
                {activePastTeam.stats_summary?.total_points || 0}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#1E293B" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "800" }}>PPG</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginTop: 2 }}>
                {activePastTeam.stats_summary?.ppg || 0}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#1E293B" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "800" }}>PER</Text>
              <Text style={{ color: "#34D399", fontSize: 16, fontWeight: "900", marginTop: 2 }}>
                {activePastTeam.stats_summary?.efficiency_rating || 0}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* --- SPORT-SPECIFIC PRIMARY METRICS GRID --- */}
      <View style={styles.metricsGridRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{layout.metric1.label}</Text>
          <Text style={layout.metric1.isLarge ? styles.metricValueLarge : styles.metricValueMedium}>
            {layout.metric1.value}
          </Text>
          <Text style={styles.metricSubLabel}>{layout.metric1.subLabel}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{layout.metric2.label}</Text>
          <Text style={layout.metric2.isLarge ? styles.metricValueLarge : styles.metricValueMedium}>
            {layout.metric2.value}
          </Text>
          <Text style={styles.metricSubLabel}>{layout.metric2.subLabel}</Text>
        </View>
      </View>

      {/* --- SPORT-SPECIFIC SECONDARY METRIC CARD --- */}
      <View style={styles.secondaryMetricCard}>
        <View style={styles.secondaryMetricLeft}>
          <Text style={styles.metricLabel}>{layout.secondaryMetric.label}</Text>
          <View style={styles.reboundsRow}>
            <Text style={styles.reboundsValue}>{layout.secondaryMetric.value}</Text>
            <Text style={styles.reboundsSubtext}>{layout.secondaryMetric.subtext}</Text>
          </View>
        </View>
      </View>

      {/* --- REDESIGNED ATHLETIC PROGRESSION GRAPH --- */}
      <View
        style={styles.chartCard}
        onLayout={(e: LayoutChangeEvent) => {
          const w = e.nativeEvent.layout.width - 36; // subtract card horizontal padding (18*2)
          if (w > 120 && Math.abs(w - chartCanvasWidth) > 2) {
            setChartCanvasWidth(w);
          }
        }}
      >
        {/* Top Header Row with Title & Mode Selector */}
        <View style={styles.chartTopHeader}>
          <View style={styles.chartTitleGroup}>
            <View style={styles.chartTitleCyanBar} />
            <Text style={styles.chartMainTitle}>
              {chartMode === "PERFORMANCE"
                ? layout.chartTitle || "PERFORMANCE PROGRESSION"
                : "WORKLOAD INTENSITY"}
            </Text>
          </View>

          <View style={styles.chartModePillGroup}>
            <Pressable
              onPress={() => {
                setChartMode("PERFORMANCE");
                setSelectedPointIndex(null);
              }}
              style={[
                styles.chartModePill,
                chartMode === "PERFORMANCE" && styles.chartModePillActive,
              ]}
            >
              <Text
                style={[
                  styles.chartModePillText,
                  chartMode === "PERFORMANCE" && styles.chartModePillTextActive,
                ]}
              >
                Score
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setChartMode("WORKLOAD");
                setSelectedPointIndex(null);
              }}
              style={[
                styles.chartModePill,
                chartMode === "WORKLOAD" && styles.chartModePillActive,
              ]}
            >
              <Text
                style={[
                  styles.chartModePillText,
                  chartMode === "WORKLOAD" && styles.chartModePillTextActive,
                ]}
              >
                Workload
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.chartSubtext}>
          {chartMode === "PERFORMANCE"
            ? "Track match output and scoring efficiency across certified games."
            : "Monitor training exertion and physiological load adaptation over time."}
        </Text>

        {chartCount === 0 ? (
          <View style={styles.chartEmptyStateContainer}>
            <View style={styles.chartEmptyStateIconBox}>
              <Ionicons name="trending-up-outline" size={24} color="#38BDF8" />
            </View>
            <Text style={styles.chartEmptyStateTitle}>No match records logged yet.</Text>
            <Text style={styles.chartEmptyStateSubtext}>
              Play or log matches with your coach to visualize your performance curve and workload progression over time.
            </Text>
          </View>
        ) : (
          <>
            {/* KPI Summary Strip */}
            <View style={styles.chartKpiStrip}>
              <View>
                <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 }}>
                  {selectedPointIndex !== null ? "Selected Match" : "Latest Mark"}
                </Text>
                <View style={styles.chartKpiValueGroup}>
                  <Text style={styles.chartKpiHeroValue}>{chartCurrentVal}</Text>
                  <Text style={styles.chartKpiHeroUnit}>{chartUnit}</Text>
                </View>
              </View>

              <View style={styles.chartKpiBadgeRow}>
                <View style={styles.chartKpiAvgPill}>
                  <Text style={styles.chartKpiAvgText}>Avg: {chartAvg}</Text>
                </View>
                <View
                  style={[
                    styles.chartKpiTrendPill,
                    chartTrendPct < 0 && {
                      backgroundColor: "rgba(239, 68, 68, 0.14)",
                      borderColor: "rgba(239, 68, 68, 0.3)",
                    },
                  ]}
                >
                  <Ionicons
                    name={chartTrendPct >= 0 ? "arrow-up" : "arrow-down"}
                    size={11}
                    color={chartTrendPct >= 0 ? "#10B981" : "#EF4444"}
                  />
                  <Text
                    style={[
                      styles.chartKpiTrendText,
                      chartTrendPct < 0 && { color: "#EF4444" },
                    ]}
                  >
                    {chartTrendPct >= 0 ? `+${chartTrendPct}%` : `${chartTrendPct}%`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Interactive Floating Tooltip Callout */}
            {selectedPointIndex !== null && chartCoords[selectedPointIndex] && (
              <View style={styles.chartTooltipOverlay}>
                <Text style={styles.chartTooltipTitle}>
                  {chartCoords[selectedPointIndex].opponent} • {chartCoords[selectedPointIndex].date}
                </Text>
                <View style={styles.chartTooltipValueRow}>
                  <Text style={styles.chartTooltipValue}>
                    {chartCoords[selectedPointIndex].value} {chartUnit}
                  </Text>
                  {chartAvg > 0 && (
                    <Text
                      style={[
                        styles.chartTooltipVariance,
                        {
                          color:
                            chartCoords[selectedPointIndex].value >= chartAvg
                              ? "#10B981"
                              : "#EF4444",
                        },
                      ]}
                    >
                      {chartCoords[selectedPointIndex].value >= chartAvg ? "▲ +" : "▼ "}
                      {(chartCoords[selectedPointIndex].value - chartAvg).toFixed(1)} vs Avg
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Native SVG Canvas */}
            <View style={styles.chartSvgWrapper}>
              <Svg width={chartCanvasWidth} height={chartHeight}>
                <Defs>
                  <LinearGradient id="cobaltGrad" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#2563EB" stopOpacity="0.45" />
                    <Stop offset="50%" stopColor="#00C8FF" stopOpacity="0.18" />
                    <Stop offset="100%" stopColor="#00C8FF" stopOpacity="0.0" />
                  </LinearGradient>
                  <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#2563EB" />
                    <Stop offset="50%" stopColor="#38BDF8" />
                    <Stop offset="100%" stopColor="#00C8FF" />
                  </LinearGradient>
                </Defs>

                {/* Horizontal reference grid lines & Y labels */}
                {[0, 0.5, 1].map((pct, idx) => {
                  const y = padTop + pct * effH;
                  const val = Number((dispMax - pct * (dispMax - dispMin)).toFixed(0));
                  return (
                    <G key={`grid_${idx}`}>
                      <Line
                        x1={padLeft}
                        y1={y}
                        x2={chartCanvasWidth - padRight}
                        y2={y}
                        stroke="rgba(148, 163, 184, 0.08)"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                      <SvgText
                        x={padLeft - 8}
                        y={y + 3.5}
                        fill="#64748B"
                        fontSize={9}
                        fontWeight="700"
                        textAnchor="end"
                      >
                        {val}
                      </SvgText>
                    </G>
                  );
                })}

                {/* X-axis Baseline */}
                <Line
                  x1={padLeft - 4}
                  y1={chartHeight - padBottom}
                  x2={chartCanvasWidth - padRight + 4}
                  y2={chartHeight - padBottom}
                  stroke="rgba(148, 163, 184, 0.16)"
                  strokeWidth={1}
                />

                {/* Gradient Fill Under Line */}
                {areaFillD ? <Path d={areaFillD} fill="url(#cobaltGrad)" /> : null}

                {/* Main Trend Line */}
                <Path
                  d={linePathD}
                  fill="none"
                  stroke={chartCount === 1 ? "rgba(56, 189, 248, 0.45)" : "url(#lineGrad)"}
                  strokeWidth={chartCount === 1 ? 1.5 : 3.2}
                  strokeDasharray={chartCount === 1 ? "4 4" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points Nodes & Interactive Hit Areas */}
                {chartCoords.map((pt, idx) => {
                  const isSelected = selectedPointIndex === idx;
                  const isPeak = pt.value === chartMax && chartMax > 0;
                  return (
                    <G
                      key={`pt_${idx}`}
                      onPress={() => setSelectedPointIndex(selectedPointIndex === idx ? null : idx)}
                    >
                      {/* Large invisible hit area */}
                      <Circle cx={pt.x} cy={pt.y} r={22} fill="transparent" />

                      {/* Selected Guide Line & Halo */}
                      {isSelected && (
                        <>
                          <Line
                            x1={pt.x}
                            y1={padTop - 6}
                            x2={pt.x}
                            y2={chartHeight - padBottom}
                            stroke="rgba(0, 200, 255, 0.35)"
                            strokeDasharray="3 3"
                            strokeWidth={1.5}
                          />
                          <Circle cx={pt.x} cy={pt.y} r={11} fill="rgba(0, 200, 255, 0.22)" />
                        </>
                      )}

                      {/* Visible Node */}
                      <Circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isSelected ? 6 : isPeak ? 5 : 4}
                        fill={isSelected ? "#00C8FF" : isPeak ? "#38BDF8" : "#2563EB"}
                        stroke={isSelected ? "#FFFFFF" : "#38BDF8"}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                      />

                      {/* X Label */}
                      <SvgText
                        x={pt.x}
                        y={chartHeight - 8}
                        fill={isSelected ? "#00C8FF" : "#94A3B8"}
                        fontSize={10}
                        fontWeight={isSelected ? "900" : "700"}
                        textAnchor="middle"
                      >
                        {pt.label}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>

            {/* Interactive hint */}
            <View style={styles.chartInteractiveHint}>
              <Ionicons name="finger-print-outline" size={12} color="#475569" />
              <Text style={styles.chartInteractiveHintText}>
                Tap any point to inspect match breakdown & variance
              </Text>
            </View>
          </>
        )}
      </View>

      {/* --- VIEW ALL STATS ACTION CARD --- */}
      <TouchableOpacity
        style={styles.viewAllStatsBannerCard}
        onPress={() => setShowAllStatsModal(true)}
        activeOpacity={0.85}
      >
        <View style={styles.viewAllStatsBannerContent}>
          <View style={styles.viewAllStatsBannerIconBox}>
            <Ionicons name="bar-chart" size={24} color="#00C8FF" />
          </View>
          <View style={styles.viewAllStatsBannerTextContainer}>
            <View style={styles.viewAllStatsBannerTitleRow}>
              <Text style={styles.viewAllStatsBannerTitle}>VIEW ALL STATS</Text>
              <View style={styles.coachVerifiedPill}>
                <Ionicons name="shield-checkmark" size={10} color="#00C8FF" />
                <Text style={styles.coachVerifiedPillText}>IN-DEPTH</Text>
              </View>
            </View>
            <Text style={styles.viewAllStatsBannerSubtext}>
              Averages, shooting efficiency, tactical coach metrics & training workload
            </Text>
          </View>
          <Ionicons name="chevron-forward-circle" size={26} color="#00C8FF" />
        </View>
      </TouchableOpacity>

      {/* --- TEAM & COACH SECTION --- */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.cyanAccentBar} />
          <Text style={styles.sectionTitleText}>MY TEAM</Text>
        </View>

        <View style={styles.teamCardContainer}>
          {profile?.current_affiliation?.team_id &&
          profile.current_affiliation.team_id !== "" &&
          profile.current_affiliation.team_name !== "Unassigned Team" ? (
            <>
              {/* Group / Teams */}
              <View style={styles.teamHeaderRow}>
                <View style={[styles.groupIconWrapper, { overflow: "hidden" }]}>
                  {team.logo_url || (team as any).banner_url ? (
                    <Image
                      source={{ uri: team.logo_url || (team as any).banner_url }}
                      style={styles.groupIconImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={require("../../../../assets/groupprofile.png")}
                      style={styles.groupIconImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
                <Text style={styles.teamNameText}>{team.team_name}</Text>
              </View>

              {/* Coach */}
              <View style={styles.coachSectionWrapper}>
                <Text style={styles.coachLabelHeader}>COACH</Text>
                <Pressable
                  style={styles.coachInnerCard}
                  onPress={() => {
                    if (onViewCoachProfile && team.head_coach.coach_id) {
                      onViewCoachProfile(team.head_coach.coach_id);
                    }
                  }}
                >
                  <View style={[styles.coachAvatarWrapper, { overflow: "hidden" }]}>
                    {team.head_coach.avatar_url ? (
                      <Image
                        source={{ uri: team.head_coach.avatar_url }}
                        style={styles.coachAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={require("../../../../assets/profile.png")}
                        style={styles.coachAvatarImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  <View style={styles.coachInfoTextGroup}>
                    <Text style={styles.coachNameText}>
                      {team.head_coach.full_name}
                    </Text>
                    <Text style={styles.coachRoleText}>
                      {team.head_coach.role_title}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* View Team Button */}
              <Pressable
                style={styles.viewTeamButton}
                onPress={() =>
                  onNavigateToTeamProfile
                    ? onNavigateToTeamProfile()
                    : onNavigateToProfile && onNavigateToProfile()
                }
              >
                <Text style={styles.viewTeamButtonText}>
                  View Team
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.noTeamContainer}>
              <Text style={styles.noTeamTitle}>No Team Assigned</Text>
              <Text style={styles.noTeamSubtext}>
                You are currently not affiliated with any athletic team program.
              </Text>
              <Pressable
                style={styles.joinTeamButton}
                onPress={() => onNavigateToCoaches && onNavigateToCoaches()}
              >
                <Text style={styles.joinTeamButtonText}>JOIN TEAM</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* --- PAST TEAMS HISTORY SECTION --- */}
        {pastTeamsList.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.cyanAccentBar, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.sectionTitleText}>PAST TEAMS &amp; CAREER HISTORY</Text>
            </View>
            <Text style={{ color: "#94A3B8", fontSize: 12, marginBottom: 12 }}>
              Historical stats and records from teams you were previously part of.
            </Text>

            {pastTeamsList.map((pastTeam, idx) => (
              <View
                key={pastTeam.team_id || idx}
                style={{
                  backgroundColor: "#111C35",
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: selectedTeamFilter === pastTeam.team_id ? "#EF4444" : "#1E2C4A",
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900" }}>
                        {pastTeam.team_name}
                      </Text>
                      <View style={{ backgroundColor: "rgba(239, 68, 68, 0.2)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: "#F87171", fontSize: 9, fontWeight: "900" }}>TERMINATED</Text>
                      </View>
                    </View>
                    <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                      Coach {pastTeam.coach_name || "Head Coach"} • #{pastTeam.jersey_number ?? "--"} ({pastTeam.position || "Player"})
                    </Text>
                    <Text style={{ color: "#64748B", fontSize: 10, marginTop: 2 }}>
                      Left: {new Date(pastTeam.terminated_at || "").toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Team Stats Summary Grid */}
                <View style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: "#0A1124",
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                }}>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "700" }}>GAMES</Text>
                    <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900" }}>{pastTeam.stats_summary?.matches_played || 0}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "700" }}>PPG</Text>
                    <Text style={{ color: "#38BDF8", fontSize: 14, fontWeight: "900" }}>{pastTeam.stats_summary?.ppg || 0}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "700" }}>RPG</Text>
                    <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900" }}>{pastTeam.stats_summary?.rpg || 0}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "700" }}>APG</Text>
                    <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900" }}>{pastTeam.stats_summary?.apg || 0}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "700" }}>FG%</Text>
                    <Text style={{ color: "#34D399", fontSize: 14, fontWeight: "900" }}>{pastTeam.stats_summary?.fg_pct || 0}%</Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => {
                    setSelectedTeamFilter(pastTeam.team_id);
                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                  }}
                  style={{
                    backgroundColor: selectedTeamFilter === pastTeam.team_id ? "#EF4444" : "rgba(56, 189, 248, 0.15)",
                    borderRadius: 8,
                    paddingVertical: 8,
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <Text style={{
                    color: selectedTeamFilter === pastTeam.team_id ? "#FFFFFF" : "#38BDF8",
                    fontSize: 11,
                    fontWeight: "800",
                    letterSpacing: 0.5,
                  }}>
                    {selectedTeamFilter === pastTeam.team_id ? "CURRENTLY FILTERED" : "FILTER THIS TEAM'S STATS"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>

    {/* --- IN-DEPTH ATHLETE ALL STATS MODAL --- */}
    <AthleteAllStatsModal
      visible={showAllStatsModal}
      onClose={() => setShowAllStatsModal(false)}
      profile={profile}
      activePastTeam={activePastTeam}
      displayStats={displayStats}
      displayAverages={displayAverages}
      displayAnalytics={displayAnalytics}
      layout={layout}
      advStats={advStats}
    />
  </>
  );
}

// ─── ADVANCED COACH-DRIVEN STATS DERIVATION ENGINE ───────────────────────────
export function deriveClientAdvancedCoachStats(
  sportCategory: string,
  stats: any = {},
  workloadAnalytics?: any
): AdvancedCoachStats {
  const hasGames = Number(stats?.games_played || stats?.matches_played || 0) > 0;
  const hasPoints = Number(stats?.ppg || stats?.points || stats?.kills || stats?.wins || 0) > 0;
  const hasCoachLogs = Boolean(hasGames || hasPoints);

  if (!hasCoachLogs) {
    return {
      has_coach_logs: false,
      total_matches_logged: 0,
      sport: sportCategory || 'Basketball',
    };
  }

  const totalMatches = Math.max(1, Number(stats?.games_played || stats?.matches_played || 1));
  const upperSport = (sportCategory || 'BASKETBALL').toUpperCase();

  if (upperSport.includes('BASKETBALL') || upperSport.includes('HOOPS')) {
    const ppg = Number(stats.ppg ?? (stats.points ? stats.points / totalMatches : 18.0));
    const rpg = Number(stats.rpg ?? 6.0);
    const apg = Number(stats.apg ?? 4.0);
    const spg = Number(stats.spg ?? 1.5);
    const fgPct = Number(stats.fg_pct ?? 48.0);
    const ftPct = Number(stats.ft_pct ?? 78.0);

    const tsPct = Number(
      stats.true_shooting_pct ??
      stats.ts_pct ??
      (fgPct * 0.95 + ftPct * 0.15 > 0 ? Number((fgPct * 0.95 + ftPct * 0.15).toFixed(1)) : 56.8)
    );
    const usg = Number(
      stats.usage_rate ??
      stats.usg_pct ??
      Math.min(36, Math.max(16, Number((18 + (ppg * 0.45) + (apg * 0.35)).toFixed(1))))
    );
    const orebEst = Number(stats.oreb ?? (rpg * 0.3).toFixed(1));
    const drebEst = Number(stats.dreb ?? (rpg * 0.7).toFixed(1));
    const ratioVal = orebEst > 0 ? (drebEst / orebEst).toFixed(1) : '2.3';
    const ptsOffTo = Number(stats.points_off_turnovers ?? Number((spg * 1.8 + 2.2).toFixed(1)));
    const pmAvg = Number(stats.plus_minus ?? (ppg > 15 ? 7.8 : 3.4));
    const plusMinusStr = pmAvg >= 0 ? `+${pmAvg.toFixed(1)}` : pmAvg.toFixed(1);

    return {
      has_coach_logs: true,
      total_matches_logged: totalMatches,
      sport: 'Basketball',
      basketball: {
        true_shooting_pct: tsPct,
        usage_rate_pct: usg,
        off_def_rebound_ratio: `1 : ${ratioVal}`,
        points_off_turnovers: ptsOffTo,
        plus_minus: plusMinusStr,
      },
    };
  }

  if (upperSport.includes('VOLLEY') || upperSport.includes('VBALL')) {
    const kills = Number(stats.kills ?? stats.spike_kills ?? 14);
    const attempts = Number(stats.attack_attempts ?? (kills * 2.1));
    const killPct = attempts > 0 ? Number(((kills / attempts) * 100).toFixed(1)) : Number(stats.spike_accuracy ?? stats.kill_pct ?? 48.5);
    const passingAccuracy = Number(stats.passing_accuracy ?? stats.passing_pct ?? 74.0);
    const aces = Number(stats.service_aces ?? stats.aces ?? 3);
    const errors = Number(stats.service_errors ?? 2);
    const aceRatio = errors > 0 ? (aces / errors).toFixed(1) : (aces > 0 ? aces.toFixed(1) : '1.5');
    const digToKill = Number(stats.dig_to_kill_conversion ?? stats.dig_to_kill ?? 36.5);

    return {
      has_coach_logs: true,
      total_matches_logged: totalMatches,
      sport: 'Volleyball',
      volleyball: {
        kill_pct: killPct,
        passing_accuracy_pct: passingAccuracy,
        aces_to_errors_ratio: `${aceRatio} : 1`,
        dig_to_kill_conversion_pct: digToKill,
      },
    };
  }

  const eff = Number(stats.efficiency_pct ?? stats.consistency ?? 88);
  const wins = Number(stats.wins ?? 0);
  const consistencyPct = wins > 0
    ? Math.min(98, Math.max(72, Math.round(78 + (wins / totalMatches) * 18)))
    : Math.min(98, Math.max(68, eff));

  const acwr = Number(
    workloadAnalytics?.acute_load_7day_avg && workloadAnalytics?.chronic_load_28day_avg
      ? workloadAnalytics.acute_load_7day_avg / Math.max(1, workloadAnalytics.chronic_load_28day_avg)
      : 1.05
  );
  const srpeCorr = acwr >= 0.85 && acwr <= 1.25
    ? 'Optimal (+0.82)'
    : acwr > 1.25
      ? 'High Load Response (+0.68)'
      : 'Moderate Adaptation (+0.74)';

  const ratingScore = Number(stats.coach_rating ?? (consistencyPct >= 90 ? 9.2 : consistencyPct >= 80 ? 8.7 : 8.1));

  return {
    has_coach_logs: true,
    total_matches_logged: totalMatches,
    sport: sportCategory,
    general: {
      consistency_pct: consistencyPct,
      srpe_correlation: srpeCorr,
      coach_rating_trend: `${ratingScore.toFixed(1)} / 10 (+0.4 Trend)`,
      rating_score: ratingScore,
    },
  };
}

// ─── SPORT LAYOUT DERIVATION ENGINE ──────────────────────────────────────────
function deriveSportDashboardLayout(
  upperSport: string,
  rawSportName: string,
  analytics: any,
  rawPStats: any,
  rawPAverages: any,
  adminConfig?: any
) {
  const getRawNum = (key: string, fallback = 0) => {
    if (analytics[key] !== undefined && analytics[key] !== null) return Number(analytics[key]);
    if (rawPStats[key] !== undefined && rawPStats[key] !== null) return Number(rawPStats[key]);
    if (rawPAverages[key] !== undefined && rawPAverages[key] !== null) return Number(rawPAverages[key]);
    return fallback;
  };

  const getScoresList = (): number[] => {
    const rawList =
      (Array.isArray(analytics.last_5_games_scores) && analytics.last_5_games_scores.length > 0
        ? analytics.last_5_games_scores
        : Array.isArray(analytics.recent_swim_times) && analytics.recent_swim_times.length > 0
        ? analytics.recent_swim_times
        : Array.isArray(analytics.recent_track_marks) && analytics.recent_track_marks.length > 0
        ? analytics.recent_track_marks
        : Array.isArray(rawPStats.last_5_games_scores) && rawPStats.last_5_games_scores.length > 0
        ? rawPStats.last_5_games_scores
        : []) || [];

    return rawList
      .map((v: any) => (typeof v === "number" ? v : parseFloat(String(v))))
      .filter((s: number) => typeof s === "number" && !isNaN(s) && s > 0);
  };

  const scores = getScoresList();

  // 1. BADMINTON
  if (upperSport.includes("BADMINTON") || upperSport.includes("BADM")) {
    const smashWinners = getRawNum("smash_winners", getRawNum("points", 0));
    const netKills = getRawNum("net_kills", getRawNum("aces", 0));
    const unforcedErrors = getRawNum("unforced_errors", 0);
    const smashWinPct = getRawNum("smash_win_pct", getRawNum("win_rate", 0));
    const serviceFaults = getRawNum("service_faults", 0);
    const serveAccuracy = serviceFaults > 0 ? Math.max(0, 100 - serviceFaults * 5) : getRawNum("service_accuracy_pct", 0);

    return {
      badge: "BADMINTON",
      isTimed: false,
      metric1: {
        label: "SMASH WINNERS",
        value: smashWinners,
        subLabel: "Offensive Power",
        isLarge: true,
      },
      metric2: {
        label: "NET KILLS",
        value: netKills,
        subLabel: "Front Court Precision",
        isLarge: true,
      },
      secondaryMetric: {
        label: "UNFORCED ERRORS",
        value: unforcedErrors,
        subtext: "Total Match Faults",
        level: unforcedErrors === 0 ? 4 : Math.max(1, 4 - Math.floor(unforcedErrors / 3)),
      },
      efficiencySectionTitle: "SMASH & SERVE EFFICIENCY",
      efficiency1: {
        label: "Smash Win Rate %",
        value: smashWinPct,
      },
      efficiency2: {
        label: "Service Consistency %",
        value: serveAccuracy,
      },
      chartTitle: "LAST MATCH SCORES",
      chartPrefix: "M",
      scores,
    };
  }

  // 2. PICKLEBALL
  if (upperSport.includes("PICKLEBALL") || upperSport.includes("PICKLE")) {
    const pointsScored = getRawNum("points_scored", getRawNum("points", 0));
    const aces = getRawNum("aces", getRawNum("service_aces", 0));
    const dinks = getRawNum("dinks", 0);
    const dinkAcc = getRawNum("dink_accuracy_pct", 0);
    const thirdShotDrop = getRawNum("third_shot_drop_pct", 0);

    return {
      badge: "PICKLEBALL",
      isTimed: false,
      metric1: {
        label: "POINTS SCORED",
        value: pointsScored,
        subLabel: "Match Scoring",
        isLarge: true,
      },
      metric2: {
        label: "SERVICE ACES",
        value: aces,
        subLabel: "Direct Ace Serves",
        isLarge: true,
      },
      secondaryMetric: {
        label: "SUCCESSFUL DINKS",
        value: dinks,
        subtext: "Kitchen Control Shots",
        level: dinks > 0 ? Math.min(4, Math.ceil(dinks / 5)) : 1,
      },
      efficiencySectionTitle: "RALLY & DINK EFFICIENCY",
      efficiency1: {
        label: "Dink Placement Accuracy",
        value: dinkAcc,
      },
      efficiency2: {
        label: "3rd Shot Drop Success",
        value: thirdShotDrop,
      },
      chartTitle: "LAST MATCH SCORES",
      chartPrefix: "M",
      scores,
    };
  }

  // 3. VOLLEYBALL
  if (upperSport.includes("VOLLEYBALL") || upperSport.includes("VOLLEY")) {
    const spikeKills = getRawNum("spike_kills", getRawNum("kills", 0));
    const blockPoints = getRawNum("block_points", getRawNum("blocks", 0));
    const digs = getRawNum("digs", 0);
    const killPct = getRawNum("kill_pct", getRawNum("attack_efficiency", 0));
    const serviceAces = getRawNum("service_aces", 0);
    const servePct = serviceAces > 0 ? Math.min(100, serviceAces * 15) : getRawNum("serve_pct", 0);

    return {
      badge: "VOLLEYBALL",
      isTimed: false,
      metric1: {
        label: "SPIKE KILLS",
        value: spikeKills,
        subLabel: "Offensive Attacks",
        isLarge: true,
      },
      metric2: {
        label: "BLOCK POINTS",
        value: blockPoints,
        subLabel: "Net Defense",
        isLarge: true,
      },
      secondaryMetric: {
        label: "DIGS & RECEPTIONS",
        value: digs,
        subtext: "Backcourt Defense",
        level: digs > 0 ? Math.min(4, Math.ceil(digs / 4)) : 1,
      },
      efficiencySectionTitle: "ATTACK & SERVE EFFICIENCY",
      efficiency1: {
        label: "Kill Percentage %",
        value: killPct,
      },
      efficiency2: {
        label: "Service Ace Accuracy",
        value: servePct,
      },
      chartTitle: "LAST SET SCORES",
      chartPrefix: "S",
      scores,
    };
  }

  // 4. SWIMMING
  if (upperSport.includes("SWIM")) {
    const formatTime = (v: any) => {
      if (!v || v === 0) return "00.00s";
      if (typeof v === "number") return `${(v > 1000 ? v / 1000 : v).toFixed(2)}s`;
      return String(v).endsWith("s") ? String(v) : `${v}s`;
    };

    const bestTime = formatTime(analytics.best_time_formatted || analytics.best_time || analytics.finish_time_ms || rawPStats.finish_time_ms || 0);
    const splitTime = formatTime(analytics.split_time_formatted || analytics.split_time || analytics.reaction_time_ms || rawPStats.reaction_time_ms || 0);
    const distanceM = Number(analytics.total_distance_m ?? analytics.lap_count ?? rawPStats.total_distance_m ?? 0);
    const turnEff = Number(analytics.turn_efficiency_pct ?? rawPStats.turn_efficiency_pct ?? 0);
    const strokeEff = Number(analytics.stroke_efficiency_pct ?? rawPStats.stroke_efficiency_pct ?? 0);

    return {
      badge: "SWIMMING",
      isTimed: true,
      metric1: {
        label: "BEST TIME",
        value: bestTime,
        subLabel: "Fastest Finish",
        isLarge: false,
      },
      metric2: {
        label: "SPLIT TIME",
        value: splitTime,
        subLabel: "Top Interval",
        isLarge: false,
      },
      secondaryMetric: {
        label: "TOTAL DISTANCE & LAPS",
        value: distanceM > 0 ? distanceM.toLocaleString() : 0,
        subtext: "Meters Swam",
        level: distanceM > 0 ? Math.min(4, Math.ceil(distanceM / 250)) : 1,
      },
      efficiencySectionTitle: "STROKE & TURN EFFICIENCY",
      efficiency1: {
        label: "Turn & Breakout Rating",
        value: turnEff,
      },
      efficiency2: {
        label: "Stroke Rate Consistency",
        value: strokeEff,
      },
      chartTitle: "RECENT RACE FINISHES",
      chartPrefix: "R",
      scores,
    };
  }

  // 5. TRACK & FIELD / ATHLETICS
  if (upperSport.includes("TRACK") || upperSport.includes("FIELD") || upperSport.includes("ATHLETIC")) {
    const formatTime = (v: any) => {
      if (!v || v === 0) return "00.00s";
      if (typeof v === "number") return `${(v > 1000 ? v / 1000 : v).toFixed(2)}s`;
      return String(v).endsWith("s") ? String(v) : `${v}s`;
    };

    const sprintTime = formatTime(analytics.top_sprint_formatted || analytics.top_sprint_time || analytics.finish_time_ms || rawPStats.finish_time_ms || 0);
    const topDist = analytics.top_distance_m || rawPStats.top_distance_m || 0;
    const topDistStr = typeof topDist === "number" && topDist > 0 ? `${topDist.toFixed(2)}m` : "0.00m";
    const avgPace = analytics.average_pace || rawPStats.average_pace || "0:00";
    const topSpeedPct = getRawNum("top_speed_pct", 0);
    const pacingConsistency = getRawNum("pacing_consistency_pct", 0);

    return {
      badge: "TRACK & FIELD",
      isTimed: true,
      metric1: {
        label: "TOP SPRINT",
        value: sprintTime,
        subLabel: "Fastest Mark",
        isLarge: false,
      },
      metric2: {
        label: "TOP DISTANCE",
        value: topDistStr,
        subLabel: "Best Jump / Throw",
        isLarge: false,
      },
      secondaryMetric: {
        label: "AVERAGE PACE / SPLIT",
        value: avgPace,
        subtext: "Min / Km",
        level: avgPace !== "0:00" ? 3 : 1,
      },
      efficiencySectionTitle: "SPRINT ACCELERATION & EFFICIENCY",
      efficiency1: {
        label: "Top Speed Maintenance",
        value: topSpeedPct,
      },
      efficiency2: {
        label: "Pacing Consistency",
        value: pacingConsistency,
      },
      chartTitle: "RECENT EVENT PERFORMANCE",
      chartPrefix: "E",
      scores,
    };
  }

  // 6. SOCCER / FOOTBALL
  if (upperSport.includes("SOCCER") || upperSport.includes("FOOTBALL")) {
    const goals = getRawNum("goals", getRawNum("points", 0));
    const assists = getRawNum("assists", 0);
    const shotsOnTarget = getRawNum("shots_on_target", 0);
    const passAcc = getRawNum("pass_accuracy_pct", 0);
    const shotConv = getRawNum("shot_conversion_pct", 0);

    return {
      badge: "SOCCER",
      isTimed: false,
      metric1: {
        label: "GOALS SCORED",
        value: goals,
        subLabel: "Match Finishing",
        isLarge: true,
      },
      metric2: {
        label: "ASSISTS",
        value: assists,
        subLabel: "Key Passes",
        isLarge: true,
      },
      secondaryMetric: {
        label: "SHOTS ON TARGET",
        value: shotsOnTarget,
        subtext: "Per Match",
        level: shotsOnTarget > 0 ? Math.min(4, shotsOnTarget) : 1,
      },
      efficiencySectionTitle: "PASSING & SHOOTING ACCURACY",
      efficiency1: {
        label: "Pass Accuracy %",
        value: passAcc,
      },
      efficiency2: {
        label: "Shot Conversion %",
        value: shotConv,
      },
      chartTitle: "LAST MATCH SCORES",
      chartPrefix: "M",
      scores,
    };
  }

  // 7. BASKETBALL
  if (upperSport.includes("BASKETBALL") || upperSport.includes("HOOPS")) {
    const bballPoints = getRawNum("points_per_game", getRawNum("ppg", 0));
    const bballAssists = getRawNum("assists_per_game", getRawNum("apg", 0));
    const bballRebounds = getRawNum("rebounds_per_game", getRawNum("rpg", 0));
    const bballFgPct = getRawNum("field_goal_percentage", getRawNum("fg_pct", 0));
    const bballFtPct = getRawNum("free_throw_percentage", getRawNum("ft_pct", 0));

    return {
      badge: "BASKETBALL",
      isTimed: false,
      metric1: {
        label: "POINTS / GAME",
        value: bballPoints,
        subLabel: "Scoring Average",
        isLarge: true,
      },
      metric2: {
        label: "ASSISTS",
        value: bballAssists,
        subLabel: "Playmaking",
        isLarge: true,
      },
      secondaryMetric: {
        label: "REBOUNDS AVG",
        value: bballRebounds,
        subtext: "Per Game",
        level: bballRebounds > 0 ? Math.min(4, Math.ceil(bballRebounds / 2)) : 1,
      },
      efficiencySectionTitle: "SHOOTING EFFICIENCY",
      efficiency1: {
        label: "Field Goal %",
        value: bballFgPct,
      },
      efficiency2: {
        label: "Free Throw %",
        value: bballFtPct,
      },
      chartTitle: "LAST GAMES",
      chartPrefix: "G",
      scores,
    };
  }

  // 8. DYNAMIC FALLBACK FOR ANY OTHER ADMIN-CREATED SPORT
  const statsList = Array.isArray(adminConfig?.configurable_stats) ? adminConfig.configurable_stats : [];
  const stat1 = statsList[0];
  const stat2 = statsList[1];
  const stat3 = statsList[2];
  const pctStats = statsList.filter((s: any) => s.measurement_category === "Percentage");

  const stat1Key = stat1?.stat_name_key || "points";
  const stat1Label = (stat1?.label || stat1Key.replace(/_/g, " ")).toUpperCase();
  const stat1Val = getRawNum(stat1Key, 0);

  const stat2Key = stat2?.stat_name_key || "assists";
  const stat2Label = (stat2?.label || stat2Key.replace(/_/g, " ")).toUpperCase();
  const stat2Val = getRawNum(stat2Key, 0);

  const stat3Key = stat3?.stat_name_key || "performance";
  const stat3Label = (stat3?.label || stat3Key.replace(/_/g, " ")).toUpperCase();
  const stat3Val = getRawNum(stat3Key, 0);

  const pct1 = pctStats[0];
  const pct2 = pctStats[1];

  return {
    badge: (rawSportName || "ATHLETICS").toUpperCase(),
    isTimed: Boolean(adminConfig?.is_timed_sport),
    metric1: {
      label: stat1Label,
      value: stat1Val,
      subLabel: "Primary Performance",
      isLarge: true,
    },
    metric2: {
      label: stat2Label,
      value: stat2Val,
      subLabel: "Secondary Performance",
      isLarge: true,
    },
    secondaryMetric: {
      label: stat3Label,
      value: stat3Val,
      subtext: "Overall Consistency",
      level: stat3Val > 0 ? Math.min(4, Math.ceil(stat3Val / 2)) : 1,
    },
    efficiencySectionTitle: pct1 || pct2 ? "PERFORMANCE EFFICIENCY" : "",
    efficiency1: pct1 ? {
      label: pct1.label || pct1.stat_name_key.replace(/_/g, " "),
      value: getRawNum(pct1.stat_name_key, 0),
    } : undefined,
    efficiency2: pct2 ? {
      label: pct2.label || pct2.stat_name_key.replace(/_/g, " "),
      value: getRawNum(pct2.stat_name_key, 0),
    } : undefined,
    chartTitle: "LAST MATCH SCORES",
    chartPrefix: "M",
    scores,
  };
}

function HomeSkeletonLoader() {
  return (
    <ScrollView
      style={styles.dashboardContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.skeletonPill, { width: 110, height: 28 }]} />
      <View style={[styles.skeletonPill, { width: 220, height: 32, marginTop: 16 }]} />
      <View style={[styles.skeletonPill, { width: 60, height: 4, marginTop: 6, marginBottom: 20 }]} />

      <View style={styles.metricsGridRow}>
        <View style={[styles.metricCard, styles.skeletonCard]} />
        <View style={[styles.metricCard, styles.skeletonCard]} />
      </View>
      <View style={[styles.secondaryMetricCard, styles.skeletonCard, { height: 74, marginTop: 12 }]} />
      <View style={[styles.graphCard, styles.skeletonCard, { height: 180, marginTop: 24 }]} />
      <View style={[styles.teamCardContainer, styles.skeletonCard, { height: 200, marginTop: 24 }]} />
    </ScrollView>
  );
}

export const AthleteHomePage = HomeAnalyticsPage;
export const AthleteAnalyticsPage = HomeAnalyticsPage;

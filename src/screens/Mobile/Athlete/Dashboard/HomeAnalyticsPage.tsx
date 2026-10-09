import React, { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import styles from "./styles/HomeAnalyticsPage";
import { Coach } from "../Teams/Teams";
import { getSportsOfflineFirst } from "../../../../services/firebaseClient";

export interface TeamAffiliation {
  team_id: string;
  team_name: string;
  sport_type: string;
  division?: string;
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
  [key: string]: any;
}

interface HomeAnalyticsPageProps {
  profile: AthleteProfile;
  loading?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToCoaches?: () => void;
  onNavigateToTeamProfile?: () => void;
}

export function HomeAnalyticsPage({
  profile,
  loading = false,
  onNavigateToProfile,
  onNavigateToCoaches,
  onNavigateToTeamProfile,
}: HomeAnalyticsPageProps) {
  const [dynamicSports, setDynamicSports] = useState<any[]>([]);

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

  // Resolve active sport name
  const rawSportName = String(
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

  // Build Sport Layout Config
  const layout = deriveSportDashboardLayout(upperSport, rawSportName, analytics, rawPStats, rawPAverages, matchedAdminSport);

  const activeScores = layout.scores || [];
  const maxScore = activeScores.length > 0 ? Math.max(...activeScores, 0) : 0;

  return (
    <ScrollView
      style={styles.dashboardContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
    >
      {/* Category / Sport Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{layout.badge}</Text>
      </View>

      {/* Section Heading */}
      <View style={styles.sectionHeadingContainer}>
        <Text style={styles.mainTitle}>Personal Analytics</Text>
        <View style={styles.activeUnderline} />
      </View>

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
        <View style={styles.reboundsLevelIndicator}>
          {[1, 2, 3, 4].map((barIndex) => {
            const isActive = barIndex <= layout.secondaryMetric.level;
            return (
              <View
                key={barIndex}
                style={[
                  styles.levelBar,
                  isActive ? styles.levelBarActive : styles.levelBarInactive,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* --- SPORT-SPECIFIC EFFICIENCY / ACCURACY SECTION --- */}
      {layout.efficiencySectionTitle ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.cyanAccentBar} />
            <Text style={styles.sectionTitleText}>{layout.efficiencySectionTitle}</Text>
          </View>

          {/* Efficiency Metric 1 */}
          {layout.efficiency1 && (
            <View style={styles.progressItem}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabelText}>{layout.efficiency1.label}</Text>
                <Text style={styles.progressValueText}>{layout.efficiency1.value}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(0, layout.efficiency1.value))}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Efficiency Metric 2 */}
          {layout.efficiency2 && (
            <View style={styles.progressItem}>
              <View style={styles.progressHeaderRow}>
                <Text style={styles.progressLabelText}>{layout.efficiency2.label}</Text>
                <Text style={styles.progressValueText}>{layout.efficiency2.value}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(0, layout.efficiency2.value))}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* --- SPORT-SPECIFIC PERFORMANCE CHART --- */}
      <View style={styles.graphCard}>
        <Text style={styles.graphSubHeading}>{layout.chartTitle}</Text>
        {activeScores.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "600" }}>
              No recent match records logged yet.
            </Text>
          </View>
        ) : (
          <View style={styles.barsContainer}>
            {activeScores.map((score, index) => {
              const isMostRecent = index === activeScores.length - 1;
              const barHeightPct =
                maxScore > 0 && score > 0
                  ? Math.max(15, Math.min(100, (score / maxScore) * 85))
                  : 15;
              return (
                <View key={index} style={styles.barColumn}>
                  <Text style={[styles.scoreBadgeText, isMostRecent && { color: "#38BDF8", fontWeight: "900" }]}>
                    {score}
                  </Text>
                  <View style={styles.barTrackArea}>
                    <View
                      style={[
                        styles.graphPillBar,
                        { height: `${barHeightPct}%` },
                        isMostRecent ? styles.graphPillBarHighest : styles.graphPillBarNormal,
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.gameLabelText,
                      isMostRecent && styles.gameLabelTextHighest,
                    ]}
                  >
                    {layout.chartPrefix}{index + 1}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

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
                <View style={styles.groupIconWrapper}>
                  <Image
                    source={require("../../../../assets/groupprofile.png")}
                    style={styles.groupIconImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.teamNameText}>{team.team_name}</Text>
              </View>

              {/* Coach */}
              <View style={styles.coachSectionWrapper}>
                <Text style={styles.coachLabelHeader}>COACH</Text>
                <View style={styles.coachInnerCard}>
                  <View style={styles.coachAvatarWrapper}>
                    <Image
                      source={require("../../../../assets/profile.png")}
                      style={styles.coachAvatarImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.coachInfoTextGroup}>
                    <Text style={styles.coachNameText}>
                      {team.head_coach.full_name}
                    </Text>
                    <Text style={styles.coachRoleText}>
                      {team.head_coach.role_title}
                    </Text>
                  </View>
                </View>
              </View>

              {/* View Full Team Profile Button */}
              <Pressable
                style={styles.viewTeamButton}
                onPress={() =>
                  onNavigateToTeamProfile
                    ? onNavigateToTeamProfile()
                    : onNavigateToProfile && onNavigateToProfile()
                }
              >
                <Text style={styles.viewTeamButtonText}>
                  View Full Team Profile
                </Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.noTeamContainer}>
              <Text style={styles.noTeamTitle}>No Team Joined</Text>
              <Text style={styles.noTeamSubtext}>
                You are currently not affiliated with any athletic team program.
              </Text>
              <Pressable
                style={styles.joinTeamButton}
                onPress={() => onNavigateToCoaches && onNavigateToCoaches()}
              >
                <Text style={styles.joinTeamButtonText}>JOIN TEAM</Text>
              </Pressable>

              {/* Preview Button */}
              <Pressable
                style={styles.devTestButton}
                onPress={() =>
                  onNavigateToTeamProfile && onNavigateToTeamProfile()
                }
              >
                <Text style={styles.devTestButtonText}>
                  Preview Team Profile UI
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
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

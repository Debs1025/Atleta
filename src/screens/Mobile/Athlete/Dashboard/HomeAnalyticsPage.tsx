import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import styles from "./styles/HomeAnalyticsPage";

import { Coach } from "../Teams/Teams";

export interface TeamAffiliation {
  team_id: string;
  team_name: string;
  sport_type: "BASKETBALL" | "SWIMMING" | "TRACK AND FIELD" | "TRACK & FIELD" | string;
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
  attempt_success_pct?: number;
  reaction_efficiency_pct?: number;
  recent_track_marks?: (number | string)[];
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
  category: "BASKETBALL" | "SWIMMING" | "TRACK AND FIELD" | "TRACK & FIELD" | string;
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
}

interface HomeAnalyticsPageProps {
  profile: AthleteProfile;
  loading?: boolean;
  onNavigateToProfile?: () => void;
  onNavigateToCoaches?: () => void;
  onNavigateToTeamProfile?: () => void;
}

// API Request: data comes from GET /api/athlete/analytics
export function HomeAnalyticsPage({
  profile,
  loading = false,
  onNavigateToProfile,
  onNavigateToCoaches,
  onNavigateToTeamProfile,
}: HomeAnalyticsPageProps) {
  if (loading) {
    return <HomeSkeletonLoader />;
  }

  const category = profile?.category || "BASKETBALL";
  const normSport = String(category).toUpperCase().trim();
  const isSwimming = normSport.includes("SWIM");
  const isTrackField = normSport.includes("TRACK") || normSport.includes("FIELD");
  const isBasketball = !isSwimming && !isTrackField;

  const team = profile?.current_affiliation || {
    team_id: "",
    team_name: "Unassigned Team",
    sport_type: category,
    head_coach: { coach_id: "", full_name: "No Coach Assigned", role_title: "Coach" },
    is_verified: false,
  };

  const analytics = profile?.analytics || {};

  // --- SPORT-SPECIFIC METRIC DERIVATIONS ---
  // 1. Basketball Metrics
  const bballPoints = Number(analytics.points_per_game ?? 0);
  const bballAssists = Number(analytics.assists_per_game ?? 0);
  const bballRebounds = Number(analytics.rebounds_per_game ?? 0);
  const bballFgPct = Number(analytics.field_goal_percentage ?? 0);
  const bballFtPct = Number(analytics.free_throw_percentage ?? 0);
  const bballScores =
    Array.isArray(analytics.last_5_games_scores) && analytics.last_5_games_scores.length > 0
      ? analytics.last_5_games_scores
      : [0, 0, 0, 0, 0];

  // 2. Swimming Metrics
  const swimBestTime =
    analytics.best_time_formatted ||
    (analytics.best_time
      ? typeof analytics.best_time === "number"
        ? `${analytics.best_time.toFixed(2)}s`
        : `${analytics.best_time}`
      : "00.00s");
  const swimSplitTime =
    analytics.split_time_formatted ||
    (analytics.split_time
      ? typeof analytics.split_time === "number"
        ? `${analytics.split_time.toFixed(2)}s`
        : `${analytics.split_time}`
      : "00.00s");
  const swimDistanceM = Number(analytics.total_distance_m ?? analytics.lap_count ?? 0);
  const swimTurnEff = Number(analytics.turn_efficiency_pct ?? analytics.field_goal_percentage ?? 0);
  const swimStrokeEff = Number(analytics.stroke_efficiency_pct ?? analytics.free_throw_percentage ?? 0);
  const rawSwimHistory =
    analytics.recent_swim_times && analytics.recent_swim_times.length > 0
      ? analytics.recent_swim_times
      : analytics.last_5_games_scores && analytics.last_5_games_scores.length > 0
      ? analytics.last_5_games_scores
      : [0, 0, 0, 0, 0];
  const swimScores = rawSwimHistory.map((v) =>
    typeof v === "number" ? v : parseFloat(String(v)) || 0
  );

  // 3. Track & Field Metrics
  const trackSprintTime =
    analytics.top_sprint_formatted ||
    (analytics.top_sprint_time
      ? typeof analytics.top_sprint_time === "number"
        ? `${analytics.top_sprint_time.toFixed(2)}s`
        : `${analytics.top_sprint_time}`
      : "00.00s");
  const trackTopDistance =
    typeof analytics.top_distance_m === "number" && analytics.top_distance_m > 0
      ? `${analytics.top_distance_m.toFixed(2)}m`
      : analytics.top_distance_m
      ? `${analytics.top_distance_m}m`
      : "0.00m";
  const trackAvgPace = analytics.average_pace || "0:00";
  const trackAttemptEff = Number(analytics.attempt_success_pct ?? analytics.field_goal_percentage ?? 0);
  const trackReactionEff = Number(analytics.reaction_efficiency_pct ?? analytics.free_throw_percentage ?? 0);
  const rawTrackHistory =
    analytics.recent_track_marks && analytics.recent_track_marks.length > 0
      ? analytics.recent_track_marks
      : analytics.last_5_games_scores && analytics.last_5_games_scores.length > 0
      ? analytics.last_5_games_scores
      : [0, 0, 0, 0, 0];
  const trackScores = rawTrackHistory.map((v) =>
    typeof v === "number" ? v : parseFloat(String(v)) || 0
  );

  // Active chart scores
  const activeScores = isSwimming
    ? swimScores
    : isTrackField
    ? trackScores
    : bballScores;
  const maxScore = Math.max(...activeScores, 0);

  return (
    <ScrollView
      style={styles.dashboardContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
    >
      {/* Category */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{category}</Text>
      </View>

      {/* Section Heading */}
      <View style={styles.sectionHeadingContainer}>
        <Text style={styles.mainTitle}>Personal Analytics</Text>
        <View style={styles.activeUnderline} />
      </View>

      {/* --- SPORT-SPECIFIC PRIMARY METRICS GRID --- */}
      {isSwimming ? (
        <View style={styles.metricsGridRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>BEST TIME</Text>
            <Text style={styles.metricValueMedium}>{swimBestTime}</Text>
            <Text style={styles.metricSubLabel}>Fastest Finish</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>SPLIT TIME</Text>
            <Text style={styles.metricValueMedium}>{swimSplitTime}</Text>
            <Text style={styles.metricSubLabel}>Top Interval</Text>
          </View>
        </View>
      ) : isTrackField ? (
        <View style={styles.metricsGridRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOP SPRINT</Text>
            <Text style={styles.metricValueMedium}>{trackSprintTime}</Text>
            <Text style={styles.metricSubLabel}>Fastest Mark</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TOP DISTANCE</Text>
            <Text style={styles.metricValueMedium}>{trackTopDistance}</Text>
            <Text style={styles.metricSubLabel}>Best Jump / Throw</Text>
          </View>
        </View>
      ) : (
        <View style={styles.metricsGridRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>POINTS / GAME</Text>
            <Text style={styles.metricValueLarge}>{bballPoints}</Text>
            <Text style={styles.metricSubLabel}>Scoring Average</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>ASSISTS</Text>
            <Text style={styles.metricValueLarge}>{bballAssists}</Text>
            <Text style={styles.metricSubLabel}>Playmaking</Text>
          </View>
        </View>
      )}

      {/* --- SPORT-SPECIFIC SECONDARY METRIC CARD --- */}
      {isSwimming ? (
        <View style={styles.secondaryMetricCard}>
          <View style={styles.secondaryMetricLeft}>
            <Text style={styles.metricLabel}>TOTAL DISTANCE & LAPS</Text>
            <View style={styles.reboundsRow}>
              <Text style={styles.reboundsValue}>
                {swimDistanceM > 0 ? swimDistanceM.toLocaleString() : 0}
              </Text>
              <Text style={styles.reboundsSubtext}>Meters Swam</Text>
            </View>
          </View>
          <View style={styles.reboundsLevelIndicator}>
            {[1, 2, 3, 4].map((barIndex) => {
              const isActive =
                swimDistanceM > 0 && barIndex <= Math.min(4, Math.ceil(swimDistanceM / 250));
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
      ) : isTrackField ? (
        <View style={styles.secondaryMetricCard}>
          <View style={styles.secondaryMetricLeft}>
            <Text style={styles.metricLabel}>AVERAGE PACE / SPLIT</Text>
            <View style={styles.reboundsRow}>
              <Text style={styles.reboundsValue}>{trackAvgPace}</Text>
              <Text style={styles.reboundsSubtext}>Min / Km</Text>
            </View>
          </View>
          <View style={styles.reboundsLevelIndicator}>
            {[1, 2, 3, 4].map((barIndex) => {
              const isActive = barIndex <= (trackAvgPace !== "0:00" ? 3 : 1);
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
      ) : (
        <View style={styles.secondaryMetricCard}>
          <View style={styles.secondaryMetricLeft}>
            <Text style={styles.metricLabel}>REBOUNDS AVG</Text>
            <View style={styles.reboundsRow}>
              <Text style={styles.reboundsValue}>{bballRebounds}</Text>
              <Text style={styles.reboundsSubtext}>Per Game</Text>
            </View>
          </View>
          <View style={styles.reboundsLevelIndicator}>
            {[1, 2, 3, 4].map((barIndex) => {
              const isActive =
                bballRebounds > 0 && barIndex <= Math.min(4, Math.ceil(bballRebounds / 2));
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
      )}

      {/* --- SPORT-SPECIFIC EFFICIENCY PROGRESS SECTION --- */}
      {isSwimming ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.cyanAccentBar} />
            <Text style={styles.sectionTitleText}>STROKE & TURN EFFICIENCY</Text>
          </View>

          {/* Turn & Breakout % */}
          <View style={styles.progressItem}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabelText}>Turn & Breakout Rating</Text>
              <Text style={styles.progressValueText}>{swimTurnEff}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, swimTurnEff))}%` },
                ]}
              />
            </View>
          </View>

          {/* Stroke Rate Consistency % */}
          <View style={styles.progressItem}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabelText}>Stroke Rate Consistency</Text>
              <Text style={styles.progressValueText}>{swimStrokeEff}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, swimStrokeEff))}%` },
                ]}
              />
            </View>
          </View>
        </View>
      ) : isTrackField ? (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.cyanAccentBar} />
            <Text style={styles.sectionTitleText}>TRACK & EVENT EFFICIENCY</Text>
          </View>

          {/* Attempt / Clearance Success % */}
          <View style={styles.progressItem}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabelText}>Attempt / Clearance Success</Text>
              <Text style={styles.progressValueText}>{trackAttemptEff}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, trackAttemptEff))}%` },
                ]}
              />
            </View>
          </View>

          {/* Reaction Time Accuracy % */}
          <View style={styles.progressItem}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabelText}>Reaction Time Accuracy</Text>
              <Text style={styles.progressValueText}>{trackReactionEff}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, trackReactionEff))}%` },
                ]}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.sectionBlock}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.cyanAccentBar} />
            <Text style={styles.sectionTitleText}>SHOOTING EFFICIENCY</Text>
          </View>

          {/* Field Goal % */}
          <View style={styles.progressItem}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabelText}>Field Goal %</Text>
              <Text style={styles.progressValueText}>{bballFgPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, bballFgPct))}%` },
                ]}
              />
            </View>
          </View>

          {/* Free Throw % */}
          <View style={styles.progressItem}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressLabelText}>Free Throw %</Text>
              <Text style={styles.progressValueText}>{bballFtPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.max(0, bballFtPct))}%` },
                ]}
              />
            </View>
          </View>
        </View>
      )}

      {/* --- SPORT-SPECIFIC PERFORMANCE CHART --- */}
      <View style={styles.graphCard}>
        <Text style={styles.graphSubHeading}>
          {isSwimming
            ? "RECENT RACE FINISHES"
            : isTrackField
            ? "RECENT EVENT PERFORMANCE"
            : "LAST GAMES"}
        </Text>
        <View style={styles.barsContainer}>
          {activeScores.map((score, index) => {
            const isMostRecent = index === activeScores.length - 1;
            const barHeightPct =
              maxScore > 0 && score > 0
                ? Math.max(15, Math.min(100, (score / maxScore) * 85))
                : 10;
            const prefix = isSwimming ? "R" : isTrackField ? "E" : "G";
            return (
              <View key={index} style={styles.barColumn}>
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
                  {prefix}{index + 1}
                </Text>
              </View>
            );
          })}
        </View>
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

              {/* TEMPORARY DEV TEST BUTTON TO PREVIEW TEAM PROFILE UI */}
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



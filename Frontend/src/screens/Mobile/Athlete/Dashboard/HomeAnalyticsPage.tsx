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
  sport_type: "BASKETBALL" | "SWIMMING" | "TRACK AND FIELD";
  division?: string;
  head_coach: Coach;
  is_verified: boolean;
}

export interface AthleteAnalytics {
  points_per_game: number;
  assists_per_game: number;
  rebounds_per_game: number;
  field_goal_percentage: number;
  free_throw_percentage: number;
  last_5_games_scores: number[];
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
  category: "BASKETBALL" | "SWIMMING" | "TRACK AND FIELD";
  height_cm: number;
  weight_kg: number;
  wingspan_cm: number;
  recruitment_status?: string;
  leaderboard_rank?: number | string;
  achievements?: string[];
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
  const team = profile?.current_affiliation || {
    team_id: "",
    team_name: "Unassigned Team",
    sport_type: category,
    head_coach: { coach_id: "", full_name: "No Coach Assigned", role_title: "Coach" },
    is_verified: false,
  };

  // Default performance metrics
  const analytics = profile?.analytics || {
    points_per_game: 0,
    assists_per_game: 0,
    rebounds_per_game: 0,
    field_goal_percentage: 0,
    free_throw_percentage: 0,
    last_5_games_scores: [0, 0, 0, 0, 0],
  };

  const points = analytics.points_per_game ?? 0;
  const assists = analytics.assists_per_game ?? 0;
  const rebounds = analytics.rebounds_per_game ?? 0;
  const fgPct = analytics.field_goal_percentage ?? 0;
  const ftPct = analytics.free_throw_percentage ?? 0;

  const rawScores = analytics.last_5_games_scores;
  const scores = rawScores && rawScores.length > 0 ? rawScores : [0, 0, 0, 0, 0];
  const maxScore = Math.max(...scores, 0);

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

      {/* Metrics */}
      <View style={styles.metricsGridRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>POINTS / GAME</Text>
          <Text style={styles.metricValueLarge}>{points}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ASSISTS</Text>
          <Text style={styles.metricValueLarge}>{assists}</Text>
        </View>
      </View>

      {/* Secondary Metrics */}
      <View style={styles.secondaryMetricCard}>
        <View style={styles.secondaryMetricLeft}>
          <Text style={styles.metricLabel}>REBOUNDS AVG</Text>
          <View style={styles.reboundsRow}>
            <Text style={styles.reboundsValue}>{rebounds}</Text>
            <Text style={styles.reboundsSubtext}>Per Game</Text>
          </View>
        </View>
        <View style={styles.reboundsLevelIndicator}>
          {[1, 2, 3, 4].map((barIndex) => {
            const isActive = rebounds > 0 && barIndex <= Math.min(4, Math.ceil(rebounds / 2));
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

      {/* Shooting Efficiency */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.cyanAccentBar} />
          <Text style={styles.sectionTitleText}>SHOOTING EFFICIENCY</Text>
        </View>

        {/* Field Goal % */}
        <View style={styles.progressItem}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabelText}>Field Goal %</Text>
            <Text style={styles.progressValueText}>{fgPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, fgPct))}%` },
              ]}
            />
          </View>
        </View>

        {/* Free Throw % */}
        <View style={styles.progressItem}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabelText}>Free Throw %</Text>
            <Text style={styles.progressValueText}>{ftPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, Math.max(0, ftPct))}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Last Games */}
      <View style={styles.graphCard}>
        <Text style={styles.graphSubHeading}>LAST GAMES</Text>
        <View style={styles.barsContainer}>
          {scores.map((score, index) => {
            const isMostRecent = index === scores.length - 1;
            const barHeightPct =
              maxScore > 0 && score > 0
                ? Math.max(15, Math.min(100, (score / maxScore) * 85))
                : 8;
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
                  G{index + 1}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* My Team */}
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


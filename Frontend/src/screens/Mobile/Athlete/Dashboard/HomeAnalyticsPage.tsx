import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export interface TeamAffiliation {
  team_id: string;
  team_name: string;
  sport_type: "BASKETBALL" | "SWIMMING" | "TRACK AND FIELD";
  division?: string;
  head_coach: {
    coach_id: string;
    full_name: string;
    role_title: string;
  };
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
  category: "BASKETBALL" | "SWIMMING" | "TRACK AND FIELD";
  height_cm: number;
  weight_kg: number;
  wingspan_cm: number;
  current_affiliation: TeamAffiliation;
  analytics?: AthleteAnalytics;
  eligible_documents?: EligibleDocument[];
}

interface HomeAnalyticsPageProps {
  profile: AthleteProfile;
  loading?: boolean;
  onNavigateToProfile?: () => void;
}

export function HomeAnalyticsPage({
  profile,
  loading = false,
  onNavigateToProfile,
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
            const isHighest = score > 0 && score === maxScore;
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
                      isHighest ? styles.graphPillBarHighest : styles.graphPillBarNormal,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.gameLabelText,
                    isHighest && styles.gameLabelTextHighest,
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
          {onNavigateToProfile && (
            <Pressable style={styles.viewTeamButton} onPress={onNavigateToProfile}>
              <Text style={styles.viewTeamButtonText}>View Full Team Profile</Text>
            </Pressable>
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

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    backgroundColor: "#080F21",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  categoryBadge: {
    backgroundColor: "#38BDF8",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: "flex-start",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryBadgeText: {
    color: "#080F21",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionHeadingContainer: {
    marginTop: 18,
    marginBottom: 20,
  },
  mainTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  activeUnderline: {
    width: 60,
    height: 3,
    backgroundColor: "#38BDF8",
    borderRadius: 2,
    marginTop: 6,
  },
  metricsGridRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#111C35",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E2C4A",
  },
  metricLabel: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  metricValueLarge: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  secondaryMetricCard: {
    backgroundColor: "#111C35",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E2C4A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  secondaryMetricLeft: {
    justifyContent: "center",
  },
  reboundsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  reboundsValue: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
  },
  reboundsSubtext: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
    opacity: 0.9,
  },
  reboundsLevelIndicator: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  levelBar: {
    width: 6,
    height: 24,
    borderRadius: 3,
  },
  levelBarActive: {
    backgroundColor: "#38BDF8",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  levelBarInactive: {
    backgroundColor: "#1C2A44",
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cyanAccentBar: {
    width: 3,
    height: 16,
    backgroundColor: "#38BDF8",
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitleText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  progressItem: {
    marginBottom: 14,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabelText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600",
  },
  progressValueText: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "900",
  },
  progressTrack: {
    height: 10,
    backgroundColor: "#15223D",
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E2C4A",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 5,
  },
  graphCard: {
    backgroundColor: "#111C35",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E2C4A",
    marginBottom: 26,
  },
  graphSubHeading: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1.2,
    marginBottom: 20,
  },
  barsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    paddingHorizontal: 8,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrackArea: {
    height: 90,
    width: 34,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  graphPillBar: {
    width: 34,
    borderRadius: 17,
  },
  graphPillBarNormal: {
    backgroundColor: "#1C2943",
  },
  graphPillBarHighest: {
    backgroundColor: "#00D2FF",
    shadowColor: "#00D2FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },
  gameLabelText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
  },
  gameLabelTextHighest: {
    color: "#38BDF8",
    fontWeight: "900",
  },
  teamCardContainer: {
    backgroundColor: "#111C35",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E2C4A",
  },
  teamHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  groupIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1A2846",
    justifyContent: "center",
    alignItems: "center",
  },
  groupIconImage: {
    width: 24,
    height: 24,
    tintColor: "#FFFFFF",
  },
  teamNameText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 14,
  },
  coachSectionWrapper: {
    marginBottom: 18,
  },
  coachLabelHeader: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  coachInnerCard: {
    backgroundColor: "#0B1327",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#182542",
  },
  coachAvatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1B2A48",
    justifyContent: "center",
    alignItems: "center",
  },
  coachAvatarImage: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },
  coachInfoTextGroup: {
    marginLeft: 12,
  },
  coachNameText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  coachRoleText: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 1,
  },
  viewTeamButton: {
    backgroundColor: "#152441",
    borderWidth: 1,
    borderColor: "#25375B",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  viewTeamButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  skeletonPill: {
    backgroundColor: "#16233E",
    borderRadius: 8,
  },
  skeletonCard: {
    backgroundColor: "#132039",
    opacity: 0.7,
  },
});

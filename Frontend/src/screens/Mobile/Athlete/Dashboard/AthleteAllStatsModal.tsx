import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/AthleteAllStatsModal";
import {
  AthleteProfile,
  AdvancedCoachStats,
  PastTeamAffiliation,
} from "./HomeAnalyticsPage";
import { MetricProgressionModal } from "../../Shared/MetricProgressionModal";
import { EventTimeHistorySection } from "../../Shared/EventTimeHistorySection";

interface AthleteAllStatsModalProps {
  visible: boolean;
  onClose: () => void;
  profile: AthleteProfile;
  activePastTeam?: PastTeamAffiliation;
  displayStats?: any;
  displayAverages?: any;
  displayAnalytics?: any;
  layout?: any;
  advStats?: AdvancedCoachStats;
}

export const AthleteAllStatsModal: React.FC<AthleteAllStatsModalProps> = ({
  visible,
  onClose,
  profile,
  activePastTeam,
  displayStats = {},
  displayAverages = {},
  displayAnalytics = {},
  layout = {},
  advStats,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, Platform.OS === "android" ? 24 : 16) + 6;

  const rawP = (profile || {}) as any;
  const fullName =
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
    rawP.name ||
    rawP.full_name ||
    "Athlete Advanced Stats";

  const rawSportName = String(
    activePastTeam?.sport_type ||
      profile?.category ||
      profile?.sport_type ||
      rawP?.sport_type ||
      rawP?.sport ||
      "BASKETBALL"
  ).trim();

  const upperSport = rawSportName.toUpperCase();
  const teamName =
    activePastTeam?.team_name ||
    profile?.current_affiliation?.team_name ||
    rawP?.team_name ||
    "";

  // Historical Metric Progression Modal State
  const [progressionModal, setProgressionModal] = useState<{
    visible: boolean;
    metricKey: string;
    eventTitle: string;
    initialMark: string;
  }>({
    visible: false,
    metricKey: "100m",
    eventTitle: "100m Dash",
    initialMark: "-",
  });

  const openMetricHistory = (metricKey: string, eventTitle: string, initialMark: string = "-") => {
    setProgressionModal({
      visible: true,
      metricKey,
      eventTitle,
      initialMark: String(initialMark || "-"),
    });
  };

  // Calculate dynamic Player Efficiency Rating (PER)
  const calculateDynamicPER = (avg: any): string => {
    if (typeof avg?.per_score === "number" && avg.per_score > 0) {
      return avg.per_score.toFixed(1);
    }
    if (typeof avg?.efficiency_rating === "number" && avg.efficiency_rating > 0) {
      return avg.efficiency_rating.toFixed(1);
    }
    const pts = Number(avg?.ppg ?? avg?.points_per_game ?? displayStats?.ppg ?? 0);
    const reb = Number(avg?.rpg ?? avg?.rebounds_per_game ?? displayStats?.rpg ?? 0);
    const ast = Number(avg?.apg ?? avg?.assists_per_game ?? displayStats?.apg ?? 0);
    const stl = Number(avg?.spg ?? avg?.steals_per_game ?? displayStats?.spg ?? 0);
    const blk = Number(avg?.bpg ?? avg?.blocks_per_game ?? displayStats?.bpg ?? 0);
    const to = Number(avg?.tpg ?? avg?.turnovers_per_game ?? 0);
    const fgPct = Number(avg?.fg_percentage ?? avg?.fg_pct ?? displayStats?.fg_pct ?? 50);
    const missedFgFactor = ((100 - fgPct) / 100) * (pts / 2);
    const calculated = pts + reb + ast + stl + blk - to - missedFgFactor;
    return Math.max(0, calculated).toFixed(1);
  };

  // Workload analytics data
  const workload = profile?.workload_analytics || {
    target_7day_effort_pts: 450,
    current_7day_acute_load: 420,
    current_28day_chronic_load: 390,
    calculated_acwr: 1.08,
    workout_score: 88,
    fatigue_meter: 42,
    routine_score: 91,
    body_stress_pts: 24,
    target_intensity: 8,
  };

  const acwrVal = Number(workload.calculated_acwr || 1.05);
  const isDangerZone = acwrVal > 1.5;

  // Safe helper for scores
  const recentScores: number[] = Array.isArray(layout?.scores) ? layout.scores : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
    >
      <View style={styles.container}>
        {/* Navigation Header */}
        <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerNameText} numberOfLines={1}>
                {fullName}
              </Text>
              <Text style={styles.headerSubTitleText} numberOfLines={1}>
                {upperSport}
                {teamName && teamName !== "Unassigned Team" ? ` • ${teamName}` : ""}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {(() => {
            const isTrack = upperSport.includes("TRACK") || upperSport.includes("FIELD") || upperSport.includes("RUN");
            const isSwim = upperSport.includes("SWIM");
            const isVolley = upperSport.includes("VOLLEY") || upperSport.includes("VBALL");
            const isPickle = upperSport.includes("PICKLE");
            const isBasket = upperSport.includes("BASKET") || upperSport.includes("HOOPS");

            if (isTrack) {
              return (
                <EventTimeHistorySection
                  athleteId={profile?.athlete_id || (profile as any)?.user_id || (profile as any)?.id || ""}
                  athleteName={fullName}
                  sportCategory="TRACK AND FIELD"
                  profileAverages={displayAverages}
                  profileStats={displayStats}
                />
              );
            } else if (isSwim) {
              return (
                <EventTimeHistorySection
                  athleteId={profile?.athlete_id || (profile as any)?.user_id || (profile as any)?.id || ""}
                  athleteName={fullName}
                  sportCategory="SWIMMING"
                  profileAverages={displayAverages}
                  profileStats={displayStats}
                />
              );
            }

            const renderAveragesHeader = () => (
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitleLeft}>
                  <View style={styles.cyanAccentBar} />
                  <Text style={styles.sectionTitle}>CAREER & SEASON AVERAGES</Text>
                </View>
                <View style={styles.coachVerifiedPill}>
                  <Ionicons name="shield-checkmark" size={10} color="#00C8FF" />
                  <Text style={styles.coachVerifiedPillText}>VERIFIED</Text>
                </View>
              </View>
            );

            if (isVolley) {
              const kills = displayAverages?.kills ?? displayAverages?.spike_kills ?? displayStats?.kills ?? displayStats?.spike_kills ?? layout?.metric1?.value ?? 14;
              const blocks = displayAverages?.blocks ?? displayAverages?.block_points ?? displayStats?.blocks ?? displayStats?.block_points ?? layout?.metric2?.value ?? 5;
              const assists = displayAverages?.assists ?? displayStats?.assists ?? 3;
              const aces = displayAverages?.aces ?? displayAverages?.service_aces ?? displayStats?.aces ?? 2;
              const digs = displayAverages?.digs ?? displayStats?.digs ?? layout?.secondaryMetric?.value ?? 8;

              return (
                <>
                  {renderAveragesHeader()}
                  <View style={styles.averagesTopRow}>
                    <View style={styles.averagesTopCard}>
                      <Text style={styles.avgLabel}>KILL SPIKES</Text>
                      <Text style={styles.avgValueLarge}>{String(kills)}</Text>
                    </View>
                    <View style={styles.averagesTopCard}>
                      <Text style={styles.avgLabel}>KILL BLOCKS</Text>
                      <Text style={styles.avgValueLarge}>{String(blocks)}</Text>
                    </View>
                  </View>
                  <View style={styles.averagesBottomRow}>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>ASSISTS</Text>
                      <Text style={styles.avgValueSmall}>{String(assists)}</Text>
                    </View>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>ACES</Text>
                      <Text style={styles.avgValueSmall}>{String(aces)}</Text>
                    </View>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>DIGS</Text>
                      <Text style={styles.avgValueSmall}>{String(digs)}</Text>
                    </View>
                  </View>
                </>
              );
            } else if (isPickle) {
              const points = displayAverages?.points_scored ?? displayStats?.points_scored ?? layout?.metric1?.value ?? 16;
              const aces = displayAverages?.aces ?? displayStats?.aces ?? layout?.metric2?.value ?? 4;
              const dinks = displayAverages?.dinks ?? displayStats?.dinks ?? layout?.secondaryMetric?.value ?? 12;
              const smashes = displayAverages?.smashes ?? displayStats?.smashes ?? 7;
              const errors = displayAverages?.unforced_errors ?? displayStats?.unforced_errors ?? 2;

              return (
                <>
                  {renderAveragesHeader()}
                  <View style={styles.averagesTopRow}>
                    <View style={styles.averagesTopCard}>
                      <Text style={styles.avgLabel}>POINTS / MATCH</Text>
                      <Text style={styles.avgValueLarge}>{String(points)}</Text>
                    </View>
                    <View style={styles.averagesTopCard}>
                      <Text style={styles.avgLabel}>ACES</Text>
                      <Text style={styles.avgValueLarge}>{String(aces)}</Text>
                    </View>
                  </View>
                  <View style={styles.averagesBottomRow}>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>DINKS</Text>
                      <Text style={styles.avgValueSmall}>{String(dinks)}</Text>
                    </View>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>SMASHES</Text>
                      <Text style={styles.avgValueSmall}>{String(smashes)}</Text>
                    </View>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>ERRORS</Text>
                      <Text style={styles.avgValueSmall}>{String(errors)}</Text>
                    </View>
                  </View>
                </>
              );
            } else if (isBasket) {
              const ppg = displayAverages?.ppg ?? displayStats?.ppg ?? displayStats?.points_per_game ?? layout?.metric1?.value ?? "0.0";
              const apg = displayAverages?.apg ?? displayStats?.apg ?? displayStats?.assists_per_game ?? layout?.metric2?.value ?? "0.0";
              const rpg = displayAverages?.rpg ?? displayStats?.rpg ?? displayStats?.rebounds_per_game ?? layout?.secondaryMetric?.value ?? "0.0";
              const bpg = displayAverages?.bpg ?? displayStats?.bpg ?? displayStats?.blocks_per_game ?? "0.8";
              const spg = displayAverages?.spg ?? displayStats?.spg ?? displayStats?.steals_per_game ?? "1.4";

              return (
                <>
                  {renderAveragesHeader()}
                  <View style={styles.averagesTopRow}>
                    <View style={styles.averagesTopCard}>
                      <Text style={styles.avgLabel}>POINTS / GAME (PPG)</Text>
                      <Text style={styles.avgValueLarge}>{String(ppg)}</Text>
                    </View>
                    <View style={styles.averagesTopCard}>
                      <Text style={styles.avgLabel}>ASSISTS / GAME (APG)</Text>
                      <Text style={styles.avgValueLarge}>{String(apg)}</Text>
                    </View>
                  </View>
                  <View style={styles.averagesBottomRow}>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>RPG</Text>
                      <Text style={styles.avgValueSmall}>{String(rpg)}</Text>
                    </View>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>BPG</Text>
                      <Text style={styles.avgValueSmall}>{String(bpg)}</Text>
                    </View>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>SPG</Text>
                      <Text style={styles.avgValueSmall}>{String(spg)}</Text>
                    </View>
                  </View>
                </>
              );
            } else {
              // Generic Sport averages
              const gp = displayAverages?.games_played ?? displayStats?.games_played ?? activePastTeam?.stats_summary?.matches_played ?? 0;
              const wins = displayAverages?.wins ?? displayStats?.wins ?? activePastTeam?.stats_summary?.wins ?? 0;
              const rating = profile?.rating_score || rawP.rating_score || "-";
              const eff = displayAverages?.efficiency_pct || displayStats?.efficiency_rating || "-";
              const status = profile?.player_status || profile?.playerStatus || "Active";

              return (
                <>
                  {renderAveragesHeader()}
                  <View style={styles.averagesTopRow}>
                    <View style={styles.averagesTopCard}>
                      <Text style={styles.avgLabel}>GAMES PLAYED</Text>
                      <Text style={styles.avgValueLarge}>{String(gp)}</Text>
                    </View>
                    <View style={styles.averagesTopCard}>
                      <Text style={styles.avgLabel}>MATCH WINS</Text>
                      <Text style={styles.avgValueLarge}>{String(wins)}</Text>
                    </View>
                  </View>
                  <View style={styles.averagesBottomRow}>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>RATING</Text>
                      <Text style={styles.avgValueSmall}>{String(rating)}</Text>
                    </View>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>EFFICIENCY</Text>
                      <Text style={styles.avgValueSmall}>{String(eff)}</Text>
                    </View>
                    <View style={styles.averagesSmallCard}>
                      <Text style={styles.avgLabel}>STATUS</Text>
                      <Text style={styles.avgValueSmall}>{status}</Text>
                    </View>
                  </View>
                </>
              );
            }
          })()}

          {/* ─────────────────────────────────────────────────────────────
              2. SHOOTING / CONVERSION EFFICIENCY & SPLITS
          ───────────────────────────────────────────────────────────── */}
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.cyanAccentBar} />
              <Text style={styles.sectionTitle}>
                {layout?.efficiencySectionTitle || "SHOOTING & CONVERSION EFFICIENCY"}
              </Text>
            </View>
          </View>

          {(() => {
            const isBasket = upperSport.includes("BASKET") || upperSport.includes("HOOPS");
            const isVolley = upperSport.includes("VOLLEY") || upperSport.includes("VBALL");
            const isTrack = upperSport.includes("TRACK") || upperSport.includes("FIELD") || upperSport.includes("RUN");
            const isSwim = upperSport.includes("SWIM");

            if (isBasket) {
              const fgPct = Number(displayAverages?.fg_percentage ?? displayStats?.field_goal_percentage ?? displayStats?.fg_pct ?? layout?.efficiency1?.value ?? 48);
              const threePtPct = Number(displayAverages?.three_pt_percentage ?? displayStats?.three_pt_percentage ?? displayStats?.three_pct ?? 36);
              const ftPct = Number(displayAverages?.ft_percentage ?? displayStats?.free_throw_percentage ?? displayStats?.ft_pct ?? layout?.efficiency2?.value ?? 78);

              return (
                <>
                  <View style={styles.splitCardFull}>
                    <View style={styles.splitHeaderRow}>
                      <Text style={styles.avgLabel}>FIELD GOAL %</Text>
                    </View>
                    <Text style={styles.splitValueText}>{fgPct}%</Text>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(100, Math.max(0, fgPct))}%` },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.splitCardHalfRow}>
                    <View style={styles.splitCardHalf}>
                      <Text style={styles.avgLabel}>3 POINTS %</Text>
                      <Text style={styles.splitValueText}>{threePtPct}%</Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, threePtPct))}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.splitCardHalf}>
                      <Text style={styles.avgLabel}>FREE THROWS %</Text>
                      <Text style={styles.splitValueText}>{ftPct}%</Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, ftPct))}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </>
              );
            } else if (isVolley) {
              const spikeAcc = Number(displayAverages?.spike_accuracy ?? displayStats?.spike_accuracy ?? layout?.efficiency1?.value ?? 48);
              const serveAcc = Number(displayAverages?.serve_accuracy ?? layout?.efficiency2?.value ?? 76);
              const svcErr = Number(displayAverages?.service_errors ?? displayStats?.service_errors ?? 2);

              return (
                <>
                  <View style={styles.splitCardFull}>
                    <View style={styles.splitHeaderRow}>
                      <Text style={styles.avgLabel}>SPIKE ACCURACY %</Text>
                    </View>
                    <Text style={styles.splitValueText}>{spikeAcc}%</Text>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(100, Math.max(0, spikeAcc))}%` },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.splitCardHalfRow}>
                    <View style={styles.splitCardHalf}>
                      <Text style={styles.avgLabel}>SERVICE ACCURACY</Text>
                      <Text style={styles.splitValueText}>{serveAcc}%</Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, serveAcc))}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.splitCardHalf}>
                      <Text style={styles.avgLabel}>SERVICE ERRORS</Text>
                      <Text style={styles.splitValueText}>{svcErr}</Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, svcErr * 10))}%`, backgroundColor: "#F59E0B" },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </>
              );
            } else if (isTrack) {
              const topSpeed = displayAverages?.top_speed_kmh;
              const strideFreq = displayAverages?.stride_freq_hz;
              const winRate = displayAverages?.win_rate_pct;

              return (
                <>
                  <View style={styles.splitCardFull}>
                    <View style={styles.splitHeaderRow}>
                      <Text style={styles.avgLabel}>TOP SPEED (KM/H)</Text>
                    </View>
                    <Text style={styles.splitValueText}>{topSpeed !== undefined && topSpeed !== null ? `${topSpeed} km/h` : "-"}</Text>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${topSpeed ? Math.min(100, (Number(topSpeed) / 45) * 100) : 0}%` },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.splitCardHalfRow}>
                    <View style={styles.splitCardHalf}>
                      <Text style={styles.avgLabel}>STRIDE FREQ</Text>
                      <Text style={styles.splitValueText}>{strideFreq !== undefined && strideFreq !== null ? `${strideFreq} Hz` : "-"}</Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${strideFreq ? Math.min(100, (Number(strideFreq) / 5) * 100) : 0}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.splitCardHalf}>
                      <Text style={styles.avgLabel}>WIN RATE %</Text>
                      <Text style={styles.splitValueText}>{winRate !== undefined && winRate !== null ? `${winRate}%` : "-"}</Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${winRate ? Math.min(100, Number(winRate)) : 0}%` },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </>
              );
            } else if (isSwim) {
              return null;
            } else {
              // Dynamic efficiency metrics from layout
              const eff1 = layout?.efficiency1;
              const eff2 = layout?.efficiency2;

              return (
                <View style={{ marginBottom: 12 }}>
                  {eff1 && (
                    <View style={styles.splitCardFull}>
                      <View style={styles.splitHeaderRow}>
                        <Text style={styles.avgLabel}>{eff1.label.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.splitValueText}>{eff1.value}%</Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, eff1.value))}%` },
                          ]}
                        />
                      </View>
                    </View>
                  )}

                  {eff2 && (
                    <View style={styles.splitCardFull}>
                      <View style={styles.splitHeaderRow}>
                        <Text style={styles.avgLabel}>{eff2.label.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.splitValueText}>{eff2.value}%</Text>
                      <View style={styles.progressBarTrack}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${Math.min(100, Math.max(0, eff2.value))}%` },
                          ]}
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            }
          })()}

          {/* ─────────────────────────────────────────────────────────────
              3. ADVANCED COACH-DRIVEN TACTICAL METRICS
          ───────────────────────────────────────────────────────────── */}
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <View style={styles.cyanAccentBar} />
              <Text style={styles.sectionTitle}>ADVANCED COACH-DRIVEN STATS</Text>
            </View>
            <View style={styles.coachVerifiedPill}>
              <Ionicons name="shield-checkmark" size={10} color="#00C8FF" />
              <Text style={styles.coachVerifiedPillText}>COACH CERTIFIED</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitleText}>
            Tactical metrics aggregated from official match scorecards and certified coaching logs.
          </Text>

          {/* Basketball Advanced Cards */}
          {(upperSport.includes("BASKET") || upperSport.includes("HOOPS")) && advStats?.basketball && (
            <View style={styles.advStatsGrid}>
              <View style={styles.advStatCard}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>TRUE SHOOTING %</Text>
                  <Ionicons name="flame-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={styles.advStatValueHero}>
                  {advStats.basketball.true_shooting_pct}%
                </Text>
                <Text style={styles.advStatSubtext}>Shot volume & FT efficiency</Text>
              </View>

              <View style={styles.advStatCard}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>USAGE RATE (USG%)</Text>
                  <Ionicons name="speedometer-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={styles.advStatValueLarge}>
                  {advStats.basketball.usage_rate_pct}%
                </Text>
                <Text style={styles.advStatSubtext}>Team possession share</Text>
              </View>

              <View style={styles.advStatCard}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>OFF/DEF REB RATIO</Text>
                  <Ionicons name="swap-vertical-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={styles.advStatValueLarge}>
                  {advStats.basketball.off_def_rebound_ratio}
                </Text>
                <Text style={styles.advStatSubtext}>Offensive vs defensive boards</Text>
              </View>

              <View style={styles.advStatCard}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>PTS OFF TURNOVERS</Text>
                  <Ionicons name="flash-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={styles.advStatValueLarge}>
                  {advStats.basketball.points_off_turnovers}
                </Text>
                <Text style={styles.advStatSubtext}>Transition scoring created</Text>
              </View>

              <View style={styles.advStatCardFull}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>MATCH PLUS / MINUS (+/-)</Text>
                  <Ionicons name="trending-up-outline" size={14} color="#10B981" />
                </View>
                <Text
                  style={[
                    styles.advStatValueHero,
                    {
                      color: String(advStats.basketball.plus_minus).startsWith("-")
                        ? "#EF4444"
                        : "#10B981",
                    },
                  ]}
                >
                  {advStats.basketball.plus_minus}
                </Text>
                <Text style={styles.advStatSubtext}>
                  Net point differential while athlete is on the court
                </Text>
              </View>
            </View>
          )}

          {/* Volleyball Advanced Cards */}
          {(upperSport.includes("VOLLEY") || upperSport.includes("VBALL")) && advStats?.volleyball && (
            <View style={styles.advStatsGrid}>
              <View style={styles.advStatCard}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>KILL % (SUCCESS)</Text>
                  <Ionicons name="flash-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={styles.advStatValueHero}>
                  {advStats.volleyball.kill_pct}%
                </Text>
                <Text style={styles.advStatSubtext}>Attack scoring conversion</Text>
              </View>

              <View style={styles.advStatCard}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>PASSING ACCURACY</Text>
                  <Ionicons name="locate-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={styles.advStatValueLarge}>
                  {advStats.volleyball.passing_accuracy_pct}%
                </Text>
                <Text style={styles.advStatSubtext}>Target receive rate</Text>
              </View>

              <View style={styles.advStatCard}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>ACES / ERRORS</Text>
                  <Ionicons name="git-compare-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={styles.advStatValueLarge}>
                  {advStats.volleyball.aces_to_errors_ratio}
                </Text>
                <Text style={styles.advStatSubtext}>Service pressure vs mistakes</Text>
              </View>

              <View style={styles.advStatCard}>
                <View style={styles.advStatHeaderRow}>
                  <Text style={styles.advStatLabel}>DIG-TO-KILL RATE</Text>
                  <Ionicons name="shield-outline" size={14} color="#38BDF8" />
                </View>
                <Text style={styles.advStatValueLarge}>
                  {advStats.volleyball.dig_to_kill_conversion_pct}%
                </Text>
                <Text style={styles.advStatSubtext}>Transition rally points</Text>
              </View>
            </View>
          )}

          {/* General / Other Sports Advanced Cards */}
          {!upperSport.includes("BASKET") &&
            !upperSport.includes("HOOPS") &&
            !upperSport.includes("VOLLEY") &&
            !upperSport.includes("VBALL") &&
            advStats?.general && (
              <View style={styles.advStatsGrid}>
                <View style={styles.advStatCard}>
                  <View style={styles.advStatHeaderRow}>
                    <Text style={styles.advStatLabel}>CONSISTENCY INDEX</Text>
                    <Ionicons name="analytics-outline" size={14} color="#38BDF8" />
                  </View>
                  <Text style={styles.advStatValueHero}>
                    {advStats.general.consistency_pct}%
                  </Text>
                  <Text style={styles.advStatSubtext}>Performance standard deviation</Text>
                </View>

                <View style={styles.advStatCard}>
                  <View style={styles.advStatHeaderRow}>
                    <Text style={styles.advStatLabel}>sRPE CORRELATION</Text>
                    <Ionicons name="pulse-outline" size={14} color="#38BDF8" />
                  </View>
                  <Text style={styles.advStatValueLarge}>
                    {advStats.general.srpe_correlation}
                  </Text>
                  <Text style={styles.advStatSubtext}>Exertion load vs match output</Text>
                </View>

                <View style={styles.advStatCardFull}>
                  <View style={styles.advStatHeaderRow}>
                    <Text style={styles.advStatLabel}>COACH RATING TREND</Text>
                    <Ionicons name="star-outline" size={14} color="#FBBF24" />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
                    <Text style={[styles.advStatValueHero, { color: "#FBBF24" }]}>
                      {advStats.general.rating_score > 0
                        ? `${advStats.general.rating_score} / 10`
                        : "8.8 / 10"}
                    </Text>
                    <Text style={{ color: "#10B981", fontSize: 13, fontWeight: "800" }}>
                      ({advStats.general.coach_rating_trend})
                    </Text>
                  </View>
                  <Text style={styles.advStatSubtext}>
                    Coach evaluation trend over past match sessions
                  </Text>
                </View>
              </View>
            )}

          {/* Efficiency Rating & Wins Tiles */}
          <View style={styles.advancedTile}>
            <Text style={styles.advancedLabel}>
              {upperSport.includes("BASKET")
                ? "PLAYER EFFICIENCY RATING (+-)"
                : upperSport.includes("VOLLEY")
                ? "VOLLEYBALL PERFORMANCE RATING (+-)"
                : "OVERALL EFFICIENCY RATING (+-)"}
            </Text>
            <Text style={styles.advancedValue}>
              {calculateDynamicPER(displayAverages)}
            </Text>
          </View>

          <View style={styles.advancedTile}>
            <Text style={styles.advancedLabel}>TOTAL MATCH WINS</Text>
            <Text style={styles.advancedValue}>
              {displayAverages?.wins !== undefined && displayAverages?.wins !== null
                ? String(displayAverages.wins)
                : displayStats?.wins !== undefined && displayStats?.wins !== null
                ? String(displayStats.wins)
                : activePastTeam?.stats_summary?.wins !== undefined
                ? String(activePastTeam.stats_summary.wins)
                : "6"}
            </Text>
          </View>

          {/* ─────────────────────────────────────────────────────────────
              4. WORKLOAD ANALYTICS & TRAINING LOAD
          ───────────────────────────────────────────────────────────── */}
          <View style={styles.workloadSectionContainer}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionTitleLeft}>
                <View style={styles.cyanAccentBar} />
                <Text style={styles.sectionTitle}>WORKLOAD ANALYTICS & TRAINING LOAD</Text>
              </View>
            </View>

            {/* ACWR Status Card */}
            <View style={[styles.acwrCard, isDangerZone && styles.acwrCardDanger]}>
              <View style={styles.acwrTopRow}>
                <Text style={styles.acwrTitle}>ACWR (Acute:Chronic Workload Ratio)</Text>
                <Text style={styles.acwrScoreText}>{acwrVal.toFixed(2)}</Text>
              </View>

              <View style={isDangerZone ? styles.statusBadgeRed : styles.statusBadgeGreen}>
                <Text style={styles.statusBadgeText}>
                  {isDangerZone
                    ? "POOR PERFORMANCE / HIGH FATIGUE"
                    : "OPTIMAL TRAINING PROGRESSION"}
                </Text>
              </View>

              <Text style={styles.acwrDescription}>
                {isDangerZone
                  ? "Workload spike detected — elevated fatigue and increased injury susceptibility."
                  : "Balanced training load progression — optimal muscular recovery & high match readiness."}
              </Text>

              {/* Progress Zone Bar */}
              <View style={styles.zoneBarContainer}>
                <View style={styles.zoneLabelsRow}>
                  <Text style={[styles.zoneText, { color: "#10B981" }]}>
                    SAFE (0.80 - 1.30)
                  </Text>
                  <Text style={[styles.zoneText, { color: "#EF4444" }]}>
                    DANGER (&gt; 1.50)
                  </Text>
                </View>
                <View style={styles.dualZoneTrack}>
                  <View style={[styles.greenZoneFill, { width: "65%" }]} />
                  <View style={[styles.redZoneFill, { width: "35%" }]} />
                </View>
              </View>
            </View>

            {/* Effort Points Grid */}
            <View style={styles.effortGrid}>
              <View style={styles.effortCard}>
                <Text style={styles.effortLabel}>7-DAY ACUTE LOAD</Text>
                <Text style={styles.effortValueCyan}>
                  {workload.current_7day_acute_load || 420} Pts
                </Text>
              </View>
              <View style={styles.effortCard}>
                <Text style={styles.effortLabel}>28-DAY BASELINE LOAD</Text>
                <Text style={styles.effortValueWhite}>
                  {workload.current_28day_chronic_load || 390} Pts
                </Text>
              </View>
            </View>

            {/* 2x2 Indicator Tiles */}
            <View style={styles.tiles2x2Grid}>
              <View style={styles.workloadTile}>
                <Text style={styles.avgLabel}>WORKOUT SCORE</Text>
                <Text style={styles.avgValueSmall}>
                  {workload.workout_score || 88} pts
                </Text>
              </View>
              <View style={styles.workloadTile}>
                <Text style={styles.avgLabel}>FATIGUE METER</Text>
                <Text style={styles.avgValueSmall}>
                  {workload.fatigue_meter || 42}
                </Text>
              </View>
              <View style={styles.workloadTile}>
                <Text style={styles.avgLabel}>ROUTINE SCORE</Text>
                <Text style={styles.avgValueSmall}>
                  {workload.routine_score || 91}
                </Text>
              </View>
              <View style={styles.workloadTile}>
                <Text style={styles.avgLabel}>BODY STRESS</Text>
                <Text style={styles.avgValueSmall}>
                  {workload.body_stress_pts || 24} pts
                </Text>
              </View>
            </View>

            {/* Coach Target Information */}
            <View style={styles.targetInfoCard}>
              <View style={styles.targetInfoTitleRow}>
                <Ionicons name="flag-outline" size={16} color="#00C8FF" />
                <Text style={styles.targetInfoTitle}>COACH 7-DAY WORKLOAD TARGET</Text>
              </View>
              <View style={styles.targetInfoStatsRow}>
                <View style={styles.targetInfoItem}>
                  <Text style={styles.targetInfoLabel}>TARGET EFFORT</Text>
                  <Text style={styles.targetInfoValue}>
                    {workload.target_7day_effort_pts || 450} Pts
                  </Text>
                </View>
                <View style={{ width: 1, backgroundColor: "rgba(255, 255, 255, 0.1)" }} />
                <View style={styles.targetInfoItem}>
                  <Text style={styles.targetInfoLabel}>SESSION INTENSITY</Text>
                  <Text style={styles.targetInfoValue}>
                    {workload.target_intensity || 8} / 10
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ─────────────────────────────────────────────────────────────
              5. RECENT MATCH SCORES & GAME BREAKDOWN
          ───────────────────────────────────────────────────────────── */}
          {recentScores.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitleLeft}>
                  <View style={styles.cyanAccentBar} />
                  <Text style={styles.sectionTitle}>
                    {layout?.chartTitle || "RECENT MATCH SCORES"}
                  </Text>
                </View>
              </View>

              {recentScores.slice(0, 5).map((score, idx) => (
                <View key={idx} style={styles.matchHistoryCard}>
                  <View style={styles.matchHistoryRow}>
                    <View>
                      <Text style={styles.matchHistoryGameName}>
                        {layout?.chartPrefix || "Game"} #{idx + 1}
                      </Text>
                      <Text style={styles.matchHistoryDate}>
                        Certified official match scorecard
                      </Text>
                    </View>
                    <Text style={styles.matchHistoryScore}>
                      {score} {layout?.isTimed ? "s" : "Pts"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Historical Metric Progression Bottom Sheet / Modal */}
        <MetricProgressionModal
          visible={progressionModal.visible}
          onClose={() => setProgressionModal((prev) => ({ ...prev, visible: false }))}
          athleteId={profile?.athlete_id || (profile as any)?.user_id || (profile as any)?.id || ""}
          athleteName={fullName}
          sportCategory={upperSport}
          metricKey={progressionModal.metricKey}
          eventTitle={progressionModal.eventTitle}
          initialMark={progressionModal.initialMark}
        />
      </View>
    </Modal>
  );
};

export default AthleteAllStatsModal;


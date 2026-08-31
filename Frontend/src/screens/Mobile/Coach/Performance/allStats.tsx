import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestAuthenticatedJson } from "../../Authentication/authShared";
import {
  AthletePerformanceProfile,
  WorkloadTargetState,
} from "../DataTypes";
import { styles } from "./styles/allStats";

interface AllStatsProps {
  athlete: AthletePerformanceProfile;
  onClose: () => void;
  onUpdateWorkload?: (updatedWorkload: WorkloadTargetState) => void;
}

export const AllStats: React.FC<AllStatsProps> = ({
  athlete,
  onClose,
  onUpdateWorkload,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 60) + 48;

  // Local state for workload analytics
  const [workload, setWorkload] = useState<WorkloadTargetState>(
    athlete.workload_analytics || {
      target_7day_effort_pts: 400,
      current_7day_acute_load: 580,
      current_28day_chronic_load: 310,
      calculated_acwr: 1.87,
      workout_score: 92,
      fatigue_meter: 82,
      routine_score: 85,
      body_stress_pts: 78,
    }
  );

  // Coach Target Setting inputs
  const [targetEffortPts, setTargetEffortPts] = useState(
    String(workload.target_7day_effort_pts || 400)
  );
  const [targetIntensity, setTargetIntensity] = useState<number>(8);

  const handleSetWorkloadTarget = () => {
    const newTargetPts = parseInt(targetEffortPts, 10) || 400;

    const updated: WorkloadTargetState = {
      ...workload,
      target_7day_effort_pts: newTargetPts,
    };

    setWorkload(updated);
    if (onUpdateWorkload) {
      onUpdateWorkload(updated);
    }

    // Persist to backend API (POST /athletes/workload)
    requestAuthenticatedJson("/athletes/workload", "POST", {
      athlete_id: athlete.athlete_id,
      session_duration_mins: 60,
      srpe_score: Math.max(1, Math.min(10, targetIntensity)),
      entry_date: new Date().toISOString().slice(0, 10),
      session_type: "Coach Workload Target",
    }).catch(() => null);

    Alert.alert(
      "Workload Target Set",
      `Set ${athlete.full_name}'s 7-Day Workload Target to ${newTargetPts} Effort Pts (Target Intensity: ${targetIntensity}/10).`
    );
  };

  const isDangerZone = workload.calculated_acwr > 1.5;

  return (
    <View style={styles.container}>
      {/* Drawer Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Text style={styles.headerTitle}>STATISTICS</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Tile */}
        <View style={styles.bannerTile}>
          <Text style={styles.bannerTitle}>ALL STATS</Text>
        </View>

        {/* Stats Sections */}
        {athlete.sport_category === "TRACK AND FIELD" ? (
          <>
            <Text style={styles.sectionTitle}>AVERAGES</Text>
            <View style={styles.averagesTopRow}>
              <View style={styles.averagesTopCard}>
                <Text style={styles.avgLabel}>100M AVG</Text>
                <Text style={styles.avgValueLarge}>
                  {athlete.averages.avg_100m || athlete.averages.pb_100m || "--"}
                </Text>
              </View>
              <View style={styles.averagesTopCard}>
                <Text style={styles.avgLabel}>200M AVG</Text>
                <Text style={styles.avgValueLarge}>
                  {athlete.averages.avg_200m || athlete.averages.pb_200m || "--"}
                </Text>
              </View>
            </View>

            <View style={styles.averagesBottomRow}>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>REACTION</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.reaction_time_s || "--"}
                </Text>
              </View>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>START RATING</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.start_rating_pct !== undefined ? `${athlete.averages.start_rating_pct}%` : "--"}
                </Text>
              </View>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>PODIUMS</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.podiums_count !== undefined ? athlete.averages.podiums_count : "--"}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>PERFORMANCE & SPEED SPLITS</Text>
            <View style={styles.splitCardFull}>
              <View style={styles.splitHeaderRow}>
                <Text style={styles.avgLabel}>TOP SPEED (KM/H)</Text>
              </View>
              <Text style={styles.splitValueText}>
                {athlete.averages.top_speed_kmh !== undefined ? `${athlete.averages.top_speed_kmh} km/h` : "--"}
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        ((athlete.averages.top_speed_kmh || 0) / 45) * 100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.splitCardHalfRow}>
              <View style={styles.splitCardHalf}>
                <Text style={styles.avgLabel}>STRIDE FREQ</Text>
                <Text style={styles.splitValueText}>
                  {athlete.averages.stride_freq_hz !== undefined ? `${athlete.averages.stride_freq_hz} Hz` : "--"}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          ((athlete.averages.stride_freq_hz || 0) / 5) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.splitCardHalf}>
                <Text style={styles.avgLabel}>WIN RATE %</Text>
                <Text style={styles.splitValueText}>
                  {athlete.averages.win_rate_pct !== undefined ? `${athlete.averages.win_rate_pct}%` : "--"}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          athlete.averages.win_rate_pct || 0
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>ADVANCED METRICS</Text>
            <View style={styles.advancedTile}>
              <Text style={styles.advancedLabel}>
                SPRINT EFFICIENCY RATING (+-)
              </Text>
              <Text style={styles.advancedValue}>
                {athlete.averages.per_score !== undefined ? athlete.averages.per_score : "--"}
              </Text>
            </View>

            <View style={styles.advancedTile}>
              <Text style={styles.advancedLabel}>EVENT WINS</Text>
              <Text style={styles.advancedValue}>
                {athlete.averages.wins !== undefined ? athlete.averages.wins : "--"}
              </Text>
            </View>
          </>
        ) : athlete.sport_category === "SWIMMING" ? (
          <>
            <Text style={styles.sectionTitle}>AVERAGES</Text>
            <View style={styles.averagesTopRow}>
              <View style={styles.averagesTopCard}>
                <Text style={styles.avgLabel}>100M FREE</Text>
                <Text style={styles.avgValueLarge}>
                  {athlete.averages.avg_100m_free || athlete.averages.pb_100m_free || "--"}
                </Text>
              </View>
              <View style={styles.averagesTopCard}>
                <Text style={styles.avgLabel}>200M FREE</Text>
                <Text style={styles.avgValueLarge}>
                  {athlete.averages.avg_200m_free || "--"}
                </Text>
              </View>
            </View>

            <View style={styles.averagesBottomRow}>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>50M FREE</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.pb_50m_free || "--"}
                </Text>
              </View>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>FLIP TURN</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.flip_turn_s || "--"}
                </Text>
              </View>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>PODIUMS</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.podiums_count !== undefined ? athlete.averages.podiums_count : "--"}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>STROKE & EFFICIENCY SPLITS</Text>
            <View style={styles.splitCardFull}>
              <View style={styles.splitHeaderRow}>
                <Text style={styles.avgLabel}>STROKE EFFICIENCY %</Text>
              </View>
              <Text style={styles.splitValueText}>
                {athlete.averages.stroke_efficiency_pct !== undefined ? `${athlete.averages.stroke_efficiency_pct}%` : "--"}
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        athlete.averages.stroke_efficiency_pct || 0
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.splitCardHalfRow}>
              <View style={styles.splitCardHalf}>
                <Text style={styles.avgLabel}>STROKE RATE</Text>
                <Text style={styles.splitValueText}>
                  {athlete.averages.stroke_rate_pm !== undefined ? `${athlete.averages.stroke_rate_pm}/min` : "--"}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          ((athlete.averages.stroke_rate_pm || 0) / 60) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.splitCardHalf}>
                <Text style={styles.avgLabel}>SWIM INDEX</Text>
                <Text style={styles.splitValueText}>
                  {athlete.averages.swim_index_score !== undefined ? athlete.averages.swim_index_score : "--"}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          ((athlete.averages.swim_index_score || 0) / 1000) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>ADVANCED METRICS</Text>
            <View style={styles.advancedTile}>
              <Text style={styles.advancedLabel}>
                SWIMMING PERFORMANCE INDEX (+-)
              </Text>
              <Text style={styles.advancedValue}>
                {athlete.averages.per_score !== undefined ? athlete.averages.per_score : "--"}
              </Text>
            </View>

            <View style={styles.advancedTile}>
              <Text style={styles.advancedLabel}>MEET WINS</Text>
              <Text style={styles.advancedValue}>
                {athlete.averages.wins !== undefined ? athlete.averages.wins : "--"}
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>AVERAGES</Text>
            <View style={styles.averagesTopRow}>
              <View style={styles.averagesTopCard}>
                <Text style={styles.avgLabel}>PPG</Text>
                <Text style={styles.avgValueLarge}>
                  {athlete.averages.ppg !== undefined ? athlete.averages.ppg : "--"}
                </Text>
              </View>
              <View style={styles.averagesTopCard}>
                <Text style={styles.avgLabel}>APG</Text>
                <Text style={styles.avgValueLarge}>
                  {athlete.averages.apg !== undefined ? athlete.averages.apg : "--"}
                </Text>
              </View>
            </View>

            <View style={styles.averagesBottomRow}>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>RPG</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.rpg !== undefined ? athlete.averages.rpg : "--"}
                </Text>
              </View>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>BPG</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.bpg !== undefined ? athlete.averages.bpg : "--"}
                </Text>
              </View>
              <View style={styles.averagesSmallCard}>
                <Text style={styles.avgLabel}>SPG</Text>
                <Text style={styles.avgValueSmall}>
                  {athlete.averages.spg !== undefined ? athlete.averages.spg : "--"}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>SHOOTING SPLITS</Text>
            <View style={styles.splitCardFull}>
              <View style={styles.splitHeaderRow}>
                <Text style={styles.avgLabel}>FIELD GOAL %</Text>
              </View>
              <Text style={styles.splitValueText}>
                {athlete.averages.fg_percentage !== undefined ? `${athlete.averages.fg_percentage}%` : "--"}
              </Text>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(
                        100,
                        athlete.averages.fg_percentage || 0
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.splitCardHalfRow}>
              <View style={styles.splitCardHalf}>
                <Text style={styles.avgLabel}>3 POINTS %</Text>
                <Text style={styles.splitValueText}>
                  {athlete.averages.three_pt_percentage !== undefined ? `${athlete.averages.three_pt_percentage}%` : "--"}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          athlete.averages.three_pt_percentage || 0
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.splitCardHalf}>
                <Text style={styles.avgLabel}>FREE THROWS %</Text>
                <Text style={styles.splitValueText}>
                  {athlete.averages.ft_percentage !== undefined ? `${athlete.averages.ft_percentage}%` : "--"}
                </Text>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          athlete.averages.ft_percentage || 0
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>ADVANCED METRICS</Text>
            <View style={styles.advancedTile}>
              <Text style={styles.advancedLabel}>
                PLAYER EFFICIENCY RATING (+-)
              </Text>
              <Text style={styles.advancedValue}>
                {athlete.averages.per_score !== undefined ? athlete.averages.per_score : "--"}
              </Text>
            </View>

            <View style={styles.advancedTile}>
              <Text style={styles.advancedLabel}>WINS</Text>
              <Text style={styles.advancedValue}>
                {athlete.averages.wins !== undefined ? athlete.averages.wins : "--"}
              </Text>
            </View>
          </>
        )}

        {/* INTERACTIVE COACH WORKLOAD ANALYTICS PANEL (image_332453.png) */}
        <View style={styles.workloadSectionContainer}>
          <Text style={styles.sectionTitle}>
            WORKLOAD ANALYTICS & TRAINING LOAD
          </Text>

          {/* ACWR Status Card */}
          <View
            style={[
              styles.acwrCard,
              !isDangerZone && { borderColor: "rgba(16, 185, 129, 0.3)" },
            ]}
          >
            <View style={styles.acwrTopRow}>
              <Text style={styles.acwrTitle}>
                ACWR (Acute:Chronic Workload Ratio)
              </Text>
              <Text style={styles.acwrScoreText}>
                {workload.calculated_acwr}
              </Text>
            </View>

            <View
              style={
                isDangerZone ? styles.statusBadgeRed : styles.statusBadgeGreen
              }
            >
              <Text style={styles.statusBadgeText}>
                {isDangerZone
                  ? "POOR PERFORMANCE / HIGH FATIGUE"
                  : "OPTIMAL TRAINING LOAD"}
              </Text>
            </View>

            <Text style={styles.acwrDescription}>
              {isDangerZone
                ? "High fatigue & workload spike detected — increased risk of poor performance and muscle strain."
                : "Optimal training progression detected — low fatigue & balanced workload ratio."}
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
                {workload.current_7day_acute_load} Pts
              </Text>
            </View>
            <View style={styles.effortCard}>
              <Text style={styles.effortLabel}>28-DAY BASELINE LOAD</Text>
              <Text style={styles.effortValueWhite}>
                {workload.current_28day_chronic_load} Pts
              </Text>
            </View>
          </View>

          {/* 2x2 Indicator Tiles */}
          <View style={styles.tiles2x2Grid}>
            <View style={styles.workloadTile}>
              <Text style={styles.avgLabel}>WORKOUT SCORE</Text>
              <Text style={styles.avgValueSmall}>
                {workload.workout_score} pts
              </Text>
            </View>
            <View style={styles.workloadTile}>
              <Text style={styles.avgLabel}>FATIGUE METER</Text>
              <Text style={styles.avgValueSmall}>{workload.fatigue_meter}</Text>
            </View>
            <View style={styles.workloadTile}>
              <Text style={styles.avgLabel}>ROUTINE SCORE</Text>
              <Text style={styles.avgValueSmall}>{workload.routine_score}</Text>
            </View>
            <View style={styles.workloadTile}>
              <Text style={styles.avgLabel}>BODY STRESS</Text>
              <Text style={styles.avgValueSmall}>
                {workload.body_stress_pts} pts
              </Text>
            </View>
          </View>

          {/* Coach 7-Day Target Setting Panel */}
          <View style={styles.targetPanelCard}>
            <Text style={styles.targetPanelTitle}>
              COACH 7-DAY WORKLOAD TARGET SETTING
            </Text>

            <Text style={styles.inputLabel}>TARGET 7-DAY EFFORT POINTS</Text>
            <TextInput
              style={styles.durationInput}
              keyboardType="numeric"
              value={targetEffortPts}
              onChangeText={setTargetEffortPts}
              placeholder="400"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputLabel}>TARGET SESSION INTENSITY (1 - 10)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.intensityPillScroll}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isActive = targetIntensity === num;
                return (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.intensityPill,
                      isActive && styles.intensityPillActive,
                    ]}
                    onPress={() => setTargetIntensity(num)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.intensityPillText,
                        isActive && styles.intensityPillTextActive,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.logCtaButton}
              onPress={handleSetWorkloadTarget}
              activeOpacity={0.85}
            >
              <Text style={styles.logCtaText}>SET WORKLOAD TARGET</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AllStats;

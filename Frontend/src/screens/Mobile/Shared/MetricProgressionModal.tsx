import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Text as SvgText,
  Line,
  G,
} from "react-native-svg";
import { requestAuthenticatedJson } from "../Authentication/authShared";

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

export interface MetricProgressionRecord {
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

export interface MetricProgressionResponse {
  athlete_id: string;
  athlete_name: string;
  sport: string;
  metric_key: string;
  event_title: string;
  current_mark: string;
  personal_best: string;
  is_lower_better: boolean;
  total_records: number;
  records: MetricProgressionRecord[];
  sparkline_points: { x: number; y: number; label: string; value: number }[];
}

export interface MetricProgressionModalProps {
  visible: boolean;
  onClose: () => void;
  athleteId: string;
  athleteName: string;
  sportCategory: string;
  metricKey: string;
  eventTitle?: string;
  initialMark?: string;
}

export const MetricProgressionModal: React.FC<MetricProgressionModalProps> = ({
  visible,
  onClose,
  athleteId,
  athleteName,
  sportCategory = "SWIMMING",
  metricKey,
  eventTitle: propEventTitle,
  initialMark = "-",
}) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MetricProgressionResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  // Normalize Event Title for Display
  const displayTitle = useMemo(() => {
    if (propEventTitle) return propEventTitle;
    const k = (metricKey || "").toLowerCase();
    const s = (sportCategory || "").toUpperCase();
    if (s.includes("SWIM")) {
      if (k.includes("50")) return "50m Freestyle";
      if (k.includes("200")) return "200m Freestyle";
      if (k.includes("flip") || k.includes("turn")) return "Flip Turn Time";
      if (k.includes("index")) return "Swim Index";
      if (k.includes("rate")) return "Stroke Rate";
      return "100m Freestyle";
    }
    // Track & Field
    if (k.includes("200")) return "200m Dash";
    if (k.includes("reaction") || k.includes("react")) return "Reaction Time";
    if (k.includes("long") || k.includes("jump")) return "Long Jump";
    if (k.includes("shot") || k.includes("put")) return "Shot Put";
    if (k.includes("discus")) return "Discus Throw";
    if (k.includes("javelin")) return "Javelin Throw";
    if (k.includes("speed")) return "Top Speed";
    if (k.includes("stride")) return "Stride Frequency";
    return "100m Dash";
  }, [propEventTitle, metricKey, sportCategory]);

  const createEmptyProgression = useCallback(
    (
      athId: string,
      athName: string,
      sport: string,
      key: string,
      title: string,
      mark: string
    ): MetricProgressionResponse => ({
      athlete_id: athId,
      athlete_name: athName,
      sport,
      metric_key: key,
      event_title: title,
      current_mark: mark && mark !== "N/A" ? mark : "-",
      personal_best: mark && mark !== "N/A" ? mark : "-",
      is_lower_better: true,
      total_records: 0,
      records: [],
      sparkline_points: [],
    }),
    []
  );

  const loadData = useCallback(async (isRefresh = false) => {
    if (!visible) return;
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const rawAthId = athleteId || "";
      const cleanId = rawAthId.startsWith("ath_") ? rawAthId.replace("ath_", "") : rawAthId;
      const url = `/athletes/${cleanId}/progression-history?metric=${encodeURIComponent(
        metricKey
      )}&sport=${encodeURIComponent(sportCategory || "")}`;

      const res: any = await requestAuthenticatedJson(url, "GET");
      if (res && Array.isArray(res.records)) {
        setData(res);
      } else {
        setData(createEmptyProgression(athleteId, athleteName, sportCategory, metricKey, displayTitle, initialMark));
      }
    } catch (err) {
      console.warn("MetricProgressionModal loadData error:", err);
      setData(createEmptyProgression(athleteId, athleteName, sportCategory, metricKey, displayTitle, initialMark));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [visible, athleteId, metricKey, sportCategory, displayTitle, initialMark, athleteName, createEmptyProgression]);

  useEffect(() => {
    if (visible) {
      loadData();
    } else {
      setData(null);
      setSelectedPointIndex(null);
    }
  }, [visible, loadData]);

  // Compute Sparkline Path
  const sparklineChart = useMemo(() => {
    if (!data || !data.records || data.records.length === 0) return null;

    // Chronological order (oldest to newest)
    const chrono = [...data.records].reverse();
    if (chrono.length < 2) return null;

    const chartWidth = SCREEN_WIDTH - 64;
    const chartHeight = 110;
    const padX = 30;
    const padY = 24;
    const availW = chartWidth - padX * 2;
    const availH = chartHeight - padY * 2;

    const values = chrono.map((c) => c.numeric_value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const points = chrono.map((item, idx) => {
      const x = padX + (idx / (chrono.length - 1)) * availW;
      // Invert Y if lower is better (time metrics), so faster times plot upward!
      const norm = data.is_lower_better
        ? (maxVal - item.numeric_value) / range
        : (item.numeric_value - minVal) / range;
      const y = padY + (1 - norm) * availH;

      return {
        x,
        y,
        val: item.numeric_value,
        formatted: item.formatted_value,
        date: item.display_date,
        isPB: item.is_personal_best,
        meetName: item.meet_name,
      };
    });

    let linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      linePath += ` C ${midX.toFixed(1)} ${prev.y.toFixed(1)}, ${midX.toFixed(1)} ${curr.y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }

    // Area fill path
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight} L ${points[0].x.toFixed(1)} ${chartHeight} Z`;

    return {
      chartWidth,
      chartHeight,
      linePath,
      areaPath,
      points,
    };
  }, [data]);

  const bestMark = data?.personal_best || initialMark;
  const currentMark = data?.current_mark || initialMark;
  const totalMeets = data?.total_records || data?.records?.length || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Modal Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {displayTitle} Progression History
            </Text>
            <Text style={styles.headerSubTitle}>
              {athleteName} • {sportCategory.toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              tintColor="#00C8FF"
            />
          }
        >
          {/* Quick Metrics KPI Banner */}
          <View style={styles.kpiContainer}>
            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <Ionicons name="trophy" size={13} color="#F59E0B" />
                <Text style={styles.kpiLabel}>PERSONAL BEST</Text>
              </View>
              <Text style={[styles.kpiValue, styles.kpiValueGold]}>{bestMark}</Text>
              <Text style={styles.kpiSub}>Official Record</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <Ionicons name="time" size={13} color="#00C8FF" />
                <Text style={styles.kpiLabel}>LATEST MARK</Text>
              </View>
              <Text style={styles.kpiValue}>{currentMark}</Text>
              <Text style={styles.kpiSub}>Most Recent Meet</Text>
            </View>

            <View style={styles.kpiCard}>
              <View style={styles.kpiHeaderRow}>
                <Ionicons name="calendar-outline" size={13} color="#38BDF8" />
                <Text style={styles.kpiLabel}>MEETS LOGGED</Text>
              </View>
              <Text style={styles.kpiValue}>{totalMeets}</Text>
              <Text style={styles.kpiSub}>Verified Entries</Text>
            </View>
          </View>

          {/* Sparkline Chart Card */}
          {sparklineChart && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeaderRow}>
                <View style={styles.chartHeaderLeft}>
                  <Ionicons name="trending-up" size={16} color="#00C8FF" />
                  <Text style={styles.chartTitle}>PROGRESSION CURVE</Text>
                </View>
                <View style={styles.verifiedTag}>
                  <Ionicons name="shield-checkmark" size={10} color="#00C8FF" />
                  <Text style={styles.verifiedTagText}>CHRONOLOGICAL TREND</Text>
                </View>
              </View>

              <Text style={styles.chartSubtext}>
                {data?.is_lower_better
                  ? "Track split & meet times over time (upward curve represents improved, faster pace)."
                  : "Track performance distance & output over verified competitive meets."}
              </Text>

              <View style={styles.svgWrapper}>
                <Svg
                  width={sparklineChart.chartWidth}
                  height={sparklineChart.chartHeight}
                >
                  <Defs>
                    <LinearGradient
                      id="sparklineGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <Stop offset="0%" stopColor="#00C8FF" stopOpacity="0.35" />
                      <Stop offset="100%" stopColor="#0077FF" stopOpacity="0.0" />
                    </LinearGradient>
                    <LinearGradient
                      id="lineGradient"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <Stop offset="0%" stopColor="#0077FF" />
                      <Stop offset="50%" stopColor="#00C8FF" />
                      <Stop offset="100%" stopColor="#38BDF8" />
                    </LinearGradient>
                  </Defs>

                  {/* Horizontal Guide Grid Lines */}
                  <Line
                    x1={20}
                    y1={24}
                    x2={sparklineChart.chartWidth - 20}
                    y2={24}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <Line
                    x1={20}
                    y1={sparklineChart.chartHeight - 24}
                    x2={sparklineChart.chartWidth - 20}
                    y2={sparklineChart.chartHeight - 24}
                    stroke="rgba(255, 255, 255, 0.06)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />

                  {/* Shaded Area */}
                  <Path
                    d={sparklineChart.areaPath}
                    fill="url(#sparklineGradient)"
                  />

                  {/* Connected Trend Line */}
                  <Path
                    d={sparklineChart.linePath}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Point Dots & Labels */}
                  {sparklineChart.points.map((pt, idx) => {
                    const isSelected = selectedPointIndex === idx;
                    return (
                      <G key={`pt_${idx}`}>
                        {/* Outer Glow */}
                        <Circle
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.isPB || isSelected ? 7 : 5}
                          fill={pt.isPB ? "#F59E0B" : "#00C8FF"}
                          opacity={0.3}
                        />
                        {/* Main Dot */}
                        <Circle
                          cx={pt.x}
                          cy={pt.y}
                          r={pt.isPB || isSelected ? 4.5 : 3.5}
                          fill={pt.isPB ? "#F59E0B" : "#00C8FF"}
                          stroke="#FFFFFF"
                          strokeWidth={1.5}
                        />
                        {/* Mark Value Label above point */}
                        <SvgText
                          x={pt.x}
                          y={Math.max(14, pt.y - 8)}
                          fontSize="10"
                          fontWeight="bold"
                          fill="#FFFFFF"
                          textAnchor="middle"
                        >
                          {pt.formatted}
                        </SvgText>
                      </G>
                    );
                  })}
                </Svg>
              </View>

              {/* Point Date Labels under Chart */}
              <View style={styles.chartDatesRow}>
                {sparklineChart.points.map((pt, idx) => (
                  <TouchableOpacity
                    key={`d_${idx}`}
                    onPress={() => setSelectedPointIndex(idx === selectedPointIndex ? null : idx)}
                    style={styles.chartDateItem}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chartDateText,
                        pt.isPB && styles.chartDateTextGold,
                        selectedPointIndex === idx && styles.chartDateTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {pt.date}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Selected Point Tooltip Callout */}
              {selectedPointIndex !== null && sparklineChart.points[selectedPointIndex] && (
                <View style={styles.selectedTooltipCard}>
                  <Ionicons name="information-circle" size={14} color="#00C8FF" />
                  <Text style={styles.selectedTooltipText}>
                    {sparklineChart.points[selectedPointIndex].meetName}:{" "}
                    <Text style={{ fontWeight: "900", color: "#FFFFFF" }}>
                      {sparklineChart.points[selectedPointIndex].formatted}
                    </Text>
                    {sparklineChart.points[selectedPointIndex].isPB ? " (🏆 Personal Best)" : ""}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Chronological List of Logged Meets */}
          <View style={styles.listSectionHeader}>
            <View style={styles.listSectionHeaderLeft}>
              <View style={styles.sectionAccentBar} />
              <Text style={styles.listSectionTitle}>CHRONOLOGICAL MEET LOGS</Text>
            </View>
            <Text style={styles.listSectionCounter}>
              {data?.records?.length || 0} RECORDS
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#00C8FF" />
              <Text style={styles.loadingText}>Fetching certified meet history...</Text>
            </View>
          ) : !data || !data.records || data.records.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="speedometer-outline" size={36} color="#64748B" />
              <Text style={styles.emptyTitle}>No History Records Yet</Text>
              <Text style={styles.emptySub}>
                Performance history will populate automatically as coaches and officials log scoresheets and matches.
              </Text>
            </View>
          ) : (
            data.records.map((record, index) => {
              const isPB = record.is_personal_best;
              const isImproved = record.is_improvement;
              const isBaseline = !record.delta_from_previous && record.delta_display === "Baseline";

              return (
                <View key={record.id || `rec_${index}`} style={styles.recordCard}>
                  {/* Card Header Row */}
                  <View style={styles.recordHeaderRow}>
                    <View style={styles.recordMeetInfo}>
                      <Text style={styles.recordMeetName} numberOfLines={1}>
                        {record.meet_name}
                      </Text>
                      <View style={styles.recordLocationRow}>
                        <Ionicons name="location-outline" size={12} color="#64748B" />
                        <Text style={styles.recordLocationText} numberOfLines={1}>
                          {record.location}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.recordDateBadge}>
                      <Ionicons name="calendar-outline" size={11} color="#00C8FF" />
                      <Text style={styles.recordDateText}>{record.display_date}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  {/* Card Metrics Row */}
                  <View style={styles.recordMetricsRow}>
                    <View style={styles.recordValueContainer}>
                      <Text style={styles.recordValueLabel}>RECORDED MARK</Text>
                      <View style={styles.recordValueMainRow}>
                        <Text style={[styles.recordValueText, isPB && styles.recordValueGold]}>
                          {record.formatted_value}
                        </Text>
                        {isPB && (
                          <View style={styles.pbBadge}>
                            <Ionicons name="trophy" size={10} color="#F59E0B" />
                            <Text style={styles.pbBadgeText}>PR / PB</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Improvement Delta Badge */}
                    <View style={styles.deltaBadgeContainer}>
                      <Text style={styles.deltaBadgeLabel}>VARIANCE / TREND</Text>
                      {isBaseline ? (
                        <View style={styles.baselineBadge}>
                          <Ionicons name="flag-outline" size={12} color="#94A3B8" />
                          <Text style={styles.baselineBadgeText}>Baseline Record</Text>
                        </View>
                      ) : isImproved ? (
                        <View style={styles.improvedBadge}>
                          <Ionicons
                            name={record.is_lower_better ? "arrow-down" : "arrow-up"}
                            size={12}
                            color="#10B981"
                          />
                          <Text style={styles.improvedBadgeText}>
                            {record.delta_display}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.slowerBadge}>
                          <Ionicons
                            name={record.is_lower_better ? "arrow-up" : "arrow-down"}
                            size={12}
                            color="#EF4444"
                          />
                          <Text style={styles.slowerBadgeText}>
                            {record.delta_display}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Additional Meta (Rank, QTS, Certification) */}
                  <View style={styles.recordFooterRow}>
                    <View style={styles.recordRankPill}>
                      <Text style={styles.recordRankText}>
                        {typeof record.rank === "number"
                          ? `Rank ${record.rank}`
                          : record.rank
                          ? `Place: ${record.rank}`
                          : "Rank 1"}
                      </Text>
                    </View>

                    {record.qts ? (
                      <View style={styles.recordQtsPill}>
                        <Ionicons name="ribbon-outline" size={11} color="#38BDF8" />
                        <Text style={styles.recordQtsText}>QTS: {record.qts}</Text>
                      </View>
                    ) : null}

                    {record.is_official ? (
                      <View style={styles.recordOfficialPill}>
                        <Ionicons name="shield-checkmark" size={10} color="#00C8FF" />
                        <Text style={styles.recordOfficialText}>CERTIFIED</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070D19",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#070D19",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginRight: 8,
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: fontBoldPlatform,
    letterSpacing: -0.2,
  },
  headerSubTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#00C8FF",
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  kpiContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#0D192E",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.12)",
  },
  kpiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: fontBoldPlatform,
    marginVertical: 2,
  },
  kpiValueGold: {
    color: "#FBBF24",
  },
  kpiSub: {
    fontSize: 10,
    color: "#64748B",
  },
  chartCard: {
    backgroundColor: "#0D192E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.15)",
  },
  chartHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chartHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
    fontFamily: fontBoldPlatform,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 200, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.25)",
  },
  verifiedTagText: {
    color: "#00C8FF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  chartSubtext: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 16,
  },
  svgWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  chartDatesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 8,
  },
  chartDateItem: {
    paddingVertical: 2,
  },
  chartDateText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
  },
  chartDateTextGold: {
    color: "#FBBF24",
    fontWeight: "900",
  },
  chartDateTextActive: {
    color: "#00C8FF",
    fontWeight: "900",
  },
  selectedTooltipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 200, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.2)",
  },
  selectedTooltipText: {
    fontSize: 11,
    color: "#E2E8F0",
  },
  listSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listSectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionAccentBar: {
    width: 3,
    height: 14,
    backgroundColor: "#00C8FF",
    borderRadius: 2,
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1.5,
    fontFamily: fontBoldPlatform,
  },
  listSectionCounter: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.5,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#0D192E",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  recordCard: {
    backgroundColor: "#0D192E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.12)",
  },
  recordHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  recordMeetInfo: {
    flex: 1,
    marginRight: 10,
  },
  recordMeetName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: fontBoldPlatform,
    marginBottom: 4,
  },
  recordLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recordLocationText: {
    fontSize: 11,
    color: "#64748B",
  },
  recordDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 200, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.15)",
  },
  recordDateText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#00C8FF",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 12,
  },
  recordMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recordValueContainer: {
    flex: 1,
  },
  recordValueLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  recordValueMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordValueText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: fontBoldPlatform,
  },
  recordValueGold: {
    color: "#FBBF24",
  },
  pbBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  pbBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#F59E0B",
  },
  deltaBadgeContainer: {
    alignItems: "flex-end",
  },
  deltaBadgeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  baselineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(100, 116, 139, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.3)",
  },
  baselineBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  improvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.35)",
  },
  improvedBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#10B981",
  },
  slowerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
  },
  slowerBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#EF4444",
  },
  recordFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordRankPill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recordRankText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E2E8F0",
  },
  recordQtsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recordQtsText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#38BDF8",
  },
  recordOfficialPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0, 200, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recordOfficialText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#00C8FF",
    letterSpacing: 0.5,
  },
});

export default MetricProgressionModal;


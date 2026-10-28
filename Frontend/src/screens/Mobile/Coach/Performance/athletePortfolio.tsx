import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { requestAuthenticatedJson } from "../../Authentication/authShared";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Path,
  Polygon,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

import { AthletePerformanceProfile, MatchHistoryItem } from "../DataTypes";
import { styles } from "./styles/athletePortfolio";
import {
  computePlayerArchetypeBadges,
  extractVerticalLeapInches,
} from "../Discovery/playerBadgeEngine";

interface AthletePortfolioProps {
  athlete: AthletePerformanceProfile;
  matches?: MatchHistoryItem[];
  onClose: () => void;
  onViewAllStats: () => void;
  onViewMatchHistory: () => void;
}

export const AthletePortfolio: React.FC<AthletePortfolioProps> = ({
  athlete,
  matches = [],
  onClose,
  onViewAllStats,
  onViewMatchHistory,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;

  // Local state for condition tracking
  const [currentStatus, setCurrentStatus] = useState<string>(athlete.player_status || athlete.playerStatus || 'Active');
  const [currentNotes, setCurrentNotes] = useState<string>(athlete.injury_notes || athlete.injuryNotes || '');
  const [showConditionModal, setShowConditionModal] = useState<boolean>(false);
  const [modalStatus, setModalStatus] = useState<string>(currentStatus);
  const [modalNotes, setModalNotes] = useState<string>(currentNotes);
  const [isSavingCondition, setIsSavingCondition] = useState<boolean>(false);

  const STATUS_OPTIONS = [
    { label: 'Active', value: 'Active', color: '#10B981', icon: 'checkmark-circle' },
    { label: 'Injured', value: 'Injured', color: '#EF4444', icon: 'medkit' },
    { label: 'Recovering', value: 'Recovering', color: '#F59E0B', icon: 'fitness-outline' },
    { label: 'Day-to-Day', value: 'Day-to-Day', color: '#F97316', icon: 'time-outline' },
    { label: 'Prone to Injury', value: 'Prone to Injury', color: '#A855F7', icon: 'warning-outline' },
  ];

  const handleSaveCondition = async () => {
    setIsSavingCondition(true);
    try {
      const athId = athlete.athlete_id || athlete.user_id;
      const cleanId = String(athId).replace(/^ath_/, '');
      const payload = {
        player_status: modalStatus,
        injury_notes: modalNotes.trim(),
      };

      // Call athlete update API
      await requestAuthenticatedJson(`/athletes/${cleanId}`, 'PATCH', payload).catch(() =>
        requestAuthenticatedJson('/athletes/profile', 'PATCH', payload)
      ).catch(() => null);

      setCurrentStatus(modalStatus);
      setCurrentNotes(modalNotes.trim());
      athlete.player_status = modalStatus;
      athlete.playerStatus = modalStatus;
      athlete.injury_notes = modalNotes.trim();
      athlete.injuryNotes = modalNotes.trim();

      setShowConditionModal(false);
      Alert.alert('Status Updated', `Player status updated to ${modalStatus}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update player condition.');
    } finally {
      setIsSavingCondition(false);
    }
  };

  const calculateDynamicPER = (avg: any): string => {
    if (typeof avg?.per_score === "number" && avg.per_score > 0) {
      return avg.per_score.toFixed(1);
    }
    const pts = Number(avg?.ppg ?? avg?.points_per_game ?? 0);
    const reb = Number(avg?.rpg ?? avg?.rebounds_per_game ?? 0);
    const ast = Number(avg?.apg ?? avg?.assists_per_game ?? 0);
    const stl = Number(avg?.spg ?? avg?.steals_per_game ?? 0);
    const blk = Number(avg?.bpg ?? avg?.blocks_per_game ?? 0);
    const to = Number(avg?.tpg ?? avg?.turnovers_per_game ?? 0);
    const fgPct = Number(avg?.fg_percentage ?? 50);
    const missedFgFactor = ((100 - fgPct) / 100) * (pts / 2);
    const calculated = pts + reb + ast + stl + blk - to - missedFgFactor;
    return Math.max(0, calculated).toFixed(1);
  };

  // Helper to construct smooth SVG Path for last 10 scoring trends
  const renderScoringTrendsChart = () => {
    const rawData = athlete.scoring_trends_last_10;
    const hasData = Array.isArray(rawData) && rawData.length > 0 && rawData.some((v) => Number(v) > 0);
    if (!hasData) {
      return (
        <View style={{ paddingVertical: 24, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#94A3B8", fontSize: 13 }}>No scoring trends recorded yet.</Text>
        </View>
      );
    }

    let data: number[] = rawData
      .map((v) => (typeof v === "number" ? v : Number(v)))
      .filter((v) => Number.isFinite(v) && !isNaN(v));

    if (data.length === 0) {
      data = [0, 0];
    } else if (data.length === 1) {
      data = [data[0], data[0]];
    }

    const width = 280;
    const height = 100;
    const padding = 10;

    let minVal = Math.min(...data);
    let maxVal = Math.max(...data);

    if (!Number.isFinite(minVal) || !Number.isFinite(maxVal)) {
      minVal = 0;
      maxVal = 10;
    }

    if (minVal === maxVal) {
      minVal = Math.max(0, minVal - 5);
      maxVal = maxVal + 5;
    } else {
      minVal = Math.max(0, minVal - 2);
      maxVal = maxVal + 2;
    }

    const valRange = maxVal - minVal || 1;
    const count = data.length;
    const divisor = Math.max(1, count - 1);

    const points = data.map((val, index) => {
      const calcX = padding + (index / divisor) * (width - 2 * padding);
      const calcY =
        height -
        padding -
        ((val - minVal) / valRange) * (height - 2 * padding);

      const x = Number.isFinite(calcX) ? Math.round(calcX * 10) / 10 : padding;
      const y = Number.isFinite(calcY) ? Math.round(calcY * 10) / 10 : height / 2;
      return { x, y };
    });

    const safePoints = points.length > 0 ? points : [{ x: padding, y: height / 2 }, { x: width - padding, y: height / 2 }];

    let pathD = `M ${safePoints[0].x} ${safePoints[0].y}`;
    for (let i = 1; i < safePoints.length; i++) {
      pathD += ` L ${safePoints[i].x} ${safePoints[i].y}`;
    }

    const fillD = `${pathD} L ${safePoints[safePoints.length - 1].x} ${height} L ${
      safePoints[0].x
    } ${height} Z`;

    return (
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#00C8FF" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#00C8FF" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        <Line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="4 4"
        />
        <Line
          x1={0}
          y1={height - padding}
          x2={width}
          y2={height - padding}
          stroke="rgba(255,255,255,0.1)"
        />

        {/* Fill Under Line */}
        <Path d={fillD} fill="url(#cyanGrad)" />

        {/* Main Line */}
        <Path
          d={pathD}
          fill="none"
          stroke="#00C8FF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {safePoints.map((pt, idx) => (
          <Circle key={idx} cx={pt.x} cy={pt.y} r={3} fill="#00C8FF" />
        ))}
      </Svg>
    );
  };

  // Helper for Radar/Spider chart (5 Axes: Speed, Power, Agility, IQ, Tech)
  const renderRadarChart = () => {
    const size = 180;
    const center = size / 2;
    const maxRadius = 65;

    const comps = athlete.radar_competencies;
    const hasRadarData = comps && Object.values(comps).some((v) => typeof v === "number" && v > 0);
    const isRated = (athlete.rating_score || 0) > 0;
    const baseVal = isRated ? Math.max(50, Math.min(95, athlete.rating_score)) : 0;
    const fallbackComps = isRated
      ? {
          speed: Math.round(baseVal + 2),
          agility: Math.round(baseVal - 2),
          tech: Math.round(baseVal + 1),
          iq: Math.round(baseVal + 4),
          power: Math.round(baseVal - 3),
        }
      : { speed: 0, agility: 0, tech: 0, iq: 0, power: 0 };
    const activeComps = hasRadarData ? comps : fallbackComps;

    const sanitizeVal = (val: any) => {
      const num = typeof val === "number" ? val : Number(val);
      return Number.isFinite(num) && !isNaN(num) ? Math.max(0, Math.min(100, num)) : 0;
    };

    const axes = [
      { key: "speed", label: "Speed", value: sanitizeVal(activeComps?.speed) },
      { key: "agility", label: "Agility", value: sanitizeVal(activeComps?.agility) },
      { key: "tech", label: "Tech", value: sanitizeVal(activeComps?.tech) },
      { key: "iq", label: "IQ", value: sanitizeVal(activeComps?.iq) },
      { key: "power", label: "Power", value: sanitizeVal(activeComps?.power) },
    ];

    const angleStep = (2 * Math.PI) / 5;
    const startAngle = -Math.PI / 2;

    const getCoords = (radius: number, index: number) => {
      const safeRadius = Number.isFinite(radius) ? radius : 0;
      const angle = startAngle + index * angleStep;
      const calcX = center + safeRadius * Math.cos(angle);
      const calcY = center + safeRadius * Math.sin(angle);
      return {
        x: Number.isFinite(calcX) ? Math.round(calcX * 10) / 10 : center,
        y: Number.isFinite(calcY) ? Math.round(calcY * 10) / 10 : center,
      };
    };

    // Calculate Polygon points for athlete skills
    const polygonPoints = axes
      .map((axis, i) => {
        const r = (axis.value / 100) * maxRadius;
        const pt = getCoords(r, i);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");

    // Outer grid pentagon
    const grid1 = axes
      .map((_, i) => {
        const pt = getCoords(maxRadius, i);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");

    const grid2 = axes
      .map((_, i) => {
        const pt = getCoords(maxRadius * 0.6, i);
        return `${pt.x},${pt.y}`;
      })
      .join(" ");

    return (
      <Svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Radar grid lines */}
        <Polygon
          points={grid1}
          fill="none"
          stroke="rgba(0, 200, 255, 0.2)"
          strokeWidth={1}
        />
        <Polygon
          points={grid2}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={1}
        />

        {/* Axis rays */}
        {axes.map((_, i) => {
          const pt = getCoords(maxRadius, i);
          return (
            <Line
              key={i}
              x1={center}
              y1={center}
              x2={pt.x}
              y2={pt.y}
              stroke="rgba(0, 200, 255, 0.2)"
              strokeWidth={1}
            />
          );
        })}

        {/* Competency Fill Polygon */}
        <Polygon
          points={polygonPoints}
          fill="rgba(0, 200, 255, 0.35)"
          stroke="#00C8FF"
          strokeWidth={2}
        />

        {/* Axis Labels */}
        {axes.map((axis, i) => {
          const pt = getCoords(maxRadius + 16, i);
          return (
            <SvgText
              key={axis.key}
              x={pt.x}
              y={pt.y + 3}
              fill="#94A3B8"
              fontSize={9}
              fontWeight="700"
              textAnchor="middle"
            >
              {axis.label}
            </SvgText>
          );
        })}
      </Svg>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.diamondContainer}>
            <View style={styles.diamondBorder} />
            <Ionicons
              name="person"
              size={32}
              color="#00C8FF"
              style={styles.diamondIcon}
            />
          </View>

          <Text style={styles.heroName}>{athlete.full_name}</Text>
          <Text style={styles.heroBirthdate}>
            Birthdate: {athlete.birthdate}
          </Text>

          {/* Condition & Medical Status Pill with Coach Tagging Action */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {(() => {
              const lower = currentStatus.toLowerCase();
              let badgeBg = 'rgba(16, 185, 129, 0.15)';
              let badgeBorder = '#10B981';
              let badgeColor = '#10B981';
              let iconName: any = 'checkmark-circle';

              if (lower === 'injured') {
                badgeBg = 'rgba(239, 68, 68, 0.2)';
                badgeBorder = '#EF4444';
                badgeColor = '#EF4444';
                iconName = 'medkit';
              } else if (lower === 'recovering') {
                badgeBg = 'rgba(245, 158, 11, 0.2)';
                badgeBorder = '#F59E0B';
                badgeColor = '#F59E0B';
                iconName = 'fitness-outline';
              } else if (lower === 'day-to-day') {
                badgeBg = 'rgba(249, 115, 22, 0.2)';
                badgeBorder = '#F97316';
                badgeColor = '#F97316';
                iconName = 'time-outline';
              } else if (lower === 'prone to injury') {
                badgeBg = 'rgba(168, 85, 247, 0.2)';
                badgeBorder = '#A855F7';
                badgeColor = '#A855F7';
                iconName = 'warning-outline';
              }

              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: badgeBg, borderColor: badgeBorder, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 5 }}>
                  <Ionicons name={iconName} size={12} color={badgeColor} />
                  <Text style={{ color: badgeColor, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                    {currentStatus.toUpperCase()}
                  </Text>
                </View>
              );
            })()}

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                borderColor: 'rgba(56, 189, 248, 0.35)',
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 6,
                gap: 4,
              }}
              onPress={() => {
                setModalStatus(currentStatus);
                setModalNotes(currentNotes);
                setShowConditionModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={12} color="#38BDF8" />
              <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700' }}>Tag Condition</Text>
            </TouchableOpacity>
          </View>

          {/* Active Injury Condition Notes */}
          {Boolean(currentNotes && currentStatus.toLowerCase() !== 'active') && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginTop: 10,
              marginHorizontal: 12,
              gap: 6,
            }}>
              <Ionicons name="medkit-outline" size={14} color="#F87171" />
              <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '600', flex: 1, textAlign: 'center' }}>
                {currentNotes}
              </Text>
            </View>
          )}

          {/* Stats-Derived Archetype Badges */}
          {(() => {
            const archetypeBadges = computePlayerArchetypeBadges(athlete);
            return (
              <View style={{ marginTop: 14, alignItems: 'center', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={12} color="#00C8FF" />
                  <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    STATS-DERIVED PLAYSTYLE ARCHETYPES
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 12 }}>

                  {/* Archetype Badges */}
                  {archetypeBadges.map((badge) => (
                    <View
                      key={badge.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: badge.bgColor,
                        borderColor: badge.borderColor,
                        borderWidth: 1,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        gap: 4,
                      }}
                    >
                      <Ionicons name={badge.icon as any} size={11} color={badge.color} />
                      <Text style={{ color: badge.color, fontSize: 11, fontWeight: '800' }}>{badge.label}</Text>
                      <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                        <Text style={{ color: '#F1F5F9', fontSize: 9, fontWeight: '700' }}>{badge.metricProof}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          <View style={styles.sublineTagsRow}>
            <View style={styles.tagBadge}>
              <Ionicons name="basketball-outline" size={12} color="#00C8FF" />
              <Text style={styles.tagBadgeText}>
                {athlete.position_or_event}
              </Text>
            </View>
            <View style={styles.tagBadge}>
              <Ionicons name="location-outline" size={12} color="#00C8FF" />
              <Text style={styles.tagBadgeText}>
                {athlete.location_province}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>STATISTICS</Text>
          <TouchableOpacity onPress={onViewAllStats} activeOpacity={0.7}>
            <Text style={styles.viewAllLink}>VIEW ALL STATS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          {athlete.sport_category === "TRACK AND FIELD" ? (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>100M PB</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_100m || "-"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>200M PB</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_200m || "-"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>REACTION</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.reaction_time_s || "-"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>WIN %</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.win_rate_pct !== undefined && athlete.averages.win_rate_pct !== null
                    ? `${athlete.averages.win_rate_pct}%`
                    : "-"}
                </Text>
              </View>
            </>
          ) : athlete.sport_category === "SWIMMING" ? (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>50M FREE</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_50m_free || "-"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>100M FREE</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_100m_free || "-"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>SWIM INDEX</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.swim_index_score ? String(athlete.averages.swim_index_score) : "-"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PODIUMS</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.podiums_count !== undefined && athlete.averages.podiums_count !== null
                    ? String(athlete.averages.podiums_count)
                    : "0"}
                </Text>
              </View>
            </>
          ) : athlete.sport_category === "VOLLEYBALL" ? (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>KILLS</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.spike_kills ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>BLOCKS</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.block_points ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ACES</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.service_aces ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PER</Text>
                <Text style={styles.statValue}>
                  {calculateDynamicPER(athlete.averages)}
                </Text>
              </View>
            </>
          ) : athlete.sport_category === "PICKLEBALL" ? (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>POINTS</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.points_scored ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>ACES</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.aces ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>DINKS</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.dinks ?? 0}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PER</Text>
                <Text style={styles.statValue}>
                  {calculateDynamicPER(athlete.averages)}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PPG</Text>
                <Text style={styles.statValue}>
                  {typeof athlete.averages.ppg === "number" ? athlete.averages.ppg : (athlete.averages.ppg || "0")}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>RPG</Text>
                <Text style={styles.statValue}>
                  {typeof athlete.averages.rpg === "number" ? athlete.averages.rpg : (athlete.averages.rpg || "0")}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>APG</Text>
                <Text style={styles.statValue}>
                  {typeof athlete.averages.apg === "number" ? athlete.averages.apg : (athlete.averages.apg || "0")}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PER</Text>
                <Text style={styles.statValue}>
                  {calculateDynamicPER(athlete.averages)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Physical Attributes Panel */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
          PHYSICAL ATTRIBUTES
        </Text>
        <View style={styles.physicalPanel}>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Height</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.height_ft || "-"}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Weight</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.weight_lbs || "-"}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Wingspan</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.wingspan_ft || "-"}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Vertical Leap</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.vertical_jump_in || (athlete.biometrics as any).vertical_leap_in || `${extractVerticalLeapInches(athlete)}"`}
            </Text>
          </View>
        </View>

        {/* View Matches Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>VIEW MATCHES</Text>
          <TouchableOpacity onPress={onViewMatchHistory} activeOpacity={0.7}>
            <Text style={styles.viewAllLink}>SEE ALL →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentMatchesList}>
          {(!matches || matches.length === 0) ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: "#94A3B8", fontSize: 13 }}>
                No match logs recorded yet for this athlete.
              </Text>
            </View>
          ) : (
            matches.slice(0, 3).map((m) => {
              const isWin =
                (m.result_badge_text || "").toUpperCase().includes("WIN") ||
                (m.home_score !== undefined && m.away_score !== undefined && m.home_score >= m.away_score);
              const opponent = m.away_team || m.event_or_opponent || "Opponent";
              const oppText = opponent.toLowerCase().startsWith("vs") ? opponent : `vs. ${opponent}`;
              return (
                <TouchableOpacity
                  key={m.match_id}
                  style={styles.matchRowCard}
                  onPress={onViewMatchHistory}
                  activeOpacity={0.8}
                >
                  <Text style={styles.matchOpponentText} numberOfLines={1}>
                    {oppText}
                  </Text>
                  <View style={styles.matchBadgeRow}>
                    <Text style={isWin ? styles.matchResultBadgeWin : styles.matchResultBadgeLoss}>
                      {isWin ? "WIN" : "LOSE"}
                    </Text>
                    <Text style={styles.matchDateText}>
                      {m.date_formatted || "RECENT"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Visual Analytics Section */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
          VISUAL ANALYTICS
        </Text>

        {/* Line Chart */}
        <View style={styles.chartContainerCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>SCORING TRENDS</Text>
            <Text style={styles.chartSubtext}>Last 10 Games</Text>
          </View>
          {renderScoringTrendsChart()}
        </View>

        {/* Radar Chart */}
        <View style={styles.chartContainerCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>ATHLETIC COMPETENCIES</Text>
          </View>
          {renderRadarChart()}

          {/* Breakdown progress bars */}
          <View style={{ marginTop: 14, gap: 8 }}>
            {[
              { label: "SPEED", val: athlete.radar_competencies?.speed || ((athlete.rating_score || 0) > 0 ? Math.min(95, athlete.rating_score + 2) : 0) },
              { label: "POWER", val: athlete.radar_competencies?.power || ((athlete.rating_score || 0) > 0 ? Math.max(50, athlete.rating_score - 3) : 0) },
              { label: "AGILITY", val: athlete.radar_competencies?.agility || ((athlete.rating_score || 0) > 0 ? Math.max(50, athlete.rating_score - 2) : 0) },
              { label: "BASKETBALL / SPORT IQ", val: athlete.radar_competencies?.iq || ((athlete.rating_score || 0) > 0 ? Math.min(98, athlete.rating_score + 4) : 0) },
              { label: "TECHNIQUE", val: athlete.radar_competencies?.tech || ((athlete.rating_score || 0) > 0 ? Math.min(95, athlete.rating_score + 1) : 0) },
            ].map((c, idx) => (
              <View key={idx}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "700" }}>{c.label}</Text>
                  <Text style={{ color: "#00C8FF", fontSize: 11, fontWeight: "800" }}>{c.val}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <View style={{ width: `${Math.min(100, Math.max(0, c.val))}%`, height: "100%", backgroundColor: "#00C8FF", borderRadius: 3 }} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Eligible Documents Grid */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
          ELIGIBLE DOCUMENTS
        </Text>
        <View style={styles.docsGrid}>
          <View style={styles.docTile}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={
                athlete.eligibility_documents?.psa_verified
                  ? "#00C8FF"
                  : "#64748B"
              }
            />
            <Text style={styles.docLabel}>PSA</Text>
            <Text style={{ fontSize: 11, color: athlete.eligibility_documents?.psa_verified ? "#00C8FF" : "#64748B", marginTop: 4 }}>
              {athlete.eligibility_documents?.psa_verified ? "Verified" : "Pending"}
            </Text>
          </View>
          <View style={styles.docTile}>
            <Ionicons
              name="home-outline"
              size={24}
              color={
                athlete.eligibility_documents?.residency_verified
                  ? "#00C8FF"
                  : "#64748B"
              }
            />
            <Text style={styles.docLabel}>Proof of Residency</Text>
            <Text style={{ fontSize: 11, color: athlete.eligibility_documents?.residency_verified ? "#00C8FF" : "#64748B", marginTop: 4 }}>
              {athlete.eligibility_documents?.residency_verified ? "Verified" : "Not Verified"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal for Authorized Coach / Medical Staff to Tag Injury & Condition */}
      <Modal
        visible={showConditionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConditionModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#0F172A', borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="medkit" size={20} color="#38BDF8" />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Tag Player Condition</Text>
              </View>
              <TouchableOpacity onPress={() => setShowConditionModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 8, fontWeight: '700' }}>
              SELECT AVAILABILITY STATUS
            </Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = modalStatus.toLowerCase() === opt.value.toLowerCase();
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#1E293B',
                      borderColor: isSelected ? opt.color : 'rgba(255,255,255,0.08)',
                      borderWidth: 1.5,
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                    onPress={() => setModalStatus(opt.value)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={opt.icon as any} size={16} color={opt.color} />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: isSelected ? '800' : '600' }}>
                        {opt.label}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={16} color={opt.color} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ color: '#94A3B8', fontSize: 12, marginBottom: 6, fontWeight: '700' }}>
              INJURY & RECOVERY NOTES (OPTIONAL)
            </Text>
            <TextInput
              style={{
                backgroundColor: '#1E293B',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderRadius: 10,
                color: '#FFFFFF',
                fontSize: 13,
                padding: 12,
                minHeight: 70,
                textAlignVertical: 'top',
                marginBottom: 20,
              }}
              placeholder="e.g. Mild hamstring strain in scrimmage. Expected return: 7 days."
              placeholderTextColor="#64748B"
              value={modalNotes}
              onChangeText={setModalNotes}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1E293B', alignItems: 'center' }}
                onPress={() => setShowConditionModal(false)}
                disabled={isSavingCondition}
              >
                <Text style={{ color: '#94A3B8', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#00C8FF', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={handleSaveCondition}
                disabled={isSavingCondition}
              >
                {isSavingCondition ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={{ color: '#0F172A', fontWeight: '800' }}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AthletePortfolio;

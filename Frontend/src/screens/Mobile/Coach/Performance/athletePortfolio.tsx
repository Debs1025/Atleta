import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
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

import { AthletePerformanceProfile } from "../DataTypes";
import { styles } from "./styles/athletePortfolio";

interface AthletePortfolioProps {
  athlete: AthletePerformanceProfile;
  onClose: () => void;
  onViewAllStats: () => void;
  onViewMatchHistory: () => void;
}

export const AthletePortfolio: React.FC<AthletePortfolioProps> = ({
  athlete,
  onClose,
  onViewAllStats,
  onViewMatchHistory,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 20;

  // Render scoring trends chart
  const renderScoringTrendsChart = () => {
    const rawData = athlete.scoring_trends_last_10;
    const hasData = Array.isArray(rawData) && rawData.length >= 2 && rawData.some((v) => v > 0);
    const data = hasData ? rawData : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const width = 280;
    const height = 100;
    const padding = 10;

    const minVal = hasData ? Math.min(...data) - 2 : 0;
    const maxVal = hasData ? Math.max(...data) + 2 : 30;

    const points = data.map((val, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = hasData
        ? height - padding - ((val - minVal) / (maxVal - minVal || 1)) * (height - 2 * padding)
        : height - padding - 4;
      return { x, y };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    const fillD = `${pathD} L ${points[points.length - 1].x} ${height} L ${
      points[0].x
    } ${height} Z`;

    return (
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#00C8FF" stopOpacity={hasData ? 0.4 : 0.08} />
            <Stop offset="100%" stopColor="#00C8FF" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        <Line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="4 4"
        />
        <Line
          x1="0"
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
          stroke={hasData ? "#00C8FF" : "rgba(0, 200, 255, 0.3)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={hasData ? undefined : "3 3"}
        />

        {/* Data points */}
        {points.map((pt, idx) => (
          <Circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r={hasData ? 3 : 2}
            fill={hasData ? "#00C8FF" : "rgba(0, 200, 255, 0.4)"}
          />
        ))}
      </Svg>
    );
  };

  // Dynamic calculation for Athletic Competencies based on real player stats and metrics
  const getDynamicCompetencies = () => {
    const avg = athlete.averages || {};

    // Check if the athlete has any recorded match stats or evaluation metrics
    const hasAnyRealStats = Boolean(
      (avg.ppg && Number(avg.ppg) > 0) ||
      (avg.rpg && Number(avg.rpg) > 0) ||
      (avg.apg && Number(avg.apg) > 0) ||
      (avg.per_score && Number(avg.per_score) > 0) ||
      (avg.games_played && Number(avg.games_played) > 0) ||
      (avg.wins && Number(avg.wins) > 0) ||
      avg.top_speed_kmh ||
      avg.pb_100m ||
      avg.pb_50m_free ||
      avg.swim_index_score ||
      (athlete.scoring_trends_last_10 && athlete.scoring_trends_last_10.length > 0)
    );

    if (!hasAnyRealStats) {
      return { speed: 0, power: 0, agility: 0, iq: 0, tech: 0 };
    }

    const raw = athlete.radar_competencies;
    if (raw && (raw.speed > 0 || raw.power > 0 || raw.agility > 0 || raw.iq > 0 || raw.tech > 0)) {
      return {
        speed: Math.min(100, Math.max(0, raw.speed)),
        power: Math.min(100, Math.max(0, raw.power)),
        agility: Math.min(100, Math.max(0, raw.agility)),
        iq: Math.min(100, Math.max(0, raw.iq)),
        tech: Math.min(100, Math.max(0, raw.tech)),
      };
    }

    if (athlete.sport_category === "TRACK AND FIELD") {
      const hasTfStats = Boolean(
        avg.top_speed_kmh || avg.start_rating_pct || avg.stride_freq_hz || avg.win_rate_pct || avg.reaction_time_s
      );
      if (!hasTfStats) {
        return { speed: 0, power: 0, agility: 0, iq: 0, tech: 0 };
      }

      const topSpeedVal = avg.top_speed_kmh ? (avg.top_speed_kmh / 40) * 100 : 0;
      const startRating = avg.start_rating_pct || 0;
      const strideFreq = avg.stride_freq_hz ? (avg.stride_freq_hz / 5) * 100 : 0;
      const winRate = avg.win_rate_pct || 0;
      const reactionVal = avg.reaction_time_s ? 100 - (parseFloat(avg.reaction_time_s) || 0.15) * 100 : 0;

      return {
        speed: Math.min(100, Math.max(0, Math.round(topSpeedVal))),
        power: Math.min(100, Math.max(0, Math.round(startRating))),
        agility: Math.min(100, Math.max(0, Math.round(strideFreq))),
        iq: Math.min(100, Math.max(0, Math.round(winRate))),
        tech: Math.min(100, Math.max(0, Math.round(reactionVal))),
      };
    }

    if (athlete.sport_category === "SWIMMING") {
      const hasSwimStats = Boolean(
        avg.pb_50m_free || avg.stroke_rate_pm || avg.flip_turn_s || avg.swim_index_score || avg.stroke_efficiency_pct
      );
      if (!hasSwimStats) {
        return { speed: 0, power: 0, agility: 0, iq: 0, tech: 0 };
      }

      const pb50 = avg.pb_50m_free ? 100 - (parseFloat(avg.pb_50m_free) || 25) * 1.5 : 0;
      const strokeRate = avg.stroke_rate_pm ? (avg.stroke_rate_pm / 55) * 100 : 0;
      const flipTurn = avg.flip_turn_s ? 100 - (parseFloat(avg.flip_turn_s) || 0.8) * 30 : 0;
      const swimIdx = avg.swim_index_score ? (avg.swim_index_score / 1000) * 100 : 0;
      const strokeEff = avg.stroke_efficiency_pct || 0;

      return {
        speed: Math.min(100, Math.max(0, Math.round(pb50))),
        power: Math.min(100, Math.max(0, Math.round(strokeRate))),
        agility: Math.min(100, Math.max(0, Math.round(flipTurn))),
        iq: Math.min(100, Math.max(0, Math.round(swimIdx))),
        tech: Math.min(100, Math.max(0, Math.round(strokeEff))),
      };
    }

    // Default BASKETBALL dynamic computation
    const ppg = avg.ppg || 0;
    const apg = avg.apg || 0;
    const rpg = avg.rpg || 0;
    const spg = avg.spg || 0;
    const fg = avg.fg_percentage || 0;
    const per = avg.per_score || 0;

    const hasBasketballStats = Boolean(ppg || apg || rpg || spg || fg || per);
    if (!hasBasketballStats) {
      return { speed: 0, power: 0, agility: 0, iq: 0, tech: 0 };
    }

    const speedScore = Math.min(100, Math.max(0, Math.round(spg * 15 + apg * 5 + ppg * 1.2)));
    const powerScore = Math.min(100, Math.max(0, Math.round(rpg * 6 + (avg.bpg || 0) * 12 + ppg * 0.8)));
    const agilityScore = Math.min(100, Math.max(0, Math.round(fg * 0.8 + spg * 8)));
    const iqScore = Math.min(100, Math.max(0, Math.round(per * 2.5 + apg * 4)));
    const techScore = Math.min(100, Math.max(0, Math.round((avg.ft_percentage || 0) * 0.5 + (avg.three_pt_percentage || 0) * 0.6 + ppg * 0.8)));

    return {
      speed: speedScore,
      power: powerScore,
      agility: agilityScore,
      iq: iqScore,
      tech: techScore,
    };
  };

  // Helper for Radar/Spider chart (5 Axes: Speed, Power, Agility, IQ, Tech)
  const renderRadarChart = () => {
    const size = 180;
    const center = size / 2;
    const maxRadius = 65;

    const comps = getDynamicCompetencies();

    const axes = [
      { key: "speed", label: "Speed", value: comps.speed },
      { key: "agility", label: "Agility", value: comps.agility },
      { key: "tech", label: "Tech", value: comps.tech },
      { key: "iq", label: "IQ", value: comps.iq },
      { key: "power", label: "Power", value: comps.power },
    ];

    const hasValues = axes.some((a) => a.value > 0);

    const angleStep = (2 * Math.PI) / 5;
    const startAngle = -Math.PI / 2;

    const getCoords = (radius: number, index: number) => {
      const angle = startAngle + index * angleStep;
      return {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
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
          strokeWidth="1"
        />
        <Polygon
          points={grid2}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
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
              strokeWidth="1"
            />
          );
        })}

        {/* Competency Fill Polygon - only rendered if player has non-zero stats */}
        {hasValues && (
          <Polygon
            points={polygonPoints}
            fill="rgba(0, 200, 255, 0.35)"
            stroke="#00C8FF"
            strokeWidth="2"
          />
        )}

        {/* Axis Labels */}
        {axes.map((axis, i) => {
          const pt = getCoords(maxRadius + 16, i);
          return (
            <SvgText
              key={axis.key}
              x={pt.x}
              y={pt.y + 3}
              fill="#94A3B8"
              fontSize="9"
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
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
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
                  {athlete.averages.pb_100m || "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>200M PB</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_200m || "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>REACTION</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.reaction_time_s || "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>WIN %</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.win_rate_pct !== undefined ? `${athlete.averages.win_rate_pct}%` : "--"}
                </Text>
              </View>
            </>
          ) : athlete.sport_category === "SWIMMING" ? (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>50M FREE</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_50m_free || "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>100M FREE</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_100m_free || "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>SWIM INDEX</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.swim_index_score !== undefined ? athlete.averages.swim_index_score : "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PODIUMS</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.podiums_count !== undefined ? athlete.averages.podiums_count : "--"}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PPG</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.ppg !== undefined ? athlete.averages.ppg : "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>RPG</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.rpg !== undefined ? athlete.averages.rpg : "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>APG</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.apg !== undefined ? athlete.averages.apg : "--"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PER</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.per_score !== undefined ? athlete.averages.per_score : "--"}
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
              {athlete.biometrics.height_ft || "--"}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Weight</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.weight_lbs || "--"}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Wingspan</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.wingspan_ft || "--"}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Vertical</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.vertical_jump_in || "--"}
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

        <TouchableOpacity
          style={styles.recentMatchesList}
          onPress={onViewMatchHistory}
          activeOpacity={0.8}
        >
          <View style={styles.matchRowCard}>
            <Text style={styles.matchOpponentText}>
              View Match History & Results
            </Text>
            <View style={styles.matchBadgeRow}>
              <Text style={styles.matchResultBadgeWin}>OFFICIAL</Text>
            </View>
          </View>
        </TouchableOpacity>

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
                athlete.eligibility_documents.psa_verified
                  ? "#00C8FF"
                  : "#94A3B8"
              }
            />
            <Text style={styles.docLabel}>PSA</Text>
          </View>
          <View style={styles.docTile}>
            <Ionicons
              name="home-outline"
              size={24}
              color={
                athlete.eligibility_documents.residency_verified
                  ? "#00C8FF"
                  : "#94A3B8"
              }
            />
            <Text style={styles.docLabel}>Proof of Residency</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default AthletePortfolio;

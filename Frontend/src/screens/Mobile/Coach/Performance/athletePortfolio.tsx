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

  // Helper to construct smooth SVG Path for last 10 scoring trends
  const renderScoringTrendsChart = () => {
    const data = athlete.scoring_trends_last_10 || [
      14, 18, 15, 22, 28, 25, 30, 24, 26, 29,
    ];
    const width = 280;
    const height = 100;
    const padding = 10;

    const minVal = Math.min(...data) - 2;
    const maxVal = Math.max(...data) + 2;

    const points = data.map((val, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y =
        height -
        padding -
        ((val - minVal) / (maxVal - minVal)) * (height - 2 * padding);
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
            <Stop offset="0%" stopColor="#00C8FF" stopOpacity="0.4" />
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
          stroke="#00C8FF"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((pt, idx) => (
          <Circle key={idx} cx={pt.x} cy={pt.y} r="3" fill="#00C8FF" />
        ))}
      </Svg>
    );
  };

  // Helper for Radar/Spider chart (5 Axes: Speed, Power, Agility, IQ, Tech)
  const renderRadarChart = () => {
    const size = 180;
    const center = size / 2;
    const maxRadius = 65;

    const comps = athlete.radar_competencies || {
      speed: 85,
      power: 80,
      agility: 90,
      iq: 88,
      tech: 84,
    };

    const axes = [
      { key: "speed", label: "Speed", value: comps.speed },
      { key: "agility", label: "Agility", value: comps.agility },
      { key: "tech", label: "Tech", value: comps.tech },
      { key: "iq", label: "IQ", value: comps.iq },
      { key: "power", label: "Power", value: comps.power },
    ];

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

        {/* Competency Fill Polygon */}
        <Polygon
          points={polygonPoints}
          fill="rgba(0, 200, 255, 0.35)"
          stroke="#00C8FF"
          strokeWidth="2"
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
                  {athlete.averages.pb_100m || "10.12s"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>200M PB</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_200m || "20.85s"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>REACTION</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.reaction_time_s || "0.14s"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>WIN %</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.win_rate_pct ? `${athlete.averages.win_rate_pct}%` : "86.7%"}
                </Text>
              </View>
            </>
          ) : athlete.sport_category === "SWIMMING" ? (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>50M FREE</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_50m_free || "23.45s"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>100M FREE</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.pb_100m_free || "51.12s"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>SWIM INDEX</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.swim_index_score || "854"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PODIUMS</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.podiums_count || "12"}
                </Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PPG</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.ppg || "22.4"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>RPG</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.rpg || "8.5"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>APG</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.apg || "6.2"}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>PER</Text>
                <Text style={styles.statValue}>
                  {athlete.averages.per_score || "10.2"}
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
              {athlete.biometrics.height_ft}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Weight</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.weight_lbs}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Wingspan</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.wingspan_ft}
            </Text>
          </View>
          <View style={styles.physicalRow}>
            <Text style={styles.physicalLabel}>Vertical</Text>
            <Text style={styles.physicalValue}>
              {athlete.biometrics.vertical_jump_in}
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
          <TouchableOpacity
            style={styles.matchRowCard}
            onPress={onViewMatchHistory}
            activeOpacity={0.8}
          >
            <Text style={styles.matchOpponentText}>
              vs. Naga College Foundation
            </Text>
            <View style={styles.matchBadgeRow}>
              <Text style={styles.matchResultBadgeWin}>WIN</Text>
              <Text style={styles.matchDateText}>OCT 12</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.matchRowCard}
            onPress={onViewMatchHistory}
            activeOpacity={0.8}
          >
            <Text style={styles.matchOpponentText}>vs. New York Knicks</Text>
            <View style={styles.matchBadgeRow}>
              <Text style={styles.matchResultBadgeLoss}>LOSE</Text>
              <Text style={styles.matchDateText}>DEC 4</Text>
            </View>
          </TouchableOpacity>
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

import React, { useState, useMemo, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import styles from "./styles/OCRoutput";

// Client State Schema Models
export interface TeamScoreItem {
    team: string;
    score: number;
}

export interface DetectedAthleteStat {
    athlete_id: string;
    player_name: string;
    team_name?: string;
    jersey_number?: number;
    // Dynamic metrics per sport
    pts?: number;
    ast?: number;
    to?: number;
    reb?: number;
    stl?: number;
    blk?: number;
    min?: number;
    fg_pct?: string;
    time?: string;
    event?: string;
    stroke_count?: number;
    distance_m?: number;
    split?: string;
    split_2?: string;
    pace?: string;
    reaction_sec?: string;
}

export interface ExpandedPerformanceMetrics {
    shooting_efficiency?: {
        ft_made: number;
        ft_attempts: number;
        pt2_made: number;
        pt2_attempts: number;
        pt3_made: number;
        pt3_attempts: number;
    };
    possession_errors?: {
        key_drives: number;
        assists: number;
        turnovers: number;
        scv_12s: number;
    };
    swimming_metrics?: {
        stroke_rate: number;
        distance_per_stroke: number;
        reaction_time_sec: number;
    };
    track_metrics?: {
        split_efficiency_pct: number;
        pace_per_km: string;
    };
}

export interface RawOCRDetectedData {
    team_name: string;
    opponent_team_name?: string;
    final_score?: string;
    game_result?: string;
    team_scores?: TeamScoreItem[];
    teams?: string[];
    sport_type: "BASKETBALL" | "SWIMMING" | "TRACK AND FIELD";
    athlete_overview: DetectedAthleteStat[];
    expanded_metrics: ExpandedPerformanceMetrics;
}

interface OCRoutputProps {
    rawOCRData?: RawOCRDetectedData;
    onBack?: () => void;
    onConfirmSave?: (finalData: RawOCRDetectedData) => void;
}

// Sample Default Basketball Raw OCR Output
const DEFAULT_RAW_BASKETBALL_OCR: RawOCRDetectedData = {
    team_name: "CAMARINES SUR PANTHERS",
    opponent_team_name: "NAGA CITY WARRIORS",
    sport_type: "BASKETBALL",
    teams: ["CAMARINES SUR PANTHERS", "NAGA CITY WARRIORS"],
    team_scores: [
        { team: "CAMARINES SUR PANTHERS", score: 85 },
        { team: "NAGA CITY WARRIORS", score: 78 },
    ],
    athlete_overview: [
        { athlete_id: "ath_1", player_name: "MARCUS V. STEPHENS", team_name: "CAMARINES SUR PANTHERS", pts: 24, ast: 4, to: 8, reb: 11, stl: 3, blk: 2, min: 32, fg_pct: "52%" },
        { athlete_id: "ath_2", player_name: "JAKE L. RODRIGUEZ", team_name: "CAMARINES SUR PANTHERS", pts: 18, ast: 6, to: 2, reb: 5, stl: 2, blk: 0, min: 28, fg_pct: "48%" },
        { athlete_id: "ath_3", player_name: "CHEN W. ZHAO", team_name: "CAMARINES SUR PANTHERS", pts: 12, ast: 2, to: 0, reb: 7, stl: 1, blk: 1, min: 24, fg_pct: "60%" },
        { athlete_id: "ath_4", player_name: "TYSON K. REED", team_name: "NAGA CITY WARRIORS", pts: 19, ast: 4, to: 3, reb: 8, stl: 1, blk: 1, min: 26, fg_pct: "46%" },
        { athlete_id: "ath_5", player_name: "OMAR AL-FADIL", team_name: "NAGA CITY WARRIORS", pts: 15, ast: 5, to: 2, reb: 4, stl: 2, blk: 0, min: 22, fg_pct: "44%" },
    ],
    expanded_metrics: {
        shooting_efficiency: {
            ft_made: 42,
            ft_attempts: 56,
            pt2_made: 31,
            pt2_attempts: 48,
            pt3_made: 12,
            pt3_attempts: 29,
        },
        possession_errors: {
            key_drives: 18,
            assists: 24,
            turnovers: 12,
            scv_12s: 3,
        },
    },
};

// API Request: submit verified OCR match statistics to backend (POST /api/ocr/save-stats)
export function OCRoutput({
    rawOCRData = DEFAULT_RAW_BASKETBALL_OCR,
    onBack,
    onConfirmSave,
}: OCRoutputProps) {
    const insets = useSafeAreaInsets();
    const headerTopPadding = Math.max(insets.top, 44) + 38;

    // Inline Editing Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");

    // Dynamic Editable Athletes Data State
    const [athleteStats, setAthleteStats] = useState<DetectedAthleteStat[]>(
        rawOCRData.athlete_overview
    );

    // List of all detected unique teams
    const teamList = useMemo(() => {
        const set = new Set<string>();
        if (rawOCRData.teams && Array.isArray(rawOCRData.teams)) {
            rawOCRData.teams.forEach((t) => set.add(String(t).trim()));
        }
        if (rawOCRData.team_scores && Array.isArray(rawOCRData.team_scores)) {
            rawOCRData.team_scores.forEach((t) => set.add(String(t.team).trim()));
        }
        if (rawOCRData.team_name) set.add(String(rawOCRData.team_name).trim());
        if (rawOCRData.opponent_team_name) set.add(String(rawOCRData.opponent_team_name).trim());
        athleteStats.forEach((a) => {
            if (a.team_name) set.add(String(a.team_name).trim());
        });
        return Array.from(set).filter((t) => t.length > 0);
    }, [rawOCRData, athleteStats]);

    // Filtered athlete list based on active team filter tab
    const visibleAthletes = useMemo(() => {
        if (selectedTeamFilter === "ALL") return athleteStats;
        return athleteStats.filter(
            (a) => (a.team_name || "").toUpperCase() === selectedTeamFilter.toUpperCase()
        );
    }, [athleteStats, selectedTeamFilter]);

    // Dynamic Totals Calculation based on visible athletes
    const totals = useMemo(() => {
        return visibleAthletes.reduce(
            (acc, curr) => {
                acc.pts += curr.pts || 0;
                acc.ast += curr.ast || 0;
                acc.to += curr.to || 0;
                acc.reb += curr.reb || 0;
                acc.stl += curr.stl || 0;
                acc.blk += curr.blk || 0;
                acc.min += curr.min || 0;
                return acc;
            },
            { pts: 0, ast: 0, to: 0, reb: 0, stl: 0, blk: 0, min: 0 }
        );
    }, [visibleAthletes]);

    // Stat Cell Edit Handler
    const handleStatChange = useCallback(
        (targetAthleteId: string, field: keyof DetectedAthleteStat, value: string) => {
            setAthleteStats((prev) => {
                const updated = [...prev];
                const itemIdx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
                if (itemIdx === -1) return prev;
                const numVal = parseInt(value, 10);
                updated[itemIdx] = {
                    ...updated[itemIdx],
                    [field]: isNaN(numVal) ? 0 : numVal,
                };
                return updated;
            });
        },
        []
    );

    // Team Toggle Handler: Switch athlete between Home and Away team with 1 tap
    const handleToggleTeam = useCallback(
        (targetAthleteId: string) => {
            setAthleteStats((prev) => {
                const updated = [...prev];
                const itemIdx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
                if (itemIdx === -1) return prev;
                const current = (updated[itemIdx].team_name || "").toUpperCase();
                const home = (rawOCRData.team_name || "HOME").toUpperCase();
                const away = (rawOCRData.opponent_team_name || "AWAY").toUpperCase();
                const nextTeam = current === home ? away : home;
                updated[itemIdx] = {
                    ...updated[itemIdx],
                    team_name: nextTeam,
                };
                return updated;
            });
        },
        [rawOCRData]
    );

    // Confirm & Save Action Handler
    const handleSave = useCallback(() => {
        if (onConfirmSave) {
            onConfirmSave({
                ...rawOCRData,
                athlete_overview: athleteStats,
            });
        }
        setShowSuccessModal(true);
    }, [rawOCRData, athleteStats, onConfirmSave]);

    const isBasketball = rawOCRData.sport_type === "BASKETBALL";
    const isSwimming = rawOCRData.sport_type === "SWIMMING";
    const isTrack = rawOCRData.sport_type === "TRACK AND FIELD";

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* OCR RESULTS HEADER */}
            <View style={[styles.fixedHeader, { paddingTop: headerTopPadding }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backIconButton}
                        onPress={onBack}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitleBeside}>OCR RESULT</Text>
                </View>
            </View>

            {/* BODY SCROLL CONTENT */}
            <ScrollView
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: headerTopPadding + 54, paddingBottom: 16 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* TITLE SECTION WITH UNDERLINE */}
                <View style={styles.topTitleSection}>
                    <Text style={styles.screenTitle}>DETECTED MATCH STATISTICS</Text>
                    <View style={styles.accentUnderline} />
                </View>

                {/* DUAL TEAM SCOREBOARD */}
                {teamList.length > 1 && (
                    <View style={styles.scoreboardCard}>
                        <View style={styles.scoreboardHeader}>
                            <Text style={styles.scoreboardTitle}>MATCH SCOREBOARD</Text>
                            {rawOCRData.final_score ? (
                                <Text style={{ color: "#00C8FF", fontSize: 12, fontWeight: "800" }}>
                                    FINAL: {rawOCRData.final_score}
                                </Text>
                            ) : null}
                        </View>
                        <View style={styles.scoreboardMatchScore}>
                            <View style={styles.teamScoreBox}>
                                <Text style={styles.teamScoreName} numberOfLines={1}>{teamList[0]}</Text>
                                <Text style={styles.teamScoreNum}>
                                    {rawOCRData.team_scores?.find((t) => t.team.toUpperCase() === teamList[0].toUpperCase())?.score ??
                                        athleteStats.filter((a) => (a.team_name || "").toUpperCase() === teamList[0].toUpperCase()).reduce((s, p) => s + (p.pts || 0), 0)} PTS
                                </Text>
                            </View>
                            <Text style={styles.vsText}>VS</Text>
                            <View style={[styles.teamScoreBox, { alignItems: "flex-end" }]}>
                                <Text style={styles.teamScoreName} numberOfLines={1}>{teamList[1]}</Text>
                                <Text style={styles.teamScoreNum}>
                                    {rawOCRData.team_scores?.find((t) => t.team.toUpperCase() === teamList[1].toUpperCase())?.score ??
                                        athleteStats.filter((a) => (a.team_name || "").toUpperCase() === teamList[1].toUpperCase()).reduce((s, p) => s + (p.pts || 0), 0)} PTS
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* TEAM IDENTITY CARD */}
                <View style={styles.cardSection}>
                    <Text style={styles.subLabel}>MATCH IDENTITY</Text>
                    <View style={styles.cardDivider} />
                    <View style={styles.twoColumnGrid}>
                        <View style={styles.identityCol}>
                            <Text style={styles.identityLabel}>HOME_TEAM:</Text>
                            <Text style={styles.identityValue}>{rawOCRData.team_name}</Text>
                        </View>
                        <View style={styles.identityCol}>
                            <Text style={styles.identityLabel}>OPPONENT:</Text>
                            <Text style={styles.identityValue}>{rawOCRData.opponent_team_name || "N/A"}</Text>
                        </View>
                    </View>
                </View>

                {/* TEAM SELECTOR FILTER TABS */}
                {teamList.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        <View style={styles.teamFilterRow}>
                            <TouchableOpacity
                                style={[styles.teamFilterChip, selectedTeamFilter === "ALL" && styles.teamFilterChipActive]}
                                onPress={() => setSelectedTeamFilter("ALL")}
                            >
                                <Text style={[styles.teamFilterText, selectedTeamFilter === "ALL" && styles.teamFilterTextActive]}>
                                    ALL PLAYERS ({athleteStats.length})
                                </Text>
                            </TouchableOpacity>
                            {teamList.map((tName) => {
                                const count = athleteStats.filter((a) => (a.team_name || "").toUpperCase() === tName.toUpperCase()).length;
                                return (
                                    <TouchableOpacity
                                        key={tName}
                                        style={[styles.teamFilterChip, selectedTeamFilter === tName && styles.teamFilterChipActive]}
                                        onPress={() => setSelectedTeamFilter(tName)}
                                    >
                                        <Text style={[styles.teamFilterText, selectedTeamFilter === tName && styles.teamFilterTextActive]}>
                                            {tName} ({count})
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}

                {/* PERFORMANCE METRICS HEADER */}
                <View style={styles.subLabelHeaderRow}>
                    <Text style={styles.subLabel}>PERFORMANCE METRICS ({selectedTeamFilter})</Text>
                    <Text style={styles.swipeHintText}>Swipe right →</Text>
                </View>

                {/* HORIZONTALLY SCROLLABLE TABLE CONTAINER */}
                <View style={styles.tableCard}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        nestedScrollEnabled
                    >
                        <View style={{ minWidth: 620 }}>
                            {/* Table Header Row */}
                            <View style={styles.tableHeaderRow}>
                                <Text style={styles.tableHeaderColName}>
                                    {isSwimming
                                        ? "SWIMMER NAME"
                                        : isTrack
                                            ? "ATHLETE NAME"
                                            : "PLAYER NAME"}
                                </Text>
                                {/* Will make this dynamic when linked to backend */}
                                {isBasketball && (
                                    <>
                                        <Text style={styles.tableHeaderColStat}>PTS</Text>
                                        <Text style={styles.tableHeaderColStat}>AST</Text>
                                        <Text style={styles.tableHeaderColStat}>TO</Text>
                                        <Text style={styles.tableHeaderColStat}>REB</Text>
                                        <Text style={styles.tableHeaderColStat}>STL</Text>
                                        <Text style={styles.tableHeaderColStat}>BLK</Text>
                                        <Text style={styles.tableHeaderColStat}>MIN</Text>
                                        <Text style={styles.tableHeaderColStat}>FG%</Text>
                                    </>
                                )}
                                {isSwimming && (
                                    <>
                                        <Text style={styles.tableHeaderColStat}>EVENT</Text>
                                        <Text style={styles.tableHeaderColStat}>TIME</Text>
                                        <Text style={styles.tableHeaderColStat}>STROKES</Text>
                                        <Text style={styles.tableHeaderColStat}>SPLIT</Text>
                                        <Text style={styles.tableHeaderColStat}>PACE</Text>
                                        <Text style={styles.tableHeaderColStat}>REACTION</Text>
                                    </>
                                )}
                                {isTrack && (
                                    <>
                                        <Text style={styles.tableHeaderColStat}>EVENT</Text>
                                        <Text style={styles.tableHeaderColStat}>TIME</Text>
                                        <Text style={styles.tableHeaderColStat}>SPLIT 1</Text>
                                        <Text style={styles.tableHeaderColStat}>SPLIT 2</Text>
                                        <Text style={styles.tableHeaderColStat}>PACE</Text>
                                        <Text style={styles.tableHeaderColStat}>EFF%</Text>
                                    </>
                                )}
                            </View>

                            {/* Table Data Rows */}
                            {visibleAthletes.map((item) => (
                                <View key={item.athlete_id} style={styles.tableDataRow}>
                                    <View style={{ width: 150 }}>
                                        <Text style={styles.cellNameText} numberOfLines={1}>
                                            {item.player_name}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => handleToggleTeam(item.athlete_id)}
                                            activeOpacity={0.7}
                                            style={[
                                                styles.playerTeamBadge,
                                                (item.team_name || "").toUpperCase() === (rawOCRData.team_name || "").toUpperCase()
                                                    ? { borderColor: "#00C8FF", backgroundColor: "rgba(0, 200, 255, 0.12)" }
                                                    : { borderColor: "#F59E0B", backgroundColor: "rgba(245, 158, 11, 0.12)" }
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.playerTeamText,
                                                    (item.team_name || "").toUpperCase() === (rawOCRData.team_name || "").toUpperCase()
                                                        ? { color: "#00C8FF" }
                                                        : { color: "#F59E0B" }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.team_name || "ASSIGN"} ⇄
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {isBasketball && (
                                        <>
                                            {isEditing ? (
                                                <>
                                                    <TextInput
                                                        style={styles.cellStatInput}
                                                        keyboardType="number-pad"
                                                        value={String(item.pts ?? 0)}
                                                        onChangeText={(val) => handleStatChange(item.athlete_id, "pts", val)}
                                                    />
                                                    <TextInput
                                                        style={styles.cellStatInput}
                                                        keyboardType="number-pad"
                                                        value={String(item.ast ?? 0)}
                                                        onChangeText={(val) => handleStatChange(item.athlete_id, "ast", val)}
                                                    />
                                                    <TextInput
                                                        style={styles.cellStatInput}
                                                        keyboardType="number-pad"
                                                        value={String(item.to ?? 0)}
                                                        onChangeText={(val) => handleStatChange(item.athlete_id, "to", val)}
                                                    />
                                                    <TextInput
                                                        style={styles.cellStatInput}
                                                        keyboardType="number-pad"
                                                        value={String(item.reb ?? 0)}
                                                        onChangeText={(val) => handleStatChange(item.athlete_id, "reb", val)}
                                                    />
                                                    <TextInput
                                                        style={styles.cellStatInput}
                                                        keyboardType="number-pad"
                                                        value={String(item.stl ?? 0)}
                                                        onChangeText={(val) => handleStatChange(item.athlete_id, "stl", val)}
                                                    />
                                                    <TextInput
                                                        style={styles.cellStatInput}
                                                        keyboardType="number-pad"
                                                        value={String(item.blk ?? 0)}
                                                        onChangeText={(val) => handleStatChange(item.athlete_id, "blk", val)}
                                                    />
                                                    <TextInput
                                                        style={styles.cellStatInput}
                                                        keyboardType="number-pad"
                                                        value={String(item.min ?? 0)}
                                                        onChangeText={(val) => handleStatChange(item.athlete_id, "min", val)}
                                                    />
                                                    <Text style={styles.cellStatText}>{item.fg_pct || "50%"}</Text>
                                                </>
                                            ) : (
                                                <>
                                                    <Text style={styles.cellStatText}>{item.pts ?? 0}</Text>
                                                    <Text style={styles.cellStatText}>{item.ast ?? 0}</Text>
                                                    <Text style={styles.cellStatText}>{item.to ?? 0}</Text>
                                                    <Text style={styles.cellStatText}>{item.reb ?? 0}</Text>
                                                    <Text style={styles.cellStatText}>{item.stl ?? 0}</Text>
                                                    <Text style={styles.cellStatText}>{item.blk ?? 0}</Text>
                                                    <Text style={styles.cellStatText}>{item.min ?? 0}</Text>
                                                    <Text style={styles.cellStatText}>{item.fg_pct || "50%"}</Text>
                                                </>
                                            )}
                                        </>
                                    )}

                                    {isSwimming && (
                                        <>
                                            <Text style={styles.cellStatText}>{item.event || "100M FREE"}</Text>
                                            <Text style={styles.cellStatText}>{item.time || "54.12s"}</Text>
                                            <Text style={styles.cellStatText}>{item.stroke_count || 45}</Text>
                                            <Text style={styles.cellStatText}>{item.split || "26.1s"}</Text>
                                            <Text style={styles.cellStatText}>{item.pace || "1'04/m"}</Text>
                                            <Text style={styles.cellStatText}>{item.reaction_sec || "0.64s"}</Text>
                                        </>
                                    )}

                                    {isTrack && (
                                        <>
                                            <Text style={styles.cellStatText}>{item.event || "400M"}</Text>
                                            <Text style={styles.cellStatText}>{item.time || "48.20s"}</Text>
                                            <Text style={styles.cellStatText}>{item.split || "11.8s"}</Text>
                                            <Text style={styles.cellStatText}>{item.split_2 || "24.1s"}</Text>
                                            <Text style={styles.cellStatText}>{item.pace || "3'12/k"}</Text>
                                            <Text style={styles.cellStatText}>94.5%</Text>
                                        </>
                                    )}
                                </View>
                            ))}

                            {/* Totals Row (Basketball Mode) */}
                            {isBasketball && (
                                <View style={[styles.tableDataRow, styles.totalsRow]}>
                                    <Text style={styles.cellNameText}>TOTAL</Text>
                                    <Text style={styles.cellStatText}>{totals.pts}</Text>
                                    <Text style={styles.cellStatText}>{totals.ast}</Text>
                                    <Text style={styles.cellStatText}>{totals.to}</Text>
                                    <Text style={styles.cellStatText}>{totals.reb}</Text>
                                    <Text style={styles.cellStatText}>{totals.stl}</Text>
                                    <Text style={styles.cellStatText}>{totals.blk}</Text>
                                    <Text style={styles.cellStatText}>{totals.min}</Text>
                                    <Text style={styles.cellStatText}>-</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>

                {/* EXPANDED PERFORMANCE METRICS */}
                <View style={styles.cardSection}>
                    <Text style={styles.subLabel}>EXPANDED PERFORMANCE METRICS</Text>
                    <View style={styles.cardDivider} />

                    {/* BASKETBALL EXPANDED VIEW */}
                    {isBasketball && (
                        <>
                            <Text style={[styles.subLabel, { color: "#8E9BAE", marginBottom: 8 }]}>
                                SHOOTING EFFICIENCY
                            </Text>
                            <View style={styles.shootingGrid}>
                                <View style={styles.efficiencyCard}>
                                    <Text style={styles.effLabel}>1PT (FT)</Text>
                                    <Text style={styles.effValue}>
                                        {rawOCRData.expanded_metrics.shooting_efficiency?.ft_made || 42} /{" "}
                                        {rawOCRData.expanded_metrics.shooting_efficiency?.ft_attempts || 56}
                                    </Text>
                                </View>
                                <View style={styles.efficiencyCard}>
                                    <Text style={styles.effLabel}>2PT FIELD</Text>
                                    <Text style={styles.effValue}>
                                        {rawOCRData.expanded_metrics.shooting_efficiency?.pt2_made || 31} /{" "}
                                        {rawOCRData.expanded_metrics.shooting_efficiency?.pt2_attempts || 48}
                                    </Text>
                                </View>
                                <View style={styles.efficiencyCard}>
                                    <Text style={styles.effLabel}>3PT FIELD</Text>
                                    <Text style={styles.effValue}>
                                        {rawOCRData.expanded_metrics.shooting_efficiency?.pt3_made || 12} /{" "}
                                        {rawOCRData.expanded_metrics.shooting_efficiency?.pt3_attempts || 29}
                                    </Text>
                                </View>
                            </View>

                            <Text style={[styles.subLabel, { color: "#8E9BAE", marginBottom: 8 }]}>
                                POSSESSION & ERRORS
                            </Text>
                            <View style={styles.possessionGrid}>
                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>KEY DRIVES</Text>
                                    <Text style={styles.metricValue}>
                                        {rawOCRData.expanded_metrics.possession_errors?.key_drives || 18}
                                    </Text>
                                </View>

                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>ASSISTS</Text>
                                    <Text style={styles.metricValue}>
                                        {rawOCRData.expanded_metrics.possession_errors?.assists || 24}
                                    </Text>
                                </View>

                                <View style={[styles.metricCard, styles.metricCardRed]}>
                                    <Text style={styles.metricLabel}>TURNOVERS</Text>
                                    <Text style={styles.metricValue}>
                                        {rawOCRData.expanded_metrics.possession_errors?.turnovers || 12}
                                    </Text>
                                </View>

                                <View style={[styles.metricCard, styles.metricCardRed]}>
                                    <Text style={styles.metricLabel}>SCV-12S</Text>
                                    <Text style={styles.metricValue}>
                                        0{rawOCRData.expanded_metrics.possession_errors?.scv_12s || 3}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.footnoteText}>
                                *SCV-12S: 12-Second Shot Clock Violations
                            </Text>
                        </>
                    )}

                    {/* SWIMMING / TRACK EXPANDED VIEW */}
                    {(isSwimming || isTrack) && (
                        <View style={styles.possessionGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>STROKE RATE / PACE</Text>
                                <Text style={styles.metricValue}>52 SPM</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>SPLIT EFFICIENCY</Text>
                                <Text style={styles.metricValue}>94.2%</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ACTION BUTTONS STACK */}
                <View style={styles.actionStack}>
                    {/* CONFIRM & SAVE */}
                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleSave}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="checkmark-circle" size={20} color="#070D19" />
                        <Text style={styles.confirmButtonText}>CONFIRM & SAVE</Text>
                    </TouchableOpacity>

                    {/* EDIT RAW SCORESHEET */}
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setIsEditing(!isEditing)}
                        activeOpacity={0.85}
                    >
                        <Ionicons
                            name={isEditing ? "checkmark-outline" : "create-outline"}
                            size={18}
                            color="#FFFFFF"
                        />
                        <Text style={styles.editButtonText}>
                            {isEditing ? "SAVE MANUAL OVERRIDES" : "EDIT RAW SCORESHEET"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* CUSTOM SUCCESS ALERT MODAL */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModalCard}>
                        <View style={styles.successIconBadge}>
                            <Ionicons name="checkmark-circle" size={44} color="#00C8FF" />
                        </View>

                        <Text style={styles.successModalTitle}>STATISTICS VERIFIED & SAVED</Text>
                        <Text style={styles.successModalSubtitle}>
                            Raw performance metrics have been successfully verified and saved to the player rosters.
                        </Text>

                        <View style={styles.successSummaryBox}>
                            <View style={styles.summaryChip}>
                                <Text style={styles.chipLabel}>TEAM</Text>
                                <Text style={styles.chipValue} numberOfLines={1}>{rawOCRData.team_name}</Text>
                            </View>
                            <View style={styles.summaryChip}>
                                <Text style={styles.chipLabel}>ATHLETES</Text>
                                <Text style={styles.chipValue}>{athleteStats.length} Updated</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.modalCtaButton}
                            onPress={() => {
                                setShowSuccessModal(false);
                                if (onConfirmSave) {
                                    onConfirmSave({
                                        ...rawOCRData,
                                        athlete_overview: athleteStats,
                                    });
                                }
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.modalCtaText}>VIEW PERFORMANCE & STATS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default OCRoutput;

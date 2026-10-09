import React, { useState, useMemo, useCallback, useEffect } from "react";
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
    position?: string;
    // Basketball
    pts?: number;
    ast?: number;
    to?: number;
    reb?: number;
    stl?: number;
    blk?: number;
    min?: number;
    fg_pct?: string;
    fg_made?: number;
    fg_attempted?: number;
    three_made?: number;
    three_attempted?: number;
    ft_made?: number;
    ft_attempted?: number;
    // Volleyball
    kills?: number;
    attack_errors?: number;
    attack_attempts?: number;
    hitting_pct?: number | string;
    block_solos?: number;
    block_assists?: number;
    block_points?: number;
    digs?: number;
    service_aces?: number;
    service_errors?: number;
    reception_errors?: number;
    sets_played?: number;
    // Soccer
    goals?: number;
    shots?: number;
    shots_on_target?: number;
    fouls?: number;
    yellow_cards?: number;
    red_cards?: number;
    saves?: number;
    tackles?: number;
    // Timed / Individual (Swimming / Track)
    time?: string;
    finish_time?: string;
    event?: string;
    event_name?: string;
    stroke_count?: number;
    distance_m?: number;
    split?: string;
    split_time?: string;
    split_2?: string;
    seed_time?: string;
    pace?: string;
    reaction_sec?: string;
    heat?: number;
    lane?: number;
    rank?: number;
    // Badminton / Racket
    smash_winners?: number;
    net_kills?: number;
    unforced_errors?: number;
    service_faults?: number;
    [key: string]: any;
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
    volleyball_metrics?: {
        total_kills: number;
        total_digs: number;
        total_blocks: number;
        total_aces: number;
        total_errors: number;
    };
    soccer_metrics?: {
        total_goals: number;
        total_assists: number;
        total_shots: number;
        total_saves: number;
    };
    racket_metrics?: {
        total_points: number;
        total_smashes: number;
        total_net_kills: number;
        total_faults: number;
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
    sport_type: "BASKETBALL" | "VOLLEYBALL" | "SWIMMING" | "TRACK AND FIELD" | "BADMINTON" | "PICKLEBALL" | "SOCCER" | string;
    file_name?: string;
    athlete_overview: DetectedAthleteStat[];
    expanded_metrics: ExpandedPerformanceMetrics;
    batch_matches?: RawOCRDetectedData[];
}

interface OCRoutputProps {
    rawOCRData?: RawOCRDetectedData;
    onBack?: () => void;
    onConfirmSave?: (finalData: RawOCRDetectedData) => void;
}

const DEFAULT_RAW_BASKETBALL_OCR: RawOCRDetectedData = {
    team_name: "",
    opponent_team_name: "",
    final_score: "",
    game_result: "",
    sport_type: "BASKETBALL",
    teams: [],
    team_scores: [],
    athlete_overview: [],
    expanded_metrics: {
        shooting_efficiency: {
            ft_made: 0,
            ft_attempts: 0,
            pt2_made: 0,
            pt2_attempts: 0,
            pt3_made: 0,
            pt3_attempts: 0,
        },
        possession_errors: {
            key_drives: 0,
            assists: 0,
            turnovers: 0,
            scv_12s: 0,
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
    const headerTopPadding = Math.max(insets.top, 16) + 10;

    // Batch Matches Support: Only separate if different distinct sports/matches were intentionally provided
    const matchesList: RawOCRDetectedData[] = useMemo(() => {
        if (Array.isArray(rawOCRData.batch_matches) && rawOCRData.batch_matches.length > 1) {
            // If all batch matches belong to the same sport & same teams (e.g. 1st half & 2nd half parts), consolidate into single match
            const firstSport = (rawOCRData.batch_matches[0].sport_type || "").toUpperCase();
            const firstHome = (rawOCRData.batch_matches[0].team_name || "").toUpperCase();
            const allSameMatch = rawOCRData.batch_matches.every(
                (m) =>
                    (m.sport_type || "").toUpperCase() === firstSport &&
                    (m.team_name || "").toUpperCase() === firstHome
            );

            if (allSameMatch) {
                return [rawOCRData];
            }
            return rawOCRData.batch_matches;
        }
        return [rawOCRData];
    }, [rawOCRData]);

    const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
    const currentActiveMatch = matchesList[activeMatchIndex] || rawOCRData;

    // Inline Editing Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");

    // Dynamic Editable Athletes Data State (per active match)
    const [athleteStatsMap, setAthleteStatsMap] = useState<Record<number, DetectedAthleteStat[]>>(() => {
        const init: Record<number, DetectedAthleteStat[]> = {};
        matchesList.forEach((m, idx) => {
            init[idx] = m.athlete_overview || [];
        });
        return init;
    });

    useEffect(() => {
        const updated: Record<number, DetectedAthleteStat[]> = {};
        matchesList.forEach((m, idx) => {
            updated[idx] = m.athlete_overview || [];
        });
        setAthleteStatsMap(updated);
    }, [matchesList]);

    const athleteStats = athleteStatsMap[activeMatchIndex] || currentActiveMatch.athlete_overview || [];

    const setAthleteStats = (updateFn: DetectedAthleteStat[] | ((prev: DetectedAthleteStat[]) => DetectedAthleteStat[])) => {
        setAthleteStatsMap((prevMap) => {
            const currentList = prevMap[activeMatchIndex] || currentActiveMatch.athlete_overview || [];
            const nextList = typeof updateFn === "function" ? updateFn(currentList) : updateFn;
            return {
                ...prevMap,
                [activeMatchIndex]: nextList,
            };
        });
    };

    const sportUpper = (currentActiveMatch.sport_type || "BASKETBALL").toUpperCase();
    const isVolleyball = sportUpper.includes("VOLLEY");
    const isSwimming = sportUpper.includes("SWIM");
    const isTrack = sportUpper.includes("TRACK") || sportUpper.includes("RUN") || sportUpper.includes("FIELD") || sportUpper.includes("ATHLETIC");
    const isRacket = sportUpper.includes("BADMINTON") || sportUpper.includes("PICKLE") || sportUpper.includes("TENNIS");
    const isSoccer = sportUpper.includes("SOCCER") || sportUpper.includes("FOOTBALL");
    const isBaseball = sportUpper.includes("BASE") || sportUpper.includes("SOFT");
    const isIndividualSport = isSwimming || isTrack;
    const isBasketball = !isVolleyball && !isSwimming && !isTrack && !isRacket && !isSoccer && !isBaseball;

    // List of all detected unique teams
    const teamList = useMemo(() => {
        const set = new Set<string>();
        if (currentActiveMatch.teams && Array.isArray(currentActiveMatch.teams)) {
            currentActiveMatch.teams.forEach((t) => set.add(String(t).trim()));
        }
        if (currentActiveMatch.team_scores && Array.isArray(currentActiveMatch.team_scores)) {
            currentActiveMatch.team_scores.forEach((t) => set.add(String(t.team).trim()));
        }
        if (currentActiveMatch.team_name) set.add(String(currentActiveMatch.team_name).trim());
        if (currentActiveMatch.opponent_team_name) set.add(String(currentActiveMatch.opponent_team_name).trim());
        athleteStats.forEach((a) => {
            if (a.team_name) set.add(String(a.team_name).trim());
        });
        return Array.from(set).filter((t) => t.length > 0);
    }, [currentActiveMatch, athleteStats]);

    const sportDisplayName = isVolleyball
        ? "VOLLEYBALL"
        : isSwimming
        ? "SWIMMING"
        : isTrack
        ? "TRACK & FIELD"
        : isRacket
        ? (sportUpper.includes("BADMINTON") ? "BADMINTON" : "PICKLEBALL")
        : isSoccer
        ? "SOCCER"
        : isBaseball
        ? "BASEBALL"
        : isBasketball
        ? "BASKETBALL"
        : sportUpper;

    const homeTeamDisplay = (currentActiveMatch.team_name || teamList[0] || "HOME TEAM").toUpperCase();
    const awayTeamDisplay = (currentActiveMatch.opponent_team_name || teamList[1] || (teamList[0] && teamList[0].toUpperCase() !== homeTeamDisplay ? teamList[0] : "OPPONENT")).toUpperCase();

    const scoreboardTitleText = isVolleyball
        ? "VOLLEYBALL MATCH SCOREBOARD"
        : isSoccer
        ? "SOCCER MATCH SCOREBOARD"
        : isBaseball
        ? "BASEBALL GAME SCOREBOARD"
        : isSwimming
        ? "SWIMMING EVENT SUMMARY"
        : isTrack
        ? "TRACK & FIELD MEET SUMMARY"
        : isRacket
        ? `${sportDisplayName} MATCH SCOREBOARD`
        : "MATCH SCOREBOARD";

    const getDynamicTeamScore = useCallback((teamName: string) => {
        if (!teamName) return { primary: "0 PTS", secondary: undefined };
        const found = currentActiveMatch.team_scores?.find(
            (t) => (t.team || "").trim().toUpperCase() === teamName.trim().toUpperCase()
        );
        const teamAthletes = athleteStats.filter(
            (a) => (a.team_name || "").trim().toUpperCase() === teamName.trim().toUpperCase()
        );

        if (isVolleyball) {
            // Volleyball match score is SETS WON (typically 0-3 in best-of-5)
            let setsWon = 0;
            let totalMatchPoints = teamAthletes.reduce(
                (s, p) => s + Number(p.pts || (Number(p.kills || 0) + Number(p.service_aces || 0) + Number(p.block_points || 0))),
                0
            );

            if (found && found.score !== undefined && found.score !== null && !isNaN(Number(found.score))) {
                const rawNum = Number(found.score);
                if (rawNum <= 5) {
                    setsWon = rawNum;
                } else {
                    totalMatchPoints = rawNum;
                }
            }

            // If final_score string has set breakdown (e.g. "3 - 1" or "3-0")
            if (setsWon === 0 && currentActiveMatch.final_score) {
                const setMatch = currentActiveMatch.final_score.match(/(\d+)\s*[-:]\s*(\d+)/);
                if (setMatch) {
                    const isHome = teamName.toUpperCase() === homeTeamDisplay;
                    const homeSets = parseInt(setMatch[1], 10);
                    const awaySets = parseInt(setMatch[2], 10);
                    if (homeSets <= 5 && awaySets <= 5) {
                        setsWon = isHome ? homeSets : awaySets;
                    }
                }
            }

            if (setsWon > 0 || (currentActiveMatch.final_score && currentActiveMatch.final_score.match(/\b[0-3]\s*[-:]\s*[0-3]\b/))) {
                return {
                    primary: `${setsWon} SETS`,
                    secondary: totalMatchPoints > 0 ? `${totalMatchPoints} TOTAL PTS` : undefined,
                };
            }

            // Fallback to match points if sets are unspecified (never say 96 SETS!)
            return {
                primary: `${totalMatchPoints} PTS`,
                secondary: undefined,
            };
        }

        if (isSoccer) {
            let goals = teamAthletes.reduce((s, p) => s + Number(p.goals || 0), 0);
            if (found && found.score !== undefined && found.score !== null && !isNaN(Number(found.score))) {
                goals = Number(found.score);
            }
            return {
                primary: `${goals} GOALS`,
                secondary: undefined,
            };
        }

        if (isBaseball) {
            let runs = teamAthletes.reduce((s, p) => s + Number(p.runs || 0), 0);
            if (found && found.score !== undefined && found.score !== null && !isNaN(Number(found.score))) {
                runs = Number(found.score);
            }
            return {
                primary: `${runs} RUNS`,
                secondary: undefined,
            };
        }

        if (isRacket) {
            let pts = teamAthletes.reduce((s, p) => s + Number(p.pts || 0), 0);
            if (found && found.score !== undefined && found.score !== null && !isNaN(Number(found.score))) {
                pts = Number(found.score);
            }
            return {
                primary: `${pts} PTS`,
                secondary: undefined,
            };
        }

        // Basketball & Other Sports
        const athleteSum = teamAthletes.reduce((s, p) => s + Number(p.pts || 0), 0);
        let pts = athleteSum;
        if (found && found.score !== undefined && found.score !== null && !isNaN(Number(found.score))) {
            pts = Math.max(Number(found.score), athleteSum);
        }
        return {
            primary: `${pts} PTS`,
            secondary: undefined,
        };
    }, [currentActiveMatch, athleteStats, isVolleyball, isSoccer, isBaseball, isRacket, homeTeamDisplay]);

    // Filtered athlete list based on active team filter tab
    const visibleAthletes = useMemo(() => {
        if (selectedTeamFilter === "ALL") return athleteStats;
        return athleteStats.filter(
            (a) => (a.team_name || "").toUpperCase() === selectedTeamFilter.toUpperCase()
        );
    }, [athleteStats, selectedTeamFilter]);

    // Dynamic Totals Calculation based on visible athletes and active sport
    const totals = useMemo(() => {
        return visibleAthletes.reduce(
            (acc, curr) => {
                // Basketball
                acc.pts += Number(curr.pts || 0);
                acc.ast += Number(curr.ast || 0);
                acc.to += Number(curr.to || 0);
                acc.reb += Number(curr.reb || 0);
                acc.stl += Number(curr.stl || 0);
                acc.blk += Number(curr.blk || 0);
                acc.min += Number(curr.min || 0);
                // Volleyball
                acc.kills += Number(curr.kills || 0);
                acc.attack_errors += Number(curr.attack_errors || 0);
                acc.attack_attempts += Number(curr.attack_attempts || 0);
                acc.digs += Number(curr.digs || 0);
                acc.service_aces += Number(curr.service_aces || 0);
                acc.block_points += Number(curr.block_points || 0);
                // Soccer
                acc.goals += Number(curr.goals || 0);
                acc.shots += Number(curr.shots || 0);
                acc.shots_on_target += Number(curr.shots_on_target || 0);
                acc.saves += Number(curr.saves || 0);
                acc.tackles += Number(curr.tackles || 0);
                acc.fouls += Number(curr.fouls || 0);
                // Racket
                acc.smash_winners += Number(curr.smash_winners || 0);
                acc.net_kills += Number(curr.net_kills || 0);
                acc.unforced_errors += Number(curr.unforced_errors || 0);
                acc.service_faults += Number(curr.service_faults || 0);
                return acc;
            },
            {
                pts: 0, ast: 0, to: 0, reb: 0, stl: 0, blk: 0, min: 0,
                kills: 0, attack_errors: 0, attack_attempts: 0, digs: 0, service_aces: 0, block_points: 0,
                goals: 0, shots: 0, shots_on_target: 0, saves: 0, tackles: 0, fouls: 0,
                smash_winners: 0, net_kills: 0, unforced_errors: 0, service_faults: 0,
            }
        );
    }, [visibleAthletes]);

    // Stat Cell Edit Handler
    const handleStatChange = useCallback(
        (targetAthleteId: string, field: string, value: string) => {
            setAthleteStats((prev) => {
                const updated = [...prev];
                const itemIdx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
                if (itemIdx === -1) return prev;
                const numVal = parseInt(value, 10);
                const isNumericField = !['time', 'finish_time', 'split', 'split_time', 'event', 'event_name', 'fg_pct', 'hitting_pct'].includes(field);
                updated[itemIdx] = {
                    ...updated[itemIdx],
                    [field]: isNumericField ? (isNaN(numVal) ? 0 : numVal) : value,
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
                const home = (currentActiveMatch.team_name || "HOME").toUpperCase();
                const away = (currentActiveMatch.opponent_team_name || "AWAY").toUpperCase();
                const nextTeam = current === home ? away : home;
                updated[itemIdx] = {
                    ...updated[itemIdx],
                    team_name: nextTeam,
                };
                return updated;
            });
        },
        [currentActiveMatch]
    );

    // Confirm & Save Action Handler
    const handleSave = useCallback(() => {
        if (onConfirmSave) {
            onConfirmSave({
                ...currentActiveMatch,
                athlete_overview: athleteStats,
            });
        }
        setShowSuccessModal(true);
    }, [currentActiveMatch, athleteStats, onConfirmSave]);

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
                    <Text style={styles.headerTitleBeside}>OCR RESULT • {sportDisplayName}</Text>
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
                {/* BATCH MATCHES SWITCHER TAB BAR (If multiple matches were uploaded) */}
                {matchesList.length > 1 && (
                    <View style={{ marginBottom: 16, backgroundColor: "#0E1626", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1E293B" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <Text style={{ color: "#00C8FF", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 }}>
                                UPLOADED MATCHES ({matchesList.length} SEPARATED)
                            </Text>
                            <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700" }}>
                                Match {activeMatchIndex + 1} of {matchesList.length}
                            </Text>
                        </View>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {matchesList.map((m, idx) => {
                                const isSelected = idx === activeMatchIndex;
                                const mSport = (m.sport_type || "BASKETBALL").toUpperCase();
                                const mTeam = (m.team_name || "").trim();
                                const teamLabel = mTeam ? (mTeam.length > 10 ? `${mTeam.slice(0, 8)}..` : mTeam) : `Match ${idx + 1}`;
                                const label = `M${idx + 1}: ${mSport.slice(0, 3)} • ${teamLabel}`;
                                return (
                                    <TouchableOpacity
                                        key={`match_tab_${idx}`}
                                        onPress={() => {
                                            setActiveMatchIndex(idx);
                                            setSelectedTeamFilter("ALL");
                                        }}
                                        activeOpacity={0.7}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 10,
                                            paddingHorizontal: 8,
                                            borderRadius: 8,
                                            backgroundColor: isSelected ? "#00C8FF" : "#131E32",
                                            borderWidth: 1.5,
                                            borderColor: isSelected ? "#00C8FF" : "#1E293B",
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <Ionicons
                                            name={isSelected ? "checkmark-circle" : "document-text-outline"}
                                            size={15}
                                            color={isSelected ? "#070D19" : "#94A3B8"}
                                        />
                                        <Text
                                            style={{
                                                color: isSelected ? "#070D19" : "#FFFFFF",
                                                fontWeight: isSelected ? "900" : "700",
                                                fontSize: 12,
                                                letterSpacing: 0.5,
                                                textAlign: "center",
                                            }}
                                            numberOfLines={1}
                                        >
                                            {label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* TITLE SECTION WITH UNDERLINE */}
                <View style={styles.topTitleSection}>
                    <Text style={styles.screenTitle}>DETECTED MATCH STATISTICS</Text>
                    <View style={styles.accentUnderline} />
                </View>

                {/* DYNAMIC MATCH SCOREBOARD / EVENT SUMMARY */}
                {isIndividualSport ? (
                    <View style={styles.scoreboardCard}>
                        <View style={styles.scoreboardHeader}>
                            <Text style={styles.scoreboardTitle}>{scoreboardTitleText}</Text>
                            <Text style={{ color: "#00C8FF", fontSize: 12, fontWeight: "800" }}>
                                {athleteStats.length} COMPETITORS
                            </Text>
                        </View>
                        <View style={styles.scoreboardMatchScore}>
                            <View style={styles.teamScoreBox}>
                                <Text style={styles.identityLabel}>EVENT / DISCIPLINE</Text>
                                <Text style={styles.teamScoreName} numberOfLines={1}>
                                    {athleteStats[0]?.event || athleteStats[0]?.event_name || currentActiveMatch.team_name || "TIMED EVENT"}
                                </Text>
                            </View>
                            <View style={[styles.teamScoreBox, { alignItems: "flex-end" }]}>
                                <Text style={styles.identityLabel}>TOP RECORDED TIME</Text>
                                <Text style={styles.teamScoreNum}>
                                    {athleteStats.find((a) => a.time || a.finish_time)?.time || athleteStats[0]?.time || "00:00.00"}
                                </Text>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.scoreboardCard}>
                        <View style={styles.scoreboardHeader}>
                            <Text style={styles.scoreboardTitle}>{scoreboardTitleText}</Text>
                            <Text style={{ color: "#00C8FF", fontSize: 12, fontWeight: "800" }}>
                                FINAL: {currentActiveMatch.final_score || `${getDynamicTeamScore(homeTeamDisplay).primary.replace(/[^0-9]/g, '') || '0'} - ${getDynamicTeamScore(awayTeamDisplay).primary.replace(/[^0-9]/g, '') || '0'}`}
                            </Text>
                        </View>
                        <View style={styles.scoreboardMatchScore}>
                            <View style={styles.teamScoreBox}>
                                <Text style={styles.teamScoreName} numberOfLines={1}>{homeTeamDisplay}</Text>
                                <Text style={styles.teamScoreNum}>
                                    {getDynamicTeamScore(homeTeamDisplay).primary}
                                </Text>
                                {getDynamicTeamScore(homeTeamDisplay).secondary ? (
                                    <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                                        {getDynamicTeamScore(homeTeamDisplay).secondary}
                                    </Text>
                                ) : null}
                            </View>
                            <Text style={styles.vsText}>VS</Text>
                            <View style={[styles.teamScoreBox, { alignItems: "flex-end" }]}>
                                <Text style={styles.teamScoreName} numberOfLines={1}>{awayTeamDisplay}</Text>
                                <Text style={styles.teamScoreNum}>
                                    {getDynamicTeamScore(awayTeamDisplay).primary}
                                </Text>
                                {getDynamicTeamScore(awayTeamDisplay).secondary ? (
                                    <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                                        {getDynamicTeamScore(awayTeamDisplay).secondary}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    </View>
                )}

                {/* MATCH IDENTITY CARD */}
                <View style={styles.cardSection}>
                    <Text style={styles.subLabel}>MATCH IDENTITY</Text>
                    <View style={styles.cardDivider} />
                    <View style={styles.twoColumnGrid}>
                        <View style={styles.identityCol}>
                            <Text style={styles.identityLabel}>
                                {isIndividualSport ? "EVENT / DISCIPLINE:" : "HOME_TEAM:"}
                            </Text>
                            <Text style={styles.identityValue}>
                                {isIndividualSport
                                    ? (athleteStats[0]?.event || athleteStats[0]?.event_name || currentActiveMatch.team_name || "TIMED EVENT")
                                    : (currentActiveMatch.team_name || homeTeamDisplay)}
                            </Text>
                        </View>
                        <View style={styles.identityCol}>
                            <Text style={styles.identityLabel}>
                                {isIndividualSport ? "PARTICIPANTS:" : "OPPONENT:"}
                            </Text>
                            <Text style={styles.identityValue}>
                                {isIndividualSport
                                    ? `${athleteStats.length} REGISTERED ATHLETES`
                                    : (currentActiveMatch.opponent_team_name || awayTeamDisplay || "N/A")}
                            </Text>
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
                    <Text style={styles.subLabel}>PERFORMANCE METRICS ({selectedTeamFilter}) • {sportDisplayName}</Text>
                    <Text style={styles.swipeHintText}>Swipe right →</Text>
                </View>

                {/* HORIZONTALLY SCROLLABLE SPORT-SPECIFIC TABLE CONTAINER */}
                <View style={styles.tableCard}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        nestedScrollEnabled
                    >
                        <View style={{ minWidth: 680 }}>
                            {/* Table Header Row */}
                            <View style={styles.tableHeaderRow}>
                                <Text style={styles.tableHeaderColName}>
                                    {isSwimming ? "SWIMMER" : isTrack ? "ATHLETE" : "PLAYER NAME"}
                                </Text>

                                {isVolleyball && (
                                    <>
                                        <Text style={styles.tableHeaderColStat}>KILLS</Text>
                                        <Text style={styles.tableHeaderColStat}>ERR</Text>
                                        <Text style={styles.tableHeaderColStat}>ATT</Text>
                                        <Text style={styles.tableHeaderColStat}>AST</Text>
                                        <Text style={styles.tableHeaderColStat}>ACES</Text>
                                        <Text style={styles.tableHeaderColStat}>DIGS</Text>
                                        <Text style={styles.tableHeaderColStat}>BLKS</Text>
                                        <Text style={styles.tableHeaderColStat}>PTS</Text>
                                        <Text style={styles.tableHeaderColStat}>HIT%</Text>
                                    </>
                                )}

                                {isSwimming && (
                                    <>
                                        <Text style={styles.tableHeaderColStat}>EVENT</Text>
                                        <Text style={styles.tableHeaderColStat}>TIME</Text>
                                        <Text style={styles.tableHeaderColStat}>SPLIT</Text>
                                        <Text style={styles.tableHeaderColStat}>RANK</Text>
                                        <Text style={styles.tableHeaderColStat}>LANE</Text>
                                        <Text style={styles.tableHeaderColStat}>HEAT</Text>
                                        <Text style={styles.tableHeaderColStat}>STROKES</Text>
                                        <Text style={styles.tableHeaderColStat}>PTS</Text>
                                    </>
                                )}

                                {isTrack && (
                                    <>
                                        <Text style={styles.tableHeaderColStat}>EVENT</Text>
                                        <Text style={styles.tableHeaderColStat}>TIME/MARK</Text>
                                        <Text style={styles.tableHeaderColStat}>SPLIT</Text>
                                        <Text style={styles.tableHeaderColStat}>RANK</Text>
                                        <Text style={styles.tableHeaderColStat}>HEAT</Text>
                                        <Text style={styles.tableHeaderColStat}>DIST</Text>
                                        <Text style={styles.tableHeaderColStat}>PTS</Text>
                                    </>
                                )}

                                {isSoccer && (
                                    <>
                                        <Text style={styles.tableHeaderColStat}>GOALS</Text>
                                        <Text style={styles.tableHeaderColStat}>AST</Text>
                                        <Text style={styles.tableHeaderColStat}>SHOTS</Text>
                                        <Text style={styles.tableHeaderColStat}>SOG</Text>
                                        <Text style={styles.tableHeaderColStat}>SAVES</Text>
                                        <Text style={styles.tableHeaderColStat}>TKL</Text>
                                        <Text style={styles.tableHeaderColStat}>FOULS</Text>
                                        <Text style={styles.tableHeaderColStat}>YC/RC</Text>
                                        <Text style={styles.tableHeaderColStat}>MIN</Text>
                                    </>
                                )}

                                {isRacket && (
                                    <>
                                        <Text style={styles.tableHeaderColStat}>SMASH</Text>
                                        <Text style={styles.tableHeaderColStat}>NET KILL</Text>
                                        <Text style={styles.tableHeaderColStat}>ERRORS</Text>
                                        <Text style={styles.tableHeaderColStat}>FAULTS</Text>
                                        <Text style={styles.tableHeaderColStat}>ACES</Text>
                                        <Text style={styles.tableHeaderColStat}>PTS</Text>
                                    </>
                                )}

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
                                                (item.team_name || "").toUpperCase() === (currentActiveMatch.team_name || "").toUpperCase()
                                                    ? { borderColor: "#00C8FF", backgroundColor: "rgba(0, 200, 255, 0.12)" }
                                                    : { borderColor: "#F59E0B", backgroundColor: "rgba(245, 158, 11, 0.12)" }
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.playerTeamText,
                                                    (item.team_name || "").toUpperCase() === (currentActiveMatch.team_name || "").toUpperCase()
                                                        ? { color: "#00C8FF" }
                                                        : { color: "#F59E0B" }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.team_name || "ASSIGN"} ⇄
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* VOLLEYBALL ROW */}
                                    {isVolleyball && (
                                        isEditing ? (
                                            <>
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.kills ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "kills", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.attack_errors ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "attack_errors", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.attack_attempts ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "attack_attempts", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.ast ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "ast", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.service_aces ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "service_aces", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.digs ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "digs", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.block_points ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "block_points", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.pts ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "pts", val)} />
                                                <Text style={styles.cellStatText}>{item.hitting_pct || "0%"}</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={styles.cellStatText}>{item.kills ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.attack_errors ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.attack_attempts ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.ast ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.service_aces ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.digs ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.block_points ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.pts ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.hitting_pct || "0%"}</Text>
                                            </>
                                        )
                                    )}

                                    {/* SWIMMING ROW */}
                                    {isSwimming && (
                                        isEditing ? (
                                            <>
                                                <TextInput style={styles.cellStatInput} value={String(item.event || item.event_name || "")} onChangeText={(val) => handleStatChange(item.athlete_id, "event", val)} />
                                                <TextInput style={styles.cellStatInput} value={String(item.time || item.finish_time || "")} onChangeText={(val) => handleStatChange(item.athlete_id, "time", val)} />
                                                <TextInput style={styles.cellStatInput} value={String(item.split || "")} onChangeText={(val) => handleStatChange(item.athlete_id, "split", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.rank ?? 1)} onChangeText={(val) => handleStatChange(item.athlete_id, "rank", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.lane ?? 1)} onChangeText={(val) => handleStatChange(item.athlete_id, "lane", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.heat ?? 1)} onChangeText={(val) => handleStatChange(item.athlete_id, "heat", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.stroke_count ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "stroke_count", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.pts ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "pts", val)} />
                                            </>
                                        ) : (
                                            <>
                                                <Text style={styles.cellStatText}>{item.event || item.event_name || "-"}</Text>
                                                <Text style={styles.cellStatText}>{item.time || item.finish_time || "-"}</Text>
                                                <Text style={styles.cellStatText}>{item.split || "-"}</Text>
                                                <Text style={styles.cellStatText}>{item.rank ?? 1}</Text>
                                                <Text style={styles.cellStatText}>{item.lane ?? 1}</Text>
                                                <Text style={styles.cellStatText}>{item.heat ?? 1}</Text>
                                                <Text style={styles.cellStatText}>{item.stroke_count ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.pts ?? 0}</Text>
                                            </>
                                        )
                                    )}

                                    {/* TRACK & FIELD ROW */}
                                    {isTrack && (
                                        isEditing ? (
                                            <>
                                                <TextInput style={styles.cellStatInput} value={String(item.event || item.event_name || "")} onChangeText={(val) => handleStatChange(item.athlete_id, "event", val)} />
                                                <TextInput style={styles.cellStatInput} value={String(item.time || item.finish_time || "")} onChangeText={(val) => handleStatChange(item.athlete_id, "time", val)} />
                                                <TextInput style={styles.cellStatInput} value={String(item.split || "")} onChangeText={(val) => handleStatChange(item.athlete_id, "split", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.rank ?? 1)} onChangeText={(val) => handleStatChange(item.athlete_id, "rank", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.heat ?? 1)} onChangeText={(val) => handleStatChange(item.athlete_id, "heat", val)} />
                                                <TextInput style={styles.cellStatInput} value={String(item.distance_m ? item.distance_m + "m" : "")} onChangeText={(val) => handleStatChange(item.athlete_id, "distance_m", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.pts ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "pts", val)} />
                                            </>
                                        ) : (
                                            <>
                                                <Text style={styles.cellStatText}>{item.event || item.event_name || "-"}</Text>
                                                <Text style={styles.cellStatText}>{item.time || item.finish_time || "-"}</Text>
                                                <Text style={styles.cellStatText}>{item.split || "-"}</Text>
                                                <Text style={styles.cellStatText}>{item.rank ?? 1}</Text>
                                                <Text style={styles.cellStatText}>{item.heat ?? 1}</Text>
                                                <Text style={styles.cellStatText}>{item.distance_m ? `${item.distance_m}m` : "-"}</Text>
                                                <Text style={styles.cellStatText}>{item.pts ?? 0}</Text>
                                            </>
                                        )
                                    )}

                                    {/* SOCCER ROW */}
                                    {isSoccer && (
                                        isEditing ? (
                                            <>
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.goals ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "goals", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.ast ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "ast", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.shots ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "shots", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.shots_on_target ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "shots_on_target", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.saves ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "saves", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.tackles ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "tackles", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.fouls ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "fouls", val)} />
                                                <Text style={styles.cellStatText}>{item.yellow_cards ?? 0}/{item.red_cards ?? 0}</Text>
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.min ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "min", val)} />
                                            </>
                                        ) : (
                                            <>
                                                <Text style={styles.cellStatText}>{item.goals ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.ast ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.shots ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.shots_on_target ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.saves ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.tackles ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.fouls ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.yellow_cards ?? 0}/{item.red_cards ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.min ?? 0}</Text>
                                            </>
                                        )
                                    )}

                                    {/* RACKET ROW */}
                                    {isRacket && (
                                        isEditing ? (
                                            <>
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.smash_winners ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "smash_winners", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.net_kills ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "net_kills", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.unforced_errors ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "unforced_errors", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.service_faults ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "service_faults", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.service_aces ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "service_aces", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.pts ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "pts", val)} />
                                            </>
                                        ) : (
                                            <>
                                                <Text style={styles.cellStatText}>{item.smash_winners ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.net_kills ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.unforced_errors ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.service_faults ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.service_aces ?? 0}</Text>
                                                <Text style={styles.cellStatText}>{item.pts ?? 0}</Text>
                                            </>
                                        )
                                    )}

                                    {/* BASKETBALL / DEFAULT ROW */}
                                    {isBasketball && (
                                        isEditing ? (
                                            <>
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.pts ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "pts", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.ast ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "ast", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.to ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "to", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.reb ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "reb", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.stl ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "stl", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.blk ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "blk", val)} />
                                                <TextInput style={styles.cellStatInput} keyboardType="number-pad" value={String(item.min ?? 0)} onChangeText={(val) => handleStatChange(item.athlete_id, "min", val)} />
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
                                        )
                                    )}
                                </View>
                            ))}

                            {/* Totals Row */}
                            <View style={[styles.tableDataRow, styles.totalsRow]}>
                                <Text style={styles.cellNameText}>TOTAL</Text>
                                {isVolleyball && (
                                    <>
                                        <Text style={styles.cellStatText}>{totals.kills}</Text>
                                        <Text style={styles.cellStatText}>{totals.attack_errors}</Text>
                                        <Text style={styles.cellStatText}>{totals.attack_attempts}</Text>
                                        <Text style={styles.cellStatText}>{totals.ast}</Text>
                                        <Text style={styles.cellStatText}>{totals.service_aces}</Text>
                                        <Text style={styles.cellStatText}>{totals.digs}</Text>
                                        <Text style={styles.cellStatText}>{totals.block_points}</Text>
                                        <Text style={styles.cellStatText}>{totals.pts}</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                    </>
                                )}
                                {isSwimming && (
                                    <>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>{visibleAthletes.length} SWIM</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>{totals.pts}</Text>
                                    </>
                                )}
                                {isTrack && (
                                    <>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>{visibleAthletes.length} RUN</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>{totals.pts}</Text>
                                    </>
                                )}
                                {isSoccer && (
                                    <>
                                        <Text style={styles.cellStatText}>{totals.goals}</Text>
                                        <Text style={styles.cellStatText}>{totals.ast}</Text>
                                        <Text style={styles.cellStatText}>{totals.shots}</Text>
                                        <Text style={styles.cellStatText}>{totals.shots_on_target}</Text>
                                        <Text style={styles.cellStatText}>{totals.saves}</Text>
                                        <Text style={styles.cellStatText}>{totals.tackles}</Text>
                                        <Text style={styles.cellStatText}>{totals.fouls}</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                        <Text style={styles.cellStatText}>{totals.min}</Text>
                                    </>
                                )}
                                {isRacket && (
                                    <>
                                        <Text style={styles.cellStatText}>{totals.smash_winners}</Text>
                                        <Text style={styles.cellStatText}>{totals.net_kills}</Text>
                                        <Text style={styles.cellStatText}>{totals.unforced_errors}</Text>
                                        <Text style={styles.cellStatText}>{totals.service_faults}</Text>
                                        <Text style={styles.cellStatText}>{totals.service_aces}</Text>
                                        <Text style={styles.cellStatText}>{totals.pts}</Text>
                                    </>
                                )}
                                {isBasketball && (
                                    <>
                                        <Text style={styles.cellStatText}>{totals.pts}</Text>
                                        <Text style={styles.cellStatText}>{totals.ast}</Text>
                                        <Text style={styles.cellStatText}>{totals.to}</Text>
                                        <Text style={styles.cellStatText}>{totals.reb}</Text>
                                        <Text style={styles.cellStatText}>{totals.stl}</Text>
                                        <Text style={styles.cellStatText}>{totals.blk}</Text>
                                        <Text style={styles.cellStatText}>{totals.min}</Text>
                                        <Text style={styles.cellStatText}>-</Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                </View>

                {/* EXPANDED PERFORMANCE METRICS */}
                <View style={styles.cardSection}>
                    <Text style={styles.subLabel}>EXPANDED PERFORMANCE METRICS • {sportDisplayName}</Text>
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
                                        {rawOCRData.expanded_metrics?.shooting_efficiency?.ft_made ?? 0} /{" "}
                                        {rawOCRData.expanded_metrics?.shooting_efficiency?.ft_attempts ?? 0}
                                    </Text>
                                </View>
                                <View style={styles.efficiencyCard}>
                                    <Text style={styles.effLabel}>2PT FIELD</Text>
                                    <Text style={styles.effValue}>
                                        {rawOCRData.expanded_metrics?.shooting_efficiency?.pt2_made ?? 0} /{" "}
                                        {rawOCRData.expanded_metrics?.shooting_efficiency?.pt2_attempts ?? 0}
                                    </Text>
                                </View>
                                <View style={styles.efficiencyCard}>
                                    <Text style={styles.effLabel}>3PT FIELD</Text>
                                    <Text style={styles.effValue}>
                                        {rawOCRData.expanded_metrics?.shooting_efficiency?.pt3_made ?? 0} /{" "}
                                        {rawOCRData.expanded_metrics?.shooting_efficiency?.pt3_attempts ?? 0}
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
                                        {rawOCRData.expanded_metrics?.possession_errors?.key_drives ?? 0}
                                    </Text>
                                </View>

                                <View style={styles.metricCard}>
                                    <Text style={styles.metricLabel}>ASSISTS</Text>
                                    <Text style={styles.metricValue}>
                                        {rawOCRData.expanded_metrics?.possession_errors?.assists ?? totals.ast}
                                    </Text>
                                </View>

                                <View style={[styles.metricCard, styles.metricCardRed]}>
                                    <Text style={styles.metricLabel}>TURNOVERS</Text>
                                    <Text style={styles.metricValue}>
                                        {rawOCRData.expanded_metrics?.possession_errors?.turnovers ?? totals.to}
                                    </Text>
                                </View>

                                <View style={[styles.metricCard, styles.metricCardRed]}>
                                    <Text style={styles.metricLabel}>STEALS</Text>
                                    <Text style={styles.metricValue}>
                                        {totals.stl}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}

                    {/* VOLLEYBALL EXPANDED VIEW */}
                    {isVolleyball && (
                        <View style={styles.possessionGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>TOTAL KILLS</Text>
                                <Text style={styles.metricValue}>{totals.kills}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>DIGS</Text>
                                <Text style={styles.metricValue}>{totals.digs}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>BLOCKS</Text>
                                <Text style={styles.metricValue}>{totals.block_points}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>SERVICE ACES</Text>
                                <Text style={styles.metricValue}>{totals.service_aces}</Text>
                            </View>
                        </View>
                    )}

                    {/* SOCCER EXPANDED VIEW */}
                    {isSoccer && (
                        <View style={styles.possessionGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>TOTAL GOALS</Text>
                                <Text style={styles.metricValue}>{totals.goals}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>SHOTS (SOG)</Text>
                                <Text style={styles.metricValue}>{totals.shots} ({totals.shots_on_target})</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>SAVES</Text>
                                <Text style={styles.metricValue}>{totals.saves}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>FOULS</Text>
                                <Text style={styles.metricValue}>{totals.fouls}</Text>
                            </View>
                        </View>
                    )}

                    {/* SWIMMING / TRACK EXPANDED VIEW */}
                    {(isSwimming || isTrack) && (
                        <View style={styles.possessionGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>PARTICIPANTS</Text>
                                <Text style={styles.metricValue}>{athleteStats.length}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>TOP RECORDED TIME</Text>
                                <Text style={styles.metricValue}>
                                    {athleteStats.find((a) => a.time || a.finish_time)?.time || athleteStats[0]?.time || "RECORDED"}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* RACKET SPORTS EXPANDED VIEW */}
                    {isRacket && (
                        <View style={styles.possessionGrid}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>SMASHES</Text>
                                <Text style={styles.metricValue}>{totals.smash_winners}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>NET KILLS</Text>
                                <Text style={styles.metricValue}>{totals.net_kills}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>ERRORS</Text>
                                <Text style={styles.metricValue}>{totals.unforced_errors}</Text>
                            </View>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>TOTAL POINTS</Text>
                                <Text style={styles.metricValue}>{totals.pts}</Text>
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

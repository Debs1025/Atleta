import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import styles from "./styles/OCRoutput";
import {
    loadDynamicSportsSchemas,
    getSportStatSchema,
} from "../MultiLogging/sportStatSchemas";
import {
    getEventsForSport,
    SportEventOption,
} from "../MultiLogging/sportEvents";

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
    seed?: string;
    pace?: string;
    reaction_sec?: string;
    heat?: number;
    lane?: number;
    rank?: number;
    place?: number;
    points?: number;
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
    team_id?: string;
    team_name: string;
    opponent_team_name?: string;
    final_score?: string;
    game_result?: string;
    team_scores?: TeamScoreItem[];
    teams?: string[];
    sport_type: "BASKETBALL" | "VOLLEYBALL" | "SWIMMING" | "TRACK AND FIELD" | "BADMINTON" | "PICKLEBALL" | "SOCCER" | string;
    event?: string;
    event_name?: string;
    event_type?: string;
    discipline?: string;
    file_name?: string;
    scoresheet_url?: string;
    scoresheetUrl?: string;
    roster_athletes?: string[];
    rosterAthletes?: string[];
    away_roster_athletes?: string[];
    awayRosterAthletes?: string[];
    player_stats?: any[];
    playerStats?: any[];
    athlete_overview: DetectedAthleteStat[];
    expanded_metrics: ExpandedPerformanceMetrics;
    injuries?: any[];
    batch_matches?: RawOCRDetectedData[];
}

interface OCRoutputProps {
    rawOCRData?: RawOCRDetectedData;
    currentTeam?: any;
    selectedTeamId?: string;
    teams?: any[];
    onBack?: () => void;
    onConfirmSave?: (finalData: RawOCRDetectedData) => void;
    onGoHome?: () => void;
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
    currentTeam,
    selectedTeamId,
    teams,
    onBack,
    onConfirmSave,
    onGoHome,
}: OCRoutputProps) {
    const insets = useSafeAreaInsets();
    const headerTopPadding = Math.max(insets.top, 16) + 10;

    const coachLockedTeam = useMemo(() => {
        return currentTeam || (teams && teams.find((t: any) => t.team_id === selectedTeamId)) || null;
    }, [currentTeam, selectedTeamId, teams]);

    const coachLockedTeamName = useMemo(() => {
        return (coachLockedTeam?.team_name || "").trim().toUpperCase();
    }, [coachLockedTeam]);

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

    const filterCoachAthletesForTimedSport = useCallback((athletes: DetectedAthleteStat[], sportType: string) => {
        const sUpper = (sportType || "").toUpperCase();
        const isInd = sUpper.includes("SWIM") || sUpper.includes("TRACK") || sUpper.includes("FIELD") || sUpper.includes("RUN");
        if (!isInd || !athletes || athletes.length === 0) return athletes;

        const allCoachTeams = Array.isArray(teams) && teams.length > 0 ? teams : (coachLockedTeam ? [coachLockedTeam] : []);
        const coachTeamNames = new Set(allCoachTeams.map((t: any) => (t?.team_name || "").trim().toUpperCase()).filter(Boolean));
        if (coachLockedTeamName) coachTeamNames.add(coachLockedTeamName);

        const coachRosterList: any[] = [
            ...(Array.isArray(coachLockedTeam?.roster_list) ? coachLockedTeam.roster_list : []),
            ...(Array.isArray(coachLockedTeam?.athletes) ? coachLockedTeam.athletes : []),
            ...allCoachTeams.flatMap((t: any) => Array.isArray(t?.roster_list) ? t.roster_list : []),
            ...allCoachTeams.flatMap((t: any) => Array.isArray(t?.athletes) ? t.athletes : []),
        ];

        const coachAthletes = athletes.filter((a) => {
            const aTeam = (a.team_name || "").trim().toUpperCase();
            const aName = (a.player_name || "").trim().toLowerCase();
            const isTeam = coachTeamNames.has(aTeam);
            const isRoster = coachRosterList.some((r: any) => {
                const rName = String(r.full_name || `${r.first_name || ""} ${r.last_name || ""}`).trim().toLowerCase();
                return aName && (rName === aName || rName.includes(aName) || aName.includes(rName));
            });
            return isTeam || isRoster;
        });

        return coachAthletes.length > 0 ? coachAthletes.map(a => ({ ...a, team_name: coachLockedTeamName || a.team_name })) : athletes;
    }, [coachLockedTeam, coachLockedTeamName, teams]);

    // Dynamic Editable Athletes Data State (per active match)
    const [athleteStatsMap, setAthleteStatsMap] = useState<Record<number, DetectedAthleteStat[]>>(() => {
        const init: Record<number, DetectedAthleteStat[]> = {};
        matchesList.forEach((m, idx) => {
            init[idx] = filterCoachAthletesForTimedSport(m.athlete_overview || [], m.sport_type || "");
        });
        return init;
    });

    // Guard against rogue re-renders resetting user edits or flipping teams
    const ocrPayloadKey = useMemo(() => {
        return `${rawOCRData?.file_name || ""}_${rawOCRData?.scoresheet_url || rawOCRData?.scoresheetUrl || ""}_${rawOCRData?.athlete_overview?.length || 0}_${(rawOCRData?.batch_matches || []).length}`;
    }, [rawOCRData?.file_name, rawOCRData?.scoresheet_url, rawOCRData?.scoresheetUrl, rawOCRData?.athlete_overview?.length, rawOCRData?.batch_matches?.length]);

    const lastPayloadKeyRef = useRef<string>(ocrPayloadKey);

    useEffect(() => {
        if (lastPayloadKeyRef.current !== ocrPayloadKey) {
            lastPayloadKeyRef.current = ocrPayloadKey;
            const updated: Record<number, DetectedAthleteStat[]> = {};
            matchesList.forEach((m, idx) => {
                updated[idx] = filterCoachAthletesForTimedSport(m.athlete_overview || [], m.sport_type || "");
            });
            setAthleteStatsMap(updated);

            const updatedInj: Record<number, any[]> = {};
            matchesList.forEach((m, idx) => {
                updatedInj[idx] = Array.isArray(m.injuries) ? m.injuries : [];
            });
            setInjuriesMap(updatedInj);
        }
    }, [ocrPayloadKey, matchesList]);

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

    const [injuriesMap, setInjuriesMap] = useState<Record<number, any[]>>(() => {
        const init: Record<number, any[]> = {};
        matchesList.forEach((m, idx) => {
            init[idx] = Array.isArray(m.injuries) ? m.injuries : [];
        });
        return init;
    });

    useEffect(() => {
        const updated: Record<number, any[]> = {};
        matchesList.forEach((m, idx) => {
            updated[idx] = Array.isArray(m.injuries) ? m.injuries : [];
        });
        setInjuriesMap(updated);
    }, [matchesList]);

    const currentInjuries = injuriesMap[activeMatchIndex] || [];

    const handleAddInjury = useCallback(() => {
        const newInj = {
            id: `inj_${Date.now()}`,
            player_name: "",
            team_name: currentActiveMatch.team_name || "Home",
            injury_type: "Ankle Sprain",
            status: "Out",
            notes: "",
        };
        setInjuriesMap((prev) => ({
            ...prev,
            [activeMatchIndex]: [...(prev[activeMatchIndex] || []), newInj],
        }));
    }, [activeMatchIndex, currentActiveMatch.team_name]);

    const handleUpdateInjury = useCallback((id: string, field: string, value: string) => {
        setInjuriesMap((prev) => ({
            ...prev,
            [activeMatchIndex]: (prev[activeMatchIndex] || []).map((inj: any) =>
                inj.id === id ? { ...inj, [field]: value } : inj
            ),
        }));
    }, [activeMatchIndex]);

    const handleRemoveInjury = useCallback((id: string) => {
        setInjuriesMap((prev) => ({
            ...prev,
            [activeMatchIndex]: (prev[activeMatchIndex] || []).filter((inj: any) => inj.id !== id),
        }));
    }, [activeMatchIndex]);

    const [customSchemas, setCustomSchemas] = useState<any[]>([]);

    useEffect(() => {
        let isMounted = true;
        loadDynamicSportsSchemas().then((schemas) => {
            if (isMounted) setCustomSchemas(schemas);
        }).catch(() => null);
        return () => {
            isMounted = false;
        };
    }, []);

    // Contextual text analysis to disambiguate Track & Field vs Swimming
    const nonSportContextText = useMemo(() => {
        const anyMatch = currentActiveMatch as any;
        return [
            anyMatch.event_name || "",
            anyMatch.match_name || "",
            anyMatch.game_name || "",
            anyMatch.customGameTitle || "",
            anyMatch.event || "",
            anyMatch.team_name || "",
            anyMatch.opponent_team_name || "",
            ...athleteStats.map((a: any) => `${a.event || ''} ${a.event_name || ''} ${a.team_name || ''} ${a.player_name || ''}`),
        ].join(" ").toUpperCase();
    }, [currentActiveMatch, athleteStats]);

    const hasExplicitTrackKeywords = /DASH|100MD|200MD|400MD|800MD|1500MD|RELAY|4X100|4X400|LONG\s*JUMP|LONGJUMP|SHOT\s*PUT|SHOTPUT|DISCUS|JAVELIN|HURDLE|TRACK|FIELD|RUNNERS?|ATHLETICS?|SPRINT|POLE\s*VAULT|TRIPLE\s*JUMP|HIGH\s*JUMP/i.test(nonSportContextText);
    const hasExplicitSwimKeywords = /FREESTYLE|BUTTERFLY|BREASTSTROKE|BACKSTROKE|\bIM\b|MEDLEY|POOL|STROKE/i.test(nonSportContextText);

    const detectedEffectiveSport = (() => {
        const rawUpper = (currentActiveMatch.sport_type || "BASKETBALL").toUpperCase();
        if ((rawUpper.includes("SWIM") || rawUpper.includes("BASKET")) && hasExplicitTrackKeywords && !hasExplicitSwimKeywords) {
            return "TRACK & FIELD";
        }
        return rawUpper;
    })();

    const activeSportSchema = useMemo(() => {
        return getSportStatSchema(detectedEffectiveSport, customSchemas);
    }, [detectedEffectiveSport, customSchemas]);

    const sportUpper = detectedEffectiveSport.toUpperCase();
    const isVolleyball = sportUpper.includes("VOLLEY");
    const isTrack = sportUpper.includes("TRACK") || sportUpper.includes("RUN") || sportUpper.includes("FIELD") || sportUpper.includes("ATHLETIC");
    const isSwimming = !isTrack && sportUpper.includes("SWIM");
    const isRacket = sportUpper.includes("BADMINTON") || sportUpper.includes("PICKLE") || sportUpper.includes("TENNIS");
    const isSoccer = sportUpper.includes("SOCCER") || sportUpper.includes("FOOTBALL");
    const isBaseball = sportUpper.includes("BASE") || sportUpper.includes("SOFT");
    const isIndividualSport = isSwimming || isTrack;
    const isBasketball = !isVolleyball && !isSwimming && !isTrack && !isRacket && !isSoccer && !isBaseball;

    const availableEvents: SportEventOption[] = useMemo(() => {
        return getEventsForSport(detectedEffectiveSport);
    }, [detectedEffectiveSport]);

    const initialEvent = useMemo(() => {
        const fromAthletes = athleteStats.find((a) => a.event || a.event_name || (a as any).eventType)?.event
            || athleteStats.find((a) => a.event_name)?.event_name;
        const fromMatch = (currentActiveMatch as any).event || (currentActiveMatch as any).event_name || (currentActiveMatch as any).event_type || (currentActiveMatch as any).discipline;
        return String(fromAthletes || fromMatch || "").trim();
    }, [athleteStats, currentActiveMatch]);

    const [selectedEventName, setSelectedEventName] = useState<string>(initialEvent);
    const [showEventPickerModal, setShowEventPickerModal] = useState<boolean>(false);
    const [customEventInput, setCustomEventInput] = useState<string>("");

    useEffect(() => {
        if (initialEvent && !selectedEventName) {
            setSelectedEventName(initialEvent);
        }
    }, [initialEvent]);

    const handleSelectEvent = useCallback((chosen: SportEventOption | string) => {
        const eventLabel = typeof chosen === "string" ? chosen : chosen.label;
        const distanceMeters = typeof chosen === "string" ? 0 : (chosen.distance_meters || 0);

        setSelectedEventName(eventLabel);
        setShowEventPickerModal(false);

        // Update all athletes in athleteStatsMap for active match
        setAthleteStats((prevAthletes) => {
            return prevAthletes.map((ath) => ({
                ...ath,
                event: eventLabel,
                event_name: eventLabel,
                eventType: eventLabel,
                distance_meters: distanceMeters,
                stats: {
                    ...(ath.stats || {}),
                    event: eventLabel,
                    event_name: eventLabel,
                    eventType: eventLabel,
                    distance_meters: distanceMeters,
                },
                sport_stats: {
                    ...(ath.sport_stats || {}),
                    event: eventLabel,
                    event_name: eventLabel,
                    eventType: eventLabel,
                    distance_meters: distanceMeters,
                },
            }));
        });

        // Also update currentActiveMatch fields
        (currentActiveMatch as any).event = eventLabel;
        (currentActiveMatch as any).event_name = eventLabel;
        (currentActiveMatch as any).event_type = eventLabel;
        (currentActiveMatch as any).discipline = eventLabel;
        (currentActiveMatch as any).distance_meters = distanceMeters;
        (currentActiveMatch as any).match_name = eventLabel;
        (currentActiveMatch as any).game_name = eventLabel;
    }, [setAthleteStats, currentActiveMatch]);

    const homeTeamDisplay = (coachLockedTeamName || currentActiveMatch.team_name || "HOME TEAM").toUpperCase();
    const rawOpponentName = (currentActiveMatch.opponent_team_name || "").toUpperCase();
    const awayTeamDisplay = (rawOpponentName && rawOpponentName !== homeTeamDisplay ? rawOpponentName : "OPPONENT").toUpperCase();

    // List of all detected unique teams
    const teamList = useMemo(() => {
        if (isIndividualSport) {
            return [homeTeamDisplay].filter(Boolean);
        }
        const set = new Set<string>();
        if (homeTeamDisplay) set.add(homeTeamDisplay);
        if (awayTeamDisplay) set.add(awayTeamDisplay);
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
    }, [isIndividualSport, currentActiveMatch, athleteStats, homeTeamDisplay, awayTeamDisplay]);

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
                const isNumericField = !['team_name', 'team', 'school', 'time_or_distance', 'time', 'distance', 'qts', 'finish_time', 'seed_time', 'seed', 'split', 'split_time', 'event', 'event_name', 'fg_pct', 'hitting_pct'].includes(field);
                const updatedAthlete = {
                    ...updated[itemIdx],
                    [field]: isNumericField ? (isNaN(numVal) ? 0 : numVal) : value,
                };
                if (field === 'team_name') {
                    updatedAthlete.team = value;
                }
                if (field === 'time_or_distance') {
                    updatedAthlete.time = value;
                    updatedAthlete.distance = value;
                    updatedAthlete.finish_time = value;
                }
                if (field === 'qts') {
                    updatedAthlete.qualifying_time = value;
                    updatedAthlete.seed_time = value;
                }
                updated[itemIdx] = updatedAthlete;
                return updated;
            });
        },
        []
    );

    // Team Toggle Handler: Switch athlete between Home and Away team with explicit user interaction
    const handleToggleTeam = useCallback(
        (targetAthleteId: string) => {
            if (!isEditing) {
                Alert.alert(
                    "Reassign Athlete Team",
                    "To prevent accidental changes while swiping through scores, tap 'EDIT RAW SCORESHEET' at the bottom to reassign players between teams.",
                    [{ text: "OK" }]
                );
                return;
            }

            setAthleteStats((prev) => {
                const updated = [...prev];
                const itemIdx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
                if (itemIdx === -1) return prev;
                const current = (updated[itemIdx].team_name || "").toUpperCase();
                const home = homeTeamDisplay;
                const away = awayTeamDisplay;
                const nextTeam = current === home ? away : home;
                updated[itemIdx] = {
                    ...updated[itemIdx],
                    team_name: nextTeam,
                    team_id: nextTeam === home ? (coachLockedTeam?.team_id || "") : "",
                };
                return updated;
            });
        },
        [isEditing, homeTeamDisplay, awayTeamDisplay, coachLockedTeam]
    );

    const redirectTimerRef = useRef<any>(null);

    const handleGoHome = useCallback(() => {
        if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
            redirectTimerRef.current = null;
        }
        setShowSuccessModal(false);
        if (onGoHome) {
            onGoHome();
        } else if (onBack) {
            onBack();
        }
    }, [onGoHome, onBack]);

    useEffect(() => {
        return () => {
            if (redirectTimerRef.current) {
                clearTimeout(redirectTimerRef.current);
                redirectTimerRef.current = null;
            }
        };
    }, []);

    // Confirm & Save Action Handler
    const handleSave = useCallback(() => {
        if (onConfirmSave) {
            const homeTeamUpper = homeTeamDisplay;
            const homeRoster = athleteStats
                .filter((a) => (a.team_name || "").toUpperCase() === homeTeamUpper)
                .map((a) => a.athlete_id);
            const awayRoster = athleteStats
                .filter((a) => (a.team_name || "").toUpperCase() !== homeTeamUpper)
                .map((a) => a.athlete_id);
            const finalEvent = selectedEventName || athleteStats[0]?.event || athleteStats[0]?.event_name || (currentActiveMatch as any).event || "";
            const scoresheetUrlVal = currentActiveMatch.scoresheetUrl || currentActiveMatch.scoresheet_url || "";

            // In swimming and track & field, no need to mention other teams' athletes since the coach will not need them
            const relevantAthletes = isIndividualSport
                ? athleteStats.filter((a) => {
                    const aTeam = (a.team_name || "").toUpperCase();
                    return !aTeam || aTeam === homeTeamUpper || homeRoster.includes(a.athlete_id);
                })
                : athleteStats;

            const playerStatsList = relevantAthletes.map((a, idx) => {
                const rawRank = a.rank !== undefined ? a.rank : (a.place !== undefined ? a.place : idx + 1);
                const parsedRank = rawRank !== null && rawRank !== undefined && !isNaN(Number(String(rawRank).replace(/[^\d]/g, '')))
                    ? Number(String(rawRank).replace(/[^\d]/g, ''))
                    : null;
                const isTop3 = parsedRank !== null ? (parsedRank >= 1 && parsedRank <= 3) : true;

                // In swimming and track & field, only record performance if in top 3; if not, just add the place!
                const recordedTime = (isIndividualSport && !isTop3) ? "" : (a.time || a.finish_time || "");
                const recordedFinishTime = (isIndividualSport && !isTop3) ? "" : (a.finish_time || a.time || "");

                return {
                    ...a,
                    athlete_id: a.athlete_id,
                    player_name: a.player_name,
                    team_name: a.team_name,
                    jersey_number: a.jersey_number,
                    position: a.position,
                    rank: rawRank,
                    placement_rank: rawRank,
                    place: rawRank,
                    event: a.event || finalEvent,
                    event_name: a.event_name || a.event || finalEvent,
                    eventType: a.eventType || a.event || finalEvent,
                    distance_meters: a.distance_meters || (isIndividualSport ? 50 : 0),
                    time: recordedTime,
                    finish_time: recordedFinishTime,
                    pts: a.pts ?? 0,
                    points: a.pts ?? 0,
                    reb: a.reb ?? 0,
                    rebounds: a.reb ?? 0,
                    ast: a.ast ?? 0,
                    assists: a.ast ?? 0,
                    stl: a.stl ?? 0,
                    steals: a.stl ?? 0,
                    blk: a.blk ?? 0,
                    blocks: a.blk ?? 0,
                    pf: a.fouls ?? a.pf ?? 0,
                    fouls: a.fouls ?? a.pf ?? 0,
                    to: a.to ?? 0,
                    turnovers: a.to ?? 0,
                    min: a.min ?? 0,
                    minutes: a.min ?? 0,
                    stats: {
                        ...a,
                        rank: rawRank,
                        placement_rank: rawRank,
                        place: rawRank,
                        time: recordedTime,
                        finish_time: recordedFinishTime,
                        event: a.event || finalEvent,
                        event_name: a.event_name || a.event || finalEvent,
                        eventType: a.eventType || a.event || finalEvent
                    },
                    sport_stats: {
                        ...a,
                        rank: rawRank,
                        placement_rank: rawRank,
                        place: rawRank,
                        time: recordedTime,
                        finish_time: recordedFinishTime,
                        event: a.event || finalEvent,
                        event_name: a.event_name || a.event || finalEvent,
                        eventType: a.eventType || a.event || finalEvent
                    },
                    custom_stats: {
                        ...a,
                        rank: rawRank,
                        placement_rank: rawRank,
                        place: rawRank,
                        time: recordedTime,
                        finish_time: recordedFinishTime,
                        event: a.event || finalEvent,
                        event_name: a.event_name || a.event || finalEvent,
                        eventType: a.eventType || a.event || finalEvent
                    },
                };
            });

            onConfirmSave({
                ...currentActiveMatch,
                team_id: coachLockedTeam?.team_id || (currentActiveMatch as any).team_id || "",
                team_name: homeTeamDisplay,
                opponent_team_name: awayTeamDisplay,
                sport_type: detectedEffectiveSport,
                event: finalEvent,
                event_name: finalEvent,
                event_type: finalEvent,
                discipline: finalEvent,
                athlete_overview: relevantAthletes,
                playerStats: playerStatsList,
                player_stats: playerStatsList,
                injuries: currentInjuries.filter((i: any) => (i.player_name || "").trim().length > 0),
                rosterAthletes: homeRoster,
                roster_athletes: homeRoster,
                awayRosterAthletes: awayRoster,
                away_roster_athletes: awayRoster,
                scoresheetUrl: scoresheetUrlVal,
                scoresheet_url: scoresheetUrlVal,
            });
        }

        setShowSuccessModal(true);
        if (redirectTimerRef.current) {
            clearTimeout(redirectTimerRef.current);
        }
        redirectTimerRef.current = setTimeout(() => {
            handleGoHome();
        }, 3000);
    }, [currentActiveMatch, athleteStats, currentInjuries, onConfirmSave, handleGoHome, selectedEventName]);

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
                    <Text style={styles.headerTitleBeside} numberOfLines={1}>OCR RESULT • {sportDisplayName}</Text>
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
                            {(() => {
                                const topByRank = athleteStats.find((a) => {
                                    const r = Number(String(a.rank !== undefined ? a.rank : a.place).replace(/[^\d]/g, ''));
                                    return r === 1;
                                });
                                const top = topByRank || athleteStats.find((a) => a.time_or_distance || a.finish_time || a.time || a.distance) || athleteStats[0];
                                const topName = top?.player_name || top?.name || (isSwimming ? "Lead Swimmer" : "Lead Athlete");
                                const topTime = top?.time_or_distance || top?.finish_time || top?.time || top?.distance || "00:00.00";

                                return (
                                    <>
                                        <View style={styles.teamScoreBox}>
                                            <Text style={styles.identityLabel}>{isTrack ? "TOP ATHLETE / 1ST" : "TOP PERFORMER / 1ST"}</Text>
                                            <Text style={styles.teamScoreName} numberOfLines={1}>
                                                {topName}
                                            </Text>
                                            <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700", marginTop: 2 }} numberOfLines={1}>
                                                {selectedEventName || athleteStats[0]?.event || athleteStats[0]?.event_name || (isSwimming ? "Swimming Event" : "Track Event")}
                                            </Text>
                                        </View>
                                        <View style={[styles.teamScoreBox, { alignItems: "flex-end" }]}>
                                            <Text style={styles.identityLabel}>{isTrack ? "TOP MARK / TIME" : "TOP RECORDED TIME"}</Text>
                                            <Text style={styles.teamScoreNum}>
                                                {topTime}
                                            </Text>
                                        </View>
                                    </>
                                );
                            })()}
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
                    {isIndividualSport ? (
                        <View style={{ gap: 10 }}>
                            <View>
                                <Text style={styles.identityLabel}>EVENT / DISCIPLINE:</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.eventPickerTrigger,
                                        {
                                            width: "100%",
                                            justifyContent: "space-between",
                                            paddingHorizontal: 12,
                                            paddingVertical: 9,
                                            marginTop: 4,
                                        },
                                    ]}
                                    onPress={() => setShowEventPickerModal(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text
                                        style={[
                                            styles.identityValue,
                                            { color: "#00C8FF", flex: 1, marginRight: 8 },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {selectedEventName || athleteStats[0]?.event || athleteStats[0]?.event_name || "TAP TO CHOOSE EVENT"}
                                    </Text>
                                    <Ionicons name="chevron-down-circle" size={18} color="#00C8FF" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.twoColumnGrid}>
                                <View style={styles.identityCol}>
                                    <Text style={styles.identityLabel}>ASSIGNED TEAM (LOCKED):</Text>
                                    <Text style={styles.identityValue} numberOfLines={1}>
                                        {coachLockedTeamName || homeTeamDisplay}
                                    </Text>
                                </View>
                                <View style={[styles.identityCol, { alignItems: "flex-end" }]}>
                                    <Text style={styles.identityLabel}>PARTICIPANTS:</Text>
                                    <Text style={styles.identityValue}>
                                        {athleteStats.length} REGISTERED ATHLETES
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.twoColumnGrid}>
                            <View style={styles.identityCol}>
                                <Text style={styles.identityLabel}>ASSIGNED TEAM (LOCKED):</Text>
                                <Text style={styles.identityValue}>{homeTeamDisplay}</Text>
                            </View>
                            <View style={styles.identityCol}>
                                <Text style={styles.identityLabel}>OPPONENT:</Text>
                                <Text style={styles.identityValue}>{awayTeamDisplay || "N/A"}</Text>
                            </View>
                        </View>
                    )}
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
                        <View style={{ minWidth: Math.max(520, 160 + (activeSportSchema?.tableHeaders?.reduce((acc, h) => acc + (h.width || 65), 0) || 500)) }}>
                            {/* Table Header Row */}
                            <View style={styles.tableHeaderRow}>
                                <Text style={styles.tableHeaderColName}>
                                    {isSwimming ? "SWIMMER" : isTrack ? "ATHLETE" : "PLAYER NAME"}
                                </Text>

                                {activeSportSchema?.tableHeaders?.map((header) => (
                                    <Text
                                        key={header.key}
                                        style={[
                                            styles.tableHeaderColStat,
                                            header.width ? { width: header.width } : null,
                                        ]}
                                    >
                                        {header.shortLabel || header.label}
                                    </Text>
                                ))}
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
                                            activeOpacity={isEditing ? 0.7 : 0.9}
                                            style={[
                                                styles.playerTeamBadge,
                                                (item.team_name || "").toUpperCase() === homeTeamDisplay
                                                    ? { borderColor: "#00C8FF", backgroundColor: "rgba(0, 200, 255, 0.12)" }
                                                    : { borderColor: "#F59E0B", backgroundColor: "rgba(245, 158, 11, 0.12)" },
                                                !isEditing ? { opacity: 0.85 } : null
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.playerTeamText,
                                                    (item.team_name || "").toUpperCase() === homeTeamDisplay
                                                        ? { color: "#00C8FF" }
                                                        : { color: "#F59E0B" }
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.team_name || "ASSIGN"}{isEditing ? " ⇄" : ""}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {activeSportSchema?.tableHeaders?.map((header) => {
                                        const rawVal = (() => {
                                            if (header.key === 'team_name' || header.key === 'team' || header.key === 'school') {
                                                return item.team_name || item.team || item.school || item.stats?.team_name || item.stats?.school;
                                            }
                                            if (header.key === 'event' || header.key === 'event_name' || header.key === 'discipline') {
                                                return item.event || item.event_name || item.discipline || item.stats?.event || item.stats?.event_name || item.position || item.position_or_event;
                                            }
                                            if (header.key === 'time_or_distance') {
                                                return item.time_or_distance || item.time || item.distance || item.finish_time || item.mark || item.stats?.time_or_distance || item.stats?.time || item.stats?.distance;
                                            }
                                            if (header.key === 'qts') {
                                                return item.qts || item.seed_time || item.seed || item.qualifying_time || item.stats?.qts || item.stats?.seed_time;
                                            }
                                            if (header.key === 'finish_time') {
                                                return item.finish_time || item.time || item.final_time || item.stats?.finish_time || item.stats?.time || item.custom_stats?.finish_time;
                                            }
                                            if (header.key === 'seed_time') {
                                                return item.seed_time || item.seed || item.entry_time || item.stats?.seed_time || item.stats?.seed || item.custom_stats?.seed_time;
                                            }
                                            if (header.key === 'split' || header.key === 'split_time') {
                                                return item.split || item.split_time || (Array.isArray(item.split_times) ? item.split_times.join(', ') : (item.stats?.split || item.stats?.split_time));
                                            }
                                            if (header.key === 'rank' || header.key === 'place') {
                                                return item.rank !== undefined ? item.rank : (item.place !== undefined ? item.place : item.stats?.rank ?? item.stats?.place ?? item.custom_stats?.rank ?? item.custom_stats?.place);
                                            }
                                            if (header.key === 'pts' || header.key === 'points') {
                                                return item.pts !== undefined ? item.pts : (item.points !== undefined ? item.points : item.stats?.pts ?? item.stats?.points ?? item.custom_stats?.pts ?? item.custom_stats?.points);
                                            }
                                            return item[header.key] ?? item.stats?.[header.key] ?? item.custom_stats?.[header.key];
                                        })();
                                        const fallbackVal = header.key === "pts" ? item.pts : (header.key === "min" ? item.min : undefined);
                                        const val = rawVal !== undefined ? rawVal : fallbackVal;
                                        const isTimeOrRankField = [
                                            'team_name', 'team', 'school',
                                            'time_or_distance', 'distance',
                                            'finish_time', 'seed_time', 'time',
                                            'qts', 'seed', 'qualifying_time',
                                            'split', 'split_time', 'event', 'event_name', 'discipline',
                                            'rank', 'place'
                                        ].includes(header.key);
                                        const isNumeric = !isTimeOrRankField && (typeof val === "number" || (!isNaN(Number(val)) && val !== "" && val !== undefined));

                                        return isEditing ? (
                                            <TextInput
                                                key={header.key}
                                                style={[
                                                    styles.cellStatInput,
                                                    header.width ? { width: Math.max(48, header.width - 6) } : null,
                                                ]}
                                                keyboardType={isNumeric ? "number-pad" : "default"}
                                                value={val !== undefined && val !== null ? String(val) : ""}
                                                onChangeText={(newVal) => handleStatChange(item.athlete_id, header.key, newVal)}
                                            />
                                        ) : (
                                            <Text
                                                key={header.key}
                                                style={[
                                                    styles.cellStatText,
                                                    header.width ? { width: header.width } : null,
                                                ]}
                                            >
                                                {val !== undefined && val !== null && String(val).trim() !== "" ? String(val) : "-"}
                                            </Text>
                                        );
                                    })}
                                </View>
                            ))}

                            {/* Totals Row */}
                            <View style={[styles.tableDataRow, styles.totalsRow]}>
                                <Text style={styles.cellNameText}>TOTAL</Text>
                                {activeSportSchema?.tableHeaders?.map((header) => {
                                    const isNonSummableHeader = [
                                        'team_name', 'team', 'school',
                                        'time_or_distance', 'distance',
                                        'finish_time', 'seed_time', 'time',
                                        'qts', 'seed', 'qualifying_time', 'split', 'split_time',
                                        'rank', 'place', 'lane', 'heat', 'event', 'event_name', 'discipline', 'jersey_number'
                                    ].includes(header.key);

                                    if (isNonSummableHeader) {
                                        return (
                                            <Text
                                                key={header.key}
                                                style={[
                                                    styles.cellStatText,
                                                    header.width ? { width: header.width } : null,
                                                ]}
                                            >
                                                -
                                            </Text>
                                        );
                                    }

                                    const isNumericHeader = visibleAthletes.some((a) => {
                                        const v = a[header.key] ?? a.stats?.[header.key] ?? (header.key === "pts" ? a.pts : undefined);
                                        return typeof v === "number" || (!isNaN(Number(v)) && v !== "" && v !== undefined);
                                    });

                                    if (!isNumericHeader) {
                                        return (
                                            <Text
                                                key={header.key}
                                                style={[
                                                    styles.cellStatText,
                                                    header.width ? { width: header.width } : null,
                                                ]}
                                            >
                                                -
                                            </Text>
                                        );
                                    }

                                    const sumVal = visibleAthletes.reduce((acc, a) => {
                                        const v = a[header.key] ?? a.stats?.[header.key] ?? (header.key === "pts" ? (a.pts ?? a.points ?? 0) : 0);
                                        return acc + (Number(v) || 0);
                                    }, 0);

                                    return (
                                        <Text
                                            key={header.key}
                                            style={[
                                                styles.cellStatText,
                                                header.width ? { width: header.width } : null,
                                            ]}
                                        >
                                            {sumVal}
                                        </Text>
                                    );
                                })}
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
                                <Text style={styles.metricLabel}>{isTrack ? "TOP MARK / TIME" : "TOP RECORDED TIME"}</Text>
                                <Text style={styles.metricValue}>
                                    {(() => {
                                        const top = athleteStats.find((a) => a.time_or_distance || a.finish_time || a.time || a.distance);
                                        return top?.time_or_distance || top?.finish_time || top?.time || top?.distance || "RECORDED";
                                    })()}
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

                {/* INJURIES & SIDELINED PLAYERS CARD (Team/Ball Sports only) */}
                {!isIndividualSport && (
                    <View
                        style={{
                            backgroundColor: "#0F192C",
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.08)",
                            borderRadius: 14,
                            padding: 16,
                            marginBottom: 16,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                            }}
                        >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Ionicons name="medical" size={17} color="#FF4D6D" />
                                <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.8 }}>
                                    INJURIES & SIDELINED PLAYERS
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleAddInjury}
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                    paddingVertical: 5,
                                    paddingHorizontal: 10,
                                    backgroundColor: "rgba(255, 77, 109, 0.15)",
                                    borderWidth: 1,
                                    borderColor: "#FF4D6D",
                                    borderRadius: 6,
                                }}
                            >
                                <Ionicons name="add" size={14} color="#FF4D6D" />
                                <Text style={{ fontSize: 11, fontWeight: "800", color: "#FF4D6D" }}>LOG INJURY</Text>
                            </TouchableOpacity>
                        </View>

                        {currentInjuries.length === 0 ? (
                            <Text
                                style={{
                                    fontSize: 12,
                                    color: "#8E9BAE",
                                    fontStyle: "italic",
                                    textAlign: "center",
                                    paddingVertical: 10,
                                }}
                            >
                                No injuries detected or logged for this game. Tap "Log Injury" if a player was sidelined.
                            </Text>
                        ) : (
                            currentInjuries.map((inj: any, idx: number) => (
                                <View
                                    key={inj.id || idx}
                                    style={{
                                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                                        borderWidth: 1,
                                        borderColor: "rgba(255, 255, 255, 0.07)",
                                        borderRadius: 8,
                                        padding: 10,
                                        marginBottom: 8,
                                        gap: 6,
                                    }}
                                >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                fontSize: 13,
                                                fontWeight: "700",
                                                color: "#FFFFFF",
                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                paddingVertical: 5,
                                                paddingHorizontal: 8,
                                                borderRadius: 4,
                                                marginRight: 8,
                                            }}
                                            placeholder="Player Name (e.g. Jerom Lastimosa)"
                                            placeholderTextColor="#64748B"
                                            value={inj.player_name || ""}
                                            onChangeText={(t) => handleUpdateInjury(inj.id, "player_name", t)}
                                        />
                                        <TouchableOpacity
                                            onPress={() => handleRemoveInjury(inj.id)}
                                            style={{ padding: 4 }}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#FF4D6D" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        <TextInput
                                            style={{
                                                flex: 1,
                                                fontSize: 11,
                                                color: "#E2E8F0",
                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                paddingVertical: 4,
                                                paddingHorizontal: 8,
                                                borderRadius: 4,
                                            }}
                                            placeholder="Injury (e.g. Ankle Sprain)"
                                            placeholderTextColor="#64748B"
                                            value={inj.injury_type || ""}
                                            onChangeText={(t) => handleUpdateInjury(inj.id, "injury_type", t)}
                                        />
                                        <TextInput
                                            style={{
                                                width: 80,
                                                fontSize: 11,
                                                color: "#FFB703",
                                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                                paddingVertical: 4,
                                                paddingHorizontal: 8,
                                                borderRadius: 4,
                                            }}
                                            placeholder="Status"
                                            placeholderTextColor="#64748B"
                                            value={inj.status || "Out"}
                                            onChangeText={(t) => handleUpdateInjury(inj.id, "status", t)}
                                        />
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

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

            {/* SUCCESS INTERCEPTION MODAL */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={handleGoHome}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.successModalCard}>
                        <View style={styles.successIconBadge}>
                            <Ionicons name="checkmark-circle" size={44} color="#00C8FF" />
                        </View>

                        <Text style={styles.successModalTitle}>Successfully Saved Match</Text>
                        <Text style={styles.successModalSubtitle}>
                            Match performance metrics and athlete statistics have been verified and saved to the roster. Redirecting in 3 seconds...
                        </Text>

                        <View style={styles.successSummaryBox}>
                            <View style={styles.summaryChip}>
                                <Text style={styles.chipLabel}>TEAM</Text>
                                <Text style={styles.chipValue} numberOfLines={1}>{rawOCRData.team_name || "ATLETA"}</Text>
                            </View>
                            <View style={styles.summaryChip}>
                                <Text style={styles.chipLabel}>ATHLETES</Text>
                                <Text style={styles.chipValue}>{athleteStats.length} Updated</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.modalCtaButton}
                            onPress={handleGoHome}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.modalCtaText}>Go back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* EVENT PICKER MODAL (FOR INDIVIDUAL / TIMED SPORTS) */}
            <Modal
                visible={showEventPickerModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEventPickerModal(false)}
            >
                <View style={styles.eventModalOverlay}>
                    <View style={styles.eventModalContent}>
                        {/* Header */}
                        <View style={styles.eventModalHeader}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={styles.eventModalTitle}>SELECT EVENT / DISCIPLINE</Text>
                                <Text style={styles.eventModalSubtitle}>
                                    {sportDisplayName} • Select an event to apply to all logged athletes
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowEventPickerModal(false)}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <Ionicons name="close" size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Standard Events Scroll List */}
                        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={true}>
                            <View style={styles.eventOptionsGrid}>
                                {availableEvents.map((ev) => {
                                    const isSelected = selectedEventName.toLowerCase() === ev.label.toLowerCase() ||
                                        selectedEventName.toLowerCase() === ev.shortLabel.toLowerCase() ||
                                        selectedEventName.toLowerCase() === ev.key.toLowerCase();
                                    return (
                                        <TouchableOpacity
                                            key={ev.key}
                                            style={[
                                                styles.eventOptionCard,
                                                isSelected && styles.eventOptionCardSelected,
                                            ]}
                                            onPress={() => handleSelectEvent(ev)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={[
                                                        styles.eventOptionLabel,
                                                        isSelected && styles.eventOptionLabelSelected,
                                                    ]}
                                                >
                                                    {ev.label}
                                                </Text>
                                                {ev.distance_meters > 0 ? (
                                                    <Text style={styles.eventOptionDistance}>
                                                        {ev.distance_meters}m {ev.isDistanceEvent ? "Distance" : "Race"}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            {isSelected ? (
                                                <Ionicons name="checkmark-circle" size={22} color="#00C8FF" />
                                            ) : (
                                                <Ionicons name="radio-button-off" size={20} color="#475569" />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Custom Event Input Box */}
                        <View style={styles.customEventSection}>
                            <Text style={styles.customEventHeader}>OR ENTER CUSTOM EVENT:</Text>
                            <View style={styles.customEventRow}>
                                <TextInput
                                    style={styles.customEventInput}
                                    placeholder="e.g. 4x50m Medley Relay, 60m Hurdles..."
                                    placeholderTextColor="#64748B"
                                    value={customEventInput}
                                    onChangeText={setCustomEventInput}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.customEventApplyBtn,
                                        !customEventInput.trim() && { opacity: 0.5 },
                                    ]}
                                    disabled={!customEventInput.trim()}
                                    onPress={() => {
                                        if (customEventInput.trim()) {
                                            handleSelectEvent(customEventInput.trim());
                                            setCustomEventInput("");
                                        }
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.customEventApplyText}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default OCRoutput;

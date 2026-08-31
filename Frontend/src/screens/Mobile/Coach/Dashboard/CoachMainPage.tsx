import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "./styles/CoachMainPage";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

// Data Types & Mock Testing Data
import {
  UserCoach,
  RosterAthlete,
  Team,
  NavigationTab,
  MOCK_COACH,
  MOCK_ATHLETES_POOL,
  INITIAL_TEAMS,
} from "../DataTypes";

// Feature Pages
import { MyTeamsPage } from "../Teams/MyTeamsPage";
import { ManageTeamPage } from "../Teams/ManageTeamPage";
import { ViewAllPlayers } from "./ViewAllPlayers";
import { CoachSettings } from "./CoachSettings";
import { AtletaHeader } from "../Components/AtletaHeader";
import { CoachNotificationModal } from "../Components/CoachNotificationModal";
import { AtletaNavbar } from "../Components/AtletaNavbar";
import { CoachProfile } from "../Profile/CoachProfile";
import { CoachEditProfile } from "../Profile/CoachEditProfile";
import { CoachProfileState, DEFAULT_COACH_PROFILE } from "../DataTypes";
import { OCRlogging } from "./OCRlogging";
import { OCRoutput, RawOCRDetectedData } from "./OCRoutput";
import { CreateLogScreen } from "../MultiLogging/createLog";
import { BasketballMatchScreen } from "../MultiLogging/basketballMatch";
import { SwimmingMatchScreen } from "../MultiLogging/swimmingMatch";
import { TrackFieldMatchScreen } from "../MultiLogging/TrackFieldMatch";
import { MatchDetailsScreen } from "../MultiLogging/MatchDetails";
import { MatchSessionProvider } from "../MultiLogging/MatchSessionContext";
import { OfficialMatchesPage } from "../ScoresheetRequest/officialMatchPage";
import { DiscoveryMain } from "../Discovery/discoveryMain";
import { PerformancePage } from "../Performance/performancePage";
import { AthletePortfolio } from "../Performance/athletePortfolio";
import { AllStats } from "../Performance/allStats";
import { MatchHistory } from "../Performance/matchHistory";
import { TrackfieldMatchResult } from "../Performance/trackfieldMatchResult";
import { SwimmingMatchResult } from "../Performance/swimmingMatchResult";
import { BasketballMatchResult } from "../Performance/basketballMatchResult";
import {
  AthletePerformanceProfile,
  MatchHistoryItem,
  MOCK_PERFORMANCE_ATHLETES,
} from "../DataTypes";

// Font Styles
const fontPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

const fontBoldPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-black",
  default: "sans-serif",
});

type ViewState =
  | "dashboard"
  | "teams_list"
  | "manage_team"
  | "view_all_players"
  | "settings"
  | "edit_profile"
  | "ocr_logging"
  | "ocr_output"
  | "create_log"
  | "basketball_match"
  | "swimming_match"
  | "track_field_match"
  | "match_details"
  | "official_matches"
  | "discovery"
  | "performance"
  | "athlete_portfolio"
  | "all_stats"
  | "match_history"
  | "perf_trackfield_result"
  | "perf_swimming_result"
  | "perf_basketball_result";
const SPORT_CATEGORIES = ["ALL", "BASKETBALL", "TRACK AND FIELD", "SWIMMING"];

type CoachMainPageProps = {
  onLogout?: () => void;
};

// Optimized Player Row Component
const PlayerRowItem = React.memo(
  ({
    player,
    isLast,
    onViewStats,
  }: {
    player: RosterAthlete;
    isLast: boolean;
    onViewStats: (player: RosterAthlete) => void;
  }) => {
    const formattedPos =
      player.position === "PG"
        ? "POINT GUARD"
        : player.position === "SG"
          ? "SHOOTING GUARD"
          : player.position === "SF"
            ? "SMALL FORWARD"
            : player.position === "PF"
              ? "POWER FORWARD"
              : player.position === "C"
                ? "CENTER"
                : player.position;

    return (
      <View style={[styles.playerRow, !isLast && styles.playerRowBorder]}>
        <View style={styles.playerTextContainer}>
          <Text style={styles.playerName}>{player.full_name}</Text>
          <Text style={styles.playerSubtitle}>
            {formattedPos} • #{player.jersey_number}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewStatsButton}
          onPress={() => onViewStats(player)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewStatsText}>View Stats</Text>
        </TouchableOpacity>
      </View>
    );
  }
);

const createAthletePerformanceProfile = (
  a: RosterAthlete,
  teamName: string,
  extraData?: any
): AthletePerformanceProfile => {
  const sportUpper = (a.sport_type || "BASKETBALL").toUpperCase();
  const sportCategory: AthletePerformanceProfile["sport_category"] =
    sportUpper.includes("TRACK") || sportUpper.includes("FIELD")
      ? "TRACK AND FIELD"
      : sportUpper.includes("SWIM")
      ? "SWIMMING"
      : "BASKETBALL";

  return {
    athlete_id: a.athlete_id,
    user_id: a.user_id || a.athlete_id,
    full_name: a.full_name,
    birthdate: extraData?.birthdate || extraData?.birth_date || "",
    position_or_event: a.position || a.event_distance || a.stroke_style || "ATHLETE",
    location_province: extraData?.province || extraData?.location || "",
    team_name: teamName || "",
    rating_score: Number(extraData?.rating_score || extraData?.rating || 0),
    sport_category: sportCategory,
    biometrics: {
      height_ft: extraData?.biometrics?.height_ft || (extraData?.height_cm ? `${(extraData.height_cm / 30.48).toFixed(1)}'` : ""),
      weight_lbs: extraData?.biometrics?.weight_lbs || (extraData?.weight_kg ? `${Math.round(extraData.weight_kg * 2.20462)} lbs` : ""),
      wingspan_ft: extraData?.biometrics?.wingspan_ft || (extraData?.wingspan_cm ? `${(extraData.wingspan_cm / 30.48).toFixed(1)}'` : ""),
      vertical_jump_in: extraData?.biometrics?.vertical_jump_in || (extraData?.vertical_cm ? `${Math.round(extraData.vertical_cm / 2.54)}"` : ""),
    },
    averages: extraData?.averages || extraData?.stats || {},
    radar_competencies: extraData?.radar_competencies || extraData?.radar_scores || {
      speed: 0,
      power: 0,
      agility: 0,
      iq: 0,
      tech: 0,
    },
    scoring_trends_last_10: Array.isArray(extraData?.scoring_trends_last_10)
      ? extraData.scoring_trends_last_10
      : [],
    eligibility_documents: {
      psa_verified: Boolean(a.is_eligibility_verified),
      residency_verified: Boolean(a.is_eligibility_verified),
    },
    workload_analytics: extraData?.workload_analytics || {
      target_7day_effort_pts: 0,
      current_7day_acute_load: 0,
      current_28day_chronic_load: 0,
      calculated_acwr: 0,
      workout_score: 0,
      fatigue_meter: 0,
      routine_score: 0,
      body_stress_pts: 0,
    },
  };
};

// API Request: fetch coach dashboard & team summary (GET /api/coach/dashboard)
export function CoachMainPage({ onLogout }: CoachMainPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  // Local State
  const [coach, setCoach] = useState<UserCoach>(MOCK_COACH);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [athletesPool, setAthletesPool] = useState<RosterAthlete[]>(MOCK_ATHLETES_POOL);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCoachAndTeamsData = async () => {
      try {
        const coachRes: any = await requestAuthenticatedJson("/coaches/me").catch(() => null);

        if (!isMounted) return;

        let activeCoachId = coach.coach_id;
        if (coachRes) {
          const rawCoach = coachRes.coach || coachRes.user || coachRes;
          activeCoachId = rawCoach.coach_id || rawCoach.id || rawCoach.user_id || coach.coach_id;
          setCoach((prev) => ({
            ...prev,
            coach_id: activeCoachId,
            first_name: rawCoach.first_name || prev.first_name,
            last_name: rawCoach.last_name || prev.last_name,
            email: rawCoach.email || prev.email,
            current_institution: rawCoach.current_institution || rawCoach.school_organization || prev.current_institution,
          }));
        }

        const [teamsRes, athletesRes]: [any, any] = await Promise.all([
          requestAuthenticatedJson(`/teams?coach_id=${activeCoachId}`).catch(() =>
            requestAuthenticatedJson("/teams").catch(() => null)
          ),
          requestAuthenticatedJson("/scouting/athletes").catch(() => null),
        ]);

        if (!isMounted) return;

        let poolList: RosterAthlete[] = [];
        if (athletesRes) {
          const rawAthletes = Array.isArray(athletesRes)
            ? athletesRes
            : Array.isArray(athletesRes.athletes)
            ? athletesRes.athletes
            : Array.isArray(athletesRes.data)
            ? athletesRes.data
            : [];

          if (rawAthletes.length > 0) {
            poolList = rawAthletes.map((a: any, idx: number) => ({
              athlete_id: a.athlete_id || a.id || `ath_pool_${idx}`,
              user_id: a.user_id || `usr_${a.athlete_id || idx}`,
              full_name: (a.full_name || a.name || `${a.first_name || ""} ${a.last_name || ""}`).trim() || "Athlete",
              position: (a.primary_position || a.position || "PG").toUpperCase(),
              jersey_number: a.jersey_number !== undefined ? String(a.jersey_number) : "00",
              sport_type: (a.sport_type || a.sport || "BASKETBALL").toUpperCase(),
              is_eligibility_verified: Boolean(a.is_eligibility_verified ?? a.is_verified ?? true),
              event_distance: a.event_distance,
              stroke_style: a.stroke_style,
            }));
            setAthletesPool(poolList);
          }
        }

        if (teamsRes) {
          const rawTeamsList = Array.isArray(teamsRes)
            ? teamsRes
            : Array.isArray(teamsRes.teams)
            ? teamsRes.teams
            : Array.isArray(teamsRes.data)
            ? teamsRes.data
            : [];

          const ownCoachIdClean = String(activeCoachId || "").replace(/^coach_/, "").toLowerCase();
          const ownTeamsList = rawTeamsList.filter((t: any) => {
            if (!t.coach_id) return true;
            const tCoachId = String(t.coach_id).replace(/^coach_/, "").toLowerCase();
            return tCoachId === ownCoachIdClean;
          });

          if (ownTeamsList.length > 0) {
            const mappedTeams: Team[] = ownTeamsList.map((t: any, idx: number) => {
              const rawRoster = Array.isArray(t.roster_list)
                ? t.roster_list
                : Array.isArray(t.roster)
                ? t.roster
                : Array.isArray(t.athletes)
                ? t.athletes
                : [];

              const rosterList: RosterAthlete[] = rawRoster.map((a: any, aIdx: number) => {
                const isStringId = typeof a === "string";
                const athId = isStringId ? a : a.athlete_id || a.id || a.user_id || `ath_${aIdx}`;
                const cleanId = String(athId).toLowerCase().replace(/^ath_/, "").replace(/^usr_/, "");

                const foundInPool = poolList.find((p) => {
                  const pId = String(p.athlete_id || p.user_id || "").toLowerCase().replace(/^ath_/, "").replace(/^usr_/, "");
                  return pId === cleanId || (cleanId.length > 0 && pId.includes(cleanId)) || (cleanId.length > 0 && cleanId.includes(pId));
                });

                const rawName = !isStringId
                  ? (a.full_name || a.name || `${a.first_name || ""} ${a.last_name || ""}`).trim()
                  : "";

                const fullName = rawName && rawName.toLowerCase() !== "athlete"
                  ? rawName
                  : foundInPool?.full_name || (isStringId ? athId : `Athlete #${aIdx + 1}`);

                const pos = !isStringId && (a.position || a.primary_position)
                  ? (a.position || a.primary_position).toUpperCase()
                  : foundInPool?.position || "PG";

                const jersey = !isStringId && a.jersey_number !== undefined
                  ? String(a.jersey_number)
                  : foundInPool?.jersey_number || String(aIdx + 1);

                const sport = !isStringId && (a.sport_type || a.sport)
                  ? (a.sport_type || a.sport).toUpperCase()
                  : foundInPool?.sport_type || (t.sport_type || t.sport || "BASKETBALL").toUpperCase();

                return {
                  athlete_id: String(athId),
                  user_id: String(foundInPool?.user_id || (!isStringId ? a.user_id : undefined) || athId),
                  full_name: fullName,
                  position: pos,
                  jersey_number: jersey,
                  sport_type: sport,
                  is_eligibility_verified: Boolean(
                    !isStringId
                      ? (a.is_eligibility_verified ?? a.is_verified ?? foundInPool?.is_eligibility_verified ?? true)
                      : (foundInPool?.is_eligibility_verified ?? true)
                  ),
                  event_distance: !isStringId ? (a.event_distance || foundInPool?.event_distance) : foundInPool?.event_distance,
                  stroke_style: !isStringId ? (a.stroke_style || foundInPool?.stroke_style) : foundInPool?.stroke_style,
                };
              });

              return {
                team_id: t.team_id || t.id || `team_${idx}`,
                team_name: t.team_name || t.name || "My Team",
                sport_type: (t.sport_type || t.sport || "BASKETBALL").toUpperCase() as Team["sport_type"],
                division: t.division || t.organization_school || "",
                season_record: t.season_record || { wins: t.wins || 0, losses: t.losses || 0 },
                coach_id: t.coach_id || activeCoachId,
                roster_list: rosterList,
                created_at: t.created_at || new Date().toISOString().split("T")[0],
              };
            });

            // Fetch individual team details
            const enrichedTeams = await Promise.all(
              mappedTeams.map(async (team) => {
                if (team.roster_list && team.roster_list.length > 0) return team;
                try {
                  const detailsRes: any = await requestAuthenticatedJson(`/teams/${team.team_id}`).catch(() => null);
                  const rawDetailsRoster = detailsRes?.roster || detailsRes?.team?.roster || detailsRes?.roster_list || [];
                  if (Array.isArray(rawDetailsRoster) && rawDetailsRoster.length > 0) {
                    const mappedDetailsRoster: RosterAthlete[] = rawDetailsRoster.map((a: any, aIdx: number) => ({
                      athlete_id: String(a.athlete_id || a.id || `ath_${aIdx}`),
                      user_id: String(a.user_id || `usr_${a.athlete_id || aIdx}`),
                      full_name: (a.full_name || a.name || `${a.first_name || ""} ${a.last_name || ""}`).trim() || `Athlete #${aIdx + 1}`,
                      position: (a.position || a.primary_position || "PG").toUpperCase(),
                      jersey_number: a.jersey_number !== undefined ? String(a.jersey_number) : String(aIdx + 1),
                      sport_type: (a.sport_type || team.sport_type || "BASKETBALL").toUpperCase(),
                      is_eligibility_verified: Boolean(a.is_eligibility_verified ?? a.is_verified ?? true),
                      event_distance: a.event_distance,
                      stroke_style: a.stroke_style,
                    }));
                    return { ...team, roster_list: mappedDetailsRoster };
                  }
                } catch {
                  // Fallback
                }
                return team;
              })
            );

            setTeams(enrichedTeams);
            if (enrichedTeams.length > 0) {
              setSelectedTeamId(enrichedTeams[0].team_id);
            }

            // Dynamically construct Performance Profiles ONLY from coach's real team athletes
            const dynamicPerfAthletes: AthletePerformanceProfile[] = [];
            const seenPerfIds = new Set<string>();

            enrichedTeams.forEach((team) => {
              (team.roster_list || []).forEach((player) => {
                if (!seenPerfIds.has(player.athlete_id)) {
                  seenPerfIds.add(player.athlete_id);
                  dynamicPerfAthletes.push(
                    createAthletePerformanceProfile(player, team.team_name)
                  );
                }
              });
            });

            setPerfAthletes(dynamicPerfAthletes);
            if (dynamicPerfAthletes.length > 0) {
              setSelectedPerfAthlete(dynamicPerfAthletes[0]);
            }
          }
        }
      } catch (err) {
        // Non-blocking catch
      }
    };

    fetchCoachAndTeamsData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Navigation States
  const [activeTab, setActiveTab] = useState<NavigationTab>("Home");
  const [activeView, setActiveView] = useState<ViewState>("dashboard");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("team_01");

  // Filters & Modals
  const [activeSportFilter, setActiveSportFilter] = useState<string>("ALL");
  const [showFabOverlay, setShowFabOverlay] = useState(false);
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hideDiscoveryNav, setHideDiscoveryNav] = useState(false);
  const [coachProfile, setCoachProfile] = useState<CoachProfileState>(DEFAULT_COACH_PROFILE);
  const [ocrPayload, setOcrPayload] = useState<RawOCRDetectedData | undefined>();

  // Performance State (Real API Connected)
  const [perfAthletes, setPerfAthletes] = useState<AthletePerformanceProfile[]>([]);
  const [selectedPerfAthlete, setSelectedPerfAthlete] = useState<AthletePerformanceProfile | null>(null);
  const [selectedMatchItem, setSelectedMatchItem] = useState<MatchHistoryItem | null>(null);
  const [previousPortfolioView, setPreviousPortfolioView] = useState<ViewState>("performance");

  const handleSelectPerfAthlete = useCallback(async (ath: AthletePerformanceProfile) => {
    setSelectedPerfAthlete(ath);
    setPreviousPortfolioView("performance");
    setActiveView("athlete_portfolio");

    // Fetch real-time athlete profile and workload analytics from backend
    try {
      const [scoutRes, workloadRes]: [any, any] = await Promise.all([
        requestAuthenticatedJson(`/scouting/athletes/${ath.athlete_id}`).catch(() => null),
        requestAuthenticatedJson(`/athletes/${ath.athlete_id}/workload`).catch(() => null),
      ]);

      if (scoutRes || workloadRes) {
        const rawScout = scoutRes?.athlete || scoutRes?.profile || scoutRes;
        const rawWorkload = workloadRes?.workload || workloadRes || rawScout?.workload_trends;

        const rawPhys = rawScout?.physical_attributes || rawScout?.biometrics || {};
        const rawRadar = rawScout?.radar_scores || rawScout?.radar_competencies || {};
        const rawSport = String(rawScout?.sport_type || ath.sport_category || "BASKETBALL").toUpperCase();
        const sportCategory: AthletePerformanceProfile["sport_category"] =
          rawSport.includes("TRACK") || rawSport.includes("FIELD")
            ? "TRACK AND FIELD"
            : rawSport.includes("SWIM")
            ? "SWIMMING"
            : "BASKETBALL";

        setSelectedPerfAthlete((prev) => {
          if (!prev || prev.athlete_id !== ath.athlete_id) return prev;
          return {
            ...prev,
            sport_category: sportCategory,
            biometrics: {
              height_ft: rawPhys.height_cm ? `${(rawPhys.height_cm / 30.48).toFixed(1)}'` : (rawPhys.height_ft || prev.biometrics.height_ft),
              weight_lbs: rawPhys.weight_kg ? `${Math.round(rawPhys.weight_kg * 2.20462)} lbs` : (rawPhys.weight_lbs || prev.biometrics.weight_lbs),
              wingspan_ft: rawPhys.wingspan_cm ? `${(rawPhys.wingspan_cm / 30.48).toFixed(1)}'` : (rawPhys.wingspan_ft || prev.biometrics.wingspan_ft),
              vertical_jump_in: rawPhys.vertical_cm ? `${Math.round(rawPhys.vertical_cm / 2.54)}"` : (rawPhys.vertical_jump_in || prev.biometrics.vertical_jump_in),
            },
            averages: rawScout?.stats ? { ...prev.averages, ...rawScout.stats } : {
              ...prev.averages,
              per_score: rawScout?.career_per || prev.averages.per_score,
            },
            radar_competencies: (rawScout?.stats && (rawScout.stats.ppg || rawScout.stats.games_played || rawScout.stats.efficiency_rating)) || (rawScout?.recent_matches && rawScout.recent_matches.length > 0)
              ? {
                  speed: Number(rawRadar.speed || 0),
                  power: Number(rawRadar.power || 0),
                  agility: Number(rawRadar.agility || 0),
                  iq: Number(rawRadar.iq || 0),
                  tech: Number(rawRadar.tech || rawRadar.endurance || 0),
                }
              : { speed: 0, power: 0, agility: 0, iq: 0, tech: 0 },
            workload_analytics: rawWorkload?.calculated_acwr || rawWorkload?.acwr_ratio
              ? {
                  target_7day_effort_pts: rawWorkload.target_7day_effort_pts || prev.workload_analytics.target_7day_effort_pts,
                  current_7day_acute_load: Number(rawWorkload.acute_load_7d || rawWorkload.acute_load || prev.workload_analytics.current_7day_acute_load),
                  current_28day_chronic_load: Number(rawWorkload.chronic_load_28d || rawWorkload.chronic_load || prev.workload_analytics.current_28day_chronic_load),
                  calculated_acwr: Number(rawWorkload.acwr_ratio || rawWorkload.calculated_acwr || prev.workload_analytics.calculated_acwr),
                  workout_score: Number(rawWorkload.workout_score || prev.workload_analytics.workout_score),
                  fatigue_meter: Number(rawWorkload.fatigue_meter || prev.workload_analytics.fatigue_meter),
                  routine_score: Number(rawWorkload.routine_score || prev.workload_analytics.routine_score),
                  body_stress_pts: Number(rawWorkload.body_stress_pts || prev.workload_analytics.body_stress_pts),
                }
              : prev.workload_analytics,
          };
        });
      }
    } catch {
      // Non-blocking catch
    }
  }, []);

  // Current Selected Team
  const currentTeam = useMemo(
    () => teams.find((t) => t.team_id === selectedTeamId) || teams[0],
    [teams, selectedTeamId]
  );

  // Unique athletes on Coach's Teams / Rosters
  const coachTeamAthletes = useMemo(() => {
    const athleteMap = new Map<string, RosterAthlete>();
    teams.forEach((t) => {
      (t.roster_list || []).forEach((p) => {
        const id = typeof p === "string" ? p : p?.athlete_id;
        if (id && !athleteMap.has(id)) {
          if (typeof p === "object") {
            athleteMap.set(id, p);
          } else {
            const found = athletesPool.find((ap) => ap.athlete_id === id);
            if (found) athleteMap.set(id, found);
          }
        }
      });
    });
    return Array.from(athleteMap.values());
  }, [teams, athletesPool]);

  // Filter athletes based on sport
  const filteredDashboardPlayers = useMemo(() => {
    if (activeSportFilter === "ALL") return coachTeamAthletes;
    return coachTeamAthletes.filter((p) => p.sport_type === activeSportFilter);
  }, [coachTeamAthletes, activeSportFilter]);

  // Athlete Count
  const totalAthletesCount = useMemo(() => {
    return coachTeamAthletes.length;
  }, [coachTeamAthletes]);

  // Handlers
  const handleUpdateTeamName = useCallback((teamId: string, newName: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.team_id === teamId ? { ...t, team_name: newName } : t))
    );
    requestAuthenticatedJson(`/teams/${teamId}`, "PUT", { name: newName, team_name: newName }).catch(() => null);
  }, []);

  const handleUpdateTeamDetails = useCallback(
    (
      teamId: string,
      updates: { team_name?: string; sport_type?: Team["sport_type"]; division?: string }
    ) => {
      setTeams((prev) =>
        prev.map((t) => (t.team_id === teamId ? { ...t, ...updates } : t))
      );
      requestAuthenticatedJson(`/teams/${teamId}`, "PUT", {
        name: updates.team_name,
        team_name: updates.team_name,
        division: updates.division,
        sport_type: updates.sport_type,
      }).catch(() => null);
    },
    []
  );

  const handleUpdateRosterPlayer = useCallback(
    (teamId: string, athleteId: string, position: string, jerseyNumber: string) => {
      setTeams((prev) =>
        prev.map((t) => {
          if (t.team_id !== teamId) return t;
          return {
            ...t,
            roster_list: t.roster_list.map((p) =>
              p.athlete_id === athleteId ? { ...p, position, jersey_number: jerseyNumber } : p
            ),
          };
        })
      );
    },
    []
  );

  const handleUpdateRosterPlayerDetails = useCallback(
    (
      teamId: string,
      athleteId: string,
      details: { position?: string; jerseyNumber?: string; event_distance?: string; stroke_style?: string }
    ) => {
      setTeams((prev) =>
        prev.map((t) => {
          if (t.team_id !== teamId) return t;
          return {
            ...t,
            roster_list: t.roster_list.map((p) => {
              if (p.athlete_id !== athleteId) return p;
              return {
                ...p,
                position: details.position !== undefined ? details.position : p.position,
                jersey_number:
                  details.jerseyNumber !== undefined ? details.jerseyNumber : p.jersey_number,
                event_distance:
                  details.event_distance !== undefined ? details.event_distance : p.event_distance,
                stroke_style:
                  details.stroke_style !== undefined ? details.stroke_style : p.stroke_style,
              };
            }),
          };
        })
      );
    },
    []
  );

  const handleRemovePlayer = useCallback((teamId: string, athleteId: string) => {
    let removedPlayer: RosterAthlete | null = null;
    let nextRoster: RosterAthlete[] = [];

    setTeams((prev) =>
      prev.map((t) => {
        if (t.team_id !== teamId) return t;
        const target = t.roster_list.find((p) => p.athlete_id === athleteId);
        if (target) removedPlayer = target;
        nextRoster = t.roster_list.filter((p) => p.athlete_id !== athleteId);
        return {
          ...t,
          roster_list: nextRoster,
        };
      })
    );

    // Keep removed player in coach's available athletes pool so they can be re-added anytime
    if (removedPlayer) {
      const playerToAdd: RosterAthlete = removedPlayer;
      setAthletesPool((prev) => {
        const exists = prev.some(
          (ap) =>
            ap.athlete_id === athleteId ||
            (ap.user_id && playerToAdd.user_id && ap.user_id === playerToAdd.user_id)
        );
        if (exists) return prev;
        return [...prev, playerToAdd];
      });
    }

    const rosterPayload = nextRoster.map((a) => ({
      athlete_id: a.athlete_id,
      user_id: a.user_id || a.athlete_id,
      position: a.position || 'PG',
      jersey_number: Number(a.jersey_number) || 0,
    }));

    const backendPayload = {
      roster_list: rosterPayload,
      roster_updates: rosterPayload,
      override_unverified: true,
    };

    Promise.all([
      requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", backendPayload),
      requestAuthenticatedJson(`/teams/${teamId}`, "PATCH", backendPayload),
    ]).catch(() => null);
  }, []);

  const handleAddPlayersToTeam = useCallback((teamId: string, newAthletes: RosterAthlete[]) => {
    let nextRoster: RosterAthlete[] = [];

    setTeams((prev) =>
      prev.map((t) => {
        if (t.team_id !== teamId) return t;
        const existingIds = new Set(t.roster_list.map((r) => r.athlete_id));
        const uniqueNew = newAthletes.filter((a) => !existingIds.has(a.athlete_id));
        nextRoster = [...t.roster_list, ...uniqueNew];
        return {
          ...t,
          roster_list: nextRoster,
        };
      })
    );

    const rosterPayload = nextRoster.map((a) => ({
      athlete_id: a.athlete_id,
      user_id: a.user_id || a.athlete_id,
      position: a.position || 'PG',
      jersey_number: Number(a.jersey_number) || 0,
    }));

    const backendPayload = {
      roster_list: rosterPayload,
      roster_updates: rosterPayload,
      override_unverified: true,
    };

    Promise.all([
      requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", backendPayload),
      requestAuthenticatedJson(`/teams/${teamId}`, "PATCH", backendPayload),
    ]).catch(() => null);
  }, []);

  const handleCreateTeam = useCallback(
    async (newTeamData: {
      team_name: string;
      sport_type: Team["sport_type"];
      division: string;
      established_year?: string;
      roster_list: RosterAthlete[];
    }) => {
      try {
        const divisionVal = (newTeamData.division || "").trim() || "Varsity Division";
        const rosterPayload = (newTeamData.roster_list || []).map((a) => ({
          athlete_id: a.athlete_id,
          user_id: a.user_id || a.athlete_id,
          first_name: a.full_name.split(" ")[0] || a.full_name,
          last_name: a.full_name.split(" ").slice(1).join(" ") || "",
          position: a.position || "PG",
          jersey_number: a.jersey_number || "00",
        }));

        const payload = {
          name: newTeamData.team_name.trim(),
          team_name: newTeamData.team_name.trim(),
          sport_type: newTeamData.sport_type,
          division: divisionVal,
          established_year: Number(newTeamData.established_year) || new Date().getFullYear(),
          organization_school: coach.current_institution || "Atleta Academy",
          roster_list: rosterPayload,
          roster: rosterPayload,
        };

        const res: any = await requestAuthenticatedJson("/teams", "POST", payload);

        const createdTeamObj = res?.team || res;
        const newTeamId = createdTeamObj?.team_id || createdTeamObj?.id || `team_${Date.now()}`;
        const athleteIds = (newTeamData.roster_list || []).map((a) => a.athlete_id);

        if (athleteIds.length > 0) {
          await requestAuthenticatedJson(`/teams/${newTeamId}/roster`, "PATCH", {
            roster_list: rosterPayload,
            roster_updates: rosterPayload,
            athlete_ids: athleteIds,
            action: "ADD",
            override_unverified: true,
          }).catch(() => null);
        }

        const created: Team = {
          team_id: newTeamId,
          team_name: createdTeamObj?.team_name || createdTeamObj?.name || newTeamData.team_name,
          sport_type: newTeamData.sport_type,
          division: divisionVal,
          season_record: { wins: 0, losses: 0 },
          coach_id: coach.coach_id,
          roster_list: newTeamData.roster_list || [],
          created_at: new Date().toISOString().split("T")[0],
        };

        setTeams((prev) => [created, ...prev]);
        setSelectedTeamId(created.team_id);
        setActiveView("manage_team");
      } catch (e) {
        const divisionVal = (newTeamData.division || "").trim() || "Varsity Division";
        const fallbackCreated: Team = {
          team_id: `team_${Date.now()}`,
          team_name: newTeamData.team_name,
          sport_type: newTeamData.sport_type,
          division: divisionVal,
          season_record: { wins: 0, losses: 0 },
          coach_id: coach.coach_id,
          roster_list: newTeamData.roster_list,
          created_at: new Date().toISOString().split("T")[0],
        };
        setTeams((prev) => [fallbackCreated, ...prev]);
        setSelectedTeamId(fallbackCreated.team_id);
        setActiveView("manage_team");
      }
    },
    [coach.coach_id, coach.current_institution]
  );

  const handleSelectTab = useCallback((tab: NavigationTab) => {
    setActiveTab(tab);
    if (tab === "Home") {
      setActiveView("dashboard");
    } else if (tab === "Teams") {
      setActiveView("teams_list");
    } else if (tab === "Discovery") {
      setActiveView("discovery");
    } else if (tab === "Performance") {
      setActiveView("performance");
    }
  }, []);

  const handleViewStats = useCallback((player: RosterAthlete) => {
    const matched = perfAthletes.find(
      (a) =>
        a.athlete_id === player.athlete_id ||
        a.full_name.toLowerCase() === player.full_name.toLowerCase()
    ) || createAthletePerformanceProfile(player, currentTeam?.team_name || "Varsity Team");
    handleSelectPerfAthlete(matched);
  }, [perfAthletes, currentTeam, handleSelectPerfAthlete]);

  const handleDeleteTeam = useCallback((teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.team_id !== teamId));
    requestAuthenticatedJson(`/teams/${teamId}`, "DELETE").catch(() => null);
    setActiveView("teams_list");
    setActiveTab("Teams");
  }, []);

  const handleMatchSaveCompleted = useCallback(() => {
    setCoachProfile((prev) => ({
      ...prev,
      system_statistics: {
        ...prev.system_statistics,
        metric_logs: (prev.system_statistics?.metric_logs || 0) + 1,
      },
    }));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* SCREEN 6: EDIT PROFILE SCREEN */}
      {activeView === "edit_profile" && (
        <CoachEditProfile
          profileData={coachProfile}
          onSave={(updated) => setCoachProfile(updated)}
          onBack={() => {
            setActiveView("dashboard");
            setShowProfileModal(true);
          }}
        />
      )}

      {/* SCREEN 5: COACH SETTINGS PAGE */}
      {activeView === "settings" && (
        <CoachSettings
          onBack={() => setActiveView("dashboard")}
          onLogout={onLogout}
        />
      )}

      {/* OCR SCREEN 1: UPLOAD STATS & FILE PICKER */}
      {activeView === "ocr_logging" && (
        <OCRlogging
          onBack={() => setActiveView("dashboard")}
          onUploadSuccess={(data) => {
            setOcrPayload(data);
            setActiveView("ocr_output");
          }}
        />
      )}

      {/* OCR SCREEN 2: DETECTED RAW TEAM STATISTICS REVIEW & EDIT */}
      {activeView === "ocr_output" && (
        <OCRoutput
          rawOCRData={ocrPayload}
          onBack={() => setActiveView("ocr_logging")}
          onConfirmSave={(finalData) => {
            // Update roster athletes state with the confirmed OCR performance stats
            setAthletesPool((prev: RosterAthlete[]) =>
              prev.map((athlete: RosterAthlete) => {
                const matchedStat = finalData.athlete_overview.find(
                  (s) => s.player_name.toLowerCase() === athlete.full_name.toLowerCase()
                );
                if (matchedStat) {
                  return {
                    ...athlete,
                    event_distance: matchedStat.time ? matchedStat.time : athlete.event_distance,
                  };
                }
                return athlete;
              })
            );
            setTeams((prev: Team[]) =>
              prev.map((t: Team) => ({
                ...t,
                roster_list: t.roster_list.map((p: RosterAthlete) => {
                  const matchedStat = finalData.athlete_overview.find(
                    (s) => s.player_name.toLowerCase() === p.full_name.toLowerCase()
                  );
                  if (matchedStat) {
                    return {
                      ...p,
                      event_distance: matchedStat.time ? matchedStat.time : p.event_distance,
                    };
                  }
                  return p;
                }),
              }))
            );
            setActiveView("dashboard");
          }}
        />
      )}

      {/* COACH HOME DASHBOARD */}
      {activeView === "dashboard" && (
        <>
          {/* FIXED HEADER BAR */}
          <AtletaHeader
            onSettingsPress={() => setActiveView("settings")}
            onProfilePress={() => setShowProfileModal(true)}
            onNotificationPress={() => setShowNotificationModal(true)}
          />

          {/* SCROLLABLE DASHBOARD BODY */}
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: headerTopPadding + 88, paddingBottom: 150 },
            ]}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            scrollEventThrottle={16}
          >
            {/* Greeting Block */}
            <View style={styles.greetingSection}>
              <Text style={styles.greetingTitle}>Hi, {coach.first_name}!</Text>
              <Text style={styles.greetingSubtitle}>
                Empower your athletes today. Ready to manage your elite teams?
              </Text>
            </View>

            {/* Sports Categories Filter */}
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>SPORTS CATEGORIES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
                {SPORT_CATEGORIES.map((category) => {
                  const isActive = activeSportFilter === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setActiveSportFilter(category)}
                      activeOpacity={0.8}
                      style={[styles.pillButton, isActive ? styles.pillActive : styles.pillInactive]}
                    >
                      <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* PLAYERS Section */}
            <View style={styles.playersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>PLAYERS</Text>
                <TouchableOpacity onPress={() => setActiveView("view_all_players")} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {/* Player Rows */}
              <View style={styles.playersList}>
                {filteredDashboardPlayers.length === 0 ? (
                  <View style={{ paddingVertical: 24, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#94A3B8", fontSize: 14, fontWeight: "600" }}>
                      No Athletes in Roster
                    </Text>
                    <Text style={{ color: "#64748B", fontSize: 12, marginTop: 4, textAlign: "center" }}>
                      Add athletes to your team roster or discover players in the Discovery tab.
                    </Text>
                  </View>
                ) : (
                  filteredDashboardPlayers.slice(0, 4).map((player, index) => (
                    <PlayerRowItem
                      key={player.athlete_id}
                      player={player}
                      isLast={index === Math.min(filteredDashboardPlayers.length, 4) - 1}
                      onViewStats={handleViewStats}
                    />
                  ))
                )}
              </View>
            </View>

            {/* TOTAL ATHLETES Card */}
            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>TOTAL ATHLETES</Text>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryPillValue}>{totalAthletesCount}</Text>
              </View>
            </View>
          </ScrollView>
        </>
      )}

      {/* MY TEAMS PAGE */}
      {activeView === "teams_list" && (
        <MyTeamsPage
          teams={teams}
          athletesPool={athletesPool}
          onSelectTeam={(team) => {
            setSelectedTeamId(team.team_id);
            setActiveView("manage_team");
          }}
          onCreateTeam={handleCreateTeam}
          onLogout={onLogout}
          onSettingsPress={() => setActiveView("settings")}
          onProfilePress={() => setShowProfileModal(true)}
          onNotificationPress={() => setShowNotificationModal(true)}
        />
      )}

      {/* MANAGE TEAM SCREEN */}
      {activeView === "manage_team" && currentTeam && (
        <ManageTeamPage
          team={currentTeam}
          athletesPool={athletesPool}
          onBack={() => {
            setActiveView("teams_list");
            setActiveTab("Teams");
          }}
          onDeleteTeam={handleDeleteTeam}
          onUpdateTeamName={handleUpdateTeamName}
          onUpdateTeamDetails={handleUpdateTeamDetails}
          onUpdateRosterPlayer={handleUpdateRosterPlayer}
          onUpdateRosterPlayerDetails={handleUpdateRosterPlayerDetails}
          onRemovePlayer={handleRemovePlayer}
          onAddPlayers={handleAddPlayersToTeam}
        />
      )}

      {/* VIEW ALL PLAYERS PAGE */}
      {activeView === "view_all_players" && (
        <ViewAllPlayers
          athletesPool={athletesPool}
          teams={teams}
          onBack={() => setActiveView("dashboard")}
          onSelectAthlete={(player) => handleViewStats(player)}
          onLogout={onLogout}
        />
      )}

      {/* OFFICIAL MATCHES & AUDIT SCORESHEET REQUEST MODULE */}
      {activeView === "official_matches" && (
        <OfficialMatchesPage onBack={() => setActiveView("dashboard")} />
      )}

      {/* DISCOVERY MODULE */}
      {activeView === "discovery" && (
        <DiscoveryMain
          onSettingsPress={() => setActiveView("settings")}
          onProfilePress={() => setShowProfileModal(true)}
          onToggleBottomNav={(hide) => setHideDiscoveryNav(hide)}
        />
      )}

      {/* PERFORMANCE MODULE  */}
      {activeView === "performance" && (
        <PerformancePage
          athletes={perfAthletes}
          onSelectAthlete={handleSelectPerfAthlete}
          onSettingsPress={() => setActiveView("settings")}
          onProfilePress={() => setShowProfileModal(true)}
          onNotificationPress={() => setShowNotificationModal(true)}
        />
      )}

      {activeView === "athlete_portfolio" && selectedPerfAthlete && (
        <AthletePortfolio
          athlete={selectedPerfAthlete}
          onClose={() => {
            const returnView = previousPortfolioView || "performance";
            setActiveView(returnView);
            if (returnView === "performance") {
              setActiveTab("Performance");
            } else if (returnView === "dashboard" || returnView === "view_all_players") {
              setActiveTab("Home");
            }
          }}
          onViewAllStats={() => setActiveView("all_stats")}
          onViewMatchHistory={() => setActiveView("match_history")}
        />
      )}

      {activeView === "all_stats" && selectedPerfAthlete && (
        <AllStats
          athlete={selectedPerfAthlete}
          onClose={() => setActiveView("athlete_portfolio")}
          onUpdateWorkload={(updatedWorkload) => {
            setSelectedPerfAthlete((prev) =>
              prev
                ? {
                    ...prev,
                    workload_analytics: updatedWorkload,
                  }
                : null
            );
            setPerfAthletes((prev) =>
              prev.map((a) =>
                a.athlete_id === selectedPerfAthlete.athlete_id
                  ? { ...a, workload_analytics: updatedWorkload }
                  : a
              )
            );
          }}
        />
      )}

      {activeView === "match_history" && selectedPerfAthlete && (
        <MatchHistory
          athleteId={selectedPerfAthlete.athlete_id}
          sportCategory={selectedPerfAthlete.sport_category}
          onClose={() => setActiveView("athlete_portfolio")}
          onSelectMatchItem={(matchItem) => {
            setSelectedMatchItem(matchItem);
            if (matchItem.sport_category === "BASKETBALL") {
              setActiveView("perf_basketball_result");
            } else if (matchItem.sport_category === "SWIMMING") {
              setActiveView("perf_swimming_result");
            } else {
              setActiveView("perf_trackfield_result");
            }
          }}
        />
      )}

      {activeView === "perf_trackfield_result" && (
        <TrackfieldMatchResult matchItem={selectedMatchItem} onBack={() => setActiveView("match_history")} />
      )}

      {activeView === "perf_swimming_result" && (
        <SwimmingMatchResult matchItem={selectedMatchItem} onBack={() => setActiveView("match_history")} />
      )}

      {activeView === "perf_basketball_result" && (
        <BasketballMatchResult matchItem={selectedMatchItem} onBack={() => setActiveView("match_history")} />
      )}

      {/* MULTI-LOGGING MODULE */}
      {(activeView === "create_log" ||
        activeView === "basketball_match" ||
        activeView === "swimming_match" ||
        activeView === "track_field_match" ||
        activeView === "match_details") && (
          <MatchSessionProvider>
            {activeView === "create_log" && (
              <CreateLogScreen
                onBack={() => setActiveView("dashboard")}
                onStartLogging={(session) => {
                  if (session.sport_type === "BASKETBALL") {
                    setActiveView("basketball_match");
                  } else if (session.sport_type === "SWIMMING") {
                    setActiveView("swimming_match");
                  } else if (session.sport_type === "TRACK AND FIELD") {
                    setActiveView("track_field_match");
                  }
                }}
              />
            )}

            {activeView === "basketball_match" && (
              <BasketballMatchScreen
                onClose={() => setActiveView("dashboard")}
                onSaveMatch={() => setActiveView("match_details")}
              />
            )}

            {activeView === "swimming_match" && (
              <SwimmingMatchScreen
                onClose={() => setActiveView("dashboard")}
                onSaveMatch={() => setActiveView("match_details")}
              />
            )}

            {activeView === "track_field_match" && (
              <TrackFieldMatchScreen
                onClose={() => setActiveView("dashboard")}
                onSaveMatch={() => setActiveView("match_details")}
              />
            )}

            {activeView === "match_details" && (
              <MatchDetailsScreen
                onBack={() => setActiveView("dashboard")}
                onDone={() => setActiveView("dashboard")}
                onSaveComplete={handleMatchSaveCompleted}
              />
            )}
          </MatchSessionProvider>
        )}

      {/* FLOATING ACTION BUTTON */}
      {activeView === "dashboard" && (
        <TouchableOpacity
          style={styles.floatingFabButton}
          onPress={() => setShowFabOverlay(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#070D19" />
        </TouchableOpacity>
      )}

      {/* NAVIGATIONS */}
      {activeView !== "manage_team" &&
        activeView !== "view_all_players" &&
        activeView !== "settings" &&
        activeView !== "edit_profile" &&
        activeView !== "ocr_logging" &&
        activeView !== "ocr_output" &&
        activeView !== "create_log" &&
        activeView !== "athlete_portfolio" &&
        activeView !== "all_stats" &&
        activeView !== "match_history" &&
        activeView !== "perf_trackfield_result" &&
        activeView !== "perf_swimming_result" &&
        activeView !== "perf_basketball_result" &&
        activeView !== "basketball_match" &&
        activeView !== "swimming_match" &&
        activeView !== "track_field_match" &&
        activeView !== "match_details" &&
        activeView !== "official_matches" &&
        !hideDiscoveryNav && (
          <AtletaNavbar activeTab={activeTab} onSelectTab={handleSelectTab} />
        )}

      {/* COACH PROFILE OVERVIEW MODAL */}
      <CoachProfile
        visible={showProfileModal}
        profileData={coachProfile}
        onClose={() => setShowProfileModal(false)}
        onOpenEdit={() => {
          setShowProfileModal(false);
          setActiveView("edit_profile");
        }}
      />

      {/* COACH NOTIFICATIONS & ATHLETE INQUIRIES MODAL */}
      <CoachNotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* FLOATING ACTION OVERLAY MENU */}
      <Modal transparent animationType="fade" visible={showFabOverlay} onRequestClose={() => setShowFabOverlay(false)}>
        <TouchableOpacity
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={() => setShowFabOverlay(false)}
        >
          <View style={{ position: "absolute", bottom: 100, right: 20, alignItems: "flex-end" }}>
            <View style={styles.fabMenuCard}>
              <TouchableOpacity
                style={styles.fabActionRow}
                onPress={() => {
                  setShowFabOverlay(false);
                  setActiveView("ocr_logging");
                }}
              >
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Upload Stats</Text>
              </TouchableOpacity>

              <View style={styles.fabDivider} />

              <TouchableOpacity
                style={styles.fabActionRow}
                onPress={() => {
                  setShowFabOverlay(false);
                  setActiveView("official_matches");
                }}
              >
                <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Scoresheet Request</Text>
              </TouchableOpacity>

              <View style={styles.fabDivider} />

              <TouchableOpacity
                style={styles.fabActionRow}
                onPress={() => {
                  setShowFabOverlay(false);
                  setActiveView("create_log");
                }}
              >
                <Ionicons name="basketball-outline" size={18} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Create Match</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeFabButton}
              onPress={() => setShowFabOverlay(false)}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* TEAM PROFILE DETAILS */}
      <Modal visible={showTeamDetailsModal} transparent animationType="slide" onRequestClose={() => setShowTeamDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>TEAM PROFILE DETAILS</Text>
              <TouchableOpacity onPress={() => setShowTeamDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.teamBannerCard}>
                <View style={styles.sportBadge}>
                  <Text style={styles.sportBadgeText}>{currentTeam.sport_type}</Text>
                </View>
                <Text style={styles.teamNameTitle}>{currentTeam.team_name}</Text>
                <Text style={styles.divisionText}>{currentTeam.division || "Elite Professional"}</Text>

                <View style={styles.recordBox}>
                  <Text style={styles.recordLabel}>SEASON RECORD</Text>
                  <Text style={styles.recordValue}>
                    {currentTeam.season_record.wins} Wins - {currentTeam.season_record.losses} Losses
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.manageCtaButton}
                onPress={() => {
                  setShowTeamDetailsModal(false);
                  setActiveView("manage_team");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.manageCtaText}>MANAGE TEAM & ROSTER</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}



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

// API Request: fetch coach dashboard & team summary (GET /api/coach/dashboard)
export function CoachMainPage({ onLogout }: CoachMainPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  // Local State
  const [coach, setCoach] = useState<UserCoach>({
    user_id: "",
    first_name: "Coach",
    last_name: "",
    email: "",
    contact_number: "",
    role: "Coach",
    coach_id: "",
    current_institution: "University Athletics",
    athlete_managed: [],
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletesPool, setAthletesPool] = useState<RosterAthlete[]>([]);

  // Navigation States
  const [activeTab, setActiveTab] = useState<NavigationTab>("Home");
  const [activeView, setActiveView] = useState<ViewState>("dashboard");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Filters & Modals
  const [activeSportFilter, setActiveSportFilter] = useState<string>("BASKETBALL");
  const [showFabOverlay, setShowFabOverlay] = useState(false);
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hideDiscoveryNav, setHideDiscoveryNav] = useState(false);
  const [coachProfile, setCoachProfile] = useState<CoachProfileState>({
    coach_id: "",
    user_id: "",
    first_name: "Coach",
    last_name: "",
    full_name: "Coach",
    email: "",
    role_title: "COACH",
    sports_focus: "BASKETBALL",
    regional_affiliations: {
      association_name: "National Sports League",
      office_name: "Sports Office",
    },
    credentials: [],
    uploaded_documents: [],
    system_statistics: {
      total_athletes: 0,
      metric_logs: 0,
    },
    last_updated: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase(),
  });
  const [ocrPayload, setOcrPayload] = useState<RawOCRDetectedData | undefined>();

  // Performance State
  const [perfAthletes, setPerfAthletes] = useState<AthletePerformanceProfile[]>([]);
  const [selectedPerfAthlete, setSelectedPerfAthlete] = useState<AthletePerformanceProfile>(MOCK_PERFORMANCE_ATHLETES[0]);
  const [selectedMatchItem, setSelectedMatchItem] = useState<MatchHistoryItem | null>(null);
  const [previousPortfolioView, setPreviousPortfolioView] = useState<ViewState>("performance");

  // Live Backend Data Fetching on Mount
  useEffect(() => {
    let isMounted = true;

    const fetchCoachDashboardData = async () => {
      try {
        const [profileRes, teamsRes, athletesRes]: [any, any, any] = await Promise.all([
          requestAuthenticatedJson("/coaches/profile").catch(() => null),
          requestAuthenticatedJson("/teams").catch(() => null),
          requestAuthenticatedJson("/athletes").catch(() => null),
        ]);

        if (isMounted) {
          if (profileRes) {
            const firstName = profileRes.first_name || "Coach";
            const lastName = profileRes.last_name || "";
            const fullName = profileRes.full_name || `${firstName} ${lastName}`.trim();
            const rawSport = (profileRes.sport_type || profileRes.sports_focus || "BASKETBALL").toUpperCase();
            const sportFocus: CoachProfileState["sports_focus"] =
              rawSport.includes("SWIM")
                ? "SWIMMING"
                : rawSport.includes("TRACK")
                ? "TRACK AND FIELD"
                : "BASKETBALL";

            const updatedCoach: UserCoach = {
              user_id: profileRes.user_id || "",
              first_name: firstName,
              last_name: lastName,
              email: profileRes.email || "",
              contact_number: profileRes.contact_number || "",
              role: "Coach",
              coach_id: profileRes.coach_id || profileRes.user_id || "",
              current_institution: profileRes.current_institution || "University Athletics",
              athlete_managed: profileRes.athlete_managed || [],
            };
            setCoach(updatedCoach);
            setActiveSportFilter(sportFocus);

            const updatedProfileState: CoachProfileState = {
              coach_id: updatedCoach.coach_id,
              user_id: updatedCoach.user_id,
              first_name: firstName,
              last_name: lastName,
              full_name: fullName,
              email: updatedCoach.email,
              role_title: `${sportFocus} COACH`,
              sports_focus: sportFocus,
              avatar_url: profileRes.avatar_url,
              regional_affiliations: profileRes.regional_affiliations || {
                association_name: "National Sports League",
                office_name: profileRes.current_institution || "Sports Office",
              },
              credentials: profileRes.credentials || profileRes.certifications || [],
              uploaded_documents: profileRes.uploaded_documents || [],
              system_statistics: {
                total_athletes: Array.isArray(athletesRes) ? athletesRes.length : 0,
                metric_logs: profileRes.metric_logs || 0,
              },
              last_updated: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase(),
            };
            setCoachProfile(updatedProfileState);
          }

          if (Array.isArray(teamsRes) && teamsRes.length > 0) {
            const mappedTeams: Team[] = teamsRes.map((t: any) => ({
              team_id: t.team_id || t.id,
              team_name: t.team_name || "Team",
              sport_type: (t.sport_type?.toUpperCase() || "BASKETBALL") as Team["sport_type"],
              division: t.division || "Elite Professional",
              season_record: t.season_record || { wins: t.wins || 0, losses: t.losses || 0 },
              coach_id: t.coach_id || coach.coach_id,
              roster_list: Array.isArray(t.roster_list) ? t.roster_list.map((p: any) => ({
                athlete_id: typeof p === 'string' ? p : (p.athlete_id || p.user_id || 'ath_01'),
                user_id: typeof p === 'string' ? p : (p.user_id || p.athlete_id || 'usr_01'),
                full_name: typeof p === 'object' ? (p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()) : 'Athlete',
                sport_type: typeof p === 'object' ? (p.sport_type || 'BASKETBALL') : 'BASKETBALL',
                position: typeof p === 'object' ? (p.position || 'PG') : 'PG',
                jersey_number: typeof p === 'object' ? String(p.jersey_number || '0') : '0',
                is_eligibility_verified: typeof p === 'object' ? !!p.is_eligibility_verified : true,
                event_distance: typeof p === 'object' ? p.event_distance : undefined,
                stroke_style: typeof p === 'object' ? p.stroke_style : undefined,
                avatar_url: typeof p === 'object' ? p.avatar_url : undefined,
              })) : [],
              created_at: t.created_at || new Date().toISOString().split("T")[0],
            }));
            setTeams(mappedTeams);
            if (mappedTeams[0]) {
              setSelectedTeamId(mappedTeams[0].team_id);
            }
          } else {
            setTeams([]);
          }

          if (Array.isArray(athletesRes) && athletesRes.length > 0) {
            const mappedPool: RosterAthlete[] = athletesRes.map((a: any) => ({
              athlete_id: a.athlete_id || a.user_id || 'ath_01',
              user_id: a.user_id || a.athlete_id || 'usr_01',
              full_name: a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || 'Athlete',
              sport_type: a.sport_type || a.sport_category || "BASKETBALL",
              position: a.position || "PG",
              jersey_number: String(a.jersey_number || "0"),
              is_eligibility_verified: a.is_eligibility_verified !== undefined ? !!a.is_eligibility_verified : true,
              event_distance: a.event_distance || "100m",
              stroke_style: a.stroke_style || "Freestyle",
              avatar_url: a.avatar_url,
            }));
            setAthletesPool(mappedPool);

            const mappedPerf: AthletePerformanceProfile[] = athletesRes.map((a: any) => ({
              athlete_id: a.athlete_id || a.user_id || `ath_${Date.now()}`,
              user_id: a.user_id || a.athlete_id || "",
              full_name: a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || 'Athlete',
              birthdate: a.birthdate || "2006-01-01",
              position_or_event: a.position || "Athlete",
              location_province: a.location || a.province || "Albay",
              team_name: a.team_name || "Team",
              rating_score: a.rating_score || 85,
              sport_category: (a.sport_type || a.sport_category || "BASKETBALL").toUpperCase() as any,
              biometrics: {
                height_ft: a.physical_attributes?.height_cm ? `${Math.floor(a.physical_attributes.height_cm / 30.48)}'${Math.round((a.physical_attributes.height_cm % 30.48) / 2.54)}"` : `6'0"`,
                weight_lbs: a.physical_attributes?.weight_kg ? `${Math.round(a.physical_attributes.weight_kg * 2.20462)} lbs` : `175 lbs`,
                wingspan_ft: a.physical_attributes?.wingspan_cm ? `${Math.floor(a.physical_attributes.wingspan_cm / 30.48)}'${Math.round((a.physical_attributes.wingspan_cm % 30.48) / 2.54)}"` : `6'2"`,
                vertical_jump_in: a.physical_attributes?.vertical_cm ? `${Math.round(a.physical_attributes.vertical_cm / 2.54)}"` : `30"`,
              },
              averages: a.averages || {
                ppg: a.stats?.ppg || 0,
                rpg: a.stats?.rpg || 0,
                apg: a.stats?.apg || 0,
                per_score: a.stats?.per || 25,
                games_played: a.stats?.games_played || 10,
                wins: 8,
                fg_percentage: a.stats?.fg_pct || 45,
                three_pt_percentage: a.stats?.three_pct || 35,
                ft_percentage: a.stats?.ft_pct || 75,
              },
              workload_analytics: a.workload || a.workload_analytics || {
                current_7day_acute_load: 420,
                current_28day_chronic_load: 400,
                target_7day_effort_pts: 500,
                target_intensity: 75,
                calculated_acwr: 1.05,
                routine_score: 85,
                body_stress_pts: 25,
                injury_risk_label: "OPTIMAL",
              },
              radar_competencies: a.radar_competencies || {
                speed: 82,
                power: 78,
                agility: 85,
                iq: 88,
                tech: 80,
              },
              scoring_trends_last_10: a.scoring_trends_last_10 || [18, 22, 25, 20, 28, 24, 30],
              eligibility_documents: {
                psa_verified: !!a.documents?.psa_birth_certificate || true,
                residency_verified: !!a.documents?.proof_of_residency || true,
              },
            }));
            setPerfAthletes(mappedPerf);
            if (mappedPerf[0]) {
              setSelectedPerfAthlete(mappedPerf[0]);
            }
          } else {
            setAthletesPool([]);
            setPerfAthletes([]);
          }
        }
      } catch (err) {
        console.warn("Failed to load coach dashboard live data:", err);
      }
    };

    fetchCoachDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Current Selected Team
  const currentTeam = useMemo(
    () => teams.find((t) => t.team_id === selectedTeamId) || teams[0] || null,
    [teams, selectedTeamId]
  );

  const availableSportCategories = useMemo(() => {
    const focus = (coachProfile.sports_focus || "BASKETBALL").toUpperCase();
    return [focus];
  }, [coachProfile.sports_focus]);

  // Memoized Filtered Players for Dashboard
  const filteredDashboardPlayers = useMemo(() => {
    if (athletesPool.length === 0) return [];
    if (activeSportFilter === "ALL") return athletesPool;
    return athletesPool.filter(
      (p) => p.sport_type?.toUpperCase() === activeSportFilter.toUpperCase()
    );
  }, [athletesPool, activeSportFilter]);

  // Handlers
  const handleUpdateTeamName = useCallback(async (teamId: string, newName: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.team_id === teamId ? { ...t, team_name: newName } : t))
    );

    try {
      await requestAuthenticatedJson(`/teams/${teamId}`, "PATCH", { team_name: newName });
    } catch (err) {
      console.warn("Backend update team name error:", err);
    }
  }, []);

  const handleUpdateTeamDetails = useCallback(
    async (
      teamId: string,
      updates: { team_name?: string; sport_type?: Team["sport_type"]; division?: string }
    ) => {
      setTeams((prev) =>
        prev.map((t) => (t.team_id === teamId ? { ...t, ...updates } : t))
      );

      try {
        await requestAuthenticatedJson(`/teams/${teamId}`, "PATCH", updates);
      } catch (err) {
        console.warn("Backend update team details error:", err);
      }
    },
    []
  );

  const handleUpdateRosterPlayer = useCallback(
    async (teamId: string, athleteId: string, position: string, jerseyNumber: string) => {
      let updatedRoster: RosterAthlete[] = [];
      setTeams((prev) =>
        prev.map((t) => {
          if (t.team_id !== teamId) return t;
          const updated = {
            ...t,
            roster_list: t.roster_list.map((p) =>
              p.athlete_id === athleteId ? { ...p, position, jersey_number: jerseyNumber } : p
            ),
          };
          updatedRoster = updated.roster_list;
          return updated;
        })
      );

      if (updatedRoster.length > 0) {
        try {
          await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
            roster_list: updatedRoster.map((p) => ({
              athlete_id: p.athlete_id,
              position: p.position,
              jersey_number: Number(p.jersey_number) || 0,
            })),
          });
        } catch (err) {
          console.warn("Backend update roster player error:", err);
        }
      }
    },
    []
  );

  const handleUpdateRosterPlayerDetails = useCallback(
    async (
      teamId: string,
      athleteId: string,
      details: { position?: string; jerseyNumber?: string; event_distance?: string; stroke_style?: string }
    ) => {
      let updatedRoster: RosterAthlete[] = [];
      setTeams((prev) =>
        prev.map((t) => {
          if (t.team_id !== teamId) return t;
          const updated = {
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
          updatedRoster = updated.roster_list;
          return updated;
        })
      );

      if (updatedRoster.length > 0) {
        try {
          await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
            roster_list: updatedRoster.map((p) => ({
              athlete_id: p.athlete_id,
              position: p.position,
              jersey_number: Number(p.jersey_number) || 0,
              event_distance: p.event_distance,
              stroke_style: p.stroke_style,
            })),
          });
        } catch (err) {
          console.warn("Backend update roster details error:", err);
        }
      }
    },
    []
  );

  const handleRemovePlayer = useCallback(async (teamId: string, athleteId: string) => {
    let updatedRoster: RosterAthlete[] = [];
    setTeams((prev) =>
      prev.map((t) => {
        if (t.team_id !== teamId) return t;
        const updated = {
          ...t,
          roster_list: t.roster_list.filter((p) => p.athlete_id !== athleteId),
        };
        updatedRoster = updated.roster_list;
        return updated;
      })
    );

    try {
      await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
        roster_list: updatedRoster.map((p) => ({
          athlete_id: p.athlete_id,
          position: p.position,
          jersey_number: Number(p.jersey_number) || 0,
        })),
      });
    } catch (err) {
      console.warn("Backend remove player error:", err);
    }
  }, []);

  const handleAddPlayersToTeam = useCallback(async (teamId: string, newAthletes: RosterAthlete[]) => {
    let updatedRoster: RosterAthlete[] = [];
    setTeams((prev) =>
      prev.map((t) => {
        if (t.team_id !== teamId) return t;
        const updated = {
          ...t,
          roster_list: [...t.roster_list, ...newAthletes],
        };
        updatedRoster = updated.roster_list;
        return updated;
      })
    );

    try {
      await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
        roster_list: updatedRoster.map((p) => ({
          athlete_id: p.athlete_id,
          position: p.position,
          jersey_number: Number(p.jersey_number) || 0,
        })),
      });
    } catch (err) {
      console.warn("Backend add players error:", err);
    }
  }, []);

  const handleCreateTeam = useCallback(
    async (newTeamData: {
      team_name: string;
      sport_type: Team["sport_type"];
      division: string;
      roster_list: RosterAthlete[];
    }) => {
      const created: Team = {
        team_id: `team_${Date.now()}`,
        team_name: newTeamData.team_name,
        sport_type: newTeamData.sport_type,
        division: newTeamData.division || "Elite Professional",
        season_record: { wins: 0, losses: 0 },
        coach_id: coach.coach_id,
        roster_list: newTeamData.roster_list,
        created_at: new Date().toISOString().split("T")[0],
      };
      setTeams((prev) => [created, ...prev]);
      setSelectedTeamId(created.team_id);
      setActiveView("manage_team");

      try {
        await requestAuthenticatedJson("/teams", "POST", {
          team_name: newTeamData.team_name,
          sport_type: newTeamData.sport_type,
          division: newTeamData.division || "Elite Professional",
          roster_list: newTeamData.roster_list.map((p) => ({
            athlete_id: p.athlete_id,
            position: p.position,
            jersey_number: Number(p.jersey_number) || 0,
          })),
        });
      } catch (err) {
        console.warn("Backend team creation sync:", err);
      }
    },
    [coach.coach_id]
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
      (a) => a.full_name.toLowerCase() === player.full_name.toLowerCase()
    ) || perfAthletes[0];
    setSelectedPerfAthlete(matched);
    setPreviousPortfolioView(activeView);
    setActiveView("athlete_portfolio");
  }, [perfAthletes, activeView]);

  const handleDeleteTeam = useCallback((teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.team_id !== teamId));
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
          onSave={(updated) => {
            setCoachProfile(updated);
            setActiveSportFilter(updated.sports_focus);
            setCoach((prev) => ({
              ...prev,
              first_name: updated.first_name,
              last_name: updated.last_name,
              email: updated.email,
            }));
          }}
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
          />

          {/* SCROLLABLE DASHBOARD BODY */}
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: headerTopPadding + 64, paddingBottom: 150 },
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
                {availableSportCategories.map((category) => {
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
                  <View style={{ paddingVertical: 28, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="people-outline" size={36} color="#64748B" />
                    <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "700", marginTop: 8 }}>
                      No Athletes in Roster Yet
                    </Text>
                    <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 20 }}>
                      You don't have any athletes in your roster yet. Use the Teams or Discovery tab to add players.
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
                <Text style={styles.summaryPillValue}>{athletesPool.length}</Text>
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
          onSelectAthlete={(ath) => {
            setSelectedPerfAthlete(ath);
            setPreviousPortfolioView("performance");
            setActiveView("athlete_portfolio");
          }}
          onSettingsPress={() => setActiveView("settings")}
          onProfilePress={() => setShowProfileModal(true)}
        />
      )}

      {activeView === "athlete_portfolio" && (
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

      {activeView === "all_stats" && (
        <AllStats
          athlete={selectedPerfAthlete}
          onClose={() => setActiveView("athlete_portfolio")}
          onUpdateWorkload={(updatedWorkload) => {
            setSelectedPerfAthlete((prev) => ({
              ...prev,
              workload_analytics: updatedWorkload,
            }));
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

      {activeView === "match_history" && (
        <MatchHistory
          sportCategory={selectedPerfAthlete?.sport_category}
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
        <TrackfieldMatchResult onBack={() => setActiveView("match_history")} />
      )}

      {activeView === "perf_swimming_result" && (
        <SwimmingMatchResult onBack={() => setActiveView("match_history")} />
      )}

      {activeView === "perf_basketball_result" && (
        <BasketballMatchResult onBack={() => setActiveView("match_history")} />
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
              {currentTeam ? (
                <>
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
                </>
              ) : (
                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                  <Text style={{ color: "#94A3B8" }}>No team selected.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}



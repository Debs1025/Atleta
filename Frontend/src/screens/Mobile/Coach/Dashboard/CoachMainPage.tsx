import React, { useState, useMemo, useCallback } from "react";
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
  | "discovery";
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
    onViewStats: (name: string) => void;
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
          onPress={() => onViewStats(player.full_name)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewStatsText}>View Stats</Text>
        </TouchableOpacity>
      </View>
    );
  }
);

export function CoachMainPage({ onLogout }: CoachMainPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  // Local State
  const [coach] = useState<UserCoach>(MOCK_COACH);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [athletesPool, setAthletesPool] = useState<RosterAthlete[]>(MOCK_ATHLETES_POOL);

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

  // Current Selected Team
  const currentTeam = useMemo(
    () => teams.find((t) => t.team_id === selectedTeamId) || teams[0],
    [teams, selectedTeamId]
  );

  // Memoized Filtered Players for Dashboard
  const filteredDashboardPlayers = useMemo(() => {
    if (activeSportFilter === "ALL") return athletesPool;
    return athletesPool.filter((p) => p.sport_type === activeSportFilter);
  }, [athletesPool, activeSportFilter]);

  // Handlers
  const handleUpdateTeamName = useCallback((teamId: string, newName: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.team_id === teamId ? { ...t, team_name: newName } : t))
    );
  }, []);

  const handleUpdateTeamDetails = useCallback(
    (
      teamId: string,
      updates: { team_name?: string; sport_type?: Team["sport_type"]; division?: string }
    ) => {
      setTeams((prev) =>
        prev.map((t) => (t.team_id === teamId ? { ...t, ...updates } : t))
      );
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
    setTeams((prev) =>
      prev.map((t) => {
        if (t.team_id !== teamId) return t;
        return {
          ...t,
          roster_list: t.roster_list.filter((p) => p.athlete_id !== athleteId),
        };
      })
    );
  }, []);

  const handleAddPlayersToTeam = useCallback((teamId: string, newAthletes: RosterAthlete[]) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.team_id !== teamId) return t;
        return {
          ...t,
          roster_list: [...t.roster_list, ...newAthletes],
        };
      })
    );
  }, []);

  const handleCreateTeam = useCallback(
    (newTeamData: {
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
      Alert.alert("Performance Analytics", "View real-time team metrics & performance stats.");
    }
  }, []);

  const handleViewStats = useCallback((name: string) => {
    Alert.alert("Player Stats", `Viewing official stats for ${name}`);
  }, []);

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

        {/* SCREEN 1: COACH HOME DASHBOARD */}
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
                  {filteredDashboardPlayers.slice(0, 4).map((player, index) => (
                    <PlayerRowItem
                      key={player.athlete_id}
                      player={player}
                      isLast={index === Math.min(filteredDashboardPlayers.length, 4) - 1}
                      onViewStats={handleViewStats}
                    />
                  ))}
                </View>
              </View>

              {/* TOTAL ATHLETES Card */}
              <View style={styles.summaryTile}>
                <Text style={styles.summaryLabel}>TOTAL ATHLETES</Text>
                <View style={styles.summaryPill}>
                  <Text style={styles.summaryPillValue}>24</Text>
                </View>
              </View>
            </ScrollView>
          </>
        )}

        {/* SCREEN 3: MY TEAMS PAGE */}
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

        {/* SCREEN 4: MANAGE TEAM SCREEN */}
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

        {/* SCREEN 5: VIEW ALL PLAYERS PAGE */}
        {activeView === "view_all_players" && (
          <ViewAllPlayers
            athletesPool={athletesPool}
            teams={teams}
            onBack={() => setActiveView("dashboard")}
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

        {/* FIXED BOTTOM NAVIGATION BAR */}
        {activeView !== "manage_team" &&
          activeView !== "view_all_players" &&
          activeView !== "settings" &&
          activeView !== "edit_profile" &&
          activeView !== "ocr_logging" &&
          activeView !== "ocr_output" &&
          activeView !== "create_log" &&
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

      {/* SCREEN 2: FLOATING ACTION OVERLAY MENU */}
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



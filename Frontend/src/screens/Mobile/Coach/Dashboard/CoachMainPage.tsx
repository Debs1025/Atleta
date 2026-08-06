import React, { useState, useMemo, useCallback } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
// Font Platform Constants
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

type ViewState = "dashboard" | "teams_list" | "manage_team" | "view_all_players";
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
  const headerTopPadding = Math.max(insets.top, 44) + 20;

  // Local State
  const [coach] = useState<UserCoach>(MOCK_COACH);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [athletesPool] = useState<RosterAthlete[]>(MOCK_ATHLETES_POOL);

  // Navigation States
  const [activeTab, setActiveTab] = useState<NavigationTab>("Home");
  const [activeView, setActiveView] = useState<ViewState>("dashboard");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("team_01");

  // Filters & Modals
  const [activeSportFilter, setActiveSportFilter] = useState<string>("ALL");
  const [showFabOverlay, setShowFabOverlay] = useState(false);
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);

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
      setShowTeamDetailsModal(true);
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* SCREEN 1: COACH HOME DASHBOARD */}
      {activeView === "dashboard" && (
        <View style={{ flex: 1 }}>
          {/* FIXED HEADER BAR */}
          <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
            <View style={styles.header}>
              <Text style={styles.brandTitle}>ATLETA</Text>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.iconCircleButton} activeOpacity={0.8}>
                  <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.profileCircleButton} onPress={onLogout} activeOpacity={0.8}>
                  <Ionicons name="person" size={18} color="#070D19" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.headerDivider} />
          </View>

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
        </View>
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

      {/* FLOATING ACTION BUTTON (FAB) - Only shown on Coach Home Dashboard Main Page */}
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
      {activeView !== "manage_team" && activeView !== "view_all_players" && (
        <View style={styles.navContainer}>
          <View style={styles.tabsRow}>
            {[
              { key: "Home", label: "Home", icon: "home-outline" },
              { key: "Teams", label: "Teams", icon: "people-outline" },
              { key: "Discovery", label: "Discovery", icon: "search-outline" },
              { key: "Performance", label: "Performance", icon: "bar-chart-outline" },
            ].map((t) => {
              const isActive = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={styles.tabButton}
                  onPress={() => handleSelectTab(t.key as NavigationTab)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon as any} size={20} color={isActive ? "#FFFFFF" : "#64748B"} />
                  <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : styles.tabLabelInactive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

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
                  Alert.alert("Upload Stats", "Upload game stats sheet or CSV for evaluation.");
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
                  Alert.alert("Scoresheet Request", "Request official digital scoresheet verification.");
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
                  setActiveView("teams_list");
                  setActiveTab("Teams");
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070D19",
  },
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#070D19",
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: fontBoldPlatform,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0E1626",
    borderWidth: 1,
    borderColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  profileCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerDivider: {
    height: 1,
    backgroundColor: "#1E293B",
    marginBottom: 0,
  },
  greetingSection: {
    marginTop: 0,
    marginBottom: 24,
  },
  greetingTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    fontFamily: fontBoldPlatform,
    marginBottom: 6,
  },
  greetingSubtitle: {
    color: "#8E9BAE",
    fontSize: 15.5,
    lineHeight: 22,
    fontFamily: fontPlatform,
  },
  filterContainer: {
    marginBottom: 26,
  },
  filterLabel: {
    color: "#5C6B82",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    marginBottom: 12,
  },
  pillsScroll: {
    gap: 10,
  },
  pillButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  pillInactive: {
    backgroundColor: "#070D19",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  pillActive: {
    backgroundColor: "#00C8FF",
  },
  pillText: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    fontFamily: fontBoldPlatform,
  },
  pillTextInactive: {
    color: "#FFFFFF",
  },
  pillTextActive: {
    color: "#070D19",
  },
  playersSection: {
    marginBottom: 26,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  sectionTitle: {
    color: "#5C6B82",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
  },
  viewAllText: {
    color: "#00C8FF",
    fontSize: 14.5,
    fontWeight: "700",
    textDecorationLine: "underline",
    fontFamily: fontPlatform,
  },
  playersList: {
    backgroundColor: "transparent",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  playerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  playerTextContainer: {
    flex: 1,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
    marginBottom: 3,
  },
  playerSubtitle: {
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    fontFamily: fontPlatform,
  },
  viewStatsButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewStatsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  summaryTile: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 18,
    marginTop: 8,
  },
  summaryLabel: {
    color: "#5C6B82",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    marginBottom: 10,
  },
  summaryPill: {
    backgroundColor: "#1E293B",
    borderRadius: 8,
    width: 80,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryPillValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
  },
  floatingFabButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 50,
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  navContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: "#070D19",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 0,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    fontFamily: fontPlatform,
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  tabLabelInactive: {
    color: "#64748B",
  },
  fabBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 10, 24, 0.82)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  fabMenuCard: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    width: 220,
    marginBottom: 16,
    paddingVertical: 4,
  },
  fabActionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  fabActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: fontPlatform,
  },
  fabDivider: {
    height: 1,
    backgroundColor: "#1E293B",
    marginHorizontal: 12,
  },
  closeFabButton: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#111C35",
    borderWidth: 1,
    borderColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 10, 24, 0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0F172A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
  },
  teamBannerCard: {
    backgroundColor: "#070D19",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 20,
    marginBottom: 16,
  },
  sportBadge: {
    backgroundColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  sportBadgeText: {
    color: "#00C8FF",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  teamNameTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
    marginBottom: 4,
  },
  divisionText: {
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: fontPlatform,
    marginBottom: 16,
  },
  recordBox: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recordLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: fontPlatform,
  },
  recordValue: {
    color: "#00C8FF",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  manageCtaButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  manageCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
  },
});

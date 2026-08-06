import React, { useState, useMemo } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Team, RosterAthlete } from "../DataTypes";

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

interface MyTeamsPageProps {
  teams: Team[];
  athletesPool: RosterAthlete[];
  onSelectTeam: (team: Team) => void;
  onCreateTeam: (newTeamData: {
    team_name: string;
    sport_type: Team["sport_type"];
    division: string;
    roster_list: RosterAthlete[];
  }) => void;
  onLogout?: () => void;
}

export function MyTeamsPage({
  teams,
  athletesPool,
  onSelectTeam,
  onCreateTeam,
  onLogout,
}: MyTeamsPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 20;

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateWizard, setShowCreateWizard] = useState(false);

  // Search filtering
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase().trim();
    return teams.filter(
      (t) => t.team_name.toLowerCase().includes(q) || t.sport_type.toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  return (
    <View style={styles.container}>
      {/* TOP HEADER */}
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

      {/* SCROLLABLE PAGE BODY */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 64, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Block */}
        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>My Teams</Text>
          <Text style={styles.pageSubtitle}>Manage your teams and rosters</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teams..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Managed Teams List Cards */}
        <View style={{ gap: 16 }}>
          {filteredTeams.map((team) => (
            <TouchableOpacity
              key={team.team_id}
              style={styles.teamCard}
              onPress={() => onSelectTeam(team)}
              activeOpacity={0.8}
            >
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>{team.sport_type}</Text>
              </View>

              <View style={styles.cardBodyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.teamName}>{team.team_name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="calendar-outline" size={16} color="#64748B" />
                    <Text style={styles.playerCountText}>
                      {team.roster_list.length > 0 ? `${team.roster_list.length} Players` : "24 Players"}
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* CREATE NEW TEAM + BUTTON (Inline at bottom of teams list, not fixed) */}
        <TouchableOpacity
          style={styles.createTeamCtaButton}
          onPress={() => setShowCreateWizard(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.createTeamCtaText}>CREATE NEW TEAM +</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Multi-step Create Team Wizard Modal */}
      <Modal
        visible={showCreateWizard}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateWizard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE NEW TEAM</Text>
              <TouchableOpacity onPress={() => setShowCreateWizard(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <CreateTeamWizard
              athletesPool={athletesPool}
              onClose={() => setShowCreateWizard(false)}
              onSubmit={(teamData) => {
                onCreateTeam(teamData);
                setShowCreateWizard(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CreateTeamWizard({
  athletesPool,
  onClose,
  onSubmit,
}: {
  athletesPool: RosterAthlete[];
  onClose: () => void;
  onSubmit: (data: {
    team_name: string;
    sport_type: Team["sport_type"];
    division: string;
    roster_list: RosterAthlete[];
  }) => void;
}) {
  const [teamName, setTeamName] = useState("");
  const [division, setDivision] = useState("Elite Professional");
  const [sport, setSport] = useState<Team["sport_type"]>("BASKETBALL");
  const [selectedAthletes, setSelectedAthletes] = useState<RosterAthlete[]>([]);

  const handleFinalize = () => {
    if (!teamName.trim()) return;
    onSubmit({
      team_name: teamName.trim(),
      sport_type: sport,
      division: division.trim(),
      roster_list: selectedAthletes,
    });
  };

  return (
    <ScrollView style={{ gap: 12 }}>
      <Text style={styles.inputLabel}>TEAM NAME *</Text>
      <TextInput
        style={styles.wizardInput}
        placeholder="e.g. Camarines Sur Panthers"
        placeholderTextColor="#64748B"
        value={teamName}
        onChangeText={setTeamName}
      />

      <Text style={styles.inputLabel}>DIVISION</Text>
      <TextInput
        style={styles.wizardInput}
        placeholder="e.g. Elite Professional"
        placeholderTextColor="#64748B"
        value={division}
        onChangeText={setDivision}
      />

      <Text style={styles.inputLabel}>SPORT CATEGORY</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginVertical: 6 }}>
        {(["BASKETBALL", "TRACK AND FIELD", "SWIMMING"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSport(s)}
            style={[styles.sportPill, sport === s && styles.sportPillActive]}
          >
            <Text style={[styles.sportPillText, sport === s && styles.sportPillTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.nextButton, !teamName.trim() && styles.nextButtonDisabled]}
        disabled={!teamName.trim()}
        onPress={handleFinalize}
        activeOpacity={0.8}
      >
        <Text style={styles.nextButtonText}>FINALIZE & CREATE TEAM</Text>
      </TouchableOpacity>
    </ScrollView>
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
  titleBlock: {
    marginBottom: 20,
  },
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  pageSubtitle: {
    color: "#94A3B8",
    fontSize: 14,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  teamCard: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 18,
  },
  sportBadge: {
    backgroundColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  sportBadgeText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardBodyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  playerCountText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  createTeamCtaButton: {
    backgroundColor: "#1D4ED8",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  createTeamCtaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
    textShadowColor: "rgba(255, 255, 255, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
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
  },
  inputLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
  wizardInput: {
    backgroundColor: "#070D19",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    color: "#FFFFFF",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sportPill: {
    backgroundColor: "#070D19",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sportPillActive: {
    borderColor: "#00C8FF",
    backgroundColor: "#111C35",
  },
  sportPillText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  sportPillTextActive: {
    color: "#00C8FF",
  },
  nextButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  nextButtonDisabled: {
    backgroundColor: "#1E293B",
    opacity: 0.6,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});

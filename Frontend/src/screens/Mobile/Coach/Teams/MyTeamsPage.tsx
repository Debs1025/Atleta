import React, { useState, useMemo } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "./styles/MyTeamsPage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Team, RosterAthlete, TeamDetailsState } from "../DataTypes";
import { CreateTeam } from "./CreateTeam";
import { AddAthlete } from "./AddAthlete";
import { SetPlayer } from "./SetPlayer";
import { FullDetails } from "./FullDetails";
import { AtletaHeader } from "../Components/AtletaHeader";

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
    established_year?: string;
    roster_list: RosterAthlete[];
  }) => void;
  onLogout?: () => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
}

export function MyTeamsPage({
  teams,
  athletesPool,
  onSelectTeam,
  onCreateTeam,
  onLogout,
  onSettingsPress,
  onProfilePress,
  onNotificationPress,
}: MyTeamsPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateTeam, setShowCreateTeam] = useState(false);

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
      <AtletaHeader
        onSettingsPress={onSettingsPress}
        onProfilePress={onProfilePress || onLogout}
        onNotificationPress={onNotificationPress}
      />

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
                      {`${team.roster_list.length} ${team.roster_list.length === 1 ? "Player" : "Players"}`}
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* CREATE NEW TEAM + BUTTON */}
        <TouchableOpacity
          style={styles.createTeamCtaButton}
          onPress={() => setShowCreateTeam(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.createTeamCtaText}>CREATE NEW TEAM +</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Multi-step Create Team Modal Flow */}
      <Modal
        visible={showCreateTeam}
        animationType="slide"
        onRequestClose={() => setShowCreateTeam(false)}
      >
        <CreateTeamDetailsFlow
          athletesPool={athletesPool}
          onClose={() => setShowCreateTeam(false)}
          onSubmit={(teamData) => {
            onCreateTeam(teamData);
            setShowCreateTeam(false);
          }}
        />
      </Modal>
    </View>
  );
}

function CreateTeamDetailsFlow({
  onClose,
  onSubmit,
  athletesPool,
}: {
  onClose: () => void;
  onSubmit: (data: {
    team_name: string;
    sport_type: Team["sport_type"];
    division: string;
    established_year?: string;
    roster_list: RosterAthlete[];
  }) => void;
  athletesPool?: RosterAthlete[];
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [teamDetails, setTeamDetails] = useState<TeamDetailsState>({
    team_name: "",
    sport_type: "BASKETBALL",
    division: "",
    selected_roster: [],
  });

  const updateState = (updated: Partial<TeamDetailsState>) => {
    setTeamDetails((prev) => ({ ...prev, ...updated }));
  };

  // Map selected_roster to RosterAthlete for backend compatibility
  const handleFinalize = () => {
    const rosterList: RosterAthlete[] = teamDetails.selected_roster.map((a) => ({
      athlete_id: a.athlete_id,
      user_id: `usr_${a.athlete_id}`,
      full_name: a.full_name,
      position: a.primary_position,
      jersey_number: a.jersey_number || "00",
      sport_type: teamDetails.sport_type || "BASKETBALL",
      is_eligibility_verified: a.is_verified,
    }));

    onSubmit({
      team_name: teamDetails.team_name,
      sport_type: (teamDetails.sport_type || "BASKETBALL") as Team["sport_type"],
      division: teamDetails.division || "",
      established_year: teamDetails.established_year || String(new Date().getFullYear()),
      roster_list: rosterList,
    });
  };

  if (step === 1) {
    return (
      <CreateTeam
        teamDetails={teamDetails}
        onChangeState={updateState}
        onNext={() => setStep(2)}
        onBack={onClose}
      />
    );
  }

  if (step === 2) {
    return (
      <AddAthlete
        teamDetails={teamDetails}
        onChangeState={updateState}
        onNext={() => setStep(3)}
        onBack={() => setStep(1)}
        athletesPool={athletesPool}
      />
    );
  }

  if (step === 3) {
    return (
      <SetPlayer
        teamDetails={teamDetails}
        onChangeState={updateState}
        onAddMore={() => setStep(2)}
        onNext={() => setStep(4)}
        onBack={() => setStep(2)}
      />
    );
  }

  return (
    <FullDetails
      teamDetails={teamDetails}
      onFinalizeTeam={handleFinalize}
      onEditTeamName={() => setStep(1)}
      onBack={() => setStep(3)}
    />
  );
}



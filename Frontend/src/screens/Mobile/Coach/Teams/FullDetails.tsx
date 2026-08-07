import React from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MOCK_COACH, TeamWizardState } from "../DataTypes";
import styles from "./styles/FullDetails";

export interface FullDetailsProps {
  wizardState: TeamWizardState;
  onFinalizeTeam: () => void;
  onEditTeamName?: () => void;
  onBack: () => void;
}

export function FullDetails({
  wizardState,
  onFinalizeTeam,
  onEditTeamName,
  onBack,
}: FullDetailsProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 12;

  const coachName = `${MOCK_COACH.first_name} ${MOCK_COACH.last_name}`;

  /*
   * FINALIZE CREATING TEAM (CLIENT REACTIVE STATE)
   * ---------------------------------------------
   * Triggered when coach clicks the bottom "CREATE TEAM" button.
   *
   * TODO: BACKEND INTEGRATION INSTRUCTIONS
   * Replace this local execution with your POST API request when backend is deployed:
   *
   * const response = await fetch('/api/teams/create', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     team_name: wizardState.team_name,
   *     sport_type: wizardState.sport_type,
   *     division: wizardState.division,
   *     roster_list: wizardState.selected_roster,
   *     coach_id: MOCK_COACH.coach_id,
   *   })
   * });
   * const newTeam = await response.json();
   */
  const handleCreateTeamPress = () => {
    Alert.alert(
      "Team Initialized!",
      `Successfully created ${wizardState.team_name} with ${wizardState.selected_roster.length} roster athletes.`,
      [
        {
          text: "OK",
          onPress: () => onFinalizeTeam(),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* FIXED TOP HEADER */}
      <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>TEAM FULL DETAILS</Text>
        </View>
      </View>

      {/* SCROLLABLE BODY */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* TEAM NAME HEADER BLOCK */}
        <View style={styles.teamHeaderBlock}>
          <View style={styles.teamNameRow}>
            <Text style={styles.teamNameTitle}>
              {wizardState.team_name.toUpperCase() || "CAMARINES SUR PANTHERS"}
            </Text>
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={onEditTeamName || onBack}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={18} color="#00C8FF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.clubSubTitleText}>
            {wizardState.sport_type ? `${wizardState.sport_type} CLUB` : "BASKETBALL CLUB"}
          </Text>
        </View>

        {/* SECTION 1: TEAM COACH */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Team Coach (You)</Text>
        </View>

        <View style={styles.coachCard}>
          <Text style={styles.cardRoleLabelLeft}>Coach</Text>
          <View style={styles.coachMainInfo}>
            <Text style={styles.coachNameText}>{coachName}</Text>
            <Text style={styles.coachTitleSub}>Head Coach</Text>
            <View style={styles.coachTagPill}>
              <Text style={styles.coachTagText}>
                {wizardState.sport_type
                  ? `${wizardState.sport_type} COACH`
                  : "BASKETBALL COACH"}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: TEAM ROSTER */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Team Roster</Text>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              TOTAL: {wizardState.selected_roster.length}
            </Text>
          </View>
        </View>

        {/* ROSTER CARDS LIST */}
        {wizardState.selected_roster.map((athlete, idx) => (
          <View key={`${athlete.athlete_id}_${idx}`} style={styles.rosterCard}>
            <Text style={styles.playerRoleLabelLeft}>Player</Text>
            <View style={styles.playerMainInfo}>
              <Text style={styles.playerNameText}>{athlete.full_name}</Text>
              <Text style={styles.playerPosMetaText}>
                #{athlete.jersey_number || "00"} •{" "}
                {(athlete.primary_position || "POSITION").toUpperCase()}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FIXED BOTTOM ACTION BUTTON */}
      <View style={styles.fixedBottomContainer}>
        <TouchableOpacity
          style={styles.primaryCtaButton}
          onPress={handleCreateTeamPress}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryCtaText}>CREATE TEAM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default FullDetails;

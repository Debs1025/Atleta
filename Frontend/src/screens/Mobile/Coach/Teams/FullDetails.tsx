import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MOCK_COACH, TeamDetailsState } from "../DataTypes";
import styles from "./styles/FullDetails";

export interface FullDetailsProps {
  teamDetails: TeamDetailsState;
  onFinalizeTeam: () => void;
  onEditTeamName?: () => void;
  onBack: () => void;
}

export function FullDetails({
  teamDetails,
  onFinalizeTeam,
  onEditTeamName,
  onBack,
}: FullDetailsProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 12);

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleCreateTeamPress = () => {
    setShowSuccessModal(true);
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 70 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* TEAM NAME HEADER BLOCK */}
        <View style={styles.teamHeaderBlock}>
          <View style={styles.teamNameRow}>
            <Text style={styles.teamNameTitle}>
              {(teamDetails.team_name || "MY TEAM").toUpperCase()}
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
            {teamDetails.sport_type ? `${teamDetails.sport_type} CLUB` : "BASKETBALL CLUB"}
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
                {teamDetails.sport_type
                  ? `${teamDetails.sport_type} COACH`
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
              TOTAL: {teamDetails.selected_roster.length}
            </Text>
          </View>
        </View>

        {/* ROSTER CARDS LIST */}
        {teamDetails.selected_roster.map((athlete, idx) => {
          let posMeta = "";
          if (teamDetails.sport_type === "SWIMMING") {
            const parts = [];
            if (athlete.event_distance) parts.push(athlete.event_distance);
            if (athlete.stroke_style || (athlete.primary_position && athlete.primary_position !== "Point Guard")) {
              parts.push((athlete.stroke_style || athlete.primary_position).toUpperCase());
            }
            posMeta = parts.join(" • ") || "SWIMMER";
          } else if (teamDetails.sport_type === "TRACK AND FIELD") {
            const parts = [];
            if (athlete.event_distance || (athlete.primary_position && athlete.primary_position !== "Point Guard")) {
              parts.push((athlete.event_distance || athlete.primary_position).toUpperCase());
            }
            if (athlete.jersey_number) {
              parts.push(`#${athlete.jersey_number}`);
            }
            posMeta = parts.join(" • ") || "SPRINTER";
          } else {
            const parts = [];
            if (athlete.jersey_number) parts.push(`#${athlete.jersey_number}`);
            if (athlete.primary_position) parts.push(athlete.primary_position.toUpperCase());
            posMeta = parts.join(" • ") || "PLAYER";
          }

          return (
            <View key={`${athlete.athlete_id}_${idx}`} style={styles.rosterCard}>
              <Text style={styles.playerRoleLabelLeft}>Player</Text>
              <View style={styles.playerMainInfo}>
                <Text style={styles.playerNameText}>{athlete.full_name}</Text>
                <Text style={styles.playerPosMetaText}>{posMeta}</Text>
              </View>
            </View>
          );
        })}
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

      {/* TEAM CREATED SUCCESS CONFIRMATION MODAL */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <TouchableOpacity
          style={styles.confirmOverlayBackdrop}
          activeOpacity={1}
          onPress={() => {
            setShowSuccessModal(false);
            onFinalizeTeam();
          }}
        >
          <View style={styles.confirmDialogCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle-sharp" size={46} color="#00C8FF" />
            </View>

            <Text style={styles.successTitle}>TEAM INITIALIZED !</Text>
            <Text style={styles.successTeamName}>
              {teamDetails.team_name.toUpperCase() || "CAMARINES SUR PANTHERS"}
            </Text>
            <Text style={styles.successMessage}>
              Your team parameters and athlete roster have been successfully created.
            </Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SPORT CATEGORY</Text>
                <View style={styles.summaryBadgePill}>
                  <Text style={styles.summaryBadgeText}>
                    {teamDetails.sport_type || "BASKETBALL"}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>ROSTER SIZE</Text>
                <Text style={styles.summaryValueText}>
                  {teamDetails.selected_roster.length} Active Athletes
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>DIVISION</Text>
                <Text style={styles.summaryValueText}>
                  {teamDetails.division || "Elite Professional"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.finishCtaButton}
              onPress={() => {
                setShowSuccessModal(false);
                onFinalizeTeam();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.finishCtaText}>GO TO MY TEAMS</Text>
              <Ionicons name="arrow-forward" size={18} color="#070D19" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default FullDetails;

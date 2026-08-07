import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AthleteItem, TeamWizardState } from "../DataTypes";
import styles from "./styles/SetPlayer";

export interface SetPlayerProps {
  wizardState: TeamWizardState;
  onChangeState: (updated: Partial<TeamWizardState>) => void;
  onAddMore: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function SetPlayer({
  wizardState,
  onChangeState,
  onAddMore,
  onNext,
  onBack,
}: SetPlayerProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 12;

  // Track expanded accordion item ID (default expand first item if available)
  const [expandedId, setExpandedId] = useState<string | null>(
    wizardState.selected_roster.length > 0
      ? wizardState.selected_roster[0].athlete_id
      : null
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Update athlete position or jersey number
  const handleUpdateAthlete = (
    athleteId: string,
    field: "primary_position" | "jersey_number",
    value: string
  ) => {
    const updated = wizardState.selected_roster.map((item) => {
      if (item.athlete_id === athleteId) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onChangeState({ selected_roster: updated });
  };

  // Remove player from roster
  const handleRemoveAthlete = (athleteId: string) => {
    const updated = wizardState.selected_roster.filter(
      (item) => item.athlete_id !== athleteId
    );
    onChangeState({ selected_roster: updated });
    if (expandedId === athleteId) {
      setExpandedId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* FIXED TOP HEADER */}
      <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SET PLAYER POSITIONS</Text>
        </View>
      </View>

      {/* SCROLLABLE BODY */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* SQUAD MANAGEMENT HEADER BLOCK */}
        <Text style={styles.squadManagementLabel}>SQUAD MANAGEMENT</Text>
        <View style={styles.titleBadgeRow}>
          <Text style={styles.sectionTitle}>Team Roster</Text>
          <View style={styles.totalCountBadge}>
            <Text style={styles.totalCountText}>
              TOTAL: {wizardState.selected_roster.length}
            </Text>
          </View>
        </View>

        {/* ACCORDION ROSTER LIST */}
        {wizardState.selected_roster.map((athlete) => {
          const isExpanded = expandedId === athlete.athlete_id;

          return (
            <View
              key={athlete.athlete_id}
              style={[
                styles.accordionCard,
                isExpanded && styles.accordionCardExpanded,
              ]}
            >
              {/* COLLAPSED ACCORDION HEADER */}
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleExpand(athlete.athlete_id)}
                activeOpacity={0.8}
              >
                <View style={styles.playerInfoLeft}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={22} color="#64748B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName}>{athlete.full_name}</Text>
                    {athlete.status_tag ? (
                      <View style={styles.statusTagPill}>
                        <Text style={styles.statusTagText}>{athlete.status_tag}</Text>
                      </View>
                    ) : (
                      <Text style={styles.playerSubMeta}>
                        #{athlete.jersey_number || "00"} •{" "}
                        {athlete.primary_position || "Position"}
                      </Text>
                    )}
                  </View>
                </View>

                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#94A3B8"
                />
              </TouchableOpacity>

              {/* EXPANDED CONTENT FORM */}
              {isExpanded && (
                <View style={styles.expandedFormContent}>
                  <View style={styles.formRow}>
                    <View style={styles.fieldCol}>
                      <Text style={styles.inputLabel}>POSITION</Text>
                      <TextInput
                        style={styles.textInput}
                        value={athlete.primary_position}
                        onChangeText={(val) =>
                          handleUpdateAthlete(
                            athlete.athlete_id,
                            "primary_position",
                            val
                          )
                        }
                        placeholder="Defensive End"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View style={styles.fieldCol}>
                      <Text style={styles.inputLabel}>JERSEY NUMBER</Text>
                      <TextInput
                        style={styles.textInput}
                        value={athlete.jersey_number || ""}
                        onChangeText={(val) =>
                          handleUpdateAthlete(
                            athlete.athlete_id,
                            "jersey_number",
                            val
                          )
                        }
                        placeholder="95"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.removePlayerButton}
                    onPress={() => handleRemoveAthlete(athlete.athlete_id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.removePlayerText}>
                      REMOVE PLAYER FROM ROSTER
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* ADD MORE PLAYERS BUTTON */}
        <TouchableOpacity
          style={styles.addMoreButton}
          onPress={onAddMore}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
          <Text style={styles.addMoreText}>ADD MORE PLAYERS</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* FIXED BOTTOM ACTION BUTTON */}
      <View style={styles.fixedBottomContainer}>
        <TouchableOpacity
          style={[
            styles.primaryCtaButton,
            wizardState.selected_roster.length === 0 && styles.primaryCtaDisabled,
          ]}
          disabled={wizardState.selected_roster.length === 0}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryCtaText}>SEE FULL DETAILS</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default SetPlayer;

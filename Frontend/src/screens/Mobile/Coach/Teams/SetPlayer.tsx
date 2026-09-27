import React, { useState, useMemo } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AthleteItem, TeamDetailsState } from "../DataTypes";
import styles from "./styles/SetPlayer";

export interface SetPlayerProps {
  teamDetails: TeamDetailsState;
  onChangeState: (updated: Partial<TeamDetailsState>) => void;
  onAddMore: () => void;
  onNext: () => void;
  onBack: () => void;
}

export function SetPlayer({
  teamDetails,
  onChangeState,
  onAddMore,
  onNext,
  onBack,
}: SetPlayerProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 12);

  // Track expanded accordion item ID (default expand first item if available)
  const [expandedId, setExpandedId] = useState<string | null>(
    teamDetails.selected_roster.length > 0
      ? teamDetails.selected_roster[0].athlete_id
      : null
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const SWIMMING_STROKES = ["Freestyle", "Butterfly", "Backstroke", "Breaststroke", "Individual Medley"];

  // Update athlete details
  const handleUpdateAthleteDetails = (
    athleteId: string,
    updates: Partial<AthleteItem>
  ) => {
    const updated = teamDetails.selected_roster.map((item) => {
      if (item.athlete_id === athleteId) {
        return { ...item, ...updates };
      }
      return item;
    });
    onChangeState({ selected_roster: updated });
  };

  // Update athlete position or jersey number
  const handleUpdateAthlete = (
    athleteId: string,
    field: "primary_position" | "jersey_number",
    value: string
  ) => {
    handleUpdateAthleteDetails(athleteId, { [field]: value });
  };

  // Remove player from roster
  const handleRemoveAthlete = (athleteId: string) => {
    const updated = teamDetails.selected_roster.filter(
      (item) => item.athlete_id !== athleteId
    );
    onChangeState({ selected_roster: updated });
    if (expandedId === athleteId) {
      setExpandedId(null);
    }
  };

  // Confirmation overlay modal state to avoid misclicks
  const [playerToRemove, setPlayerToRemove] = useState<AthleteItem | null>(null);
  // Swimming stroke type picker state
  const [strokePickerAthlete, setStrokePickerAthlete] = useState<AthleteItem | null>(null);
  // Basketball position picker state
  const [posPickerAthlete, setPosPickerAthlete] = useState<AthleteItem | null>(null);

  // Validation check: all players in roster must have both required inputs filled
  const isRosterValid = useMemo(() => {
    if (teamDetails.selected_roster.length === 0) return false;

    return teamDetails.selected_roster.every((athlete) => {
      if (teamDetails.sport_type === "TRACK AND FIELD") {
        const hasDistance = Boolean(
          athlete.event_distance &&
            athlete.event_distance.replace(/[^0-9]/g, "").trim().length > 0
        );
        const hasJersey = Boolean(
          athlete.jersey_number && athlete.jersey_number.trim().length > 0
        );
        return hasDistance && hasJersey;
      } else if (teamDetails.sport_type === "SWIMMING") {
        const hasDistance = Boolean(
          athlete.event_distance &&
            athlete.event_distance.replace(/[^0-9]/g, "").trim().length > 0
        );
        const hasStroke = Boolean(
          athlete.stroke_style && athlete.stroke_style.trim().length > 0
        );
        return hasDistance && hasStroke;
      } else {
        const hasPos = Boolean(
          athlete.primary_position && athlete.primary_position.trim().length > 0
        );
        const hasJersey = Boolean(
          athlete.jersey_number && athlete.jersey_number.trim().length > 0
        );
        return hasPos && hasJersey;
      }
    });
  }, [teamDetails.selected_roster, teamDetails.sport_type]);

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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 70 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* SQUAD MANAGEMENT HEADER BLOCK */}
        <Text style={styles.squadManagementLabel}>TEAM MANAGEMENT</Text>
        <View style={styles.titleBadgeRow}>
          <Text style={styles.sectionTitle}>Team Roster</Text>
          <View style={styles.totalCountBadge}>
            <Text style={styles.totalCountText}>
              TOTAL: {teamDetails.selected_roster.length}
            </Text>
          </View>
        </View>

        {/* ACCORDION ROSTER LIST */}
        {teamDetails.selected_roster.map((athlete) => {
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
                        {teamDetails.sport_type === "SWIMMING"
                          ? `${athlete.event_distance || ""} ${athlete.stroke_style ? `• ${athlete.stroke_style}` : ""}`.trim() || "Unset"
                          : teamDetails.sport_type === "TRACK AND FIELD"
                          ? `${athlete.event_distance || ""} ${athlete.jersey_number ? `• #${athlete.jersey_number}` : ""}`.trim() || "Unset"
                          : `${athlete.jersey_number ? `#${athlete.jersey_number} • ` : ""}${athlete.primary_position || ""}`.trim() || "Unset"}
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
                    {teamDetails.sport_type === "TRACK AND FIELD" ? (
                      <>
                        <View style={styles.fieldCol}>
                          <Text style={styles.inputLabel}>DISTANCE *</Text>
                          <View style={styles.distanceContainer}>
                            <TextInput
                              style={styles.distanceInput}
                              value={(athlete.event_distance || "").replace(/[^0-9]/g, "")}
                              onChangeText={(val) => {
                                const digits = val.replace(/[^0-9]/g, "");
                                const formatted = digits ? `${digits}m` : "";
                                handleUpdateAthleteDetails(athlete.athlete_id, {
                                  event_distance: formatted,
                                  primary_position: formatted,
                                });
                              }}
                              placeholder=""
                              placeholderTextColor="#94A3B8"
                              keyboardType="number-pad"
                              maxLength={4}
                            />
                            <Text style={styles.meterBadgeText}>m</Text>
                          </View>
                        </View>

                        <View style={styles.fieldCol}>
                          <Text style={styles.inputLabel}>JERSEY NUMBER *</Text>
                          <TextInput
                            style={styles.textInput}
                            value={athlete.jersey_number || ""}
                            onChangeText={(val) =>
                              handleUpdateAthleteDetails(athlete.athlete_id, {
                                jersey_number: val,
                              })
                            }
                            placeholder=""
                            placeholderTextColor="#94A3B8"
                            keyboardType="number-pad"
                          />
                        </View>
                      </>
                    ) : teamDetails.sport_type === "SWIMMING" ? (
                      <>
                        <View style={styles.fieldCol}>
                          <Text style={styles.inputLabel}>DISTANCE *</Text>
                          <View style={styles.distanceContainer}>
                            <TextInput
                              style={styles.distanceInput}
                              value={(athlete.event_distance || "").replace(/[^0-9]/g, "")}
                              onChangeText={(val) => {
                                const digits = val.replace(/[^0-9]/g, "");
                                const formatted = digits ? `${digits}m` : "";
                                handleUpdateAthleteDetails(athlete.athlete_id, {
                                  event_distance: formatted,
                                });
                              }}
                              placeholder=""
                              placeholderTextColor="#94A3B8"
                              keyboardType="number-pad"
                              maxLength={4}
                            />
                            <Text style={styles.meterBadgeText}>m</Text>
                          </View>
                        </View>

                        <View style={styles.fieldCol}>
                          <Text style={styles.inputLabel}>TYPE OF SWIMMING *</Text>
                          <TouchableOpacity
                            style={styles.typePickerButton}
                            onPress={() => setStrokePickerAthlete(athlete)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.typePickerText,
                                !athlete.stroke_style && { color: "#64748B" },
                              ]}
                              numberOfLines={1}
                            >
                              {athlete.stroke_style || "Select Type"}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#64748B" />
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.fieldCol}>
                          <Text style={styles.inputLabel}>POSITION *</Text>
                          <TouchableOpacity
                            style={styles.typePickerButton}
                            onPress={() => setPosPickerAthlete(athlete)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.typePickerText,
                                !athlete.primary_position && { color: "#64748B" },
                              ]}
                              numberOfLines={1}
                            >
                              {athlete.primary_position || "Select Position"}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#64748B" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.fieldCol}>
                          <Text style={styles.inputLabel}>JERSEY NUMBER *</Text>
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
                            placeholder=""
                            placeholderTextColor="#94A3B8"
                            keyboardType="number-pad"
                          />
                        </View>
                      </>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.removePlayerButton}
                    onPress={() => setPlayerToRemove(athlete)}
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
            !isRosterValid && styles.primaryCtaDisabled,
          ]}
          disabled={!isRosterValid}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryCtaText}>SEE FULL DETAILS</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" opacity={isRosterValid ? 1 : 0.5} />
        </TouchableOpacity>
      </View>

      {/* CONFIRMATION OVERLAY FOR REMOVING PLAYER */}
      <Modal
        visible={playerToRemove !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPlayerToRemove(null)}
      >
        <TouchableOpacity
          style={styles.confirmOverlayBackdrop}
          activeOpacity={1}
          onPress={() => setPlayerToRemove(null)}
        >
          <View style={styles.confirmDialogCard}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </View>

            <Text style={styles.confirmTitle}>Remove Player from Team?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to remove{" "}
              <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                {playerToRemove?.full_name} (#{playerToRemove?.jersey_number || "00"})
              </Text>{" "}
              from <Text style={{ color: "#00C8FF", fontWeight: "800" }}>{teamDetails.team_name || "the roster"}</Text>?
            </Text>

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={styles.cancelConfirmButton}
                onPress={() => setPlayerToRemove(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelConfirmText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeConfirmButton}
                onPress={() => {
                  if (playerToRemove) {
                    handleRemoveAthlete(playerToRemove.athlete_id);
                    setPlayerToRemove(null);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.removeConfirmText}>YES, REMOVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* SWIMMING STROKE TYPE PICKER MODAL */}
      <Modal
        visible={strokePickerAthlete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setStrokePickerAthlete(null)}
      >
        <TouchableOpacity
          style={styles.confirmOverlayBackdrop}
          activeOpacity={1}
          onPress={() => setStrokePickerAthlete(null)}
        >
          <View style={[styles.confirmDialogCard, { paddingVertical: 20 }]}>
            <Text style={[styles.confirmTitle, { marginBottom: 14 }]}>SELECT TYPE OF SWIMMING</Text>
            <View style={{ width: "100%", gap: 8 }}>
              {["Freestyle", "Butterfly", "Backstroke", "Breaststroke", "Individual Medley"].map((stroke) => (
                <TouchableOpacity
                  key={stroke}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    if (strokePickerAthlete) {
                      handleUpdateAthleteDetails(strokePickerAthlete.athlete_id, {
                        stroke_style: stroke,
                        primary_position: stroke,
                      });
                    }
                    setStrokePickerAthlete(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="water-outline" size={18} color="#00C8FF" style={{ marginRight: 12 }} />
                  <Text style={styles.pickerOptionLabel}>{stroke}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* BASKETBALL POSITION PICKER MODAL */}
      <Modal
        visible={posPickerAthlete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPosPickerAthlete(null)}
      >
        <TouchableOpacity
          style={styles.confirmOverlayBackdrop}
          activeOpacity={1}
          onPress={() => setPosPickerAthlete(null)}
        >
          <View style={[styles.confirmDialogCard, { paddingVertical: 20 }]}>
            <Text style={[styles.confirmTitle, { marginBottom: 14 }]}>SELECT BASKETBALL POSITION</Text>
            <View style={{ width: "100%", gap: 8 }}>
              {[
                { code: "PG", label: "Point Guard" },
                { code: "SG", label: "Shooting Guard" },
                { code: "SF", label: "Small Forward" },
                { code: "PF", label: "Power Forward" },
                { code: "C", label: "Center" },
              ].map((pos) => (
                <TouchableOpacity
                  key={pos.code}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    if (posPickerAthlete) {
                      handleUpdateAthleteDetails(posPickerAthlete.athlete_id, {
                        primary_position: pos.label,
                      });
                    }
                    setPosPickerAthlete(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pickerOptionCode}>{pos.code}</Text>
                  <Text style={styles.pickerOptionLabel}>{pos.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default SetPlayer;

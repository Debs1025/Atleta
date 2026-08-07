import React, { useState, useEffect } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "./styles/ManageTeamPage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Team, RosterAthlete } from "../DataTypes";

const AVAILABLE_SPORTS = ["BASKETBALL", "TRACK AND FIELD", "SWIMMING"] as const;

const BASKETBALL_POSITIONS = [
  { code: "PG", label: "Point Guard" },
  { code: "SG", label: "Shooting Guard" },
  { code: "SF", label: "Small Forward" },
  { code: "PF", label: "Power Forward" },
  { code: "C", label: "Center" },
];

const SWIMMING_TYPES = [
  "Freestyle",
  "Butterfly",
  "Backstroke",
  "Breaststroke",
  "Individual Medley",
];

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

const cleanNumericDistance = (val?: string) => {
  if (!val) return "";
  return val.replace(/[^0-9]/g, "");
};

interface ManageTeamPageProps {
  team: Team;
  athletesPool: RosterAthlete[];
  onBack: () => void;
  onDeleteTeam?: (teamId: string) => void;
  onUpdateTeamName: (teamId: string, newName: string) => void;
  onUpdateTeamDetails?: (
    teamId: string,
    updates: { team_name?: string; sport_type?: Team["sport_type"]; division?: string }
  ) => void;
  onUpdateRosterPlayer: (
    teamId: string,
    athleteId: string,
    position: string,
    jerseyNumber: string
  ) => void;
  onUpdateRosterPlayerDetails?: (
    teamId: string,
    athleteId: string,
    details: { position?: string; jerseyNumber?: string; event_distance?: string; stroke_style?: string }
  ) => void;
  onRemovePlayer: (teamId: string, athleteId: string) => void;
  onAddPlayers: (teamId: string, newAthletes: RosterAthlete[]) => void;
}

export function ManageTeamPage({
  team,
  athletesPool,
  onBack,
  onDeleteTeam,
  onUpdateTeamName,
  onUpdateTeamDetails,
  onUpdateRosterPlayer,
  onUpdateRosterPlayerDetails,
  onRemovePlayer,
  onAddPlayers,
}: ManageTeamPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  // Add Players Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit Team Details Modal State
  const [showEditMetadataModal, setShowEditMetadataModal] = useState(false);
  const [editName, setEditName] = useState(team.team_name);
  const [editSport, setEditSport] = useState<Team["sport_type"]>(team.sport_type);
  const [editDivision, setEditDivision] = useState(team.division || "Elite Professional");

  // Remove Player Confirmation Overlay State
  const [playerToRemove, setPlayerToRemove] = useState<RosterAthlete | null>(null);

  // Delete Team Confirmation Overlay State
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Basketball Position Picker Modal State
  const [posPickerPlayer, setPosPickerPlayer] = useState<RosterAthlete | null>(null);

  // Swimming Stroke Type Picker Modal State
  const [typePickerPlayer, setTypePickerPlayer] = useState<RosterAthlete | null>(null);

  useEffect(() => {
    setEditName(team.team_name);
    setEditSport(team.sport_type);
    setEditDivision(team.division || "Elite Professional");
  }, [team]);

  const availablePool = athletesPool.filter(
    (p) => !team.roster_list.some((rp) => rp.athlete_id === p.athlete_id)
  );

  const handleConfirmAdd = () => {
    const toAdd = availablePool.filter((p) => selectedIds.includes(p.athlete_id));
    onAddPlayers(team.team_id, toAdd);
    setSelectedIds([]);
    setShowAddModal(false);
  };

  const handleSaveTeamMetadata = () => {
    if (!editName.trim()) return;
    if (onUpdateTeamDetails) {
      onUpdateTeamDetails(team.team_id, {
        team_name: editName.trim(),
        sport_type: editSport,
        division: editDivision.trim(),
      });
    } else {
      onUpdateTeamName(team.team_id, editName.trim());
    }
    setShowEditMetadataModal(false);
  };

  const handleConfirmRemovePlayer = () => {
    if (playerToRemove) {
      onRemovePlayer(team.team_id, playerToRemove.athlete_id);
      setPlayerToRemove(null);
    }
  };

  const handleConfirmDeleteTeam = () => {
    setShowDeleteConfirmModal(false);
    onDeleteTeam?.(team.team_id);
  };

  return (
    <View style={styles.container}>
      {/* FIXED TOP HEADER */}
      <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={onBack} style={{ marginRight: 14 }} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Team</Text>
          </View>

          {/* Minimalist Delete Team Icon Button */}
          <TouchableOpacity
            style={styles.deleteTeamHeaderIcon}
            onPress={() => setShowDeleteConfirmModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 70, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* Team Metadata Card */}
        <View style={styles.metadataBox}>
          <View style={styles.metadataLabelRow}>
            <Text style={styles.metadataLabel}>TEAM NAME</Text>

            {/* EDIT BUTTON PNG */}
            <TouchableOpacity
              onPress={() => setShowEditMetadataModal(true)}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              <Image
                source={require("../../../../assets/editbutton.png")}
                style={{ width: 24, height: 24, resizeMode: "contain" }}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.teamNameText}>{team.team_name}</Text>

          <View style={styles.metadataSubRow}>
            <View>
              <Text style={styles.subLabel}>SPORT CATEGORY</Text>
              <View style={styles.sportBadgeOutline}>
                <Ionicons
                  name={
                    team.sport_type === "BASKETBALL"
                      ? "basketball"
                      : team.sport_type === "SWIMMING"
                        ? "water"
                        : "fitness"
                  }
                  size={14}
                  color="#00C8FF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.sportBadgeOutlineText}>{team.sport_type}</Text>
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.subLabel}>DIVISION</Text>
              <Text style={styles.divisionValue}>{team.division || "Elite Professional"}</Text>
            </View>
          </View>
        </View>

        {/* Active Roster Section */}
        <View style={{ marginBottom: 20 }}>
          <View style={styles.rosterHeaderRow}>
            <Text style={styles.rosterTitle}>Active Roster</Text>
            <Text style={styles.rosterCountText}>{team.roster_list.length} Players</Text>
          </View>

          <View style={styles.rosterContainer}>
            {team.roster_list.map((player, index) => (
              <View
                key={`${player.athlete_id}_${index}`}
                style={[
                  styles.rosterRow,
                  index < team.roster_list.length - 1 && styles.rosterRowBorder,
                ]}
              >
                <View style={styles.avatarCircle}>
                  <Ionicons name="person-outline" size={18} color="#94A3B8" />
                </View>

                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.full_name}
                  </Text>
                </View>

                {/* SPORT-DEPENDENT ROSTER COLUMNS */}
                {team.sport_type === "BASKETBALL" && (
                  <>
                    <View style={{ marginRight: 8, alignItems: "center" }}>
                      <Text style={styles.miniLabel}>POS</Text>
                      <TouchableOpacity
                        style={styles.uniformControlBox}
                        onPress={() => setPosPickerPlayer(player)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.posText}>{player.position || ""}</Text>
                        <Ionicons name="chevron-down" size={12} color="#64748B" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ marginRight: 8, alignItems: "center" }}>
                      <Text style={styles.miniLabel}>JERSEY</Text>
                      <TextInput
                        style={styles.uniformInputBox}
                        value={player.jersey_number || ""}
                        keyboardType="number-pad"
                        maxLength={3}
                        onChangeText={(val) =>
                          onUpdateRosterPlayer(
                            team.team_id,
                            player.athlete_id,
                            player.position,
                            val
                          )
                        }
                      />
                    </View>
                  </>
                )}

                {team.sport_type === "TRACK AND FIELD" && (
                  <>
                    <View style={{ marginRight: 8, alignItems: "center" }}>
                      <Text style={styles.miniLabel}>DISTANCE</Text>
                      <View style={styles.distanceInputContainer}>
                        <TextInput
                          style={styles.distanceNumericInput}
                          value={cleanNumericDistance(player.event_distance || player.position)}
                          keyboardType="number-pad"
                          maxLength={4}
                          onChangeText={(val) => {
                            const digits = val.replace(/[^0-9]/g, "");
                            if (onUpdateRosterPlayerDetails) {
                              onUpdateRosterPlayerDetails(team.team_id, player.athlete_id, {
                                event_distance: digits ? `${digits}m` : "",
                              });
                            }
                          }}
                        />
                        <Text style={styles.meterUnitText}>m</Text>
                      </View>
                    </View>

                    <View style={{ marginRight: 8, alignItems: "center" }}>
                      <Text style={styles.miniLabel}>JERSEY</Text>
                      <TextInput
                        style={styles.uniformInputBox}
                        value={player.jersey_number || ""}
                        keyboardType="number-pad"
                        maxLength={3}
                        onChangeText={(val) =>
                          onUpdateRosterPlayer(
                            team.team_id,
                            player.athlete_id,
                            player.position,
                            val
                          )
                        }
                      />
                    </View>
                  </>
                )}

                {team.sport_type === "SWIMMING" && (
                  <>
                    <View style={{ marginRight: 8, alignItems: "center" }}>
                      <Text style={styles.miniLabel}>DISTANCE</Text>
                      <View style={styles.distanceInputContainer}>
                        <TextInput
                          style={styles.distanceNumericInput}
                          value={cleanNumericDistance(player.event_distance || player.position)}
                          keyboardType="number-pad"
                          maxLength={4}
                          onChangeText={(val) => {
                            const digits = val.replace(/[^0-9]/g, "");
                            if (onUpdateRosterPlayerDetails) {
                              onUpdateRosterPlayerDetails(team.team_id, player.athlete_id, {
                                event_distance: digits ? `${digits}m` : "",
                              });
                            }
                          }}
                        />
                        <Text style={styles.meterUnitText}>m</Text>
                      </View>
                    </View>

                    <View style={{ marginRight: 8, alignItems: "center" }}>
                      <Text style={styles.miniLabel}>TYPE</Text>
                      <TouchableOpacity
                        style={[styles.uniformControlBox, { width: 82, paddingHorizontal: 6 }]}
                        onPress={() => setTypePickerPlayer(player)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.posText, { fontSize: 11.5 }]} numberOfLines={1}>
                          {player.stroke_style || player.position || ""}
                        </Text>
                        <Ionicons name="chevron-down" size={11} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={{ padding: 2, marginLeft: 2 }}
                  onPress={() => setPlayerToRemove(player)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Add More Players Button */}
        <TouchableOpacity
          style={styles.addPlayersCta}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.addPlayersCtaText}>+ ADD MORE PLAYERS</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL 1: EDIT TEAM METADATA */}
      <Modal
        visible={showEditMetadataModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditMetadataModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditMetadataModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT TEAM DETAILS</Text>
              <TouchableOpacity onPress={() => setShowEditMetadataModal(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>TEAM NAME *</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. Camarines Sur Panthers"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>SPORT CATEGORY</Text>
              <View style={styles.sportDropdownContainer}>
                {AVAILABLE_SPORTS.map((s) => {
                  const isSelected = editSport === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setEditSport(s)}
                      style={[
                        styles.sportDropdownPill,
                        isSelected ? styles.sportDropdownPillActive : styles.sportDropdownPillInactive,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.sportDropdownPillText,
                          isSelected
                            ? styles.sportDropdownPillTextActive
                            : styles.sportDropdownPillTextInactive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>DIVISION</Text>
              <TextInput
                style={styles.modalInput}
                value={editDivision}
                onChangeText={setEditDivision}
                placeholder="e.g. Elite Professional"
                placeholderTextColor="#64748B"
              />

              <TouchableOpacity
                style={[styles.primarySaveButton, !editName.trim() && styles.disabledSaveButton]}
                disabled={!editName.trim()}
                onPress={handleSaveTeamMetadata}
                activeOpacity={0.8}
              >
                <Text style={styles.primarySaveButtonText}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2: BASKETBALL POSITION PICKER */}
      <Modal
        visible={posPickerPlayer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPosPickerPlayer(null)}
      >
        <TouchableOpacity
          style={styles.confirmOverlayBackdrop}
          activeOpacity={1}
          onPress={() => setPosPickerPlayer(null)}
        >
          <View style={[styles.confirmDialogCard, { paddingVertical: 20 }]}>
            <Text style={[styles.confirmTitle, { marginBottom: 14 }]}>SELECT BASKETBALL POSITION</Text>
            <View style={{ width: "100%", gap: 8 }}>
              {BASKETBALL_POSITIONS.map((pos) => (
                <TouchableOpacity
                  key={pos.code}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    if (posPickerPlayer) {
                      onUpdateRosterPlayer(
                        team.team_id,
                        posPickerPlayer.athlete_id,
                        pos.code,
                        posPickerPlayer.jersey_number
                      );
                    }
                    setPosPickerPlayer(null);
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

      {/* MODAL 3: SWIMMING STROKE TYPE PICKER */}
      <Modal
        visible={typePickerPlayer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTypePickerPlayer(null)}
      >
        <TouchableOpacity
          style={styles.confirmOverlayBackdrop}
          activeOpacity={1}
          onPress={() => setTypePickerPlayer(null)}
        >
          <View style={[styles.confirmDialogCard, { paddingVertical: 20 }]}>
            <Text style={[styles.confirmTitle, { marginBottom: 14 }]}>SELECT SWIMMING STROKE</Text>
            <View style={{ width: "100%", gap: 8 }}>
              {SWIMMING_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.pickerOptionRow}
                  onPress={() => {
                    if (typePickerPlayer && onUpdateRosterPlayerDetails) {
                      onUpdateRosterPlayerDetails(team.team_id, typePickerPlayer.athlete_id, {
                        stroke_style: type,
                      });
                    }
                    setTypePickerPlayer(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="water-outline" size={16} color="#00C8FF" style={{ marginRight: 10 }} />
                  <Text style={styles.pickerOptionLabel}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 4: CONFIRMATION OVERLAY FOR REMOVING PLAYER */}
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
                {playerToRemove?.full_name} (#{playerToRemove?.jersey_number})
              </Text>{" "}
              from <Text style={{ color: "#00C8FF", fontWeight: "800" }}>{team.team_name}</Text>?
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
                onPress={handleConfirmRemovePlayer}
                activeOpacity={0.8}
              >
                <Text style={styles.removeConfirmText}>YES, REMOVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 5: CONFIRMATION OVERLAY FOR DELETING ENTIRE TEAM */}
      <Modal
        visible={showDeleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <TouchableOpacity
          style={styles.confirmOverlayBackdrop}
          activeOpacity={1}
          onPress={() => setShowDeleteConfirmModal(false)}
        >
          <View style={styles.confirmDialogCard}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="trash" size={26} color="#EF4444" />
            </View>

            <Text style={styles.confirmTitle}>Delete Team?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete{" "}
              <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>{team.team_name}</Text>? This
              action cannot be undone and will permanently remove this team.
            </Text>

            <View style={styles.confirmButtonRow}>
              <TouchableOpacity
                style={styles.cancelConfirmButton}
                onPress={() => setShowDeleteConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelConfirmText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeConfirmButton}
                onPress={handleConfirmDeleteTeam}
                activeOpacity={0.8}
              >
                <Text style={styles.removeConfirmText}>DELETE TEAM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 6: ADD ATHLETES POOL MODAL */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation?.()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD ATHLETES TO ROSTER</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {availablePool.length === 0 ? (
                <Text style={{ color: "#94A3B8", textAlign: "center", marginVertical: 20 }}>
                  No extra athletes available in pool.
                </Text>
              ) : (
                availablePool.map((p) => {
                  const isSel = selectedIds.includes(p.athlete_id);
                  return (
                    <TouchableOpacity
                      key={p.athlete_id}
                      style={[styles.poolRow, isSel && styles.poolRowSelected]}
                      onPress={() => {
                        if (isSel) {
                          setSelectedIds((prev) => prev.filter((id) => id !== p.athlete_id));
                        } else {
                          setSelectedIds((prev) => [...prev, p.athlete_id]);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.poolName}>{p.full_name}</Text>
                        <Text style={styles.poolSub}>
                          {p.position} • #{p.jersey_number} • {p.sport_type}
                        </Text>
                      </View>
                      <Ionicons
                        name={isSel ? "checkbox" : "square-outline"}
                        size={22}
                        color={isSel ? "#00C8FF" : "#64748B"}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmAddBtn, selectedIds.length === 0 && styles.disabledAddBtn]}
              disabled={selectedIds.length === 0}
              onPress={handleConfirmAdd}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmAddText}>ADD SELECTED ({selectedIds.length})</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}



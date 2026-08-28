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
import {
  AthleteItem,
  AthleteNotification,
  MOCK_ATHLETE_ITEMS,
  TeamDetailsState,
} from "../DataTypes";
import styles from "./styles/AddAthlete";

export interface AddAthleteProps {
  teamDetails: TeamDetailsState;
  onChangeState: (updated: Partial<TeamDetailsState>) => void;
  onNext: () => void;
  onBack: () => void;
  onNotifyAthlete?: (notification: AthleteNotification) => void;
  athletesPool?: any[];
}

export function AddAthlete({
  teamDetails,
  onChangeState,
  onNext,
  onBack,
  onNotifyAthlete,
  athletesPool,
}: AddAthleteProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 12);

  const [searchQuery, setSearchQuery] = useState("");
  const [notifiedIds, setNotifiedIds] = useState<Record<string, boolean>>({});
  const [showSuccessNotifyModal, setShowSuccessNotifyModal] = useState(false);
  const [notifiedAthleteName, setNotifiedAthleteName] = useState("");

  const poolItems: AthleteItem[] = useMemo(() => {
    if (athletesPool && athletesPool.length > 0) {
      return athletesPool.map((a: any) => ({
        athlete_id: a.athlete_id || a.id || "ath_1",
        id_number: String(a.jersey_number || a.id_number || "00"),
        full_name: a.full_name || a.name || "Athlete",
        grad_class: a.grad_class || "Active Athlete",
        primary_position: (a.position || a.primary_position || "Player").toUpperCase(),
        jersey_number: a.jersey_number,
        event_distance: a.event_distance,
        stroke_style: a.stroke_style,
        sport_type: (a.sport_type || a.sport_category || a.sport || "").toUpperCase(),
        is_verified: Boolean(a.is_eligibility_verified ?? a.is_verified ?? true),
      }));
    }
    return MOCK_ATHLETE_ITEMS;
  }, [athletesPool]);

  // Filter pool based on team sport category and search query
  const filteredAthletes = useMemo(() => {
    const targetSport = (teamDetails.sport_type || "").toUpperCase();

    const sportFiltered = poolItems.filter((a) => {
      if (!targetSport) return true;
      const athleteSport = (a.sport_type || "").toUpperCase();

      if (athleteSport) {
        if (targetSport.includes("SWIM")) return athleteSport.includes("SWIM");
        if (targetSport.includes("TRACK")) return athleteSport.includes("TRACK") || athleteSport.includes("FIELD") || athleteSport.includes("RUNNING");
        if (targetSport.includes("BASKET")) return athleteSport.includes("BASKET");
      }

      // Infer from position if sport_type is missing
      const pos = (a.primary_position || "").toUpperCase();
      if (targetSport.includes("BASKET")) {
        return ["PG", "SG", "SF", "PF", "C", "GUARD", "FORWARD", "CENTER"].includes(pos) || !pos;
      } else if (targetSport.includes("TRACK")) {
        return ["100M", "200M", "400M", "SPRINTER", "TRACK", "FIELD", "LONG JUMP", "SHOT PUT"].includes(pos);
      } else if (targetSport.includes("SWIM")) {
        return ["FREESTYLE", "BUTTERFLY", "BACKSTROKE", "BREASTSTROKE", "SWIM", "MEDLEY"].includes(pos);
      }

      return true;
    });

    const q = searchQuery.toLowerCase().trim();
    if (!q) return sportFiltered;
    return sportFiltered.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        a.id_number.includes(q) ||
        a.primary_position.toLowerCase().includes(q)
    );
  }, [poolItems, searchQuery, teamDetails.sport_type]);

  // Check if athlete is in current selected roster
  const isSelected = (athleteId: string) => {
    return teamDetails.selected_roster.some((item) => item.athlete_id === athleteId);
  };

  // Toggle selection
  const handleToggleAthlete = (athlete: AthleteItem) => {
    if (isSelected(athlete.athlete_id)) {
      const updated = teamDetails.selected_roster.filter(
        (item) => item.athlete_id !== athlete.athlete_id
      );
      onChangeState({ selected_roster: updated });
    } else {
      const updated = [...teamDetails.selected_roster, athlete];
      onChangeState({ selected_roster: updated });
    }
  };

  const handleNotifyAthlete = (athlete: AthleteItem) => {
    const notification: AthleteNotification = {
      notification_id: `notif_${Date.now()}`,
      target_athlete_id: athlete.athlete_id,
      type: "ACTION_REQUIRED",
      title: "Action Required: Missing Roster Documents",
      message_body: `Coach requested missing documents: ${athlete.missing_documents?.join(", ") || "Registration form"}. Please submit to join team roster.`,
      highlighted_text: "ACTION REQUIRED",
      relative_time: "Just now",
      action_label: "Upload Documents",
    };

    // Shows a notification to the athlete
    setNotifiedIds((prev) => ({ ...prev, [athlete.athlete_id]: true }));
    onNotifyAthlete?.(notification);

    setNotifiedAthleteName(athlete.full_name);
    setShowSuccessNotifyModal(true);
  };

  return (
    <View style={styles.container}>
      {/* FIXED TOP HEADER */}
      <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ADD YOUR ROSTERS</Text>
        </View>
      </View>

      {/* SCROLLABLE LIST BODY */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 70 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* SEARCH BAR */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, ID, or position"
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* ACTIVE RESULTS COUNT */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitleText}>
            ACTIVE RESULTS ({filteredAthletes.length})
          </Text>
        </View>

        {/* ATHLETE CARDS */}
        {filteredAthletes.map((athlete) => {
          const selected = isSelected(athlete.athlete_id);
          const isNotified = notifiedIds[athlete.athlete_id];

          return (
            <View key={athlete.athlete_id} style={styles.athleteCard}>
              {/* TOP CARD ROW */}
              <View style={styles.cardTopRow}>
                <View style={styles.avatarThumbnail}>
                  <Ionicons name="person" size={26} color="#64748B" />
                </View>

                <View style={styles.cardMainInfo}>
                  <View style={styles.nameIdRow}>
                    <Text style={styles.athleteName}>{athlete.full_name}</Text>
                    <View>
                      <Text style={styles.idNumberText}>{athlete.id_number}</Text>
                      <Text style={styles.idLabelSub}>ID - NUM</Text>
                    </View>
                  </View>

                  <Text style={styles.subMetaText}>
                    {athlete.grad_class} • {athlete.primary_position}
                  </Text>

                  <View style={styles.badgeRow}>
                    {athlete.is_verified ? (
                      <>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.verifiedBadgeText}>
                          Verified Eligibility
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.actionReqBadgeText}>Action Required</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {/* VERIFIED MARKERS / MISSING DOCS ALERT BOX */}
              {athlete.is_verified ? (
                <>
                  <View style={styles.dividerLine} />
                  <View style={styles.markersRow}>
                    <View style={styles.markerColumn}>
                      <Text style={styles.markerLabel}>ACADEMIC MARKER</Text>
                      <Text style={styles.markerValue}>3.8 GPA / NCAA Eligible</Text>
                    </View>
                    <View style={styles.markerColumn}>
                      <Text style={styles.markerLabel}>PHYSICAL STATE</Text>
                      <Text style={styles.markerValue}>Ready</Text>
                    </View>
                  </View>
                </>
              ) : athlete.missing_documents && athlete.missing_documents.length > 0 ? (
                <View style={styles.alertBox}>
                  <Text style={styles.alertTitle}>Missing Required Documents</Text>
                  {athlete.missing_documents.map((doc, idx) => (
                    <Text key={idx} style={styles.alertItemText}>
                      • {doc}
                    </Text>
                  ))}
                </View>
              ) : null}

              {/* ACTION BUTTON: ADD OR NOTIFY */}
              {athlete.is_verified ? (
                <TouchableOpacity
                  style={[
                    styles.cardActionButton,
                    selected && styles.cardActionAdded,
                  ]}
                  onPress={() => handleToggleAthlete(athlete)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.cardActionButtonText,
                      selected && styles.cardActionAddedText,
                    ]}
                  >
                    {selected ? "ADDED TO ROSTER ✓" : "ADD ATHLETE TO ROSTER"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.notifyButton, isNotified && styles.notifyButtonDone]}
                  disabled={isNotified}
                  onPress={() => handleNotifyAthlete(athlete)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.notifyButtonText,
                      isNotified && styles.notifyButtonDoneText,
                    ]}
                  >
                    {isNotified ? "NOTIFICATION DISPATCHED ✓" : "NOTIFY ATHLETE"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* FIXED BOTTOM ACTION BUTTON */}
      <View style={styles.fixedBottomContainer}>
        <TouchableOpacity
          style={[
            styles.primaryCtaButton,
            teamDetails.selected_roster.length === 0 && styles.primaryCtaDisabled,
          ]}
          disabled={teamDetails.selected_roster.length === 0}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryCtaText}>SET POSITIONS</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* NOTIFICATION SENT SUCCESS MODAL */}
      <Modal
        visible={showSuccessNotifyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessNotifyModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSuccessNotifyModal(false)}
        >
          <View style={styles.modalContentCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="paper-plane-sharp" size={38} color="#00C8FF" />
            </View>

            <Text style={styles.successNotifyTitle}>NOTIFICATION DISPATCHED !</Text>
            <Text style={styles.successNotifyMessage}>
              Successfully notified{" "}
              <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>{notifiedAthleteName}</Text> to
              upload missing roster documents.
            </Text>

            <TouchableOpacity
              style={styles.successCtaBtn}
              onPress={() => setShowSuccessNotifyModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.successCtaText}>GOT IT</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default AddAthlete;

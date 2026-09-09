import React, { useState, useMemo, useEffect } from "react";
import {
  ActivityIndicator,
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
  TeamDetailsState,
  RosterAthlete,
} from "../DataTypes";
import { requestAuthenticatedJson } from "../../Authentication/authShared";
import styles from "./styles/AddAthlete";

export interface AddAthleteProps {
  teamDetails: TeamDetailsState;
  athletesPool?: RosterAthlete[];
  onChangeState: (updated: Partial<TeamDetailsState>) => void;
  onNext: () => void;
  onBack: () => void;
  onNotifyAthlete?: (notification: AthleteNotification) => void;
}

export function AddAthlete({
  teamDetails,
  athletesPool = [],
  onChangeState,
  onNext,
  onBack,
  onNotifyAthlete,
}: AddAthleteProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 12);

  const [searchQuery, setSearchQuery] = useState("");
  const [notifiedIds, setNotifiedIds] = useState<Record<string, boolean>>({});
  const [showSuccessNotifyModal, setShowSuccessNotifyModal] = useState(false);
  const [notifiedAthleteName, setNotifiedAthleteName] = useState("");
  const [liveAthletes, setLiveAthletes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all live registered athletes from Firestore via backend
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const res = await requestAuthenticatedJson("/athletes").catch(() => null);
        const rawList = Array.isArray(res) ? res : Array.isArray(res?.athletes) ? res.athletes : [];
        if (isMounted && rawList.length > 0) {
          setLiveAthletes(rawList);
        }
      } catch (err) {
        console.warn("Failed to fetch live athletes for roster:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Base pool filtered strictly by team sport_type from both live athletes and coach's athletesPool
  const baseSportPool: AthleteItem[] = useMemo(() => {
    const targetSport = (teamDetails.sport_type || "BASKETBALL").toUpperCase().trim();
    const athleteMap = new Map<string, AthleteItem>();

    const getCanonicalKey = (a: any) => {
      const raw = String(a.user_id || a.athlete_id || "").trim();
      return raw.replace(/^ath_/, "").toLowerCase();
    };

    // 1. Process coach's handled pool
    if (athletesPool && athletesPool.length > 0) {
      athletesPool.forEach((a) => {
        const aSport = (a.sport_type || "").toUpperCase().trim();
        if (aSport === targetSport) {
          const aId = a.athlete_id || a.user_id;
          const cKey = getCanonicalKey(a);
          if (cKey && !athleteMap.has(cKey)) {
            athleteMap.set(cKey, {
              athlete_id: aId,
              full_name: a.full_name || "Athlete",
              id_number: a.jersey_number ? `#${a.jersey_number}` : aId.slice(-6).toUpperCase(),
              grad_class: (a as any).status_tag || (a.is_eligibility_verified !== false ? "Verified Eligibility" : "Pending Action"),
              primary_position: a.position || (targetSport === "SWIMMING" ? "Swimmer" : targetSport === "TRACK AND FIELD" ? "Track Athlete" : "Player"),
              jersey_number: a.jersey_number ? String(a.jersey_number) : "00",
              is_verified: a.is_eligibility_verified !== false,
              missing_documents: Array.isArray(a.missing_documents) && a.missing_documents.length > 0
                ? a.missing_documents
                : (a.is_eligibility_verified === false ? ["Pending Required Documents"] : undefined),
              status_tag: a.is_eligibility_verified === false ? "RESTRICTED" : "ACTIVE ROTATION",
            });
          }
        }
      });
    }

    // 2. Process live Firestore athletes
    if (liveAthletes && liveAthletes.length > 0) {
      liveAthletes.forEach((a) => {
        const aSport = (a.sport_type || a.sport_category || a.category || "").toUpperCase().trim();
        if (aSport === targetSport) {
          const aId = a.athlete_id || a.user_id;
          const cKey = getCanonicalKey(a);
          const fullName = a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || "Athlete";
          const isVerified = a.is_eligibility_verified !== false;

          // If not in map, or if existing in map is unverified while live is verified/better named
          const existing = athleteMap.get(cKey);
          if (!existing || (!existing.is_verified && isVerified) || (existing.full_name === "Athlete" && fullName !== "Athlete")) {
            athleteMap.set(cKey, {
              athlete_id: aId,
              full_name: fullName,
              id_number: a.jersey_number ? `#${a.jersey_number}` : (existing?.id_number || aId.slice(-6).toUpperCase()),
              grad_class: a.grad_class || (isVerified ? "Verified Eligibility" : "Pending Action"),
              primary_position: a.position || a.primary_position || (targetSport === "SWIMMING" ? "Swimmer" : targetSport === "TRACK AND FIELD" ? "Track Athlete" : "Player"),
              jersey_number: a.jersey_number ? String(a.jersey_number) : (existing?.jersey_number || "00"),
              is_verified: isVerified,
              missing_documents: Array.isArray(a.missing_documents) && a.missing_documents.length > 0
                ? a.missing_documents
                : (!isVerified ? ["Pending Required Documents"] : undefined),
              status_tag: !isVerified ? "RESTRICTED" : "ACTIVE ROTATION",
            });
          }
        }
      });
    }

    return Array.from(athleteMap.values());
  }, [athletesPool, liveAthletes, teamDetails.sport_type]);

  // Filter pool based on search query
  const filteredAthletes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return baseSportPool;
    return baseSportPool.filter(
      (a) =>
        a.full_name.toLowerCase().includes(q) ||
        a.id_number.toLowerCase().includes(q) ||
        a.primary_position.toLowerCase().includes(q)
    );
  }, [baseSportPool, searchQuery]);

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

    setNotifiedIds((prev) => ({ ...prev, [athlete.athlete_id]: true }));
    setNotifiedAthleteName(athlete.full_name);
    setShowSuccessNotifyModal(true);

    if (onNotifyAthlete) {
      onNotifyAthlete(notification);
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

        {/* ACTIVE RESULTS COUNT & SPORT INDICATOR */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitleText}>
            ACTIVE RESULTS ({filteredAthletes.length}) • {(teamDetails.sport_type || "BASKETBALL").toUpperCase()}
          </Text>
        </View>

        {/* ATHLETE CARDS OR EMPTY/LOADING STATE */}
        {isLoading ? (
          <View style={{ padding: 40, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#00C8FF" />
            <Text style={{ color: "#94A3B8", marginTop: 16, fontSize: 13, fontWeight: "600" }}>
              Loading registered {teamDetails.sport_type || "sport"} athletes...
            </Text>
          </View>
        ) : filteredAthletes.length === 0 ? (
          <View
            style={{
              padding: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(18, 26, 43, 0.6)",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.08)",
              marginTop: 10,
              marginBottom: 20,
            }}
          >
            <Ionicons
              name={
                teamDetails.sport_type === "SWIMMING"
                  ? "water-outline"
                  : teamDetails.sport_type === "TRACK AND FIELD"
                  ? "walk-outline"
                  : "basketball-outline"
              }
              size={44}
              color="#00C8FF"
              style={{ marginBottom: 14, opacity: 0.85 }}
            />
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: "800",
                letterSpacing: 0.5,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              NO {((teamDetails.sport_type || "SPORT")).toUpperCase()} ATHLETES REGISTERED
            </Text>
            <Text
              style={{
                color: "#94A3B8",
                fontSize: 13,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              No athletes registered under {teamDetails.sport_type || "this sport"} were found in Firestore.
              When athletes register for {teamDetails.sport_type || "this sport"}, they will appear here to join your roster.
            </Text>
          </View>
        ) : (
          filteredAthletes.map((athlete) => {
            const selected = isSelected(athlete.athlete_id);
            const isNotified = !!notifiedIds[athlete.athlete_id];

            return (
              <View key={athlete.athlete_id} style={styles.athleteCard}>
                {/* TOP CARD ROW */}
                <View style={styles.cardTopRow}>
                  <View style={styles.avatarThumbnail}>
                    <Ionicons name="person" size={26} color="#64748B" />
                  </View>

                  <View style={styles.cardMainInfo}>
                    <View style={styles.nameIdRow}>
                      <Text style={styles.athleteName} numberOfLines={2}>
                        {athlete.full_name}
                      </Text>
                      <View style={styles.idContainer}>
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
                        <Text style={styles.markerLabel}>ELIGIBILITY STATUS</Text>
                        <Text style={styles.markerValue}>Eligible & Verified</Text>
                      </View>
                      <View style={styles.markerColumn}>
                        <Text style={styles.markerLabel}>ROSTER STATUS</Text>
                        <Text style={styles.markerValue}>{athlete.status_tag || "Ready"}</Text>
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
          })
        )}
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

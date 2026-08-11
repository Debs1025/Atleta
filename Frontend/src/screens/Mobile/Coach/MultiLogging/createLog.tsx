import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/createLog";
import { SportCategory, AthleteRosterItem, MatchLogSessionState } from "./types";
import { useMatchSession } from "./MatchSessionContext";

// Sample Data
const COACH_AVAILABLE_ROSTER: AthleteRosterItem[] = [
  {
    athlete_id: "ath_103",
    jersey_number: "08",
    last_name: "VILLAMOR",
    full_name: "JAVI VILLAMOR",
    position_or_event: "Power Forward",
    is_active_on_field: false,
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
  },
  {
    athlete_id: "ath_104",
    jersey_number: "11",
    last_name: "MENDOZA",
    full_name: "ARIS MENDOZA",
    position_or_event: "Point Guard",
    is_active_on_field: false,
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
  },
  {
    athlete_id: "ath_105",
    jersey_number: "05",
    last_name: "SANTOS",
    full_name: "M. SANTOS",
    position_or_event: "Center",
    is_active_on_field: false,
    avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
  },
  {
    athlete_id: "ath_106",
    jersey_number: "10",
    last_name: "PELONIO",
    full_name: "G. PELONIO",
    position_or_event: "Center",
    is_active_on_field: false,
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
  },
  {
    athlete_id: "ath_sw_01",
    jersey_number: "01",
    last_name: "CRUZ",
    full_name: "DIEGO CRUZ",
    position_or_event: "50m Freestyle",
    is_active_on_field: false,
    avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 50, split_times: [], is_foul_dq: false },
  },
  {
    athlete_id: "ath_sw_02",
    jersey_number: "04",
    last_name: "REYES",
    full_name: "SIENNA REYES",
    position_or_event: "100m Butterfly",
    is_active_on_field: false,
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
  },
  {
    athlete_id: "ath_tf_01",
    jersey_number: "07",
    last_name: "SANTOS",
    full_name: "GABRIEL SANTOS",
    position_or_event: "100m Sprint",
    is_active_on_field: false,
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
  },
];

interface CreateLogProps {
  onBack?: () => void;
  onStartLogging?: (session: MatchLogSessionState) => void;
}

export function CreateLogScreen({ onBack, onStartLogging }: CreateLogProps) {
  const insets = useSafeAreaInsets();
  const {
    session,
    setSportCategory,
    setSessionDetails,
    addAthleteToRoster,
    removeAthleteFromRoster,
  } = useMatchSession();

  const [searchQuery, setSearchQuery] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);

  const handleSelectSport = (sport: SportCategory) => {
    setSportCategory(sport);
  };

  const handleUpdateDate = (dateVal: string) => {
    setSessionDate(dateVal);
    const combined = dateVal && sessionTime ? `${dateVal}, ${sessionTime}` : dateVal || sessionTime;
    setSessionDetails({ date_time: combined });
  };

  const handleUpdateTime = (timeVal: string) => {
    setSessionTime(timeVal);
    const combined = sessionDate && timeVal ? `${sessionDate}, ${timeVal}` : sessionDate || timeVal;
    setSessionDetails({ date_time: combined });
  };

  const handleStart = () => {
    const missing: string[] = [];

    if (session.active_roster.length === 0) {
      missing.push("Select at least 1 athlete for the roster");
    }
    if (!sessionDate.trim()) {
      missing.push("Date schedule (mm/dd/yyyy)");
    }
    if (!sessionTime.trim()) {
      missing.push("Time schedule (--:-- --)");
    }
    if (!session.location || !session.location.trim()) {
      missing.push("Session location (e.g. Gym / Stadium)");
    }

    if (missing.length > 0) {
      setMissingItems(missing);
      setShowErrors(true);
      setShowInterruptionModal(true);
      return;
    }

    // Organize selected roster into active on-court vs bench roster
    const allSelected = session.active_roster;
    let activeRoster: AthleteRosterItem[] = [];
    let benchRoster: AthleteRosterItem[] = [];

    if (session.sport_type === "BASKETBALL" && allSelected.length > 5) {
      activeRoster = allSelected.slice(0, 5).map((a) => ({ ...a, is_active_on_field: true }));
      benchRoster = allSelected.slice(5).map((a) => ({ ...a, is_active_on_field: false }));
    } else {
      activeRoster = allSelected.map((a) => ({ ...a, is_active_on_field: true }));
      benchRoster = [];
    }

    setSessionDetails({
      active_roster: activeRoster,
      bench_roster: benchRoster,
    });

    setShowErrors(false);
    setShowSuccessModal(true);
  };

  const filteredPool = COACH_AVAILABLE_ROSTER.filter(
    (a) =>
      !session.active_roster.some((item) => item.athlete_id === a.athlete_id) &&
      a.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 28) + 44 }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CREATE LOG SESSION</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SELECT SPORT */}
        <Text style={styles.sectionLabel}>SELECT SPORT</Text>

        <View style={styles.gridContainer}>
          {/* Basketball Tile */}
          <TouchableOpacity
            style={[
              styles.sportTileHalf,
              session.sport_type === "BASKETBALL" && styles.sportTileActive,
            ]}
            onPress={() => handleSelectSport("BASKETBALL")}
            activeOpacity={0.8}
          >
            <View style={styles.sportTileIcon}>
              <FontAwesome5
                name="basketball-ball"
                size={24}
                color={session.sport_type === "BASKETBALL" ? "#00D2FF" : "#00D2FF"}
              />
            </View>
            <Text
              style={[
                styles.sportTileTitle,
                session.sport_type === "BASKETBALL" && styles.sportTileTitleActive,
              ]}
            >
              Basketball
            </Text>
          </TouchableOpacity>

          {/* Swimming Tile */}
          <TouchableOpacity
            style={[
              styles.sportTileHalf,
              session.sport_type === "SWIMMING" && styles.sportTileActive,
            ]}
            onPress={() => handleSelectSport("SWIMMING")}
            activeOpacity={0.8}
          >
            <View style={styles.sportTileIcon}>
              <FontAwesome5
                name="swimmer"
                size={22}
                color={session.sport_type === "SWIMMING" ? "#00D2FF" : "#00D2FF"}
              />
            </View>
            <Text
              style={[
                styles.sportTileTitle,
                session.sport_type === "SWIMMING" && styles.sportTileTitleActive,
              ]}
            >
              Swimming
            </Text>
          </TouchableOpacity>
        </View>

        {/* Track & Field Tile */}
        <TouchableOpacity
          style={[
            styles.sportTileFull,
            session.sport_type === "TRACK AND FIELD" && styles.sportTileActive,
          ]}
          onPress={() => handleSelectSport("TRACK AND FIELD")}
          activeOpacity={0.8}
        >
          <View style={styles.sportTileIcon}>
            <FontAwesome5
              name="running"
              size={24}
              color={session.sport_type === "TRACK AND FIELD" ? "#00D2FF" : "#00D2FF"}
            />
          </View>
          <Text
            style={[
              styles.sportTileTitle,
              session.sport_type === "TRACK AND FIELD" && styles.sportTileTitleActive,
            ]}
          >
            Track & Field
          </Text>
        </TouchableOpacity>

        {/* SELECT TEAM & ROSTER SEARCH */}
        <Text style={styles.sectionLabel}>SELECT TEAM</Text>

        <Text style={styles.subLabel}>Search Athletes</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Type athlete name..."
            placeholderTextColor="#5C6B82"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 0) setShowAddModal(true);
            }}
          />
          <Ionicons name="person-add-outline" size={20} color="#5C6B82" style={styles.searchIcon} />
        </View>

        {/* Selected Athletes Cards List */}
        {session.active_roster.map((athlete) => (
          <View key={athlete.athlete_id} style={styles.athleteCard}>
            {athlete.avatar_url ? (
              <Image source={{ uri: athlete.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {athlete.full_name.charAt(0)}
                </Text>
              </View>
            )}

            <View style={styles.athleteInfo}>
              <Text style={styles.athleteName}>{athlete.full_name}</Text>
              <Text style={styles.athleteSubtitle}>
                {athlete.position_or_event} • #{athlete.jersey_number}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeAthleteFromRoster(athlete.athlete_id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* ADD ATHLETE Dashed Button */}
        <TouchableOpacity
          style={[
            styles.addAthleteBtn,
            showErrors && session.active_roster.length === 0 && { borderColor: "#EF4444" },
          ]}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.addAthleteBtnText, showErrors && session.active_roster.length === 0 && { color: "#EF4444" }]}>
            {showErrors && session.active_roster.length === 0 ? "! ADD ATHLETE (REQUIRED)" : "ADD ATHLETE"}
          </Text>
        </TouchableOpacity>
        {showErrors && session.active_roster.length === 0 && (
          <Text style={[styles.errorText, { marginTop: -14, marginBottom: 14 }]}>
            Please select at least 1 athlete to start session.
          </Text>
        )}

        {/* SESSION DETAILS */}
        <Text style={styles.sectionLabel}>SESSION DETAILS</Text>

        {/* Separated Date & Time Inputs */}
        <View style={styles.rowGroup}>
          {/* Date Input */}
          <View style={styles.halfFormGroup}>
            <Text style={styles.subLabel}>
              Date <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputBox,
                showErrors && !sessionDate.trim() && styles.inputBoxError,
              ]}
            >
              <TextInput
                style={styles.inputText}
                placeholder="mm/dd/yyyy"
                placeholderTextColor="#5C6B82"
                value={sessionDate}
                onChangeText={handleUpdateDate}
              />
              <Ionicons
                name="calendar-outline"
                size={18}
                color={showErrors && !sessionDate.trim() ? "#EF4444" : "#5C6B82"}
              />
            </View>
            {showErrors && !sessionDate.trim() && (
              <Text style={styles.errorText}>Date is required.</Text>
            )}
          </View>

          {/* Time Input */}
          <View style={styles.halfFormGroup}>
            <Text style={styles.subLabel}>
              Time <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputBox,
                showErrors && !sessionTime.trim() && styles.inputBoxError,
              ]}
            >
              <TextInput
                style={styles.inputText}
                placeholder="--:-- --"
                placeholderTextColor="#5C6B82"
                value={sessionTime}
                onChangeText={handleUpdateTime}
              />
              <Ionicons
                name="time-outline"
                size={18}
                color={showErrors && !sessionTime.trim() ? "#EF4444" : "#5C6B82"}
              />
            </View>
            {showErrors && !sessionTime.trim() && (
              <Text style={styles.errorText}>Time is required.</Text>
            )}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.subLabel}>Location <Text style={{ color: "#EF4444" }}>*</Text></Text>
          <View style={[styles.inputBox, showErrors && (!session.location || !session.location.trim()) && styles.inputBoxError]}>
            <TextInput
              style={styles.inputText}
              placeholder="Gym / Stadium / Court"
              placeholderTextColor="#5C6B82"
              value={session.location}
              onChangeText={(val) => setSessionDetails({ location: val })}
            />
            <Ionicons name="location-sharp" size={18} color={showErrors && (!session.location || !session.location.trim()) ? "#EF4444" : "#5C6B82"} />
          </View>
          {showErrors && (!session.location || !session.location.trim()) && (
            <Text style={styles.errorText}>Location is required.</Text>
          )}
        </View>

        {/* Bottom CTA Button */}
        <TouchableOpacity
          style={styles.startLoggingBtn}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.startLoggingBtnText}>START MANUAL LOGGING</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Add Athlete Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available Athletes Under Coach</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {filteredPool.length > 0 ? (
              <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {filteredPool.map((item) => (
                  <TouchableOpacity
                    key={item.athlete_id}
                    style={styles.poolItem}
                    onPress={() => {
                      addAthleteToRoster(item);
                      if (filteredPool.length <= 1) setShowAddModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.poolItemTitle}>{item.full_name}</Text>
                      <Text style={styles.poolItemSub}>
                        {item.position_or_event} • #{item.jersey_number}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color="#00D2FF" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <Text style={{ color: "#8E9BAE", fontSize: 14 }}>
                  {searchQuery ? "No matching athletes found." : "All registered team athletes are already added to roster."}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Required Interruption Modal */}
      <Modal
        visible={showInterruptionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInterruptionModal(false)}
      >
        <View style={styles.interruptionOverlay}>
          <View style={styles.interruptionCard}>
            <View style={styles.interruptionIconCircle}>
              <Ionicons name="warning-outline" size={30} color="#EF4444" />
            </View>

            <Text style={styles.interruptionTitle}>REQUIRED DETAILS MISSING</Text>
            <Text style={styles.interruptionSubtitle}>
              Please complete all required session setup details before starting manual logging:
            </Text>

            <View style={styles.interruptionBox}>
              {missingItems.map((item, idx) => (
                <View key={idx} style={styles.interruptionItem}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.interruptionItemText}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.interruptionBtn}
              onPress={() => setShowInterruptionModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.interruptionBtnText}>FILL UP DETAILS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Session Started Success Interruption Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.interruptionOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={36} color="#00D2FF" />
            </View>

            <Text style={styles.interruptionTitle}>SESSION STARTED</Text>
            <Text style={styles.interruptionSubtitle}>
              Manual logging session successfully configured and initialized.
            </Text>

            <View style={styles.interruptionBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>SPORT</Text>
                <Text style={styles.summaryValueText}>{session.sport_type}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>SELECTED ROSTER</Text>
                <Text style={styles.summaryValueText}>{session.active_roster.length} Athletes</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>SCHEDULE</Text>
                <Text style={styles.summaryValueText}>{session.date_time}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>LOCATION</Text>
                <Text style={styles.summaryValueText}>{session.location}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => {
                setShowSuccessModal(false);
                if (onStartLogging) onStartLogging(session);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.successBtnText}>PROCEED TO LIVE LOGGING</Text>
              <Ionicons name="arrow-forward" size={18} color="#070D19" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default CreateLogScreen;

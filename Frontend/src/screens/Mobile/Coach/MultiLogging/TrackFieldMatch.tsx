import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/TrackFieldMatch";
import { useMatchSession } from "./MatchSessionContext";
import { AthleteRosterItem, TimingStats } from "./types";
import { TRACK_FIELD_EVENTS, SportEventOption, findEventOption } from "./sportEvents";

interface TrackFieldMatchProps {
  onClose?: () => void;
  onSaveMatch?: () => void;
}

export function TrackFieldMatchScreen({ onClose, onSaveMatch }: TrackFieldMatchProps) {
  const insets = useSafeAreaInsets();
  const { session, updateTimingStats, updateAthleteEvent, setSessionDetails } = useMatchSession();

  // Athletes roster directly from session
  const athletes = session.active_roster;

  // Selected athlete for action modal
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteRosterItem | null>(null);

  // Stopwatch & Marks state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [manualTimeStr, setManualTimeStr] = useState("00:00.00");
  const [distanceVal, setDistanceVal] = useState("100");
  const [fieldMarkVal, setFieldMarkVal] = useState("0.00");
  const [fieldStatus, setFieldStatus] = useState<"CLEARED" | "FOUL" | "PASS">("CLEARED");
  const [recordedSplits, setRecordedSplits] = useState<string[]>([]);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Keep sport_type synchronized
  useEffect(() => {
    if (session.sport_type !== "TRACK AND FIELD") {
      setSessionDetails({ sport_type: "TRACK AND FIELD" });
    }
  }, []);

  // Manage stopwatch interval smoothly without context choking
  useEffect(() => {
    if (isTimerRunning) {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 40);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning]);

  // Format milliseconds to MM:SS.ss
  const formatStopwatch = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const hundredths = Math.floor((ms % 1000) / 10);

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
  };

  // Open modal for selected athlete
  const handleOpenAthleteModal = (athlete: AthleteRosterItem) => {
    setIsTimerRunning(false);
    setSelectedAthlete(athlete);
    const stats = athlete.timing_stats;
    const initialMs = stats?.timer_seconds ? stats.timer_seconds * 1000 : 0;
    setElapsedMs(initialMs);
    setManualTimeStr(stats?.formatted_time && stats.formatted_time !== "00:00.00" ? stats.formatted_time : (initialMs > 0 ? formatStopwatch(initialMs) : "00:00.00"));
    setDistanceVal(stats?.distance_meters ? String(stats.distance_meters) : "100");
    setFieldMarkVal(stats?.mark ? String(stats.mark).replace(/m$/, '') : (stats?.distance_meters ? String(stats.distance_meters) : "0.00"));
    setRecordedSplits(stats?.split_times || []);
  };

  // Close modal and sync stats
  const handleCloseModal = () => {
    if (selectedAthlete) {
      const evOpt = findEventOption("TRACK AND FIELD", selectedAthlete.position_or_event || selectedAthlete.event);
      const isDistance = !!evOpt?.isDistanceEvent;

      if (isDistance) {
        const markStr = fieldMarkVal ? `${fieldMarkVal}m` : "0.00m";
        updateTimingStats(selectedAthlete.athlete_id, {
          mark: markStr,
          distance_meters: parseFloat(fieldMarkVal) || 0,
        });
      } else {
        const finalFormatted = isTimerRunning ? formatStopwatch(elapsedMs) : (manualTimeStr && manualTimeStr !== "00:00.00" ? manualTimeStr : formatStopwatch(elapsedMs));
        const secs = isTimerRunning ? Math.floor(elapsedMs / 1000) : (elapsedMs > 0 ? Math.floor(elapsedMs / 1000) : 0);
        updateTimingStats(selectedAthlete.athlete_id, {
          timer_seconds: secs,
          formatted_time: finalFormatted,
        });
      }
    }
    setIsTimerRunning(false);
    setSelectedAthlete(null);
  };

  // Select Track & Field Event
  const handleSelectEvent = (ev: SportEventOption) => {
    if (!selectedAthlete) return;
    updateAthleteEvent(selectedAthlete.athlete_id, ev.label, ev.key, ev.distance_meters);
    setDistanceVal(String(ev.distance_meters || 100));
    setSelectedAthlete((prev) =>
      prev
        ? {
            ...prev,
            position_or_event: ev.label,
            event: ev.label,
            event_name: ev.label,
            event_key: ev.key,
            timing_stats: {
              ...(prev.timing_stats || { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: ev.distance_meters, split_times: [], is_foul_dq: false }),
              distance_meters: ev.distance_meters,
              event: ev.label,
              event_key: ev.key,
            },
          }
        : null
    );
  };

  // Toggle stopwatch Play/Pause
  const toggleStopwatch = () => {
    if (!selectedAthlete) return;

    if (isTimerRunning) {
      // Pause timer immediately!
      setIsTimerRunning(false);
      const finalTimeStr = formatStopwatch(elapsedMs);
      setManualTimeStr(finalTimeStr);
      updateTimingStats(selectedAthlete.athlete_id, {
        timer_seconds: Math.floor(elapsedMs / 1000),
        formatted_time: finalTimeStr,
      });
    } else {
      // Start timer!
      setIsTimerRunning(true);
    }
  };

  // Reset / Retry stopwatch time
  const handleRetryStopwatch = () => {
    if (!selectedAthlete) return;
    setIsTimerRunning(false);
    setElapsedMs(0);
    setManualTimeStr("00:00.00");
    setRecordedSplits([]);
    updateTimingStats(selectedAthlete.athlete_id, {
      timer_seconds: 0,
      formatted_time: "00:00.00",
      split_times: [],
    });
  };

  // Manual time input change
  const handleManualTimeChange = (text: string) => {
    setManualTimeStr(text);
    if (!selectedAthlete) return;
    updateTimingStats(selectedAthlete.athlete_id, {
      formatted_time: text,
    });
  };

  // Save Field Mark
  const handleSaveFieldMark = () => {
    if (!selectedAthlete) return;
    const num = parseFloat(fieldMarkVal) || 0;
    const markStr = `${num}m`;
    updateTimingStats(selectedAthlete.athlete_id, {
      mark: markStr,
      distance_meters: num,
    });
    Alert.alert("Mark Saved", `Mark set to ${markStr} for #${selectedAthlete.jersey_number} ${selectedAthlete.last_name}`);
  };

  // Save Distance
  const handleSaveDistance = () => {
    if (!selectedAthlete) return;
    const num = parseInt(distanceVal, 10) || 100;
    updateTimingStats(selectedAthlete.athlete_id, {
      distance_meters: num,
    });
    Alert.alert("Distance Updated", `Distance set to ${num}M for #${selectedAthlete.jersey_number} ${selectedAthlete.last_name}`);
  };

  // Toggle Foul / DQ
  const handleToggleFoulDQ = () => {
    if (!selectedAthlete) return;
    const currentStatus = !!selectedAthlete.timing_stats?.is_foul_dq;
    const newStatus = !currentStatus;

    updateTimingStats(selectedAthlete.athlete_id, {
      is_foul_dq: newStatus,
    });

    setSelectedAthlete((prev) =>
      prev
        ? {
            ...prev,
            timing_stats: {
              ...(prev.timing_stats || { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false }),
              is_foul_dq: newStatus,
            },
          }
        : null
    );
  };

  // Record Split Time
  const handleRecordSplit = () => {
    if (!selectedAthlete) return;
    const currentFormatted = formatStopwatch(elapsedMs);
    const newSplits = [...recordedSplits, currentFormatted];
    setRecordedSplits(newSplits);

    updateTimingStats(selectedAthlete.athlete_id, {
      split_times: newSplits,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>ATLETA</Text>
        <TouchableOpacity style={styles.closeHeaderBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Sport Banner */}
      <View style={styles.sportBanner}>
        <Text style={styles.sportTitle}>TRACK AND FIELD</Text>
      </View>

      {/* Athletes Stack Container */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {athletes.map((athlete) => {
          const timing: TimingStats = athlete.timing_stats || {
            timer_seconds: 0,
            formatted_time: "00:00.00",
            distance_meters: 100,
            split_times: [],
            is_foul_dq: false,
          };
          const eventLabel = athlete.position_or_event || `${timing.distance_meters || 100}M`;

          return (
            <TouchableOpacity
              key={athlete.athlete_id}
              style={styles.playerCard}
              onPress={() => handleOpenAthleteModal(athlete)}
              activeOpacity={0.85}
            >
              <View style={styles.playerCardHeader}>
                <Text style={styles.jerseyNumber}>{athlete.jersey_number}</Text>
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" style={styles.chevronIcon} />
              </View>

              <Text style={styles.lastName}>{athlete.last_name}</Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(0, 200, 255, 0.15)",
                    borderColor: "rgba(0, 200, 255, 0.4)",
                    borderWidth: 1,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Ionicons name="speedometer-outline" size={13} color="#00C8FF" />
                  <Text style={{ color: "#00C8FF", fontSize: 11, fontWeight: "800" }}>{eventLabel}</Text>
                </View>

                {timing.mark || (timing.formatted_time && timing.formatted_time !== "00:00.00") ? (
                  <Text style={styles.liveTimerDisplay}>
                    {timing.mark || `TIME: ${timing.formatted_time}`}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Floating Save Action Button */}
      <TouchableOpacity style={styles.floatingSaveBtn} onPress={onSaveMatch} activeOpacity={0.85}>
        <Ionicons name="save-outline" size={26} color="#070D19" />
      </TouchableOpacity>

      {/* Track & Field Action White Bottom Sheet Modal */}
      <Modal
        visible={selectedAthlete !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                # {selectedAthlete?.jersey_number} {selectedAthlete?.last_name}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#0B1528" />
              </TouchableOpacity>
            </View>

            {/* EVENT PICKER BAR */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ color: "#475569", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginBottom: 8 }}>
                CHOOSE TRACK & FIELD EVENT
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {TRACK_FIELD_EVENTS.map((ev) => {
                  const currentEv = selectedAthlete?.position_or_event || selectedAthlete?.event || "100m Dash";
                  const isSelected =
                    currentEv.toLowerCase() === ev.label.toLowerCase() ||
                    currentEv.toLowerCase() === ev.key.toLowerCase() ||
                    currentEv.toLowerCase() === ev.shortLabel.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={ev.key}
                      onPress={() => handleSelectEvent(ev)}
                      style={{
                        backgroundColor: isSelected ? "#00C8FF" : "#F1F5F9",
                        borderColor: isSelected ? "#0099CC" : "#CBD5E1",
                        borderWidth: 1.5,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: isSelected ? "#070D19" : "#334155", fontSize: 12, fontWeight: isSelected ? "900" : "700" }}>
                        {ev.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {(() => {
              const evOpt = findEventOption("TRACK AND FIELD", selectedAthlete?.position_or_event || selectedAthlete?.event);
              const isDistance = !!evOpt?.isDistanceEvent;

              if (isDistance) {
                return (
                  <View style={styles.gridContainer}>
                    {/* TILE 1: MARK (METERS) */}
                    <View style={styles.actionBox}>
                      <View style={styles.actionBoxHeader}>
                        <Ionicons name="ribbon-outline" size={24} color="#0B1528" />
                        <Text style={styles.actionBoxLabel}>MARK / DISTANCE</Text>
                      </View>
                      <View style={styles.distanceInputRow}>
                        <TextInput
                          style={styles.distanceInput}
                          keyboardType="numeric"
                          value={fieldMarkVal}
                          placeholder="0.00"
                          placeholderTextColor="#94A3B8"
                          onChangeText={setFieldMarkVal}
                        />
                        <Text style={styles.distanceUnit}>M</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.saveMiniBtn}
                        onPress={handleSaveFieldMark}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.saveMiniBtnText}>SAVE MARK</Text>
                      </TouchableOpacity>
                    </View>

                    {/* TILE 2: STATUS */}
                    <TouchableOpacity
                      style={[styles.actionBox, fieldStatus === "FOUL" && styles.actionBoxActive]}
                      onPress={() => setFieldStatus((prev) => (prev === "CLEARED" ? "FOUL" : prev === "FOUL" ? "PASS" : "CLEARED"))}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={fieldStatus === "CLEARED" ? "checkmark-circle-outline" : fieldStatus === "FOUL" ? "close-circle-outline" : "arrow-forward-circle-outline"}
                        size={26}
                        color={fieldStatus === "CLEARED" ? "#10B981" : fieldStatus === "FOUL" ? "#EF4444" : "#64748B"}
                      />
                      <Text style={styles.actionBoxLabel}>ATTEMPT STATUS</Text>
                      <Text style={{ color: fieldStatus === "CLEARED" ? "#10B981" : fieldStatus === "FOUL" ? "#EF4444" : "#64748B", fontSize: 13, fontWeight: "900", marginTop: 4 }}>
                        {fieldStatus}
                      </Text>
                    </TouchableOpacity>

                    {/* TILE 3: FOUL / DQ */}
                    <TouchableOpacity
                      style={[styles.actionBox, selectedAthlete?.timing_stats?.is_foul_dq && styles.actionBoxActive]}
                      onPress={handleToggleFoulDQ}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="flag-outline"
                        size={26}
                        color={selectedAthlete?.timing_stats?.is_foul_dq ? "#EF4444" : "#0B1528"}
                      />
                      <Text style={styles.actionBoxLabel}>FOUL / DQ</Text>
                      {selectedAthlete?.timing_stats?.is_foul_dq && (
                        <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "800", marginTop: 4 }}>
                          STATUS: SET
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* TILE 4: SPLIT / TRIAL */}
                    <TouchableOpacity
                      style={styles.actionBox}
                      onPress={handleRecordSplit}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="analytics-outline" size={26} color="#0B1528" />
                      <Text style={styles.actionBoxLabel}>LOG ATTEMPT</Text>
                      {recordedSplits.length > 0 && (
                        <Text style={styles.splitListBadge}>
                          {recordedSplits.length} ATTEMPT(S)
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <View style={styles.gridContainer}>
                  {/* TILE 1: TIMER */}
                  <View style={styles.actionBox}>
                    <View style={styles.actionBoxHeader}>
                      <Ionicons name="time-outline" size={24} color="#0B1528" />
                      <Text style={styles.actionBoxLabel}>TIMER</Text>
                    </View>
                    <TextInput
                      style={[
                        styles.stopwatchText,
                        {
                          textAlign: "center",
                          borderBottomWidth: 1,
                          borderBottomColor: "#CBD5E1",
                          width: "88%",
                          paddingVertical: 2,
                        },
                      ]}
                      value={isTimerRunning ? formatStopwatch(elapsedMs) : manualTimeStr}
                      placeholder="00:00.00"
                      placeholderTextColor="#94A3B8"
                      onChangeText={handleManualTimeChange}
                      editable={!isTimerRunning}
                    />
                    <View style={styles.timerControlRow}>
                      <TouchableOpacity
                        style={styles.playCircleBtn}
                        onPress={toggleStopwatch}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={isTimerRunning ? "pause-sharp" : "play-sharp"}
                          size={22}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.retryCircleBtn}
                        onPress={handleRetryStopwatch}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh-sharp" size={22} color="#0B1528" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* TILE 2: DISTANCE */}
                  <View style={styles.actionBox}>
                    <View style={styles.actionBoxHeader}>
                      <MaterialCommunityIcons name="swap-horizontal" size={24} color="#0B1528" />
                      <Text style={styles.actionBoxLabel}>DISTANCE</Text>
                    </View>

                    <View style={styles.distanceInputRow}>
                      <TextInput
                        style={styles.distanceInput}
                        keyboardType="numeric"
                        value={distanceVal}
                        onChangeText={setDistanceVal}
                      />
                      <Text style={styles.distanceUnit}>M</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.saveMiniBtn}
                      onPress={handleSaveDistance}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveMiniBtnText}>SAVE</Text>
                    </TouchableOpacity>
                  </View>

                  {/* TILE 3: FOUL / DQ */}
                  <TouchableOpacity
                    style={[
                      styles.actionBox,
                      selectedAthlete?.timing_stats?.is_foul_dq && styles.actionBoxActive,
                    ]}
                    onPress={handleToggleFoulDQ}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="flag-outline"
                      size={26}
                      color={selectedAthlete?.timing_stats?.is_foul_dq ? "#EF4444" : "#0B1528"}
                    />
                    <Text style={styles.actionBoxLabel}>FOUL / DQ</Text>
                    {selectedAthlete?.timing_stats?.is_foul_dq && (
                      <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "800", marginTop: 4 }}>
                        STATUS: SET
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* TILE 4: SPLIT TIME */}
                  <TouchableOpacity
                    style={styles.actionBox}
                    onPress={handleRecordSplit}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="git-branch-outline" size={26} color="#0B1528" />
                    <Text style={styles.actionBoxLabel}>SPLIT TIME</Text>
                    {recordedSplits.length > 0 && (
                      <Text style={styles.splitListBadge}>
                        {recordedSplits.length} SPLIT(S) LOGGED
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default TrackFieldMatchScreen;

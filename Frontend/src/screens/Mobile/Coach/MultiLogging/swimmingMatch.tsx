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
  FontAwesome5,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/swimmingMatch";
import { useMatchSession } from "./MatchSessionContext";
import { AthleteRosterItem } from "./types";

interface SwimmingMatchProps {
  onClose?: () => void;
  onSaveMatch?: () => void;
}

// Sample Data
const DEFAULT_SWIMMING_ROSTER: AthleteRosterItem[] = [
  {
    athlete_id: "sw_24",
    jersey_number: "24",
    last_name: "DELA CRUZ",
    full_name: "DELA CRUZ",
    position_or_event: "100M FREE",
    is_active_on_field: true,
    timing_stats: {
      timer_seconds: 0,
      formatted_time: "00:00.00",
      distance_meters: 100,
      split_times: [],
      is_foul_dq: false,
    },
  },
  {
    athlete_id: "sw_30",
    jersey_number: "30",
    last_name: "SANTOS",
    full_name: "SANTOS",
    position_or_event: "50M FREE",
    is_active_on_field: true,
    timing_stats: {
      timer_seconds: 0,
      formatted_time: "00:00.00",
      distance_meters: 50,
      split_times: [],
      is_foul_dq: false,
    },
  },
  {
    athlete_id: "sw_07",
    jersey_number: "07",
    last_name: "REYES",
    full_name: "REYES",
    position_or_event: "50M BREAST STROKE",
    is_active_on_field: true,
    timing_stats: {
      timer_seconds: 0,
      formatted_time: "00:00.00",
      distance_meters: 50,
      split_times: [],
      is_foul_dq: false,
    },
  },
  {
    athlete_id: "sw_15",
    jersey_number: "15",
    last_name: "GARCIA",
    full_name: "GARCIA",
    position_or_event: "100 BREAST STROKE",
    is_active_on_field: true,
    timing_stats: {
      timer_seconds: 0,
      formatted_time: "00:00.00",
      distance_meters: 100,
      split_times: [],
      is_foul_dq: false,
    },
  },
  {
    athlete_id: "sw_42",
    jersey_number: "42",
    last_name: "BAUTISTA",
    full_name: "BAUTISTA",
    position_or_event: "200M FREE",
    is_active_on_field: true,
    timing_stats: {
      timer_seconds: 0,
      formatted_time: "00:00.00",
      distance_meters: 200,
      split_times: [],
      is_foul_dq: false,
    },
  },
];

export function SwimmingMatchScreen({ onClose, onSaveMatch }: SwimmingMatchProps) {
  const insets = useSafeAreaInsets();
  const { session, updateTimingStats, setSessionDetails } = useMatchSession();

  // Swimmer roster directly from session
  const swimmers =
    session.active_roster.length > 0 ? session.active_roster : DEFAULT_SWIMMING_ROSTER;

  // Selected swimmer for action modal
  const [selectedSwimmer, setSelectedSwimmer] = useState<AthleteRosterItem | null>(null);

  // Stopwatch state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [distanceVal, setDistanceVal] = useState("50");
  const [recordedSplits, setRecordedSplits] = useState<string[]>([]);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  // Keep sport_type synchronized
  useEffect(() => {
    if (session.sport_type !== "SWIMMING") {
      setSessionDetails({ sport_type: "SWIMMING" });
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

  // Open modal for selected swimmer
  const handleOpenSwimmerModal = (swimmer: AthleteRosterItem) => {
    setIsTimerRunning(false);
    setSelectedSwimmer(swimmer);
    const stats = swimmer.timing_stats;
    setElapsedMs(stats?.timer_seconds ? stats.timer_seconds * 1000 : 0);
    setDistanceVal(stats?.distance_meters ? String(stats.distance_meters) : "50");
    setRecordedSplits(stats?.split_times || []);
  };

  // Close modal and sync stats
  const handleCloseModal = () => {
    if (isTimerRunning && selectedSwimmer) {
      const finalFormatted = formatStopwatch(elapsedMs);
      updateTimingStats(selectedSwimmer.athlete_id, {
        timer_seconds: Math.floor(elapsedMs / 1000),
        formatted_time: finalFormatted,
      });
    }
    setIsTimerRunning(false);
    setSelectedSwimmer(null);
  };

  // Toggle stopwatch Play/Pause
  const toggleStopwatch = () => {
    if (!selectedSwimmer) return;

    if (isTimerRunning) {
      // Pause timer immediately!
      setIsTimerRunning(false);
      const finalTimeStr = formatStopwatch(elapsedMs);
      updateTimingStats(selectedSwimmer.athlete_id, {
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
    if (!selectedSwimmer) return;
    setIsTimerRunning(false);
    setElapsedMs(0);
    setRecordedSplits([]);
    updateTimingStats(selectedSwimmer.athlete_id, {
      timer_seconds: 0,
      formatted_time: "00:00.00",
      split_times: [],
    });
  };

  // Save Distance
  const handleSaveDistance = () => {
    if (!selectedSwimmer) return;
    const num = parseInt(distanceVal, 10) || 50;
    updateTimingStats(selectedSwimmer.athlete_id, {
      distance_meters: num,
    });
    Alert.alert("Distance Updated", `Distance set to ${num}M for #${selectedSwimmer.jersey_number} ${selectedSwimmer.last_name}`);
  };

  // Toggle Foul / DQ
  const handleToggleFoulDQ = () => {
    if (!selectedSwimmer) return;
    const currentStatus = !!selectedSwimmer.timing_stats?.is_foul_dq;
    const newStatus = !currentStatus;

    updateTimingStats(selectedSwimmer.athlete_id, {
      is_foul_dq: newStatus,
    });

    setSelectedSwimmer((prev) =>
      prev
        ? {
            ...prev,
            timing_stats: {
              ...(prev.timing_stats || { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 50, split_times: [], is_foul_dq: false }),
              is_foul_dq: newStatus,
            },
          }
        : null
    );
  };

  // Record Split Time
  const handleRecordSplit = () => {
    if (!selectedSwimmer) return;
    const currentFormatted = formatStopwatch(elapsedMs);
    const newSplits = [...recordedSplits, currentFormatted];
    setRecordedSplits(newSplits);

    updateTimingStats(selectedSwimmer.athlete_id, {
      split_times: newSplits,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 28) + 44 }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.brandTitle}>ATLETA</Text>
        <TouchableOpacity style={styles.closeHeaderBtn} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Sport Banner */}
      <View style={styles.sportBanner}>
        <Text style={styles.sportTitle}>SWIMMING</Text>
      </View>

      {/* Swimmers Stack Container */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {swimmers.map((swimmer) => {
          const timing = swimmer.timing_stats || {
            formatted_time: "00:00.00",
            distance_meters: 50,
            is_foul_dq: false,
          };
          const eventLabel = swimmer.position_or_event || `${timing.distance_meters || 50}M FREE`;

          return (
            <TouchableOpacity
              key={swimmer.athlete_id}
              style={styles.playerCard}
              onPress={() => handleOpenSwimmerModal(swimmer)}
              activeOpacity={0.85}
            >
              <View style={styles.playerCardHeader}>
                <Text style={styles.jerseyNumber}>{swimmer.jersey_number}</Text>
                <Ionicons name="chevron-forward" size={22} color="#FFFFFF" style={styles.chevronIcon} />
              </View>

              <Text style={styles.lastName}>{swimmer.last_name}</Text>
              <Text style={styles.eventSubtitle}>{eventLabel}</Text>

              {timing.formatted_time && timing.formatted_time !== "00:00.00" && (
                <Text style={styles.liveTimerDisplay}>TIME: {timing.formatted_time}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Floating Save Action Button */}
      <TouchableOpacity style={styles.floatingSaveBtn} onPress={onSaveMatch} activeOpacity={0.85}>
        <Ionicons name="save-outline" size={26} color="#070D19" />
      </TouchableOpacity>

      {/* Swimming Action White Bottom Sheet Modal */}
      <Modal
        visible={selectedSwimmer !== null}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                # {selectedSwimmer?.jersey_number} {selectedSwimmer?.last_name}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color="#0B1528" />
              </TouchableOpacity>
            </View>

            {/* 4-Tile White/Dark-Bordered Action Grid */}
            <View style={styles.gridContainer}>
              {/* TILE 1: TIMER */}
              <View style={styles.actionBox}>
                <View style={styles.actionBoxHeader}>
                  <Ionicons name="time-outline" size={24} color="#0B1528" />
                  <Text style={styles.actionBoxLabel}>TIMER</Text>
                </View>
                <Text style={styles.stopwatchText}>{formatStopwatch(elapsedMs)}</Text>
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
                  selectedSwimmer?.timing_stats?.is_foul_dq && styles.actionBoxActive,
                ]}
                onPress={handleToggleFoulDQ}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="flag-outline"
                  size={26}
                  color={selectedSwimmer?.timing_stats?.is_foul_dq ? "#EF4444" : "#0B1528"}
                />
                <Text style={styles.actionBoxLabel}>FOUL / DQ</Text>
                {selectedSwimmer?.timing_stats?.is_foul_dq && (
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default SwimmingMatchScreen;

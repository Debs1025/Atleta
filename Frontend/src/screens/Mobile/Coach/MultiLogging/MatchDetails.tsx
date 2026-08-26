import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/MatchDetails";
import { useMatchSession } from "./MatchSessionContext";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

interface MatchDetailsProps {
  onBack?: () => void;
  onDone?: () => void;
  onSaveComplete?: () => void;
}

export function MatchDetailsScreen({ onBack, onDone, onSaveComplete }: MatchDetailsProps) {
  const insets = useSafeAreaInsets();
  const { session, setSessionDetails, resetSession } = useMatchSession();

  // Local form state pre-populated from session
  const [gameName, setGameName] = useState(session.game_name || "ADNU vs. UNC - Intramurals 2026");
  const [opponentName, setOpponentName] = useState(session.opponent_team_name || "");
  const [gameType, setGameType] = useState<'Tournament' | 'Practice' | 'Tune-Up'>(
    session.game_type || "Tournament"
  );
  const [gameResult, setGameResult] = useState<'Win' | 'Lose'>(
    session.game_result || "Win"
  );
  const [notes, setNotes] = useState(session.notes || "");

  // Picker Modals state
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showResultPicker, setShowResultPicker] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

  const GAME_TYPES: ('Tournament' | 'Practice' | 'Tune-Up')[] = [
    "Tournament",
    "Practice",
    "Tune-Up",
  ];
  const GAME_RESULTS: ('Win' | 'Lose')[] = ["Win", "Lose"];

  // Combine active and bench rosters for statistics table
  const allPlayers = session.active_roster.concat(session.bench_roster);

  const handleSaveMatch = async () => {
    // Construct backend-ready match payload
    const updatedSession = {
      ...session,
      game_name: gameName,
      opponent_team_name: opponentName,
      game_type: gameType,
      game_result: gameResult,
      notes,
    };

    setSessionDetails(updatedSession);
    if (onSaveComplete) onSaveComplete();
    setShowSaveSuccessModal(true);

    try {
      await requestAuthenticatedJson("/matches/submit", "POST", {
        match_id: session.match_id || `match_${Date.now()}`,
        sport_type: session.sport_type || "BASKETBALL",
        match_name: gameName,
        opponent_team_name: opponentName,
        match_type: gameType,
        game_result: gameResult,
        notes,
        player_metrics: allPlayers.map((p) => {
          const item = p as any;
          return {
            athlete_id: p.athlete_id,
            athlete_name: p.full_name,
            sport_type: session.sport_type || "BASKETBALL",
            stats: {
              points: item.points || 0,
              assists: item.assists || 0,
              rebounds: item.rebounds || 0,
              steals: item.steals || 0,
              blocks: item.blocks || 0,
            },
          };
        }),
      });
    } catch (err) {
      console.warn("Backend match log submission error:", err);
    }
  };

  const formatNumber = (num?: number) => {
    const val = num || 0;
    return val < 10 ? `0${val}` : `${val}`;
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 28) + 44 }]}>
      {/* Header Bar (Preserved existing layout & spacing) */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowDiscardModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SAVE MATCH DETAILS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Game Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Game Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              placeholder="ADNU vs. UNC - Intramurals 2026"
              placeholderTextColor="#5C6B82"
              value={gameName}
              onChangeText={setGameName}
            />
          </View>
        </View>

        {/* Opponent Team Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Opponent Team Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              placeholder="Enter opponent name"
              placeholderTextColor="#5C6B82"
              value={opponentName}
              onChangeText={setOpponentName}
            />
          </View>
        </View>

        {/* Game Type Dropdown Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Game Type</Text>
          <TouchableOpacity
            style={styles.dropdownBox}
            onPress={() => setShowTypePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>{gameType}</Text>
            <Ionicons name="chevron-down" size={18} color="#8E9BAE" />
          </TouchableOpacity>
        </View>

        {/* Game Result Dropdown Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Game Result</Text>
          <TouchableOpacity
            style={styles.dropdownBox}
            onPress={() => setShowResultPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>{gameResult}</Text>
            <Ionicons name="chevron-down" size={18} color="#8E9BAE" />
          </TouchableOpacity>
        </View>

        {/* Notes / Coach Commentary */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notes / Coach Commentary</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add tactical notes here..."
            placeholderTextColor="#5C6B82"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* PLAYER STATISTICS Container */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeaderBlock}>
            <Text style={styles.statsTitle}>PLAYER STATISTICS</Text>
            <Text style={styles.scrollHintText}>↔ Scroll right for full stats</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {session.sport_type === "BASKETBALL" ? (
                <>
                  {/* Basketball Table Header */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableColPlayerHeader}>PLAYER</Text>
                    <Text style={styles.tableColHeader}>PTS</Text>
                    <Text style={styles.tableColHeader}>REB</Text>
                    <Text style={styles.tableColHeader}>AST</Text>
                    <Text style={styles.tableColHeader}>STL</Text>
                    <Text style={styles.tableColHeader}>PF</Text>
                    <Text style={styles.tableColHeader}>TO</Text>
                  </View>

                  {/* Basketball Table Rows */}
                  {allPlayers.map((player) => {
                    const stats = player.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 };
                    return (
                      <View key={player.athlete_id} style={styles.tableDataRow}>
                        <Text style={styles.tableColPlayer} numberOfLines={1}>
                          {player.full_name}
                        </Text>
                        <Text style={styles.tableColText}>{formatNumber(stats.pts)}</Text>
                        <Text style={styles.tableColText}>{formatNumber(stats.reb)}</Text>
                        <Text style={styles.tableColText}>{formatNumber(stats.ast)}</Text>
                        <Text style={styles.tableColText}>{formatNumber(stats.stl)}</Text>
                        <Text style={styles.tableColText}>{formatNumber(stats.pf)}</Text>
                        <Text style={styles.tableColText}>{formatNumber(stats.to)}</Text>
                      </View>
                    );
                  })}
                </>
              ) : (
                <>
                  {/* Timing Sports (Swimming / Track & Field) Table Header */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableColPlayerHeader}>PLAYER</Text>
                    <Text style={[styles.tableColHeader, { width: 85 }]}>DISTANCE</Text>
                    <Text style={[styles.tableColHeader, { width: 95 }]}>TIME / MARK</Text>
                    <Text style={[styles.tableColHeader, { width: 130 }]}>SPLIT TIME</Text>
                    <Text style={[styles.tableColHeader, { width: 80 }]}>STATUS</Text>
                  </View>

                  {/* Timing Sports Table Rows */}
                  {allPlayers.map((player) => {
                    const timing = player.timing_stats || {
                      timer_seconds: 0,
                      formatted_time: "00:00.00",
                      distance_meters: 50,
                      split_times: [],
                      is_foul_dq: false,
                    };
                    const displayDistance = timing.distance_meters
                      ? `${timing.distance_meters}M`
                      : player.position_or_event || "50M";

                    const splitDisplay =
                      timing.split_times && timing.split_times.length > 0
                        ? timing.split_times.join(", ")
                        : "N/A";

                    return (
                      <View key={player.athlete_id} style={styles.tableDataRow}>
                        <Text style={styles.tableColPlayer} numberOfLines={1}>
                          {player.full_name}
                        </Text>
                        <Text style={[styles.tableColText, { width: 85 }]} numberOfLines={1}>
                          {displayDistance}
                        </Text>
                        <Text style={[styles.tableColText, { width: 95 }]}>
                          {timing.formatted_time || "00:00.00"}
                        </Text>
                        <Text style={[styles.tableColText, { width: 130 }]} numberOfLines={1}>
                          {splitDisplay}
                        </Text>
                        <Text
                          style={[
                            styles.tableColText,
                            { width: 80, color: timing.is_foul_dq ? "#EF4444" : "#10B981" },
                          ]}
                        >
                          {timing.is_foul_dq ? "FOUL/DQ" : "CLEAN"}
                        </Text>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Vibrant Blue SAVE MATCH Button */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMatch} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>SAVE MATCH</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Game Type Selectable Picker Modal */}
      <Modal
        visible={showTypePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Game Type</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {GAME_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerOption,
                  gameType === type && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setGameType(type);
                  setShowTypePicker(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.pickerOptionText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Game Result Selectable Picker Modal */}
      <Modal
        visible={showResultPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResultPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Game Result</Text>
              <TouchableOpacity onPress={() => setShowResultPicker(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {GAME_RESULTS.map((result) => (
              <TouchableOpacity
                key={result}
                style={[
                  styles.pickerOption,
                  gameResult === result && styles.pickerOptionSelected,
                ]}
                onPress={() => {
                  setGameResult(result);
                  setShowResultPicker(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.pickerOptionText}>{result}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Discard Match Interruption Modal */}
      <Modal
        visible={showDiscardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.discardCard}>
            <Ionicons name="warning-outline" size={52} color="#FFFFFF" />
            <Text style={styles.discardTitle}>Discard Match?</Text>
            <Text style={styles.discardSubtitle}>
              Are you sure you want to discard this match? All recorded statistics and coach notes will be permanently lost
            </Text>

            <TouchableOpacity
              style={styles.discardPillBtn}
              onPress={() => setShowDiscardModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.discardPillBtnText}>Keep Editing</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.discardPillBtn, { marginBottom: 0 }]}
              onPress={() => {
                setShowDiscardModal(false);
                resetSession();
                if (onDone) onDone();
                else if (onBack) onBack();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.discardPillBtnText}>Yes, Discard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Save Match Success Interruption Modal */}
      <Modal
        visible={showSaveSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveSuccessModal(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle-outline" size={38} color="#00D2FF" />
            </View>
            <Text style={styles.successTitle}>Match Saved Successfully</Text>
            <Text style={styles.successSubtitle}>
              Match log for "{gameName}" ({gameResult}) has been saved and player statistics updated!
            </Text>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setShowSaveSuccessModal(false);
                resetSession();
                if (onDone) onDone();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default MatchDetailsScreen;

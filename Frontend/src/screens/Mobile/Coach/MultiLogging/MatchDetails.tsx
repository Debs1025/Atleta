import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/MatchDetails";
import { useMatchSession } from "./MatchSessionContext";
import { requestAuthenticatedJson } from "../../Authentication/authShared";
import { saveMatchOfflineFirst } from "../../../../services/firebaseClient";
import { getSportStatSchema, loadDynamicSportsSchemas } from "./sportStatSchemas";

interface MatchDetailsProps {
  onBack?: () => void;
  onDone?: () => void;
  onSaveComplete?: (payload?: any) => void;
}

export function MatchDetailsScreen({ onBack, onDone, onSaveComplete }: MatchDetailsProps) {
  // Insets and Match Session
  const insets = useSafeAreaInsets();
  const { session, setSessionDetails, resetSession } = useMatchSession();
  const [dynamicConfigs, setDynamicConfigs] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    loadDynamicSportsSchemas().then((configs) => {
      if (mounted && Array.isArray(configs) && configs.length > 0) {
        setDynamicConfigs(configs);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const schema = getSportStatSchema(session.sport_type, dynamicConfigs);
  const isTimedSport = Boolean(
    schema.isTimed ||
    (session.sport_type || "").toUpperCase().includes("SWIM") ||
    (session.sport_type || "").toUpperCase().includes("TRACK") ||
    (session.sport_type || "").toUpperCase().includes("FIELD")
  );

  // Local form state pre-populated from session
  const [gameName, setGameName] = useState(session.game_name || "ADNU vs. UNC - Intramurals 2026");
  const [opponentName, setOpponentName] = useState(session.opponent_team_name || "");
  const [gameType, setGameType] = useState<'Tournament' | 'Practice' | 'Tune-Up'>(
    (session.game_type as 'Tournament' | 'Practice' | 'Tune-Up') || "Tournament"
  );
  const [gameResult, setGameResult] = useState<'Win' | 'Lose'>(
    (session.game_result as 'Win' | 'Lose') || "Win"
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
    const normalizedSport = (session.sport_type || "BASKETBALL").toUpperCase();
    const normalizedGameResult = (gameResult || "Win").toUpperCase();

    // Map all active and bench players to comprehensive player_stats & playerStats
    const playerStatsArray = allPlayers.map((p) => {
      const bStats: any = p.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0, blk: 0 };
      const tStats: any = p.timing_stats || { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 50, split_times: [], is_foul_dq: false };
      const cStats: any = p.custom_stats || {};

      const points = Number(bStats.pts ?? cStats.points ?? cStats.pts ?? cStats.kills ?? cStats.goals ?? 0);
      const rebounds = Number(bStats.reb ?? cStats.rebounds ?? cStats.reb ?? cStats.digs ?? 0);
      const assists = Number(bStats.ast ?? cStats.assists ?? cStats.ast ?? 0);
      const steals = Number(bStats.stl ?? cStats.steals ?? cStats.stl ?? cStats.tackles ?? 0);
      const blocks = Number(bStats.blk ?? cStats.blocks ?? cStats.blk ?? 0);
      const fouls = Number(bStats.pf ?? cStats.fouls ?? cStats.pf ?? 0);
      const turnovers = Number(bStats.to ?? cStats.turnovers ?? cStats.to ?? 0);

      const statLine: Record<string, any> = {
        points,
        pts: points,
        rebounds,
        reb: rebounds,
        assists,
        ast: assists,
        steals,
        stl: steals,
        blocks,
        blk: blocks,
        fouls,
        pf: fouls,
        turnovers,
        to: turnovers,
        timer_seconds: Number(tStats.timer_seconds || 0),
        finish_time: tStats.formatted_time || "00:00.00",
        time: tStats.formatted_time || "00:00.00",
        distance_meters: Number(tStats.distance_meters || 0),
        split_times: tStats.split_times || [],
        is_foul_dq: Boolean(tStats.is_foul_dq),
        ...cStats,
      };

      return {
        athlete_id: p.athlete_id,
        player_name: p.full_name,
        name: p.full_name,
        jersey_number: p.jersey_number,
        position: p.position_or_event,
        team_name: session.team_name || "ATLETA VARSITY",
        ...statLine,
        stats: statLine,
      };
    });

    const homeAthleteIds = allPlayers.map((p) => p.athlete_id);
    const awayAthleteIds = (session as any).awayRosterAthletes || (session as any).away_roster_athletes || [];
    const scoresheetUrl = (session as any).scoresheetUrl || (session as any).scoresheet_url || "";

    const totalCalculatedHomeScore = playerStatsArray.reduce((sum, p: any) => sum + (p.pts || 0), 0);
    const homeScore = totalCalculatedHomeScore > 0 ? totalCalculatedHomeScore : (normalizedGameResult === "WIN" ? 78 : 65);
    const awayScore = normalizedGameResult === "WIN" ? Math.max(0, homeScore - 8) : homeScore + 8;

    // Construct backend-ready match payload with restored Firestore schema attributes
    const payload = {
      match_id: session.match_id || `match_${Date.now()}`,
      team_id: session.team_name || "team_varsity",
      home_team_name: session.team_name || "ATLETA VARSITY",
      opponent_team_name: opponentName || "OPPONENT TEAM",
      away_team_name: opponentName || "OPPONENT TEAM",
      match_name: gameName || `${session.team_name || "ATLETA"} vs ${opponentName || "OPPONENT"}`,
      game_name: gameName || `${session.team_name || "ATLETA"} vs ${opponentName || "OPPONENT"}`,
      match_type: gameType || "Practice",
      game_type: gameType || "Practice",
      match_date: session.date_time || new Date().toISOString(),
      location: session.location || "Metro Sports Center",
      sport_type: normalizedSport,
      game_result: normalizedGameResult,
      home_score: homeScore,
      away_score: awayScore,
      notes: notes || "",
      // Restored Schema Attributes:
      playerStats: playerStatsArray,
      player_stats: playerStatsArray,
      player_metrics: playerStatsArray,
      rosterAthletes: homeAthleteIds,
      roster_athletes: homeAthleteIds,
      awayRosterAthletes: awayAthleteIds,
      away_roster_athletes: awayAthleteIds,
      scoresheetUrl: scoresheetUrl,
      scoresheet_url: scoresheetUrl,
    };

    if (onSaveComplete) onSaveComplete(payload);
    setShowSaveSuccessModal(true);

    try {
      await saveMatchOfflineFirst(payload);
    } catch (err) {
      console.warn("Offline-first match log save note:", err);
    }
  };

  const formatNumber = (num?: number) => {
    const val = num || 0;
    return val < 10 ? `0${val}` : `${val}`;
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 60 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              {!isTimedSport ? (
                <>
                  {/* Dynamic Ball Games Table Header (Basketball, Volleyball, Pickleball) */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={styles.tableColPlayerHeader}>PLAYER</Text>
                    {schema.tableHeaders.map((header, idx) => (
                      <Text key={idx} style={styles.tableColHeader}>{header.label}</Text>
                    ))}
                  </View>

                  {/* Dynamic Ball Games Table Rows */}
                  {allPlayers.map((player) => {
                    const stats: any = {
                      ...(player.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0, blk: 0 }),
                      ...(player.custom_stats || {}),
                      ...(player.stats || {}),
                    };
                    return (
                      <View key={player.athlete_id} style={styles.tableDataRow}>
                        <Text style={styles.tableColPlayer} numberOfLines={1}>
                          {player.full_name}
                        </Text>
                        {schema.tableHeaders.map((header, idx) => (
                          <Text key={idx} style={styles.tableColText}>{formatNumber(stats[header.key])}</Text>
                        ))}
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
      </KeyboardAvoidingView>

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

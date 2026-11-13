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
  const [gameName, setGameName] = useState(
    session.game_name || session.match_name || ""
  );
  const [opponentName, setOpponentName] = useState(session.opponent_team_name || "");
  const [gameType, setGameType] = useState<string>(
    session.game_type || (isTimedSport ? "Championship" : "Tournament")
  );
  const [gameResult, setGameResult] = useState<string>(
    session.game_result || (isTimedSport ? "1st Place" : "Win")
  );
  const [notes, setNotes] = useState(session.notes || "");

  // Picker Modals state
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showResultPicker, setShowResultPicker] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);

  const GAME_TYPES: string[] = isTimedSport
    ? ["Championship", "Invitational", "Time Trials", "Qualifiers", "Practice"]
    : ["Tournament", "Practice", "Tune-Up"];
  const GAME_RESULTS: string[] = isTimedSport
    ? ["1st Place", "2nd Place", "3rd Place", "Podium", "Completed"]
    : ["Win", "Lose"];

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

      const eventName = (p as any).event_name || (p as any).event || p.position_or_event || "";
      const eventKey = (p as any).event_key || (tStats as any).event_key || "";
      const markVal = (p as any).mark || (tStats as any).mark || (p as any).distance || "";
      const timeVal = (tStats.formatted_time && tStats.formatted_time !== "00:00.00") ? tStats.formatted_time : ((p as any).finish_time || (p as any).time || "00:00.00");
      const distMeters = Number(tStats.distance_meters || (p as any).distance_meters || 0);
      const splitVal = tStats.split_times && tStats.split_times.length > 0 ? tStats.split_times.join(", ") : ((p as any).split || (p as any).split_time || "");
      const seedVal = (p as any).seed_time || (tStats as any).seed_time || "";
      const qtsVal = (p as any).qts || (tStats as any).qts || "";
      const rankVal = (p as any).rank || (normalizedGameResult === "WIN" ? 1 : 2);

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
        finish_time: timeVal,
        time: timeVal,
        distance_meters: distMeters,
        mark: markVal,
        time_or_distance: markVal || timeVal,
        event: eventName,
        event_name: eventName,
        event_key: eventKey,
        rank: rankVal,
        place: rankVal,
        split: splitVal,
        split_time: splitVal,
        split_times: tStats.split_times || [],
        seed_time: seedVal,
        qts: qtsVal,
        is_foul_dq: Boolean(tStats.is_foul_dq),
        ...cStats,
      };

      return {
        athlete_id: p.athlete_id,
        player_name: p.full_name,
        name: p.full_name,
        jersey_number: p.jersey_number,
        position: eventName || p.position_or_event,
        event: eventName,
        event_name: eventName,
        event_key: eventKey,
        time: timeVal,
        finish_time: timeVal,
        mark: markVal,
        time_or_distance: markVal || timeVal,
        distance_meters: distMeters,
        split: splitVal,
        split_time: splitVal,
        seed_time: seedVal,
        qts: qtsVal,
        rank: rankVal,
        place: rankVal,
        team_name: session.team_name || "ATLETA VARSITY",
        ...statLine,
        stats: statLine,
      };
    });

    const homeAthleteIds = allPlayers.map((p) => p.athlete_id);
    const awayAthleteIds = (session as any).awayRosterAthletes || (session as any).away_roster_athletes || [];
    const scoresheetUrl = (session as any).scoresheetUrl || (session as any).scoresheet_url || "";

    const totalCalculatedHomeScore = playerStatsArray.reduce((sum, p: any) => sum + (p.pts || 0), 0);
    const homeScore = isTimedSport
      ? undefined
      : (totalCalculatedHomeScore > 0 ? totalCalculatedHomeScore : (normalizedGameResult === "WIN" ? 78 : 65));
    const awayScore = isTimedSport
      ? undefined
      : (normalizedGameResult === "WIN" ? Math.max(0, (homeScore || 78) - 8) : (homeScore || 65) + 8);

    const firstStat = playerStatsArray[0];
    const defaultEvent = firstStat?.event || firstStat?.event_name || (normalizedSport.includes("SWIM") ? "Swimming Meet" : "Track & Field Meet");
    const defaultMatchTitle = isTimedSport
      ? (gameName.trim() || `${session.team_name || "ATLETA"} ${defaultEvent}`)
      : (gameName.trim() || `${session.team_name || "ATLETA"} vs ${opponentName || "OPPONENT"}`);

    // Construct backend-ready match payload with restored Firestore schema attributes
    const payload = {
      match_id: session.match_id || `match_${Date.now()}`,
      team_id: session.team_name || "team_varsity",
      home_team_name: session.team_name || "ATLETA VARSITY",
      opponent_team_name: isTimedSport ? (opponentName || "") : (opponentName || "OPPONENT TEAM"),
      away_team_name: isTimedSport ? (opponentName || "") : (opponentName || "OPPONENT TEAM"),
      match_name: defaultMatchTitle,
      game_name: defaultMatchTitle,
      match_type: gameType || (isTimedSport ? "Championship" : "Practice"),
      game_type: gameType || (isTimedSport ? "Championship" : "Practice"),
      match_date: session.date_time || new Date().toISOString(),
      location: session.location || "Metro Sports Center",
      sport_type: normalizedSport,
      game_result: normalizedGameResult,
      home_score: homeScore,
      away_score: awayScore,
      notes: notes || "",
      // Restored Schema Attributes:
      injuries: session.injuries || [],
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
          <Text style={styles.fieldLabel}>{isTimedSport ? "Meet / Event Name" : "Game Name"}</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inputText}
              placeholder={isTimedSport ? "2026 Inter-School Championship" : "ADNU vs. UNC - Intramurals 2026"}
              placeholderTextColor="#5C6B82"
              value={gameName}
              onChangeText={setGameName}
            />
          </View>
        </View>

        {/* Opponent Team Name - only for ball games */}
        {!isTimedSport && (
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
        )}

        {/* Game Type Dropdown Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{isTimedSport ? "Meet Type" : "Game Type"}</Text>
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
          <Text style={styles.fieldLabel}>{isTimedSport ? "Meet Result / Place" : "Game Result"}</Text>
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
            <View style={{ minWidth: Math.max(520, 140 + (schema?.tableHeaders?.reduce((acc, h) => acc + (h.width || 65), 0) || 500)) }}>
              {/* Table Header Row (Consistent across all sports and OCR logging) */}
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableColPlayerHeader}>
                  {(session.sport_type || "").toUpperCase().includes("SWIM")
                    ? "SWIMMER"
                    : (session.sport_type || "").toUpperCase().includes("TRACK") || (session.sport_type || "").toUpperCase().includes("FIELD")
                    ? "ATHLETE"
                    : "PLAYER"}
                </Text>
                {schema.tableHeaders.map((header, idx) => (
                  <Text
                    key={header.key || idx}
                    style={[
                      styles.tableColHeader,
                      header.width ? { width: header.width } : null,
                    ]}
                  >
                    {header.shortLabel || header.label}
                  </Text>
                ))}
              </View>

              {/* Table Data Rows */}
              {allPlayers.map((player) => {
                const bStats: any = player.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0, blk: 0 };
                const tStats: any = player.timing_stats || { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 50, split_times: [], is_foul_dq: false };
                const cStats: any = player.custom_stats || {};
                const pStats: any = player.stats || {};

                return (
                  <View key={player.athlete_id} style={styles.tableDataRow}>
                    <Text style={styles.tableColPlayer} numberOfLines={1}>
                      {player.full_name}
                    </Text>
                    {schema.tableHeaders.map((header, idx) => {
                      const val = (() => {
                        if (header.key === 'team_name' || header.key === 'team' || header.key === 'school') {
                          return (player as any).team_name || (player as any).team || session.team_name || "-";
                        }
                        if (header.key === 'event' || header.key === 'event_name' || header.key === 'discipline') {
                          return (player as any).event_name || (player as any).event || player.position_or_event || (tStats.distance_meters ? `${tStats.distance_meters}M` : "-");
                        }
                        if (header.key === 'finish_time' || header.key === 'time') {
                          return (tStats.formatted_time && tStats.formatted_time !== "00:00.00")
                            ? tStats.formatted_time
                            : ((player as any).finish_time || (player as any).time || "-");
                        }
                        if (header.key === 'time_or_distance') {
                          return (player as any).mark || (tStats as any).mark || ((tStats.formatted_time && tStats.formatted_time !== "00:00.00") ? tStats.formatted_time : ((player as any).time || "-"));
                        }
                        if (header.key === 'split' || header.key === 'split_time') {
                          return tStats.split_times && tStats.split_times.length > 0
                            ? tStats.split_times.join(", ")
                            : ((player as any).split || (player as any).split_time || "-");
                        }
                        if (header.key === 'seed_time') {
                          return (player as any).seed_time || (tStats as any).seed_time || "-";
                        }
                        if (header.key === 'qts') {
                          return (player as any).qts || (tStats as any).qts || "-";
                        }
                        if (header.key === 'rank' || header.key === 'place') {
                          return (player as any).rank !== undefined
                            ? (player as any).rank
                            : ((player as any).place !== undefined ? (player as any).place : (tStats.rank ?? (gameResult === "Win" ? 1 : 2)));
                        }
                        if (header.key === 'pts' || header.key === 'points') {
                          const ptsVal = (player as any).pts !== undefined
                            ? (player as any).pts
                            : ((player as any).points !== undefined ? (player as any).points : (bStats.pts ?? cStats.pts ?? cStats.points ?? 0));
                          return ptsVal;
                        }
                        const raw = bStats[header.key] ?? cStats[header.key] ?? pStats[header.key];
                        return raw !== undefined ? formatNumber(raw) : "-";
                      })();

                      return (
                        <Text
                          key={header.key || idx}
                          style={[
                            styles.tableColText,
                            header.width ? { width: header.width } : null,
                          ]}
                          numberOfLines={1}
                        >
                          {val !== undefined && val !== null && String(val).trim() !== "" ? String(val) : "-"}
                        </Text>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* INJURIES & SIDELINED ATHLETES */}
        <View style={[styles.statsCard, { marginTop: 14, borderColor: (session.injuries && session.injuries.length > 0) ? "rgba(255, 77, 109, 0.3)" : "#1E293B" }]}>
          <View style={[styles.statsHeaderBlock, { borderBottomColor: "rgba(255, 77, 109, 0.15)" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="medical" size={16} color="#FF4D6D" />
              <Text style={[styles.statsTitle, { color: "#FFFFFF" }]}>
                INJURIES LOGGED ({(session.injuries || []).length})
              </Text>
            </View>
            <Text style={{ color: "#FF4D6D", fontSize: 11, fontWeight: "700" }}>
              {(session.injuries || []).length > 0 ? "Sidelined" : "None"}
            </Text>
          </View>

          {(session.injuries && session.injuries.length > 0) ? (
            <View style={{ padding: 12, gap: 10 }}>
              {session.injuries.map((inj, idx) => (
                <View
                  key={inj.id || idx}
                  style={{
                    backgroundColor: "rgba(255, 77, 109, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 77, 109, 0.25)",
                    borderRadius: 10,
                    padding: 10,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>
                      {inj.player_name} #{inj.jersey_number || "00"}
                    </Text>
                    <Text style={{ color: "#FF4D6D", fontSize: 12, fontWeight: "700", marginTop: 2 }}>
                      {inj.injury_type || "Injured"} {inj.quarter_or_set ? `• ${inj.quarter_or_set}` : ""} • {inj.status || "Out"}
                    </Text>
                    {inj.notes ? (
                      <Text style={{ color: "#94A3B8", fontSize: 11, fontStyle: "italic", marginTop: 3 }}>
                        Note: {inj.notes}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ backgroundColor: "rgba(255, 77, 109, 0.2)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: "#FF4D6D", fontSize: 11, fontWeight: "800" }}>OUT</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
              <Text style={{ color: "#64748B", fontSize: 12, fontStyle: "italic" }}>
                No injuries reported or logged during this match.
              </Text>
            </View>
          )}
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
              <Text style={styles.pickerTitle}>{isTimedSport ? "Select Meet Type" : "Select Game Type"}</Text>
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
              <Text style={styles.pickerTitle}>{isTimedSport ? "Select Result / Placement" : "Select Game Result"}</Text>
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
                resetSession(false);
                if (onBack) onBack();
                else if (onDone) onDone();
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
                resetSession(true);
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

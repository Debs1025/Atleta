import React, { useState, useEffect } from "react";
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
import { styles } from "./styles/basketballMatch";
import { useMatchSession } from "./MatchSessionContext";
import { AthleteRosterItem } from "./types";
import { getSportStatSchema, loadDynamicSportsSchemas } from "./sportStatSchemas";

interface BasketballMatchProps {
  onClose?: () => void;
  onSaveMatch?: () => void;
}

const COMMON_INJURIES = [
  "Ankle Sprain",
  "Knee Strain",
  "Hamstring Strain",
  "Cramps",
  "Concussion",
  "Shoulder Strain",
  "Wrist Sprain",
  "Other",
];

const MATCH_PERIODS = ["Q1", "Q2", "Q3", "Q4", "OT"];

function normalizeBasketballKey(rawKey: string): { standardKey?: 'pts' | 'ast' | 'reb' | 'pf' | 'stl' | 'to' | 'blk'; isStandard: boolean } {
  const k = (rawKey || '').toLowerCase().trim();
  if (k === 'pts' || k === 'points' || k === 'pts_scored') return { standardKey: 'pts', isStandard: true };
  if (k === 'ast' || k === 'assists') return { standardKey: 'ast', isStandard: true };
  if (k === 'reb' || k === 'rebounds' || k === 'offensive_rebounds' || k === 'defensive_rebounds') return { standardKey: 'reb', isStandard: true };
  if (k === 'stl' || k === 'steals') return { standardKey: 'stl', isStandard: true };
  if (k === 'blk' || k === 'blocks') return { standardKey: 'blk', isStandard: true };
  if (k === 'pf' || k === 'fouls' || k === 'personal_fouls') return { standardKey: 'pf', isStandard: true };
  if (k === 'to' || k === 'turnovers') return { standardKey: 'to', isStandard: true };
  return { isStandard: false };
}

export function BasketballMatchScreen({ onClose, onSaveMatch }: BasketballMatchProps) {
  const insets = useSafeAreaInsets();
  const {
    session,
    updateBasketballStats,
    setSessionDetails,
    markAthleteInjured,
    returnAthleteFromInjury,
    removeInjury,
  } = useMatchSession();
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

  // Active, Bench & Injured rosters from session
  const activeRoster = session.active_roster || [];
  const benchRoster = session.bench_roster || [];
  const injuredRoster = session.injured_roster || [];

  // Rail drawer tab: 'bench' or 'injured'
  const [activeDrawerTab, setActiveDrawerTab] = useState<'bench' | 'injured'>('bench');

  // Selected bench player for substitution
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState<AthleteRosterItem | null>(null);

  // Selected player for "MORE" action modal (Restricted popup ONLY)
  const [selectedActionPlayer, setSelectedActionPlayer] = useState<AthleteRosterItem | null>(null);

  // Injury logging & details modal states
  const [showInjuryModal, setShowInjuryModal] = useState(false);
  const [injuryTargetPlayer, setInjuryTargetPlayer] = useState<AthleteRosterItem | null>(null);
  const [selectedInjuryType, setSelectedInjuryType] = useState(COMMON_INJURIES[0]);
  const [customInjuryType, setCustomInjuryType] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("In-Game");
  const [injuryNotes, setInjuryNotes] = useState("");
  const [selectedInjuredPlayerDetail, setSelectedInjuredPlayerDetail] = useState<AthleteRosterItem | null>(null);

  // Handle player selection for rotation substitution swap ONLY
  const handlePlayerCardPress = (activePlayer: AthleteRosterItem) => {
    if (selectedBenchPlayer) {
      // Execute rotation substitution swap
      const newActive = activeRoster.map((item) =>
        item.athlete_id === activePlayer.athlete_id
          ? { ...selectedBenchPlayer, is_active_on_field: true }
          : item
      );
      const newBench = benchRoster.map((item) =>
        item.athlete_id === selectedBenchPlayer.athlete_id
          ? { ...activePlayer, is_active_on_field: false }
          : item
      );

      setSessionDetails({ active_roster: newActive, bench_roster: newBench });
      setSelectedBenchPlayer(null);
    }
  };

  // Select/unselect bench player
  const handleBenchPlayerPress = (benchPlayer: AthleteRosterItem) => {
    if (selectedBenchPlayer?.athlete_id === benchPlayer.athlete_id) {
      setSelectedBenchPlayer(null);
    } else {
      setSelectedBenchPlayer(benchPlayer);
    }
  };

  // Open injury modal for a specific athlete
  const openInjuryModalForPlayer = (player: AthleteRosterItem) => {
    setInjuryTargetPlayer(player);
    setSelectedInjuryType(COMMON_INJURIES[0]);
    setCustomInjuryType("");
    setSelectedQuarter("In-Game");
    setInjuryNotes("");
    setShowInjuryModal(true);
  };

  // Confirm injury and sideline athlete
  const handleConfirmInjury = () => {
    if (!injuryTargetPlayer) {
      Alert.alert("Select Athlete", "Please select an athlete to report an injury for.");
      return;
    }

    const finalType = selectedInjuryType === "Other" && customInjuryType.trim()
      ? customInjuryType.trim()
      : selectedInjuryType;

    markAthleteInjured(injuryTargetPlayer.athlete_id, {
      injury_type: finalType,
      quarter_or_set: selectedQuarter,
      notes: injuryNotes.trim(),
      status: "Out / Sidelined",
      athlete: injuryTargetPlayer,
      player_name: injuryTargetPlayer.full_name || injuryTargetPlayer.last_name,
      jersey_number: injuryTargetPlayer.jersey_number,
      team: injuryTargetPlayer.team_name,
    });

    setShowInjuryModal(false);
    setActiveDrawerTab("injured");
    Alert.alert(
      "Athlete Sidelined",
      `${injuryTargetPlayer.full_name || injuryTargetPlayer.last_name} has been moved to the injury list (${finalType}).`
    );
  };

  // Return injured athlete to bench
  const handleReturnToBench = (athleteId: string) => {
    returnAthleteFromInjury(athleteId, "bench");
    setSelectedInjuredPlayerDetail(null);
    Alert.alert("Cleared for Play", "Player has been cleared and returned to the bench.");
  };

  // Remove injury record
  const handleRemoveInjuryRecord = (athleteId: string) => {
    const inj = (session.injuries || []).find((i) => i.athlete_id === athleteId);
    if (inj) {
      removeInjury(inj.id);
    } else {
      returnAthleteFromInjury(athleteId, "bench");
    }
    setSelectedInjuredPlayerDetail(null);
  };

  // Stat action handler for direct and modal stat updates
  const handleStatAction = (
    statKey: string,
    delta: number = 1
  ) => {
    if (!selectedActionPlayer) return;
    const targetId = selectedActionPlayer.athlete_id;

    // Update global context
    updateBasketballStats(targetId, statKey, delta);

    // Update local modal state so UI reflects change instantly
    setSelectedActionPlayer((prev) => {
      if (!prev) return null;
      const currentStats = prev.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0, blk: 0 };
      const customStats = prev.custom_stats || {};

      const norm = normalizeBasketballKey(statKey);
      let updatedBasketballStats = { ...currentStats };
      if (norm.isStandard && norm.standardKey) {
        const curVal = (currentStats as any)[norm.standardKey] || 0;
        (updatedBasketballStats as any)[norm.standardKey] = Math.max(0, curVal + delta);
      }
      const customVal = customStats[statKey] || 0;
      const updatedCustomStats = {
        ...customStats,
        [statKey]: Math.max(0, customVal + delta),
      };

      return {
        ...prev,
        basketball_stats: updatedBasketballStats,
        custom_stats: updatedCustomStats,
      };
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
        <Text style={styles.sportTitle}>{schema.sportDisplayName}</Text>
      </View>

      {/* Active On-Court Players Stack */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeRoster.map((player) => {
          const stats = player.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0, blk: 0 };
          const isSwapTarget = selectedBenchPlayer !== null;

          return (
            <View
              key={player.athlete_id}
              style={[
                styles.playerCard,
                isSwapTarget && styles.playerCardSelected,
              ]}
            >
              {/* Player Header & Substitution Indicator */}
              <View style={styles.playerCardHeader}>
                <TouchableOpacity
                  onPress={() => handlePlayerCardPress(player)}
                  activeOpacity={selectedBenchPlayer ? 0.75 : 1}
                  style={styles.playerInfoRow}
                >
                  <View style={styles.jerseyBadge}>
                    <Text style={styles.jerseyNumber}>#{player.jersey_number || '00'}</Text>
                  </View>
                  <Text style={styles.lastName} numberOfLines={1} ellipsizeMode="tail">
                    {player.last_name || player.full_name}
                  </Text>
                </TouchableOpacity>

                {selectedBenchPlayer ? (
                  <TouchableOpacity
                    onPress={() => handlePlayerCardPress(player)}
                    style={styles.benchBadge}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.benchBadgeText}>SUB #{selectedBenchPlayer.jersey_number}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.statsSummaryBadge}
                    onPress={() => setSelectedActionPlayer(player)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.statsSummary} numberOfLines={1}>
                      {schema.formatSummary(stats, player.custom_stats)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Action Buttons Row (Direct Taps - Curated for Speed) */}
              <View style={styles.quickActionRow}>
                {schema.primaryActions.map((action, aIdx) => (
                  <TouchableOpacity
                    key={aIdx}
                    style={styles.quickActionBtn}
                    onPress={() => updateBasketballStats(player.athlete_id, action.statKey, action.delta)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickActionBtnText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}

                {/* MORE Button: Opens clean categorized modal */}
                <TouchableOpacity
                  style={[styles.quickActionBtn, styles.moreBtn]}
                  onPress={() => setSelectedActionPlayer(player)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreBtnText}>MORE</Text>
                  <Ionicons name="chevron-forward" size={13} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Floating Save Action Button */}
      <TouchableOpacity
        style={styles.floatingSaveBtn}
        onPress={onSaveMatch}
        activeOpacity={0.85}
      >
        <Ionicons name="save-outline" size={26} color="#070D19" />
      </TouchableOpacity>

      {/* Bench & Injured Rail Drawer (Bottom Fixed Bar) */}
      <View style={styles.benchRailContainer}>
        <View style={styles.benchHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              style={styles.railTabBtn}
              onPress={() => setActiveDrawerTab("bench")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.benchTitle,
                  activeDrawerTab === "bench" ? { color: "#00D2FF" } : { color: "#64748B" },
                ]}
              >
                BENCH ({benchRoster.length})
              </Text>
            </TouchableOpacity>

            <View style={styles.railTabDivider} />

            <TouchableOpacity
              style={styles.railTabBtn}
              onPress={() => setActiveDrawerTab("injured")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="medical"
                size={13}
                color={activeDrawerTab === "injured" ? "#FF4D6D" : "#64748B"}
              />
              <Text
                style={[
                  styles.benchTitle,
                  activeDrawerTab === "injured" ? { color: "#FF4D6D" } : { color: "#64748B" },
                ]}
              >
                INJURED ({injuredRoster.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.benchHeaderActions}>
            <TouchableOpacity
              style={styles.logInjuryRailBtn}
              onPress={() => {
                setInjuryTargetPlayer(activeRoster[0] || benchRoster[0] || null);
                setSelectedInjuryType(COMMON_INJURIES[0]);
                setCustomInjuryType("");
                setSelectedQuarter("In-Game");
                setInjuryNotes("");
                setShowInjuryModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={13} color="#FF4D6D" />
              <Text style={styles.logInjuryRailBtnText}>LOG INJURY</Text>
            </TouchableOpacity>

            {activeDrawerTab === "bench" && (
              <MaterialCommunityIcons name="swap-vertical" size={22} color="#00D2FF" />
            )}
          </View>
        </View>

        {activeDrawerTab === "bench" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.benchListScroll}
          >
            {benchRoster.length === 0 ? (
              <Text style={styles.emptyRailText}>No reserve players on bench</Text>
            ) : (
              benchRoster.map((benchPlayer) => {
                const isSelected = selectedBenchPlayer?.athlete_id === benchPlayer.athlete_id;
                return (
                  <TouchableOpacity
                    key={benchPlayer.athlete_id}
                    style={styles.benchTileWrapper}
                    onPress={() => handleBenchPlayerPress(benchPlayer)}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.benchTile,
                        isSelected && styles.benchTileActive,
                      ]}
                    >
                      <Text style={styles.benchJerseyText}>{benchPlayer.jersey_number || '00'}</Text>
                    </View>
                    <Text style={styles.benchNameText} numberOfLines={1}>
                      {benchPlayer.last_name || benchPlayer.full_name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.benchListScroll}
          >
            {injuredRoster.length === 0 ? (
              <Text style={styles.emptyRailText}>No players currently sidelined with injury</Text>
            ) : (
              injuredRoster.map((injuredPlayer) => (
                <TouchableOpacity
                  key={injuredPlayer.athlete_id}
                  style={styles.benchTileWrapper}
                  onPress={() => setSelectedInjuredPlayerDetail(injuredPlayer)}
                  activeOpacity={0.8}
                >
                  <View style={styles.injuredTile}>
                    <Text style={styles.injuredJerseyText}>{injuredPlayer.jersey_number || '00'}</Text>
                    <View style={{ position: "absolute", top: 2, right: 2 }}>
                      <Ionicons name="medical" size={10} color="#FF4D6D" />
                    </View>
                  </View>
                  <Text style={styles.benchNameText} numberOfLines={1}>
                    {injuredPlayer.last_name || injuredPlayer.full_name}
                  </Text>
                  <Text style={styles.injuredBadgeText} numberOfLines={1}>
                    {injuredPlayer.injury_type || "Injured"}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* ORGANIZED "MORE" STATS MODAL */}
      <Modal
        visible={selectedActionPlayer !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedActionPlayer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 }}>
                <View style={styles.modalJerseyBadge}>
                  <Text style={styles.modalJerseyText}>#{selectedActionPlayer?.jersey_number || '00'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedActionPlayer?.full_name || selectedActionPlayer?.last_name}
                  </Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {schema.sportDisplayName} • {selectedActionPlayer?.position_or_event || 'Active'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedActionPlayer(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Body with Clean Categorization */}
            <ScrollView
              style={styles.modalScrollBody}
              contentContainerStyle={{ paddingBottom: 28 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Report Player Injury Quick Action */}
              <View style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Ionicons name="medical" size={15} color="#FF4D6D" />
                  <Text style={[styles.categoryTitle, { color: '#FF4D6D' }]}>PLAYER STATUS / INJURY</Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: "rgba(255, 77, 109, 0.12)",
                    borderWidth: 1,
                    borderColor: "#FF4D6D",
                    borderRadius: 10,
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onPress={() => {
                    const target = selectedActionPlayer;
                    setSelectedActionPlayer(null);
                    if (target) {
                      openInjuryModalForPlayer(target);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="medkit" size={17} color="#FF4D6D" />
                  <Text style={{ color: "#FF4D6D", fontSize: 12, fontWeight: "900", letterSpacing: 0.5 }}>
                    REPORT INJURY & SIDELINE PLAYER
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Organized Action Categories */}
              {schema.actionCategories && schema.actionCategories.length > 0 ? (
                schema.actionCategories.map((cat, cIdx) => (
                  <View key={cIdx} style={styles.categorySection}>
                    <View style={styles.categoryHeader}>
                      {cat.icon && <Ionicons name={cat.icon as any} size={15} color={cat.color || "#00D2FF"} />}
                      <Text style={[styles.categoryTitle, cat.color ? { color: cat.color } : null]}>
                        {cat.name}
                      </Text>
                    </View>

                    <View style={styles.categoryGrid}>
                      {cat.actions.map((act, aIdx) => (
                        <TouchableOpacity
                          key={aIdx}
                          style={[
                            styles.actionCard,
                            act.color ? { borderColor: `${act.color}40` } : null,
                          ]}
                          onPress={() => handleStatAction(act.statKey, act.delta)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.actionIconCircle, act.color ? { backgroundColor: `${act.color}18` } : null]}>
                            <Ionicons name={(act.icon || 'add') as any} size={20} color={act.color || '#00D2FF'} />
                          </View>
                          <Text style={[styles.actionCardLabel, act.color ? { color: act.color } : null]} numberOfLines={1}>
                            {act.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="flash-outline" size={15} color="#00D2FF" />
                    <Text style={styles.categoryTitle}>IN-GAME ACTIONS</Text>
                  </View>
                  <View style={styles.categoryGrid}>
                    {schema.secondaryActions.map((action, sIdx) => (
                      <TouchableOpacity
                        key={sIdx}
                        style={[styles.actionCard, action.color ? { borderColor: `${action.color}40` } : null]}
                        onPress={() => handleStatAction(action.statKey, action.delta)}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.actionIconCircle, action.color ? { backgroundColor: `${action.color}18` } : null]}>
                          <Ionicons name={(action.icon || 'add') as any} size={20} color={action.color || '#00D2FF'} />
                        </View>
                        <Text style={[styles.actionCardLabel, action.color ? { color: action.color } : null]}>
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Stat Corrections (Undo Section) */}
              <View style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Ionicons name="arrow-undo-outline" size={15} color="#EF4444" />
                  <Text style={[styles.categoryTitle, { color: '#EF4444' }]}>STAT CORRECTIONS (UNDO)</Text>
                </View>
                <View style={styles.undoGrid}>
                  {schema.tableHeaders.map((header, hIdx) => (
                    <TouchableOpacity
                      key={hIdx}
                      style={styles.undoBtn}
                      onPress={() => handleStatAction(header.key as any, -1)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="remove-circle-outline" size={13} color="#F87171" />
                      <Text style={styles.undoBtnText}>-1 {header.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LOG PLAYER INJURY MODAL */}
      <Modal
        visible={showInjuryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInjuryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="medkit" size={20} color="#FF4D6D" />
                <Text style={styles.modalTitle}>LOG PLAYER INJURY</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowInjuryModal(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollBody}
              contentContainerStyle={{ paddingBottom: 32 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Select Athlete (if multiple available) */}
              <Text style={[styles.modalSubtitle, { color: "#FFFFFF", fontWeight: "800", marginTop: 8, marginBottom: 8 }]}>
                SELECT INJURED ATHLETE
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                {[...activeRoster, ...benchRoster].map((p) => {
                  const isTarget = injuryTargetPlayer?.athlete_id === p.athlete_id;
                  return (
                    <TouchableOpacity
                      key={p.athlete_id}
                      style={[
                        styles.injuryChip,
                        isTarget && styles.injuryChipActive,
                      ]}
                      onPress={() => setInjuryTargetPlayer(p)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.injuryChipText, isTarget && styles.injuryChipTextActive]}>
                        #{p.jersey_number || '00'} {p.last_name || p.full_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Match Period / Quarter */}
              <Text style={[styles.modalSubtitle, { color: "#FFFFFF", fontWeight: "800", marginBottom: 8 }]}>
                GAME PERIOD / QUARTER
              </Text>
              <View style={styles.injuryChipRow}>
                {MATCH_PERIODS.map((q) => {
                  const isSel = selectedQuarter === q;
                  return (
                    <TouchableOpacity
                      key={q}
                      style={[styles.injuryChip, isSel && styles.injuryChipActive]}
                      onPress={() => setSelectedQuarter(q)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.injuryChipText, isSel && styles.injuryChipTextActive]}>{q}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Injury Type */}
              <Text style={[styles.modalSubtitle, { color: "#FFFFFF", fontWeight: "800", marginBottom: 8 }]}>
                INJURY TYPE
              </Text>
              <View style={styles.injuryChipRow}>
                {COMMON_INJURIES.map((inj) => {
                  const isSel = selectedInjuryType === inj;
                  return (
                    <TouchableOpacity
                      key={inj}
                      style={[styles.injuryChip, isSel && styles.injuryChipActive]}
                      onPress={() => setSelectedInjuryType(inj)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.injuryChipText, isSel && styles.injuryChipTextActive]}>{inj}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedInjuryType === "Other" && (
                <TextInput
                  style={{
                    backgroundColor: "#0E172A",
                    borderWidth: 1,
                    borderColor: "#1E293B",
                    borderRadius: 8,
                    color: "#FFFFFF",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                  placeholder="Specify injury type (e.g. Elbow Hyperextension)"
                  placeholderTextColor="#64748B"
                  value={customInjuryType}
                  onChangeText={setCustomInjuryType}
                />
              )}

              {/* Notes */}
              <Text style={[styles.modalSubtitle, { color: "#FFFFFF", fontWeight: "800", marginBottom: 8 }]}>
                TRAINER / COACH NOTES (OPTIONAL)
              </Text>
              <TextInput
                style={{
                  backgroundColor: "#0E172A",
                  borderWidth: 1,
                  borderColor: "#1E293B",
                  borderRadius: 8,
                  color: "#FFFFFF",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  minHeight: 64,
                  textAlignVertical: "top",
                  marginBottom: 16,
                }}
                placeholder="e.g. Landed awkwardly on opponent foot. Iced immediately."
                placeholderTextColor="#64748B"
                value={injuryNotes}
                onChangeText={setInjuryNotes}
                multiline
              />

              {/* Confirm Sideline Button */}
              <TouchableOpacity
                style={styles.confirmInjuryBtn}
                onPress={handleConfirmInjury}
                activeOpacity={0.85}
              >
                <Ionicons name="medical" size={18} color="#FFFFFF" />
                <Text style={styles.confirmInjuryBtnText}>CONFIRM & SIDELINE PLAYER</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* INJURED PLAYER DETAILS MODAL */}
      <Modal
        visible={selectedInjuredPlayerDetail !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInjuredPlayerDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "75%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.modalJerseyBadge, { borderColor: "#FF4D6D", backgroundColor: "rgba(255, 77, 109, 0.15)" }]}>
                  <Text style={[styles.modalJerseyText, { color: "#FF4D6D" }]}>
                    #{selectedInjuredPlayerDetail?.jersey_number || '00'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>
                    {selectedInjuredPlayerDetail?.full_name || selectedInjuredPlayerDetail?.last_name}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: "#FF4D6D" }]}>
                    SIDELINED • {selectedInjuredPlayerDetail?.injury_type || "Injured"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedInjuredPlayerDetail(null)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 16, gap: 12 }}>
              <View style={{ backgroundColor: "#0E172A", padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255, 77, 109, 0.2)" }}>
                <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700", marginBottom: 4 }}>INJURY STATUS</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800" }}>
                  {selectedInjuredPlayerDetail?.injury_type || "General Injury"} (Out / Sidelined)
                </Text>
                {selectedInjuredPlayerDetail?.injury_notes ? (
                  <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>
                    Notes: {selectedInjuredPlayerDetail.injury_notes}
                  </Text>
                ) : null}
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.returnToBenchBtn}
                onPress={() => selectedInjuredPlayerDetail && handleReturnToBench(selectedInjuredPlayerDetail.athlete_id)}
                activeOpacity={0.85}
              >
                <Ionicons name="fitness-outline" size={17} color="#00D2FF" />
                <Text style={styles.returnToBenchBtnText}>CLEAR PLAYER & RETURN TO BENCH</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => selectedInjuredPlayerDetail && handleRemoveInjuryRecord(selectedInjuredPlayerDetail.athlete_id)}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700" }}>Remove Injury Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default BasketballMatchScreen;

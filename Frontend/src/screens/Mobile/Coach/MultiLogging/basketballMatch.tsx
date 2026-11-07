import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
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
  const { session, updateBasketballStats, setSessionDetails } = useMatchSession();
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

  // Active & Bench rosters from session
  const activeRoster = session.active_roster;
  const benchRoster = session.bench_roster;

  // Selected bench player for substitution
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState<AthleteRosterItem | null>(null);

  // Selected player for "MORE" action modal (Restricted popup ONLY)
  const [selectedActionPlayer, setSelectedActionPlayer] = useState<AthleteRosterItem | null>(null);

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

      {/* Bench Rail Drawer (Bottom Fixed Bar) */}
      <View style={styles.benchRailContainer}>
        <View style={styles.benchHeader}>
          <Text style={styles.benchTitle}>BENCH ({benchRoster.length})</Text>
          <MaterialCommunityIcons name="swap-vertical" size={22} color="#00D2FF" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.benchListScroll}
        >
          {benchRoster.map((benchPlayer) => {
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
          })}
        </ScrollView>
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
    </View>
  );
}

export default BasketballMatchScreen;

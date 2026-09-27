import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/basketballMatch";
import { useMatchSession } from "./MatchSessionContext";
import { AthleteRosterItem } from "./types";

interface BasketballMatchProps {
  onClose?: () => void;
  onSaveMatch?: () => void;
}

export function BasketballMatchScreen({ onClose, onSaveMatch }: BasketballMatchProps) {
  const insets = useSafeAreaInsets();
  const { session, updateBasketballStats, setSessionDetails } = useMatchSession();

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
    statKey: keyof NonNullable<AthleteRosterItem["basketball_stats"]>,
    delta: number = 1
  ) => {
    if (!selectedActionPlayer) return;
    const targetId = selectedActionPlayer.athlete_id;

    // Update global context
    updateBasketballStats(targetId, statKey, delta);

    // Update local modal state so UI reflects change instantly
    setSelectedActionPlayer((prev) => {
      if (!prev) return null;
      const currentStats = prev.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 };
      return {
        ...prev,
        basketball_stats: {
          ...currentStats,
          [statKey]: Math.max(0, (currentStats[statKey] || 0) + delta),
        },
      };
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
        <Text style={styles.sportTitle}>BASKETBALL</Text>
      </View>

      {/* Active On-Court Players Stack */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeRoster.map((player) => {
          const stats = player.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 };
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
              <TouchableOpacity
                onPress={() => handlePlayerCardPress(player)}
                activeOpacity={selectedBenchPlayer ? 0.75 : 1}
                style={styles.playerCardHeader}
              >
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                  <Text style={styles.jerseyNumber}>#{player.jersey_number}</Text>
                  <Text style={styles.lastName}>{player.last_name}</Text>
                </View>

                {selectedBenchPlayer ? (
                  <View style={styles.benchBadge}>
                    <Text style={styles.benchBadgeText}>SUB #{selectedBenchPlayer.jersey_number}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.statsSummary}>
                      {stats.pts} PTS • {stats.ast} AST • {stats.reb} REB
                    </Text>
                    <TouchableOpacity
                      style={styles.moreActionsBtn}
                      onPress={() => setSelectedActionPlayer(player)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-vertical" size={18} color="#00D2FF" />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>

              {/* Quick Action Buttons Row (Direct Taps - No Popups) */}
              <View style={styles.quickActionRow}>
                {/* 1. Direct Tap: +1 PTS per individual tap */}
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => updateBasketballStats(player.athlete_id, "pts", 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickActionBtnText}>+PTS</Text>
                </TouchableOpacity>

                {/* 2. Direct Tap: +1 AST per tap */}
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => updateBasketballStats(player.athlete_id, "ast", 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickActionBtnText}>+AST</Text>
                </TouchableOpacity>

                {/* 3. Direct Tap: +1 REB per tap */}
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => updateBasketballStats(player.athlete_id, "reb", 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickActionBtnText}>+REB</Text>
                </TouchableOpacity>

                {/* 4. Restricted MORE Button: Houses secondary stats & fouls */}
                <TouchableOpacity
                  style={[styles.quickActionBtn, { borderColor: "#334155" }]}
                  onPress={() => setSelectedActionPlayer(player)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.quickActionBtnText, { color: "#94A3B8" }]}>MORE</Text>
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
                  <Text style={styles.benchJerseyText}>{benchPlayer.jersey_number}</Text>
                </View>
                <Text style={styles.benchNameText} numberOfLines={1}>
                  {benchPlayer.last_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* RESTRICTED POPUP: Secondary Stats & Corrections (Only opens when clicking MORE) */}
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
              <Text style={styles.modalTitle}>
                #{selectedActionPlayer?.jersey_number} {selectedActionPlayer?.last_name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedActionPlayer(null)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Secondary Stats Grid */}
            <View style={styles.gridContainer}>
              {/* FOUL */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("pf", 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="warning-outline" size={26} color="#EF4444" />
                <Text style={[styles.actionTileText, { color: "#EF4444" }]}>FOUL (+1 PF)</Text>
              </TouchableOpacity>

              {/* TURNOVER */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("to", 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={26} color="#F59E0B" />
                <Text style={[styles.actionTileText, { color: "#F59E0B" }]}>TURNOVER (+1 TO)</Text>
              </TouchableOpacity>

              {/* STEAL */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("stl", 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="hand-left-outline" size={26} color="#10B981" />
                <Text style={[styles.actionTileText, { color: "#10B981" }]}>STEAL (+1 STL)</Text>
              </TouchableOpacity>

              {/* BLOCK */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("blk" as any, 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark-outline" size={26} color="#00D2FF" />
                <Text style={styles.actionTileText}>BLOCK (+1 BLK)</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Multi-Point Field Goals inside More Menu */}
            <Text style={styles.modalSectionTitle}>Multi-Point Shots</Text>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
              <TouchableOpacity
                style={[styles.correctionBtn, { flex: 1, borderColor: "#00D2FF", backgroundColor: "rgba(0, 210, 255, 0.1)" }]}
                onPress={() => handleStatAction("pts", 2)}
                activeOpacity={0.8}
              >
                <Text style={[styles.correctionBtnText, { color: "#00D2FF", textAlign: "center" }]}>+2 PTS (FG)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.correctionBtn, { flex: 1, borderColor: "#00D2FF", backgroundColor: "rgba(0, 210, 255, 0.1)" }]}
                onPress={() => handleStatAction("pts", 3)}
                activeOpacity={0.8}
              >
                <Text style={[styles.correctionBtnText, { color: "#00D2FF", textAlign: "center" }]}>+3 PTS (3PT)</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Stat Corrections (Decrements) */}
            <Text style={styles.modalSectionTitle}>Stat Corrections (Undo)</Text>
            <View style={styles.correctionRow}>
              <TouchableOpacity
                style={styles.correctionBtn}
                onPress={() => handleStatAction("pts", -1)}
                activeOpacity={0.8}
              >
                <Text style={styles.correctionBtnText}>-1 PTS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.correctionBtn}
                onPress={() => handleStatAction("ast", -1)}
                activeOpacity={0.8}
              >
                <Text style={styles.correctionBtnText}>-1 AST</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.correctionBtn}
                onPress={() => handleStatAction("reb", -1)}
                activeOpacity={0.8}
              >
                <Text style={styles.correctionBtnText}>-1 REB</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.correctionBtn}
                onPress={() => handleStatAction("pf", -1)}
                activeOpacity={0.8}
              >
                <Text style={styles.correctionBtnText}>-1 PF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.correctionBtn}
                onPress={() => handleStatAction("to", -1)}
                activeOpacity={0.8}
              >
                <Text style={styles.correctionBtnText}>-1 TO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default BasketballMatchScreen;

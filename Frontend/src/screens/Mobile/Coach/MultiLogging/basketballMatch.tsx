import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/basketballMatch";
import { useMatchSession } from "./MatchSessionContext";
import { AthleteRosterItem } from "./types";

interface BasketballMatchProps {
  onClose?: () => void;
  onSaveMatch?: () => void;
}

// Sample Data
const DEFAULT_BASKETBALL_ACTIVE: AthleteRosterItem[] = [
  {
    athlete_id: "bb_30",
    jersey_number: "30",
    last_name: "SANTOS",
    full_name: "SANTOS",
    position_or_event: "Center",
    is_active_on_field: true,
    basketball_stats: { pts: 8, ast: 2, reb: 5, pf: 1, stl: 1, to: 0 },
  },
  {
    athlete_id: "bb_07",
    jersey_number: "07",
    last_name: "REYES",
    full_name: "REYES",
    position_or_event: "Power Forward",
    is_active_on_field: true,
    basketball_stats: { pts: 4, ast: 1, reb: 2, pf: 3, stl: 0, to: 1 },
  },
  {
    athlete_id: "bb_15",
    jersey_number: "15",
    last_name: "GARCIA",
    full_name: "GARCIA",
    position_or_event: "Small Forward",
    is_active_on_field: true,
    basketball_stats: { pts: 0, ast: 0, reb: 1, pf: 0, stl: 2, to: 0 },
  },
  {
    athlete_id: "bb_42",
    jersey_number: "42",
    last_name: "BAUTISTA",
    full_name: "BAUTISTA",
    position_or_event: "Point Guard",
    is_active_on_field: true,
    basketball_stats: { pts: 2, ast: 3, reb: 0, pf: 1, stl: 0, to: 1 },
  },
];

const DEFAULT_BASKETBALL_BENCH: AthleteRosterItem[] = [
  {
    athlete_id: "bb_11",
    jersey_number: "11",
    last_name: "BASA",
    full_name: "BASA",
    position_or_event: "Shooting Guard",
    is_active_on_field: false,
    basketball_stats: { pts: 4, ast: 5, reb: 6, pf: 2, stl: 1, to: 0 },
  },
  {
    athlete_id: "bb_22",
    jersey_number: "22",
    last_name: "LUNA",
    full_name: "LUNA",
    position_or_event: "Guard",
    is_active_on_field: false,
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
  },
  {
    athlete_id: "bb_03",
    jersey_number: "03",
    last_name: "CRUZ",
    full_name: "CRUZ",
    position_or_event: "Forward",
    is_active_on_field: false,
    basketball_stats: { pts: 1, ast: 0, reb: 2, pf: 1, stl: 0, to: 0 },
  },
  {
    athlete_id: "bb_09",
    jersey_number: "09",
    last_name: "VILLA",
    full_name: "VILLA",
    position_or_event: "Guard",
    is_active_on_field: false,
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
  },
  {
    athlete_id: "bb_18",
    jersey_number: "18",
    last_name: "RAMOS",
    full_name: "RAMOS",
    position_or_event: "Center",
    is_active_on_field: false,
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
  },
];

export function BasketballMatchScreen({ onClose, onSaveMatch }: BasketballMatchProps) {
  const insets = useSafeAreaInsets();
  const { session, updateBasketballStats, setSessionDetails } = useMatchSession();

  // Active & Bench rosters from session
  const activeRoster = session.active_roster.length > 0 ? session.active_roster : DEFAULT_BASKETBALL_ACTIVE;
  const benchRoster = session.bench_roster;

  // Selected bench player for substitution
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState<AthleteRosterItem | null>(null);

  // Selected player for action modal
  const [selectedActionPlayer, setSelectedActionPlayer] = useState<AthleteRosterItem | null>(null);

  // Shot tally sub-modal
  const [showShotModal, setShowShotModal] = useState(false);

  // Handle player selection & rotation substitution swap
  const handlePlayerCardPress = (activePlayer: AthleteRosterItem) => {
    if (selectedBenchPlayer) {
      // Execute rotation substitution swap!
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
    } else {
      // Trigger Action Modal for active player
      setSelectedActionPlayer(activePlayer);
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

  // Stat action handler
  const handleStatAction = (statKey: keyof NonNullable<AthleteRosterItem["basketball_stats"]>, delta: number = 1) => {
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
            <TouchableOpacity
              key={player.athlete_id}
              style={[
                styles.playerCard,
                isSwapTarget && styles.playerCardSelected,
              ]}
              onPress={() => handlePlayerCardPress(player)}
              activeOpacity={0.85}
            >
              <View style={styles.playerCardHeader}>
                <Text style={styles.jerseyNumber}>{player.jersey_number}</Text>
                {selectedBenchPlayer ? (
                  <View style={styles.benchBadge}>
                    <Text style={styles.benchBadgeText}>{selectedBenchPlayer.jersey_number}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={22} color="#00D2FF" style={styles.chevronIcon} />
                )}
              </View>

              <Text style={styles.lastName}>{player.last_name}</Text>

              <Text style={styles.statsSummary}>
                {stats.pts} PTS | {stats.ast} AST | {stats.reb} REB | {stats.pf} PF
              </Text>
            </TouchableOpacity>
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

      {/* Basketball Player Action Modal */}
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

            {/* 6-Tile Action Grid */}
            <View style={styles.gridContainer}>
              {/* SHOT */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => setShowShotModal(true)}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="basketball-ball" size={26} color="#00D2FF" />
                <Text style={styles.actionTileText}>SHOT</Text>
              </TouchableOpacity>

              {/* ASSIST */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("ast", 1)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="gesture-tap-button" size={28} color="#00D2FF" />
                <Text style={styles.actionTileText}>ASSIST</Text>
              </TouchableOpacity>

              {/* FOUL */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("pf", 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="warning-outline" size={26} color="#00D2FF" />
                <Text style={styles.actionTileText}>FOUL</Text>
              </TouchableOpacity>

              {/* REBOUND */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("reb", 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="diamond-outline" size={26} color="#00D2FF" />
                <Text style={styles.actionTileText}>REBOUND</Text>
              </TouchableOpacity>

              {/* TURNOVER */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("to", 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={26} color="#00D2FF" />
                <Text style={styles.actionTileText}>TURNOVER</Text>
              </TouchableOpacity>

              {/* STEAL */}
              <TouchableOpacity
                style={styles.actionTile}
                onPress={() => handleStatAction("stl", 1)}
                activeOpacity={0.8}
              >
                <Ionicons name="hand-left-outline" size={26} color="#00D2FF" />
                <Text style={styles.actionTileText}>STEAL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Shot Points Tally Modal */}
      <Modal
        visible={showShotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.shotModalCard}>
            <Text style={styles.shotModalTitle}>RECORD SHOT</Text>

            <TouchableOpacity
              style={styles.shotBtn}
              onPress={() => {
                handleStatAction("pts", 1);
                setShowShotModal(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.shotBtnText}>+1 FT (Free Throw)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shotBtn}
              onPress={() => {
                handleStatAction("pts", 2);
                setShowShotModal(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.shotBtnText}>+2 FG (Field Goal)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shotBtn}
              onPress={() => {
                handleStatAction("pts", 3);
                setShowShotModal(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.shotBtnText}>+3 3PT (Three-Pointer)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shotBtn, { backgroundColor: "#1C0D19", borderColor: "#EF4444" }]}
              onPress={() => setShowShotModal(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.shotBtnText, { color: "#EF4444" }]}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default BasketballMatchScreen;

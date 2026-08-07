import React, { useState, useMemo, useCallback } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import styles from "./styles/ViewAllPlayers";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RosterAthlete, Team } from "../DataTypes";

const SPORT_CATEGORIES = ["ALL", "BASKETBALL", "TRACK AND FIELD", "SWIMMING"];

const fontPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

const fontBoldPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-black",
  default: "sans-serif",
});

interface ViewAllPlayersProps {
  athletesPool: RosterAthlete[];
  teams: Team[];
  onBack: () => void;
  onLogout?: () => void;
}

export function ViewAllPlayers({
  athletesPool,
  teams,
  onBack,
}: ViewAllPlayersProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  // Map athlete ID to team name dynamically
  const athleteTeamMap = useMemo(() => {
    const map: Record<string, string> = {};
    teams.forEach((t) => {
      t.roster_list.forEach((p) => {
        map[p.athlete_id] = t.team_name;
      });
    });
    return map;
  }, [teams]);

  // Reactive player filtering
  const filteredPlayers = useMemo(() => {
    return athletesPool.filter((p) => {
      const matchesCategory = activeCategory === "ALL" || p.sport_type === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const teamName = athleteTeamMap[p.athlete_id] || "";
      const matchesSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        p.jersey_number.includes(q) ||
        teamName.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [athletesPool, activeCategory, searchQuery, athleteTeamMap]);

  const handleViewStats = useCallback((player: RosterAthlete) => {
    Alert.alert(
      "Player Profile & Stats",
      `Viewing official performance stats for ${player.full_name} (${player.position} #${player.jersey_number})`
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* FIXED TOP HEADER BAR */}
      <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={{ marginRight: 14 }} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Players</Text>
        </View>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 54, paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search player, position, or team..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Sports Category Filter Pills */}
        <View style={styles.filterSection}>
          <View style={styles.filterLabelRow}>
            <Text style={styles.filterLabel}>SPORTS CATEGORIES</Text>
            <Text style={styles.badgeCount}>{filteredPlayers.length} Athletes</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {SPORT_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Players List Container */}
        <View style={styles.playersListContainer}>
          {filteredPlayers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={36} color="#64748B" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>No matching players found.</Text>
            </View>
          ) : (
            filteredPlayers.map((player, index) => {
              const teamName = athleteTeamMap[player.athlete_id] || player.sport_type;
              const formattedPos =
                player.position === "PG"
                  ? "POINT GUARD"
                  : player.position === "SG"
                  ? "SHOOTING GUARD"
                  : player.position === "SF"
                  ? "SMALL FORWARD"
                  : player.position === "PF"
                  ? "POWER FORWARD"
                  : player.position === "C"
                  ? "CENTER"
                  : player.position;

              return (
                <View
                  key={player.athlete_id}
                  style={[
                    styles.playerCardRow,
                    index < filteredPlayers.length - 1 && styles.playerRowBorder,
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.playerName}>{player.full_name}</Text>
                    <Text style={styles.playerMeta}>
                      {formattedPos} • #{player.jersey_number}
                    </Text>
                    <Text style={styles.teamTag}>{teamName}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.viewStatsButton}
                    onPress={() => handleViewStats(player)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewStatsText}>View Stats</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}



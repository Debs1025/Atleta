import React, { useState, useMemo, useCallback } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
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
  const headerTopPadding = Math.max(insets.top, 44) + 20;

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070D19",
  },
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#070D19",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14.5,
    fontFamily: fontPlatform,
  },
  filterSection: {
    marginBottom: 22,
  },
  filterLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterLabel: {
    color: "#5C6B82",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
  },
  badgeCount: {
    color: "#00C8FF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  pillInactive: {
    backgroundColor: "#070D19",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  pillActive: {
    backgroundColor: "#00C8FF",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  pillTextInactive: {
    color: "#94A3B8",
  },
  pillTextActive: {
    color: "#070D19",
  },
  playersListContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  playerCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  playerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
    marginBottom: 2,
  },
  playerMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: fontPlatform,
    marginBottom: 2,
  },
  teamTag: {
    color: "#00C8FF",
    fontSize: 11.5,
    fontWeight: "700",
    fontFamily: fontPlatform,
  },
  viewStatsButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewStatsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: fontPlatform,
  },
});

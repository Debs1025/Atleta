import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MatchHistoryItem } from "../DataTypes";
import { styles } from "./styles/matchHistory";

interface MatchHistoryProps {
  onClose: () => void;
  onSelectMatchItem: (matchItem: MatchHistoryItem) => void;
  historyItems?: MatchHistoryItem[];
  sportCategory?: string;
  onClearHistory?: () => Promise<void> | void;
}

const SPORT_FILTERS = [
  { key: "ALL", label: "ALL" },
  { key: "SWIMMING", label: "SWIMMING" },
  { key: "TRACK AND FIELD", label: "TRACK & FIELD" },
  { key: "BASKETBALL", label: "BASKETBALL" },
  { key: "VOLLEYBALL", label: "VOLLEYBALL" },
];

export const MatchHistory: React.FC<MatchHistoryProps> = ({
  onClose,
  onSelectMatchItem,
  historyItems = [],
  sportCategory,
  onClearHistory,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;

  // Search and Sport Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSportFilter, setSelectedSportFilter] = useState<string>(
    sportCategory ? sportCategory.toUpperCase() : "ALL"
  );
  const [isClearing, setIsClearing] = useState(false);

  // Filter matches based on search query and active sport filter
  const filteredMatches = useMemo(() => {
    return historyItems.filter((item) => {
      // 1. Sport Filter
      if (selectedSportFilter && selectedSportFilter !== "ALL") {
        const itemSport = (item.sport_category || "").toUpperCase();
        const targetFilter = selectedSportFilter.toUpperCase();
        if (targetFilter.includes("TRACK") || targetFilter.includes("FIELD")) {
          if (!itemSport.includes("TRACK") && !itemSport.includes("FIELD")) return false;
        } else if (targetFilter.includes("SWIM")) {
          if (!itemSport.includes("SWIM")) return false;
        } else if (targetFilter.includes("BASKET")) {
          if (!itemSport.includes("BASKET")) return false;
        } else if (targetFilter.includes("VOLLEY")) {
          if (!itemSport.includes("VOLLEY")) return false;
        } else if (itemSport !== targetFilter) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (item.game_name || item.match_name || item.event_or_opponent || "").toLowerCase();
        const sport = (item.sport_category || "").toLowerCase();
        const loc = (item.location || "").toLowerCase();
        const matchDate = (item.date_formatted || item.full_date || "").toLowerCase();
        const athleteNames = (Array.isArray(item.player_stats) ? item.player_stats : Array.isArray(item.playerStats) ? item.playerStats : [])
          .map((p: any) => (p.player_name || p.name || p.full_name || "").toLowerCase())
          .join(" ");

        const matches =
          matchName.includes(q) ||
          sport.includes(q) ||
          loc.includes(q) ||
          athleteNames.includes(q) ||
          matchDate.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [historyItems, selectedSportFilter, searchQuery]);

  // Group filtered items chronologically by date_group (e.g. MATCH LOGS, OCTOBER 2026)
  const groupedMatches = useMemo(() => {
    const map: { [key: string]: MatchHistoryItem[] } = {};
    filteredMatches.forEach((item) => {
      const group = item.date_group || "MATCH LOGS";
      if (!map[group]) map[group] = [];
      map[group].push(item);
    });
    return map;
  }, [filteredMatches]);

  const handleConfirmClear = () => {
    if (historyItems.length === 0) {
      Alert.alert("No Matches", "There are no matches in your history to clear.");
      return;
    }
    Alert.alert(
      "Clear Match History",
      "Are you sure you want to clear your match history? This will permanently delete your recorded match logs.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear History",
          style: "destructive",
          onPress: async () => {
            try {
              setIsClearing(true);
              if (onClearHistory) {
                await onClearHistory();
              }
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to clear match history.");
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>MATCH HISTORY</Text>
          <Text style={styles.headerSubtitle}>
            {filteredMatches.length} {filteredMatches.length === 1 ? "Record" : "Records"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {historyItems.length > 0 && onClearHistory && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleConfirmClear}
              disabled={isClearing}
              activeOpacity={0.7}
            >
              {isClearing ? (
                <ActivityIndicator size="small" color="#FF4D6D" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color="#FF4D6D" />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search match, athlete, event..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.trim().length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Sport Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {SPORT_FILTERS.map((filter) => {
            const isSelected = selectedSportFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedSportFilter(filter.key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Match Cards List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={44} color="#475569" />
            <Text style={styles.emptyTitle}>No Matches Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? `No match records matching "${searchQuery}"`
                : `No ${selectedSportFilter !== "ALL" ? `${selectedSportFilter} ` : ""}match history recorded yet.`}
            </Text>
          </View>
        ) : (
          Object.keys(groupedMatches).map((groupKey) => (
            <View key={groupKey}>
              {/* Group Header */}
              <View style={styles.dateGroupHeader}>
                <View style={styles.dateAccentIndicator} />
                <Text style={styles.dateGroupText}>{groupKey}</Text>
              </View>

              {/* List of Match Cards */}
              {groupedMatches[groupKey].map((item) => {
                const sportUpper = (item.sport_category || (item as any).sport || (item as any).sport_type || "").toUpperCase();
                const isTimed =
                  sportUpper.includes("SWIM") ||
                  sportUpper.includes("TRACK") ||
                  sportUpper.includes("FIELD") ||
                  sportUpper.includes("RUN");

                // Extract best stat / entry for display
                const firstStat =
                  Array.isArray(item.player_stats) && item.player_stats.length > 0
                    ? item.player_stats[0]
                    : Array.isArray(item.playerStats) && item.playerStats.length > 0
                    ? item.playerStats[0]
                    : null;

                // 1. Resolve Event / Title:
                let displayTitle = item.event_or_opponent;
                if (isTimed) {
                  const statEvent = firstStat?.event || firstStat?.event_name || "";
                  const cleanMeetName = (item.game_name || item.match_name || "")
                    .replace(/\s*vs\s*OPPONENT.*$/i, "")
                    .trim();
                  if (cleanMeetName && !cleanMeetName.toLowerCase().includes("vs")) {
                    displayTitle =
                      statEvent && !cleanMeetName.includes(statEvent)
                        ? `${cleanMeetName} • ${statEvent}`
                        : cleanMeetName;
                  } else if (statEvent) {
                    displayTitle = statEvent;
                  } else if (item.event_or_opponent && !item.event_or_opponent.toLowerCase().includes("vs")) {
                    displayTitle = item.event_or_opponent;
                  } else {
                    displayTitle = sportUpper.includes("SWIM") ? "Swimming Meet" : "Track & Field Meet";
                  }
                }

                // 2. Resolve Score / Summary:
                // FOR SWIMMING AND TRACK & FIELD: DO NOT DISPLAY TIME/DISTANCE!
                // Because multiple athletes in the meet have different individual times.
                const athleteCount =
                  Array.isArray(item.player_stats) && item.player_stats.length > 0
                    ? item.player_stats.length
                    : Array.isArray(item.playerStats) && item.playerStats.length > 0
                    ? item.playerStats.length
                    : Array.isArray(item.roster_athletes) && item.roster_athletes.length > 0
                    ? item.roster_athletes.length
                    : Array.isArray(item.athlete_ids) && item.athlete_ids.length > 0
                    ? item.athlete_ids.length
                    : 0;

                let displayScoreOrSummary = item.score_or_time_summary;
                if (
                  isTimed ||
                  String(displayScoreOrSummary || "").toLowerCase().includes("time:") ||
                  String(displayScoreOrSummary || "").toLowerCase().includes("00:00.00") ||
                  String(displayScoreOrSummary || "").toLowerCase().includes("mark:")
                ) {
                  displayScoreOrSummary =
                    athleteCount > 0
                      ? `${athleteCount} ${athleteCount === 1 ? "Athlete" : "Athletes"} Logged`
                      : "Official Meet Results";
                } else {
                  // For Team Sports (Basketball, Volleyball)
                  const isBasketballScorePattern = /^\s*\d+\s*[-:]\s*\d+\s*$/.test(
                    item.score_or_time_summary || ""
                  );
                  if (
                    !isBasketballScorePattern &&
                    item.home_score !== undefined &&
                    item.away_score !== undefined
                  ) {
                    displayScoreOrSummary = `${item.home_score} - ${item.away_score}`;
                  }
                }

                // 3. Resolve Badge:
                let badgeSubtext = isTimed ? "PLACE" : "RESULT";
                let badgeMainText = (item.result_badge_text || "")
                  .replace(/^RESULT\s*/i, "")
                  .trim();
                if (isTimed) {
                  const allRanks = (item.player_stats || [])
                    .map((p: any) => {
                      const r =
                        p.rank ??
                        p.place ??
                        p.placement_rank ??
                        (p.stats && (p.stats.rank ?? p.stats.place ?? p.stats.placement_rank));
                      const num = Number(String(r).replace(/[^\d]/g, ""));
                      return !isNaN(num) && num > 0 ? num : null;
                    })
                    .filter((n: any): n is number => n !== null);
                  const rawRank =
                    allRanks.length > 0
                      ? Math.min(...allRanks)
                      : firstStat?.rank ||
                        firstStat?.place ||
                        firstStat?.placement_rank ||
                        (item as any).rank ||
                        (item as any).place ||
                        (item as any).placement_rank;
                  const parsedRank =
                    typeof rawRank === "number"
                      ? rawRank
                      : parseInt(String(rawRank || "").replace(/[^\d]/g, ""), 10);

                  if (parsedRank === 1) {
                    badgeMainText = "1ST";
                    badgeSubtext = "PLACE";
                  } else if (parsedRank === 2) {
                    badgeMainText = "2ND";
                    badgeSubtext = "PLACE";
                  } else if (parsedRank === 3) {
                    badgeMainText = "3RD";
                    badgeSubtext = "PLACE";
                  } else if (parsedRank && parsedRank > 3) {
                    badgeSubtext = "RANK";
                    badgeMainText = `#${parsedRank}`;
                  } else if (badgeMainText.includes("1ST")) {
                    badgeMainText = "1ST";
                    badgeSubtext = "PLACE";
                  } else if (badgeMainText.includes("2ND")) {
                    badgeMainText = "2ND";
                    badgeSubtext = "PLACE";
                  } else if (badgeMainText.includes("3RD")) {
                    badgeMainText = "3RD";
                    badgeSubtext = "PLACE";
                  } else if (badgeMainText.includes("4TH") || badgeMainText.includes("#4")) {
                    badgeSubtext = "RANK";
                    badgeMainText = "#4";
                  } else {
                    badgeSubtext = "RESULT";
                    badgeMainText = "DONE";
                  }
                }

                return (
                  <TouchableOpacity
                    key={item.match_id}
                    style={styles.matchCard}
                    onPress={() => onSelectMatchItem(item)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.matchLeft}>
                      <Text style={styles.subtext}>
                        {item.date_formatted} • {item.sport_category}
                      </Text>
                      <Text style={styles.eventTitle}>{displayTitle}</Text>
                      <Text style={styles.summaryScore}>
                        {displayScoreOrSummary}
                      </Text>
                    </View>

                    <View style={styles.resultBadgeBorder}>
                      <Text style={styles.resultBadgeSubtext}>{badgeSubtext}</Text>
                      <Text style={styles.resultBadgeMainText}>{badgeMainText}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default MatchHistory;

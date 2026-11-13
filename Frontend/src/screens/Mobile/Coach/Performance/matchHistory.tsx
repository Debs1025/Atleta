import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({
  onClose,
  onSelectMatchItem,
  historyItems = [],
  sportCategory,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;

  // Filter and group items chronologically by date_group (e.g. OCTOBER 2026, SEPTEMBER 2026)
  const groupedMatches = useMemo(() => {
    const map: { [key: string]: MatchHistoryItem[] } = {};
    const filtered = sportCategory
      ? historyItems.filter(
        (item) =>
          item.sport_category.toUpperCase() === sportCategory.toUpperCase()
      )
      : historyItems;

    filtered.forEach((item) => {
      const group = item.date_group || "OCTOBER 2026";
      if (!map[group]) map[group] = [];
      map[group].push(item);
    });
    return map;
  }, [historyItems, sportCategory]);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Text style={styles.headerTitle}>MATCH HISTORY</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {Object.keys(groupedMatches).map((groupKey) => (
          <View key={groupKey}>
            {/* Group Header */}
            <View style={styles.dateGroupHeader}>
              <View style={styles.dateAccentIndicator} />
              <Text style={styles.dateGroupText}>{groupKey}</Text>
            </View>

            {/* List of Match Cards */}
            {groupedMatches[groupKey].map((item) => {
              const sportUpper = (item.sport_category || "").toUpperCase();
              const isTimed = sportUpper.includes("SWIM") || sportUpper.includes("TRACK") || sportUpper.includes("FIELD");

              // Extract best stat / entry for display
              const firstStat = (Array.isArray(item.player_stats) && item.player_stats.length > 0)
                ? item.player_stats[0]
                : (Array.isArray(item.playerStats) && item.playerStats.length > 0 ? item.playerStats[0] : null);

              // 1. Resolve Event / Title:
              let displayTitle = item.event_or_opponent;
              if (isTimed) {
                const statEvent = firstStat?.event || firstStat?.event_name || "";
                const cleanMeetName = (item.game_name || item.match_name || "").replace(/\s*vs\s*OPPONENT.*$/i, "").trim();
                if (cleanMeetName && !cleanMeetName.toLowerCase().includes("vs")) {
                  displayTitle = statEvent && !cleanMeetName.includes(statEvent)
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

              // 2. Resolve Score / Time:
              let displayScoreOrTime = item.score_or_time_summary;
              if (isTimed) {
                // If it looks like a fake basketball score (e.g. 78 - 70 or 107 - 103), replace with real time/mark
                const isBasketballScorePattern = /^\s*\d+\s*[-:]\s*\d+\s*$/.test(item.score_or_time_summary || "");
                if (isBasketballScorePattern || !item.score_or_time_summary) {
                  const statTime = firstStat?.finish_time || firstStat?.time || firstStat?.mark || firstStat?.time_or_distance;
                  displayScoreOrTime = statTime ? `Time: ${statTime}` : "Completed";
                }
              }

              // 3. Resolve Badge:
              let badgeSubtext = isTimed ? "PLACE" : "RESULT";
              let badgeMainText = item.result_badge_text.replace(/^RESULT\s*/i, "").trim();
              if (isTimed) {
                const rawRank = firstStat?.rank || firstStat?.place || firstStat?.placement_rank || (item as any).rank || (item as any).place || (item as any).placement_rank;
                const parsedRank = typeof rawRank === "number" ? rawRank : parseInt(String(rawRank).replace(/[^\d]/g, ""), 10);
                if (parsedRank === 1 || badgeMainText === "WIN" || badgeMainText === "1ST" || badgeMainText === "1ST PLACE") {
                  badgeMainText = "1ST";
                  badgeSubtext = "PLACE";
                } else if (parsedRank === 2 || badgeMainText === "2ND" || badgeMainText === "2ND PLACE") {
                  badgeMainText = "2ND";
                  badgeSubtext = "PLACE";
                } else if (parsedRank === 3 || badgeMainText === "3RD" || badgeMainText === "3RD PLACE") {
                  badgeMainText = "3RD";
                  badgeSubtext = "PLACE";
                } else if (parsedRank && parsedRank > 3) {
                  badgeSubtext = "RANK";
                  badgeMainText = `#${parsedRank}`;
                } else if (badgeMainText.includes("4TH") || badgeMainText.includes("#4")) {
                  badgeSubtext = "RANK";
                  badgeMainText = "#4";
                } else if (badgeMainText === "LOSS") {
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
                      {displayScoreOrTime}
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
        ))}
      </ScrollView>
    </View>
  );
};

export default MatchHistory;

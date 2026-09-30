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
  const headerTopPadding = Math.max(insets.top, 60) + 48;

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
            {groupedMatches[groupKey].map((item) => (
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
                  <Text style={styles.eventTitle}>{item.event_or_opponent}</Text>
                  <Text style={styles.summaryScore}>
                    {item.score_or_time_summary}
                  </Text>
                </View>

                <View style={styles.resultBadgeBorder}>
                  <Text style={styles.resultBadgeSubtext}>RESULT</Text>
                  <Text style={styles.resultBadgeMainText}>
                    {item.result_badge_text.replace("RESULT ", "")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default MatchHistory;

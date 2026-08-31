import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestAuthenticatedJson } from "../../Authentication/authShared";
import { MatchHistoryItem } from "../DataTypes";
import { styles } from "./styles/matchHistory";

interface MatchHistoryProps {
  onClose: () => void;
  onSelectMatchItem: (matchItem: MatchHistoryItem) => void;
  historyItems?: MatchHistoryItem[];
  sportCategory?: string;
  athleteId?: string;
}

export const MatchHistory: React.FC<MatchHistoryProps> = ({
  onClose,
  onSelectMatchItem,
  historyItems: propHistoryItems,
  sportCategory,
  athleteId,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 60) + 48;
  const [historyItems, setHistoryItems] = useState<MatchHistoryItem[]>(propHistoryItems || []);

  useEffect(() => {
    if (propHistoryItems && propHistoryItems.length > 0) {
      setHistoryItems(propHistoryItems);
      return;
    }

    let isMounted = true;
    const fetchMatches = async () => {
      try {
        const matchesRes: any = await requestAuthenticatedJson(
          athleteId ? `/matches?athlete_id=${athleteId}` : "/matches"
        ).catch(() => null);

        if (isMounted && matchesRes) {
          const raw = matchesRes.matches || (Array.isArray(matchesRes) ? matchesRes : []);
          if (Array.isArray(raw) && raw.length > 0) {
            const mapped: MatchHistoryItem[] = raw.map((m: any, idx: number) => {
              const rawSport = (m.sport_type || m.sport || "BASKETBALL").toUpperCase();
              const category: MatchHistoryItem["sport_category"] = rawSport.includes("SWIM")
                ? "SWIMMING"
                : rawSport.includes("TRACK") || rawSport.includes("FIELD")
                ? "TRACK AND FIELD"
                : "BASKETBALL";

              const d = m.match_date ? new Date(m.match_date) : new Date();
              const monthYear = d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
              const dateFormatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();

              return {
                match_id: m.match_id || m.id || `m_${idx}`,
                sport_category: category,
                date_group: monthYear,
                date_formatted: dateFormatted,
                event_or_opponent: m.opponent_team_name || m.headline || m.title || `MATCH #${idx + 1}`,
                score_or_time_summary: m.score_summary || (m.home_score && m.away_score ? `${m.home_score} - ${m.away_score}` : "FINAL"),
                result_badge_text: m.status || "OFFICIAL",
                is_official: m.is_official !== undefined ? Boolean(m.is_official) : m.validation_status === "CERTIFIED",
                home_team: m.team1_name || m.home_team || "HOME TEAM",
                away_team: m.team2_name || m.away_team || m.opponent_team_name || "AWAY TEAM",
                home_score: m.home_score || m.team1_score,
                away_score: m.away_score || m.team2_score,
                player_stats: m.player_stats || [],
                coach_notes: m.coach_notes || (m.notes ? [m.notes] : []),
              };
            });
            setHistoryItems(mapped);
          }
        }
      } catch {
        // Non-blocking catch
      }
    };

    fetchMatches();
    return () => {
      isMounted = false;
    };
  }, [athleteId, propHistoryItems]);

  // Filter and group items chronologically by date_group (e.g. OCTOBER 2026, SEPTEMBER 2026)
  const groupedMatches = useMemo(() => {
    const map: { [key: string]: MatchHistoryItem[] } = {};
    const filtered = sportCategory
      ? historyItems.filter(
          (item) =>
            item.sport_category?.toUpperCase() === sportCategory.toUpperCase() ||
            (sportCategory.toUpperCase().includes("TRACK") && item.sport_category?.toUpperCase().includes("TRACK"))
        )
      : historyItems;

    filtered.forEach((item) => {
      const group = item.date_group || "RECENT MATCHES";
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
        {Object.keys(groupedMatches).length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 }}>
            <Ionicons name="calendar-outline" size={48} color="#64748B" />
            <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "700", marginTop: 12 }}>
              No Match History Found
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 4, lineHeight: 18 }}>
              No recorded match boxscores or fixtures found for this athlete.
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
                      {String(item.result_badge_text || "OFFICIAL").replace(/^RESULT\s*/i, "")}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default MatchHistory;

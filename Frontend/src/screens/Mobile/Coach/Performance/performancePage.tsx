import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AtletaHeader } from "../Components/AtletaHeader";
import { MatchHistoryItem } from "../DataTypes";
import { styles } from "./styles/performancePage";
import { API_BASE, getStoredAuthToken } from "../../Authentication/authShared";

interface PerformancePageProps {
  onSelectMatchItem: (matchItem: MatchHistoryItem) => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  historyItems?: MatchHistoryItem[];
}

const CATEGORIES = ["ALL", "BASKETBALL", "TRACK AND FIELD", "SWIMMING"];

const formatSafeDate = (rawDate: any): { short: string; full: string } => {
  if (!rawDate) return { short: "RECENT", full: "RECENT" };
  const d = new Date(rawDate);
  if (!isNaN(d.getTime())) {
    return {
      short: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      full: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    };
  }
  const str = String(rawDate).trim();
  return { short: str || "RECENT", full: str || "RECENT" };
};

const mapFirestoreMatch = (m: any): MatchHistoryItem => {
  const homeScoreMatch = (m.notes || "").match(/\((\d+)\s*-\s*(\d+)\)/);
  const hScore = m.home_score !== undefined ? Number(m.home_score) : (homeScoreMatch ? parseInt(homeScoreMatch[1], 10) : undefined);
  const aScore = m.away_score !== undefined ? Number(m.away_score) : (homeScoreMatch ? parseInt(homeScoreMatch[2], 10) : undefined);
  const homeName = m.home_team_name || m.home_team || (m.notes || "").match(/OCR Logged:\s*([^v]+)\s*vs/i)?.[1]?.trim() || "CELTICS";
  const oppName = m.away_team_name || m.away_team || m.opponent_team_name || "HAWKS";
  const dateInfo = formatSafeDate(m.match_date || m.date_time || m.created_at);

  return {
    match_id: m.match_id || m.id || `match_${Date.now()}`,
    date_formatted: dateInfo.short,
    full_date: dateInfo.full,
    date_group: "MATCH LOGS",
    event_or_opponent: `${homeName} vs ${oppName}`,
    score_or_time_summary: hScore !== undefined && aScore !== undefined ? `${hScore} - ${aScore}` : (m.notes || (m.game_result === "WIN" ? "FINAL WIN" : "FINAL LOSS")),
    sport_category: (m.sport_type || "BASKETBALL").toUpperCase(),
    result_badge_text: m.game_result ? `RESULT ${m.game_result}` : (hScore !== undefined && aScore !== undefined && hScore >= aScore ? "RESULT WIN" : "RESULT LOSS"),
    is_official: m.is_official !== false,
    home_team: homeName,
    away_team: oppName,
    home_score: hScore,
    away_score: aScore,
    player_stats: m.player_stats || [],
    coach_notes: m.notes ? [m.notes] : ["Match recorded via OCR Scoresheet."],
  };
};

export const PerformancePage: React.FC<PerformancePageProps> = ({
  onSelectMatchItem,
  onSettingsPress,
  onProfilePress,
  historyItems = [],
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  const [liveMatches, setLiveMatches] = useState<MatchHistoryItem[]>(historyItems);
  const [isLoading, setIsLoading] = useState(historyItems.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  const fetchAllMatchesFromFirestore = useCallback(async () => {
    try {
      const token = await getStoredAuthToken();
      const res = await fetch(`${API_BASE}/matches`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.matches)) {
          const parsed = data.matches.map(mapFirestoreMatch);
          setLiveMatches(parsed);
          return;
        }
      }

      // Fallback to snapshot endpoint
      const syncRes = await fetch(`${API_BASE}/sync/coach-snapshot`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).then(r => r.ok ? r.json() : null).catch(() => null);

      if (syncRes && Array.isArray(syncRes.scheduled_matches)) {
        const parsed = syncRes.scheduled_matches.map(mapFirestoreMatch);
        setLiveMatches(parsed);
      }
    } catch (err) {
      console.warn("Could not fetch matches from Firestore:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMatchesFromFirestore();
  }, [fetchAllMatchesFromFirestore]);

  useEffect(() => {
    if (historyItems && historyItems.length > 0) {
      setLiveMatches(historyItems);
      setIsLoading(false);
    }
  }, [historyItems]);

  // Filter matches by sport category and search text
  const filteredMatches = useMemo(() => {
    return liveMatches.filter((item) => {
      const matchesTab =
        activeTab === "ALL" ||
        item.sport_category.toUpperCase() === activeTab.toUpperCase();
      const matchesSearch =
        item.event_or_opponent.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.score_or_time_summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date_formatted.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [liveMatches, activeTab, searchQuery]);

  // Group matches chronologically by date group
  const groupedMatches = useMemo(() => {
    const map: { [key: string]: MatchHistoryItem[] } = {};
    filteredMatches.forEach((item) => {
      const group = item.date_group || "MATCH LOGS";
      if (!map[group]) map[group] = [];
      map[group].push(item);
    });
    return map;
  }, [filteredMatches]);

  return (
    <View style={styles.container}>
      {/* Shared Header Component */}
      <AtletaHeader
        onSettingsPress={onSettingsPress}
        onProfilePress={onProfilePress}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 64, paddingBottom: 140 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchAllMatchesFromFirestore}
            tintColor="#00C8FF"
            colors={["#00C8FF"]}
          />
        }
      >
        <Text style={styles.pageTitle}>Performance</Text>
        <Text style={styles.pageSubtitle}>
          Match Records and Performance Analytics
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search matches, opponents, or dates..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sport Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeTab === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Loading / Empty State */}
        {isLoading && liveMatches.length === 0 ? (
          <View style={{ paddingVertical: 48, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#00C8FF" />
            <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 12, fontWeight: "600" }}>
              Fetching match records from database...
            </Text>
          </View>
        ) : Object.keys(groupedMatches).length === 0 ? (
          <View style={{ paddingVertical: 48, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="trophy-outline" size={42} color="#64748B" />
            <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "800", marginTop: 12 }}>
              No Matches Found
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 4, textAlign: "center", paddingHorizontal: 20 }}>
              {searchQuery
                ? `No match records match "${searchQuery}".`
                : "No recorded match logs yet. Use the + button to log a match or scan a scoresheet."}
            </Text>
          </View>
        ) : (
          Object.keys(groupedMatches).map((groupKey) => (
            <View key={groupKey} style={{ marginBottom: 16 }}>
              {/* Group Header */}
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 12 }}>
                <View style={{ width: 4, height: 18, backgroundColor: "#00C8FF", borderRadius: 2, marginRight: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#FFFFFF", letterSpacing: 1.5 }}>
                  {groupKey}
                </Text>
              </View>

              {/* List of Match Cards */}
              {groupedMatches[groupKey].map((item) => {
                const isWin = item.result_badge_text.toUpperCase().includes("WIN") || item.result_badge_text.toUpperCase().includes("1ST");
                return (
                  <TouchableOpacity
                    key={item.match_id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "#0D192E",
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: "rgba(0, 200, 255, 0.12)",
                    }}
                    onPress={() => onSelectMatchItem(item)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "#00C8FF", letterSpacing: 1, marginBottom: 4 }}>
                        {item.date_formatted} • {item.sport_category}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: "900", color: "#FFFFFF", marginBottom: 4 }}>
                        {item.event_or_opponent}
                      </Text>
                      <Text style={{ fontSize: 17, fontWeight: "900", color: "#FFFFFF" }}>
                        {item.score_or_time_summary}
                      </Text>
                    </View>

                    <View
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isWin ? "#10B981" : "#EF4444",
                        backgroundColor: isWin ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                        alignItems: "center",
                        minWidth: 70,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: "800", color: isWin ? "#10B981" : "#EF4444", letterSpacing: 0.5 }}>
                        RESULT
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: "900", color: isWin ? "#10B981" : "#EF4444" }}>
                        {item.result_badge_text.replace(/^RESULT\s*/i, "")}
                      </Text>
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

export default PerformancePage;

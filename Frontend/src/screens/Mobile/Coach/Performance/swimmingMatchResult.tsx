import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MatchHistoryItem } from "../DataTypes";
import { styles } from "./styles/swimmingMatchResult";
import { API_BASE, getStoredAuthToken } from "../../Authentication/authShared";

interface SwimmingMatchResultProps {
  matchItem?: MatchHistoryItem | null;
  onBack: () => void;
  onEditResults?: () => void;
}

export const SwimmingMatchResult: React.FC<SwimmingMatchResultProps> = ({
  matchItem,
  onBack,
  onEditResults,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 60) + 48;

  const [leaderboardData, setLeaderboardData] = useState<any[]>(matchItem?.leaderboard_entries || []);
  const [loading, setLoading] = useState(false);

  const eventTitle = matchItem?.event_or_opponent || "Swimming Event";
  const gameType = matchItem?.game_type || "MATCH LOG";
  const dateFormatted = matchItem?.full_date || matchItem?.date_formatted || "RECENT";
  const entriesCount = matchItem?.entries_count || leaderboardData.length;

  useEffect(() => {
    if (matchItem?.leaderboard_entries && matchItem.leaderboard_entries.length > 0) {
      setLeaderboardData(matchItem.leaderboard_entries);
      return;
    }

    if (!matchItem?.match_id) return;

    let isMounted = true;
    async function fetchDetails() {
      try {
        setLoading(true);
        const token = await getStoredAuthToken();
        const res = await fetch(`${API_BASE}/matches/${matchItem!.match_id}/details`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.player_metrics) && data.player_metrics.length > 0) {
            const mapped = data.player_metrics.map((p: any, idx: number) => ({
              rank: idx + 1,
              name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || "Athlete",
              detail: p.team_name || p.position || "Swimmer",
              time_or_score: p.sport_stats?.time || (p.sport_stats?.finish_time ? `${p.sport_stats.finish_time}s` : "-"),
            }));
            setLeaderboardData(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not fetch swimming details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [matchItem]);

  const coachNotes =
    matchItem?.coach_notes && matchItem.coach_notes.length > 0
      ? matchItem.coach_notes
      : ["Swimming match record logged."];

  const handleEditPress = () => {
    if (onEditResults) onEditResults();
    else Alert.alert("Edit Results", `Editing results for ${eventTitle}`);
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.logoText}>ATLETA</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>MATCH RESULT</Text>

        {/* Game Sub-card */}
        <View style={styles.eventCard}>
          <Text style={styles.tuneUpText}>{gameType}</Text>
          <Text style={styles.eventTitle}>{eventTitle}</Text>

          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={15} color="#64748B" />
            <Text style={styles.eventDateText}>{dateFormatted}</Text>
          </View>

          <View style={styles.badgesRow}>
            <View style={styles.badgeCol}>
              <Text style={styles.badgeLabel}>STATUS</Text>
              <Text style={styles.badgeValue}>
                {matchItem?.is_official ? "OFFICIAL" : "VERIFIED LOG"}
              </Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badgeCol}>
              <Text style={styles.badgeLabel}>ENTRIES</Text>
              <Text style={styles.badgeValue}>
                {String(entriesCount).padStart(2, "0")} SWIMMERS
              </Text>
            </View>
          </View>
        </View>

        {/* Placement Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colRank}>RANK</Text>
            <Text style={styles.colName}>NAME</Text>
            <Text style={styles.colTime}>TIME / SCORE</Text>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator color="#00C8FF" size="small" />
              <Text style={{ color: "#64748B", fontSize: 12, marginTop: 8 }}>
                Loading swimmer standings...
              </Text>
            </View>
          ) : leaderboardData.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "600" }}>
                No swimmer entries recorded.
              </Text>
            </View>
          ) : (
            leaderboardData.map((item, idx) => {
              const rankNum = item.rank || idx + 1;
              const isFirst = rankNum === 1;
              return (
                <View key={`${item.name}_${idx}`} style={styles.tableRow}>
                  <View
                    style={
                      isFirst ? styles.rankSquareDark : styles.rankSquareOutline
                    }
                  >
                    <Text
                      style={
                        isFirst ? styles.rankTextWhite : styles.rankTextDark
                      }
                    >
                      {rankNum}
                    </Text>
                  </View>

                  <View style={styles.nameContainer}>
                    <Text style={styles.nameText}>{item.name}</Text>
                    {item.detail ? (
                      <Text style={styles.detailText}>{item.detail}</Text>
                    ) : null}
                  </View>

                  <Text style={styles.timeText}>{item.time_or_score}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Coach Notes Box */}
        <View style={styles.coachNotesCard}>
          <Text style={styles.coachNotesTitle}>COACH NOTES</Text>

          {coachNotes.map((note, index) => (
            <View key={index} style={styles.noteRow}>
              <Text style={styles.noteIndex}>{String(index + 1).padStart(2, "0")}</Text>
              <Text style={styles.noteContentText}>{note}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default SwimmingMatchResult;

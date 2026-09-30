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
import { styles } from "./styles/trackfieldMatchResult";
import { API_BASE, getStoredAuthToken } from "../../Authentication/authShared";

interface TrackfieldMatchResultProps {
  matchItem?: MatchHistoryItem | null;
  onBack: () => void;
  onEditResults?: () => void;
}

export const TrackfieldMatchResult: React.FC<TrackfieldMatchResultProps> = ({
  matchItem,
  onBack,
  onEditResults,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 60) + 48;

  const [leaderboardData, setLeaderboardData] = useState<any[]>(matchItem?.leaderboard_entries || []);
  const [loading, setLoading] = useState(false);

  const eventTitle = matchItem?.event_or_opponent || "Track & Field Event";
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
            const mapped = data.player_metrics.map((p: any, idx: number) => {
              const dist = p.sport_stats?.distance || (p.sport_stats?.distance_meters ? `${p.sport_stats.distance_meters}m` : "");
              const event = p.sport_stats?.event_name || "";
              const detailStr = [dist, event, p.team_name].filter(Boolean).join(" • ") || p.position || "Athlete";
              const timeFormatted = p.sport_stats?.formatted_time || p.sport_stats?.time || (p.sport_stats?.finish_time_ms ? `${(p.sport_stats.finish_time_ms / 1000).toFixed(2)}s` : (p.sport_stats?.finish_time ? `${p.sport_stats.finish_time}s` : "-"));
              return {
                rank: p.sport_stats?.placement_rank || idx + 1,
                name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || "Athlete",
                detail: detailStr,
                time_or_score: timeFormatted,
              };
            });
            setLeaderboardData(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not fetch track & field details:", err);
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
      : ["Track & field match record logged."];

  const handleEditPress = () => {
    if (onEditResults) onEditResults();
    else Alert.alert("Edit Results", `Editing results for ${eventTitle}`);
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.logoText}>ATLETA</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>MATCH RESULT</Text>

        {/* Game Sub-card Container */}
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
                {String(entriesCount).padStart(2, "0")} Athletes
              </Text>
            </View>
          </View>
        </View>

        {/* Leaderboard Table */}
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
                Loading athlete standings...
              </Text>
            </View>
          ) : leaderboardData.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "600" }}>
                No athlete entries recorded.
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

export default TrackfieldMatchResult;

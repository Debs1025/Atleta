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
  const headerTopPadding = Math.max(insets.top, 16) + 10;

  const initialLeaderboard = (Array.isArray(matchItem?.leaderboard_entries) && matchItem.leaderboard_entries.length > 0)
    ? matchItem.leaderboard_entries.filter((e: any) => !/^Player\s*\d+$/i.test(e.name || ''))
    : ((Array.isArray(matchItem?.player_stats) && matchItem.player_stats.length > 0)
      ? matchItem.player_stats
          .filter((p: any) => !/^Player\s*\d+$/i.test(p.player_name || p.name || ''))
          .map((p: any, idx: number) => ({
            rank: p.rank || p.place || p.placement_rank || idx + 1,
            name: p.player_name || p.name || p.athlete_name || "Athlete",
            detail: [p.event || p.event_name, p.team_name || p.team].filter(Boolean).join(" • ") || "Runner",
            time_or_score: p.time || p.finish_time || p.formatted_time || "-",
          }))
      : []);

  const [leaderboardData, setLeaderboardData] = useState<any[]>(initialLeaderboard);
  const [loading, setLoading] = useState(false);

  const rawTitle = matchItem?.match_name || matchItem?.game_name || matchItem?.event_or_opponent || "";
  const firstStat = (matchItem?.player_stats && matchItem.player_stats.length > 0) ? matchItem.player_stats[0] : null;
  const statEvent = firstStat?.event || firstStat?.event_name || "";
  const cleanTitle = rawTitle.replace(/\s*vs\s*OPPONENT.*$/i, "").trim();
  const eventTitle = (cleanTitle && !cleanTitle.toLowerCase().includes("vs"))
    ? (statEvent && !cleanTitle.includes(statEvent) ? `${cleanTitle} • ${statEvent}` : cleanTitle)
    : (statEvent || "Track & Field Event");
  const gameType = matchItem?.game_type || "MEET LOG";
  const dateFormatted = matchItem?.full_date || matchItem?.date_formatted || "RECENT";
  const entriesCount = leaderboardData.length || matchItem?.entries_count || 0;

  const [fetchedNotes, setFetchedNotes] = useState<string[] | null>(null);

  useEffect(() => {
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
          if (isMounted) {
            if (Array.isArray(data.player_metrics) && data.player_metrics.length > 0) {
              const mapped = data.player_metrics
                .filter((p: any) => !/^Player\s*\d+$/i.test(p.player_name || '') && !/^Player\s*\d+$/i.test(p.first_name || ''))
                .map((p: any, idx: number) => {
                  const dist = p.sport_stats?.distance || (p.sport_stats?.distance_meters ? `${p.sport_stats.distance_meters}m` : "");
                  const event = p.sport_stats?.event_name || p.sport_stats?.event || "";
                  const detailStr = [dist, event, p.team_name].filter(Boolean).join(" • ") || p.position || "Runner";
                  const timeFormatted = p.sport_stats?.formatted_time || p.sport_stats?.time || p.sport_stats?.finish_time || (p.sport_stats?.finish_time_ms ? `${(p.sport_stats.finish_time_ms / 1000).toFixed(2)}s` : "-");
                  return {
                    rank: p.sport_stats?.placement_rank || p.sport_stats?.rank || idx + 1,
                    name: (p.player_name || `${p.first_name || ''} ${p.last_name || ''}`).trim() || "Athlete",
                    detail: detailStr,
                    time_or_score: timeFormatted,
                  };
                });
              if (mapped.length > 0) {
                setLeaderboardData(mapped);
              }
            } else if (Array.isArray(data.sport_specific_details?.race_results) && data.sport_specific_details.race_results.length > 0) {
              const mapped = data.sport_specific_details.race_results
                .filter((r: any) => !/^Player\s*\d+$/i.test(r.athlete_name || ''))
                .map((r: any, idx: number) => ({
                  rank: r.placement_rank || idx + 1,
                  name: r.athlete_name || "Athlete",
                  detail: r.distance || "Runner",
                  time_or_score: r.formatted_finish_time || r.time || "-",
                }));
              if (mapped.length > 0) {
                setLeaderboardData(mapped);
              }
            }
            if (data.notes && Array.isArray(data.notes) && data.notes.length > 0) {
              setFetchedNotes(data.notes);
            } else if (typeof data.context_notes === 'string' && data.context_notes.trim().length > 0) {
              setFetchedNotes([data.context_notes]);
            }
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
    (fetchedNotes && fetchedNotes.length > 0)
      ? fetchedNotes
      : (matchItem?.coach_notes && matchItem.coach_notes.length > 0
          ? matchItem.coach_notes
          : ["Track & field match record logged."]);

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
        <Text style={styles.pageTitle}>MEET RESULT</Text>

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

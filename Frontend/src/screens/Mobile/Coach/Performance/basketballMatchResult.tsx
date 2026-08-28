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
import { styles } from "./styles/basketballMatchResult";
import { API_BASE, getStoredAuthToken } from "../../Authentication/authShared";

interface BasketballMatchResultProps {
  matchItem?: MatchHistoryItem | null;
  onBack: () => void;
  onEditResults?: () => void;
}

export const BasketballMatchResult: React.FC<BasketballMatchResultProps> = ({
  matchItem,
  onBack,
  onEditResults,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 60) + 48;

  const [playerStats, setPlayerStats] = useState<any[]>(matchItem?.player_stats || []);
  const [loading, setLoading] = useState(false);

  // Dynamically resolve team names
  let homeTeam = matchItem?.home_team || "";
  let awayTeam = matchItem?.away_team || "";

  if (!homeTeam || !awayTeam) {
    const rawTitle = matchItem?.event_or_opponent || "";
    const cleanTitle = rawTitle.replace(/^vs\.?\s*/i, "");
    const parts = cleanTitle.split(/\s+vs\.?\s+/i);
    if (parts.length === 2) {
      homeTeam = parts[0].trim().toUpperCase();
      awayTeam = parts[1].trim().toUpperCase();
    } else {
      homeTeam = homeTeam || "HOME TEAM";
      awayTeam = awayTeam || cleanTitle || "AWAY TEAM";
    }
  }

  // Dynamically resolve scores
  let homeScore: string | number = matchItem?.home_score ?? "-";
  let awayScore: string | number = matchItem?.away_score ?? "-";

  if (homeScore === "-" && matchItem?.score_or_time_summary) {
    const scoreMatches = matchItem.score_or_time_summary.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (scoreMatches) {
      homeScore = parseInt(scoreMatches[1], 10);
      awayScore = parseInt(scoreMatches[2], 10);
    }
  }

  // Fetch boxscore from Firestore backend if player_stats wasn't populated in memory
  useEffect(() => {
    if (matchItem?.player_stats && matchItem.player_stats.length > 0) {
      setPlayerStats(matchItem.player_stats);
      return;
    }

    if (!matchItem?.match_id) return;

    let isMounted = true;
    async function fetchBoxscore() {
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
            const mapped = data.player_metrics.map((p: any) => ({
              name: p.player_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || "Athlete",
              team: p.team_name || p.position || "",
              pts: Number(p.sport_stats?.points ?? p.sport_stats?.pts ?? p.pts ?? 0),
              ast: Number(p.sport_stats?.assists ?? p.sport_stats?.ast ?? p.ast ?? 0),
              reb: Number(p.sport_stats?.rebounds ?? p.sport_stats?.reb ?? p.reb ?? 0),
            }));
            setPlayerStats(mapped);
          }
        }
      } catch (err) {
        console.warn("Could not fetch boxscore details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchBoxscore();
    return () => {
      isMounted = false;
    };
  }, [matchItem]);

  const coachNotes =
    matchItem?.coach_notes && matchItem.coach_notes.length > 0
      ? matchItem.coach_notes
      : [`OCR Scanned Match: ${homeTeam} vs ${awayTeam}`];

  const handleEditPress = () => {
    if (onEditResults) onEditResults();
    else Alert.alert("Edit Results", `Editing match results for ${homeTeam} vs ${awayTeam}`);
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

        {/* Head-to-Head Score Card */}
        <View style={styles.scoreBoardCard}>
          <View style={styles.teamBlock}>
            <View style={styles.teamIconBox}>
              <Ionicons name="disc-outline" size={24} color="#0F172A" />
            </View>
            <Text style={styles.teamName}>{homeTeam}</Text>
            <Text style={styles.teamSubtext}>HOME TEAM</Text>
          </View>

          <View style={styles.vsScoreRow}>
            <Text style={styles.scoreTextLarge}>{homeScore}</Text>
            <Text style={styles.vsText}>VS</Text>
            <Text style={styles.scoreTextLarge}>{awayScore}</Text>
          </View>

          <View style={styles.teamBlock}>
            <View style={styles.teamIconBox}>
              <Ionicons name="people-outline" size={24} color="#0F172A" />
            </View>
            <Text style={styles.teamName}>{awayTeam}</Text>
            <Text style={styles.teamSubtext}>AWAY TEAM</Text>
          </View>

          <View style={styles.statusSubline}>
            <Text style={styles.statusLabel}>STATUS</Text>
            <Text style={styles.statusValue}>
              {matchItem?.is_official ? "OFFICIAL" : "VERIFIED OCR LOG"}
            </Text>
          </View>
        </View>

        {/* Player Stats Table */}
        <Text style={styles.sectionTitle}>Player Stats</Text>
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colNameHeader}>NAME</Text>
            <Text style={styles.colStatHeader}>PTS</Text>
            <Text style={styles.colStatHeader}>AST</Text>
            <Text style={styles.colStatHeader}>REB</Text>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator color="#00C8FF" size="small" />
              <Text style={{ color: "#64748B", fontSize: 12, marginTop: 8 }}>
                Loading player boxscore...
              </Text>
            </View>
          ) : playerStats.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "600" }}>
                No individual player stats recorded.
              </Text>
            </View>
          ) : (
            playerStats.map((player, idx) => {
              const playerName = player.name || player.player_name || `Athlete #${idx + 1}`;
              const playerTeam = player.team || player.team_name || "";
              return (
                <View key={`${playerName}_${idx}`} style={styles.tableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nameText}>{playerName}</Text>
                    {playerTeam ? (
                      <Text style={{ fontSize: 10, color: "#64748B", fontWeight: "700" }}>
                        {playerTeam}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.statValueText}>{player.pts ?? player.points ?? 0}</Text>
                  <Text style={styles.statValueText}>{player.ast ?? player.assists ?? 0}</Text>
                  <Text style={styles.statValueText}>{player.reb ?? player.rebounds ?? 0}</Text>
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

export default BasketballMatchResult;


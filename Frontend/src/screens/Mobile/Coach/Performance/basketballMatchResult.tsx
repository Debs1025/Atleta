import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MatchHistoryItem } from "../DataTypes";
import { styles } from "./styles/basketballMatchResult";

interface BasketballMatchResultProps {
  matchItem?: MatchHistoryItem | null;
  onBack: () => void;
  onEditResults?: () => void;
}

const DEFAULT_PLAYER_STATS = [
  { name: "Pelonio G.", pts: 32, ast: 8, reb: 5 },
  { name: "Petalio J.", pts: 22, ast: 3, reb: 4 },
  { name: "Dela Cruz J.", pts: 12, ast: 11, reb: 14 },
  { name: "De Belen E.", pts: 18, ast: 2, reb: 6 },
  { name: "Bicardo A.", pts: 14, ast: 1, reb: 12 },
];

export const BasketballMatchResult: React.FC<BasketballMatchResultProps> = ({
  matchItem,
  onBack,
  onEditResults,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 60) + 48;

  const homeTeam = matchItem?.home_team || "ATENEO";
  const awayTeam = matchItem?.away_team || "BLUE EAGLES";
  const homeScore = matchItem?.home_score ?? 98;
  const awayScore = matchItem?.away_score ?? 92;

  const playerStats =
    matchItem?.player_stats && matchItem.player_stats.length > 0
      ? matchItem.player_stats
      : DEFAULT_PLAYER_STATS;

  const coachNotes =
    matchItem?.coach_notes && matchItem.coach_notes.length > 0
      ? matchItem.coach_notes
      : ["Defensive transition was slow in the first half."];

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
            <Text style={styles.statusValue}>OFFICIAL</Text>
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

          {playerStats.map((player) => (
            <View key={player.name} style={styles.tableRow}>
              <Text style={styles.nameText}>{player.name}</Text>
              <Text style={styles.statValueText}>{player.pts}</Text>
              <Text style={styles.statValueText}>{player.ast}</Text>
              <Text style={styles.statValueText}>{player.reb}</Text>
            </View>
          ))}
        </View>

        {/* Coach Notes Box */}
        <View style={styles.coachNotesCard}>
          <Text style={styles.coachNotesTitle}>COACH NOTES</Text>

          <View style={styles.noteRow}>
            <Text style={styles.noteIndex}>01</Text>
            <Text style={styles.noteContentText}>{coachNotes[0]}</Text>
          </View>

          <View style={styles.noteRow}>
            <Text style={styles.noteIndex}>02</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.noteSkeleton1} />
              <View style={styles.noteSkeleton2} />
            </View>
          </View>

          <View style={styles.noteRow}>
            <Text style={styles.noteIndex}>03</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.noteSkeleton1} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default BasketballMatchResult;

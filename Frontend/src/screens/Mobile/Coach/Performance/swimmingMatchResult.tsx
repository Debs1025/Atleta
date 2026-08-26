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
import { styles } from "./styles/swimmingMatchResult";

interface SwimmingMatchResultProps {
  matchItem?: MatchHistoryItem | null;
  onBack: () => void;
  onEditResults?: () => void;
}

const DEFAULT_SWIMMERS = [
  { rank: 1, name: "M. REYES", detail: "ATENEO", time_or_score: "54.12s" },
  { rank: 2, name: "J. SANTOS", detail: "DLSU", time_or_score: "54.80s" },
  { rank: 3, name: "L. GARCIA", detail: "UP", time_or_score: "55.08s" },
  { rank: 4, name: "R. PUNO", detail: "UST", time_or_score: "56.12s" },
];

export const SwimmingMatchResult: React.FC<SwimmingMatchResultProps> = ({
  matchItem,
  onBack,
  onEditResults,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 60) + 48;

  const eventTitle = matchItem?.event_or_opponent || "100m Freestyle - Finals";
  const gameType = matchItem?.game_type || "TUNE UP GAME";
  const dateFormatted = matchItem?.full_date || "May 24, 2024";
  const entriesCount = matchItem?.entries_count || 8;

  const leaderboardData =
    matchItem?.leaderboard_entries && matchItem.leaderboard_entries.length > 0
      ? matchItem.leaderboard_entries
      : DEFAULT_SWIMMERS;

  const coachNotes =
    matchItem?.coach_notes && matchItem.coach_notes.length > 0
      ? matchItem.coach_notes
      : ["The reaction time was a bit too late."];

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
              <Text style={styles.badgeValue}>OFFICIAL</Text>
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
            <Text style={styles.colTime}>TIME</Text>
          </View>

          {leaderboardData.map((item) => {
            const isFirst = item.rank === 1;
            return (
              <View key={item.rank} style={styles.tableRow}>
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
                    {item.rank}
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
          })}
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

export default SwimmingMatchResult;

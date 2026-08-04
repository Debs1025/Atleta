import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Coach } from "../Teams/Teams";

// Schemas
export interface RosterPlayer {
  id: string;
  name: string;
  position: string;
  avatar_url?: string;
}

export interface TeamProfileData {
  team_id: string;
  team_name: string;
  mission_statement: string;
  region: string;
  total_athletes: number;
  established_year: string;
  coach: Coach;
  players: RosterPlayer[];
}

/* TEMPORARY MOCK DATA - BACKEND API READY */
export const DEFAULT_TEAM_PROFILE: TeamProfileData = {
  team_id: "team_panthers_01",
  team_name: "Camarines Sur Panthers",
  mission_statement:
    "Dedicated to cultivating elite athletic performance through disciplined training, academic excellence, and technical mastery.",
  region: "Bicol",
  total_athletes: 48,
  established_year: "2012",
  coach: {
    coach_id: "coach_sterling_01",
    full_name: "MARCUS STERLING",
    role_title: "BASKETBALL COACH",
    years_experience: "15+ Years Experience",
    quote: "Focused on developing fundamental movement patterns and high-stakes mental resilience.",
    is_verified: true,
  },
  players: [
    { id: "p1", name: "Marcus Thorne", position: "POINT GUARD" },
    { id: "p2", name: "Elena Rodriguez", position: "CENTER" },
    { id: "p3", name: "Julian Vance", position: "SHOOTING GUARD" },
    { id: "p4", name: "David Miller", position: "POWER FORWARD" },
    { id: "p5", name: "Kevin Cruz", position: "SMALL FORWARD" },
    { id: "p6", name: "Alex Mercer", position: "POINT GUARD" },
    { id: "p7", name: "Ryan Gomez", position: "SHOOTING GUARD" },
    { id: "p8", name: "Gabriel Santos", position: "CENTER" },
  ],
};

interface TeamProfileProps {
  teamData?: TeamProfileData;
  onBack: () => void;
  onViewCoachProfile?: (coachId?: string) => void;
  onViewAllPlayers?: () => void;
}

export function TeamProfileScreen({
  teamData = DEFAULT_TEAM_PROFILE,
  onBack,
  onViewCoachProfile,
  onViewAllPlayers,
}: TeamProfileProps) {
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const {
    team_name,
    mission_statement,
    region,
    total_athletes,
    established_year,
    coach,
    players,
  } = teamData;

  const displayedPlayers = showAllPlayers ? players : players.slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>MY TEAM</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Team Card */}
        <View style={styles.mainTeamCard}>
          <View style={styles.avatarBox}>
            <Ionicons name="person-outline" size={44} color="#64748B" />
          </View>

          <Text style={styles.teamTitle}>{team_name}</Text>

          {/* Quote Block */}
          <View style={styles.quoteBlock}>
            <View style={styles.verticalCyanLine} />
            <Text style={styles.quoteText}>"{mission_statement}"</Text>
          </View>
        </View>

        {/* Stats Row (3 Columns) */}
        <View style={styles.statsCardContainer}>
          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>REGION</Text>
            <Text style={styles.statValue}>{region}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>ATHLETES</Text>
            <Text style={styles.statValue}>{total_athletes}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statLabel}>EST.</Text>
            <Text style={styles.statValue}>{established_year}</Text>
          </View>
        </View>

        {/* COACH Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>COACH</Text>
            <Ionicons name="checkmark-circle" size={18} color="#38BDF8" />
          </View>

          {/* Coach Card */}
          <View style={styles.coachCard}>
            {/* Image/Avatar Banner Area */}
            <View style={styles.coachBannerArea}>
              <Ionicons name="person-outline" size={56} color="#64748B" />
            </View>

            {/* Coach Details Area */}
            <View style={styles.coachDetailsBody}>
              <Text style={styles.coachName}>{coach.full_name}</Text>
              <Text style={styles.coachRole}>{coach.role_title}</Text>

              <View style={styles.experiencePill}>
                <Text style={styles.experiencePillText}>
                  {coach.years_experience}
                </Text>
              </View>

              <Pressable
                style={styles.viewCoachButton}
                onPress={() =>
                  onViewCoachProfile && onViewCoachProfile(coach.coach_id)
                }
              >
                <Text style={styles.viewCoachButtonText}>
                  VIEW COACH PROFILE
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* PLAYERS Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>PLAYERS</Text>
            <Pressable
              onPress={() => {
                setShowAllPlayers(!showAllPlayers);
                if (onViewAllPlayers) onViewAllPlayers();
              }}
            >
              <Text style={styles.viewAllText}>
                {showAllPlayers ? "SHOW LESS" : "VIEW ALL"}
              </Text>
            </Pressable>
          </View>

          {/* Roster Players List */}
          {displayedPlayers.map((player) => (
            <View key={player.id} style={styles.playerCard}>
              <View style={styles.playerAvatarBox}>
                <Ionicons name="person-outline" size={24} color="#64748B" />
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionBadgeText}>
                    {player.position}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
  },
  headerBar: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0B132B",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  mainTeamCard: {
    backgroundColor: "#111C35",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  avatarBox: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  teamTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 14,
  },
  quoteBlock: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  verticalCyanLine: {
    width: 3,
    height: "100%",
    backgroundColor: "#38BDF8",
    marginRight: 10,
    borderRadius: 2,
  },
  quoteText: {
    color: "#94A3B8",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
    flex: 1,
  },
  statsCardContainer: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 24,
  },
  statColumn: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#1E293B",
  },
  statLabel: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  coachCard: {
    backgroundColor: "#111C35",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    overflow: "hidden",
  },
  coachBannerArea: {
    height: 140,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  coachDetailsBody: {
    padding: 16,
    alignItems: "center",
  },
  coachName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  coachRole: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
  },
  experiencePill: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  experiencePillText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  viewCoachButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  viewCoachButtonText: {
    color: "#0B132B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  viewAllText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  playerCard: {
    backgroundColor: "#111C35",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  playerAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  positionBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  positionBadgeText: {
    color: "#38BDF8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

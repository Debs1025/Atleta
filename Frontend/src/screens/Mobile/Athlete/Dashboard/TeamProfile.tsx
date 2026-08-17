import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/TeamProfile";
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
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;
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
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
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



import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/TeamDetails";
import { TeamSchema } from "./Teams";

interface TeamDetailsProps {
  team: TeamSchema;
  onBack: () => void;
  onViewCoach: (coachId?: string) => void;
}

// API Request: fetch detailed team roster & coach info (GET /api/teams/:id)
export function TeamDetailsScreen({
  team,
  onBack,
  onViewCoach,
}: TeamDetailsProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>ATLETA</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Team Header Block */}
        <View style={styles.teamHeaderBlock}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={44} color="#64748B" />
          </View>

          <Text style={styles.teamTitle}>{team.team_name}</Text>

          <Text style={styles.programTag}>
            {team.program_type_tag || "ELITE VARSITY PROGRAM"}
          </Text>

          <Text style={styles.teamDescription}>{team.description}</Text>
        </View>

        {/* Stats Row (2 Dark Cards) */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>REGION</Text>
            <Text style={styles.statValue}>{team.region}</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>ATHLETES</Text>
            <Text style={styles.statValue}>
              {team.roster_athletes ? team.roster_athletes.length : 48}
            </Text>
          </View>
        </View>

        {/* Coaching Staff Section */}
        <View style={styles.coachingStaffSection}>
          <View style={styles.coachingHeaderRow}>
            <Text style={styles.coachingSectionTitle}>Coaching Staff</Text>
            <Text style={styles.headCoachRoleLabel}>Head Coach</Text>
          </View>

          {/* Coach Card */}
          <View style={styles.coachCard}>
            <View style={styles.coachInfoRow}>
              <View style={styles.coachAvatarBox}>
                <Ionicons name="person-outline" size={30} color="#64748B" />
              </View>
              <View style={styles.coachDetails}>
                <Text style={styles.coachName}>{team.head_coach.full_name}</Text>
                <Text style={styles.coachTitle}>
                  {team.head_coach.role_title}
                </Text>
                <View style={styles.experienceBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#38BDF8" />
                  <Text style={styles.experienceText}>
                    {team.head_coach.years_experience}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quote block */}
            <Text style={styles.coachQuote}>
              "{team.head_coach.quote}"
            </Text>

            {/* Action Button */}
            <Pressable
              style={styles.viewCoachButton}
              onPress={() => onViewCoach(team.head_coach.coach_id)}
            >
              <Text style={styles.viewCoachText}>VIEW COACH PROFILE</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}



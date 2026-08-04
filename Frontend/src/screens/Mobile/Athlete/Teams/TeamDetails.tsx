import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TeamSchema } from "./Teams";

interface TeamDetailsProps {
  team: TeamSchema;
  onBack: () => void;
  onViewCoach: (coachId?: string) => void;
}

export function TeamDetailsScreen({
  team,
  onBack,
  onViewCoach,
}: TeamDetailsProps) {
  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
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
    letterSpacing: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  teamHeaderBlock: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: "#111C35",
    borderWidth: 1,
    borderColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  teamTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  programTag: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 12,
  },
  teamDescription: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  statCard: {
    flex: 0.48,
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
  },
  statLabel: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  coachingStaffSection: {
    marginBottom: 20,
  },
  coachingHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  coachingSectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  headCoachRoleLabel: {
    color: "#64748B",
    fontSize: 12,
  },
  coachCard: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
  },
  coachInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  coachAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  coachTitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  experienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  experienceText: {
    color: "#38BDF8",
    fontSize: 11,
    marginLeft: 4,
    fontWeight: "600",
  },
  coachQuote: {
    color: "#94A3B8",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 12,
  },
  viewCoachButton: {
    backgroundColor: "#00A3FF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewCoachText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});

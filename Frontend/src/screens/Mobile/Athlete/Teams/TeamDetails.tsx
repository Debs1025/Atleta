import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/TeamDetails";
import { TeamSchema } from "./Teams";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

interface TeamDetailsProps {
  team: TeamSchema;
  onBack: () => void;
  onViewCoach: (coachId?: string) => void;
}

export function TeamDetailsScreen({
  team: propTeam,
  onBack,
  onViewCoach,
}: TeamDetailsProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;
  const [team, setTeam] = useState<TeamSchema>(propTeam);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchFullTeamDetails = async () => {
      if (!propTeam?.team_id) return;
      try {
        setLoading(true);
        const res: any = await requestAuthenticatedJson(`/teams/${propTeam.team_id}`).catch(() => null);

        if (isMounted && res) {
          const rawCoach = res.coach || res.head_coach || {};
          const rosterList = Array.isArray(res.roster) ? res.roster : Array.isArray(res.roster_list) ? res.roster_list : propTeam.roster_athletes;
          const mappedCoach = {
            coach_id: rawCoach.coach_id || propTeam.head_coach?.coach_id || "",
            full_name: (rawCoach.full_name || rawCoach.name || propTeam.head_coach?.full_name || "Head Coach").toUpperCase(),
            role_title: (rawCoach.role_title || rawCoach.current_institution || propTeam.head_coach?.role_title || "HEAD COACH").toUpperCase(),
            years_experience: rawCoach.years_of_experience ? `${rawCoach.years_of_experience} Years` : propTeam.head_coach?.years_experience || "Head Coach",
            quote: rawCoach.quote || propTeam.head_coach?.quote || "Dedicated to building high-performance athletic resilience.",
          };

          setTeam({
            ...propTeam,
            team_name: res.team_name || propTeam.team_name,
            description: res.description || res.mission_statement || propTeam.description,
            region: res.region || propTeam.region,
            program_type_tag: `${(res.division || "VARSITY").toUpperCase()} PROGRAM`,
            roster_athletes: rosterList.map((r: any) => typeof r === "string" ? r : (r.athlete_id || r.id || "ath_id")),
            head_coach: mappedCoach,
          });
        }
      } catch (err) {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFullTeamDetails();
    return () => {
      isMounted = false;
    };
  }, [propTeam]);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>ATLETA</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={{ color: "#94A3B8", marginTop: 12, fontSize: 14 }}>Loading team details...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Team Header Block */}
          <View style={styles.teamHeaderBlock}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="shield-checkmark-outline" size={44} color="#38BDF8" />
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
                {team.roster_athletes ? team.roster_athletes.length : 0}
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
      )}
    </View>
  );
}

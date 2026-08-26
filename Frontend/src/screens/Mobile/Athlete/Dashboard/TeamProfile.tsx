import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/TeamProfile";
import { Coach } from "../Teams/Teams";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

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

interface TeamProfileProps {
  teamId?: string;
  teamData?: TeamProfileData;
  onBack: () => void;
  onViewCoachProfile?: (coachId?: string) => void;
  onViewAllPlayers?: () => void;
}

export function TeamProfileScreen({
  teamId,
  teamData: propTeamData,
  onBack,
  onViewCoachProfile,
  onViewAllPlayers,
}: TeamProfileProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [teamData, setTeamData] = useState<TeamProfileData | null>(propTeamData || null);
  const [loading, setLoading] = useState<boolean>(!propTeamData);

  useEffect(() => {
    if (propTeamData) {
      setTeamData(propTeamData);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchTeamDetails = async () => {
      try {
        setLoading(true);
        const path = teamId ? `/teams/${teamId}` : "/athletes/team";
        const res: any = await requestAuthenticatedJson(path).catch(() => null);

        if (isMounted) {
          if (res) {
            const rawTeam = res.team || res;
            const rawCoach = res.coach || rawTeam.coach || {};
            const rawRoster = Array.isArray(res.roster) ? res.roster : Array.isArray(rawTeam.roster) ? rawTeam.roster : Array.isArray(rawTeam.roster_list) ? rawTeam.roster_list : [];

            const coachObj: Coach = {
              coach_id: rawCoach.coach_id || rawTeam.coach_id || "",
              full_name: (rawCoach.full_name || rawCoach.name || "Assigned Coach").toUpperCase(),
              role_title: (rawCoach.role_title || rawCoach.current_institution || "HEAD COACH").toUpperCase(),
              years_experience: rawCoach.years_of_experience || rawCoach.years_experience ? `${rawCoach.years_of_experience || rawCoach.years_experience} Years` : "Head Coach",
              quote: rawCoach.quote || "Dedicated to driving team excellence and athlete development.",
              is_verified: true,
            };

            const playersList: RosterPlayer[] = rawRoster.map((player: any, idx: number) => {
              const fName = player.first_name || player.name || "Player";
              const lName = player.last_name || "";
              return {
                id: player.athlete_id || player.id || player.user_id || `player_${idx}`,
                name: `${fName} ${lName}`.trim(),
                position: (player.position || "ATHLETE").toUpperCase(),
                avatar_url: player.avatar_url,
              };
            });

            setTeamData({
              team_id: rawTeam.team_id || teamId || "",
              team_name: rawTeam.team_name || "Team Roster",
              mission_statement: rawTeam.mission_statement || rawTeam.description || "Building character, discipline, and competitive excellence through athletics.",
              region: rawTeam.region || "NCR",
              total_athletes: playersList.length || Number(rawTeam.athlete_count || 0),
              established_year: String(rawTeam.established_year || new Date().getFullYear()),
              coach: coachObj,
              players: playersList,
            });
          } else {
            setTeamData(null);
          }
        }
      } catch (err) {
        if (isMounted) setTeamData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTeamDetails();
    return () => {
      isMounted = false;
    };
  }, [teamId, propTeamData]);

  const displayedPlayers = teamData ? (showAllPlayers ? teamData.players : teamData.players.slice(0, 3)) : [];

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>MY TEAM</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={{ color: "#94A3B8", marginTop: 12, fontSize: 14 }}>Loading team details...</Text>
        </View>
      ) : !teamData ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, paddingTop: 40 }}>
          <Ionicons name="people-outline" size={64} color="#64748B" />
          <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" }}>
            No Team Affiliation
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            You are currently not affiliated with an active squad. Join a team or accept a recruitment offer to view your team profile.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Main Team Card */}
          <View style={styles.mainTeamCard}>
            <View style={styles.avatarBox}>
              <Ionicons name="shield-checkmark-outline" size={44} color="#38BDF8" />
            </View>

            <Text style={styles.teamTitle}>{teamData.team_name}</Text>

            {/* Quote Block */}
            <View style={styles.quoteBlock}>
              <View style={styles.verticalCyanLine} />
              <Text style={styles.quoteText}>"{teamData.mission_statement}"</Text>
            </View>
          </View>

          {/* Stats Row (3 Columns) */}
          <View style={styles.statsCardContainer}>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>REGION</Text>
              <Text style={styles.statValue}>{teamData.region}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>ATHLETES</Text>
              <Text style={styles.statValue}>{teamData.total_athletes}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>EST.</Text>
              <Text style={styles.statValue}>{teamData.established_year}</Text>
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
              <View style={styles.coachBannerArea}>
                <Ionicons name="person-outline" size={56} color="#64748B" />
              </View>

              <View style={styles.coachDetailsBody}>
                <Text style={styles.coachName}>{teamData.coach.full_name}</Text>
                <Text style={styles.coachRole}>{teamData.coach.role_title}</Text>

                <View style={styles.experiencePill}>
                  <Text style={styles.experiencePillText}>
                    {teamData.coach.years_experience}
                  </Text>
                </View>

                <Pressable
                  style={styles.viewCoachButton}
                  onPress={() =>
                    onViewCoachProfile && onViewCoachProfile(teamData.coach.coach_id)
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
              {teamData.players.length > 3 && (
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
              )}
            </View>

            {/* Roster Players List */}
            {displayedPlayers.length === 0 ? (
              <Text style={{ color: "#94A3B8", fontSize: 13, paddingVertical: 12 }}>No players listed in roster.</Text>
            ) : (
              displayedPlayers.map((player) => (
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
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}




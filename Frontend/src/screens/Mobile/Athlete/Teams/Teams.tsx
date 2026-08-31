import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import styles from "./styles/Teams";
import { Ionicons } from "@expo/vector-icons";
import { TeamDetailsScreen } from "./TeamDetails";
import { InquireCoachScreen } from "./InquireCoach";
import { InquiriesScreen } from "./Inquiries";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

//schemas
export interface Coach {
  coach_id: string;
  full_name: string;
  role_title: string;
  years_experience: string;
  quote: string;
  avatar_url?: string;
  is_verified?: boolean;
}

export interface TeamSchema {
  team_id: string;
  team_name: string;
  sport_type: "BASKETBALL" | "TRACK AND FIELD" | "SWIMMING";
  managed_by_coach_id: string;
  created_at: string;
  roster_athletes: string[]; // List of athlete UUIDs
  program_type_tag?: string; // e.g. "ELITE VARSITY PROGRAM"
  description: string;
  region: string; // e.g. "Bicol"
  head_coach: Coach;
}

export interface CoachProfileSchema {
  coach_id: string;
  full_name: string;
  institution: string;
  role_title: string;
  tags: string[]; // ["VARSITY", "RECRUITER", "ACTIVE SCOUTING"]
  years_experience: string; // "15+"
  core_specialties: string[];
  success_rate: string; // "94%"
  recruits_placed: string; // "80+ Recruits Placed"
  philosophy: string;
  quote: string;
  certificates: string[];
  contact_info: {
    email: string;
    facebook: string;
    phone: string;
  };
}

export interface InquirySchema {
  inquiry_id: string;
  coach_name: string;
  institution_sport: string;
  status: "ACCEPTED" | "PENDING" | "DECLINED";
  updated_at_relative: string;
  sub_note?: string; // e.g. "Roster Full"
}

type ScreenState = "DIRECTORY" | "TEAM_DETAILS" | "COACH_PROFILE" | "INQUIRIES";

interface TeamsProps {
  onNavigateTab?: (tabName: "HOME" | "COACHES" | "PROFILE") => void;
  onScreenStateChange?: (isSubScreen: boolean) => void;
}

export function Teams({ onNavigateTab, onScreenStateChange }: TeamsProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>("DIRECTORY");
  const [teams, setTeams] = useState<TeamSchema[]>([]);
  const [inquiries, setInquiries] = useState<InquirySchema[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamSchema | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<CoachProfileSchema | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("BASKETBALL");
  const [loading, setLoading] = useState(true);
  const pulseAnim = useState(new Animated.Value(0.3))[0];

  useEffect(() => {
    if (onScreenStateChange) {
      onScreenStateChange(currentScreen !== "DIRECTORY");
    }
  }, [currentScreen, onScreenStateChange]);

  useEffect(() => {
    let isMounted = true;
    const fetchDirectoryAndInquiries = async () => {
      try {
        setLoading(true);
        let teamsRes: any = await requestAuthenticatedJson("/teams").catch(() => null);
        if (!teamsRes || (Array.isArray(teamsRes) && teamsRes.length === 0) || (teamsRes.teams && teamsRes.teams.length === 0)) {
          const browseRes: any = await requestAuthenticatedJson("/teams/browse").catch(() => null);
          if (browseRes && (browseRes.teams?.length > 0 || (Array.isArray(browseRes) && browseRes.length > 0))) {
            teamsRes = browseRes;
          }
        }

        const [inquiriesRes, proposalsRes]: [any, any] = await Promise.all([
          requestAuthenticatedJson("/inquiries").catch(() => null),
          requestAuthenticatedJson("/scouting/proposals").catch(() => null),
        ]);

        if (isMounted) {
          const rawTeams = teamsRes?.teams || (Array.isArray(teamsRes) ? teamsRes : []);
          const mappedTeams: TeamSchema[] = rawTeams.map((t: any, idx: number) => {
            const rawSport = (t.sport_type || t.category || t.sport || "BASKETBALL").toString().toUpperCase().trim();
            let exactSport: TeamSchema["sport_type"] = "BASKETBALL";
            if (rawSport.includes("TRACK") || rawSport.includes("FIELD") || rawSport.includes("ATHLETIC")) {
              exactSport = "TRACK AND FIELD";
            } else if (rawSport.includes("SWIM")) {
              exactSport = "SWIMMING";
            } else {
              exactSport = "BASKETBALL";
            }

            return {
              team_id: t.team_id || `team_${idx}`,
              team_name: t.team_name || "Varsity Team",
              sport_type: exactSport,
              managed_by_coach_id: t.coach_id || "",
              created_at: t.timestamp || new Date().toISOString(),
              roster_athletes: Array(t.athlete_count || 0).fill("ath_uuid"),
              program_type_tag: `${(t.division || "VARSITY").toUpperCase()} PROGRAM`,
              description: t.description || t.mission_statement || `Official ${exactSport} program in ${t.region || "NCR"}.`,
              region: t.region || "NCR",
              head_coach: {
                coach_id: t.coach_id || "",
                full_name: (t.coach_name || "Head Coach").toUpperCase(),
                role_title: `${exactSport} HEAD COACH`,
                years_experience: "Experienced Coach",
                quote: "Focused on developing fundamental athletic resilience and performance.",
              },
            };
          });
          setTeams(mappedTeams);

          const rawInq = inquiriesRes?.inquiries || (Array.isArray(inquiriesRes) ? inquiriesRes : []);
          const rawProp = proposalsRes?.proposals || (Array.isArray(proposalsRes) ? proposalsRes : []);
          const combinedInquiries = [...rawInq, ...rawProp];

          const mappedInquiries: InquirySchema[] = combinedInquiries.map((inq: any, idx: number) => {
            const rawStatus = (inq.offer_status || inq.status || inq.response_status || "PENDING").toUpperCase();
            const mappedStatus = rawStatus.includes("ACCEPT")
              ? "ACCEPTED"
              : rawStatus.includes("DECLIN") || rawStatus.includes("REJECT")
              ? "DECLINED"
              : "PENDING";
            return {
              inquiry_id: inq.scout_id || inq.inquiry_id || inq.id || `inq_${idx}`,
              coach_name: inq.coach_name || inq.sender_name || inq.name || "Coach",
              institution_sport: `${inq.current_institution || inq.institution_name || inq.team_name || "Varsity"} • ${inq.sport_category || inq.sport_type || "Basketball"}`,
              status: mappedStatus as any,
              updated_at_relative: `Sent: ${inq.date_initiated || inq.created_at ? new Date(inq.date_initiated || inq.created_at).toLocaleDateString() : "Recently"}`,
              sub_note: inq.decline_reason || undefined,
            };
          });
          setInquiries(mappedInquiries);
        }
      } catch (err) {
        if (isMounted) {
          setTeams([]);
          setInquiries([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDirectoryAndInquiries();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.8,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [loading, pulseAnim]);

  const handleOpenTeam = async (team: TeamSchema) => {
    setSelectedTeam(team);
    setCurrentScreen("TEAM_DETAILS");

    if (team.team_id) {
      const detailed: any = await requestAuthenticatedJson(`/teams/${team.team_id}`).catch(() => null);
      if (detailed) {
        const rawCoach = detailed.coach || detailed.head_coach || {};
        setSelectedTeam({
          ...team,
          description: detailed.description || detailed.mission_statement || team.description,
          region: detailed.region || team.region,
          roster_athletes: Array.isArray(detailed.roster) ? detailed.roster.map((r: any) => r.athlete_id) : team.roster_athletes,
          head_coach: {
            coach_id: rawCoach.coach_id || team.head_coach.coach_id,
            full_name: (rawCoach.full_name || team.head_coach.full_name).toUpperCase(),
            role_title: (rawCoach.role_title || rawCoach.current_institution || team.head_coach.role_title).toUpperCase(),
            years_experience: rawCoach.years_of_experience ? `${rawCoach.years_of_experience} Years` : team.head_coach.years_experience,
            quote: rawCoach.quote || team.head_coach.quote,
          },
        });
      }
    }
  };

  const handleOpenCoach = async (coachId?: string) => {
    const targetId = coachId || selectedTeam?.head_coach.coach_id;
    if (!targetId) return;

    setSelectedCoach(null);
    setCurrentScreen("COACH_PROFILE");

    const res: any = await requestAuthenticatedJson(`/coaches/${targetId}`).catch(() => null);
    if (res) {
      const c = res.profile || res.coach || res;
      const firstName = c.first_name || "";
      const lastName = c.last_name || "";
      const fullName = c.full_name || `${firstName} ${lastName}`.trim() || "Coach Profile";
      const inst = c.current_institution || c.institution || "Athletic Program";
      const sport = (c.sport_type || "Basketball").toUpperCase();

      setSelectedCoach({
        coach_id: c.coach_id || targetId,
        full_name: fullName.toUpperCase(),
        institution: inst,
        role_title: c.role_title || `${sport} HEAD COACH`,
        tags: Array.isArray(c.tags) && c.tags.length > 0 ? c.tags : [sport, "VERIFIED COACH"],
        years_experience: c.years_of_experience || c.years_experience ? `${c.years_of_experience || c.years_experience}+` : "5+",
        core_specialties: Array.isArray(c.specialties) && c.specialties.length > 0 ? c.specialties : Array.isArray(c.core_specialties) ? c.core_specialties : ["Tactical Strategy", "Physical Conditioning", "Talent Scouting"],
        success_rate: c.success_rate ? `${c.success_rate}%` : "90%",
        recruits_placed: c.recruits_placed || "Certified Athletic Staff",
        philosophy: c.philosophy || c.bio || `${fullName} brings extensive athletic experience and tactical discipline. The coaching approach focuses on athlete development and high performance.`,
        quote: c.quote || "Discipline and consistent effort drive championship execution.",
        certificates: Array.isArray(c.professional_documents) && c.professional_documents.length > 0 ? c.professional_documents.map((d: any) => typeof d === 'string' ? d.replace(/\.[^/.]+$/, "") : (d.name || "Certified Coach")) : ["Professional Coaching Certification"],
        contact_info: {
          email: c.email || "coach@atleta.com",
          facebook: c.facebook || fullName,
          phone: c.contact_number || c.phone || "Contact via App",
        },
      });
    }
  };

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      !searchQuery ||
      team.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.sport_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = !selectedSport || team.sport_type === selectedSport;
    return matchesSearch && matchesSport;
  });

  // SCREEN ROUTING RENDER
  if (currentScreen === "TEAM_DETAILS" && selectedTeam) {
    return (
      <TeamDetailsScreen
        team={selectedTeam}
        onBack={() => setCurrentScreen("DIRECTORY")}
        onViewCoach={(coachId) => handleOpenCoach(coachId)}
      />
    );
  }

  if (currentScreen === "COACH_PROFILE" && selectedCoach) {
    const isAlreadyInquired = inquiries.some((inq) => {
      const inqName = (inq.coach_name || "").toLowerCase().replace(/^coach\s+/, "").trim();
      const selName = (selectedCoach.full_name || "").toLowerCase().replace(/^coach\s+/, "").trim();
      return inqName && selName && (inqName.includes(selName) || selName.includes(inqName));
    });

    return (
      <InquireCoachScreen
        coach={selectedCoach}
        isAlreadyInquired={isAlreadyInquired}
        onBack={() => setCurrentScreen("TEAM_DETAILS")}
        onGoHome={() => setCurrentScreen("DIRECTORY")}
        onGoInquiries={() => setCurrentScreen("INQUIRIES")}
      />
    );
  }

  if (currentScreen === "INQUIRIES") {
    return (
      <InquiriesScreen
        inquiries={inquiries}
        onBack={() => setCurrentScreen("DIRECTORY")}
      />
    );
  }

  // SCREEN 1: TEAMS DIRECTORY PAGE
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search & Quick-Link Row */}
        <View style={styles.searchRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#38BDF8"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search specializations (Basketbal..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Quick Link: INQUIRIES */}
          <Pressable
            style={styles.inquiriesQuickLink}
            onPress={() => setCurrentScreen("INQUIRIES")}
          >
            <Image
              source={require("../../../../assets/inquiries.png")}
              style={styles.inquiriesIconImage}
              resizeMode="contain"
            />
            <Text style={styles.inquiriesQuickText}>INQUIRIES</Text>
          </Pressable>
        </View>

        {/* Sport Filter Chips Horizontal Scroll */}
        <ScrollView
          horizontal
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          <Pressable
            style={[
              styles.sportChip,
              selectedSport === "BASKETBALL" && styles.sportChipActive,
            ]}
            onPress={() =>
              setSelectedSport(
                selectedSport === "BASKETBALL" ? "" : "BASKETBALL"
              )
            }
          >
            <Ionicons
              name="basketball-outline"
              size={16}
              color={selectedSport === "BASKETBALL" ? "#38BDF8" : "#94A3B8"}
            />
            <Text
              style={[
                styles.sportChipText,
                selectedSport === "BASKETBALL" && styles.sportChipTextActive,
              ]}
            >
              BASKETBALL
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.sportChip,
              selectedSport === "TRACK AND FIELD" && styles.sportChipActive,
            ]}
            onPress={() =>
              setSelectedSport(
                selectedSport === "TRACK AND FIELD" ? "" : "TRACK AND FIELD"
              )
            }
          >
            <Image
              source={require("../../../../assets/Athleticsicon.png")}
              style={[
                styles.sportChipIconImage,
                { tintColor: selectedSport === "TRACK AND FIELD" ? "#38BDF8" : "#94A3B8" },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.sportChipText,
                selectedSport === "TRACK AND FIELD" && styles.sportChipTextActive,
              ]}
            >
              TRACK AND FIELD
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.sportChip,
              selectedSport === "SWIMMING" && styles.sportChipActive,
            ]}
            onPress={() =>
              setSelectedSport(
                selectedSport === "SWIMMING" ? "" : "SWIMMING"
              )
            }
          >
            <Image
              source={require("../../../../assets/swimmingicon.png")}
              style={[
                styles.sportChipIconImage,
                { tintColor: selectedSport === "SWIMMING" ? "#38BDF8" : "#94A3B8" },
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.sportChipText,
                selectedSport === "SWIMMING" && styles.sportChipTextActive,
              ]}
            >
              SWIMMING
            </Text>
          </Pressable>
        </ScrollView>

        {/* Section Title */}
        <Text style={styles.sectionTitle}>Teams</Text>

        {/* Skeleton Loaders or Team Cards List */}
        {loading ? (
          <View style={styles.skeletonContainer}>
            {[1, 2, 3].map((key) => (
              <Animated.View
                key={key}
                style={[styles.skeletonCard, { opacity: pulseAnim }]}
              />
            ))}
          </View>
        ) : filteredTeams.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <Ionicons name="shield-outline" size={48} color="#64748B" />
            <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "700", marginTop: 12 }}>No Sports Teams Found</Text>
            <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 4 }}>No teams match the current filter.</Text>
          </View>
        ) : (
          filteredTeams.map((team) => (
            <View key={team.team_id} style={styles.teamCard}>
              <Text style={styles.teamName}>{team.team_name}</Text>
              <Text style={styles.sportTag}>{team.sport_type}</Text>
              <Text style={styles.teamDescription} numberOfLines={2}>
                {team.description}
              </Text>

              {/* Card Footer Row */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.headCoachLabel}>HEAD COACH</Text>
                  <Text style={styles.headCoachName}>
                    {team.head_coach.full_name}
                  </Text>
                </View>

                <Pressable
                  style={styles.viewTeamButton}
                  onPress={() => handleOpenTeam(team)}
                >
                  <Text style={styles.viewTeamText}>VIEW TEAM</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}




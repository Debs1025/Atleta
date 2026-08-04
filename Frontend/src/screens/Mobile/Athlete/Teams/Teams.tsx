import React, { useEffect, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TeamDetailsScreen } from "./TeamDetails";
import { InquireCoachScreen } from "./InquireCoach";
import { InquiriesScreen } from "./Inquiries";


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
  sport_type: "BASKETBALL" | "TRACK AND FIELD" | "SWIMMING" | "VOLLEYBALL";
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

// Sample Data for teams 
export const MOCK_TEAMS: TeamSchema[] = [
  {
    team_id: "team_001",
    team_name: "Camarines Sur Lakers",
    sport_type: "BASKETBALL",
    managed_by_coach_id: "coach_erick_01",
    created_at: "2024-01-15T00:00:00Z",
    roster_athletes: Array(48).fill("ath_uuid"),
    program_type_tag: "ELITE VARSITY PROGRAM",
    description:
      "Dedicated to cultivating elite athletic performance through disciplined training, academic excellence, and technical mastery in regional competition. Our mission is to forge resilient student-athletes ready for national recruitment.",
    region: "Bicol",
    head_coach: {
      coach_id: "coach_erick_01",
      full_name: "Coach Marcus Sterling",
      role_title: "Elite Performance Director",
      years_experience: "12 Years Experience",
      quote:
        "Focused on developing fundamental movement patterns and high-stakes mental resilience.",
    },
  },
  {
    team_id: "team_002",
    team_name: "Bicol Velocity Track",
    sport_type: "TRACK AND FIELD",
    managed_by_coach_id: "coach_david_02",
    created_at: "2024-02-01T00:00:00Z",
    roster_athletes: Array(32).fill("ath_uuid"),
    program_type_tag: "HIGH PERFORMANCE PROGRAM",
    description: "Specializing in Track and Field around Naga City.",
    region: "Naga City",
    head_coach: {
      coach_id: "coach_david_02",
      full_name: "Joseph Alaba",
      role_title: "Sprint & Track Lead",
      years_experience: "10 Years Experience",
      quote:
        "Speed is forged through technical precision and consistent recovery.",
    },
  },
  {
    team_id: "team_003",
    team_name: "Naga City Swimmers",
    sport_type: "SWIMMING",
    managed_by_coach_id: "coach_elena_03",
    created_at: "2024-03-10T00:00:00Z",
    roster_athletes: Array(24).fill("ath_uuid"),
    program_type_tag: "AQUATICS VARSITY PROGRAM",
    description: "Specialize in skills and form in swimming.",
    region: "Naga City",
    head_coach: {
      coach_id: "coach_elena_03",
      full_name: "David Brunson",
      role_title: "Head Aquatics Director",
      years_experience: "8 Years Experience",
      quote:
        "Mastering stroke efficiency and aerobic conditioning for peak competitive racing.",
    },
  },
];

// Temporary Coach Data
export const MOCK_COACH_PROFILES: Record<string, CoachProfileSchema> = {
  coach_erick_01: {
    coach_id: "coach_erick_01",
    full_name: "COACH ERICK NATHANIEL",
    institution: "Albay National High School",
    role_title: "Head of Basketball Operations",
    tags: ["VARSITY", "RECRUITER", "ACTIVE SCOUTING"],
    years_experience: "15+",
    core_specialties: [
      "Basketball Strategy",
      "Strength & Conditioning",
      "Player Development",
    ],
    success_rate: "94%",
    recruits_placed: "80+ Recruits Placed",
    philosophy:
      "Coach Erick Nathaniel brings over a decade of high-stakes experience to Albay National High School. His approach centers on the \"Total Athlete\" concept—integrating rigorous tactical basketball training with advanced physiological conditioning and academic excellence.",
    quote:
      "We don't just build players; we build professionals. My goal is to bridge the gap between high school potential and collegiate readiness by instilling discipline, tactical intelligence, and a relentless work ethic from day one.",
    certificates: [
      "Professional Basketball",
      "Certified Athlete Coach",
      "Certified Basketball Trainer",
    ],
    contact_info: {
      email: "coach@gmail.com",
      facebook: "Gerard Pelonio",
      phone: "+67000",
    },
  },
};

// Temporary Athlete Inquiries
export const MOCK_INQUIRIES: InquirySchema[] = [
  {
    inquiry_id: "inq_01",
    coach_name: "Coach Marcus Sterling",
    institution_sport: "Stanford University • Basketball",
    status: "ACCEPTED",
    updated_at_relative: "Last update: 2h ago",
  },
  {
    inquiry_id: "inq_02",
    coach_name: "Coach Sarah Jenkins",
    institution_sport: "University of Virginia • Soccer",
    status: "PENDING",
    updated_at_relative: "Sent: Oct 24, 2025",
  },
  {
    inquiry_id: "inq_03",
    coach_name: "Coach David Chen",
    institution_sport: "Oregon State • Track & Field",
    status: "DECLINED",
    updated_at_relative: "Sent: Oct 22, 2025",
    sub_note: "Roster Full",
  },
  {
    inquiry_id: "inq_04",
    coach_name: "Coach Elena Rodriguez",
    institution_sport: "Duke University • Swimming",
    status: "PENDING",
    updated_at_relative: "Sent: Oct 20, 2025",
  },
];

type ScreenState = "DIRECTORY" | "TEAM_DETAILS" | "COACH_PROFILE" | "INQUIRIES";

interface TeamsProps {
  onNavigateTab?: (tabName: "HOME" | "COACHES" | "PROFILE") => void;
  onScreenStateChange?: (isSubScreen: boolean) => void;
}

export function Teams({ onNavigateTab, onScreenStateChange }: TeamsProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>("DIRECTORY");
  const [selectedTeam, setSelectedTeam] = useState<TeamSchema>(MOCK_TEAMS[0]);
  const [selectedCoach, setSelectedCoach] = useState<CoachProfileSchema>(
    MOCK_COACH_PROFILES["coach_erick_01"]
  );
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
    // Skeletal Loader
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
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

  const handleOpenTeam = (team: TeamSchema) => {
    setSelectedTeam(team);
    setCurrentScreen("TEAM_DETAILS");
  };

  const handleOpenCoach = (coachId?: string) => {
    const targetCoach =
      (coachId && MOCK_COACH_PROFILES[coachId]) ||
      MOCK_COACH_PROFILES["coach_erick_01"];
    setSelectedCoach(targetCoach);
    setCurrentScreen("COACH_PROFILE");
  };

  const filteredTeams = MOCK_TEAMS.filter((team) => {
    const matchesSearch =
      team.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.sport_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSport = selectedSport
      ? team.sport_type === selectedSport
      : true;
    return matchesSearch && matchesSport;
  });

  // SCREEN ROUTING RENDER
  if (currentScreen === "TEAM_DETAILS") {
    return (
      <TeamDetailsScreen
        team={selectedTeam}
        onBack={() => setCurrentScreen("DIRECTORY")}
        onViewCoach={(coachId) => handleOpenCoach(coachId)}
      />
    );
  }

  if (currentScreen === "COACH_PROFILE") {
    return (
      <InquireCoachScreen
        coach={selectedCoach}
        onBack={() => setCurrentScreen("TEAM_DETAILS")}
        onGoHome={() => setCurrentScreen("DIRECTORY")}
        onGoInquiries={() => setCurrentScreen("INQUIRIES")}
      />
    );
  }

  if (currentScreen === "INQUIRIES") {
    return (
      <InquiriesScreen
        inquiries={MOCK_INQUIRIES}
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
              Basketball
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
  },
  topHeaderBar: {
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0B132B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  bellButton: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111C35",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    padding: 0,
  },
  inquiriesQuickLink: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  inquiriesIconImage: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },
  inquiriesQuickText: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  filterScroll: {
    marginBottom: 20,
  },
  filterScrollContent: {
    alignItems: "center",
  },
  sportChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111C35",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  sportChipActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#38BDF8",
  },
  sportChipIconImage: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  sportChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  sportChipTextActive: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },
  teamCard: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 14,
  },
  teamName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  sportTag: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  teamDescription: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 12,
  },
  headCoachLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headCoachName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  viewTeamButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewTeamText: {
    color: "#0B132B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  skeletonContainer: {
    marginTop: 4,
  },
  skeletonCard: {
    height: 140,
    backgroundColor: "#111C35",
    borderRadius: 16,
    marginBottom: 14,
  },
  bottomTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0B132B",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingBottom: 24,
  },
  tabItem: {
    alignItems: "center",
  },
  tabIcon: {
    width: 22,
    height: 22,
  },
  tabIconActive: {
    tintColor: "#38BDF8",
  },
  tabIconInactive: {
    tintColor: "#64748B",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#38BDF8",
  },
  tabLabelInactive: {
    color: "#64748B",
  },
});

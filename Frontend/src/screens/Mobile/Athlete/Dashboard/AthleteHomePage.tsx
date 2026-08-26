import React, { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/AthleteHomePage";
import { HomeAnalyticsPage, AthleteProfile, EligibleDocument } from "./HomeAnalyticsPage";
import { AthleteProfilePage } from "../Profile/AthleteProfilePage";
import { NotificationPage, NotificationItem } from "./Notification";
import { Teams } from "../Teams/Teams";
import { TeamProfileScreen } from "./TeamProfile";
import { CoachProfileScreen } from "./CoachProfile";
import { requestAuthenticatedJson } from "../../Authentication/authShared";
import { AthleteHomePageSkeleton } from "./AthleteSkeletons";

const DEFAULT_ELIGIBLE_DOCS: EligibleDocument[] = [];

// Athlete Data Structure
export const initialAthleteProfile: AthleteProfile = {
  athlete_id: "",
  first_name: "",
  last_name: "",
  birthdate: "",
  gender: "MALE",
  province: "",
  category: "BASKETBALL",
  height_cm: 0,
  weight_kg: 0,
  wingspan_cm: 0,
  current_affiliation: {
    team_id: "",
    team_name: "Unassigned Team",
    sport_type: "BASKETBALL",
    division: "",
    head_coach: {
      coach_id: "",
      full_name: "No Coach Assigned",
      role_title: "Head Coach",
      years_experience: "0 Years",
      quote: "",
    },
    is_verified: false,
  },
  analytics: {
    points_per_game: 0,
    assists_per_game: 0,
    rebounds_per_game: 0,
    field_goal_percentage: 0,
    free_throw_percentage: 0,
    last_5_games_scores: [],
  },
  eligible_documents: [],
};

type TabType = "HOME" | "COACHES" | "PROFILE";

interface AthleteHomePageProps {
  onLogout?: () => void;
}

export function AthleteHomePage({ onLogout }: AthleteHomePageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("HOME");
  const [dashboardScreen, setDashboardScreen] = useState<
    "HOME_MAIN" | "TEAM_PROFILE" | "COACH_PROFILE"
  >("HOME_MAIN");
  const [selectedCoachId, setSelectedCoachId] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<AthleteProfile>(initialAthleteProfile);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [hideParentBars, setHideParentBars] = useState(false);

  useEffect(() => {
    if (activeTab !== "HOME") {
      setDashboardScreen("HOME_MAIN");
    }
    if (activeTab !== "COACHES" && dashboardScreen === "HOME_MAIN") {
      setHideParentBars(false);
    }
  }, [activeTab, dashboardScreen]);

  useEffect(() => {
    let isMounted = true;
    const fetchAthleteHomeData = async () => {
      try {
        const [homeRes, profileRes, statsRes, workloadRes]: [any, any, any, any] = await Promise.all([
          requestAuthenticatedJson("/athletes/home").catch(() => null),
          requestAuthenticatedJson("/athletes/profile").catch(() => null),
          requestAuthenticatedJson("/athletes/stats/all").catch(() => null),
          requestAuthenticatedJson("/athletes/workload").catch(() => null),
        ]);

        if (isMounted && (homeRes || profileRes || statsRes || workloadRes)) {
          const raw = { ...(homeRes || {}), ...(profileRes || {}), ...(statsRes || {}) };
          const stats = raw.stats || raw.analytics || raw;
          const phys = raw.physical_attributes || raw.physical_profile || raw;

          let finalWorkloadRes: any = workloadRes;
          if (!finalWorkloadRes || (!finalWorkloadRes.recent_entries?.length && !finalWorkloadRes.weekly_logs?.length)) {
            const targetId = raw.athlete_id || raw.user_id || raw.user?.uid;
            if (targetId) {
              const specificWl: any = await requestAuthenticatedJson(`/athletes/${targetId}/workload`).catch(() => null);
              if (specificWl && (specificWl.recent_entries?.length > 0 || specificWl.weekly_logs?.length > 0)) {
                finalWorkloadRes = specificWl;
              }
            }
          }

          const rawWorkload: any = (finalWorkloadRes && (finalWorkloadRes.recent_entries?.length > 0 || finalWorkloadRes.weekly_logs?.length > 0))
            ? finalWorkloadRes
            : (profileRes?.workload_analytics || profileRes?.workload || homeRes?.workload_summary || homeRes?.workload || finalWorkloadRes || {});
          
          const entriesList = rawWorkload.recent_entries || rawWorkload.weekly_logs || [];
          
          // Group multiple workout logs on the same date: sum total minutes, keep max intensity
          const groupedByDateMap = new Map<string, { date: string; duration_minutes: number; srpe: number }>();

          if (Array.isArray(entriesList)) {
            entriesList.forEach((entry: any) => {
              const dateStr = entry.entry_date ? String(entry.entry_date).slice(5) : (entry.date || "DAY");
              const duration = Number(entry.session_duration_mins || entry.duration_minutes || 0);
              const intensity = Number(entry.srpe_score || entry.srpe || 0);

              if (groupedByDateMap.has(dateStr)) {
                const existing = groupedByDateMap.get(dateStr)!;
                existing.duration_minutes += duration;
                existing.srpe = Math.max(existing.srpe, intensity);
              } else {
                groupedByDateMap.set(dateStr, {
                  date: dateStr,
                  duration_minutes: duration,
                  srpe: intensity,
                });
              }
            });
          }

          const weeklyLogsGrouped = Array.from(groupedByDateMap.values()).slice(0, 7);

          const workloadAnalyticsObj = {
            acute_load_7day_avg: rawWorkload.acute_load_7d || rawWorkload.acute_load || rawWorkload.acute_load_7day_avg || 0,
            chronic_load_28day_avg: rawWorkload.chronic_load_28d || rawWorkload.chronic_load || rawWorkload.chronic_load_28day_avg || 380,
            weekly_logs: weeklyLogsGrouped,
          };

          const mappedProfile: AthleteProfile = {
            athlete_id: raw.athlete_id || raw.user_id || "ath_me",
            first_name: (raw.first_name || raw.user?.first_name || "").toUpperCase(),
            last_name: (raw.last_name || raw.user?.last_name || "").toUpperCase(),
            birthdate: raw.birthdate || raw.birth_date || raw.user?.birthdate || "",
            gender: (raw.gender || raw.user?.gender || "").toUpperCase(),
            province: (raw.province || raw.location || raw.user?.province || "").replace(/,\s*PH(ILIPPINES)?$/i, "").trim().toUpperCase(),
            category: (raw.sport_type || raw.category || raw.sport || "BASKETBALL").toUpperCase() as any,
            height_cm: Number(phys.height_cm || phys.height || raw.height_cm || raw.height || 0),
            weight_kg: Number(phys.weight_kg || phys.weight || raw.weight_kg || raw.weight || 0),
            wingspan_cm: Number(phys.wingspan_cm || phys.wingspan || raw.wingspan_cm || raw.wingspan || 0),
            recruitment_status: raw.recruitment_status || "AVAILABLE",
            leaderboard_rank: raw.leaderboard_rank || "N/A",
            current_affiliation: {
              team_id: raw.current_affiliation?.team_id || raw.team_id || "",
              team_name: raw.current_affiliation?.team_name || raw.team_name || (raw.team_id ? "Assigned Team" : "Unassigned Team"),
              sport_type: (raw.current_affiliation?.sport_type || raw.sport_type || raw.category || "BASKETBALL").toUpperCase() as any,
              division: raw.current_affiliation?.division || raw.division || "",
              head_coach: raw.current_affiliation?.head_coach || raw.head_coach || {
                coach_id: "",
                full_name: "No Coach Assigned",
                role_title: "Head Coach",
                years_experience: "0 Years",
                quote: "",
              },
              is_verified: Boolean(raw.current_affiliation?.is_verified ?? raw.is_verified),
            },
            analytics: {
              points_per_game: Number(stats.points_per_game ?? stats.ppg ?? stats.points ?? 0),
              assists_per_game: Number(stats.assists_per_game ?? stats.apg ?? stats.assists ?? 0),
              rebounds_per_game: Number(stats.rebounds_per_game ?? stats.rpg ?? stats.rebounds ?? 0),
              field_goal_percentage: Number(stats.field_goal_percentage ?? stats.fg_pct ?? stats.fg_percentage ?? 0),
              free_throw_percentage: Number(stats.free_throw_percentage ?? stats.ft_pct ?? stats.ft_percentage ?? 0),
              last_5_games_scores: stats.last_5_games_scores || stats.last_games || stats.recent_scores || [],
            },
            workload_analytics: workloadAnalyticsObj,
            eligible_documents: raw.eligible_documents || raw.documents || [],
            auth_provider: raw.provider || raw.auth_provider || raw.user?.provider || "password",
          };
          setProfile(mappedProfile);
        }
      } catch (error) {
        // Token authentication fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAthleteHomeData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdateProfile = (updatedProfile: AthleteProfile) => {
    setProfile(updatedProfile);
  };

  const handleUploadDocumentFromNotification = (docInfo: {
    document_name: string;
    required_type: string;
    fileName: string;
    fileUri?: string;
  }) => {
    const todayStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).toUpperCase();

    const currentDocs = profile.eligible_documents || DEFAULT_ELIGIBLE_DOCS;
    let found = false;

    const updatedDocs = currentDocs.map((docItem) => {
      const isMatchCategory =
        docItem.category === docInfo.required_type ||
        (docInfo.required_type === "BIRTH_CERTIFICATE" && docItem.category === "BIRTH_CERTIFICATE");
      const isMatchTitle =
        docItem.title.toLowerCase().includes("psa") ||
        docItem.title.toLowerCase().includes("birth") ||
        docItem.title.toLowerCase().includes(docInfo.document_name.toLowerCase());

      if (isMatchCategory || isMatchTitle) {
        found = true;
        return {
          ...docItem,
          fileName: docInfo.fileName,
          fileUri: docInfo.fileUri,
          status: "UPLOADED" as const,
          uploadedAt: todayStr,
        };
      }
      return docItem;
    });

    if (!found) {
      updatedDocs.push({
        id: `doc_${Date.now()}`,
        title: docInfo.document_name,
        category: (docInfo.required_type as any) || "OTHER",
        fileName: docInfo.fileName,
        fileUri: docInfo.fileUri,
        status: "UPLOADED" as const,
        uploadedAt: todayStr,
      });
    }

    const updatedProfile: AthleteProfile = {
      ...profile,
      eligible_documents: updatedDocs,
    };

    setProfile(updatedProfile);
  };

  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  if (showNotifications) {
    return (
      <NotificationPage
        onBack={() => setShowNotifications(false)}
        notifications={notifications.length > 0 ? notifications : undefined}
        onNotificationsChange={setNotifications}
        onUploadDocumentSuccess={handleUploadDocumentFromNotification}
      />
    );
  }

  if (loading) {
    return <AthleteHomePageSkeleton />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
      {!hideParentBars && (
        <View style={[styles.topHeaderBar, { paddingTop: headerTopPadding }]}>
          <Text style={styles.brandLogoText}>ATLETA</Text>
          <Pressable
            style={styles.notificationButton}
            onPress={() => setShowNotifications(true)}
          >
            <Image
              source={require("../../../../assets/notification.png")}
              style={styles.notificationIcon}
              resizeMode="contain"
            />
            {unreadCount > 0 && <View style={styles.notificationBadge} />}
          </Pressable>
        </View>
      )}

      {/* Main Active Screen Body */}
      <View style={[styles.screenContainer, { paddingTop: !hideParentBars ? headerTopPadding + 54 : 0 }]}>
        {activeTab === "HOME" &&
          (dashboardScreen === "TEAM_PROFILE" ? (
            <TeamProfileScreen
              onBack={() => {
                setDashboardScreen("HOME_MAIN");
                setHideParentBars(false);
              }}
              onViewCoachProfile={(coachId) => {
                if (coachId) setSelectedCoachId(coachId);
                setDashboardScreen("COACH_PROFILE");
                setHideParentBars(true);
              }}
            />
          ) : dashboardScreen === "COACH_PROFILE" ? (
            <CoachProfileScreen
              coachId={selectedCoachId || profile.current_affiliation?.head_coach?.coach_id}
              onBack={() => {
                setDashboardScreen("TEAM_PROFILE");
                setHideParentBars(true);
              }}
            />
          ) : loading ? (
            <AthleteHomePageSkeleton />
          ) : (
            <HomeAnalyticsPage
              profile={profile}
              loading={loading}
              onNavigateToProfile={() => setActiveTab("PROFILE")}
              onNavigateToCoaches={() => setActiveTab("COACHES")}
              onNavigateToTeamProfile={() => {
                setDashboardScreen("TEAM_PROFILE");
                setHideParentBars(true);
              }}
            />
          ))}

        {activeTab === "PROFILE" && (
          <AthleteProfilePage
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onLogout={onLogout}
            loading={loading}
          />
        )}

        {activeTab === "COACHES" && (
          <Teams
            onNavigateTab={(tab) => setActiveTab(tab)}
            onScreenStateChange={(isSubScreen) => setHideParentBars(isSubScreen)}
          />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      {!hideParentBars && (
        <View style={styles.bottomTabBar}>
        {/* HOME TAB */}
        <Pressable
          style={styles.tabButton}
          onPress={() => setActiveTab("HOME")}
        >
          <Image
            source={require("../../../../assets/Home.png")}
            style={[
              styles.tabIcon,
              activeTab === "HOME" ? styles.tabIconActive : styles.tabIconInactive,
            ]}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "HOME" ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            HOME
          </Text>
        </Pressable>

        {/* COACHES TAB */}
        <Pressable
          style={styles.tabButton}
          onPress={() => setActiveTab("COACHES")}
        >
          <Image
            source={require("../../../../assets/Coaches.png")}
            style={[
              styles.tabIcon,
              activeTab === "COACHES" ? styles.tabIconActive : styles.tabIconInactive,
            ]}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "COACHES" ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            COACHES
          </Text>
        </Pressable>

        {/* PROFILE TAB */}
        <Pressable
          style={styles.tabButton}
          onPress={() => setActiveTab("PROFILE")}
        >
          <Image
            source={require("../../../../assets/profile.png")}
            style={[
              styles.tabIcon,
              activeTab === "PROFILE" ? styles.tabIconActive : styles.tabIconInactive,
            ]}
            resizeMode="contain"
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "PROFILE" ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            PROFILE
          </Text>
        </Pressable>
      </View>
      )}
    </View>
  );
}

export const AthleteMainPage = AthleteHomePage;


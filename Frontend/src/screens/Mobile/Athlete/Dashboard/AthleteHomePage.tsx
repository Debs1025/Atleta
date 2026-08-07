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

//eligible docs with sample data for testing
const DEFAULT_ELIGIBLE_DOCS: EligibleDocument[] = [
  {
    id: "doc_01",
    title: "PSA / NSO Birth Certificate",
    category: "BIRTH_CERTIFICATE",
    status: "PENDING",
  },
  {
    id: "doc_02",
    title: "Medical Fitness Clearance",
    category: "MEDICAL_CLEARANCE",
    fileName: "medical_clearance_2026.pdf",
    status: "UPLOADED",
    uploadedAt: "FEB 04, 2026",
  },
  {
    id: "doc_03",
    title: "School / Student ID Verification",
    category: "SCHOOL_ID",
    status: "PENDING",
  },
];

// Sample data to be used since mayo pang backend
export const initialAthleteProfile: AthleteProfile = {
  athlete_id: "ath_001",
  first_name: "ALEXANDER",
  last_name: "VANCE",
  birthdate: "OCT 14, 1998",
  gender: "MALE",
  province: "CAMARINES SUR",
  category: "BASKETBALL",
  height_cm: 188,
  weight_kg: 82,
  wingspan_cm: 194,
  current_affiliation: {
    team_id: "",
    team_name: "Unassigned Team",
    sport_type: "BASKETBALL",
    division: "Division 1",
    head_coach: {
      coach_id: "",
      full_name: "No Coach Assigned",
      role_title: "Head Coach",
      years_experience: "0 Years",
      quote: "",
    },
    is_verified: false,
  },
  // sample data for testing of formulas
  analytics: {
    points_per_game: 22.4,
    assists_per_game: 8.1,
    rebounds_per_game: 5.5,
    field_goal_percentage: 48,
    free_throw_percentage: 82,
    last_5_games_scores: [14, 18, 30, 16, 24],
  },
  eligible_documents: DEFAULT_ELIGIBLE_DOCS,
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
    // Skeleton Loader
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600);

    // Register device for push notifications
    (async () => {
      try {
        // Push notification registration service initialized for mobile device
      } catch (error) {
        console.log("Push notification initialization:", error);
      }
    })();

    return () => clearTimeout(timer);
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
              onViewCoachProfile={() => {
                setDashboardScreen("COACH_PROFILE");
                setHideParentBars(true);
              }}
            />
          ) : dashboardScreen === "COACH_PROFILE" ? (
            <CoachProfileScreen
              onBack={() => {
                setDashboardScreen("TEAM_PROFILE");
                setHideParentBars(true);
              }}
            />
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
            source={
              activeTab === "PROFILE"
                ? require("../../../../assets/profilepage.png")
                : require("../../../../assets/profile.png")
            }
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


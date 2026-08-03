import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HomeAnalyticsPage, AthleteProfile } from "./HomeAnalyticsPage";
import { AthleteProfilePage } from "../Profile/AthleteProfilePage";
import { NotificationPage, NotificationItem } from "./Notification";

// Sample data to be used since mayo pang backend
export const initialAthleteProfile: AthleteProfile = {
  athlete_id: "ath_001",
  first_name: "ALEXANDER",
  last_name: "VANCE",
  birthdate: "OCT 14, 1998",
  category: "BASKETBALL",
  height_cm: 188,
  weight_kg: 82,
  wingspan_cm: 194,
  current_affiliation: {
    team_id: "team_lakers_01",
    team_name: "Camarines Sur Lakers",
    sport_type: "BASKETBALL",
    division: "Division 1",
    head_coach: {
      coach_id: "coach_01",
      full_name: "MARCUS STERLING",
      role_title: "Head Coach",
    },
    is_verified: true,
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
};

type TabType = "HOME" | "COACHES" | "PROFILE";

interface AthleteHomePageProps {
  onLogout?: () => void;
}

export function AthleteHomePage({ onLogout }: AthleteHomePageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("HOME");
  const [profile, setProfile] = useState<AthleteProfile>(initialAthleteProfile);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    // Skeleton Loader
    const timer = setTimeout(() => {
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdateProfile = (updatedProfile: AthleteProfile) => {
    setProfile(updatedProfile);
  };

  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top + 14, 58);

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  if (showNotifications) {
    return (
      <NotificationPage
        onBack={() => setShowNotifications(false)}
        notifications={notifications.length > 0 ? notifications : undefined}
        onNotificationsChange={setNotifications}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header Bar */}
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

      {/* Main Active Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === "HOME" && (
          <HomeAnalyticsPage
            profile={profile}
            loading={loading}
            onNavigateToProfile={() => setActiveTab("PROFILE")}
          />
        )}

        {activeTab === "PROFILE" && (
          <AthleteProfilePage
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onLogout={onLogout}
            loading={loading}
          />
        )}

        {activeTab === "COACHES" && (
          <View style={styles.coachesPlaceholderContainer}>
            <Text style={styles.coachesPlaceholderTitle}>COACHES DIRECTORY</Text>
            <Text style={styles.coachesPlaceholderSubtitle}>
              Connect with head coaches and athletic staff for {profile.category}.
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Navigation Bar */}
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
    </View>
  );
}

export const AthleteMainPage = AthleteHomePage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080F21",
  },
  topHeaderBar: {
    paddingTop: 58,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#080F21",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#111C35",
  },
  brandLogoText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },
  notificationButton: {
    padding: 6,
    position: "relative",
  },
  notificationIcon: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#38BDF8",
  },
  screenContainer: {
    flex: 1,
  },
  coachesPlaceholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  coachesPlaceholderTitle: {
    color: "#38BDF8",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  coachesPlaceholderSubtitle: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
  },
  bottomTabBar: {
    backgroundColor: "#0B132B",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 10,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
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

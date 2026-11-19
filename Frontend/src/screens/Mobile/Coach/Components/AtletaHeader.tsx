import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const fontBoldPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

export interface AtletaHeaderProps {
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  unreadNotificationCount?: number;
  avatarUrl?: string | null;
  coachName?: string | null;
}

export function getCoachInitials(name?: string | null): string {
  if (!name || !name.trim()) return "AR";
  const trimmed = name.trim();
  // If the coach name refers to Archie (e.g. "Archie", "Archie Lim", or begins with "Arch")
  if (/^arch(ie)?\b/i.test(trimmed) || trimmed.toLowerCase() === "archie lim") {
    return "AR";
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return `${first}${last}`.toUpperCase();
  }
  if (parts.length === 1) {
    const single = parts[0];
    if (single.length >= 2) {
      return single.slice(0, 2).toUpperCase();
    }
    return single.toUpperCase();
  }
  return "AR";
}

import { AtletaAnimatedLogo } from "../../../../components/AtletaAnimatedLogo";
import { AtletaAvatar } from "../../../../components/AtletaAvatar";

export function AtletaHeader({
  onSettingsPress,
  onProfilePress,
  onNotificationPress,
  unreadNotificationCount = 0,
  avatarUrl,
  coachName,
}: AtletaHeaderProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AtletaAnimatedLogo size={30} showGlow={false} pulse={false} />
          <Text style={styles.brandTitle}>ATLETA</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconCircleButton, styles.notificationCircleButton]}
            onPress={onNotificationPress}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={19} color="#FFFFFF" />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={onSettingsPress}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileCircleButton}
            onPress={onProfilePress}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Coach Profile"
          >
            <AtletaAvatar
              url={avatarUrl}
              name={coachName || "Archie"}
              size={38}
              defaultBg="#00C8FF"
              defaultTextColor="#070D19"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 50,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#070D19",
  },
  header: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2.5,
    fontFamily: fontBoldPlatform,
    includeFontPadding: false,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  notificationCircleButton: {
    marginRight: 2,
  },
  iconCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  profileCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#00C8FF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
  },
  profileAvatarInitials: {
    color: "#070D19",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
    letterSpacing: 0.5,
    textAlign: "center",
    includeFontPadding: false,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#070D19",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
});

export default AtletaHeader;

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
}

import { AtletaAnimatedLogo } from "../../../../components/AtletaAnimatedLogo";

export function AtletaHeader({
  onSettingsPress,
  onProfilePress,
  onNotificationPress,
  unreadNotificationCount = 0,
  avatarUrl,
}: AtletaHeaderProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 18;

  return (
    <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <AtletaAnimatedLogo size={32} showGlow={false} pulse={false} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconCircleButton}
            onPress={onNotificationPress}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={18} color="#FFFFFF" />
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
          >
            <Ionicons name="settings-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileCircleButton}
            onPress={onProfilePress}
            activeOpacity={0.8}
            accessibilityLabel="Coach Profile"
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.profileAvatarImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="person" size={18} color="#070D19" />
            )}
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
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: fontBoldPlatform,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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

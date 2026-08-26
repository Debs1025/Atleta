import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
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
}

export function AtletaHeader({ onSettingsPress, onProfilePress }: AtletaHeaderProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  return (
    <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>ATLETA</Text>
        <View style={styles.headerRight}>
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
          >
            <Ionicons name="person" size={18} color="#070D19" />
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#070D19",
  },
  header: {
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
    gap: 12,
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
  },
});

export default AtletaHeader;

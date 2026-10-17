import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NavigationTab } from "../DataTypes";

const fontPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

const fontBoldPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

export interface AtletaNavbarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

const NAV_TABS: { key: NavigationTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "Home", label: "Home", icon: "home-outline" },
  { key: "Teams", label: "Teams", icon: "people-outline" },
  { key: "Discovery", label: "Discovery", icon: "search-outline" },
  { key: "Performance", label: "Performance", icon: "bar-chart-outline" },
];

export function AtletaNavbar({ activeTab, onSelectTab }: AtletaNavbarProps) {
  return (
    <View style={styles.navContainer}>
      <View style={styles.tabsRow}>
        {NAV_TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tabButton}
              onPress={() => onSelectTab(t.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={t.icon}
                size={20}
                color={isActive ? "#FFFFFF" : "#64748B"}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#070D19",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minWidth: 64,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontFamily: fontPlatform,
  },
  tabLabelActive: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
  },
  tabLabelInactive: {
    color: "#64748B",
    fontWeight: "600",
  },
});

export default AtletaNavbar;

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function SkeletonPulse({
  style,
  children,
}: {
  style?: any;
  children?: React.ReactNode;
}) {
  const opacityAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <Animated.View style={[{ opacity: opacityAnim }, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Skeleton rows for the Coach Dashboard PLAYERS list
 */
export function SkeletonPlayerRows({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={[styles.playerRow, idx < count - 1 && styles.rowBorder]}
        >
          <View style={styles.playerInfoCol}>
            <SkeletonPulse style={styles.skeletonNameBar} />
            <SkeletonPulse style={styles.skeletonSubBar} />
          </View>
          <SkeletonPulse style={styles.skeletonButton} />
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton cards for the Coach Discovery feed
 */
export function SkeletonDiscoveryCards({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.discoveryCard}>
          {/* Header row: avatar + name */}
          <View style={styles.discoveryHeader}>
            <SkeletonPulse style={styles.avatarCircle} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonPulse style={{ width: "60%", height: 14, borderRadius: 4, backgroundColor: "#334155" }} />
              <SkeletonPulse style={{ width: "40%", height: 10, borderRadius: 4, backgroundColor: "#1E293B" }} />
            </View>
            <SkeletonPulse style={{ width: 64, height: 22, borderRadius: 12, backgroundColor: "#1E293B" }} />
          </View>

          {/* Stats columns */}
          <View style={styles.discoveryStatsRow}>
            {Array.from({ length: 4 }).map((__, sIdx) => (
              <View key={sIdx} style={styles.statCol}>
                <SkeletonPulse style={{ width: 28, height: 10, borderRadius: 3, backgroundColor: "#1E293B", marginBottom: 4 }} />
                <SkeletonPulse style={{ width: 36, height: 14, borderRadius: 4, backgroundColor: "#334155" }} />
              </View>
            ))}
          </View>

          {/* Level bar */}
          <View style={styles.levelBarContainer}>
            {Array.from({ length: 5 }).map((___, bIdx) => (
              <SkeletonPulse key={bIdx} style={styles.levelSegment} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Centered spinner with glowing badge for general loading screens
 */
export function AtletaLoadingSpinner({
  message = "Fetching athlete data...",
}: {
  message?: string;
}) {
  return (
    <View style={styles.spinnerContainer}>
      <View style={styles.spinnerGlow}>
        <ActivityIndicator size="large" color="#00C8FF" />
      </View>
      <Text style={styles.spinnerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  playerInfoCol: {
    flex: 1,
    gap: 8,
  },
  skeletonNameBar: {
    width: "55%",
    height: 14,
    borderRadius: 4,
    backgroundColor: "#334155",
  },
  skeletonSubBar: {
    width: "35%",
    height: 10,
    borderRadius: 4,
    backgroundColor: "#1E293B",
  },
  skeletonButton: {
    width: 78,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0, 200, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.3)",
  },
  discoveryCard: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 14,
  },
  discoveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E293B",
  },
  discoveryStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statCol: {
    alignItems: "center",
  },
  levelBarContainer: {
    flexDirection: "row",
    gap: 4,
    height: 4,
  },
  levelSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1E293B",
  },
  spinnerContainer: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  spinnerGlow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0, 200, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});

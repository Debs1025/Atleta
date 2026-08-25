import React, { useEffect } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";

const sharedOpacity = new Animated.Value(0.3);
let isPulsing = false;

function startSharedPulse() {
  if (isPulsing) return;
  isPulsing = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(sharedOpacity, {
        toValue: 0.7,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(sharedOpacity, {
        toValue: 0.3,
        duration: 800,
        useNativeDriver: true,
      }),
    ])
  ).start();
}

export const SkeletonBox = React.memo(function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: any;
}) {
  useEffect(() => {
    startSharedPulse();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: "#16233E",
          opacity: sharedOpacity,
        },
        style,
      ]}
    />
  );
});

export function AthleteHomePageSkeleton() {
  return (
    <ScrollView
      style={skeletonStyles.container}
      contentContainerStyle={skeletonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Category Badge Skeleton */}
      <SkeletonBox width={110} height={28} borderRadius={8} />

      {/* Section Title & Underline Skeleton */}
      <View style={{ marginTop: 18, marginBottom: 20 }}>
        <SkeletonBox width={220} height={32} borderRadius={6} />
        <SkeletonBox width={60} height={4} borderRadius={2} style={{ marginTop: 6 }} />
      </View>

      {/* Metrics Grid Row Skeleton (POINTS / GAME & ASSISTS) */}
      <View style={skeletonStyles.metricsGridRow}>
        <View style={skeletonStyles.metricCard}>
          <SkeletonBox width="60%" height={12} borderRadius={4} style={{ marginBottom: 10 }} />
          <SkeletonBox width="45%" height={34} borderRadius={6} />
        </View>
        <View style={skeletonStyles.metricCard}>
          <SkeletonBox width="60%" height={12} borderRadius={4} style={{ marginBottom: 10 }} />
          <SkeletonBox width="45%" height={34} borderRadius={6} />
        </View>
      </View>

      {/* Secondary Metric Card Skeleton (REBOUNDS AVG) */}
      <View style={skeletonStyles.secondaryMetricCard}>
        <View style={{ justifyContent: "center" }}>
          <SkeletonBox width={100} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
          <SkeletonBox width={70} height={26} borderRadius={6} />
        </View>
        <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBox key={i} width={6} height={24} borderRadius={3} />
          ))}
        </View>
      </View>

      {/* Shooting Efficiency Section Skeleton */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <SkeletonBox width={3} height={16} borderRadius={2} style={{ marginRight: 8 }} />
          <SkeletonBox width={160} height={14} borderRadius={4} />
        </View>
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <SkeletonBox width={90} height={14} borderRadius={4} />
            <SkeletonBox width={40} height={14} borderRadius={4} />
          </View>
          <SkeletonBox width="100%" height={10} borderRadius={5} />
        </View>
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
            <SkeletonBox width={90} height={14} borderRadius={4} />
            <SkeletonBox width={40} height={14} borderRadius={4} />
          </View>
          <SkeletonBox width="100%" height={10} borderRadius={5} />
        </View>
      </View>

      {/* Last Games Graph Card Skeleton */}
      <View style={skeletonStyles.graphCard}>
        <SkeletonBox width={90} height={12} borderRadius={4} style={{ alignSelf: "center", marginBottom: 20 }} />
        <View style={skeletonStyles.barsContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={skeletonStyles.barColumn}>
              <SkeletonBox width={34} height={i === 5 ? 75 : 45} borderRadius={17} />
              <SkeletonBox width={20} height={12} borderRadius={4} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>
      </View>

      {/* My Team Section Skeleton */}
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <SkeletonBox width={3} height={16} borderRadius={2} style={{ marginRight: 8 }} />
          <SkeletonBox width={80} height={14} borderRadius={4} />
        </View>
        <View style={skeletonStyles.teamCardContainer}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <SkeletonBox width={44} height={44} borderRadius={12} style={{ marginRight: 14 }} />
            <SkeletonBox width={140} height={20} borderRadius={6} />
          </View>
          <View style={{ marginBottom: 18 }}>
            <SkeletonBox width={50} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
            <View style={skeletonStyles.coachInnerCard}>
              <SkeletonBox width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
              <View>
                <SkeletonBox width={120} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <SkeletonBox width={80} height={12} borderRadius={4} />
              </View>
            </View>
          </View>
          <SkeletonBox width="100%" height={46} borderRadius={14} />
        </View>
      </View>
    </ScrollView>
  );
}

export function AthleteProfilePageSkeleton() {
  return (
    <ScrollView
      style={skeletonStyles.container}
      contentContainerStyle={skeletonStyles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header Skeleton */}
      <View style={[skeletonStyles.card, { alignItems: "center", paddingTop: 28 }]}>
        <SkeletonBox width={90} height={90} borderRadius={45} style={{ marginBottom: 14 }} />
        <SkeletonBox width="50%" height={22} borderRadius={6} style={{ marginBottom: 8 }} />
        <SkeletonBox width="30%" height={14} borderRadius={4} style={{ marginBottom: 20 }} />

        {/* Vitals Grid Skeleton */}
        <View style={skeletonStyles.grid}>
          <SkeletonBox width="48%" height={64} borderRadius={10} />
          <SkeletonBox width="48%" height={64} borderRadius={10} />
          <SkeletonBox width="48%" height={64} borderRadius={10} style={{ marginTop: 10 }} />
          <SkeletonBox width="48%" height={64} borderRadius={10} style={{ marginTop: 10 }} />
        </View>
      </View>

      {/* Workload Section Skeleton */}
      <View style={skeletonStyles.card}>
        <SkeletonBox width="45%" height={18} borderRadius={4} style={{ marginBottom: 14 }} />
        <SkeletonBox width="100%" height={120} borderRadius={12} />
      </View>
    </ScrollView>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080F21",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  metricsGridRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#111C35",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E2C4A",
  },
  secondaryMetricCard: {
    backgroundColor: "#111C35",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1E2C4A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  graphCard: {
    backgroundColor: "#111C35",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E2C4A",
    marginBottom: 26,
  },
  barsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    paddingHorizontal: 8,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  teamCardContainer: {
    backgroundColor: "#111C35",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E2C4A",
  },
  coachInnerCard: {
    backgroundColor: "#0B1327",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#182542",
  },
  card: {
    backgroundColor: "#111C35",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1E2C4A",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});

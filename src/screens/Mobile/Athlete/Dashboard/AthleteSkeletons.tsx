import React, { useEffect } from "react";
import { Animated, StyleSheet, View } from "react-native";

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
          backgroundColor: "#cbd5e1",
          opacity: sharedOpacity,
        },
        style,
      ]}
    />
  );
});

export function AthleteHomePageSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Header Banner Skeleton */}
      <View style={skeletonStyles.headerCard}>
        <View style={skeletonStyles.headerRow}>
          <SkeletonBox width={64} height={64} borderRadius={32} />
          <View style={skeletonStyles.headerTextWrap}>
            <SkeletonBox width="60%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
            <SkeletonBox width="40%" height={14} borderRadius={4} />
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          <SkeletonBox width="100%" height={36} borderRadius={8} />
        </View>
      </View>

      {/* Analytics Card Skeleton */}
      <View style={skeletonStyles.card}>
        <SkeletonBox width="40%" height={18} borderRadius={4} style={{ marginBottom: 16 }} />
        <View style={skeletonStyles.grid}>
          <SkeletonBox width="48%" height={70} borderRadius={10} />
          <SkeletonBox width="48%" height={70} borderRadius={10} />
          <SkeletonBox width="48%" height={70} borderRadius={10} style={{ marginTop: 12 }} />
          <SkeletonBox width="48%" height={70} borderRadius={10} style={{ marginTop: 12 }} />
        </View>
      </View>

      {/* Team Card Skeleton */}
      <View style={skeletonStyles.card}>
        <SkeletonBox width="50%" height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={90} borderRadius={12} />
      </View>
    </View>
  );
}

export function AthleteProfilePageSkeleton() {
  return (
    <View style={skeletonStyles.container}>
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
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTextWrap: {
    marginLeft: 16,
    flex: 1,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});

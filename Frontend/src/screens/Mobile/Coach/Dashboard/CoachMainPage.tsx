import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";

type CoachMainPageProps = {
  onLogout?: () => void;
};

export function CoachMainPage({ onLogout }: CoachMainPageProps) {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ATLETA</Text>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>COACH</Text>
              </View>
            </View>
          </View>
          {onLogout ? (
            <Pressable onPress={onLogout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome back, Coach! 📋</Text>
          <Text style={styles.welcomeSubtitle}>
            Manage your athlete roster, organize team training, and verify candidate documentation.
          </Text>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Management Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>18</Text>
            <Text style={styles.statLabel}>Active Athletes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Pending Reviews</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Scheduled Drills</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Compliance Rate</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Coach Controls</Text>
        <View style={styles.actionList}>
          <Pressable style={styles.actionCard}>
            <Text style={styles.actionIcon}>👥</Text>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Athlete Roster</Text>
              <Text style={styles.actionSub}>View profile details and training history</Text>
            </View>
          </Pressable>

          <Pressable style={styles.actionCard}>
            <Text style={styles.actionIcon}>📑</Text>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Verify Documents</Text>
              <Text style={styles.actionSub}>Review uploaded licenses and certifications</Text>
            </View>
          </Pressable>

          <Pressable style={styles.actionCard}>
            <Text style={styles.actionIcon}>📢</Text>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>Team Announcement</Text>
              <Text style={styles.actionSub}>Broadcast updates to your athletes</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24
  },
  brand: {
    color: "#141c3a",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5
  },
  badgeRow: {
    flexDirection: "row",
    marginTop: 4
  },
  roleBadge: {
    backgroundColor: "#2563eb",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  roleBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  logoutButton: {
    borderColor: "#141c3a",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  logoutText: {
    color: "#141c3a",
    fontSize: 13,
    fontWeight: "800"
  },
  welcomeCard: {
    backgroundColor: "#141c3a",
    borderRadius: 16,
    padding: 24,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4
  },
  welcomeTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8
  },
  welcomeSubtitle: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20
  },
  sectionTitle: {
    color: "#141c3a",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 14
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 28
  },
  statCard: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    width: "48%",
    padding: 16,
    marginBottom: 12
  },
  statValue: {
    color: "#141c3a",
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 4
  },
  statLabel: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600"
  },
  actionList: {
    gap: 12
  },
  actionCard: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    padding: 16
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 16
  },
  actionBody: {
    flex: 1
  },
  actionTitle: {
    color: "#141c3a",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2
  },
  actionSub: {
    color: "#64748b",
    fontSize: 13
  }
});

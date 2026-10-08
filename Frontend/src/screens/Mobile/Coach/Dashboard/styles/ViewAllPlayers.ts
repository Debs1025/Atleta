import { Platform, StyleSheet } from "react-native";

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070D19",
  },
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#070D19",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14.5,
    fontFamily: fontPlatform,
  },
  filterSection: {
    marginBottom: 22,
  },
  filterLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterLabel: {
    color: "#5C6B82",
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
  },
  badgeCount: {
    color: "#00C8FF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  pillInactive: {
    backgroundColor: "#070D19",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  pillActive: {
    backgroundColor: "#00C8FF",
  },
  pillText: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  pillTextInactive: {
    color: "#94A3B8",
  },
  pillTextActive: {
    color: "#070D19",
  },
  playersListContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  playerCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  playerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
    marginBottom: 2,
  },
  playerMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: fontPlatform,
    marginBottom: 2,
  },
  teamTag: {
    color: "#00C8FF",
    fontSize: 11.5,
    fontWeight: "700",
    fontFamily: fontPlatform,
  },
  viewStatsButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  viewStatsText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: fontPlatform,
  },
});

export default styles;

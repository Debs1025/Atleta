import { StyleSheet, Platform } from "react-native";

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

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070D19",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#070D19",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    fontFamily: fontBoldPlatform,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  dateGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  dateAccentIndicator: {
    width: 4,
    height: 20,
    backgroundColor: "#00C8FF",
    borderRadius: 2,
    marginRight: 10,
  },
  dateGroupText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    fontFamily: fontBoldPlatform,
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D192E",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.1)",
  },
  matchLeft: {
    flex: 1,
    marginRight: 12,
  },
  subtext: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    letterSpacing: 1,
    marginBottom: 4,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: fontBoldPlatform,
  },
  summaryScore: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 6,
    fontFamily: fontBoldPlatform,
  },
  resultBadgeBorder: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  resultBadgeSubtext: {
    fontSize: 8,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  resultBadgeMainText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    fontFamily: fontBoldPlatform,
  },
});

export default styles;

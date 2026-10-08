import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080F21",
  },
  headerBar: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#080F21",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  verticalAccentBar: {
    width: 4,
    height: 36,
    backgroundColor: "#38BDF8",
    marginRight: 12,
    borderRadius: 2,
  },
  statusSubtitle: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  mainTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  inquiryCard: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  institutionSport: {
    color: "#94A3B8",
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardFooterRow: {
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 10,
  },
  footerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerIcon: {
    marginRight: 6,
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 12,
  },
});

export default styles;

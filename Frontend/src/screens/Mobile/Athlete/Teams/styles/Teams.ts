import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
  },
  topHeaderBar: {
    paddingTop: 54,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0B132B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  bellButton: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111C35",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    padding: 0,
  },
  inquiriesQuickLink: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  inquiriesIconImage: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },
  inquiriesQuickText: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  filterScroll: {
    marginBottom: 20,
  },
  filterScrollContent: {
    alignItems: "center",
  },
  sportChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111C35",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  sportChipActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#38BDF8",
  },
  sportChipIconImage: {
    width: 16,
    height: 16,
    marginRight: 6,
  },
  sportChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  sportChipTextActive: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 16,
  },
  teamCard: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 14,
  },
  teamName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  sportTag: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  teamDescription: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 12,
  },
  headCoachLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headCoachName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  viewTeamButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  viewTeamText: {
    color: "#0B132B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  skeletonContainer: {
    marginTop: 4,
  },
  skeletonCard: {
    height: 140,
    backgroundColor: "#111C35",
    borderRadius: 16,
    marginBottom: 14,
  },
  bottomTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#0B132B",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingBottom: 24,
  },
  tabItem: {
    alignItems: "center",
  },
  tabIcon: {
    width: 22,
    height: 22,
  },
  tabIconActive: {
    tintColor: "#38BDF8",
  },
  tabIconInactive: {
    tintColor: "#64748B",
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#38BDF8",
  },
  tabLabelInactive: {
    color: "#64748B",
  },
});

export default styles;

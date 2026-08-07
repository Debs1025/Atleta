import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080F21",
  },
  topHeaderBar: {
    paddingTop: 58,
    paddingBottom: 14,
    paddingHorizontal: 20,
    backgroundColor: "#080F21",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#111C35",
  },
  brandLogoText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },
  notificationButton: {
    padding: 6,
    position: "relative",
  },
  notificationIcon: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#38BDF8",
  },
  screenContainer: {
    flex: 1,
  },
  coachesPlaceholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  coachesPlaceholderTitle: {
    color: "#38BDF8",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  coachesPlaceholderSubtitle: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
  },
  bottomTabBar: {
    backgroundColor: "#0B132B",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 10,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
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

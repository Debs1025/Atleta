import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  stepRow: {
    marginBottom: 16
  },
  sectionLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8
  },
  helper: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  navRow: {
    flexDirection: "row",
    marginTop: 12
  },
  navSpacer: {
    width: 12
  },
  documentBox: {
    marginBottom: 16
  },
  documentLabel: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },
  documentHint: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 8
  },
  dropdownGroup: {
    marginBottom: 16
  },
  dropdownLabel: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },
  dropdownTrigger: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 16
  },
  dropdownTriggerOpen: {
    borderColor: "#00C8FF"
  },
  dropdownTriggerPressed: {
    backgroundColor: "#1E293B"
  },
  dropdownError: {
    borderColor: "#EF4444"
  },
  dropdownValueText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600"
  },
  dropdownPlaceholderText: {
    color: "#64748B"
  },
  chevronWrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }]
  },
  dropdownChevron: {
    color: "#94A3B8",
    fontSize: 12
  },
  dropdownMenu: {
    backgroundColor: "#0F172A",
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  dropdownOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
    paddingHorizontal: 16
  },
  dropdownOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)"
  },
  dropdownOptionSelected: {
    backgroundColor: "rgba(0, 200, 255, 0.14)"
  },
  dropdownOptionPressed: {
    backgroundColor: "#1E293B"
  },
  dropdownOptionText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "600"
  },
  dropdownOptionTextSelected: {
    color: "#00C8FF",
    fontWeight: "800"
  },
  dropdownCheckmark: {
    color: "#00C8FF",
    fontSize: 15,
    fontWeight: "800"
  },
  createdScreen: {
    alignItems: "center",
    backgroundColor: "#070D19",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  createdPanel: {
    width: "100%"
  },
  createdTitle: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center"
  },
  createdMessage: {
    color: "#94A3B8",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "center"
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 4,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1E293B",
    borderWidth: 2,
    borderColor: "#00C8FF",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarBoxEmpty: {
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#0F172A",
  },
  avatarPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },
  avatarPlaceholderImage: {
    width: 48,
    height: 48,
    tintColor: "#64748B",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#00C8FF",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#070D19",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  socialBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#1E293B",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#070D19",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  socialBadgeIcon: {
    width: 16,
    height: 16,
  },
  avatarTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  avatarSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  avatarActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  avatarActionText: {
    color: "#00C8FF",
    fontSize: 13,
    fontWeight: "700",
  },
  avatarRemoveText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  }
});

export default styles;

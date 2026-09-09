import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  stepRow: {
    marginBottom: 12
  },
  sectionLabel: {
    color: "#141c3a",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4
  },
  helper: {
    color: "#6b7280",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  navRow: {
    flexDirection: "row",
    marginTop: 8
  },
  navSpacer: {
    width: 12
  },
  documentBox: {
    marginBottom: 14
  },
  documentLabel: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6
  },
  documentHint: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 8
  },
  dropdownGroup: {
    marginBottom: 14
  },
  dropdownLabel: {
    color: "#4b5563",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6
  },
  dropdownTrigger: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#a3a3a3",
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 16
  },
  dropdownTriggerOpen: {
    borderColor: "#141c3a"
  },
  dropdownTriggerPressed: {
    backgroundColor: "#f8fafc"
  },
  dropdownError: {
    borderColor: "#ef4444"
  },
  dropdownValueText: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "500"
  },
  dropdownPlaceholderText: {
    color: "#9aa2b8"
  },
  chevronWrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }]
  },
  dropdownChevron: {
    color: "#6b7280",
    fontSize: 12
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderColor: "#e2e8f0",
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
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
    borderBottomColor: "#f1f5f9"
  },
  dropdownOptionSelected: {
    backgroundColor: "#f0f4ff"
  },
  dropdownOptionPressed: {
    backgroundColor: "#f8fafc"
  },
  dropdownOptionText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600"
  },
  dropdownOptionTextSelected: {
    color: "#141c3a",
    fontWeight: "800"
  },
  dropdownCheckmark: {
    color: "#141c3a",
    fontSize: 15,
    fontWeight: "800"
  },
  createdScreen: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28
  },
  createdPanel: {
    width: "100%"
  },
  createdTitle: {
    color: "#141c3a",
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center"
  },
  createdMessage: {
    color: "#4b5563",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "center"
  }
});

export default styles;

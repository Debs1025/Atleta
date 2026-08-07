import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
  },

  /* HEADER LAYOUT */
  topHeaderBar: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0B132B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 14,
    padding: 2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },
  markReadButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },

  /* SCROLL FEED */
  scrollContainer: {
    flex: 1,
    backgroundColor: "#0B132B",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  dateGroupHeader: {
    marginTop: 18,
    marginBottom: 12,
  },
  dateGroupText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /* CARD LAYOUTS */
  cardContainer: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  cardContainerUnread: {
    borderColor: "#38BDF8",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    backgroundColor: "#1E293B",
    marginRight: 12,
  },
  avatarImage: {
    width: 42,
    height: 42,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0D1B2A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  actionIconImage: {
    width: 24,
    height: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  senderName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  senderSubtitle: {
    color: "#7DD3FC",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  actionRequiredTitle: {
    color: "#7DD3FC",
    fontSize: 16,
    fontWeight: "800",
  },
  timestampText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  cardBodyContainer: {
    marginBottom: 14,
  },
  cardBodyText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
  },
  highlightedText: {
    color: "#7DD3FC",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  inquiryActionButton: {
    backgroundColor: "#93C5FD",
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inquiryActionText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  actionLinkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionLinkText: {
    color: "#7DD3FC",
    fontSize: 14,
    fontWeight: "800",
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#111C35",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  modalCoachProfile: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
  },
  modalCoachName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  modalCoachRole: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 2,
  },
  modalSportTag: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6,
    backgroundColor: "#0D1B2A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalMessageBox: {
    backgroundColor: "#080F21",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  modalMessageHeader: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalMessageText: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 20,
  },
  decisionButtonContainer: {
    gap: 10,
  },
  acceptButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#080F21",
    fontSize: 14,
    fontWeight: "900",
  },
  declineButton: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  declineButtonText: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "800",
  },
  statusBadgeContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  /* UPLOAD MODAL STYLES */
  uploadSubLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  uploadDocName: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 16,
  },
  filePickerBox: {
    backgroundColor: "#080F21",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  filePickerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  filePickerSub: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },
  submitUploadButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitUploadText: {
    color: "#080F21",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});

export default styles;

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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },

  // Header Bar
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#070D19",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontFamily: fontBoldPlatform,
    textTransform: "uppercase",
  },

  // Avatar Preview Header
  avatarPreviewSection: {
    alignItems: "center",
    marginVertical: 24,
  },
  avatarCircleFrame: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "#00C8FF",
    backgroundColor: "#0B1528",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#00C8FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarCircleImage: {
    width: "100%",
    height: "100%",
    borderRadius: 48,
  },
  avatarCaption: {
    color: "#64748B",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    textTransform: "uppercase",
  },

  // Input Fields
  formFieldContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: "#94A3B8",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
  },
  textInput: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "600",
    fontFamily: fontPlatform,
    height: "100%",
  },

  // Select Dropdown
  selectWrapper: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValueText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
    fontFamily: fontPlatform,
    textTransform: "uppercase",
  },
  dropdownMenuCard: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    marginTop: 6,
    overflow: "hidden",
  },
  dropdownItemRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  dropdownItemText: {
    color: "#94A3B8",
    fontSize: 13.5,
    fontWeight: "700",
    fontFamily: fontPlatform,
    textTransform: "uppercase",
  },
  dropdownItemActiveText: {
    color: "#00C8FF",
    fontWeight: "900",
  },

  // Credentials Uploader Card
  uploaderCard: {
    backgroundColor: "#0F172A",
    borderWidth: 1.5,
    borderColor: "#334155",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 26,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  uploadActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: fontPlatform,
    textTransform: "uppercase",
    marginTop: 10,
    textAlign: "center",
  },

  // Uploaded Credentials List
  uploadedListContainer: {
    marginBottom: 24,
  },
  uploadedSubLabel: {
    color: "#94A3B8",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  uploadedDocRow: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  uploadedDocLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  uploadedDocName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: fontPlatform,
    marginLeft: 10,
    flex: 1,
  },
  uploadedDocActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editDocNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(0, 200, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  saveDocNameBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(0, 200, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  inlineEditInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: fontPlatform,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#00C8FF",
    marginLeft: 8,
  },
  trashIconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },

  // Save Submit Button
  saveSubmitBtn: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  saveSubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontFamily: fontBoldPlatform,
  },

  // Footer Text
  footerUpdatedText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    textAlign: "center",
    marginTop: 20,
    textTransform: "uppercase",
  },
});

export default styles;

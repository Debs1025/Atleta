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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#070D19",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#070D19",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Top Bar
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
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontFamily: fontBoldPlatform,
    textTransform: "uppercase",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editAssetIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 200, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 200, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  editAssetImage: {
    width: 18,
    height: 18,
    tintColor: "#00C8FF",
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Hero Section
  heroSection: {
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
    marginBottom: 20,
    marginTop: 8,
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
  fullNameText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: fontBoldPlatform,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  roleTitleText: {
    color: "#00C8FF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    textAlign: "center",
    marginTop: 6,
    textTransform: "uppercase",
  },

  // Regional Affiliation Card
  cardContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 14,
  },
  cyanSubLabel: {
    color: "#00C8FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  affiliationItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  affiliationItemText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: fontPlatform,
    marginLeft: 12,
    flex: 1,
  },

  // Sports Focus Card
  sportsPillBadge: {
    backgroundColor: "#00C8FF",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  sportsPillText: {
    color: "#070D19",
    fontSize: 12.5,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: fontBoldPlatform,
    textTransform: "uppercase",
  },

  // Credentials Container
  credentialsHeading: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: fontBoldPlatform,
    marginBottom: 16,
  },
  credentialItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  credentialBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  credentialTitleText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "600",
    fontFamily: fontPlatform,
    flex: 1,
    paddingRight: 12,
  },

  // System Statistics Grid
  systemStatsSectionLabel: {
    color: "#64748B",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 10,
  },
  statsGridContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    flexDirection: "row",
    overflow: "hidden",
  },
  statColumn: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statBorderRight: {
    borderRightWidth: 1,
    borderRightColor: "#1E293B",
  },
  statNumberText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
    letterSpacing: 0.5,
  },
  statLabelText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    fontFamily: fontPlatform,
    textTransform: "uppercase",
    marginTop: 6,
  },

  // Edit Action Button
  editProfileCtaBtn: {
    backgroundColor: "#0C182B",
    borderWidth: 1,
    borderColor: "#00C8FF",
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  editProfileCtaText: {
    color: "#00C8FF",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: fontBoldPlatform,
  },

  // Skeleton Loader Styles
  skeletonContainer: {
    padding: 20,
    width: "100%",
  },
  skeletonDiamondWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  skeletonDiamond: {
    width: 90,
    height: 90,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    transform: [{ rotate: "45deg" }],
  },
  skeletonCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 14,
    width: "100%",
  },
  skeletonTile: {
    backgroundColor: "#1E293B",
    borderRadius: 6,
  },
  skeletonGridRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  skeletonGridTile: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
});

export default styles;

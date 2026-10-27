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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  // Top Header
  topHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#070D19",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: fontBoldPlatform,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  profileCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#00C8FF",
    justifyContent: "center",
    alignItems: "center",
  },

  // Search & Navigation Bar Row
  searchNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    marginLeft: 8,
    fontFamily: fontPlatform,
  },
  topActionButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topActionButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconBox: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  topActionLabel: {
    color: "#94A3B8",
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: "700",
  },

  // Segmented Pill Controls (PLAYERS, TEAMS, EVENTS)
  segmentedControlContainer: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  segmentPillButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  segmentPillActive: {
    backgroundColor: "#13273D",
    borderWidth: 1.5,
    borderColor: "#00C8FF",
  },
  segmentPillInactive: {
    backgroundColor: "transparent",
  },
  segmentPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  segmentPillTextActive: {
    color: "#00C8FF",
    fontWeight: "900",
  },
  segmentPillTextInactive: {
    color: "#94A3B8",
  },

  // Sport Filter Chips Row
  sportChipsScroll: {
    marginBottom: 16,
  },
  sportChipsContent: {
    flexDirection: "row",
    gap: 8,
  },
  sportChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sportChipActive: {
    backgroundColor: "#00C8FF",
    borderColor: "#00C8FF",
  },
  sportChipInactive: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
  },
  sportChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sportChipTextActive: {
    color: "#070D19",
    fontWeight: "900",
  },
  sportChipTextInactive: {
    color: "#94A3B8",
  },

  // Athlete Cards Stack
  cardsStack: {
    gap: 14,
  },
  athleteCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarXText: {
    color: "#64748B",
    fontSize: 20,
    fontWeight: "900",
  },
  positionTagBadge: {
    backgroundColor: "#070D19",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  positionTagText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  athleteName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
    fontFamily: fontBoldPlatform,
  },
  athleteSubline: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 14,
  },

  // Stats Grid Trio
  statsTrioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  statCol: {
    alignItems: "flex-start",
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: fontBoldPlatform,
  },

  // Progress Level Bar
  levelBarContainer: {
    flexDirection: "row",
    gap: 6,
    height: 20,
    alignItems: "center",
    backgroundColor: "#070D19",
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  levelSegment: {
    flex: 1,
    height: "100%",
    borderRadius: 3,
  },
  levelSegmentFilled: {
    backgroundColor: "#475569",
  },
  levelSegmentActiveHigh: {
    backgroundColor: "#CBD5E1",
  },

  // Teams Tab View
  sectionHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
    fontFamily: fontBoldPlatform,
  },
  teamCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 14,
  },
  teamBadgeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#070D19",
    borderWidth: 1,
    borderColor: "#00C8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  teamNameText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  teamDivisionTag: {
    color: "#00C8FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  teamDescriptionText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  headCoachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  coachAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  headCoachText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  headCoachRole: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "400",
  },
  viewTeamButton: {
    backgroundColor: "#7DD3FC",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  viewTeamButtonText: {
    color: "#070D19",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Events Tab View
  eventHeaderBox: {
    marginBottom: 16,
  },
  eventNameTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  eventDateSubline: {
    color: "#00C8FF",
    fontSize: 12,
    fontWeight: "700",
  },
  matchCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  matchBadgeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#070D19",
    borderWidth: 1,
    borderColor: "#00C8FF",
    justifyContent: "center",
    alignItems: "center",
  },
  matchLeftInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  matchHeadlineText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  matchVenueText: {
    color: "#94A3B8",
    fontSize: 11,
  },
  viewMatchOutlineBtn: {
    borderWidth: 1,
    borderColor: "#00C8FF",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewMatchOutlineText: {
    color: "#00C8FF",
    fontSize: 11,
    fontWeight: "800",
  },

  // Detailed Scouting Modal (Screen 2)
  modalHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  modalHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  mediaHeaderBox: {
    width: "100%",
    height: 240,
    backgroundColor: "#0F172A",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  mediaOverlayTextContainer: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  mediaNameText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  mediaSublineText: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 6,
  },
  mediaTagsRow: {
    flexDirection: "row",
    gap: 8,
  },
  tagChip: {
    backgroundColor: "rgba(0, 200, 255, 0.15)",
    borderWidth: 1,
    borderColor: "#00C8FF",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagChipText: {
    color: "#00C8FF",
    fontSize: 10,
    fontWeight: "800",
  },

  // Biometrics Grid
  biometricsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  biometricCard: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 12,
    alignItems: "center",
  },
  biometricLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  biometricVal: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  // Contact Container
  contactCard: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    color: "#FFFFFF",
    fontSize: 13,
  },

  // Primary CTA Button
  scoutPlayerBtn: {
    backgroundColor: "#00C8FF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  scoutPlayerBtnText: {
    color: "#070D19",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // Confirmation Overlay (Screen 2 popup)
  confirmationOverlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmationCard: {
    width: "100%",
    backgroundColor: "#10B981",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  checkmarkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  confirmationTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },
  confirmationSubtext: {
    color: "#E2E8F0",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  confirmationCloseBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmationCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // Leaderboard Screen (Screen 3)
  leaderboardHeaderBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  leaderboardColumnLabel: {
    color: "#00C8FF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  leaderboardRow: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1E293B",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rankBadge: {
    width: 28,
    fontSize: 14,
    fontWeight: "900",
    color: "#94A3B8",
  },
  rankTopBadge: {
    color: "#00C8FF",
  },
  leaderboardAthleteInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  perScoreText: {
    color: "#00C8FF",
    fontSize: 15,
    fontWeight: "900",
    fontFamily: fontBoldPlatform,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  pagePill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  pagePillActive: {
    backgroundColor: "#00C8FF",
    borderColor: "#00C8FF",
  },
  pagePillText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  pagePillTextActive: {
    color: "#070D19",
    fontWeight: "900",
  },

  // Recruits Tracker Screen (Screen 4)
  recruitsHeaderRightBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  recruitsSortText: {
    color: "#00C8FF",
    fontSize: 13,
    fontWeight: "700",
  },
  recruitCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusBadgeAccepted: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  statusBadgePending: {
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  statusBadgeDeclined: {
    borderWidth: 1,
    borderColor: "#EF4444",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  statusTextAccepted: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  statusTextPending: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "900",
  },
  statusTextDeclined: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "900",
  },
  emptyStateContainer: {
    borderWidth: 1.5,
    borderColor: "#1E293B",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
  },
  emptyStateText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 8,
    fontWeight: "600",
  },
});

export default styles;

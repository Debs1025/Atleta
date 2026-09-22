import { StyleSheet, Platform } from 'react-native';

const fontPlatform = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'sans-serif',
});

const fontBoldPlatform = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'sans-serif',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D19',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#070D19',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: fontBoldPlatform,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 12,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00C8FF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#00C8FF',
    fontWeight: '900',
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 200, 255, 0.15)',
    borderColor: '#00C8FF',
  },
  filterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00C8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#070D19',
    fontSize: 10,
    fontWeight: '900',
  },

  leaderboardHeaderBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headlineText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: fontBoldPlatform,
  },
  subtext: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  columnLabel: {
    color: '#00C8FF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  leaderboardRow: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leaderboardRowTop1: {
    borderColor: 'rgba(255, 215, 0, 0.4)',
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
  },
  leaderboardRowTop2: {
    borderColor: 'rgba(192, 192, 192, 0.4)',
    backgroundColor: 'rgba(192, 192, 192, 0.04)',
  },
  leaderboardRowTop3: {
    borderColor: 'rgba(205, 127, 50, 0.4)',
    backgroundColor: 'rgba(205, 127, 50, 0.04)',
  },
  rankBadgeBox: {
    width: 30,
    alignItems: 'center',
  },
  rankBadge: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748B',
  },
  rankTopBadge1: {
    color: '#FFD700',
    fontWeight: '900',
  },
  rankTopBadge2: {
    color: '#E2E8F0',
    fontWeight: '900',
  },
  rankTopBadge3: {
    color: '#CD7F32',
    fontWeight: '900',
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  athleteName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: fontPlatform,
  },
  athleteLocation: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  statValueCol: {
    alignItems: 'flex-end',
  },
  mainScoreText: {
    color: '#00C8FF',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: fontBoldPlatform,
  },
  secondaryScoreText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  pagePill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagePillActive: {
    backgroundColor: '#00C8FF',
    borderColor: '#00C8FF',
  },
  pagePillText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  pagePillTextActive: {
    color: '#070D19',
    fontWeight: '900',
  },
  emptyStateBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#00C8FF',
  },
  resetButtonText: {
    color: '#00C8FF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default styles;

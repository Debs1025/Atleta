import { StyleSheet, Platform } from 'react-native';

const fontPlatform = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'sans-serif',
});

const fontBoldPlatform = Platform.select({
  ios: 'System',
  android: "sans-serif-medium",
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
    paddingBottom: 10,
    backgroundColor: '#070D19',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: fontBoldPlatform,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    color: '#00C8FF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  recruitCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recruitName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
    fontFamily: fontPlatform,
  },
  sportCategoryTag: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  rightGroup: {
    alignItems: 'flex-end',
  },
  statusBadgeAccepted: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  statusBadgePending: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  statusBadgeDeclined: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  statusTextAccepted: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  statusTextPending: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '900',
  },
  statusTextDeclined: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '900',
  },
  relativeDateText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  emptyStateContainer: {
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
});

export default styles;

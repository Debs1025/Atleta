import { StyleSheet, Platform } from 'react-native';

const fontPlatform = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'sans-serif',
});

const fontBoldPlatform = Platform.select({
  ios: 'System',
  android: 'sans-serif-black',
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  matchResultCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#00C8FF',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  teamIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  teamName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  teamRoleText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  scoreHomeText: {
    color: '#00C8FF',
    fontSize: 24,
    fontWeight: '900',
  },
  scoreAwayText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  vsText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '800',
  },
  tableCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 10,
    marginBottom: 8,
  },
  tableHeaderLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  playerBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  playerName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: fontPlatform,
  },
  ptsValue: {
    color: '#00C8FF',
    fontSize: 14,
    fontWeight: '900',
  },
  astValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  dynamicsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 20,
  },
});

export default styles;

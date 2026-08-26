import { StyleSheet, Platform } from 'react-native';

const fontBold = Platform.select({
  ios: 'System',
  android: "sans-serif-medium",
  default: 'sans-serif',
});

const fontMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'sans-serif',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#070D19',
  },
  backButton: {
    padding: 6,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontBold,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fontMedium,
  },
  cardList: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    marginBottom: 14,
    position: 'relative',
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sportIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#162544',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#1E3A8A',
  },
  cardContent: {
    flex: 1,
    paddingRight: 8,
  },
  matchTitle: {
    fontSize: 16,
    fontFamily: fontBold,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  infoText: {
    fontSize: 13,
    fontFamily: fontMedium,
    color: '#94A3B8',
    marginLeft: 6,
  },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  statusNotRequested: {
    borderColor: '#334155',
    backgroundColor: 'rgba(51, 65, 85, 0.2)',
  },
  statusPending: {
    borderColor: '#00C8FF',
    backgroundColor: 'rgba(0, 200, 255, 0.1)',
  },
  statusGranted: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusTextNotRequested: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: fontBold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextPending: {
    color: '#00C8FF',
    fontSize: 10,
    fontFamily: fontBold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextGranted: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: fontBold,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    fontFamily: fontMedium,
    marginTop: 10,
  },
});

export default styles;

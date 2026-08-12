import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import styles from './styles/officialMatchPage';
import { OfficialMatchRecord, useMatchContext, MatchProvider } from './MatchContext';
import { OfficialMatchPreview } from './officialMatchPreview';

interface OfficialMatchesListProps {
  onBack?: () => void;
  // Optional initial match to display or external control
  onSelectMatch?: (match: OfficialMatchRecord) => void;
}

export const OfficialMatchesListContent: React.FC<OfficialMatchesListProps> = ({
  onBack,
  onSelectMatch,
}) => {
  const insets = useSafeAreaInsets();
  const { matches } = useMatchContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<OfficialMatchRecord | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  // Instant reactive filtering using useMemo for high performance
  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const q = searchQuery.toLowerCase();
    return matches.filter(
      (m) =>
        m.home_team_name.toLowerCase().includes(q) ||
        m.away_team_name.toLowerCase().includes(q) ||
        `${m.home_team_name} vs. ${m.away_team_name}`.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.sport_type.toLowerCase().includes(q) ||
        m.league_name.toLowerCase().includes(q)
    );
  }, [matches, searchQuery]);

  const handleCardPress = useCallback(
    (match: OfficialMatchRecord) => {
      setSelectedMatch(match);
      setIsPreviewVisible(true);
      if (onSelectMatch) {
        onSelectMatch(match);
      }
    },
    [onSelectMatch]
  );

  const handleClosePreview = useCallback(() => {
    setIsPreviewVisible(false);
    setSelectedMatch(null);
  }, []);

  // Helper to render sport badge icon
  const renderSportIcon = (sportType: OfficialMatchRecord['sport_type']) => {
    switch (sportType) {
      case 'BASKETBALL':
        return <Ionicons name="basketball-outline" size={24} color="#00C8FF" />;
      case 'SWIMMING':
        return <MaterialCommunityIcons name="waves" size={24} color="#00C8FF" />;
      case 'TRACK AND FIELD':
        return <MaterialCommunityIcons name="run" size={24} color="#00C8FF" />;
      default:
        return <Ionicons name="trophy-outline" size={24} color="#00C8FF" />;
    }
  };

  // Helper to render status badge
  const renderStatusBadge = (status: OfficialMatchRecord['audit_status']) => {
    switch (status) {
      case 'NOT REQUESTED':
        return (
          <View style={[styles.statusBadge, styles.statusNotRequested]}>
            <Text style={styles.statusTextNotRequested}>NOT REQUESTED</Text>
          </View>
        );
      case 'PENDING REQUEST':
        return (
          <View style={[styles.statusBadge, styles.statusPending]}>
            <Text style={styles.statusTextPending}>PENDING REQUEST</Text>
          </View>
        );
      case 'REQUEST GRANTED':
        return (
          <View style={[styles.statusBadge, styles.statusGranted]}>
            <Text style={styles.statusTextGranted}>REQUEST GRANTED</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070D19" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) + 38 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>OFFICIAL MATCHES</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by match game"
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* Matches Card List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardList}
        >
          {filteredMatches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#334155" />
              <Text style={styles.emptyText}>No matching games found</Text>
            </View>
          ) : (
            filteredMatches.map((match) => {
              // Current reactive match from store (in case status changed)
              const liveMatch = matches.find((m) => m.match_id === match.match_id) || match;

              return (
                <TouchableOpacity
                  key={liveMatch.match_id}
                  style={styles.card}
                  activeOpacity={0.8}
                  onPress={() => handleCardPress(liveMatch)}
                >
                  <View style={styles.cardMainRow}>
                    {/* Sport Badge Icon */}
                    <View style={styles.sportIconBadge}>
                      {renderSportIcon(liveMatch.sport_type)}
                    </View>

                    {/* Match Info */}
                    <View style={styles.cardContent}>
                      <Text style={styles.matchTitle} numberOfLines={1}>
                        {`${liveMatch.home_team_name} VS. ${liveMatch.away_team_name}`}
                      </Text>

                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={14} color="#64748B" />
                        <Text style={styles.infoText}>
                          {`${liveMatch.match_date} • ${liveMatch.match_time}`}
                        </Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color="#64748B" />
                        <Text style={styles.infoText} numberOfLines={1}>
                          {liveMatch.location}
                        </Text>
                      </View>
                    </View>

                    {/* Dynamic Status Pill Badge */}
                    {renderStatusBadge(liveMatch.audit_status)}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Match Preview Modal (Screen 2 & Screen 3) */}
      <Modal
        visible={isPreviewVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClosePreview}
      >
        {selectedMatch && (
          <OfficialMatchPreview
            matchId={selectedMatch.match_id}
            onBack={handleClosePreview}
          />
        )}
      </Modal>
    </View>
  );
};

// Export wrapped with MatchProvider so it can operate standalone or embedded
export const OfficialMatchesPage: React.FC<OfficialMatchesListProps> = (props) => (
  <MatchProvider>
    <OfficialMatchesListContent {...props} />
  </MatchProvider>
);

export default OfficialMatchesPage;

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/ranking';
import { AthleteDiscoveryItem, SportCategoryFilter } from './discoveryTypes';

interface RankingProps {
  onBack: () => void;
  onSelectAthlete?: (athlete: AthleteDiscoveryItem) => void;
  meta?: {
    headline?: string;
    season_info?: string;
    column_label?: string;
  };
}

const SPORT_TABS: { label: string; value: SportCategoryFilter }[] = [
  { label: 'Basketball', value: 'BASKETBALL' },
  { label: 'Swimming', value: 'SWIMMING' },
  { label: 'Track & Field', value: 'TRACK AND FIELD' },
];

export const RankingPage: React.FC<RankingProps> = ({
  onBack,
  onSelectAthlete,
  meta,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top - 12, 4);

  const headlineText = meta?.headline || 'Top Players';
  const seasonInfoText = meta?.season_info || 'SEASON 2026 • REGION V';
  const columnLabelText = meta?.column_label || 'PER SCORE';

  const { athletes, setSelectedAthlete, loading } = useDiscovery();
  const [selectedSport, setSelectedSport] = useState<SportCategoryFilter>('BASKETBALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const ITEMS_PER_PAGE = 5;

  const allRankedAthletes = useMemo(() => {
    return athletes
      .filter((a) => a.sport_category === selectedSport)
      .sort((a, b) => b.calculated_per - a.calculated_per);
  }, [athletes, selectedSport]);

  const totalPages = Math.max(1, Math.ceil(allRankedAthletes.length / ITEMS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);

  const displayedAthletes = useMemo(() => {
    const startIdx = (currentPageSafe - 1) * ITEMS_PER_PAGE;
    return allRankedAthletes.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [allRankedAthletes, currentPageSafe]);

  const handleSportChange = (sport: SportCategoryFilter) => {
    setSelectedSport(sport);
    setCurrentPage(1);
  };

  const handleAthletePress = (athlete: AthleteDiscoveryItem) => {
    setSelectedAthlete(athlete);
    if (onSelectAthlete) {
      onSelectAthlete(athlete);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar aligned with Atleta header position */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.headerTitle}>PLAYER RANKINGS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sport Category Tabs */}
        <View style={styles.tabsRow}>
          {SPORT_TABS.map((tab) => {
            const isActive = selectedSport === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.tabButton, isActive ? styles.tabButtonActive : null]}
                onPress={() => handleSportChange(tab.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Leaderboard Header Block */}
        <View style={styles.leaderboardHeaderBox}>
          <View>
            <Text style={styles.headlineText}>{headlineText}</Text>
            <Text style={styles.subtext}>{seasonInfoText}</Text>
          </View>
          <Text style={styles.columnLabel}>{columnLabelText}</Text>
        </View>

        {/* Dynamic Ranked Athletes List */}
        <View style={{ gap: 8 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color="#00C8FF" />
              <Text style={{ color: '#00C8FF', fontSize: 13, fontWeight: '700' }}>
                CALCULATING PLAYER RANKINGS...
              </Text>
            </View>
          ) : displayedAthletes.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#64748B', fontSize: 13 }}>No ranked players found for this category</Text>
            </View>
          ) : (
            displayedAthletes.map((athlete, index) => {
            const overallRank = (currentPageSafe - 1) * ITEMS_PER_PAGE + index + 1;
            const rankFormatted = overallRank.toString().padStart(2, '0');
            const isTop3 = overallRank <= 3;

            return (
              <TouchableOpacity
                key={athlete.athlete_id}
                style={styles.leaderboardRow}
                onPress={() => handleAthletePress(athlete)}
                activeOpacity={0.85}
              >
                <Text style={[styles.rankBadge, isTop3 ? styles.rankTopBadge : null]}>
                  {rankFormatted}
                </Text>

                <View style={styles.athleteInfo}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person" size={14} color="#00C8FF" />
                  </View>
                  <View>
                    <Text style={styles.athleteName}>{athlete.full_name}</Text>
                    <Text style={styles.athleteLocation}>{athlete.province}</Text>
                  </View>
                </View>

                <Text style={styles.perScoreText}>{athlete.calculated_per} PER</Text>
              </TouchableOpacity>
            );
          }))}
        </View>

        {/* Functional Pagination Footer Bar */}
        <View style={styles.paginationRow}>
          <TouchableOpacity
            style={styles.pagePill}
            onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPageSafe === 1}
          >
            <Ionicons name="chevron-back" size={16} color={currentPageSafe === 1 ? '#475569' : '#94A3B8'} />
          </TouchableOpacity>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.pagePill, currentPageSafe === p ? styles.pagePillActive : null]}
              onPress={() => setCurrentPage(p)}
            >
              <Text style={[styles.pagePillText, currentPageSafe === p ? styles.pagePillTextActive : null]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.pagePill}
            onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPageSafe === totalPages}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPageSafe === totalPages ? '#475569' : '#94A3B8'} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default RankingPage;

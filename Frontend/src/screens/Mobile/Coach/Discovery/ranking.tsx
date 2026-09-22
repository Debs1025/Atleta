import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/ranking';
import {
  AthleteDiscoveryItem,
  SportCategoryFilter,
  matchesAthleteFilters,
  SPORT_METRICS,
  RankingSortMetric,
} from './discoveryTypes';
import { AdvancedFilterModal } from './AdvancedFilterModal';

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

  const headlineText = meta?.headline || 'Player Rankings';
  const seasonInfoText = meta?.season_info || 'SEASON 2026 • REGION V';

  const {
    athletes,
    setSelectedAthlete,
    activeSportFilter,
    setActiveSportFilter,
    advancedFilters,
    setAdvancedFilters,
    resetAdvancedFilters,
    activeFilterCount,
  } = useDiscovery();

  const [selectedSport, setSelectedSport] = useState<SportCategoryFilter>(activeSportFilter || 'BASKETBALL');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const ITEMS_PER_PAGE = 10;

  const handleSportChange = (sport: SportCategoryFilter) => {
    setSelectedSport(sport);
    setActiveSportFilter(sport);
    setCurrentPage(1);
  };

  // Determine active sort/ranking metric directly from user's filter selection
  const effectiveMetric: RankingSortMetric = useMemo(() => {
    if (advancedFilters.sortBy) return advancedFilters.sortBy;
    if (advancedFilters.minPpg > 0) return 'PPG';
    if (advancedFilters.minEff > 0) return 'EFF';
    if (advancedFilters.minPer > 0) return 'PER';
    return 'PER';
  }, [advancedFilters.sortBy, advancedFilters.minPpg, advancedFilters.minEff, advancedFilters.minPer]);

  // Helper to parse time string into seconds for sorting (lower time is better for races)
  const parseTimeToSeconds = (timeStr?: string): number => {
    if (!timeStr) return 999999;
    const clean = timeStr.replace(/[^\d:.]/g, '');
    if (clean.includes(':')) {
      const parts = clean.split(':');
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    const val = parseFloat(clean);
    return isNaN(val) ? 999999 : val;
  };

  const normSport = (s: string) => (s || '').toUpperCase().replace(/&/g, 'AND').replace(/\s+/g, '').trim();

  // Dynamic ranking and filtering logic
  const allRankedAthletes = useMemo(() => {
    const selNorm = normSport(selectedSport);

    return athletes
      .filter((a) => {
        const athNorm = normSport(a.sport_category);
        let sportMatches = false;
        if (selNorm.includes('SWIM')) sportMatches = athNorm.includes('SWIM');
        else if (selNorm.includes('TRACK') || selNorm.includes('FIELD')) sportMatches = athNorm.includes('TRACK') || athNorm.includes('FIELD');
        else if (selNorm.includes('BASKET')) sportMatches = athNorm.includes('BASKET') || !athNorm;
        else sportMatches = athNorm === selNorm;

        if (!sportMatches) return false;

        return matchesAthleteFilters(a, advancedFilters, localSearch);
      })
      .sort((a, b) => {
        if (effectiveMetric === 'PER') {
          return Number(b.calculated_per || 0) - Number(a.calculated_per || 0);
        }
        if (effectiveMetric === 'PPG') {
          return Number(b.stats?.ppg || 0) - Number(a.stats?.ppg || 0);
        }
        if (effectiveMetric === 'RPG') {
          return Number(b.stats?.rpg || 0) - Number(a.stats?.rpg || 0);
        }
        if (effectiveMetric === 'AST') {
          return Number(b.stats?.ast || 0) - Number(a.stats?.ast || 0);
        }
        if (effectiveMetric === 'EFF') {
          return Number(b.efficiency_pct || 0) - Number(a.efficiency_pct || 0);
        }
        if (effectiveMetric === 'FG_PCT') {
          return Number(b.stats?.fg_pct || 0) - Number(a.stats?.fg_pct || 0);
        }
        if (effectiveMetric === 'TIME_50M') {
          return parseTimeToSeconds(a.stats?.times_50m_free) - parseTimeToSeconds(b.stats?.times_50m_free);
        }
        if (effectiveMetric === 'TIME_100M') {
          return parseTimeToSeconds(a.stats?.times_100m) - parseTimeToSeconds(b.stats?.times_100m);
        }
        if (effectiveMetric === 'TIME_200M') {
          return parseTimeToSeconds(a.stats?.times_200m) - parseTimeToSeconds(b.stats?.times_200m);
        }
        if (effectiveMetric === 'TIME_400M') {
          return parseTimeToSeconds(a.stats?.times_400m) - parseTimeToSeconds(b.stats?.times_400m);
        }
        return Number(b.calculated_per || 0) - Number(a.calculated_per || 0);
      });
  }, [athletes, selectedSport, advancedFilters, localSearch, effectiveMetric]);

  const totalPages = Math.max(1, Math.ceil(allRankedAthletes.length / ITEMS_PER_PAGE));
  const currentPageSafe = Math.min(currentPage, totalPages);

  const displayedAthletes = useMemo(() => {
    const startIdx = (currentPageSafe - 1) * ITEMS_PER_PAGE;
    return allRankedAthletes.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [allRankedAthletes, currentPageSafe]);

  const handleAthletePress = (athlete: AthleteDiscoveryItem) => {
    setSelectedAthlete(athlete);
    if (onSelectAthlete) {
      onSelectAthlete(athlete);
    }
  };

  const getMetricDisplayValue = (athlete: AthleteDiscoveryItem): { main: string; sub: string } => {
    switch (effectiveMetric) {
      case 'PPG':
        return {
          main: `${athlete.stats?.ppg ?? 0} PPG`,
          sub: `${athlete.stats?.rpg ?? 0} RPG • ${athlete.stats?.ast ?? 0} AST`,
        };
      case 'RPG':
        return {
          main: `${athlete.stats?.rpg ?? 0} RPG`,
          sub: `${athlete.stats?.ppg ?? 0} PPG • ${athlete.calculated_per ?? 25} PER`,
        };
      case 'AST':
        return {
          main: `${athlete.stats?.ast ?? 0} AST`,
          sub: `${athlete.stats?.ppg ?? 0} PPG • ${athlete.calculated_per ?? 25} PER`,
        };
      case 'FG_PCT':
        return {
          main: `${athlete.stats?.fg_pct ?? 0}% FG`,
          sub: `${athlete.stats?.ppg ?? 0} PPG • ${athlete.calculated_per ?? 25} PER`,
        };
      case 'EFF':
        return {
          main: `${athlete.efficiency_pct ?? 75}% EFF`,
          sub: `${athlete.calculated_per ?? 25} PER`,
        };
      case 'TIME_50M':
        return {
          main: athlete.stats?.times_50m_free || 'N/A',
          sub: `${athlete.calculated_per ?? 25} PER`,
        };
      case 'TIME_100M':
        return {
          main: athlete.stats?.times_100m || 'N/A',
          sub: `${athlete.calculated_per ?? 25} PER`,
        };
      case 'TIME_200M':
        return {
          main: athlete.stats?.times_200m || 'N/A',
          sub: `${athlete.calculated_per ?? 25} PER`,
        };
      case 'TIME_400M':
        return {
          main: athlete.stats?.times_400m || 'N/A',
          sub: `${athlete.calculated_per ?? 25} PER`,
        };
      case 'PER':
      default:
        return {
          main: `${athlete.calculated_per ?? 25} PER`,
          sub: athlete.sport_category === 'BASKETBALL'
            ? `${athlete.stats?.ppg ?? 0} PPG • ${athlete.efficiency_pct ?? 75}% EFF`
            : `${athlete.efficiency_pct ?? 75}% EFF`,
        };
    }
  };

  const metrics = SPORT_METRICS[selectedSport] || SPORT_METRICS.BASKETBALL;

  return (
    <View style={styles.container}>
      {/* Header Bar */}
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

        {/* Search & Advanced Filters Bar */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={16} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search athlete, province, or pos..."
              placeholderTextColor="#64748B"
              value={localSearch}
              onChangeText={(t) => {
                setLocalSearch(t);
                setCurrentPage(1);
              }}
              autoCapitalize="none"
            />
            {localSearch.length > 0 && (
              <TouchableOpacity onPress={() => setLocalSearch('')}>
                <Ionicons name="close-circle" size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterButton, activeFilterCount > 0 ? styles.filterButtonActive : null]}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? '#00C8FF' : '#94A3B8'} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>



        {/* Leaderboard Header Block */}
        <View style={styles.leaderboardHeaderBox}>
          <View>
            <Text style={styles.headlineText}>{headlineText}</Text>
            <Text style={styles.subtext}>{seasonInfoText} • {allRankedAthletes.length} Athletes</Text>
          </View>
          <Text style={styles.columnLabel}>
            {metrics.find((m) => m.key === effectiveMetric)?.label.toUpperCase() || 'SCORE'}
          </Text>
        </View>

        {/* Dynamic Ranked Athletes List */}
        <View style={{ gap: 8 }}>
          {displayedAthletes.length > 0 ? (
            displayedAthletes.map((athlete, index) => {
              const overallRank = (currentPageSafe - 1) * ITEMS_PER_PAGE + index + 1;
              const rankFormatted = overallRank.toString().padStart(2, '0');
              const isTop1 = overallRank === 1;
              const isTop2 = overallRank === 2;
              const isTop3 = overallRank === 3;

              const metricInfo = getMetricDisplayValue(athlete);

              return (
                <TouchableOpacity
                  key={athlete.athlete_id}
                  style={[
                    styles.leaderboardRow,
                    isTop1 ? styles.leaderboardRowTop1 : isTop2 ? styles.leaderboardRowTop2 : isTop3 ? styles.leaderboardRowTop3 : null,
                  ]}
                  onPress={() => handleAthletePress(athlete)}
                  activeOpacity={0.85}
                >
                  <View style={styles.rankBadgeBox}>
                    <Text
                      style={[
                        styles.rankBadge,
                        isTop1 ? styles.rankTopBadge1 : isTop2 ? styles.rankTopBadge2 : isTop3 ? styles.rankTopBadge3 : null,
                      ]}
                    >
                      #{rankFormatted}
                    </Text>
                  </View>

                  <View style={styles.athleteInfo}>
                    <View style={styles.avatarCircle}>
                      <Ionicons
                        name={isTop1 ? 'trophy' : isTop2 ? 'medal' : isTop3 ? 'ribbon' : 'person'}
                        size={16}
                        color={isTop1 ? '#FFD700' : isTop2 ? '#E2E8F0' : isTop3 ? '#CD7F32' : '#00C8FF'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.athleteName} numberOfLines={1}>
                        {athlete.full_name || 'Athlete'}
                      </Text>
                      <Text style={styles.athleteLocation} numberOfLines={1}>
                        {athlete.position_tag || 'Player'} • #{athlete.jersey_number || '0'} • {athlete.province || 'Camarines Sur'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.statValueCol}>
                    <Text style={styles.mainScoreText}>{metricInfo.main}</Text>
                    <Text style={styles.secondaryScoreText}>{metricInfo.sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyStateBox}>
              <Ionicons name="filter-outline" size={32} color="#64748B" />
              <Text style={styles.emptyStateText}>No athletes match the current ranking filters</Text>
              {(activeFilterCount > 0 || localSearch.length > 0) && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    resetAdvancedFilters();
                    setLocalSearch('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.resetButtonText}>RESET FILTERS</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Functional Pagination Footer Bar */}
        {totalPages > 1 && (
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
        )}
      </ScrollView>

      {/* Advanced Filter Modal */}
      <AdvancedFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
      />
    </View>
  );
};

export default RankingPage;

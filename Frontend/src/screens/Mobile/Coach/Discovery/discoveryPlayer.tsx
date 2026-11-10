import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/discoveryMain';
import { AthleteDiscoveryItem } from './discoveryTypes';
import { RankingPage } from './ranking';
import { RecruitsPage } from './recruits';
import { SkeletonDiscoveryCards } from '../Components/AtletaLoadingIndicator';

import { extractVerticalLeapInches } from './playerBadgeEngine';
import { getCleanBiometrics } from './biometricsFormatter';

export const DiscoveryPlayer: React.FC<{
  mode: 'feed' | 'rankings' | 'recruits';
  onCloseSubView: () => void;
}> = ({ mode, onCloseSubView }) => {
  const insets = useSafeAreaInsets();
  const {
    filteredAthletes,
    setSelectedAthlete,
    isLoading,
  } = useDiscovery();

  const handleOpenAthlete = (athlete: AthleteDiscoveryItem) => {
    setSelectedAthlete(athlete);
  };

  if (mode === 'rankings') {
    return (
      <RankingPage
        onBack={onCloseSubView}
        onSelectAthlete={(athlete) => {
          setSelectedAthlete(athlete);
        }}
      />
    );
  }

  if (mode === 'recruits') {
    return <RecruitsPage onBack={onCloseSubView} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 12 }}>
        {isLoading && (!filteredAthletes || filteredAthletes.length === 0) ? (
          <SkeletonDiscoveryCards count={3} />
        ) : filteredAthletes && filteredAthletes.length > 0 ? (
          filteredAthletes.map((athlete) => {
            const athleteName = athlete.full_name || 'Athlete';
            const hasValidTeam = Boolean(
              (athlete.team_name &&
                athlete.team_name.trim() !== '' &&
                athlete.team_name.trim().toLowerCase() !== 'unassigned' &&
                athlete.team_name.trim().toLowerCase() !== 'none') ||
              (athlete.team_id &&
                String(athlete.team_id).trim() !== '' &&
                String(athlete.team_id).trim().toLowerCase() !== 'none') ||
              (athlete.has_coach && athlete.coach_name)
            );
            const currentTeam = athlete.team_name &&
              athlete.team_name.trim().toLowerCase() !== 'unassigned' &&
              athlete.team_name.trim().toLowerCase() !== 'none'
                ? athlete.team_name
                : (athlete.has_coach && athlete.coach_name ? `Coach ${athlete.coach_name}'s Team` : null);

            // Scouted = Athlete has a team (or is scouted by a team)
            // Unassigned = Athlete has no team yet
            const isScouted = Boolean(hasValidTeam || currentTeam || athlete.is_scouted || athlete.scout_status);
            const statusLabel = isScouted ? 'Scouted' : 'Unassigned';
            const effPct = Number(athlete.efficiency_pct ?? 75);
            const filledCount = Math.min(5, Math.max(1, Math.round((effPct / 100) * 5)));

            const verticalIn = extractVerticalLeapInches(athlete);

            return (
              <TouchableOpacity
                key={athlete.athlete_id}
                style={styles.athleteCard}
                onPress={() => handleOpenAthlete(athlete)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`View ${athleteName}'s profile`}
              >
                <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                    <View pointerEvents="none" style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={18} color="#00C8FF" />
                    </View>
                    <View pointerEvents="box-none" style={{ flex: 1 }}>
                      <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{athleteName}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        {currentTeam ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                            <Ionicons name="shield-checkmark" size={12} color="#38BDF8" />
                            <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                              {currentTeam}
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#94A3B8', fontSize: 12 }} numberOfLines={1}>
                            {athlete.province || 'Camarines Sur'}, Bicol
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View
                    pointerEvents="none"
                    style={[
                      styles.tagChip,
                      isScouted
                        ? { backgroundColor: 'rgba(0, 200, 255, 0.15)', borderColor: '#00C8FF' }
                        : { backgroundColor: 'rgba(148, 163, 184, 0.12)', borderColor: 'rgba(148, 163, 184, 0.3)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        isScouted ? { color: '#00C8FF' } : { color: '#94A3B8' },
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <View pointerEvents="none" style={styles.statsTrioRow}>
                  {(() => {
                    const ath = athlete as any;
                    const sc = String(ath.sport_category || ath.sport_type || ath.sport || '').toUpperCase().trim();
                    if (sc.includes('BASKETBALL')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PPG</Text><Text style={styles.statValue}>{ath.stats?.ppg ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>RPG</Text><Text style={styles.statValue}>{ath.stats?.rpg ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>AST</Text><Text style={styles.statValue}>{ath.stats?.ast ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>FG%</Text><Text style={styles.statValue}>{ath.stats?.fg_pct ?? 0}%</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{ath.calculated_per ?? 25}</Text></View>
                        </>
                      );
                    } else if (sc.includes('SWIM')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>50M FREE</Text><Text style={styles.statValue}>{ath.stats?.times_50m_free || ath.averages?.pb_50m_free || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>100M</Text><Text style={styles.statValue}>{ath.stats?.times_100m || ath.averages?.pb_100m_free || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>200M</Text><Text style={styles.statValue}>{ath.stats?.times_200m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>INDEX</Text><Text style={styles.statValue}>{ath.averages?.swim_index_score ? String(ath.averages.swim_index_score) : (ath.efficiency_pct ? `${ath.efficiency_pct}%` : 'N/A')}</Text></View>
                        </>
                      );
                    } else if (sc.includes('TRACK') || sc.includes('FIELD')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>100M</Text><Text style={styles.statValue}>{ath.stats?.times_100m || ath.averages?.pb_100m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>200M</Text><Text style={styles.statValue}>{ath.stats?.times_200m || ath.averages?.pb_200m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>400M</Text><Text style={styles.statValue}>{ath.stats?.times_400m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>WIN %</Text><Text style={styles.statValue}>{ath.averages?.win_rate_pct !== undefined ? `${ath.averages.win_rate_pct}%` : (ath.stats?.win_rate_pct !== undefined ? `${ath.stats.win_rate_pct}%` : `${ath.efficiency_pct ?? 75}%`)}</Text></View>
                        </>
                      );
                    } else if (sc.includes('VOLLEY')) {
                      const vKills = ath.stats?.kills ?? ath.stats?.spike_kills ?? ath.averages?.kills ?? ath.averages?.spike_kills ?? 0;
                      const vBlocks = ath.stats?.blocks ?? ath.stats?.block_points ?? ath.averages?.blocks ?? ath.averages?.block_points ?? 0;
                      const vAces = ath.stats?.aces ?? ath.stats?.service_aces ?? ath.averages?.aces ?? ath.averages?.service_aces ?? 0;
                      const vDigs = ath.stats?.digs ?? ath.averages?.digs ?? 0;
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>KILLS</Text><Text style={styles.statValue}>{vKills}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>BLOCKS</Text><Text style={styles.statValue}>{vBlocks}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>ACES</Text><Text style={styles.statValue}>{vAces}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>DIGS</Text><Text style={styles.statValue}>{vDigs}</Text></View>
                        </>
                      );
                    } else if (sc.includes('PICKLE')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>POINTS</Text><Text style={styles.statValue}>{ath.stats?.points_scored ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>ACES</Text><Text style={styles.statValue}>{ath.stats?.aces ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>DINKS</Text><Text style={styles.statValue}>{ath.stats?.dinks ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>EFF</Text><Text style={styles.statValue}>{ath.efficiency_pct ?? 75}%</Text></View>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>GP</Text><Text style={styles.statValue}>{ath.stats?.games_played ?? ath.averages?.games_played ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>WINS</Text><Text style={styles.statValue}>{ath.stats?.wins ?? ath.averages?.wins ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>EFF</Text><Text style={styles.statValue}>{ath.efficiency_pct ?? 75}%</Text></View>
                        </>
                      );
                    }
                  })()}
                </View>

                <View pointerEvents="none" style={styles.levelBarContainer}>
                  {[1, 2, 3, 4, 5].map((step) => {
                    const isFilled = step <= filledCount;
                    return (
                      <View key={step} style={[styles.levelSegment, isFilled ? styles.levelSegmentFilled : { backgroundColor: '#1E293B' }, step === filledCount ? styles.levelSegmentActiveHigh : null]} />
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="search-outline" size={32} color="#64748B" />
            <Text style={styles.emptyStateText}>No players found matching query</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default DiscoveryPlayer;

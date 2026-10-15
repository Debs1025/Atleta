import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/discoveryMain';
import { AthleteDiscoveryItem } from './discoveryTypes';
import { RankingPage } from './ranking';
import { RecruitsPage } from './recruits';
import { SkeletonDiscoveryCards } from '../Components/AtletaLoadingIndicator';

export const DiscoveryPlayer: React.FC<{
  mode: 'feed' | 'rankings' | 'recruits';
  onCloseSubView: () => void;
}> = ({ mode, onCloseSubView }) => {
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
            const positionTag = athlete.position_tag || 'Player';
            const effPct = Number(athlete.efficiency_pct ?? 75);
            const filledCount = Math.min(5, Math.max(1, Math.round((effPct / 100) * 5)));
            const currentTeam = athlete.team_name || (athlete.has_coach && athlete.coach_name ? `Coach ${athlete.coach_name}'s Team` : null);

            return (
              <TouchableOpacity
                key={athlete.athlete_id}
                style={styles.athleteCard}
                onPress={() => handleOpenAthlete(athlete)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={18} color="#00C8FF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{athleteName}</Text>
                        {athlete.is_scouted && (
                          <View style={{ backgroundColor: 'rgba(0, 200, 255, 0.15)', borderColor: '#00C8FF', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={{ color: '#00C8FF', fontSize: 9, fontWeight: '800' }}>SCOUTED</Text>
                          </View>
                        )}
                      </View>

                      {currentTeam ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          <Ionicons name="shield-checkmark" size={12} color="#38BDF8" />
                          <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                            Team: {currentTeam}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                          #{athlete.jersey_number || '2'} • {athlete.province || 'Camarines Sur'}, Bicol
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{positionTag}</Text>
                  </View>
                </View>

                <View style={styles.statsTrioRow}>
                  {(() => {
                    const sc = String(athlete.sport_category || '').toUpperCase().trim();
                    if (sc.includes('BASKETBALL')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PPG</Text><Text style={styles.statValue}>{athlete.stats?.ppg ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>RPG</Text><Text style={styles.statValue}>{athlete.stats?.rpg ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>AST</Text><Text style={styles.statValue}>{athlete.stats?.ast ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>FG%</Text><Text style={styles.statValue}>{athlete.stats?.fg_pct ?? 0}%</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per ?? 25}</Text></View>
                        </>
                      );
                    } else if (sc.includes('SWIM')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>50M FREE</Text><Text style={styles.statValue}>{athlete.stats?.times_50m_free || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>100M</Text><Text style={styles.statValue}>{athlete.stats?.times_100m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>200M</Text><Text style={styles.statValue}>{athlete.stats?.times_200m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per ?? 25}</Text></View>
                        </>
                      );
                    } else if (sc.includes('TRACK') || sc.includes('FIELD')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>100M</Text><Text style={styles.statValue}>{athlete.stats?.times_100m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>200M</Text><Text style={styles.statValue}>{athlete.stats?.times_200m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>400M</Text><Text style={styles.statValue}>{athlete.stats?.times_400m || 'N/A'}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per ?? 25}</Text></View>
                        </>
                      );
                    } else if (sc.includes('VOLLEY')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>KILLS</Text><Text style={styles.statValue}>{athlete.stats?.spike_kills ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>BLOCKS</Text><Text style={styles.statValue}>{athlete.stats?.block_points ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>ACES</Text><Text style={styles.statValue}>{athlete.stats?.service_aces ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per ?? 25}</Text></View>
                        </>
                      );
                    } else if (sc.includes('PICKLE')) {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>POINTS</Text><Text style={styles.statValue}>{athlete.stats?.points_scored ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>ACES</Text><Text style={styles.statValue}>{athlete.stats?.aces ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>DINKS</Text><Text style={styles.statValue}>{athlete.stats?.dinks ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per ?? 25}</Text></View>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PPG</Text><Text style={styles.statValue}>{athlete.stats?.ppg ?? 0}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per ?? 25}</Text></View>
                          <View style={styles.statCol}><Text style={styles.statLabel}>EFF</Text><Text style={styles.statValue}>{athlete.efficiency_pct ?? 75}%</Text></View>
                        </>
                      );
                    }
                  })()}
                </View>

                <View style={styles.levelBarContainer}>
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

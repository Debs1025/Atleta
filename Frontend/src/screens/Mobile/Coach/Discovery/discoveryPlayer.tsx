import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/discoveryMain';
import { AthleteDiscoveryItem } from './discoveryTypes';
import { RankingPage } from './ranking';
import { RecruitsPage } from './recruits';
import { ScoutAthlete } from './scoutAthlete';

export const DiscoveryPlayer: React.FC<{
  mode: 'feed' | 'rankings' | 'recruits';
  onCloseSubView: () => void;
}> = ({ mode, onCloseSubView }) => {
  const {
    filteredAthletes,
    selectedAthlete,
    setSelectedAthlete,
    loading,
  } = useDiscovery();

  const [showScoutingModal, setShowScoutingModal] = useState(false);

  const handleOpenAthlete = (athlete: AthleteDiscoveryItem) => {
    setSelectedAthlete(athlete);
    setShowScoutingModal(true);
  };

  if (mode === 'rankings') {
    return (
      <RankingPage
        onBack={onCloseSubView}
        onSelectAthlete={(athlete) => {
          setSelectedAthlete(athlete);
          setShowScoutingModal(true);
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
        {loading ? (
          <View style={{ paddingVertical: 48, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <ActivityIndicator size="large" color="#00C8FF" />
            <Text style={{ color: '#00C8FF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
              DISCOVERING PROSPECTS...
            </Text>
            <Text style={{ color: '#64748B', fontSize: 12 }}>
              Fetching athlete profiles & verified evaluations
            </Text>
          </View>
        ) : filteredAthletes.length > 0 ? (
          filteredAthletes.map((athlete) => {
            return (
              <TouchableOpacity
                key={athlete.athlete_id}
                style={styles.athleteCard}
                onPress={() => handleOpenAthlete(athlete)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="person" size={16} color="#00C8FF" />
                    </View>
                    <View>
                      <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{athlete.full_name}</Text>
                      <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>
                        #{athlete.jersey_number || '2'} • {athlete.province}, Bicol
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{athlete.position_tag}</Text>
                  </View>
                </View>

                <View style={styles.statsTrioRow}>
                  {athlete.sport_category === 'BASKETBALL' ? (
                    <>
                      <View style={styles.statCol}><Text style={styles.statLabel}>PPG</Text><Text style={styles.statValue}>{athlete.stats.ppg || 0}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>RPG</Text><Text style={styles.statValue}>{athlete.stats.rpg || 0}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>AST</Text><Text style={styles.statValue}>{athlete.stats.ast || 0}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>FG%</Text><Text style={styles.statValue}>{athlete.stats.fg_pct || 0}%</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per}</Text></View>
                    </>
                  ) : athlete.sport_category === 'SWIMMING' ? (
                    <>
                      <View style={styles.statCol}><Text style={styles.statLabel}>50M FREE</Text><Text style={styles.statValue}>{athlete.stats.times_50m_free || 'N/A'}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>100M</Text><Text style={styles.statValue}>{athlete.stats.times_100m || 'N/A'}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>200M</Text><Text style={styles.statValue}>{athlete.stats.times_200m || 'N/A'}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per}</Text></View>
                    </>
                  ) : (
                    <>
                      <View style={styles.statCol}><Text style={styles.statLabel}>100M</Text><Text style={styles.statValue}>{athlete.stats.times_100m || 'N/A'}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>200M</Text><Text style={styles.statValue}>{athlete.stats.times_200m || 'N/A'}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>400M</Text><Text style={styles.statValue}>{athlete.stats.times_400m || 'N/A'}</Text></View>
                      <View style={styles.statCol}><Text style={styles.statLabel}>PER</Text><Text style={styles.statValue}>{athlete.calculated_per}</Text></View>
                    </>
                  )}
                </View>

                <View style={styles.levelBarContainer}>
                  {[1, 2, 3, 4, 5].map((step) => {
                    const filledCount = Math.round((athlete.efficiency_pct / 100) * 5);
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
            <Text style={styles.emptyStateText}>No Players found</Text>
          </View>
        )}
      </View>

      {/* SCREEN 2: ATHLETE SCOUTING PROFILE SCREEN */}
      <Modal visible={showScoutingModal && !!selectedAthlete} animationType="slide" transparent={false} onRequestClose={() => setShowScoutingModal(false)}>
        {selectedAthlete && (
          <ScoutAthlete
            athlete={selectedAthlete}
            onBack={() => {
              setShowScoutingModal(false);
              setSelectedAthlete(null);
            }}
          />
        )}
      </Modal>
    </View>
  );
};

export default DiscoveryPlayer;

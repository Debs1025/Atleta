import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/viewMatch';
import { DiscoveryMatchItem } from './discoveryTypes';

interface ViewMatchProps {
  onBack: () => void;
  match?: DiscoveryMatchItem;
}

// API READY: Dedicated View Match screen ready for live backend API payload
export const ViewMatch: React.FC<ViewMatchProps> = ({ onBack, match }) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top - 12, 4);

  const { selectedMatch: contextMatch, setSelectedAthlete, athletes } = useDiscovery();
  const currentMatch = match || contextMatch;

  const handleSelectPlayer = (playerName: string) => {
    const found = athletes.find((a) => a.full_name.toLowerCase() === playerName.toLowerCase());
    if (found) {
      setSelectedAthlete(found);
    } else if (currentMatch) {
      setSelectedAthlete({
        athlete_id: `ath_${Date.now()}`,
        full_name: playerName,
        sport_category: currentMatch.sport_category,
        position_tag: currentMatch.sport_category === 'BASKETBALL' ? 'FORWARD' : currentMatch.sport_category === 'SWIMMING' ? 'FREESTYLE' : 'SPRINT',
        province: 'Camarines Sur',
        recruitment_status: 'OPEN',
        calculated_per: 24.5,
        efficiency_pct: 88,
        biometrics: { height_ft: "6'2\"", weight_lbs: '185 lbs', wingspan_ft: "6'5\"" },
        stats: { ppg: 22.4, rpg: 7.1, ast: 8.1, fg_pct: 48 },
        contact_info: {
          email: `${playerName.toLowerCase().replace(/\s+/g, '.')}@anhs.edu.ph`,
          facebook: playerName,
          phone: '+67000',
        },
      });
    }
  };

  if (!currentMatch) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            <Text style={styles.headerTitle}>MATCH DISCOVERY</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // SAMPLE DATA FALLBACK: If backend record intensity spikes array is pending
  const dynamicsData = currentMatch.dynamics_data || [40, 65, 88, 70, 95, 82, 90, 60];

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.headerTitle}>MATCH DISCOVERY</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Match Result Header Section */}
        <Text style={styles.sectionTitle}>
          MATCH RESULT
        </Text>

        <View style={styles.matchResultCard}>
          {/* Team 1 (Home) */}
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <View style={styles.teamIconBox}>
              <Ionicons name="rocket-outline" size={24} color="#00C8FF" />
            </View>
            <Text style={styles.teamName}>{currentMatch.team1_name}</Text>
            <Text style={styles.teamRoleText}>Home Team</Text>
          </View>

          {/* Score Head to Head */}
          <View style={styles.scoreRow}>
            <Text style={styles.scoreHomeText}>{currentMatch.team1_score}</Text>
            <Text style={styles.vsText}>vs</Text>
            <Text style={styles.scoreAwayText}>{currentMatch.team2_score}</Text>
          </View>

          {/* Team 2 (Away) */}
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <View style={styles.teamIconBox}>
              <Ionicons name="sync-outline" size={24} color="#00C8FF" />
            </View>
            <Text style={styles.teamName}>{currentMatch.team2_name}</Text>
            <Text style={styles.teamRoleText}>Away Team</Text>
          </View>
        </View>

        {/* Player Performance Table Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
              PLAYER PERFORMANCE
            </Text>
            <View style={{ backgroundColor: 'rgba(0,200,255,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(0,200,255,0.3)' }}>
              <Text style={{ color: '#00C8FF', fontSize: 9, fontWeight: '800' }}>TAP ROW TO SCOUT</Text>
            </View>
          </View>
          <Text style={{ color: '#00C8FF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
            SWIPE FOR STATS →
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={[styles.tableCard, { minWidth: 480, marginBottom: 0 }]}>
            {/* Sport-Specific Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderLabel, { width: 170 }]}>
                {currentMatch.sport_category === 'BASKETBALL' ? 'PLAYER' : 'ATHLETE'}
              </Text>
              {currentMatch.sport_category === 'BASKETBALL' ? (
                <>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>PTS</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>REB</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>AST</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>FG%</Text>
                </>
              ) : currentMatch.sport_category === 'SWIMMING' ? (
                <>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>50M</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>100M</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>200M</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1.2, textAlign: 'center' }]}>TIME</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>100M</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>200M</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1, textAlign: 'center' }]}>400M</Text>
                  <Text style={[styles.tableHeaderLabel, { flex: 1.2, textAlign: 'center' }]}>TIME</Text>
                </>
              )}
            </View>

            {/* Table Rows (mapped dynamically from API data payload) */}
            {currentMatch.player_stats?.map((row, idx) => (
              <TouchableOpacity key={idx} style={[
                styles.tableRow,
                { borderBottomWidth: idx === (currentMatch.player_stats?.length || 0) - 1 ? 0 : 1 }
              ]} onPress={() => handleSelectPlayer(row.player)} activeOpacity={0.85}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: 170 }}>
                  <View style={styles.playerBadge}>
                    <Text style={{ color: '#00C8FF', fontSize: 10, fontWeight: '900' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.playerName}>{row.player}</Text>
                      <Ionicons name="chevron-forward-circle-outline" size={13} color="#00C8FF" />
                    </View>
                    <Text style={{ color: '#64748B', fontSize: 10, marginTop: 1 }}>
                      {row.role_team || 'Athlete'}
                    </Text>
                  </View>
                </View>

                {currentMatch.sport_category === 'BASKETBALL' ? (
                  <>
                    <Text style={[styles.ptsValue, { flex: 1, textAlign: 'center' }]}>{row.pts ?? 0}</Text>
                    <Text style={[styles.astValue, { flex: 1, textAlign: 'center' }]}>{row.reb ?? 0}</Text>
                    <Text style={[styles.astValue, { flex: 1, textAlign: 'center' }]}>{row.ast ?? 0}</Text>
                    <Text style={[styles.astValue, { flex: 1, textAlign: 'center' }]}>{row.fg_pct ?? 0}%</Text>
                  </>
                ) : currentMatch.sport_category === 'SWIMMING' ? (
                  <>
                    <Text style={[styles.astValue, { flex: 1, textAlign: 'center', fontSize: 12 }]}>{row.time_50m || '-'}</Text>
                    <Text style={[styles.ptsValue, { flex: 1, textAlign: 'center', fontSize: 12 }]}>{row.time_100m || '-'}</Text>
                    <Text style={[styles.astValue, { flex: 1, textAlign: 'center', fontSize: 12 }]}>{row.time_200m || '-'}</Text>
                    <Text style={[styles.ptsValue, { flex: 1.2, textAlign: 'center', fontSize: 12 }]}>{row.final_time || '-'}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.ptsValue, { flex: 1, textAlign: 'center', fontSize: 12 }]}>{row.time_100m || '-'}</Text>
                    <Text style={[styles.astValue, { flex: 1, textAlign: 'center', fontSize: 12 }]}>{row.time_200m || '-'}</Text>
                    <Text style={[styles.astValue, { flex: 1, textAlign: 'center', fontSize: 12 }]}>{row.time_400m || '-'}</Text>
                    <Text style={[styles.ptsValue, { flex: 1.2, textAlign: 'center', fontSize: 12 }]}>{row.final_time || '-'}</Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Match Dynamics Chart Section */}
        <View style={styles.dynamicsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="trending-up-outline" size={18} color="#00C8FF" />
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>Match Dynamics</Text>
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
              LIVE PROJECTION (PAST)
            </Text>
          </View>

          {/* Bar Chart Bars */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 90, paddingHorizontal: 6, marginBottom: 12 }}>
            {dynamicsData.map((val, idx) => (
              <View key={idx} style={{ alignItems: 'center', flex: 1 }}>
                <View
                  style={{
                    width: 16,
                    height: `${val}%`,
                    backgroundColor: val > 80 ? '#00C8FF' : '#334155',
                    borderRadius: 4,
                  }}
                />
              </View>
            ))}
          </View>

          <Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 16 }}>
            Peak intensity occurred during the final 4 minutes with 4 consecutive field goals from Mitchell.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default ViewMatch;

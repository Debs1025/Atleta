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
import { styles } from './styles/viewTeam';
import { DiscoveryTeamItem, AthleteDiscoveryItem } from './discoveryTypes';

interface ViewTeamProps {
  onBack: () => void;
  team?: DiscoveryTeamItem;
}

// API READY: Dedicated View Team screen ready for live backend API payload
export const ViewTeam: React.FC<ViewTeamProps> = ({ onBack, team }) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top - 12, 4);

  const { selectedTeam: contextTeam, setSelectedAthlete, athletes } = useDiscovery();
  const currentTeam = team || contextTeam;

  const handleSelectPlayer = (player: AthleteDiscoveryItem) => {
    const match = athletes.find((a) => a.athlete_id === player.athlete_id || a.full_name.toLowerCase() === player.full_name.toLowerCase()) || player;
    setSelectedAthlete(match);
  };

  if (!currentTeam) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            <Text style={styles.headerTitle}>TEAM DISCOVERY</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const seasonRecordText = currentTeam.season_record || '0 - 0';

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.headerTitle}>TEAM DISCOVERY</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Header Card */}
        <View style={styles.heroCard}>
          <View style={styles.iconBadgeBox}>
            <Ionicons
              name={
                currentTeam.sport_category === 'BASKETBALL'
                  ? 'basketball'
                  : currentTeam.sport_category === 'SWIMMING'
                    ? 'water'
                    : 'walk'
              }
              size={26}
              color="#00C8FF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teamTitle}>{currentTeam.team_name}</Text>
            <Text style={styles.divisionTag}>{currentTeam.division_tag}</Text>
          </View>
        </View>

        {/* Head Coach & Season Record Card */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#1E293B',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Ionicons name="person" size={20} color="#00C8FF" />
            </View>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>{currentTeam.head_coach}</Text>
              <Text style={{ color: '#94A3B8', fontSize: 12 }}>Head Coach</Text>
            </View>
          </View>

          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: '#1E293B',
            paddingTop: 12,
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '700' }}>SPORT</Text>
              <Text style={{ color: '#00C8FF', fontSize: 14, fontWeight: '800', marginTop: 2 }}>
                {currentTeam.sport_category}
              </Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: '#1E293B' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '700' }}>RECORD</Text>
              <Text style={{ color: '#00C8FF', fontSize: 14, fontWeight: '800', marginTop: 2 }}>
                {seasonRecordText}
              </Text>
            </View>
          </View>
        </View>

        {/* Team Roster Header */}
        <Text style={styles.sectionHeader}>
          TEAM ROSTER ({currentTeam.roster ? currentTeam.roster.length : 0})
        </Text>

        {/* Team Roster List */}
        {!currentTeam.roster || currentTeam.roster.length === 0 ? (
          <View style={{
            padding: 24,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0F172A',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#1E293B',
          }}>
            <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>
              No athletes currently assigned to this roster.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {currentTeam.roster.map((player) => (
              <TouchableOpacity key={player.athlete_id} style={styles.rosterCard} onPress={() => handleSelectPlayer(player)} activeOpacity={0.85}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={styles.jerseyBadge}>
                    <Text style={styles.jerseyText}>
                      #{player.jersey_number || '00'}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.playerName}>{player.full_name}</Text>
                    <Text style={styles.playerPosition}>{player.position_tag}</Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#00C8FF', fontSize: 12, fontWeight: '800' }}>{player.biometrics.height_ft}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 2 }}>{player.biometrics.weight_lbs}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ViewTeam;

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/discoveryMain';
import { DiscoveryTeamItem } from './discoveryTypes';

interface DiscoveryTeamsProps {
  onViewTeam?: (team: DiscoveryTeamItem) => void;
}

export const DiscoveryTeams: React.FC<DiscoveryTeamsProps> = ({ onViewTeam }) => {
  const { filteredTeams, setSelectedTeam } = useDiscovery();

  const handleOpenTeam = (team: DiscoveryTeamItem) => {
    setSelectedTeam(team);
    if (onViewTeam) {
      onViewTeam(team);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionHeaderTitle}>Discovery Teams</Text>
      {filteredTeams.length > 0 ? (
        filteredTeams.map((team) => (
          <View key={team.team_id} style={[styles.teamCard, { marginBottom: 14 }]}>
            <View style={styles.teamBadgeIconBox}>
              <Ionicons
                name={
                  team.sport_category === 'BASKETBALL'
                    ? 'basketball-outline'
                    : team.sport_category === 'SWIMMING'
                    ? 'water-outline'
                    : 'walk-outline'
                }
                size={24}
                color="#00C8FF"
              />
            </View>

            <Text style={styles.teamNameText}>{team.team_name}</Text>
            <Text style={styles.teamDivisionTag}>{team.division_tag}</Text>
            <Text style={[styles.teamDescriptionText, { lineHeight: 18, marginVertical: 8 }]}>{team.description}</Text>

            <View style={[styles.headCoachRow, { marginBottom: 12 }]}>
              <View style={styles.coachAvatarCircle}>
                <Ionicons name="person" size={14} color="#00C8FF" />
              </View>
              <Text style={styles.headCoachText}>{team.head_coach}</Text>
              <Text style={styles.headCoachRole}>Head Coach</Text>
            </View>

            <TouchableOpacity style={styles.viewTeamButton} onPress={() => handleOpenTeam(team)} activeOpacity={0.85}>
              <Text style={styles.viewTeamButtonText}>VIEW TEAM</Text>
            </TouchableOpacity>
          </View>
        ))
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="people-outline" size={32} color="#64748B" />
          <Text style={styles.emptyStateText}>No Team found</Text>
        </View>
      )}
    </View>
  );
};

export default DiscoveryTeams;

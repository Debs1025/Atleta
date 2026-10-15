import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/discoveryMain';
import { DiscoveryMatchItem } from './discoveryTypes';

interface DiscoveryEventProps {
  onViewMatch?: (match: DiscoveryMatchItem) => void;
}

export const DiscoveryEvent: React.FC<DiscoveryEventProps> = ({ onViewMatch }) => {
  const { filteredEvents, setSelectedMatch } = useDiscovery();

  const handleOpenMatch = (match: DiscoveryMatchItem) => {
    setSelectedMatch(match);
    if (onViewMatch) {
      onViewMatch(match);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {filteredEvents.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="calendar-outline" size={44} color="#64748B" />
          <Text style={[styles.emptyStateText, { fontSize: 16, fontWeight: "700", color: "#FFFFFF", marginTop: 10 }]}>
            No Available Matches
          </Text>
          <Text style={[styles.emptyStateText, { fontSize: 12, color: "#64748B", marginTop: 4, textAlign: "center" }]}>
            There are currently no scheduled or completed matches for this category.
          </Text>
        </View>
      ) : (
        filteredEvents.map((evt) => (
          <View key={evt.event_id}>
            <View style={styles.eventHeaderBox}>
              <Text style={styles.eventNameTitle}>{evt.event_name}</Text>
              <Text style={styles.eventDateSubline}>{evt.date_range}</Text>
            </View>

            {evt.matches.map((match) => (
              <View key={match.match_id} style={styles.matchCard}>
                <View style={styles.matchLeftInfo}>
                  <View style={styles.matchBadgeIconBox}>
                    <Ionicons
                      name={
                        match.sport_category === 'BASKETBALL'
                          ? 'basketball-outline'
                          : match.sport_category === 'SWIMMING'
                            ? 'water-outline'
                            : 'walk-outline'
                      }
                      size={22}
                      color="#00C8FF"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.matchHeadlineText}>{match.headline}</Text>
                    <Text style={styles.matchVenueText}>{match.time_venue}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.viewMatchOutlineBtn} onPress={() => handleOpenMatch(match)} activeOpacity={0.8}>
                  <Text style={styles.viewMatchOutlineText}>VIEW MATCH</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
};

export default DiscoveryEvent;

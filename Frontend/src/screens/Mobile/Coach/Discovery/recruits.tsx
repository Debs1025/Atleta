import React from 'react';
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
import { styles } from './styles/recruits';

interface RecruitsProps {
  onBack: () => void;
}

export const RecruitsPage: React.FC<RecruitsProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top - 12, 4);

  const { scoutingProposals, sortRecruits, setSortRecruits, loading } = useDiscovery();

  const toggleSort = () => {
    setSortRecruits(sortRecruits === 'date' ? 'status' : 'date');
  };

  const sortedProposals = [...scoutingProposals].sort((a, b) => {
    if (sortRecruits === 'status') {
      return a.offer_status.localeCompare(b.offer_status);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          <Text style={styles.headerTitle}>RECRUITS</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleSort} activeOpacity={0.8} style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={16} color="#00C8FF" />
          <Text style={styles.sortText}>Sort</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: 12 }}>
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator size="large" color="#00C8FF" />
              <Text style={{ color: '#00C8FF', fontSize: 13, fontWeight: '700' }}>
                LOADING SCOUTED RECRUITS...
              </Text>
            </View>
          ) : (
            sortedProposals.map((item) => (
            <View key={item.scout_id} style={styles.recruitCard}>
              <View style={styles.leftGroup}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={18} color="#00C8FF" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.recruitName}>{item.athlete_name}</Text>
                  <Text style={styles.sportCategoryTag}>{item.sport_category}</Text>
                </View>
              </View>

              <View style={styles.rightGroup}>
                {item.offer_status === 'ACCEPTED' && (
                  <View style={styles.statusBadgeAccepted}>
                    <Text style={styles.statusTextAccepted}>ACCEPTED</Text>
                  </View>
                )}
                {item.offer_status === 'PENDING' && (
                  <View style={styles.statusBadgePending}>
                    <Text style={styles.statusTextPending}>PENDING</Text>
                  </View>
                )}
                {item.offer_status === 'DECLINED' && (
                  <View style={styles.statusBadgeDeclined}>
                    <Text style={styles.statusTextDeclined}>DECLINED</Text>
                  </View>
                )}
                <Text style={styles.relativeDateText}>{item.date_added_relative}</Text>
              </View>
            </View>
          )))}

          {/* Empty State Container matching wireframe */}
          <View style={styles.emptyStateContainer}>
            <Ionicons name="person-add-outline" size={32} color="#64748B" />
            <Text style={styles.emptyStateText}>No more recruits found</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default RecruitsPage;

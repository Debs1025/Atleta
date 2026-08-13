import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/scoutAthlete';
import { AthleteDiscoveryItem } from './discoveryTypes';

interface ScoutAthleteProps {
  onBack: () => void;
  athlete?: AthleteDiscoveryItem;
}

export const ScoutAthlete: React.FC<ScoutAthleteProps> = ({ onBack, athlete }) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 36) + 48;

  const { selectedAthlete: contextAthlete, scoutAthlete } = useDiscovery();
  const currentAthlete = athlete || contextAthlete;

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  if (!currentAthlete) {
    return (
      <View style={styles.container}>
        <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
          <Text style={styles.headerTitle}>ATHLETE PROFILE</Text>
          <TouchableOpacity onPress={onBack} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleScoutPress = () => {
    // API READY: Triggers backend notification push to the athlete's account
    // Example endpoint payload: POST /api/v1/scout-proposals { athlete_id: currentAthlete.athlete_id, coach_id: 'current_user' }
    scoutAthlete(currentAthlete);
    setShowSuccessModal(true);
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Text style={styles.headerTitle}>ATHLETE PROFILE</Text>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Media / Image Placeholder Box */}
        <View style={styles.imagePlaceholderBox}>
          {currentAthlete.avatar_url ? (
            <Image source={{ uri: currentAthlete.avatar_url }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
          ) : (
            <>
              <View style={styles.crossLine1} />
              <View style={styles.crossLine2} />
              <Text style={styles.noImageText}>NO IMAGE AVAILABLE</Text>
            </>
          )}
        </View>

        {/* Athlete Name & Position Badge */}
        <View style={styles.athleteNameRow}>
          <Text style={styles.athleteNameText}>{currentAthlete.full_name.toUpperCase()}</Text>
          {currentAthlete.position_tag &&
            currentAthlete.position_tag.toUpperCase() !== currentAthlete.sport_category.toUpperCase() && (
              <View style={styles.positionBadge}>
                <Text style={styles.positionBadgeText}>{currentAthlete.position_tag}</Text>
              </View>
            )}
        </View>

        {/* Location & Sport Subline */}
        <View style={styles.sublineRow}>
          <Text style={styles.sublineText}>
            #{currentAthlete.jersey_number || '2'} • {currentAthlete.province}, Bicol
          </Text>
          <View style={styles.sportTagBadge}>
            <Text style={styles.sportTagBadgeText}>{currentAthlete.sport_category.toUpperCase()}</Text>
          </View>
        </View>

        {/* Biometrics Card */}
        <View style={styles.biometricsCard}>
          <View style={styles.biometricCol}>
            <Text style={styles.biometricLabel}>HEIGHT</Text>
            <Text style={styles.biometricValue}>{currentAthlete.biometrics.height_ft}</Text>
          </View>
          <View style={styles.biometricDivider} />
          <View style={styles.biometricCol}>
            <Text style={styles.biometricLabel}>WEIGHT</Text>
            <Text style={styles.biometricValue}>{currentAthlete.biometrics.weight_lbs}</Text>
          </View>
          <View style={styles.biometricDivider} />
          <View style={styles.biometricCol}>
            <Text style={styles.biometricLabel}>WINGSPAN</Text>
            <Text style={styles.biometricValue}>{currentAthlete.biometrics.wingspan_ft || "6'5\""}</Text>
          </View>
        </View>

        {/* Performance Analytics Section */}
        <Text style={styles.sectionTitle}>PERFORMANCE ANALYTICS</Text>
        <View style={styles.analyticsGrid}>
          {currentAthlete.sport_category === 'BASKETBALL' ? (
            <>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats.ppg ?? 0}</Text>
                <Text style={styles.analyticLabel}>PPG</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats.rpg ?? 0}</Text>
                <Text style={styles.analyticLabel}>RPG</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats.ast ?? 0}</Text>
                <Text style={styles.analyticLabel}>AST</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats.fg_pct ?? 0}%</Text>
                <Text style={styles.analyticLabel}>FG%</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 0}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
            </>
          ) : currentAthlete.sport_category === 'SWIMMING' ? (
            <>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats.times_50m_free || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>50M FREE</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats.times_100m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>100M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats.times_200m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>200M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 0}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats.times_100m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>100M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats.times_200m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>200M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats.times_400m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>400M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 0}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
            </>
          )}
        </View>

        {/* Efficiency Progress Bar */}
        <View style={styles.efficiencyContainer}>
          <View style={styles.efficiencyHeader}>
            <Text style={styles.efficiencyTitle}>EFFICIENCY</Text>
            <Text style={styles.efficiencyValueText}>{currentAthlete.efficiency_pct}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${currentAthlete.efficiency_pct}%` }]} />
          </View>
        </View>

        {/* Contact Information Card */}
        <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={18} color="#94A3B8" />
            <Text style={styles.contactText}>
              {currentAthlete.full_name.toLowerCase().replace(/\s+/g, '.')}@anhs.edu.ph
            </Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="logo-facebook" size={18} color="#94A3B8" />
            <Text style={styles.contactText}>{currentAthlete.full_name}</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color="#94A3B8" />
            <Text style={styles.contactText}>+67000</Text>
          </View>
        </View>

        {/* Primary Scout Player Button */}
        <TouchableOpacity style={styles.scoutButton} onPress={handleScoutPress} activeOpacity={0.85}>
          <Text style={styles.scoutButtonText}>SCOUT PLAYER</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* SUCCESS CONFIRMATION MODAL (image_dbba3c.jpg) */}
      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={36} color="#22C55E" />
            </View>

            <Text style={styles.successTitle}>CONFIRMATION SENT!</Text>
            <Text style={styles.successSubtitle}>Your scouting request is successful!</Text>

            <TouchableOpacity style={styles.successCloseBtn} onPress={() => { setShowSuccessModal(false); onBack(); }} activeOpacity={0.85}>
              <Text style={styles.successCloseBtnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ScoutAthlete;

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

import { requestAuthenticatedJson } from '../../Authentication/authShared';

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

  const handleScoutPress = async () => {
    scoutAthlete(currentAthlete);
    setShowSuccessModal(true);

    try {
      await requestAuthenticatedJson("/inquiries/submit", "POST", {
        athlete_id: currentAthlete.athlete_id,
        inquiry_type: "RECRUITMENT",
        message: `Coach submitted a scouting inquiry for ${currentAthlete.full_name}`,
      });
    } catch (err) {
      console.warn("Backend scouting inquiry error:", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Text style={styles.headerTitle}>ATHLETE PROFILE</Text>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={[styles.closeButton, { minWidth: 40, minHeight: 40, justifyContent: 'center', alignItems: 'center' }]}
        >
          <Ionicons name="close" size={26} color="#FFFFFF" />
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
          <Text style={styles.athleteNameText}>{(currentAthlete.full_name || 'ATHLETE').toUpperCase()}</Text>
          {currentAthlete.position_tag &&
            currentAthlete.position_tag.toUpperCase() !== (currentAthlete.sport_category || '').toUpperCase() && (
              <View style={styles.positionBadge}>
                <Text style={styles.positionBadgeText}>{currentAthlete.position_tag}</Text>
              </View>
            )}
        </View>

        {/* Location & Sport Subline */}
        <View style={styles.sublineRow}>
          <Text style={styles.sublineText}>
            #{currentAthlete.jersey_number || '2'} • {currentAthlete.team_name ? `Team: ${currentAthlete.team_name}` : `${currentAthlete.province || 'Camarines Sur'}, Bicol`}
          </Text>
          <View style={styles.sportTagBadge}>
            <Text style={styles.sportTagBadgeText}>{(currentAthlete.sport_category || 'BASKETBALL').toUpperCase()}</Text>
          </View>
        </View>

        {/* Current Team Affiliation Banner */}
        {currentAthlete.team_name ? (
          <View style={{
            backgroundColor: '#0F172A',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(0, 200, 255, 0.35)',
            padding: 12,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 200, 255, 0.12)', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={20} color="#00C8FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>CURRENT TEAM</Text>
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 1 }} numberOfLines={1}>{currentAthlete.team_name}</Text>
                {currentAthlete.coach_name ? (
                  <Text style={{ color: '#64748B', fontSize: 11, marginTop: 1 }}>Coach {currentAthlete.coach_name}</Text>
                ) : null}
              </View>
            </View>
            {currentAthlete.is_scouted && (
              <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ color: '#10B981', fontSize: 10, fontWeight: '800' }}>SCOUTED</Text>
              </View>
            )}
          </View>
        ) : currentAthlete.is_scouted ? (
          <View style={{
            backgroundColor: '#0F172A',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(0, 200, 255, 0.35)',
            padding: 12,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
            <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(0, 200, 255, 0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={20} color="#00C8FF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>SCOUTING STATUS</Text>
              <Text style={{ color: '#38BDF8', fontSize: 14, fontWeight: '800', marginTop: 1 }}>
                {currentAthlete.scout_status === 'ACCEPTED' ? 'OFFER ACCEPTED' : 'SCOUTED (PROPOSAL SENT)'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Biometrics Card */}
        <View style={styles.biometricsCard}>
          <View style={styles.biometricCol}>
            <Text style={styles.biometricLabel}>HEIGHT</Text>
            <Text style={styles.biometricValue}>{currentAthlete.biometrics?.height_ft || "6'2\""}</Text>
          </View>
          <View style={styles.biometricDivider} />
          <View style={styles.biometricCol}>
            <Text style={styles.biometricLabel}>WEIGHT</Text>
            <Text style={styles.biometricValue}>{currentAthlete.biometrics?.weight_lbs || "180 lbs"}</Text>
          </View>
          <View style={styles.biometricDivider} />
          <View style={styles.biometricCol}>
            <Text style={styles.biometricLabel}>WINGSPAN</Text>
            <Text style={styles.biometricValue}>{currentAthlete.biometrics?.wingspan_ft || "6'5\""}</Text>
          </View>
        </View>

        {/* Performance Analytics Section */}
        <Text style={styles.sectionTitle}>PERFORMANCE ANALYTICS</Text>
        <View style={styles.analyticsGrid}>
          {currentAthlete.sport_category === 'BASKETBALL' ? (
            <>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.ppg ?? 0}</Text>
                <Text style={styles.analyticLabel}>PPG</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.rpg ?? 0}</Text>
                <Text style={styles.analyticLabel}>RPG</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.ast ?? 0}</Text>
                <Text style={styles.analyticLabel}>AST</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.fg_pct ?? 0}%</Text>
                <Text style={styles.analyticLabel}>FG%</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 25}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
            </>
          ) : currentAthlete.sport_category === 'SWIMMING' ? (
            <>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats?.times_50m_free || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>50M FREE</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats?.times_100m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>100M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats?.times_200m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>200M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 25}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
            </>
          ) : currentAthlete.sport_category === 'TRACK AND FIELD' ? (
            <>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats?.times_100m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>100M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats?.times_200m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>200M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={[styles.analyticValue, { fontSize: 15 }]}>{currentAthlete.stats?.times_400m || 'N/A'}</Text>
                <Text style={styles.analyticLabel}>400M</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 25}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
            </>
          ) : currentAthlete.sport_category === 'VOLLEYBALL' ? (
            <>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.spike_kills ?? 0}</Text>
                <Text style={styles.analyticLabel}>KILLS</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.block_points ?? 0}</Text>
                <Text style={styles.analyticLabel}>BLOCKS</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.service_aces ?? 0}</Text>
                <Text style={styles.analyticLabel}>ACES</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 25}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
            </>
          ) : currentAthlete.sport_category === 'PICKLEBALL' ? (
            <>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.points_scored ?? 0}</Text>
                <Text style={styles.analyticLabel}>POINTS</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.aces ?? 0}</Text>
                <Text style={styles.analyticLabel}>ACES</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.dinks ?? 0}</Text>
                <Text style={styles.analyticLabel}>DINKS</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 25}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
            </>
          ) : (
            <>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.stats?.ppg ?? 0}</Text>
                <Text style={styles.analyticLabel}>PPG</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.calculated_per ?? 25}</Text>
                <Text style={styles.analyticLabel}>PER</Text>
              </View>
              <View style={styles.analyticBox}>
                <Text style={styles.analyticValue}>{currentAthlete.efficiency_pct ?? 75}%</Text>
                <Text style={styles.analyticLabel}>EFF</Text>
              </View>
            </>
          )}
        </View>

        {/* Efficiency Progress Bar */}
        <View style={styles.efficiencyContainer}>
          <View style={styles.efficiencyHeader}>
            <Text style={styles.efficiencyTitle}>EFFICIENCY</Text>
            <Text style={styles.efficiencyValueText}>{currentAthlete.efficiency_pct ?? 75}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${currentAthlete.efficiency_pct ?? 75}%` }]} />
          </View>
        </View>

        {/* Contact Information Card */}
        <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
        <View style={styles.contactCard}>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={18} color="#94A3B8" />
            <Text style={styles.contactText}>
              {currentAthlete.contact_info?.email || 'N/A'}
            </Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="logo-facebook" size={18} color="#94A3B8" />
            <Text style={styles.contactText}>{currentAthlete.contact_info?.facebook || currentAthlete.full_name || 'N/A'}</Text>
          </View>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={18} color="#94A3B8" />
            <Text style={styles.contactText}>{currentAthlete.contact_info?.phone || 'N/A'}</Text>
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

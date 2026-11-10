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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  extractVerticalLeapInches,
} from './playerBadgeEngine';
import { getCleanBiometrics } from './biometricsFormatter';

interface ScoutAthleteProps {
  onBack: () => void;
  athlete?: AthleteDiscoveryItem;
}

export const ScoutAthlete: React.FC<ScoutAthleteProps> = ({ onBack, athlete }) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;

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
      // Invalidate coach dashboard caches so returning to dashboard immediately displays fresh roster
      await AsyncStorage.removeItem('atleta_coach_dashboard_cache_v2').catch(() => null);
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

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 70 },
        ]}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Athlete Name & Status Badge */}
        <View style={styles.athleteNameRow}>
          <Text style={styles.athleteNameText}>{(currentAthlete.full_name || 'ATHLETE').toUpperCase()}</Text>
          {(() => {
            const isAthleteScouted = Boolean(
              currentAthlete.is_scouted ||
              (currentAthlete.team_name &&
                currentAthlete.team_name.trim().toLowerCase() !== 'unassigned' &&
                currentAthlete.team_name.trim().toLowerCase() !== 'none') ||
              (currentAthlete.team_id &&
                String(currentAthlete.team_id).trim() !== '' &&
                String(currentAthlete.team_id).trim().toLowerCase() !== 'none') ||
              (currentAthlete.has_coach && currentAthlete.coach_name) ||
              currentAthlete.scout_status
            );

            return (
              <View
                style={[
                  styles.positionBadge,
                  isAthleteScouted
                    ? { backgroundColor: 'rgba(0, 200, 255, 0.15)', borderColor: '#00C8FF' }
                    : { backgroundColor: 'rgba(148, 163, 184, 0.12)', borderColor: 'rgba(148, 163, 184, 0.3)' },
                ]}
              >
                <Text
                  style={[
                    styles.positionBadgeText,
                    isAthleteScouted ? { color: '#00C8FF' } : { color: '#94A3B8' },
                  ]}
                >
                  {isAthleteScouted ? 'SCOUTED' : 'UNASSIGNED'}
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Location Subline */}
        <View style={styles.sublineRow}>
          <Text style={styles.sublineText}>
            {currentAthlete.team_name ? `Team: ${currentAthlete.team_name}` : `${currentAthlete.province || 'Camarines Sur'}, Bicol`}
          </Text>
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

        {/* Clean Biometrics Card with Minimalist Icons & Standard Units */}
        {(() => {
          const cleanBio = getCleanBiometrics(currentAthlete);
          return (
            <View style={styles.biometricsCard}>
              <View style={styles.biometricCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Ionicons name="body-outline" size={12} color="#00C8FF" />
                  <Text style={styles.biometricLabel}>HEIGHT</Text>
                </View>
                <Text style={styles.biometricValue}>{cleanBio.height}</Text>
              </View>
              <View style={styles.biometricDivider} />
              <View style={styles.biometricCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Ionicons name="barbell-outline" size={12} color="#38BDF8" />
                  <Text style={styles.biometricLabel}>WEIGHT</Text>
                </View>
                <Text style={styles.biometricValue}>{cleanBio.weight}</Text>
              </View>
              <View style={styles.biometricDivider} />
              <View style={styles.biometricCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Ionicons name="resize-outline" size={12} color="#818CF8" />
                  <Text style={styles.biometricLabel}>WINGSPAN</Text>
                </View>
                <Text style={styles.biometricValue}>{cleanBio.wingspan}</Text>
              </View>
              <View style={styles.biometricDivider} />
              <View style={styles.biometricCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  <Ionicons name="arrow-up-circle-outline" size={12} color="#34D399" />
                  <Text style={styles.biometricLabel}>VERTICAL</Text>
                </View>
                <Text style={styles.biometricValue}>{cleanBio.vertical}</Text>
              </View>
            </View>
          );
        })()}

        {/* Performance Analytics Section */}
        <Text style={styles.sectionTitle}>PERFORMANCE ANALYTICS</Text>
        <View style={styles.analyticsGrid}>
          {(() => {
            const ca = currentAthlete as any;
            const sc = String(ca.sport_category || ca.sport_type || ca.sport || '').toUpperCase();
            if (sc.includes('BASKET')) {
              return (
                <>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.ppg ?? 0}</Text>
                    <Text style={styles.analyticLabel}>PPG</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.rpg ?? 0}</Text>
                    <Text style={styles.analyticLabel}>RPG</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.ast ?? 0}</Text>
                    <Text style={styles.analyticLabel}>AST</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.fg_pct ?? 0}%</Text>
                    <Text style={styles.analyticLabel}>FG%</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.calculated_per ?? 25}</Text>
                    <Text style={styles.analyticLabel}>PER</Text>
                  </View>
                </>
              );
            } else if (sc.includes('SWIM')) {
              return (
                <>
                  <View style={styles.analyticBox}>
                    <Text style={[styles.analyticValue, { fontSize: 15 }]}>{ca.stats?.times_50m_free || ca.averages?.pb_50m_free || 'N/A'}</Text>
                    <Text style={styles.analyticLabel}>50M FREE</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={[styles.analyticValue, { fontSize: 15 }]}>{ca.stats?.times_100m || ca.averages?.pb_100m_free || 'N/A'}</Text>
                    <Text style={styles.analyticLabel}>100M</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={[styles.analyticValue, { fontSize: 15 }]}>{ca.stats?.times_200m || 'N/A'}</Text>
                    <Text style={styles.analyticLabel}>200M</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.averages?.swim_index_score ? String(ca.averages.swim_index_score) : (ca.stats?.swim_index ? String(ca.stats.swim_index) : '-')}</Text>
                    <Text style={styles.analyticLabel}>SWIM INDEX</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.averages?.podiums_count !== undefined ? String(ca.averages.podiums_count) : (ca.stats?.podiums !== undefined ? String(ca.stats.podiums) : '0')}</Text>
                    <Text style={styles.analyticLabel}>PODIUMS</Text>
                  </View>
                </>
              );
            } else if (sc.includes('TRACK') || sc.includes('FIELD')) {
              return (
                <>
                  <View style={styles.analyticBox}>
                    <Text style={[styles.analyticValue, { fontSize: 15 }]}>{ca.stats?.times_100m || ca.averages?.pb_100m || 'N/A'}</Text>
                    <Text style={styles.analyticLabel}>100M</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={[styles.analyticValue, { fontSize: 15 }]}>{ca.stats?.times_200m || ca.averages?.pb_200m || 'N/A'}</Text>
                    <Text style={styles.analyticLabel}>200M</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={[styles.analyticValue, { fontSize: 15 }]}>{ca.stats?.times_400m || 'N/A'}</Text>
                    <Text style={styles.analyticLabel}>400M</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.averages?.reaction_time_s || ca.stats?.reaction_time || '-'}</Text>
                    <Text style={styles.analyticLabel}>REACTION</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.averages?.win_rate_pct !== undefined ? `${ca.averages.win_rate_pct}%` : (ca.stats?.win_rate_pct !== undefined ? `${ca.stats.win_rate_pct}%` : `${ca.efficiency_pct ?? 75}%`)}</Text>
                    <Text style={styles.analyticLabel}>WIN %</Text>
                  </View>
                </>
              );
            } else if (sc.includes('VOLLEY')) {
              const vKills = ca.stats?.kills ?? ca.stats?.spike_kills ?? ca.averages?.kills ?? ca.averages?.spike_kills ?? 0;
              const vBlocks = ca.stats?.blocks ?? ca.stats?.block_points ?? ca.averages?.blocks ?? ca.averages?.block_points ?? 0;
              const vAces = ca.stats?.aces ?? ca.stats?.service_aces ?? ca.averages?.aces ?? ca.averages?.service_aces ?? 0;
              const vDigs = ca.stats?.digs ?? ca.averages?.digs ?? 0;
              const vAcc = ca.averages?.spike_accuracy ?? ca.stats?.spike_accuracy;

              return (
                <>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{vKills}</Text>
                    <Text style={styles.analyticLabel}>KILLS</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{vBlocks}</Text>
                    <Text style={styles.analyticLabel}>BLOCKS</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{vAces}</Text>
                    <Text style={styles.analyticLabel}>ACES</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{vDigs}</Text>
                    <Text style={styles.analyticLabel}>DIGS</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{vAcc !== undefined && vAcc !== null ? `${vAcc}%` : `${ca.efficiency_pct ?? 75}%`}</Text>
                    <Text style={styles.analyticLabel}>{vAcc !== undefined && vAcc !== null ? 'ACC %' : 'EFF'}</Text>
                  </View>
                </>
              );
            } else if (sc.includes('PICKLE')) {
              return (
                <>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.points_scored ?? 0}</Text>
                    <Text style={styles.analyticLabel}>POINTS</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.aces ?? 0}</Text>
                    <Text style={styles.analyticLabel}>ACES</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.dinks ?? 0}</Text>
                    <Text style={styles.analyticLabel}>DINKS</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.smashes ?? 0}</Text>
                    <Text style={styles.analyticLabel}>SMASHES</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.efficiency_pct ?? 75}%</Text>
                    <Text style={styles.analyticLabel}>EFF</Text>
                  </View>
                </>
              );
            } else {
              return (
                <>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.games_played ?? ca.averages?.games_played ?? 0}</Text>
                    <Text style={styles.analyticLabel}>GP</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.stats?.wins ?? ca.averages?.wins ?? 0}</Text>
                    <Text style={styles.analyticLabel}>WINS</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.rating_score || '-'}</Text>
                    <Text style={styles.analyticLabel}>RATING</Text>
                  </View>
                  <View style={styles.analyticBox}>
                    <Text style={styles.analyticValue}>{ca.efficiency_pct ?? 75}%</Text>
                    <Text style={styles.analyticLabel}>EFF</Text>
                  </View>
                </>
              );
            }
          })()}
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

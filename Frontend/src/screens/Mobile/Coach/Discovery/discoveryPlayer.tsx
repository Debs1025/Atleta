import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscovery } from './DiscoveryContext';
import { styles } from './styles/discoveryMain';
import { AthleteDiscoveryItem } from './discoveryTypes';
import { RankingPage } from './ranking';
import { RecruitsPage } from './recruits';
import { SkeletonDiscoveryCards } from '../Components/AtletaLoadingIndicator';

import {
  PlayerStatsBadge,
  computePlayerArchetypeBadges,
  extractVerticalLeapInches,
} from './playerBadgeEngine';
import { getCleanBiometrics } from './biometricsFormatter';

export const DiscoveryPlayer: React.FC<{
  mode: 'feed' | 'rankings' | 'recruits';
  onCloseSubView: () => void;
}> = ({ mode, onCloseSubView }) => {
  const insets = useSafeAreaInsets();
  const {
    filteredAthletes,
    setSelectedAthlete,
    isLoading,
  } = useDiscovery();

  const [selectedBadgeModalAthlete, setSelectedBadgeModalAthlete] = useState<AthleteDiscoveryItem | null>(null);
  const [modalBadges, setModalBadges] = useState<PlayerStatsBadge[]>([]);

  const handleOpenAthlete = (athlete: AthleteDiscoveryItem) => {
    setSelectedAthlete(athlete);
  };

  const handleOpenBadgesModal = (athlete: AthleteDiscoveryItem, badges: PlayerStatsBadge[]) => {
    setSelectedBadgeModalAthlete(athlete);
    setModalBadges(badges);
  };

  const handleCloseBadgesModal = () => {
    setSelectedBadgeModalAthlete(null);
    setModalBadges([]);
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

  const modalPrimaryBadge = modalBadges.length > 0 ? modalBadges[0] : null;
  const modalSecondaryBadges = modalBadges.length > 1 ? modalBadges.slice(1) : [];
  const modalSkills = selectedBadgeModalAthlete?.specialties || selectedBadgeModalAthlete?.excel_tags || [];

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

            // Dynamically evaluate badges from actual performance stats (sorted by dominant playstyle)
            const archetypeBadges = computePlayerArchetypeBadges(athlete);
            const verticalIn = extractVerticalLeapInches(athlete);
            const primaryBadge = archetypeBadges.length > 0 ? archetypeBadges[0] : null;
            const secondaryBadgesCount = archetypeBadges.length > 1 ? archetypeBadges.length - 1 : 0;
            const cleanBio = getCleanBiometrics(athlete);

            return (
              <TouchableOpacity
                key={athlete.athlete_id}
                style={styles.athleteCard}
                onPress={() => handleOpenAthlete(athlete)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 8 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }}>
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

                        {/* Primary Dominant Badge (No raw numbers) & Compact "+ More" Action */}
                        {primaryBadge && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: primaryBadge.bgColor,
                                borderColor: primaryBadge.borderColor,
                                borderWidth: 1,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                                borderRadius: 4,
                                gap: 3.5,
                              }}
                            >
                              <Ionicons name={primaryBadge.icon as any} size={10} color={primaryBadge.color} />
                              <Text style={{ color: primaryBadge.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>
                                {primaryBadge.label.toUpperCase()}
                              </Text>
                            </View>

                            {/* Compact "+ More" Pill Button */}
                            {secondaryBadgesCount > 0 && (
                              <TouchableOpacity
                                style={modalStyles.morePill}
                                onPress={(e) => {
                                  e.stopPropagation?.();
                                  handleOpenBadgesModal(athlete, archetypeBadges);
                                }}
                                activeOpacity={0.7}
                                accessibilityLabel={`View ${secondaryBadgesCount} more badges`}
                              >
                                <Ionicons name="add" size={10} color="#00C8FF" />
                                <Text style={modalStyles.morePillText}>
                                  {secondaryBadgesCount} More
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <View style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)', borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '800' }}>
                            #{athlete.jersey_number || '0'}
                          </Text>
                        </View>
                        {currentTeam ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                            <Ionicons name="shield-checkmark" size={12} color="#38BDF8" />
                            <Text style={{ color: '#38BDF8', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                              {currentTeam}
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#94A3B8', fontSize: 12 }} numberOfLines={1}>
                            {athlete.province || 'Camarines Sur'}, Bicol
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.tagChip}>
                    <Text style={styles.tagChipText}>{positionTag}</Text>
                  </View>
                </View>

                {/* Clean Biometrics Strip with Minimalist Icons & Standard Units */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  borderColor: 'rgba(255, 255, 255, 0.07)',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 8,
                  justifyContent: 'space-between',
                }}>
                  {/* Height */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="body-outline" size={12} color="#00C8FF" />
                    <Text style={{ color: '#F1F5F9', fontSize: 11, fontWeight: '700', letterSpacing: 0.1 }}>
                      {cleanBio.height}
                    </Text>
                  </View>

                  <View style={{ width: 1, height: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

                  {/* Weight */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="barbell-outline" size={12} color="#38BDF8" />
                    <Text style={{ color: '#F1F5F9', fontSize: 11, fontWeight: '700', letterSpacing: 0.1 }}>
                      {cleanBio.weight}
                    </Text>
                  </View>

                  <View style={{ width: 1, height: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

                  {/* Wingspan */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="resize-outline" size={12} color="#818CF8" />
                    <Text style={{ color: '#F1F5F9', fontSize: 11, fontWeight: '700', letterSpacing: 0.1 }}>
                      {cleanBio.wingspan}
                    </Text>
                  </View>

                  {cleanBio.vertical !== '-' && (
                    <>
                      <View style={{ width: 1, height: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
                      {/* Vertical Leap */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="arrow-up-circle-outline" size={12} color="#34D399" />
                        <Text style={{ color: '#F1F5F9', fontSize: 11, fontWeight: '700', letterSpacing: 0.1 }}>
                          {cleanBio.vertical}
                        </Text>
                      </View>
                    </>
                  )}
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

      {/* ATHLETE BADGES & SKILLS DETAIL BOTTOM SHEET MODAL */}
      <Modal
        visible={!!selectedBadgeModalAthlete}
        transparent
        animationType="slide"
        onRequestClose={handleCloseBadgesModal}
      >
        <View style={modalStyles.backdrop}>
          <TouchableOpacity
            style={modalStyles.backdropTouchable}
            activeOpacity={1}
            onPress={handleCloseBadgesModal}
          />
          <View style={[modalStyles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            {/* Top Sheet Drag Indicator Pill */}
            <View style={modalStyles.dragPillWrapper}>
              <View style={modalStyles.dragPill} />
            </View>

            {/* Modal Header */}
            <View style={modalStyles.sheetHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={modalStyles.athleteTitle}>{selectedBadgeModalAthlete?.full_name}</Text>
                  <View style={modalStyles.positionChip}>
                    <Text style={modalStyles.positionChipText}>
                      {selectedBadgeModalAthlete?.position_tag || 'ATHLETE'}
                    </Text>
                  </View>
                  {selectedBadgeModalAthlete?.jersey_number && (
                    <View style={modalStyles.jerseyChip}>
                      <Text style={modalStyles.jerseyNumberText}>
                        #{selectedBadgeModalAthlete.jersey_number}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={modalStyles.athleteSub}>
                  {selectedBadgeModalAthlete?.team_name || selectedBadgeModalAthlete?.province || 'Camarines Sur, Region V'} • {selectedBadgeModalAthlete?.sport_category || 'Basketball'}
                </Text>
              </View>

              <TouchableOpacity
                style={modalStyles.closeBtn}
                onPress={handleCloseBadgesModal}
                activeOpacity={0.7}
                accessibilityLabel="Close badge details"
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Badges & Skills Content */}
            <ScrollView
              style={modalStyles.scrollBody}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* PRIMARY ARCHETYPE SECTION */}
              {modalPrimaryBadge && (
                <View style={modalStyles.sectionBox}>
                  <View style={modalStyles.sectionHeaderRow}>
                    <Ionicons name="ribbon" size={14} color="#00C8FF" />
                    <Text style={modalStyles.sectionHeadingText}>PRIMARY DOMINANT ARCHETYPE</Text>
                  </View>

                  <View
                    style={[
                      modalStyles.badgeDetailCard,
                      { borderColor: modalPrimaryBadge.borderColor, backgroundColor: modalPrimaryBadge.bgColor },
                    ]}
                  >
                    <View style={modalStyles.badgeDetailTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={[modalStyles.badgeIconBox, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                          <Ionicons name={modalPrimaryBadge.icon as any} size={18} color={modalPrimaryBadge.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={[modalStyles.badgeDetailTitle, { color: modalPrimaryBadge.color }]}>
                              {modalPrimaryBadge.label}
                            </Text>
                            <View style={modalStyles.dominantTagPill}>
                              <Text style={modalStyles.dominantTagText}>DOMINANT</Text>
                            </View>
                          </View>
                          <Text style={modalStyles.badgeCategoryText}>
                            {modalPrimaryBadge.category.toUpperCase()} SPECIALTY
                          </Text>
                        </View>
                      </View>

                      {modalPrimaryBadge.metricProof ? (
                        <View style={modalStyles.proofPill}>
                          <Text style={modalStyles.proofPillText}>{modalPrimaryBadge.metricProof}</Text>
                        </View>
                      ) : null}
                    </View>

                    {modalPrimaryBadge.description ? (
                      <Text style={modalStyles.badgeDescText}>{modalPrimaryBadge.description}</Text>
                    ) : null}
                  </View>
                </View>
              )}

              {/* SECONDARY BADGES SECTION */}
              <View style={modalStyles.sectionBox}>
                <View style={modalStyles.sectionHeaderRow}>
                  <Ionicons name="sparkles" size={14} color="#38BDF8" />
                  <Text style={modalStyles.sectionHeadingText}>
                    SECONDARY VERIFIED BADGES ({modalSecondaryBadges.length})
                  </Text>
                </View>

                {modalSecondaryBadges.length > 0 ? (
                  <View style={{ gap: 10 }}>
                    {modalSecondaryBadges.map((badge) => (
                      <View
                        key={badge.id}
                        style={[
                          modalStyles.badgeDetailCard,
                          { borderColor: badge.borderColor, backgroundColor: badge.bgColor },
                        ]}
                      >
                        <View style={modalStyles.badgeDetailTopRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={[modalStyles.badgeIconBox, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                              <Ionicons name={badge.icon as any} size={16} color={badge.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[modalStyles.badgeDetailTitle, { color: badge.color }]}>
                                {badge.label}
                              </Text>
                              <Text style={modalStyles.badgeCategoryText}>
                                {badge.category.toUpperCase()}
                              </Text>
                            </View>
                          </View>

                          {badge.metricProof ? (
                            <View style={modalStyles.proofPill}>
                              <Text style={modalStyles.proofPillText}>{badge.metricProof}</Text>
                            </View>
                          ) : null}
                        </View>

                        {badge.description ? (
                          <Text style={modalStyles.badgeDescText}>{badge.description}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={modalStyles.emptySecondaryBox}>
                    <Text style={modalStyles.emptySecondaryText}>
                      No secondary badges unlocked yet. Additional badges unlock dynamically as game logs and combine results are recorded.
                    </Text>
                  </View>
                )}
              </View>

              {/* ATHLETE SKILLS & ATTRIBUTES SECTION */}
              <View style={modalStyles.sectionBox}>
                <View style={modalStyles.sectionHeaderRow}>
                  <Ionicons name="fitness" size={14} color="#10B981" />
                  <Text style={modalStyles.sectionHeadingText}>COMBINE SKILLS & ATTRIBUTES</Text>
                </View>

                <View style={modalStyles.skillsWrap}>
                  {(() => {
                    const cleanModalBio = selectedBadgeModalAthlete ? getCleanBiometrics(selectedBadgeModalAthlete) : null;
                    if (!cleanModalBio) return null;
                    return (
                      <>
                        {cleanModalBio.height !== '-' && (
                          <View style={modalStyles.skillChip}>
                            <Ionicons name="body-outline" size={12} color="#00C8FF" />
                            <Text style={modalStyles.skillChipText}>
                              {cleanModalBio.height}
                            </Text>
                          </View>
                        )}
                        {cleanModalBio.weight !== '-' && (
                          <View style={modalStyles.skillChip}>
                            <Ionicons name="barbell-outline" size={12} color="#38BDF8" />
                            <Text style={modalStyles.skillChipText}>
                              {cleanModalBio.weight}
                            </Text>
                          </View>
                        )}
                        {cleanModalBio.wingspan !== '-' && (
                          <View style={modalStyles.skillChip}>
                            <Ionicons name="resize-outline" size={12} color="#818CF8" />
                            <Text style={modalStyles.skillChipText}>
                              {cleanModalBio.wingspan}
                            </Text>
                          </View>
                        )}
                        {cleanModalBio.vertical !== '-' && (
                          <View style={modalStyles.skillChip}>
                            <Ionicons name="arrow-up-circle-outline" size={12} color="#34D399" />
                            <Text style={modalStyles.skillChipText}>
                              {cleanModalBio.vertical}
                            </Text>
                          </View>
                        )}
                      </>
                    );
                  })()}
                  {selectedBadgeModalAthlete?.calculated_per ? (
                    <View style={modalStyles.skillChip}>
                      <Ionicons name="speedometer" size={11} color="#A855F7" />
                      <Text style={modalStyles.skillChipText}>
                        PER: {selectedBadgeModalAthlete.calculated_per}
                      </Text>
                    </View>
                  ) : null}

                  {modalSkills.map((skill, sIdx) => (
                    <View key={`sk_${sIdx}`} style={modalStyles.skillChip}>
                      <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                      <Text style={modalStyles.skillChipText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* View Full Profile Action Button */}
              <TouchableOpacity
                style={modalStyles.fullProfileBtn}
                onPress={() => {
                  if (selectedBadgeModalAthlete) {
                    const ath = selectedBadgeModalAthlete;
                    handleCloseBadgesModal();
                    handleOpenAthlete(ath);
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={modalStyles.fullProfileBtnText}>VIEW FULL ATHLETE DOSSIER</Text>
                <Ionicons name="arrow-forward" size={16} color="#070D19" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const modalStyles = StyleSheet.create({
  morePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 200, 255, 0.12)',
    borderColor: 'rgba(0, 200, 255, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  morePillText: {
    color: '#00C8FF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#0B1528',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    maxHeight: '82%',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  dragPillWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  athleteTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  positionChip: {
    backgroundColor: 'rgba(0, 200, 255, 0.12)',
    borderColor: '#00C8FF',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  positionChipText: {
    color: '#00C8FF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  jerseyChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  jerseyNumberText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  athleteSub: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flexGrow: 0,
  },
  sectionBox: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeadingText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  badgeDetailCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  badgeDetailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDetailTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dominantTagPill: {
    backgroundColor: 'rgba(0, 200, 255, 0.2)',
    borderColor: '#00C8FF',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 0.5,
    borderRadius: 3,
  },
  dominantTagText: {
    color: '#00C8FF',
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badgeCategoryText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  proofPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  proofPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeDescText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 8,
  },
  emptySecondaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 12,
  },
  emptySecondaryText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
  },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  skillChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  fullProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00C8FF',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  fullProfileBtnText: {
    color: '#070D19',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});

export default DiscoveryPlayer;

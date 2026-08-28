import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestAuthenticatedJson } from '../../Authentication/authShared';

export interface AthleteDetails {
  athlete_id: string;
  full_name: string;
  sport_category: string;
  province: string;
  position_tag: string;
  jersey_number: string;
  height: string;
  weight: string;
  wingspan: string;
  stats: {
    ppg?: number;
    rpg?: number;
    ast?: number;
    fg_pct?: number;
    times_100m?: string;
    times_200m?: string;
    times_50m_free?: string;
  };
  contact_info: {
    email: string;
    phone: string;
    facebook: string;
  };
  avatar_url?: string;
}

export interface InquiryNotificationItem {
  id: string;
  athlete_id: string;
  athlete_name: string;
  sport_category: string;
  message: string;
  date_formatted: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  athleteDetails?: AthleteDetails;
}

interface CoachNotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CoachNotificationModal({ visible, onClose }: CoachNotificationModalProps) {
  const insets = useSafeAreaInsets();
  const [inquiries, setInquiries] = useState<InquiryNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteDetails | null>(null);
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);

  const fetchInquiries = async () => {
    try {
      setIsLoading(true);
      const [inqRes, propRes, athletesRes]: [any, any, any] = await Promise.all([
        requestAuthenticatedJson('/inquiries').catch(() => null),
        requestAuthenticatedJson('/scouting/proposals').catch(() => null),
        requestAuthenticatedJson('/scouting/athletes').catch(() => null),
      ]);

      const rawInq = inqRes?.inquiries || (Array.isArray(inqRes) ? inqRes : []);
      const rawProp = propRes?.proposals || (Array.isArray(propRes) ? propRes : []);
      const rawAthletes = athletesRes?.athletes || (Array.isArray(athletesRes) ? athletesRes : athletesRes?.data || []);

      // Build quick lookup map by ID and name
      const athletesMap = new Map<string, any>();
      if (Array.isArray(rawAthletes)) {
        rawAthletes.forEach((a: any) => {
          const id = a.athlete_id || a.user_id || a.id;
          if (id) athletesMap.set(String(id).toLowerCase(), a);
          const nameKey = (a.full_name || a.name || `${a.first_name || ''} ${a.last_name || ''}`).trim().toLowerCase();
          if (nameKey) athletesMap.set(nameKey, a);
        });
      }

      const combined = [...rawInq, ...rawProp];

      if (combined.length > 0) {
        const mapped: InquiryNotificationItem[] = combined.map((item: any, idx: number) => {
          const rawStatus = (item.offer_status || item.status || 'PENDING').toUpperCase();
          const status: 'PENDING' | 'ACCEPTED' | 'DECLINED' = rawStatus.includes('ACCEPT')
            ? 'ACCEPTED'
            : rawStatus.includes('DECLIN')
            ? 'DECLINED'
            : 'PENDING';

          const athId = String(item.athlete_id || item.sender_id || item.user_id || item.id || '').toLowerCase();
          const athNameRaw = (item.athlete_name || item.sender_name || item.name || '').trim();
          const athNameKey = athNameRaw.toLowerCase();

          const foundAth = athletesMap.get(athId) || (athNameKey ? athletesMap.get(athNameKey) : null);

          const realFullName = foundAth
            ? (foundAth.full_name || foundAth.name || `${foundAth.first_name || ''} ${foundAth.last_name || ''}`).trim()
            : athNameRaw || 'Prospect Athlete';

          const sportCat = (item.sport_category || item.sport_type || foundAth?.sport_category || foundAth?.sport || 'BASKETBALL').toUpperCase();
          const rawSport = (foundAth?.sport_type || foundAth?.sport_category || sportCat).toUpperCase();

          const athleteDetails: AthleteDetails = {
            athlete_id: athId || `ath_${idx}`,
            full_name: realFullName,
            sport_category: rawSport.includes('SWIM') ? 'SWIMMING' : rawSport.includes('TRACK') ? 'TRACK AND FIELD' : 'BASKETBALL',
            province: foundAth?.province || foundAth?.location || foundAth?.city || item.province || item.location || '',
            position_tag: (foundAth?.primary_position || foundAth?.position || item.position || (rawSport.includes('SWIM') ? 'SWIM' : rawSport.includes('TRACK') ? 'TRACK' : 'ATHLETE')).toUpperCase(),
            jersey_number: foundAth?.jersey_number !== undefined ? String(foundAth.jersey_number) : (item.jersey_number !== undefined ? String(item.jersey_number) : ''),
            height: foundAth?.biometrics?.height_ft || foundAth?.height || item.height || '',
            weight: foundAth?.biometrics?.weight_lbs || foundAth?.weight || item.weight || '',
            wingspan: foundAth?.biometrics?.wingspan_ft || foundAth?.wingspan || item.wingspan || '',
            stats: {
              ppg: Number(foundAth?.stats?.ppg ?? foundAth?.ppg ?? item.ppg ?? 0),
              rpg: Number(foundAth?.stats?.rpg ?? foundAth?.rpg ?? item.rpg ?? 0),
              ast: Number(foundAth?.stats?.ast ?? foundAth?.ast ?? item.ast ?? 0),
              fg_pct: Number(foundAth?.stats?.fg_pct ?? foundAth?.fg_pct ?? item.fg_pct ?? 0),
              times_100m: foundAth?.stats?.times_100m || item.times_100m || '',
              times_200m: foundAth?.stats?.times_200m || item.times_200m || '',
              times_50m_free: foundAth?.stats?.times_50m_free || item.times_50m_free || '',
            },
            contact_info: {
              email: foundAth?.email || foundAth?.contact_info?.email || item.email || '',
              facebook: foundAth?.facebook || foundAth?.contact_info?.facebook || item.facebook || '',
              phone: foundAth?.phone || foundAth?.contact_info?.phone || item.phone || '',
            },
            avatar_url: foundAth?.avatar_url || foundAth?.profile_image,
          };

          return {
            id: item.inquiry_id || item.scout_id || item.id || `inq_${idx}`,
            athlete_id: athId,
            athlete_name: realFullName,
            sport_category: athleteDetails.sport_category,
            message: item.message || item.offer_message || `Athlete interested in joining recruitment discussion and team roster.`,
            date_formatted: item.date_initiated
              ? new Date(item.date_initiated).toLocaleDateString()
              : item.created_at || 'Recently',
            status,
            athleteDetails,
          };
        });
        setInquiries(mapped);
      }
    } catch (err) {
      console.log('Error loading coach notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchInquiries();
    }
  }, [visible]);

  const handleRespond = async (inquiryId: string, responseStatus: 'ACCEPTED' | 'DECLINED') => {
    setInquiries((prev) =>
      prev.map((item) => (item.id === inquiryId ? { ...item, status: responseStatus } : item))
    );

    const titleCaseStatus = responseStatus === 'ACCEPTED' ? 'Accepted' : 'Declined';

    await Promise.all([
      requestAuthenticatedJson(`/inquiries/${inquiryId}/respond`, 'PATCH', {
        status: titleCaseStatus,
        response_status: titleCaseStatus,
        offer_status: titleCaseStatus,
      }).catch(() => null),
      requestAuthenticatedJson(`/inquiries/${inquiryId}/respond`, 'POST', {
        status: titleCaseStatus,
        response_status: titleCaseStatus,
        offer_status: titleCaseStatus,
      }).catch(() => null),
      requestAuthenticatedJson(`/inquiries/${inquiryId}`, 'PATCH', {
        status: titleCaseStatus,
        offer_status: titleCaseStatus,
      }).catch(() => null),
      requestAuthenticatedJson(`/scouting/proposals/${inquiryId}`, 'PATCH', {
        offer_status: titleCaseStatus,
        status: titleCaseStatus,
      }).catch(() => null),
    ]);
  };

  const headerTopPadding = Math.max(insets.top - 6, 12);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* FIXED TOP HEADER */}
        <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>NOTIFICATION</Text>
          </View>
        </View>

        <View style={[styles.content, { paddingTop: headerTopPadding + 72 }]}>
          {isLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#00C8FF" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {inquiries.length > 0 ? (
                inquiries.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={styles.avatar}>
                          <Ionicons name="person" size={16} color="#00C8FF" />
                        </View>
                        <View>
                          <Text style={styles.athleteName}>{item.athlete_name}</Text>
                          <Text style={styles.sportText}>{item.sport_category}</Text>
                        </View>
                      </View>
                      <Text style={styles.dateText}>{item.date_formatted}</Text>
                    </View>

                    <Text style={styles.messageText}>{item.message}</Text>

                    {/* View Profile Button */}
                    {item.athleteDetails && item.status === 'PENDING' && (
                      <TouchableOpacity
                        style={styles.viewProfileBtn}
                        onPress={() => {
                          setSelectedAthlete(item.athleteDetails || null);
                          setSelectedInquiryId(item.id);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="person-circle-outline" size={16} color="#00C8FF" />
                        <Text style={styles.viewProfileBtnText}>VIEW ATHLETE PROFILE</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.actionRow}>
                      {item.status === 'PENDING' ? (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                            onPress={() => handleRespond(item.id, 'ACCEPTED')}
                          >
                            <Text style={styles.actionBtnText}>ACCEPT INQUIRY</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                            onPress={() => handleRespond(item.id, 'DECLINED')}
                          >
                            <Text style={styles.actionBtnText}>DECLINE</Text>
                          </TouchableOpacity>
                        </>
                      ) : item.status === 'ACCEPTED' ? (
                        <View style={styles.acceptedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={styles.acceptedText}>ACCEPTED</Text>
                        </View>
                      ) : (
                        <View style={styles.declinedBadge}>
                          <Ionicons name="close-circle" size={14} color="#EF4444" />
                          <Text style={styles.declinedText}>DECLINED</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="mail-open-outline" size={38} color="#64748B" />
                  <Text style={styles.emptyText}>No athlete inquiries found</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* ATHLETE PROFILE DETAILS MODAL */}
      <Modal visible={!!selectedAthlete} transparent animationType="slide" onRequestClose={() => setSelectedAthlete(null)}>
        {selectedAthlete && (
          <View style={styles.overlay}>
            <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setSelectedAthlete(null)} activeOpacity={0.7}>
                  <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ATHLETE PROFILE</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingTop: headerTopPadding + 64, paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="person" size={36} color="#00C8FF" />
                </View>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>{selectedAthlete.full_name}</Text>
                <Text style={{ color: '#00C8FF', fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                  #{selectedAthlete.jersey_number} • {selectedAthlete.position_tag} • {selectedAthlete.sport_category}
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 2 }}>{selectedAthlete.province}</Text>
              </View>

              {/* Biometrics Card */}
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>BIOMETRICS</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
                  <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>HEIGHT</Text><Text style={styles.bioVal}>{selectedAthlete.height}</Text></View>
                  <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>WEIGHT</Text><Text style={styles.bioVal}>{selectedAthlete.weight}</Text></View>
                  <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>WINGSPAN</Text><Text style={styles.bioVal}>{selectedAthlete.wingspan}</Text></View>
                </View>
              </View>

              {/* Performance Stats Card */}
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>STATISTICS</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
                  {selectedAthlete.sport_category === 'BASKETBALL' ? (
                    <>
                      <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>PPG</Text><Text style={styles.bioVal}>{selectedAthlete.stats.ppg}</Text></View>
                      <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>RPG</Text><Text style={styles.bioVal}>{selectedAthlete.stats.rpg}</Text></View>
                      <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>AST</Text><Text style={styles.bioVal}>{selectedAthlete.stats.ast}</Text></View>
                      <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>FG%</Text><Text style={styles.bioVal}>{selectedAthlete.stats.fg_pct}%</Text></View>
                    </>
                  ) : selectedAthlete.sport_category === 'SWIMMING' ? (
                    <>
                      <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>50M FREE</Text><Text style={styles.bioVal}>{selectedAthlete.stats.times_50m_free}</Text></View>
                      <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>100M</Text><Text style={styles.bioVal}>{selectedAthlete.stats.times_100m}</Text></View>
                    </>
                  ) : (
                    <>
                      <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>100M</Text><Text style={styles.bioVal}>{selectedAthlete.stats.times_100m}</Text></View>
                      <View style={{ alignItems: 'center' }}><Text style={styles.bioLabel}>200M</Text><Text style={styles.bioVal}>{selectedAthlete.stats.times_200m}</Text></View>
                    </>
                  )}
                </View>
              </View>

              {/* Contact Information */}
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>CONTACT INFORMATION</Text>
                <View style={{ gap: 8, marginTop: 10 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 13 }}>📧 Email: {selectedAthlete.contact_info.email}</Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 13 }}>📞 Phone: {selectedAthlete.contact_info.phone}</Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 13 }}>🌐 Facebook: {selectedAthlete.contact_info.facebook}</Text>
                </View>
              </View>

              {/* Inquiry Respond Actions */}
              {selectedInquiryId && (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#10B981', paddingVertical: 14 }]}
                    onPress={() => {
                      handleRespond(selectedInquiryId, 'ACCEPTED');
                      setSelectedAthlete(null);
                    }}
                  >
                    <Text style={styles.actionBtnText}>ACCEPT INQUIRY</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#EF4444', paddingVertical: 14 }]}
                    onPress={() => {
                      handleRespond(selectedInquiryId, 'DECLINED');
                      setSelectedAthlete(null);
                    }}
                  >
                    <Text style={styles.actionBtnText}>DECLINE</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#070D19',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fixedHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#070D19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  athleteName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  sportText: {
    color: '#00C8FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  dateText: {
    color: '#64748B',
    fontSize: 11,
  },
  messageText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 14,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 255, 0.3)',
  },
  viewProfileBtnText: {
    color: '#00C8FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  declinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  declinedText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  detailCardTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bioLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  bioVal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
});

export default CoachNotificationModal;

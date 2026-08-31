import React, { useMemo } from 'react';
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

  // Group match players by their respective team
  const { team1List, team2List } = useMemo(() => {
    const rawList = currentMatch?.player_stats || [];
    const t1 = (currentMatch?.team1_name || '').toLowerCase().trim();
    const t2 = (currentMatch?.team2_name || '').toLowerCase().trim();

    const group1: typeof rawList = [];
    const group2: typeof rawList = [];

    rawList.forEach((p, idx) => {
      const pTeam = ((p as any).role_team || (p as any).team_name || (p as any).team || '').toLowerCase().trim();
      if (t1 && (pTeam.includes(t1) || t1.includes(pTeam))) {
        group1.push(p);
      } else if (t2 && (pTeam.includes(t2) || t2.includes(pTeam))) {
        group2.push(p);
      } else if (idx < Math.ceil(rawList.length / 2)) {
        group1.push(p);
      } else {
        group2.push(p);
      }
    });

    return { team1List: group1, team2List: group2 };
  }, [currentMatch]);

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

  // Sport Type & Outcome
  const isTimeSport =
    currentMatch.sport_category === 'SWIMMING' ||
    currentMatch.sport_category === 'TRACK AND FIELD';

  // Scores and Win/Loss / Rank Outcome
  const score1 = Number(currentMatch.team1_score ?? 0);
  const score2 = Number(currentMatch.team2_score ?? 0);
  const team1Won = score1 >= score2;
  const team2Won = score2 > score1;

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // SAMPLE DATA FALLBACK: If backend record intensity spikes array is pending
  const dynamicsData = currentMatch.dynamics_data || [40, 65, 88, 70, 95, 82, 90, 60];

  const renderPlayerRow = (row: any, idx: number, isLast: boolean, overallRank?: number) => {
    const rankNum = overallRank ?? idx + 1;
    const rankLabel = isTimeSport ? getOrdinal(rankNum) : String(idx + 1);

    const isPodium1 = rankNum === 1;
    const isPodium2 = rankNum === 2;
    const isPodium3 = rankNum === 3;

    return (
      <TouchableOpacity
        key={idx}
        style={[
          styles.tableRow,
          { borderBottomWidth: isLast ? 0 : 1 },
        ]}
        onPress={() => handleSelectPlayer(row.player)}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: 170 }}>
          <View style={[
            styles.playerBadge,
            isTimeSport && isPodium1
              ? styles.rankBadge1st
              : isTimeSport && isPodium2
              ? styles.rankBadge2nd
              : isTimeSport && isPodium3
              ? styles.rankBadge3rd
              : null
          ]}>
            <Text style={[
              { fontSize: isTimeSport ? 10 : 11, fontWeight: '900' },
              isTimeSport && isPodium1
                ? styles.rankText1st
                : isTimeSport && isPodium2
                ? styles.rankText2nd
                : isTimeSport && isPodium3
                ? styles.rankText3rd
                : { color: '#00C8FF' }
            ]}>
              {rankLabel}
            </Text>
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
    );
  };

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
            {isTimeSport ? (
              <View style={[
                styles.teamIconBox,
                team1Won ? styles.outcomeBadge1st : styles.outcomeBadge2nd
              ]}>
                {team1Won ? (
                  <Ionicons name="trophy" size={24} color="#F59E0B" />
                ) : (
                  <Ionicons name="medal-outline" size={24} color="#94A3B8" />
                )}
              </View>
            ) : team1Won ? (
              <View style={styles.winBadgeBox}>
                <Text style={styles.winBadgeLetter}>W</Text>
              </View>
            ) : team2Won ? (
              <View style={styles.lossBadgeBox}>
                <Text style={styles.lossBadgeLetter}>L</Text>
              </View>
            ) : (
              <View style={styles.teamIconBox}>
                <Ionicons name="shield-outline" size={24} color="#94A3B8" />
              </View>
            )}
            <Text style={styles.teamName}>{currentMatch.team1_name}</Text>
            <Text style={styles.teamRoleText}>
              {isTimeSport
                ? team1Won
                  ? '1st Place • Lead Program'
                  : '2nd Place • Runner Up'
                : `Home Team • ${team1Won ? 'Winner' : team2Won ? 'Defeated' : 'Final'}`}
            </Text>
          </View>

          {/* Score Head to Head */}
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreHomeText, (team1Won || isTimeSport) ? { color: '#00C8FF' } : { color: '#94A3B8' }]}>
              {currentMatch.team1_score}
            </Text>
            <Text style={styles.vsText}>vs</Text>
            <Text style={[styles.scoreAwayText, (team2Won || isTimeSport) ? { color: '#00C8FF' } : { color: '#94A3B8' }]}>
              {currentMatch.team2_score}
            </Text>
          </View>

          {/* Team 2 (Away) */}
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            {isTimeSport ? (
              <View style={[
                styles.teamIconBox,
                team2Won ? styles.outcomeBadge1st : styles.outcomeBadge2nd
              ]}>
                {team2Won ? (
                  <Ionicons name="trophy" size={24} color="#F59E0B" />
                ) : (
                  <Ionicons name="medal-outline" size={24} color="#94A3B8" />
                )}
              </View>
            ) : team2Won ? (
              <View style={styles.winBadgeBox}>
                <Text style={styles.winBadgeLetter}>W</Text>
              </View>
            ) : team1Won ? (
              <View style={styles.lossBadgeBox}>
                <Text style={styles.lossBadgeLetter}>L</Text>
              </View>
            ) : (
              <View style={styles.teamIconBox}>
                <Ionicons name="shield-outline" size={24} color="#94A3B8" />
              </View>
            )}
            <Text style={styles.teamName}>{currentMatch.team2_name}</Text>
            <Text style={styles.teamRoleText}>
              {isTimeSport
                ? team2Won
                  ? '1st Place • Lead Program'
                  : '2nd Place • Runner Up'
                : `Away Team • ${team2Won ? 'Winner' : team1Won ? 'Defeated' : 'Final'}`}
            </Text>
          </View>
        </View>

        {/* Player Performance Table Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
              {isTimeSport ? 'ATHLETE STANDINGS & TIMES' : 'PLAYER PERFORMANCE'}
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
                {currentMatch.sport_category === 'BASKETBALL' ? 'PLAYER' : 'ATHLETE (RANK)'}
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

            {/* Team 1 Section */}
            <View style={styles.teamSectionHeader}>
              {isTimeSport ? (
                team1Won ? (
                  <Ionicons name="trophy" size={15} color="#F59E0B" />
                ) : (
                  <Ionicons name="medal-outline" size={15} color="#94A3B8" />
                )
              ) : (
                <View style={[
                  styles.outcomePillBadge,
                  team1Won ? styles.outcomeBadgeWin : team2Won ? styles.outcomeBadgeLoss : styles.outcomeBadgeTie
                ]}>
                  <Text style={[
                    styles.outcomePillText,
                    team1Won ? { color: '#10B981' } : team2Won ? { color: '#EF4444' } : { color: '#94A3B8' }
                  ]}>
                    {team1Won ? 'W' : team2Won ? 'L' : '-'}
                  </Text>
                </View>
              )}
              <Text style={styles.teamSectionHeaderText}>{currentMatch.team1_name}</Text>
            </View>
            {team1List.length > 0 ? (
              team1List.map((row, idx) =>
                renderPlayerRow(row, idx, idx === team1List.length - 1 && team2List.length === 0, idx + 1)
              )
            ) : (
              <Text style={{ color: '#64748B', fontSize: 11, paddingVertical: 8, paddingLeft: 8 }}>
                No roster players recorded
              </Text>
            )}

            {/* Team 2 Section */}
            {currentMatch.team2_name ? (
              <>
                <View style={[styles.teamSectionHeader, { marginTop: 14 }]}>
                  {isTimeSport ? (
                    team2Won ? (
                      <Ionicons name="trophy" size={15} color="#F59E0B" />
                    ) : (
                      <Ionicons name="medal-outline" size={15} color="#94A3B8" />
                    )
                  ) : (
                    <View style={[
                      styles.outcomePillBadge,
                      team2Won ? styles.outcomeBadgeWin : team1Won ? styles.outcomeBadgeLoss : styles.outcomeBadgeTie
                    ]}>
                      <Text style={[
                        styles.outcomePillText,
                        team2Won ? { color: '#10B981' } : team1Won ? { color: '#EF4444' } : { color: '#94A3B8' }
                      ]}>
                        {team2Won ? 'W' : team1Won ? 'L' : '-'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.teamSectionHeaderText}>{currentMatch.team2_name}</Text>
                </View>
                {team2List.length > 0 ? (
                  team2List.map((row, idx) =>
                    renderPlayerRow(row, idx, idx === team2List.length - 1, team1List.length + idx + 1)
                  )
                ) : (
                  <Text style={{ color: '#64748B', fontSize: 11, paddingVertical: 8, paddingLeft: 8 }}>
                    No roster players recorded
                  </Text>
                )}
              </>
            ) : null}
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

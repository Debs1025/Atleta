import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { computeBadgeProgressList, BadgeProgressItem } from '../../Coach/Discovery/playerBadgeEngine';

interface AthleteBadgesShowcaseProps {
  athlete: any;
  showAll?: boolean;
}

export function AthleteBadgesShowcase({ athlete, showAll = true }: AthleteBadgesShowcaseProps) {
  const badgeProgressList = useMemo(() => {
    return computeBadgeProgressList(athlete);
  }, [athlete]);

  const unlockedBadges = useMemo(() => {
    return badgeProgressList.filter((b) => b.unlocked);
  }, [badgeProgressList]);

  const inProgressBadges = useMemo(() => {
    return badgeProgressList.filter((b) => !b.unlocked);
  }, [badgeProgressList]);

  return (
    <View style={styles.container}>
      {/* Header with Title and Verification Pill */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.titleWithIcon}>
            <Ionicons name="ribbon" size={20} color="#F59E0B" style={{ marginRight: 8 }} />
            <Text style={styles.mainTitle}>Badges You've Unlocked</Text>
          </View>
          <Text style={styles.subTitle}>
            Read-Only Playstyle Achievements derived from verified match stats & combine test data.
          </Text>
        </View>
        <View style={styles.readOnlyBadge}>
          <Ionicons name="lock-closed" size={12} color="#38BDF8" style={{ marginRight: 4 }} />
          <Text style={styles.readOnlyText}>VERIFIED ONLY</Text>
        </View>
      </View>

      {/* ─── SECTION 1: UNLOCKED BADGES SHOWCASE ─── */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>ACTIVE UNLOCKED BADGES</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{unlockedBadges.length} UNLOCKED</Text>
          </View>
        </View>

        {unlockedBadges.length > 0 ? (
          <View style={styles.unlockedGrid}>
            {unlockedBadges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.unlockedCard,
                  { borderColor: badge.borderColor, backgroundColor: badge.bgColor },
                ]}
              >
                <View style={styles.unlockedCardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: badge.color }]}>
                    <Ionicons name={badge.icon as any} size={16} color="#080F21" />
                  </View>
                  <View style={styles.unlockedTag}>
                    <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={styles.unlockedTagText}>UNLOCKED</Text>
                  </View>
                </View>

                <Text style={styles.unlockedName}>{badge.label}</Text>
                <View style={styles.metricProofPill}>
                  <Text style={[styles.metricProofText, { color: badge.color }]}>
                    {badge.metricProof}
                  </Text>
                </View>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {badge.description}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyUnlockedCard}>
            <Ionicons name="trophy-outline" size={26} color="#64748B" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyUnlockedTitle}>No Playstyle Badges Unlocked Yet</Text>
            <Text style={styles.emptyUnlockedSub}>
              Compete in official matches and combine testing to unlock your playstyle archetype showcase.
            </Text>
          </View>
        )}
      </View>

      {/* ─── SECTION 2: NEXT BADGE MILESTONES & PROGRESS BARS ─── */}
      {inProgressBadges.length > 0 && showAll && (
        <View style={[styles.sectionBlock, { marginTop: 18 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>PROGRESS TOWARD NEXT BADGES</Text>
            <View style={[styles.countBadge, { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
              <Text style={[styles.countBadgeText, { color: '#94A3B8' }]}>
                {inProgressBadges.length} IN PROGRESS
              </Text>
            </View>
          </View>

          <View style={styles.progressCardsList}>
            {inProgressBadges.map((badge) => {
              const remaining = Math.max(0, badge.targetValue - badge.currentValue);
              const remainingFormatted = badge.unit.includes('%')
                ? `${Math.round(remaining)}%`
                : badge.unit.includes('Vert')
                ? `${Math.round(remaining)}"`
                : remaining.toFixed(1);

              return (
                <View key={badge.id} style={styles.progressCard}>
                  {/* Top Row: Icon, Label, and Requirement info */}
                  <View style={styles.progressCardTopRow}>
                    <View style={styles.progressCardTitleWrap}>
                      <View style={[styles.smallIconCircle, { backgroundColor: badge.bgColor, borderColor: badge.borderColor }]}>
                        <Ionicons name={badge.icon as any} size={13} color={badge.color} />
                      </View>
                      <View>
                        <Text style={styles.progressCardLabel}>{badge.label}</Text>
                        <Text style={styles.requirementText}>{badge.progressShort}</Text>
                      </View>
                    </View>

                    <View style={styles.pctWrapper}>
                      <Text style={[styles.pctValue, { color: badge.color }]}>
                        {badge.progressPct}%
                      </Text>
                      <Text style={styles.remainingSub}>
                        {remaining > 0 ? `-${remainingFormatted} to go` : 'Target met'}
                      </Text>
                    </View>
                  </View>

                  {/* Visual Progress Bar Track and Animated Fill */}
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.max(6, Math.min(100, badge.progressPct))}%`,
                          backgroundColor: badge.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Gamification Motivate Banner */}
      <View style={styles.footerNoteCard}>
        <Ionicons name="sparkles" size={14} color="#38BDF8" style={{ marginRight: 6 }} />
        <Text style={styles.footerNoteText}>
          Playstyle badges are computed strictly from real game statistics to give scouts and coaches verified, tamper-proof athletic archetypes.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A1224',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleGroup: {
    flex: 1,
    paddingRight: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subTitle: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  readOnlyText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionBlock: {
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  countBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  unlockedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  unlockedCard: {
    width: '48%',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
  },
  unlockedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080F21',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unlockedTagText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  unlockedName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  metricProofPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#080F21',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  metricProofText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeDesc: {
    color: '#94A3B8',
    fontSize: 10,
    lineHeight: 14,
  },
  emptyUnlockedCard: {
    backgroundColor: '#0D172A',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
  },
  emptyUnlockedTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyUnlockedSub: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  progressCardsList: {
    gap: 10,
  },
  progressCard: {
    backgroundColor: '#0D172A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  progressCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressCardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  smallIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  progressCardLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  requirementText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  pctWrapper: {
    alignItems: 'flex-end',
  },
  pctValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  remainingSub: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#080F21',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080F21',
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  footerNoteText: {
    color: '#64748B',
    fontSize: 10,
    lineHeight: 14,
    flex: 1,
  },
});

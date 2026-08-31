import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import styles from './styles/officialMatchPreview';
import { useMatchContext, OfficialMatchRecord, PlayerBoxScoreMetric } from './MatchContext';

interface OfficialMatchPreviewProps {
  matchId: string;
  onBack?: () => void;
}

export const OfficialMatchPreview: React.FC<OfficialMatchPreviewProps> = ({
  matchId,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const {
    matches,
    requestAudit,
    grantAudit,
    generatePDFScoresheet,
    isGeneratingPDF,
    downloadModal,
    closeDownloadModal,
    openPDFFile,
  } = useMatchContext();

  // Find match
  const match = matches.find((m) => m.match_id === matchId);

  const handleRequestAudit = useCallback(async () => {
    if (!match) return;
    await requestAudit(match.match_id);
  }, [match, requestAudit]);

  const handleToggleCertified = useCallback(async () => {
    if (!match) return;
    if (match.audit_status === 'REQUEST GRANTED') {
      await requestAudit(match.match_id);
    } else {
      await grantAudit(match.match_id);
    }
  }, [match, requestAudit, grantAudit]);

  const handleDownloadPDF = useCallback(async () => {
    if (!match) return;
    await generatePDFScoresheet(match);
  }, [match, generatePDFScoresheet]);

  if (!match) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#070D19" />
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 12, 0), paddingBottom: 10 }]}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MATCH PREVIEW</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00C8FF" />
          <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 14 }}>Loading match details...</Text>
        </View>
      </View>
    );
  }

  const isCertified = match.audit_status === 'REQUEST GRANTED' && match.is_certified;

  // Render Table Header according to Sport Type
  const renderTableHeader = () => {
    switch (match.sport_type) {
      case 'BASKETBALL':
        return (
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { width: 140 }]}>PLAYER NAME</Text>
            <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>PTS</Text>
            <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>AST</Text>
            <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>REB</Text>
            <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>STL</Text>
            <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>BLK</Text>
          </View>
        );
      case 'SWIMMING':
        return (
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { width: 140 }]}>SWIMMER NAME</Text>
            <Text style={[styles.thText, { width: 130, textAlign: 'center' }]}>EVENT</Text>
            <Text style={[styles.thText, { width: 80, textAlign: 'center' }]}>TIME</Text>
            <Text style={[styles.thText, { width: 80, textAlign: 'center' }]}>SPLIT</Text>
            <Text style={[styles.thText, { width: 60, textAlign: 'center' }]}>RANK</Text>
            <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>LANE</Text>
          </View>
        );
      case 'TRACK AND FIELD':
        return (
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { width: 140 }]}>ATHLETE NAME</Text>
            <Text style={[styles.thText, { width: 130, textAlign: 'center' }]}>DISCIPLINE</Text>
            <Text style={[styles.thText, { width: 90, textAlign: 'center' }]}>MARK / TIME</Text>
            <Text style={[styles.thText, { width: 80, textAlign: 'center' }]}>WIND</Text>
            <Text style={[styles.thText, { width: 60, textAlign: 'center' }]}>PLACE</Text>
          </View>
        );
    }
  };

  // Render Table Row according to Sport Type
  const renderTableRow = (player: PlayerBoxScoreMetric, isLast: boolean) => {
    const rowBorderStyle = isLast ? { borderBottomWidth: 0 } : {};

    switch (match.sport_type) {
      case 'BASKETBALL':
        return (
          <View key={player.athlete_id} style={[styles.tableRow, rowBorderStyle]}>
            <Text style={[styles.tdName, { width: 140 }]} numberOfLines={1}>
              {player.player_name}
            </Text>
            <Text style={[styles.tdStat, { width: 50 }]}>{player.pts ?? 0}</Text>
            <Text style={[styles.tdStat, { width: 50 }]}>{player.ast ?? 0}</Text>
            <Text style={[styles.tdStat, { width: 50 }]}>{player.reb ?? 0}</Text>
            <Text style={[styles.tdStat, { width: 50 }]}>{player.stl ?? 0}</Text>
            <Text style={[styles.tdStat, { width: 50 }]}>{player.blk ?? 0}</Text>
          </View>
        );
      case 'SWIMMING':
        return (
          <View key={player.athlete_id} style={[styles.tableRow, rowBorderStyle]}>
            <Text style={[styles.tdName, { width: 140 }]} numberOfLines={1}>
              {player.player_name}
            </Text>
            <Text style={[styles.tdStat, { width: 130 }]} numberOfLines={1}>
              {player.event_name ?? '50m Freestyle'}
            </Text>
            <Text style={[styles.tdStat, { width: 80 }]}>{player.time_seconds ?? '-'}</Text>
            <Text style={[styles.tdStat, { width: 80 }]}>{player.split_time ?? '-'}</Text>
            <Text style={[styles.tdStat, { width: 60 }]}>
              {player.rank_position ? `#${player.rank_position}` : '-'}
            </Text>
            <Text style={[styles.tdStat, { width: 50 }]}>{player.lane ?? '-'}</Text>
          </View>
        );
      case 'TRACK AND FIELD':
        return (
          <View key={player.athlete_id} style={[styles.tableRow, rowBorderStyle]}>
            <Text style={[styles.tdName, { width: 140 }]} numberOfLines={1}>
              {player.player_name}
            </Text>
            <Text style={[styles.tdStat, { width: 130 }]} numberOfLines={1}>
              {player.discipline ?? '100m Sprint'}
            </Text>
            <Text style={[styles.tdStat, { width: 90 }]}>{player.mark_result ?? '-'}</Text>
            <Text style={[styles.tdStat, { width: 80 }]}>{player.wind_reading ?? 'N/A'}</Text>
            <Text style={[styles.tdStat, { width: 60 }]}>
              {player.place ? `#${player.place}` : '-'}
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#070D19" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 12, 0), paddingBottom: 10 }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MATCH PREVIEW</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isCertified ? (
          <>
            {/* Certification Banner Badge */}
            <View style={styles.certifiedBanner}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
              <Text style={styles.certifiedText}>OFFICIALLY CERTIFIED</Text>
            </View>

            {/* Match Score Summary Card */}
            <View style={styles.certifiedCard}>
              <Text style={styles.sportTag}>{match.sport_type}</Text>
              <Text style={styles.matchHeadline}>
                {`${match.home_team_name} vs. ${match.away_team_name}`}
              </Text>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                <Text style={styles.dateText}>{match.match_date}</Text>
              </View>

              {/* Head-to-Head Big Score Tile */}
              <View style={styles.scoreTile}>
                <Text style={styles.homeTeamLabel}>{match.home_team_name}</Text>
                <View style={styles.scoresRow}>
                  <Text style={styles.scoreNumber}>{match.home_score ?? 0}</Text>
                  <View style={styles.scoreDivider} />
                  <Text style={styles.scoreNumber}>{match.away_score ?? 0}</Text>
                </View>
                <Text style={styles.awayTeamLabel}>{match.away_team_name}</Text>
              </View>
            </View>

            {/* Team Performance Statistics Table */}
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <View style={styles.statsTitleContainer}>
                  <Text style={styles.statsTitle}>TEAM PERFORMANCE STATISTICS</Text>
                </View>
                <Text style={styles.statsTeamLabel} numberOfLines={2}>
                  {`CAMARINES SUR\n${match.home_team_name.toUpperCase()}`}
                </Text>
              </View>

              {/* Horizontally Scrollable Table for responsive stats view */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  {renderTableHeader()}
                  {(match.box_score_summary || []).map((player, index) =>
                    renderTableRow(
                      player,
                      index === (match.box_score_summary?.length || 0) - 1
                    )
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Bottom Primary Action Button: DOWNLOAD PDF SCORESHEET */}
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="document-attach-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>DOWNLOAD PDF SCORESHEET</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Demo state switch button */}
            <TouchableOpacity
              style={styles.demoToggleBtn}
              onPress={handleToggleCertified}
              activeOpacity={0.7}
            >
              <Text style={styles.demoToggleText}>
                Demo: Switch to Unrequested / Pending View
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Active Selection Section */}
            <Text style={styles.sectionLabel}>ACTIVE SELECTION</Text>
            <View style={styles.activeCard}>
              <View style={styles.activeCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchHeadline}>
                    {`${match.home_team_name} vs. ${match.away_team_name}`}
                  </Text>
                  <Text style={styles.matchIdSubtext}>{`ID: ${match.match_id}`}</Text>
                </View>
                <Ionicons name="globe-outline" size={22} color="#00C8FF" />
              </View>

              <View style={styles.divider} />

              <View style={styles.subGrid}>
                <View style={styles.subGridCol}>
                  <Text style={styles.gridLabel}>DATE</Text>
                  <Text style={styles.gridValue}>{match.match_date}</Text>
                </View>
                <View style={styles.subGridCol}>
                  <Text style={styles.gridLabel}>LEAGUE</Text>
                  <Text style={styles.gridValue}>{match.league_name}</Text>
                </View>
              </View>
            </View>

            {/* Request Status Section */}
            <Text style={styles.sectionLabel}>REQUEST STATUS</Text>
            <View style={styles.statusCard}>
              <View style={styles.statusIconBox}>
                <Ionicons
                  name={
                    match.audit_status === 'PENDING REQUEST'
                      ? 'time-outline'
                      : 'clipboard-outline'
                  }
                  size={26}
                  color={match.audit_status === 'PENDING REQUEST' ? '#00C8FF' : '#94A3B8'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>
                  {match.audit_status === 'PENDING REQUEST'
                    ? 'Pending Request'
                    : 'Unrequested'}
                </Text>
                <Text style={styles.statusSubtext}>
                  {match.audit_status === 'PENDING REQUEST'
                    ? 'Official scoresheet audit request submitted and pending official review.'
                    : 'No official scoresheet audit has been initiated for this match.'}
                </Text>
              </View>
            </View>

            {/* Information Alert Box */}
            <View style={styles.alertCard}>
              <View style={styles.alertAccentBar} />
              <View style={styles.alertIconContainer}>
                <Ionicons name="information-circle-outline" size={22} color="#00C8FF" />
              </View>
              <Text style={styles.alertText}>
                Requesting an official scoresheet triggers an immediate notification to the
                appointed <Text style={styles.boldHighlight}>Tournament Official</Text>. This
                process involves a formal audit of individual stats, team fouls, and final score
                certification for official record-keeping.
              </Text>
            </View>

            {/* Bottom Primary Action Button: Request Official Scoresheet */}
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={handleRequestAudit}
            >
              <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {match.audit_status === 'PENDING REQUEST'
                  ? 'Request Pending Review (Tap to Resend)'
                  : 'Request Official Scoresheet'}
              </Text>
            </TouchableOpacity>

            {/* Demo state switch button */}
            <TouchableOpacity
              style={styles.demoToggleBtn}
              onPress={handleToggleCertified}
              activeOpacity={0.7}
            >
              <Text style={styles.demoToggleText}>
                Demo: Certify Scoresheet (Show Certified State & Stats)
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Download Complete Interruption Modal Dialog */}
      <Modal
        transparent
        animationType="fade"
        visible={Boolean(downloadModal?.visible)}
        onRequestClose={closeDownloadModal}
      >
        <View style={styles.interruptionOverlay}>
          <View style={styles.interruptionCard}>
            <Ionicons name="checkmark-circle" size={58} color="#10B981" style={{ marginBottom: 12 }} />
            
            <Text style={styles.interruptionTitle}>Download Complete</Text>

            <TouchableOpacity
              style={styles.fileNameBox}
              activeOpacity={0.75}
              onPress={() => openPDFFile(downloadModal?.uri)}
            >
              <Ionicons name="document-text-outline" size={18} color="#00C8FF" style={{ marginRight: 8 }} />
              <Text style={styles.fileNameText} numberOfLines={1}>
                {downloadModal?.fileName}
              </Text>
              <Ionicons name="open-outline" size={16} color="#00C8FF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneButton}
              activeOpacity={0.85}
              onPress={closeDownloadModal}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default OfficialMatchPreview;

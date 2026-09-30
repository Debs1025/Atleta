import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  Save,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Trophy,
} from 'lucide-react';
import type { RawOCRDetectedData, DetectedAthleteStat } from '../../api/types';
import { submitVerifiedMatch } from '../../api/client';
import { styles } from './styles/OCROutputView';

interface OCROutputViewProps {
  rawOCRData: RawOCRDetectedData;
  onBack: () => void;
  onSaveSuccess: () => void;
}

export const OCROutputView: React.FC<OCROutputViewProps> = ({
  rawOCRData,
  onBack,
  onSaveSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [athleteStats, setAthleteStats] = useState<DetectedAthleteStat[]>(
    rawOCRData.athlete_overview || []
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Teams list
  const teamList = useMemo(() => {
    const set = new Set<string>();
    if (rawOCRData.teams && Array.isArray(rawOCRData.teams)) {
      rawOCRData.teams.forEach((t) => set.add(String(t).trim().toUpperCase()));
    }
    if (rawOCRData.team_scores && Array.isArray(rawOCRData.team_scores)) {
      rawOCRData.team_scores.forEach((t) => set.add(String(t.team).trim().toUpperCase()));
    }
    if (rawOCRData.team_name) set.add(String(rawOCRData.team_name).trim().toUpperCase());
    if (rawOCRData.opponent_team_name) set.add(String(rawOCRData.opponent_team_name).trim().toUpperCase());
    athleteStats.forEach((a) => {
      if (a.team_name) set.add(String(a.team_name).trim().toUpperCase());
    });
    return Array.from(set).filter((t) => t.length > 0);
  }, [rawOCRData, athleteStats]);

  // Filtered athletes based on active tab
  const visibleAthletes = useMemo(() => {
    if (selectedTeamFilter === 'ALL') return athleteStats;
    return athleteStats.filter(
      (a) => (a.team_name || '').toUpperCase() === selectedTeamFilter.toUpperCase()
    );
  }, [athleteStats, selectedTeamFilter]);

  // Totals row calculation
  const totals = useMemo(() => {
    return visibleAthletes.reduce(
      (acc, curr) => {
        acc.pts += curr.pts || 0;
        acc.ast += curr.ast || 0;
        acc.to += curr.to || 0;
        acc.reb += curr.reb || 0;
        acc.stl += curr.stl || 0;
        acc.blk += curr.blk || 0;
        acc.min += curr.min || 0;
        return acc;
      },
      { pts: 0, ast: 0, to: 0, reb: 0, stl: 0, blk: 0, min: 0 }
    );
  }, [visibleAthletes]);

  // Cell Edit Handler
  const handleStatChange = (
    targetAthleteId: string,
    field: keyof DetectedAthleteStat,
    value: string
  ) => {
    setAthleteStats((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
      if (idx === -1) return prev;
      const numVal = parseInt(value, 10);
      updated[idx] = {
        ...updated[idx],
        [field]: isNaN(numVal) ? 0 : numVal,
      };
      return updated;
    });
  };

  // Toggle Athlete Team between Home and Away
  const handleToggleTeam = (targetAthleteId: string) => {
    setAthleteStats((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
      if (idx === -1) return prev;
      const current = (updated[idx].team_name || '').toUpperCase();
      const home = (rawOCRData.team_name || 'HOME').toUpperCase();
      const away = (rawOCRData.opponent_team_name || 'AWAY').toUpperCase();
      const nextTeam = current === home ? away : home;
      updated[idx] = {
        ...updated[idx],
        team_name: nextTeam,
      };
      return updated;
    });
  };

  // Confirm and save match
  const handleSaveMatch = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const homeTeam = (rawOCRData.team_name || 'HOME TEAM').toUpperCase();
      const oppTeam = (rawOCRData.opponent_team_name || 'OPPONENT TEAM').toUpperCase();

      const homePts = athleteStats
        .filter((a) => (a.team_name || '').toUpperCase() === homeTeam)
        .reduce((sum, a) => sum + (a.pts || 0), 0);
      const awayPts = athleteStats
        .filter((a) => (a.team_name || '').toUpperCase() === oppTeam)
        .reduce((sum, a) => sum + (a.pts || 0), 0);

      const scoreHomeObj = (rawOCRData.team_scores || []).find((t) => (t.team || '').toUpperCase() === homeTeam);
      const scoreAwayObj = (rawOCRData.team_scores || []).find((t) => (t.team || '').toUpperCase() === oppTeam);

      const finalHomeScore = (scoreHomeObj && scoreHomeObj.score > homePts) ? scoreHomeObj.score : homePts;
      const finalAwayScore = (scoreAwayObj && scoreAwayObj.score > awayPts) ? scoreAwayObj.score : awayPts;

      const payload = {
        team_id: rawOCRData.team_name || 'team_official',
        sport_type: rawOCRData.sport_type || 'BASKETBALL',
        match_name: `${homeTeam} vs ${oppTeam}`,
        match_type: 'Official Match',
        match_date: new Date().toISOString(),
        location: 'Tournament Arena',
        opponent_team_name: oppTeam,
        game_result: finalHomeScore >= finalAwayScore ? 'WIN' : 'LOSS',
        home_score: finalHomeScore,
        away_score: finalAwayScore,
        notes: `Official OCR Logged Match (${homeTeam}: ${finalHomeScore} vs ${oppTeam}: ${finalAwayScore})`,
        player_stats: athleteStats.map((a) => ({
          athlete_id: a.athlete_id,
          player_name: a.player_name,
          team_name: a.team_name,
          jersey_number: a.jersey_number,
          pts: a.pts || 0,
          ast: a.ast || 0,
          reb: a.reb || 0,
          stl: a.stl || 0,
          blk: a.blk || 0,
          to: a.to || 0,
          min: a.min || 0,
          stats: {
            points: a.pts || 0,
            assists: a.ast || 0,
            rebounds: a.reb || 0,
            steals: a.stl || 0,
            blocks: a.blk || 0,
            turnovers: a.to || 0,
            minutes: a.min || 0,
          },
        })),
      };

      await submitVerifiedMatch(payload);
      setFeedback({ type: 'success', message: 'Match successfully logged and verified in Firestore database.' });
      setTimeout(() => {
        onSaveSuccess();
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit verified match statistics.' });
    } finally {
      setSaving(false);
    }
  };

  const homeScore = athleteStats
    .filter((a) => (a.team_name || '').toUpperCase() === (rawOCRData.team_name || 'HOME').toUpperCase())
    .reduce((s, a) => s + (a.pts || 0), 0);

  const awayScore = athleteStats
    .filter((a) => (a.team_name || '').toUpperCase() === (rawOCRData.opponent_team_name || 'AWAY').toUpperCase())
    .reduce((s, a) => s + (a.pts || 0), 0);

  return (
    <div style={styles.container}>
      {/* Top Action Bar */}
      <div style={styles.topBar}>
        <button
          type="button"
          onClick={onBack}
          style={styles.backBtn}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          <span>BACK TO UPLOADER</span>
        </button>

        <div style={styles.actionGroup}>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            style={{
              ...styles.editToggleBtn,
              ...(isEditing ? styles.editToggleBtnActive : {}),
            }}
          >
            {isEditing ? (
              <>
                <CheckCircle2 style={{ width: 14, height: 14 }} />
                <span>Done Editing</span>
              </>
            ) : (
              <>
                <Edit2 style={{ width: 14, height: 14 }} />
                <span>Edit Box Score</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveMatch}
            disabled={saving}
            style={{
              ...styles.saveBtn,
              ...(saving ? styles.saveBtnDisabled : {}),
            }}
          >
            {saving ? (
              <>
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                <span>Submitting to Database...</span>
              </>
            ) : (
              <>
                <Save style={{ width: 14, height: 14 }} />
                <span>Confirm & Log Match</span>
              </>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div style={feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}>
          <ShieldCheck style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Score Banner */}
      <div style={styles.scoreBanner}>
        <div style={styles.scoreBannerInner}>
          <div style={styles.teamCol}>
            <span style={styles.teamTag}>HOME TEAM</span>
            <h2 style={styles.teamName}>
              {rawOCRData.team_name || 'HOME TEAM'}
            </h2>
            <div style={styles.teamScore}>{homeScore}</div>
          </div>

          <div style={styles.vsCenter}>
            <span style={styles.vsBadge}>VS</span>
            <span style={styles.sportBadge}>
              <Trophy style={{ width: 14, height: 14, color: '#FBBF24' }} />
              <span>{rawOCRData.sport_type || 'BASKETBALL'}</span>
            </span>
          </div>

          <div style={styles.teamColRight}>
            <span style={styles.teamTag}>AWAY TEAM</span>
            <h2 style={styles.teamName}>
              {rawOCRData.opponent_team_name || 'AWAY TEAM'}
            </h2>
            <div style={styles.teamScore}>{awayScore}</div>
          </div>
        </div>
      </div>

      {/* Team Filter Tabs */}
      <div style={styles.filterTabsWrap}>
        <button
          type="button"
          onClick={() => setSelectedTeamFilter('ALL')}
          style={{
            ...styles.filterTab,
            ...(selectedTeamFilter === 'ALL' ? styles.filterTabActive : {}),
          }}
        >
          All Players ({athleteStats.length})
        </button>
        {teamList.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedTeamFilter(t)}
            style={{
              ...styles.filterTab,
              ...(selectedTeamFilter === t ? styles.filterTabActive : {}),
            }}
          >
            {t} ({athleteStats.filter((a) => (a.team_name || '').toUpperCase() === t).length})
          </button>
        ))}
      </div>

      {/* Box Score Table */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <span style={styles.tableTitle}>
            EXTRACTED PLAYER BOX SCORE
          </span>
          <span style={styles.tableSubtitle}>
            {isEditing ? 'Editing Mode Active: tap numbers to edit' : 'Tap team badge to toggle Home/Away'}
          </span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.thCenter, width: '48px' }}>#</th>
                <th style={styles.th}>Athlete Name</th>
                <th style={styles.th}>Team</th>
                <th style={styles.thCenter}>PTS</th>
                <th style={styles.thCenter}>AST</th>
                <th style={styles.thCenter}>TO</th>
                <th style={styles.thCenter}>REB</th>
                <th style={styles.thCenter}>STL</th>
                <th style={styles.thCenter}>BLK</th>
                <th style={styles.thCenter}>MIN</th>
                <th style={styles.thCenter}>FG%</th>
              </tr>
            </thead>
            <tbody>
              {visibleAthletes.map((a) => {
                const isHome = (a.team_name || '').toUpperCase() === (rawOCRData.team_name || 'HOME').toUpperCase();
                return (
                  <tr key={a.athlete_id} style={styles.tbodyRow}>
                    <td style={styles.tdNum}>
                      {a.jersey_number ? `#${a.jersey_number}` : '-'}
                    </td>
                    <td style={styles.tdAthleteName}>
                      {a.player_name}
                    </td>
                    <td style={styles.tdTeam}>
                      <button
                        type="button"
                        onClick={() => handleToggleTeam(a.athlete_id)}
                        title="Click to toggle Home / Away"
                        style={isHome ? styles.teamBadgeHome : styles.teamBadgeAway}
                      >
                        <span>{a.team_name || (isHome ? 'HOME' : 'AWAY')}</span>
                        <RefreshCw style={{ width: 10, height: 10, opacity: 0.6 }} />
                      </button>
                    </td>

                    {/* Stats columns */}
                    {(['pts', 'ast', 'to', 'reb', 'stl', 'blk', 'min'] as const).map((stat) => (
                      <td key={stat} style={styles.tdStat}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={a[stat] ?? 0}
                            onChange={(e) => handleStatChange(a.athlete_id, stat, e.target.value)}
                            style={styles.statInput}
                          />
                        ) : (
                          a[stat] ?? 0
                        )}
                      </td>
                    ))}

                    <td style={styles.tdFgPct}>
                      {a.fg_pct || '0%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={styles.tfootRow}>
                <td style={styles.tfootTdTotalLabel} colSpan={3}>
                  TOTALS ({visibleAthletes.length} Players)
                </td>
                <td style={styles.tfootTdStatHighlight}>{totals.pts}</td>
                <td style={styles.tfootTdStat}>{totals.ast}</td>
                <td style={styles.tfootTdStat}>{totals.to}</td>
                <td style={styles.tfootTdStat}>{totals.reb}</td>
                <td style={styles.tfootTdStat}>{totals.stl}</td>
                <td style={styles.tfootTdStat}>{totals.blk}</td>
                <td style={styles.tfootTdStat}>{totals.min}</td>
                <td style={styles.tfootTdDash}>-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

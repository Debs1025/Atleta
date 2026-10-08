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
  Layers,
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
  // Determine list of matches (batch vs single)
  const matchesList = useMemo(() => {
    if (rawOCRData.batch_matches && rawOCRData.batch_matches.length > 0) {
      return rawOCRData.batch_matches;
    }
    return [rawOCRData];
  }, [rawOCRData]);

  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const [savedMatches, setSavedMatches] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('ALL');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Per-match athlete state dictionary
  const [athleteStatsMap, setAthleteStatsMap] = useState<Record<number, DetectedAthleteStat[]>>(() => {
    const initial: Record<number, DetectedAthleteStat[]> = {};
    const list = (rawOCRData.batch_matches && rawOCRData.batch_matches.length > 0)
      ? rawOCRData.batch_matches
      : [rawOCRData];
    list.forEach((m, idx) => {
      initial[idx] = m.athlete_overview || [];
    });
    return initial;
  });

  const currentMatch = matchesList[activeMatchIndex] || rawOCRData;
  const athleteStats = athleteStatsMap[activeMatchIndex] || [];

  // Helper to update athlete stats for active match
  const updateActiveAthleteStats = (
    updater: (prev: DetectedAthleteStat[]) => DetectedAthleteStat[]
  ) => {
    setAthleteStatsMap((prev) => ({
      ...prev,
      [activeMatchIndex]: updater(prev[activeMatchIndex] || []),
    }));
  };

  // Sport type identification
  const sportType = (currentMatch.sport_type || 'BASKETBALL').toUpperCase();
  const isVolleyball = sportType.includes('VOLLEY');
  const isSoccer = sportType.includes('SOCCER') || sportType.includes('FOOTBALL');
  const isIndividual =
    sportType.includes('SWIM') ||
    sportType.includes('RUN') ||
    sportType.includes('TRACK') ||
    sportType.includes('ATHLETIC') ||
    sportType.includes('TIME');
  const isBasketball = !isVolleyball && !isSoccer && !isIndividual;

  // Teams list for active match
  const teamList = useMemo(() => {
    const set = new Set<string>();
    if (currentMatch.teams && Array.isArray(currentMatch.teams)) {
      currentMatch.teams.forEach((t) => set.add(String(t).trim().toUpperCase()));
    }
    if (currentMatch.team_scores && Array.isArray(currentMatch.team_scores)) {
      currentMatch.team_scores.forEach((t) => set.add(String(t.team).trim().toUpperCase()));
    }
    if (currentMatch.team_name) set.add(String(currentMatch.team_name).trim().toUpperCase());
    if (currentMatch.opponent_team_name) set.add(String(currentMatch.opponent_team_name).trim().toUpperCase());
    athleteStats.forEach((a) => {
      if (a.team_name) set.add(String(a.team_name).trim().toUpperCase());
    });
    return Array.from(set).filter((t) => t.length > 0);
  }, [currentMatch, athleteStats]);

  // Filtered athletes based on active tab
  const visibleAthletes = useMemo(() => {
    if (selectedTeamFilter === 'ALL') return athleteStats;
    return athleteStats.filter(
      (a) => (a.team_name || '').toUpperCase() === selectedTeamFilter.toUpperCase()
    );
  }, [athleteStats, selectedTeamFilter]);

  // Totals calculations
  const totals = useMemo(() => {
    if (isBasketball) {
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
    }
    if (isVolleyball) {
      return visibleAthletes.reduce(
        (acc, curr) => {
          acc.kills += curr.kills || 0;
          acc.attack_errors += curr.attack_errors || 0;
          acc.attack_attempts += curr.attack_attempts || 0;
          acc.service_aces += curr.service_aces || 0;
          acc.digs += curr.digs || 0;
          acc.block_points += curr.block_points || 0;
          return acc;
        },
        { kills: 0, attack_errors: 0, attack_attempts: 0, service_aces: 0, digs: 0, block_points: 0 }
      );
    }
    if (isSoccer) {
      return visibleAthletes.reduce(
        (acc, curr) => {
          acc.goals += curr.goals || 0;
          acc.shots += curr.shots || 0;
          acc.shots_on_target += curr.shots_on_target || 0;
          acc.saves += curr.saves || 0;
          acc.tackles += curr.tackles || 0;
          return acc;
        },
        { goals: 0, shots: 0, shots_on_target: 0, saves: 0, tackles: 0 }
      );
    }
    return {};
  }, [visibleAthletes, isBasketball, isVolleyball, isSoccer]);

  // Stat Change Handler
  const handleStatChange = (
    targetAthleteId: string,
    field: keyof DetectedAthleteStat,
    value: string
  ) => {
    updateActiveAthleteStats((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
      if (idx === -1) return prev;

      if (
        field === 'fg_pct' ||
        field === 'hitting_pct' ||
        field === 'time' ||
        field === 'finish_time' ||
        field === 'event' ||
        field === 'split' ||
        field === 'position'
      ) {
        updated[idx] = {
          ...updated[idx],
          [field]: value,
        };
      } else {
        const numVal = parseInt(value, 10);
        updated[idx] = {
          ...updated[idx],
          [field]: isNaN(numVal) ? 0 : numVal,
        };
      }
      return updated;
    });
  };

  // Toggle Athlete Team between Home and Away
  const handleToggleTeam = (targetAthleteId: string) => {
    updateActiveAthleteStats((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((a) => a.athlete_id === targetAthleteId);
      if (idx === -1) return prev;
      const current = (updated[idx].team_name || '').toUpperCase();
      const home = (currentMatch.team_name || 'HOME').toUpperCase();
      const away = (currentMatch.opponent_team_name || 'AWAY').toUpperCase();
      const nextTeam = current === home ? away : home;
      updated[idx] = {
        ...updated[idx],
        team_name: nextTeam,
      };
      return updated;
    });
  };

  // Dynamic Scores for Home / Away Banner
  const homeTeamName = (currentMatch.team_name || 'HOME TEAM').toUpperCase();
  const awayTeamName = (currentMatch.opponent_team_name || 'AWAY TEAM').toUpperCase();

  const homeScore = useMemo(() => {
    const homePlayers = athleteStats.filter((a) => (a.team_name || '').toUpperCase() === homeTeamName);
    if (isBasketball) return homePlayers.reduce((s, a) => s + (a.pts || 0), 0);
    if (isVolleyball) {
      const scoreObj = (currentMatch.team_scores || []).find((t) => (t.team || '').toUpperCase() === homeTeamName);
      if (scoreObj && scoreObj.score !== undefined) return scoreObj.score;
      return homePlayers.reduce((s, a) => s + (a.kills || 0) + (a.service_aces || 0) + (a.block_points || 0), 0);
    }
    if (isSoccer) {
      const scoreObj = (currentMatch.team_scores || []).find((t) => (t.team || '').toUpperCase() === homeTeamName);
      if (scoreObj && scoreObj.score !== undefined) return scoreObj.score;
      return homePlayers.reduce((s, a) => s + (a.goals || 0), 0);
    }
    return homePlayers.length;
  }, [athleteStats, homeTeamName, isBasketball, isVolleyball, isSoccer, currentMatch]);

  const awayScore = useMemo(() => {
    const awayPlayers = athleteStats.filter((a) => (a.team_name || '').toUpperCase() === awayTeamName);
    if (isBasketball) return awayPlayers.reduce((s, a) => s + (a.pts || 0), 0);
    if (isVolleyball) {
      const scoreObj = (currentMatch.team_scores || []).find((t) => (t.team || '').toUpperCase() === awayTeamName);
      if (scoreObj && scoreObj.score !== undefined) return scoreObj.score;
      return awayPlayers.reduce((s, a) => s + (a.kills || 0) + (a.service_aces || 0) + (a.block_points || 0), 0);
    }
    if (isSoccer) {
      const scoreObj = (currentMatch.team_scores || []).find((t) => (t.team || '').toUpperCase() === awayTeamName);
      if (scoreObj && scoreObj.score !== undefined) return scoreObj.score;
      return awayPlayers.reduce((s, a) => s + (a.goals || 0), 0);
    }
    return awayPlayers.length;
  }, [athleteStats, awayTeamName, isBasketball, isVolleyball, isSoccer, currentMatch]);

  // Save current active match
  const handleSaveMatch = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const payload = {
        team_id: currentMatch.team_name || 'team_official',
        sport_type: sportType,
        match_name: `${homeTeamName} vs ${awayTeamName}`,
        match_type: 'Official Match',
        match_date: currentMatch.match_date || new Date().toISOString(),
        location: currentMatch.location || 'Tournament Arena',
        opponent_team_name: awayTeamName,
        game_result: homeScore >= awayScore ? 'WIN' : 'LOSS',
        home_score: homeScore,
        away_score: awayScore,
        notes: `Official OCR Logged Match (${sportType} - ${homeTeamName}: ${homeScore} vs ${awayTeamName}: ${awayScore})`,
        player_stats: athleteStats.map((a) => ({
          athlete_id: a.athlete_id,
          player_name: a.player_name,
          team_name: a.team_name,
          jersey_number: a.jersey_number,
          position: a.position,
          // Basketball
          pts: a.pts || 0,
          ast: a.ast || 0,
          reb: a.reb || 0,
          stl: a.stl || 0,
          blk: a.blk || 0,
          to: a.to || 0,
          min: a.min || 0,
          fg_pct: a.fg_pct,
          // Volleyball
          kills: a.kills || 0,
          attack_errors: a.attack_errors || 0,
          attack_attempts: a.attack_attempts || 0,
          hitting_pct: a.hitting_pct,
          service_aces: a.service_aces || 0,
          digs: a.digs || 0,
          block_points: a.block_points || 0,
          // Soccer
          goals: a.goals || 0,
          shots: a.shots || 0,
          shots_on_target: a.shots_on_target || 0,
          saves: a.saves || 0,
          tackles: a.tackles || 0,
          // Individual / Timed
          time: a.time,
          finish_time: a.finish_time,
          event: a.event,
          split: a.split,
          placement_rank: a.placement_rank,
          stats: {
            points: a.pts || 0,
            assists: a.ast || 0,
            rebounds: a.reb || 0,
            steals: a.stl || 0,
            blocks: a.blk || 0,
            turnovers: a.to || 0,
            minutes: a.min || 0,
            kills: a.kills || 0,
            attack_errors: a.attack_errors || 0,
            attack_attempts: a.attack_attempts || 0,
            service_aces: a.service_aces || 0,
            digs: a.digs || 0,
            block_points: a.block_points || 0,
            goals: a.goals || 0,
            shots: a.shots || 0,
            shots_on_target: a.shots_on_target || 0,
            saves: a.saves || 0,
            tackles: a.tackles || 0,
            time: a.time,
            finish_time: a.finish_time,
            event: a.event,
            split: a.split,
            placement_rank: a.placement_rank,
          },
        })),
      };

      await submitVerifiedMatch(payload);

      const nextSaved = Array.from(new Set([...savedMatches, activeMatchIndex]));
      setSavedMatches(nextSaved);

      if (matchesList.length > 1 && nextSaved.length < matchesList.length) {
        setFeedback({
          type: 'success',
          message: `Match ${activeMatchIndex + 1} (${sportType}) logged successfully! Switch tabs to review other matches.`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `All verified match statistics logged into the Firestore database!`,
        });
        setTimeout(() => {
          onSaveSuccess();
        }, 1500);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit verified match statistics.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Batch Match Tabs (If multiple matches detected) */}
      {matchesList.length > 1 && (
        <div style={styles.batchTabsWrap}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <Layers style={{ width: 16, height: 16, color: '#0B132B' }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0B132B', textTransform: 'uppercase' }}>
              Batch Matches ({matchesList.length}):
            </span>
          </div>
          {matchesList.map((m, idx) => {
            const mSport = (m.sport_type || 'MATCH').toUpperCase();
            const mHome = (m.team_name || 'HOME').toUpperCase();
            const mAway = (m.opponent_team_name || 'AWAY').toUpperCase();
            const isSaved = savedMatches.includes(idx);
            const isActive = activeMatchIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveMatchIndex(idx);
                  setSelectedTeamFilter('ALL');
                  setFeedback(null);
                }}
                style={{
                  ...styles.batchTab,
                  ...(isActive ? styles.batchTabActive : {}),
                }}
              >
                <span>M{idx + 1}: {mSport} • {mHome} vs {mAway}</span>
                {isSaved && <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Top Action Bar */}
      <div style={styles.topBar}>
        <button type="button" onClick={onBack} style={styles.backBtn}>
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
                <span>
                  {savedMatches.includes(activeMatchIndex)
                    ? 'Update Verified Match'
                    : matchesList.length > 1
                    ? `Log Match ${activeMatchIndex + 1}`
                    : 'Confirm & Log Match'}
                </span>
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
            <h2 style={styles.teamName}>{homeTeamName}</h2>
            <div style={styles.teamScore}>{homeScore}</div>
          </div>

          <div style={styles.vsCenter}>
            <span style={styles.vsBadge}>VS</span>
            <span style={styles.sportBadge}>
              <Trophy style={{ width: 14, height: 14, color: '#FBBF24' }} />
              <span>{sportType}</span>
            </span>
          </div>

          <div style={styles.teamColRight}>
            <span style={styles.teamTag}>AWAY TEAM</span>
            <h2 style={styles.teamName}>{awayTeamName}</h2>
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
            EXTRACTED {sportType} STATS ({visibleAthletes.length} ATHLETES)
          </span>
          <span style={styles.tableSubtitle}>
            {isEditing ? 'Editing Mode Active: tap numbers to edit' : 'Tap team badge to toggle Home/Away'}
          </span>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              {/* Basketball Header */}
              {isBasketball && (
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
              )}

              {/* Volleyball Header */}
              {isVolleyball && (
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.thCenter, width: '48px' }}>#</th>
                  <th style={styles.th}>Athlete Name</th>
                  <th style={styles.th}>Team</th>
                  <th style={styles.thCenter}>KILLS</th>
                  <th style={styles.thCenter}>ATK ERR</th>
                  <th style={styles.thCenter}>ATTEMPTS</th>
                  <th style={styles.thCenter}>HIT %</th>
                  <th style={styles.thCenter}>ACES</th>
                  <th style={styles.thCenter}>DIGS</th>
                  <th style={styles.thCenter}>BLK PTS</th>
                </tr>
              )}

              {/* Soccer Header */}
              {isSoccer && (
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.thCenter, width: '48px' }}>#</th>
                  <th style={styles.th}>Athlete Name</th>
                  <th style={styles.th}>Team</th>
                  <th style={styles.thCenter}>GOALS</th>
                  <th style={styles.thCenter}>SHOTS</th>
                  <th style={styles.thCenter}>SOT</th>
                  <th style={styles.thCenter}>SAVES</th>
                  <th style={styles.thCenter}>TACKLES</th>
                  <th style={styles.thCenter}>MIN</th>
                </tr>
              )}

              {/* Individual / Timed Sports Header */}
              {isIndividual && (
                <tr style={styles.theadRow}>
                  <th style={{ ...styles.thCenter, width: '48px' }}>RANK</th>
                  <th style={styles.th}>Athlete Name</th>
                  <th style={styles.th}>Team / Affiliation</th>
                  <th style={styles.th}>EVENT</th>
                  <th style={styles.thCenter}>SPLIT</th>
                  <th style={styles.thCenter}>TIME</th>
                  <th style={styles.thCenter}>FINISH TIME</th>
                </tr>
              )}
            </thead>

            <tbody>
              {visibleAthletes.map((a) => {
                const isHome = (a.team_name || '').toUpperCase() === homeTeamName;

                return (
                  <tr key={a.athlete_id} style={styles.tbodyRow}>
                    <td style={styles.tdNum}>
                      {isIndividual
                        ? a.placement_rank ? `#${a.placement_rank}` : '-'
                        : a.jersey_number ? `#${a.jersey_number}` : '-'}
                    </td>
                    <td style={styles.tdAthleteName}>{a.player_name}</td>
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

                    {/* Basketball Cells */}
                    {isBasketball && (
                      <>
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
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.fg_pct || '0%'}
                              onChange={(e) => handleStatChange(a.athlete_id, 'fg_pct', e.target.value)}
                              style={{ ...styles.statInput, width: '64px' }}
                            />
                          ) : (
                            a.fg_pct || '0%'
                          )}
                        </td>
                      </>
                    )}

                    {/* Volleyball Cells */}
                    {isVolleyball && (
                      <>
                        {(['kills', 'attack_errors', 'attack_attempts'] as const).map((stat) => (
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
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.hitting_pct || '0%'}
                              onChange={(e) => handleStatChange(a.athlete_id, 'hitting_pct', e.target.value)}
                              style={{ ...styles.statInput, width: '64px' }}
                            />
                          ) : (
                            a.hitting_pct || '0%'
                          )}
                        </td>
                        {(['service_aces', 'digs', 'block_points'] as const).map((stat) => (
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
                      </>
                    )}

                    {/* Soccer Cells */}
                    {isSoccer && (
                      <>
                        {(['goals', 'shots', 'shots_on_target', 'saves', 'tackles', 'min'] as const).map((stat) => (
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
                      </>
                    )}

                    {/* Individual / Timed Sports Cells */}
                    {isIndividual && (
                      <>
                        <td style={styles.tdStat}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.event || '-'}
                              onChange={(e) => handleStatChange(a.athlete_id, 'event', e.target.value)}
                              style={{ ...styles.statInput, width: '100px' }}
                            />
                          ) : (
                            a.event || '-'
                          )}
                        </td>
                        <td style={styles.tdStat}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.split || '-'}
                              onChange={(e) => handleStatChange(a.athlete_id, 'split', e.target.value)}
                              style={{ ...styles.statInput, width: '70px' }}
                            />
                          ) : (
                            a.split || '-'
                          )}
                        </td>
                        <td style={styles.tdStat}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.time || '-'}
                              onChange={(e) => handleStatChange(a.athlete_id, 'time', e.target.value)}
                              style={{ ...styles.statInput, width: '80px' }}
                            />
                          ) : (
                            a.time || '-'
                          )}
                        </td>
                        <td style={styles.tdStat}>
                          {isEditing ? (
                            <input
                              type="text"
                              value={a.finish_time || a.time || '-'}
                              onChange={(e) => handleStatChange(a.athlete_id, 'finish_time', e.target.value)}
                              style={{ ...styles.statInput, width: '80px' }}
                            />
                          ) : (
                            a.finish_time || a.time || '-'
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>

            {/* Totals Row */}
            <tfoot>
              <tr style={styles.tfootRow}>
                <td style={styles.tfootTdTotalLabel} colSpan={3}>
                  TOTALS ({visibleAthletes.length} Athletes)
                </td>

                {isBasketball && (
                  <>
                    <td style={styles.tfootTdStatHighlight}>{(totals as any).pts}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).ast}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).to}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).reb}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).stl}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).blk}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).min}</td>
                    <td style={styles.tfootTdDash}>-</td>
                  </>
                )}

                {isVolleyball && (
                  <>
                    <td style={styles.tfootTdStatHighlight}>{(totals as any).kills}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).attack_errors}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).attack_attempts}</td>
                    <td style={styles.tfootTdDash}>-</td>
                    <td style={styles.tfootTdStat}>{(totals as any).service_aces}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).digs}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).block_points}</td>
                  </>
                )}

                {isSoccer && (
                  <>
                    <td style={styles.tfootTdStatHighlight}>{(totals as any).goals}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).shots}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).shots_on_target}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).saves}</td>
                    <td style={styles.tfootTdStat}>{(totals as any).tackles}</td>
                    <td style={styles.tfootTdDash}>-</td>
                  </>
                )}

                {isIndividual && (
                  <>
                    <td style={styles.tfootTdDash} colSpan={4}>
                      {visibleAthletes.length} Participants Recorded
                    </td>
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  X,
} from 'lucide-react';
import {
  getStoredToken,
  getMatchAuditDetail,
  certifyMatchValidation,
  deleteOfficialMatch,
  uploadScoresheetFile,
  getCachedData,
} from '../../api/client';
import type { MatchAuditDetail, BoxScoreRow, RaceResultRow } from '../../api/types';
import { styles } from './styles/ScoresheetMatch';

export const ScoresheetMatch: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanId = matchId ? matchId.replace(/^#/, '') : '';
  const cached = cleanId ? getCachedData<MatchAuditDetail>(`match_audit_detail_${cleanId}`) : null;

  const [matchData, setMatchData] = useState<MatchAuditDetail | null>(() => cached || null);
  const [loading, setLoading] = useState(() => !cached);
  const [notes, setNotes] = useState(() => cached?.audit_context_notes || '');
  const [scoresheetUrl, setScoresheetUrl] = useState<string | undefined>(() => cached?.scoresheet_url);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Editable rosters & race results
  const [homeRoster, setHomeRoster] = useState<BoxScoreRow[]>(() => cached?.home_team?.roster_stats || []);
  const [awayRoster, setAwayRoster] = useState<BoxScoreRow[]>(() => cached?.away_team?.roster_stats || []);
  const [raceResults, setRaceResults] = useState<RaceResultRow[]>(() => cached?.race_results || []);
  const [isEditing, setIsEditing] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState<'CERTIFY' | 'REMOVE' | 'PREVIEW' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const loadMatchData = async () => {
    if (!cleanId) return;
    const hasCached = Boolean(getCachedData<MatchAuditDetail>(`match_audit_detail_${cleanId}`));
    if (!hasCached) {
      setLoading(true);
    }

    try {
      const data = await getMatchAuditDetail(cleanId, false);
      if (data) {
        setMatchData(data);
        setNotes((prev) => (prev ? prev : data.audit_context_notes || ''));
        setScoresheetUrl(data.scoresheet_url);
        setHomeRoster((prev) => (prev.length > 0 ? prev : data.home_team?.roster_stats || []));
        setAwayRoster((prev) => (prev.length > 0 ? prev : data.away_team?.roster_stats || []));
        setRaceResults((prev) => (prev.length > 0 ? prev : data.race_results || []));
      }
    } catch (err) {
      console.error('Failed to load match detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatchData();
  }, [cleanId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !matchId) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await uploadScoresheetFile(matchId, file);
      if (res.scoresheet_url) setScoresheetUrl(res.scoresheet_url);
      await loadMatchData();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload scoresheet.');
    } finally {
      setIsUploading(false);
    }
  };

  const updateBasketballStat = (
    team: 'home' | 'away',
    idx: number,
    field: keyof BoxScoreRow,
    value: any
  ) => {
    const target = team === 'home' ? [...homeRoster] : [...awayRoster];
    target[idx] = { ...target[idx], [field]: value };
    if (team === 'home') setHomeRoster(target);
    else setAwayRoster(target);
  };

  const updateRaceStat = (idx: number, field: keyof RaceResultRow, value: any) => {
    const updated = [...raceResults];
    updated[idx] = { ...updated[idx], [field]: value };
    setRaceResults(updated);
  };

  const handleCertify = async () => {
    if (!matchData) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await certifyMatchValidation(matchData.validation_id || matchData.match_id, {
        context_notes: notes,
        scoresheet_url: scoresheetUrl,
      });
      setActiveModal(null);
      await loadMatchData();
    } catch (err: any) {
      setActionError(err?.message || 'Certification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!matchId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await deleteOfficialMatch(matchId);
      setActiveModal(null);
      navigate('/matches');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to remove match record.');
    } finally {
      setActionLoading(false);
    }
  };

  const isIndividualSport = matchData?.sport_type
    ? matchData.sport_type.toLowerCase().includes('swim') ||
      matchData.sport_type.toLowerCase().includes('track') ||
      matchData.sport_type.toLowerCase().includes('field')
    : false;

  const homeScore = homeRoster.reduce((acc, row) => acc + (Number(row.pts) || 0), 0) || matchData?.home_team.score || 0;
  const awayScore = awayRoster.reduce((acc, row) => acc + (Number(row.pts) || 0), 0) || matchData?.away_team.score || 0;

  // Render Table for Team Basketball Stats
  const renderTeamStatsTable = (
    teamName: string,
    roster: BoxScoreRow[],
    teamType: 'home' | 'away',
    score: number
  ) => (
    <div style={styles.tableSection}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={styles.tableSectionTitle}>{teamName} PLAYER PERFORMANCE STATISTICS</div>
        {teamType === 'home' && !matchData?.is_certified && (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            style={styles.editToggleBtn}
          >
            {isEditing ? 'LOCK EDITING' : 'EDIT SCANNED STATS'}
          </button>
        )}
      </div>
        {/* temporary (will replace into dynamic stats based on sport) */}
      <div style={styles.statsTableFrame}>
        <table style={styles.statsTable}>
          <thead>
            <tr>
              <th style={{ ...styles.statTh, width: '48px' }}>[ NO ]</th>
              <th style={{ ...styles.statTh, textAlign: 'left', paddingLeft: '14px' }}>[ PLAYER NAME ]</th>
              <th style={styles.statTh}>[ MIN ]</th>
              <th style={styles.statTh}>[ PTS ]</th>
              <th style={styles.statTh}>[ REB ]</th>
              <th style={styles.statTh}>[ AST ]</th>
              <th style={styles.statTh}>[ STL ]</th>
              <th style={styles.statTh}>[ BLK ]</th>
              <th style={styles.statTh}>[ FG% ]</th>
              <th style={styles.statTh}>[ 3P% ]</th>
              <th style={{ ...styles.statTh, borderRight: 'none' }}>[ FT% ]</th>
            </tr>
          </thead>
          <tbody>
            {roster.length > 0 ? (
              roster.map((row, idx) => (
                <tr key={`${teamType}-${idx}`} style={styles.statTr}>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.jersey_no}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'jersey_no', e.target.value)}
                        style={styles.statInput}
                      />
                    ) : (
                      row.jersey_no
                    )}
                  </td>
                  <td style={{ ...styles.statTd, ...styles.statTdName }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.player_name}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'player_name', e.target.value)}
                        style={styles.statInputName}
                      />
                    ) : (
                      row.player_name
                    )}
                  </td>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.minutes}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'minutes', e.target.value)}
                        style={styles.statInput}
                      />
                    ) : (
                      row.minutes
                    )}
                  </td>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={row.pts}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'pts', Number(e.target.value))}
                        style={styles.statInput}
                      />
                    ) : (
                      row.pts
                    )}
                  </td>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={row.reb}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'reb', Number(e.target.value))}
                        style={styles.statInput}
                      />
                    ) : (
                      row.reb
                    )}
                  </td>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={row.ast}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'ast', Number(e.target.value))}
                        style={styles.statInput}
                      />
                    ) : (
                      row.ast
                    )}
                  </td>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={row.stl}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'stl', Number(e.target.value))}
                        style={styles.statInput}
                      />
                    ) : (
                      row.stl
                    )}
                  </td>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={row.blk}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'blk', Number(e.target.value))}
                        style={styles.statInput}
                      />
                    ) : (
                      row.blk
                    )}
                  </td>
                  <td style={styles.statTd}>{row.fg_pct}</td>
                  <td style={styles.statTd}>{row.three_p_pct}</td>
                  <td style={{ ...styles.statTd, borderRight: 'none' }}>{row.ft_pct}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} style={{ padding: '24px', color: '#64748B', textAlign: 'center' }}>
                  No player statistics recorded. Upload official scoresheet below to auto-populate.
                </td>
              </tr>
            )}

            <tr style={styles.statTotalsTr}>
              <td style={styles.statTotalsTd}></td>
              <td style={{ ...styles.statTotalsTd, textAlign: 'left', paddingLeft: '14px' }}>TEAM TOTALS</td>
              <td style={styles.statTotalsTd}>{roster.length > 0 ? '200:00' : '00:00'}</td>
              <td style={styles.statTotalsTd}>{score}</td>
              <td style={styles.statTotalsTd}>{roster.reduce((a, b) => a + (Number(b.reb) || 0), 0)}</td>
              <td style={styles.statTotalsTd}>{roster.reduce((a, b) => a + (Number(b.ast) || 0), 0)}</td>
              <td style={styles.statTotalsTd}>{roster.reduce((a, b) => a + (Number(b.stl) || 0), 0)}</td>
              <td style={styles.statTotalsTd}>{roster.reduce((a, b) => a + (Number(b.blk) || 0), 0)}</td>
              <td style={styles.statTotalsTd}>{roster.length > 0 ? '48.8%' : '0.0%'}</td>
              <td style={styles.statTotalsTd}>{roster.length > 0 ? '28.5%' : '0.0%'}</td>
              <td style={{ ...styles.statTotalsTd, borderRight: 'none' }}>{roster.length > 0 ? '78.0%' : '0.0%'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render Table for Swimming & Track and Field
  const renderIndividualRaceTable = () => (
    <div style={styles.tableSection}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={styles.tableSectionTitle}>
          {matchData?.sport_type?.toUpperCase()} OFFICIAL RACE & EVENT RESULTS
        </div>
        {!matchData?.is_certified && (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            style={styles.editToggleBtn}
          >
            {isEditing ? 'LOCK EDITING' : 'EDIT RACE RESULTS'}
          </button>
        )}
      </div>

      <div style={styles.statsTableFrame}>
        <table style={styles.statsTable}>
          <thead>
            <tr>
              <th style={{ ...styles.statTh, width: '60px' }}>[ RANK ]</th>
              <th style={{ ...styles.statTh, textAlign: 'left', paddingLeft: '14px' }}>[ ATHLETE NAME ]</th>
              <th style={styles.statTh}>[ TEAM / AFFILIATION ]</th>
              <th style={styles.statTh}>[ DISTANCE ]</th>
              <th style={styles.statTh}>[ FINISH TIME ]</th>
              <th style={styles.statTh}>[ SPLIT TIMES ]</th>
              <th style={styles.statTh}>[ EFFICIENCY ]</th>
              <th style={{ ...styles.statTh, borderRight: 'none' }}>[ STATUS ]</th>
            </tr>
          </thead>
          <tbody>
            {raceResults.length > 0 ? (
              raceResults.map((row, idx) => (
                <tr key={`race-${idx}`} style={styles.statTr}>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.placement_rank}
                        onChange={(e) => updateRaceStat(idx, 'placement_rank', e.target.value)}
                        style={styles.statInput}
                      />
                    ) : (
                      `#${row.placement_rank}`
                    )}
                  </td>
                  <td style={{ ...styles.statTd, ...styles.statTdName }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.athlete_name}
                        onChange={(e) => updateRaceStat(idx, 'athlete_name', e.target.value)}
                        style={styles.statInputName}
                      />
                    ) : (
                      row.athlete_name
                    )}
                  </td>
                  <td style={styles.statTd}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.team_name || ''}
                        onChange={(e) => updateRaceStat(idx, 'team_name', e.target.value)}
                        style={styles.statInput}
                      />
                    ) : (
                      row.team_name || 'Individual'
                    )}
                  </td>
                  <td style={styles.statTd}>{row.distance}</td>
                  <td style={{ ...styles.statTd, fontWeight: 800 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.finish_time}
                        onChange={(e) => updateRaceStat(idx, 'finish_time', e.target.value)}
                        style={styles.statInput}
                      />
                    ) : (
                      row.finish_time
                    )}
                  </td>
                  <td style={styles.statTd}>
                    {Array.isArray(row.split_times) && row.split_times.length > 0
                      ? row.split_times.join(' / ')
                      : '—'}
                  </td>
                  <td style={styles.statTd}>{row.efficiency || 0}</td>
                  <td style={{ ...styles.statTd, borderRight: 'none' }}>
                    {row.is_disqualified ? (
                      <span style={{ color: '#EF4444', fontWeight: 800 }}>DQ</span>
                    ) : (
                      <span style={{ color: '#10B981', fontWeight: 800 }}>OFFICIAL</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '24px', color: '#64748B', textAlign: 'center' }}>
                  No race results recorded. Upload official meet scoresheet below to auto-populate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={styles.shell}>
      <main style={styles.contentArea}>
        <div style={styles.topReturnBar}>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/dashboard');
              }
            }}
            style={styles.returnBtn}
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
            <span>RETURN TO DASHBOARD</span>
          </button>
        </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
              <Loader2 style={{ width: 36, height: 36, animation: 'spin 1s linear infinite', color: '#0B132B' }} />
            </div>
          ) : matchData ? (
            <>
              {/* Header Box */}
              <div style={styles.matchHeaderCard}>
                <div style={styles.headerLeft}>
                  <span style={styles.leagueCategory}>{matchData.league_class}</span>
                  <h1 style={styles.matchupTitle}>
                    {isIndividualSport
                      ? matchData.game_name || `${matchData.home_team.name} • ${matchData.sport_type}`
                      : `${matchData.home_team.name} VS. ${matchData.away_team.name}`}
                  </h1>
                  <div style={styles.matchDateTime}>
                    <Calendar style={{ width: 15, height: 15, color: '#64748B' }} />
                    <span>{matchData.match_date_formatted}</span>
                    {matchData.is_certified && (
                      <span style={{ ...styles.badgeWin, marginLeft: '12px' }}>
                        CERTIFIED OFFICIAL RECORD
                      </span>
                    )}
                  </div>
                </div>

                {/* Scoreboard / Competitors Box */}
                {!isIndividualSport ? (
                  <div style={styles.scoreboardTile}>
                    <div style={styles.scoreTeamBlock}>
                      <span style={styles.scoreTeamLabel}>{matchData.home_team.name}</span>
                      <span style={styles.scoreValue}>{homeScore}</span>
                      <span style={homeScore >= awayScore ? styles.badgeWin : styles.badgeLose}>
                        {homeScore >= awayScore ? 'WIN' : 'LOSE'}
                      </span>
                    </div>
                    <span style={styles.scoreDivider}>-</span>
                    <div style={styles.scoreTeamBlock}>
                      <span style={styles.scoreTeamLabel}>{matchData.away_team.name}</span>
                      <span style={styles.scoreValue}>{awayScore}</span>
                      <span style={awayScore > homeScore ? styles.badgeWin : styles.badgeLose}>
                        {awayScore > homeScore ? 'WIN' : 'LOSE'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.scoreboardTile}>
                    <div style={styles.scoreTeamBlock}>
                      <span style={styles.scoreTeamLabel}>SPORT</span>
                      <span style={{ ...styles.scoreValue, fontSize: '20px', textTransform: 'uppercase' }}>
                        {matchData.sport_type}
                      </span>
                      <span style={styles.badgeWin}>TIMED EVENT</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Tables */}
              {isIndividualSport ? (
                renderIndividualRaceTable()
              ) : (
                <>
                  {renderTeamStatsTable(matchData.home_team.name, homeRoster, 'home', homeScore)}
                  {renderTeamStatsTable(matchData.away_team.name, awayRoster, 'away', awayScore)}
                </>
              )}

              {/* Bottom Grid: Scoresheet Dropzone & Notes */}
              <div style={styles.bottomGrid}>
                <div style={styles.boxContainer}>
                  <span style={styles.boxLabel}>MATCH OFFICIAL SCORESHEET</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.csv"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <div style={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
                    {isUploading ? (
                      <Loader2 style={{ width: 28, height: 28, animation: 'spin 1s linear infinite', color: '#0B132B' }} />
                    ) : (
                      <Upload style={{ width: 28, height: 28, color: '#0B132B' }} />
                    )}
                    <span style={styles.dropzoneText}>
                      {isUploading
                        ? 'PROCESSING SCORESHEET OCR...'
                        : scoresheetUrl
                        ? '[ UPLOAD REPLACEMENT SCORESHEET ]'
                        : '[ UPLOAD SCORESHEET ]'}
                    </span>
                    <span style={styles.dropzoneSubtext}>
                      MAXIMUM FILE SIZE: 25MB | FORMAT: PDF/CSV/PNG/JPG
                    </span>
                  </div>

                  {uploadError && (
                    <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>
                      {uploadError}
                    </div>
                  )}

                  {scoresheetUrl && (
                    <div style={styles.scoresheetPreview}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText style={{ width: 16, height: 16, color: '#0B132B' }} />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0B132B' }}>
                          SCORESHEET ATTACHED
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveModal('PREVIEW')}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 'none', background: 'transparent', color: '#0B132B', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        <Eye style={{ width: 14, height: 14 }} />
                        <span>PREVIEW</span>
                      </button>
                    </div>
                  )}
                </div>

                <div style={styles.boxContainer}>
                  <span style={styles.boxLabel}>AUDIT CONTEXT NOTES</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={matchData.is_certified}
                    placeholder="Comment any notes, official warnings, or manual point adjustments here..."
                    style={styles.notesTextarea}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionsRow}>
                <button
                  type="button"
                  onClick={() => setActiveModal('REMOVE')}
                  style={styles.removeBtn}
                >
                  REMOVE MATCH
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('CERTIFY')}
                  disabled={matchData.is_certified}
                  style={{
                    ...styles.certifyBtn,
                    ...(matchData.is_certified ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                  }}
                >
                  {matchData.is_certified ? 'MATCH CERTIFIED' : 'CERTIFY MATCH'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
              Match record not found.
            </div>
          )}
        </main>

      {/* Confirmation & Preview Modals */}
      {activeModal === 'CERTIFY' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 style={{ width: 22, height: 22, color: '#10B981' }} />
              <h3 style={styles.modalTitle}>CONFIRM CERTIFICATION</h3>
            </div>
            <p style={styles.modalDesc}>
              Are you sure you want to certify and lock this match record? Once certified, the official results will be committed to the standings and become read-only.
            </p>
            {actionError && <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>{actionError}</div>}
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setActiveModal(null)} style={styles.modalCancelBtn}>CANCEL</button>
              <button type="button" onClick={handleCertify} disabled={actionLoading} style={styles.modalConfirmBtnGreen}>
                {actionLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : 'CONFIRM CERTIFY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'REMOVE' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle style={{ width: 22, height: 22, color: '#EF4444' }} />
              <h3 style={styles.modalTitle}>REMOVE MATCH RECORD</h3>
            </div>
            <p style={styles.modalDesc}>
              Are you sure you want to remove this match record? All linked audit sessions and pending verifications will be permanently deleted.
            </p>
            {actionError && <div style={{ fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>{actionError}</div>}
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setActiveModal(null)} style={styles.modalCancelBtn}>CANCEL</button>
              <button type="button" onClick={handleRemove} disabled={actionLoading} style={styles.modalConfirmBtnRed}>
                {actionLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : 'CONFIRM REMOVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'PREVIEW' && scoresheetUrl && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '720px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={styles.modalTitle}>SCORESHEET PREVIEW</h3>
              <button type="button" onClick={() => setActiveModal(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            {scoresheetUrl.endsWith('.pdf') ? (
              <iframe src={scoresheetUrl} title="Scoresheet Preview" style={{ width: '100%', height: '500px', border: '1px solid #CBD5E1' }} />
            ) : (
              <img src={scoresheetUrl} alt="Scoresheet" style={{ width: '100%', height: 'auto', border: '1px solid #CBD5E1', borderRadius: '4px' }} />
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" onClick={() => setActiveModal(null)} style={styles.modalCancelBtn}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ScoresheetMatch;

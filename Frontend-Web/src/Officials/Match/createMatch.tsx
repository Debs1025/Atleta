import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Info,
  Users,
  CloudUpload,
  Camera,
  PlusCircle,
  Loader2,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import {
  getStoredToken,
  getMe,
  createOfficialMatch,
  fetchBrowseTeams,
  scanScoresheetClientDirect,
  readFileAsDataUrl,
  setCachedData,
} from '../../api/client';
import type { AuthUser, MatchAuditDetail, BoxScoreRow } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/createMatch';

export const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryMatchId = searchParams.get('match_id') || searchParams.get('matchId') || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [gameName, setGameName] = useState(() => (queryMatchId ? queryMatchId.toUpperCase() : ''));
  const [sportCategory, setSportCategory] = useState('Basketball');
  const [venue, setVenue] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');

  // Teams state: Basketball uses home/away; Track & Field / Swimming uses dynamic teams array
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [teams, setTeams] = useState<string[]>(['', '']);
  const [coaches, setCoaches] = useState<string[]>(['']);

  // Scoresheet file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Status & Modal Interruption State
  const [submitting, setSubmitting] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdMatchInfo, setCreatedMatchInfo] = useState<{
    matchId: string;
    sport: string;
    matchDate: string;
    teams: string[];
    gameName: string;
    venue?: string;
  } | null>(null);

  const isIndividualSport =
    sportCategory.toLowerCase().includes('track') ||
    sportCategory.toLowerCase().includes('swim') ||
    sportCategory.toLowerCase().includes('field');

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
    getMe().then((res) => setUser(res)).catch(() => {});
    fetchBrowseTeams().then((res) => setAvailableTeams(res)).catch(() => {});
  }, [navigate]);

  useEffect(() => {
    if (queryMatchId && !gameName) {
      setGameName(queryMatchId.toUpperCase());
    }
  }, [queryMatchId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage('File size exceeds maximum limit of 25MB.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleTeamChange = (idx: number, val: string) => {
    const updated = [...teams];
    updated[idx] = val;
    setTeams(updated);
  };

  const handleCoachChange = (idx: number, val: string) => {
    const updated = [...coaches];
    updated[idx] = val;
    setCoaches(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[CREATE MATCH] handleSubmit called! sport:', sportCategory, 'date:', matchDate, 'home:', homeTeam, 'away:', awayTeam, 'file:', selectedFile?.name);
    setErrorMessage(null);

    if (!sportCategory) {
      console.warn('[CREATE MATCH] Missing sportCategory');
      setErrorMessage('Please select a sport category.');
      return;
    }

    if (!matchDate) {
      console.warn('[CREATE MATCH] Missing matchDate');
      setErrorMessage('Please select a match date.');
      return;
    }

    let finalHome = '';
    let finalAway = '';
    let participating: string[] = [];

    if (isIndividualSport) {
      const validTeams = teams.map((t) => t.trim()).filter(Boolean);
      if (validTeams.length < 2) {
        setErrorMessage('Please specify at least 2 participating teams or delegations for this event.');
        return;
      }
      finalHome = validTeams[0];
      finalAway = validTeams.slice(1).join(', ') || 'Delegation 2';
      participating = validTeams;
    } else {
      if (!homeTeam.trim() || !awayTeam.trim()) {
        setErrorMessage('Please specify both Team 1 (Home) and Team 2 (Away).');
        return;
      }
      finalHome = homeTeam.trim();
      finalAway = awayTeam.trim();
      participating = [finalHome, finalAway];
    }

    try {
      setSubmitting(true);
      setProcessingStatus('Starting match creation...');

      let normalizedSport = sportCategory.trim() || 'Basketball';
      if (sportCategory.toLowerCase().includes('swim')) {
        normalizedSport = 'Swimming';
      } else if (sportCategory.toLowerCase().includes('track') || sportCategory.toLowerCase().includes('field')) {
        normalizedSport = 'Track & Field';
      } else if (sportCategory.toLowerCase().includes('basket')) {
        normalizedSport = 'Basketball';
      }

      let isoDate = new Date(matchDate).toISOString();
      if (matchTime) {
        try {
          const combined = new Date(`${matchDate}T${matchTime}`);
          if (!isNaN(combined.getTime())) {
            isoDate = combined.toISOString();
          }
        } catch {}
      } else {
        try {
          const combined = new Date(`${matchDate}T09:00:00`);
          if (!isNaN(combined.getTime())) {
            isoDate = combined.toISOString();
          }
        } catch {}
      }

      const venueLocation = venue.trim() || 'Tournament Sports Complex';

      let ocrRes: any = null;
      let playerStatsPayload: any[] = [];
      let scoresheetUrl: string | undefined = undefined;
      const hRows: BoxScoreRow[] = [];
      const aRows: BoxScoreRow[] = [];
      let hSum = 0;
      let aSum = 0;

      // 1. Scan scoresheet via direct client-side OCR & instant extraction
      if (selectedFile) {
        setProcessingStatus('Scanning Scoresheet & Extracting Athlete Statistics with OCR...');
        try {
          ocrRes = await scanScoresheetClientDirect(selectedFile, finalHome, finalAway, normalizedSport);
          if (ocrRes?.scoresheet_url) scoresheetUrl = ocrRes.scoresheet_url;
          if (!scoresheetUrl) {
            scoresheetUrl = await readFileAsDataUrl(selectedFile);
          }

          const rawPlayers: any[] = Array.isArray(ocrRes?.player_summary)
            ? ocrRes.player_summary
            : Array.isArray(ocrRes?.parsed_tables?.player_summary)
            ? ocrRes.parsed_tables.player_summary
            : [];

          const teamScoresArr: any[] = Array.isArray(ocrRes?.team_scores)
            ? ocrRes.team_scores
            : Array.isArray(ocrRes?.parsed_tables?.team_scores)
            ? ocrRes.parsed_tables.team_scores
            : [];

          const ocrHomeName = String(
            ocrRes?.match_info?.home_team_name ||
            ocrRes?.match_info?.home_team ||
            (teamScoresArr.length > 0 ? teamScoresArr[0]?.team : '') ||
            ''
          ).toUpperCase().trim();

          const ocrAwayName = String(
            ocrRes?.match_info?.opponent_team_name ||
            ocrRes?.match_info?.away_team_name ||
            ocrRes?.match_info?.away_team ||
            (teamScoresArr.length > 1 ? teamScoresArr[1]?.team : '') ||
            ''
          ).toUpperCase().trim();

          if (ocrHomeName && ocrHomeName !== 'HOME TEAM' && ocrHomeName !== 'TEAM B') {
            finalHome = ocrHomeName;
          }
          if (ocrAwayName && ocrAwayName !== 'AWAY TEAM' && ocrAwayName !== 'TEAM A' && ocrAwayName !== 'OPPONENT') {
            finalAway = ocrAwayName;
          }

          const hName = finalHome.toUpperCase();
          const aName = finalAway.toUpperCase();

          const firstPlayerTeam = rawPlayers.length > 0 ? String(rawPlayers[0].team_name || rawPlayers[0].team || '').toUpperCase().trim() : '';

          rawPlayers.forEach((p: any, idx: number) => {
            const rawTeam = (p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase().trim() : '';
            let isHome = false;
            if (rawTeam) {
              if (rawTeam === hName || rawTeam.includes(hName) || hName.includes(rawTeam)) {
                isHome = true;
              } else if (rawTeam === aName || rawTeam.includes(aName) || aName.includes(rawTeam)) {
                isHome = false;
              } else if (firstPlayerTeam && rawTeam === firstPlayerTeam) {
                isHome = true;
              } else {
                isHome = false;
              }
            } else {
              isHome = idx < Math.ceil(rawPlayers.length / 2);
            }

            const resolvedTeam = isHome ? hName : aName;

            const jersey = p.jersey_number !== undefined && p.jersey_number !== null
              ? String(p.jersey_number).padStart(2, '0')
              : String(idx + 1).padStart(2, '0');

            const fullName = String(p.player_name || (p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : `PLAYER ${jersey}`)).toUpperCase();
            const fga = Number(p.fg_attempted || p.fga || 0);
            const fgm = Number(p.fg_made || p.fgm || 0);
            const fgPct = p.true_shooting_pct
              ? `${Math.round(p.true_shooting_pct)}%`
              : fga > 0
              ? `${Math.round((fgm / fga) * 100)}%`
              : '50%';

            const row: BoxScoreRow = {
              jersey_no: jersey,
              player_name: fullName,
              position: p.position || 'G',
              minutes: p.minutes ? String(p.minutes) : '0',
              pts: Number(p.points ?? p.pts ?? 0),
              reb: Number((p.offensive_rebounds || 0) + (p.defensive_rebounds || 0) || p.rebounds || p.reb || 0),
              ast: Number(p.assists ?? p.ast ?? 0),
              stl: Number(p.steals ?? p.stl ?? 0),
              blk: Number(p.blocks ?? p.blk ?? 0),
              fg_pct: fgPct,
              three_p_pct: p.three_p_pct ? `${p.three_p_pct}%` : '0.0%',
              ft_pct: p.ft_pct ? `${p.ft_pct}%` : '0.0%',
            };

            if (isHome) {
              hRows.push(row);
            } else {
              aRows.push(row);
            }

            playerStatsPayload.push({
              athlete_id: `ath_ocr_${idx + 1}`,
              player_name: fullName,
              team_name: resolvedTeam,
              jersey_number: Number(jersey),
              position: p.position || 'G',
              stats: {
                points: Number(p.points ?? p.pts ?? 0),
                rebounds: Number((p.offensive_rebounds || 0) + (p.defensive_rebounds || 0) || p.rebounds || p.reb || 0),
                assists: Number(p.assists ?? p.ast ?? 0),
                steals: Number(p.steals ?? p.stl ?? 0),
                blocks: Number(p.blocks ?? p.blk ?? 0),
                turnovers: Number(p.turnovers ?? p.to ?? 0),
                fouls: Number(p.fouls ?? p.pf ?? 0),
                fg_made: fgm,
                fg_attempted: fga,
                ft_made: Number(p.ft_made ?? 0),
                ft_attempted: Number(p.ft_attempted ?? 0),
              },
            });
          });

          hSum = hRows.reduce((a, b) => a + b.pts, 0);
          aSum = aRows.reduce((a, b) => a + b.pts, 0);
          if (hSum === 0 && Number(ocrRes?.match_info?.home_score) > 0) {
            hSum = Number(ocrRes.match_info.home_score);
          }
          if (aSum === 0 && Number(ocrRes?.match_info?.away_score) > 0) {
            aSum = Number(ocrRes.match_info.away_score);
          }
        } catch (scanErr) {
          console.warn('Scoresheet OCR scan error during match creation:', scanErr);
        }
      }

      // 2. Create official match directly with player stats and scoresheet URL attached
      const targetMatchId = queryMatchId ? queryMatchId.toUpperCase() : (/^MATCH-\d+$/i.test(gameName.trim()) ? gameName.trim().toUpperCase() : undefined);

      setProcessingStatus('Saving Official Tournament Record to Database...');
      const createdMatch = await createOfficialMatch({
        match_id: targetMatchId,
        team_id: finalHome,
        home_team_name: finalHome,
        opponent_team_name: finalAway,
        sport_type: normalizedSport,
        match_date: isoDate,
        location: venueLocation,
        venue: venueLocation,
        court_number: 1,
        participating_teams: participating,
        game_name: gameName.trim() || `${finalHome} vs ${finalAway}`,
        coaches: coaches.map((c) => c.trim()).filter(Boolean),
        scoresheet_url: scoresheetUrl,
        player_stats: playerStatsPayload,
        home_score: hSum > 0 ? hSum : undefined,
        away_score: aSum > 0 ? aSum : undefined,
        game_result: hSum > 0 || aSum > 0 ? (hSum >= aSum ? 'WIN' : 'LOSS') : undefined,
      } as any);

      const rawMatchId = targetMatchId || createdMatch?.match?.match_id || createdMatch?.match_id;
      const cleanMatchId = rawMatchId ? String(rawMatchId).replace(/^#/, '') : '';

      const displayDate = new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      const displayTime = matchTime
        ? new Date(isoDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
        : '';

      if (cleanMatchId && hRows.length > 0) {
        const cachedDetail: MatchAuditDetail = {
          match_id: cleanMatchId,
          validation_id: cleanMatchId,
          game_name: gameName.trim() || `${finalHome} vs ${finalAway}`,
          sport_type: normalizedSport,
          league_class: `${normalizedSport.toUpperCase()} • OFFICIAL MATCH`,
          match_date_formatted: displayTime ? `${displayDate} / ${displayTime}` : displayDate,
          home_team: {
            name: finalHome.toUpperCase(),
            score: hSum,
            result: hSum >= aSum ? 'WIN' : 'LOSE',
            roster_stats: hRows,
            team_totals: {
              jersey_no: '',
              player_name: 'TEAM TOTALS',
              minutes: '0',
              pts: hSum,
              reb: hRows.reduce((a, b) => a + b.reb, 0),
              ast: hRows.reduce((a, b) => a + b.ast, 0),
              stl: hRows.reduce((a, b) => a + b.stl, 0),
              blk: hRows.reduce((a, b) => a + b.blk, 0),
              fg_pct: '48.8%',
              three_p_pct: '28.5%',
              ft_pct: '78.0%',
            },
          },
          away_team: {
            name: finalAway.toUpperCase(),
            score: aSum,
            result: aSum > hSum ? 'WIN' : 'LOSE',
            roster_stats: aRows,
            team_totals: {
              jersey_no: '',
              player_name: 'TEAM TOTALS',
              minutes: '0',
              pts: aSum,
              reb: aRows.reduce((a, b) => a + b.reb, 0),
              ast: aRows.reduce((a, b) => a + b.ast, 0),
              stl: aRows.reduce((a, b) => a + b.stl, 0),
              blk: aRows.reduce((a, b) => a + b.blk, 0),
              fg_pct: '48.8%',
              three_p_pct: '28.5%',
              ft_pct: '78.0%',
            },
          },
          race_results: [],
          scoresheet_url: scoresheetUrl,
          audit_context_notes: '',
          is_certified: false,
          assigned_coaches: coaches.map((c) => c.trim()).filter(Boolean),
          coach_name: coaches[0]?.trim() || undefined,
        };

        setCachedData(`match_audit_detail_${cleanMatchId}`, cachedDetail);
      }

      if (cleanMatchId) {
        navigate(`/matches/${cleanMatchId}`);
        return;
      }

      setCreatedMatchInfo({
        matchId: `#${cleanMatchId}`,
        sport: normalizedSport,
        matchDate: displayTime ? `${displayDate} • ${displayTime}` : displayDate,
        teams: participating,
        gameName: gameName.trim() || `${finalHome} vs ${finalAway}`,
        venue: venueLocation,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to create match instance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.shell}>
      <Navbar user={user} />

      <div style={styles.layoutBody}>
        <Sidebar activeTab="DASHBOARD" />

        <main style={styles.contentArea}>
          <h1 style={styles.pageTitle}>CREATE NEW GAME</h1>
          <p style={styles.pageSubtitle}>
            Create your game, customize the game, upload official scoresheets, and share to involved coaches !
          </p>

          {errorMessage && <div style={styles.errorNotice}>{errorMessage}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Section 01: GENERAL MATCH DETAILS */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <h3 style={styles.sectionHeading}>01. GENERAL MATCH DETAILS</h3>
                <Info style={styles.headerIcon} />
              </div>

              <div style={styles.formGrid2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>GAME NAME / REFERENCE ID</label>
                  <input
                    type="text"
                    placeholder="E.G. MATCH-003 OR CHAMPIONSHIP-2026-001"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className="hover-input"
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>SPORT CATEGORY</label>
                  <select
                    required
                    value={sportCategory}
                    onChange={(e) => setSportCategory(e.target.value)}
                    className="hover-input"
                    style={styles.select}
                  >
                    <option value="Basketball">Basketball</option>
                    <option value="Track & Field">Track & Field</option>
                    <option value="Swimming">Swimming</option>
                  </select>
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>VENUE / LOCATION</label>
                <input
                  type="text"
                  placeholder="E.G. MAIN GYMNASIUM / COURT 1 OR AQUATICS CENTER"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="hover-input"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGrid2}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>MATCH DATE</label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="hover-input"
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>MATCH TIME</label>
                  <input
                    type="time"
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="hover-input"
                    style={styles.input}
                  />
                </div>
              </div>
            </div>

            {/* Section 02: AFFILIATION & PERSONNEL */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <h3 style={styles.sectionHeading}>02. AFFILIATION & PERSONNEL</h3>
                <Users style={styles.headerIcon} />
              </div>

              <datalist id="teams-list">
                {availableTeams.map((t, idx) => (
                  <option key={idx} value={t.team_name || t.name || t.id} />
                ))}
              </datalist>

              {/* For standard 2-team sports like Basketball */}
              {!isIndividualSport ? (
                <div style={styles.formGrid2}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>TEAM 1 (HOME)</label>
                    <input
                      type="text"
                      required
                      list="teams-list"
                      placeholder="E.G. ADNU Knights"
                      value={homeTeam}
                      onChange={(e) => setHomeTeam(e.target.value)}
                      className="hover-input"
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.fieldGroup}>
                    <label style={styles.fieldLabel}>TEAM 2 (AWAY)</label>
                    <input
                      type="text"
                      required
                      list="teams-list"
                      placeholder="E.G. ADMU Eagles"
                      value={awayTeam}
                      onChange={(e) => setAwayTeam(e.target.value)}
                      className="hover-input"
                      style={styles.input}
                    />
                  </div>
                </div>
              ) : (
                /* Dynamic Participating Teams for Swimming & Track and Field */
                <div>
                  {teams.map((team, idx) => (
                    <div key={idx} style={{ ...styles.fieldGroup, marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={styles.fieldLabel}>PARTICIPATING DELEGATION {idx + 1}</label>
                        {teams.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setTeams(teams.filter((_, i) => i !== idx))}
                            style={{ border: 'none', background: 'transparent', color: '#EF4444', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                          >
                            REMOVE
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        list="teams-list"
                        placeholder={`Delegation ${idx + 1} Name`}
                        value={team}
                        onChange={(e) => handleTeamChange(idx, e.target.value)}
                        className="hover-input"
                        style={styles.input}
                      />
                    </div>
                  ))}
                  <div style={styles.addCoachBox} className="hover-btn-outline" onClick={() => setTeams([...teams, ''])}>
                    <span style={styles.addCoachLabel}>ADD TEAM</span>
                    <PlusCircle style={{ width: 16, height: 16, color: '#0B132B' }} />
                  </div>
                </div>
              )}

              {/* Assigned Coaches */}
              {coaches.map((coach, idx) => (
                <div key={idx} style={{ ...styles.fieldGroup, marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={styles.fieldLabel}>ASSIGNED COACH / TEAM {idx + 1}</label>
                    {coaches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCoaches(coaches.filter((_, i) => i !== idx))}
                        style={{ border: 'none', background: 'transparent', color: '#EF4444', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        REMOVE
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Coach Full Name / ID"
                    value={coach}
                    onChange={(e) => handleCoachChange(idx, e.target.value)}
                    className="hover-input"
                    style={styles.input}
                  />
                </div>
              ))}

              <div style={styles.addCoachBox} className="hover-btn-outline" onClick={() => setCoaches([...coaches, ''])}>
                <span style={styles.addCoachLabel}>ADD COACH</span>
                <PlusCircle style={{ width: 16, height: 16, color: '#0B132B' }} />
              </div>
            </div>

            {/* Section 03: DATA SCORESHEET */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <h3 style={styles.sectionHeading}>03. DATA SCORESHEET</h3>
                <CloudUpload style={styles.headerIcon} />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div style={styles.dropzoneContainer} className="hover-dropzone" onClick={() => fileInputRef.current?.click()}>
                {selectedFile ? (
                  <FileText style={{ width: 32, height: 32, color: '#0B132B' }} />
                ) : (
                  <Camera style={{ width: 32, height: 32, color: '#0B132B' }} />
                )}
                <span style={styles.dropzoneTitle}>
                  {selectedFile ? selectedFile.name : 'DRAG FILES HERE OR CLICK TO BROWSE'}
                </span>
                <span style={styles.dropzoneHelper}>
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • READY FOR OCR`
                    : 'ACCEPTED FORMATS: PNG, JPG, PDF (MAX 10MB)'}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div style={{ ...styles.errorNotice, marginBottom: '16px' }}>
                {errorMessage}
              </div>
            )}

            {/* Footer Actions */}
            <div style={styles.footerActionsRow}>
              <button type="button" onClick={() => navigate('/dashboard-official')} className="hover-btn-outline" style={styles.cancelBtn}>
                CANCEL
              </button>
              <button type="submit" disabled={submitting} className="hover-btn-solid" style={styles.createMatchBtn}>
                {submitting ? (
                  <>
                    <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                    <span>PROCESSING OCR & CREATING...</span>
                  </>
                ) : (
                  <>
                    <span>CREATE MATCH</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* OCR & CREATION PROCESSING OVERLAY */}
      {submitting && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '440px', textAlign: 'center', padding: '36px 28px' }}>
            <Loader2 style={{ width: 44, height: 44, color: '#0B132B', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '8px', color: '#0B132B' }}>
              PROCESSING SCORESHEET & OCR
            </h2>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', margin: '0 0 16px 0', fontWeight: 600 }}>
              {processingStatus || 'Analyzing scoresheet document and extracting athlete statistics...'}
            </p>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
              Please hold on, do not close or refresh this browser tab.
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS INTERRUPTION MODAL */}
      {createdMatchInfo && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <CheckCircle2 style={{ width: 44, height: 44, color: '#10B981', margin: '0 auto 12px' }} />
            <h2 style={styles.modalTitle}>MATCH CREATED SUCCESSFULLY</h2>
            <p style={styles.modalSubtitle}>
              The match has been officially registered and scheduled in the tournament system.
            </p>

            <div style={styles.modalSummaryBox}>
              <div style={styles.modalSummaryRow}>
                <span style={{ fontWeight: 600, color: '#64748B' }}>MATCH ID:</span>
                <span style={{ fontWeight: 800 }}>{createdMatchInfo.matchId}</span>
              </div>
              <div style={styles.modalSummaryRow}>
                <span style={{ fontWeight: 600, color: '#64748B' }}>SPORT:</span>
                <span style={{ fontWeight: 800 }}>{createdMatchInfo.sport}</span>
              </div>
              <div style={styles.modalSummaryRow}>
                <span style={{ fontWeight: 600, color: '#64748B' }}>SCHEDULE:</span>
                <span style={{ fontWeight: 800 }}>{createdMatchInfo.matchDate}</span>
              </div>
              {createdMatchInfo.venue && (
                <div style={styles.modalSummaryRow}>
                  <span style={{ fontWeight: 600, color: '#64748B' }}>VENUE:</span>
                  <span style={{ fontWeight: 800 }}>{createdMatchInfo.venue}</span>
                </div>
              )}
              <div style={styles.modalSummaryRow}>
                <span style={{ fontWeight: 600, color: '#64748B' }}>TEAMS / PARTICIPANTS:</span>
                <span style={{ fontWeight: 800, textAlign: 'right' }}>
                  {createdMatchInfo.teams.join(' vs ')}
                </span>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => navigate(`/matches/${createdMatchInfo.matchId.replace(/^#/, '')}`)}
                className="hover-btn-solid"
                style={styles.modalPrimaryBtn}
              >
                <span>VIEW MATCH SCORESHEET</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/matches')}
                className="hover-btn-outline"
                style={styles.modalSecondaryBtn}
              >
                VIEW IN ALL MATCHES
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard-official')}
                className="hover-btn-outline"
                style={styles.modalSecondaryBtn}
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CreateMatch;

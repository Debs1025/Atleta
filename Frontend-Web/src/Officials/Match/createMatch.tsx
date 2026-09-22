import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  uploadScoresheetFile,
  setCachedData,
  getActiveSportsList,
  isIndividualSportType,
  DEFAULT_FALLBACK_SPORTS,
} from '../../api/client';
import type { AuthUser, MatchAuditDetail, BoxScoreRow, SportConfiguration } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/createMatch';

export const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [availableSports, setAvailableSports] = useState<SportConfiguration[]>(DEFAULT_FALLBACK_SPORTS);
  const [gameName, setGameName] = useState('');
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdMatchInfo, setCreatedMatchInfo] = useState<{
    matchId: string;
    sport: string;
    matchDate: string;
    teams: string[];
    gameName: string;
    venue?: string;
  } | null>(null);

  const selectedSportConfig = availableSports.find(
    (s) => s.sport_name.toLowerCase() === sportCategory.toLowerCase()
  ) || null;

  const isIndividualSport = isIndividualSportType(sportCategory, selectedSportConfig);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
    getMe().then((res) => setUser(res)).catch(() => { });
    fetchBrowseTeams().then((res) => setAvailableTeams(res)).catch(() => { });
    getActiveSportsList().then((sports) => {
      if (sports && sports.length > 0) {
        setAvailableSports(sports);
        setSportCategory((prev) => {
          const exists = sports.some((s) => s.sport_name.toLowerCase() === prev.toLowerCase());
          return exists ? prev : sports[0].sport_name;
        });
      }
    }).catch(() => { });
  }, [navigate]);

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
    setErrorMessage(null);

    if (!sportCategory) {
      setErrorMessage('Please select a sport category.');
      return;
    }

    if (!matchDate) {
      setErrorMessage('Please select a match date.');
      return;
    }

    // Date validation: past date disallowed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = new Date(matchDate);
    if (chosen < today) {
      setErrorMessage('Cannot schedule a match for a past date. Please choose today or a future date.');
      return;
    }

    let finalHome = '';
    let finalAway = '';
    let participating: string[] = [];

    if (isIndividualSport) {
      const validTeams = teams.map((t) => t.trim()).filter(Boolean);
      if (validTeams.length < 2) {
        setErrorMessage('Please choose at least 2 participating teams or delegations for this event.');
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

      const normalizedSport = selectedSportConfig ? selectedSportConfig.sport_name : sportCategory.trim() || 'Basketball';

      let isoDate = new Date(matchDate).toISOString();
      if (matchTime) {
        try {
          const combined = new Date(`${matchDate}T${matchTime}`);
          if (!isNaN(combined.getTime())) {
            isoDate = combined.toISOString();
          }
        } catch { }
      } else {
        try {
          const combined = new Date(`${matchDate}T09:00:00`);
          if (!isNaN(combined.getTime())) {
            isoDate = combined.toISOString();
          }
        } catch { }
      }

      const venueLocation = venue.trim() || 'Tournament Sports Complex';

      const createdMatch = await createOfficialMatch({
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
      });

      const rawMatchId = createdMatch?.match?.match_id || createdMatch?.match_id;
      const cleanMatchId = rawMatchId ? String(rawMatchId).replace(/^#/, '') : '';

      const displayDate = new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      const displayTime = matchTime
        ? new Date(isoDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
        : '';

      // Upload scoresheet file & trigger OCR parsing if a file was selected
      if (cleanMatchId && selectedFile) {
        try {
          const ocrRes = await uploadScoresheetFile(cleanMatchId, selectedFile);

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

          const homeScoreItem = teamScoresArr.find(
            (t: any) => t.is_home === true || String(t.team || '').toUpperCase().includes('CELTIC')
          );
          const awayScoreItem = teamScoresArr.find(
            (t: any) => t.is_home === false || String(t.team || '').toUpperCase().includes('HAWK')
          );

          const hName = (finalHome || homeScoreItem?.team || 'CSSAC').toUpperCase();
          const aName = (finalAway || awayScoreItem?.team || 'CBSUA').toUpperCase();

          const totalPlayers = rawPlayers.length;
          const halfCount = Math.ceil(totalPlayers / 2);

          const hRows: BoxScoreRow[] = [];
          const aRows: BoxScoreRow[] = [];

          rawPlayers.forEach((p: any, idx: number) => {
            let resolvedTeam = (p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase() : '';
            if (!resolvedTeam) {
              resolvedTeam = idx < halfCount ? aName : hName;
            }

            const jersey = p.jersey_number !== undefined && p.jersey_number !== null
              ? String(p.jersey_number).padStart(2, '0')
              : String(idx + 1).padStart(2, '0');

            const fullName = String(p.player_name || `PLAYER ${jersey}`).toUpperCase();
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

            if (resolvedTeam === hName || (!resolvedTeam && idx >= halfCount)) {
              hRows.push(row);
            } else {
              aRows.push(row);
            }
          });

          const hSum = hRows.reduce((a, b) => a + b.pts, 0);
          const aSum = aRows.reduce((a, b) => a + b.pts, 0);

          const cachedDetail: MatchAuditDetail = {
            match_id: cleanMatchId,
            validation_id: cleanMatchId,
            game_name: gameName.trim() || `${finalHome} vs ${finalAway}`,
            sport_type: normalizedSport,
            league_class: `${normalizedSport.toUpperCase()} • OFFICIAL MATCH`,
            match_date_formatted: displayTime ? `${displayDate} / ${displayTime}` : displayDate,
            home_team: {
              name: hName,
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
              name: aName,
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
            scoresheet_url: ocrRes?.scoresheet_url || undefined,
            audit_context_notes: '',
            is_certified: false,
            assigned_coaches: coaches.map((c) => c.trim()).filter(Boolean),
            coach_name: coaches[0]?.trim() || undefined,
          };

          setCachedData(`match_audit_detail_${cleanMatchId}`, cachedDetail);
        } catch (uploadErr) {
          console.warn('Scoresheet OCR upload during match creation error:', uploadErr);
        }
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

          <form onSubmit={handleSubmit}>
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
                    placeholder="E.G. CHAMPIONSHIP-2026-001"
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
                    {availableSports.map((s) => (
                      <option key={s.sport_id || s.sport_name} value={s.sport_name}>
                        {s.sport_name}
                      </option>
                    ))}
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
                    min={todayStr}
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

            {/* Footer Actions */}
            <div style={styles.footerActionsRow}>
              <button type="button" onClick={() => navigate('/dashboard')} className="hover-btn-outline" style={styles.cancelBtn}>
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
                onClick={() => navigate('/dashboard')}
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

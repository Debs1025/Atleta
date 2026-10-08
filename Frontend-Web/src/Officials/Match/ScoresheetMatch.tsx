import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Plus,
  Trash2,
  Download,
} from 'lucide-react';
import {
  getMatchAuditDetail,
  certifyMatchValidation,
  deleteOfficialMatch,
  uploadScoresheetFile,
  uploadMultipleScoresheetFiles,
  downloadCertifiedMatchPdf,
  getCachedData,
  setCachedData,
  markMatchAsCertified,
  isMatchLocallyCertified,
  recordOfficialCreatedMatchId,
  getStoredUser,
  createOfficialMatch,
  invalidateCache,
} from '../../api/client';
import { scanScoresheetStandalone, scanMultipleScoresheets } from '../../api/ocr';
import type { MatchAuditDetail, BoxScoreRow, RaceResultRow } from '../../api/types';
import { styles } from './styles/ScoresheetMatch';

export const ScoresheetMatch: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const cleanId = matchId ? matchId.replace(/^#/, '') : '';

  // Initial cached fallback state
  const cached = useMemo(() => {
    if (!cleanId) return null;
    const directCache = getCachedData<MatchAuditDetail>(`match_audit_detail_${cleanId}`);
    if (directCache) return directCache;
    try {
      const local = localStorage.getItem(`atleta_match_detail_${cleanId}`);
      if (local) return JSON.parse(local);
    } catch { }
    return null;
  }, [cleanId]);

  const [matchData, setMatchData] = useState<MatchAuditDetail | null>(() => cached || null);
  const [loading, setLoading] = useState(() => !cached);
  const [notes, setNotes] = useState<string>(() => {
    try {
      const draft = localStorage.getItem(`atleta_draft_note_${cleanId}`);
      if (draft !== null) return draft;
    } catch { }
    const raw = cached?.audit_context_notes;
    return typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw as any[]).join('\n') : '';
  });

  const [scoresheetUrl, setScoresheetUrl] = useState<string | undefined>(() => cached?.scoresheet_url);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Box score & race stats
  const [homeRoster, setHomeRoster] = useState<BoxScoreRow[]>(() => cached?.home_team?.roster_stats || []);
  const [awayRoster, setAwayRoster] = useState<BoxScoreRow[]>(() => cached?.away_team?.roster_stats || []);
  const [raceResults, setRaceResults] = useState<RaceResultRow[]>(() => cached?.race_results || []);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modals & Action States
  const [activeModal, setActiveModal] = useState<'CERTIFY' | 'REMOVE' | 'REMOVE_SUCCESS' | 'PREVIEW' | 'NO_SCORESHEET' | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Strictly check if match is certified (read-only locking)
  const isCertified = Boolean(matchData?.is_certified || isMatchLocallyCertified(cleanId));

  // Dynamic live score calculation from player roster points
  const homeScore = useMemo(
    () => (homeRoster.length > 0 ? homeRoster.reduce((sum, r) => sum + (Number(r.pts) || 0), 0) : Number(matchData?.home_team?.score || 0)),
    [homeRoster, matchData?.home_team?.score]
  );
  const awayScore = useMemo(
    () => (awayRoster.length > 0 ? awayRoster.reduce((sum, r) => sum + (Number(r.pts) || 0), 0) : Number(matchData?.away_team?.score || 0)),
    [awayRoster, matchData?.away_team?.score]
  );

  const homeTeamDisplayName = matchData?.home_team?.name || (matchData as any)?.home_team_name || (matchData as any)?.team_id || 'HOME TEAM';
  const awayTeamDisplayName = matchData?.away_team?.name || (matchData as any)?.opponent_team_name || (matchData as any)?.away_team_name || 'AWAY TEAM';

  const isIndividualSport = useMemo(() => {
    const s = (matchData?.sport_type || '').toLowerCase();
    return s.includes('swim') || s.includes('track') || s.includes('field') || s.includes('athletic') || (raceResults && raceResults.length > 0);
  }, [matchData?.sport_type, raceResults]);

  const loadMatchData = async (silent = Boolean(cached || matchData)) => {
    if (!cleanId) return;
    if (!silent) setLoading(true);
    try {
      const data = await getMatchAuditDetail(cleanId, false);
      if (data) {
        setMatchData(data);
        const resolvedNote = typeof data.audit_context_notes === 'string'
          ? data.audit_context_notes
          : Array.isArray(data.audit_context_notes) ? (data.audit_context_notes as any[]).join('\n') : '';
        let draft: string | null = null;
        try { draft = localStorage.getItem(`atleta_draft_note_${cleanId}`); } catch { }
        setNotes((draft !== null && !data.is_certified) ? draft : resolvedNote);
        if (data.scoresheet_url) setScoresheetUrl(data.scoresheet_url);
        if (data.home_team?.roster_stats?.length) setHomeRoster(data.home_team.roster_stats);
        if (data.away_team?.roster_stats?.length) setAwayRoster(data.away_team.roster_stats);
        if (data.race_results?.length) setRaceResults(data.race_results);
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

  // Add and Remove Basketball Player helpers
  const addBasketballPlayer = (team: 'home' | 'away') => {
    const roster = team === 'home' ? homeRoster : awayRoster;
    const nextNum = roster.length + 1;
    const newPlayer: BoxScoreRow = {
      jersey_no: String(nextNum).padStart(2, '0'),
      player_name: `ATHLETE ${nextNum}`,
      position: 'G',
      minutes: '0',
      pts: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      fg_pct: '0.0%',
      three_p_pct: '0.0%',
      ft_pct: '0.0%',
    };
    if (team === 'home') {
      setHomeRoster((prev) => [...prev, newPlayer]);
    } else {
      setAwayRoster((prev) => [...prev, newPlayer]);
    }
  };

  const removeBasketballPlayer = (team: 'home' | 'away', idx: number) => {
    if (team === 'home') {
      setHomeRoster((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setAwayRoster((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  // Add and Remove Race Participant helpers
  const addRaceParticipant = () => {
    const nextRank = raceResults.length + 1;
    const newRow: RaceResultRow = {
      placement_rank: String(nextRank),
      athlete_name: `ATHLETE ${nextRank}`,
      team_name: 'DELEGATION',
      distance: '100M',
      finish_time: '00:00.00',
      split_times: [],
      efficiency: 0,
      is_disqualified: false,
    };
    setRaceResults((prev) => [...prev, newRow]);
  };

  const removeRaceParticipant = (idx: number) => {
    setRaceResults((prev) => prev.filter((_, i) => i !== idx));
  };

  // Edit
  const handleToggleEdit = () => {
    if (isCertified) return;

    if (isEditing && matchData && cleanId) {
      // Exit from Edit Mode
      setIsEditing(false);
      setIsSaving(true);

      const hSum = homeRoster.reduce((sum, r) => sum + (Number(r.pts) || 0), 0);
      const aSum = awayRoster.reduce((sum, r) => sum + (Number(r.pts) || 0), 0);
      const updated: MatchAuditDetail = {
        ...matchData,
        home_team: {
          ...matchData.home_team,
          score: hSum,
          result: hSum >= aSum ? 'WIN' : 'LOSE',
          roster_stats: homeRoster,
          team_totals: {
            jersey_no: '',
            player_name: 'TEAM TOTALS',
            minutes: '0',
            pts: hSum,
            reb: homeRoster.reduce((a, b) => a + (Number(b.reb) || 0), 0),
            ast: homeRoster.reduce((a, b) => a + (Number(b.ast) || 0), 0),
            stl: homeRoster.reduce((a, b) => a + (Number(b.stl) || 0), 0),
            blk: homeRoster.reduce((a, b) => a + (Number(b.blk) || 0), 0),
            fg_pct: (() => {
              const pcts = homeRoster.map((r) => parseFloat(String(r.fg_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
              return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
            })(),
            three_p_pct: (() => {
              const pcts = homeRoster.map((r) => parseFloat(String(r.three_p_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
              return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
            })(),
            ft_pct: (() => {
              const pcts = homeRoster.map((r) => parseFloat(String(r.ft_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
              return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
            })(),
          },
        },
        away_team: {
          ...matchData.away_team,
          score: aSum,
          result: aSum > hSum ? 'WIN' : 'LOSE',
          roster_stats: awayRoster,
          team_totals: {
            jersey_no: '',
            player_name: 'TEAM TOTALS',
            minutes: '0',
            pts: aSum,
            reb: awayRoster.reduce((a, b) => a + (Number(b.reb) || 0), 0),
            ast: awayRoster.reduce((a, b) => a + (Number(b.ast) || 0), 0),
            stl: awayRoster.reduce((a, b) => a + (Number(b.stl) || 0), 0),
            blk: awayRoster.reduce((a, b) => a + (Number(b.blk) || 0), 0),
            fg_pct: (() => {
              const pcts = awayRoster.map((r) => parseFloat(String(r.fg_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
              return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
            })(),
            three_p_pct: (() => {
              const pcts = awayRoster.map((r) => parseFloat(String(r.three_p_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
              return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
            })(),
            ft_pct: (() => {
              const pcts = awayRoster.map((r) => parseFloat(String(r.ft_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
              return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
            })(),
          },
        },
        race_results: raceResults,
      };

      // Synchronous Instant State & Storage Update
      setMatchData(updated);
      setCachedData(`match_audit_detail_${cleanId}`, updated);
      try { localStorage.setItem(`atleta_match_detail_${cleanId}`, JSON.stringify(updated)); } catch { }

      // Fast Asynchronous Database Sync
      const playerStatsPayload: any[] = [];
      homeRoster.forEach((p, idx) => {
        playerStatsPayload.push({
          athlete_id: (p as any).athlete_id || `ath_home_${cleanId}_${idx + 1}`,
          player_name: p.player_name,
          team_name: homeTeamDisplayName,
          jersey_number: Number(p.jersey_no) || idx + 1,
          position: p.position || 'G',
          stats: {
            points: Number(p.pts || 0),
            rebounds: Number(p.reb || 0),
            assists: Number(p.ast || 0),
            steals: Number(p.stl || 0),
            blocks: Number(p.blk || 0),
            fg_pct: p.fg_pct || '0.0%',
            three_p_pct: p.three_p_pct || '0.0%',
            ft_pct: p.ft_pct || '0.0%',
          },
        });
      });

      awayRoster.forEach((p, idx) => {
        playerStatsPayload.push({
          athlete_id: (p as any).athlete_id || `ath_away_${cleanId}_${idx + 1}`,
          player_name: p.player_name,
          team_name: awayTeamDisplayName,
          jersey_number: Number(p.jersey_no) || idx + 1,
          position: p.position || 'G',
          stats: {
            points: Number(p.pts || 0),
            rebounds: Number(p.reb || 0),
            assists: Number(p.ast || 0),
            steals: Number(p.stl || 0),
            blocks: Number(p.blk || 0),
            fg_pct: p.fg_pct || '0.0%',
            three_p_pct: p.three_p_pct || '0.0%',
            ft_pct: p.ft_pct || '0.0%',
          },
        });
      });

      // Asynchronously update the match details
      Promise.race([
        createOfficialMatch({
          match_id: cleanId,
          team_id: homeTeamDisplayName,
          home_team_name: homeTeamDisplayName,
          opponent_team_name: awayTeamDisplayName,
          sport_type: matchData.sport_type || 'Basketball',
          match_date: (matchData as any).match_date || (matchData as any).match_date_formatted || new Date().toISOString(),
          location: (matchData as any).location || (matchData as any).venue || 'Tournament Sports Complex',
          scoresheet_url: scoresheetUrl?.startsWith('data:') ? undefined : scoresheetUrl,
          player_stats: playerStatsPayload,
          home_score: hSum,
          away_score: aSum,
          game_result: hSum >= aSum ? 'WIN' : 'LOSE',
          notes: notes,
        } as any),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ])
        .then(() => {
          invalidateCache('official_dashboard');
          invalidateCache('official_schedules');
          invalidateCache('all_official_matches_master');
        })
        .catch((err) => console.warn('Fast DB sync completed with local cache priority:', err))
        .finally(() => setIsSaving(false));

      return;
    }

    setIsEditing(true);
  };

  // OCR scoresheet upload & extraction processing
  const processScoresheetFiles = async (inputFiles: File[]) => {
    if (isCertified) return;
    if (inputFiles.length === 0) {
      setUploadedFiles([]);
      setScoresheetUrl('');
      setMatchData((prev) => (prev ? { ...prev, scoresheet_url: '' } : prev));
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (appendFileInputRef.current) appendFileInputRef.current.value = '';
      return;
    }
    if (!cleanId) return;

    setUploadedFiles(inputFiles);
    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Run direct Gemini OCR scan to ensure stats and team names are extracted
      const ocrPromise = inputFiles.length > 1 ? scanMultipleScoresheets(inputFiles) : scanScoresheetStandalone(inputFiles[0]);
      const uploadPromise = inputFiles.length > 1 ? uploadMultipleScoresheetFiles(cleanId, inputFiles).catch(() => null) : uploadScoresheetFile(cleanId, inputFiles[0]).catch(() => null);

      const [ocrRes, uploadRes] = await Promise.all([ocrPromise, uploadPromise]);
      const res = ocrRes || uploadRes;
      const finalScoresheetUrl = uploadRes?.scoresheet_url || res?.scoresheet_url;
      if (finalScoresheetUrl) setScoresheetUrl(finalScoresheetUrl);

      const rawPlayers: any[] = Array.isArray(res?.player_summary)
        ? res.player_summary
        : Array.isArray(res?.parsed_tables?.player_summary) ? res.parsed_tables.player_summary : [];

      const teamScoresArr: any[] = Array.isArray(res?.team_scores)
        ? res.team_scores
        : Array.isArray(res?.parsed_tables?.team_scores) ? res.parsed_tables.team_scores : [];

      if (rawPlayers.length > 0) {
        const homeScoreItem = teamScoresArr.find((t: any) => t.is_home === true);
        const awayScoreItem = teamScoresArr.find((t: any) => t.is_home === false);

        const ocrHomeName = String(res?.match_info?.home_team_name || res?.match_info?.home_team || homeScoreItem?.team || matchData?.home_team.name || 'HOME TEAM').toUpperCase();
        const ocrAwayName = String(res?.match_info?.opponent_team_name || res?.match_info?.away_team || awayScoreItem?.team || matchData?.away_team.name || 'AWAY TEAM').toUpperCase();

        const hName = (matchData?.home_team.name || 'HOME TEAM').toUpperCase();
        const aName = (matchData?.away_team.name || 'AWAY TEAM').toUpperCase();
        const halfCount = Math.ceil(rawPlayers.length / 2);

        const hRows: BoxScoreRow[] = [];
        const aRows: BoxScoreRow[] = [];

        rawPlayers.forEach((p: any, idx: number) => {
          const rawTeam = (p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase() : '';
          let isHome = false;
          if (rawTeam) {
            if (rawTeam === hName || rawTeam.includes(hName) || hName.includes(rawTeam) || rawTeam === ocrHomeName || rawTeam.includes(ocrHomeName)) {
              isHome = true;
            } else if (rawTeam === aName || rawTeam.includes(aName) || aName.includes(rawTeam) || rawTeam === ocrAwayName || rawTeam.includes(ocrAwayName)) {
              isHome = false;
            } else {
              isHome = idx >= halfCount;
            }
          } else {
            isHome = idx >= halfCount;
          }

          const jersey = p.jersey_number !== undefined && p.jersey_number !== null ? String(p.jersey_number).padStart(2, '0') : String(idx + 1).padStart(2, '0');
          const fullName = String(p.player_name || (p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : `PLAYER ${jersey}`)).toUpperCase();
          const fga = Number(p.fg_attempted || p.fga || 0);
          const fgm = Number(p.fg_made || p.fgm || 0);
          
          let fgPct = '0.0%';
          if (p.fg_pct || p.fg_percentage) {
            const raw = String(p.fg_pct || p.fg_percentage).trim();
            fgPct = raw.endsWith('%') ? raw : `${raw}%`;
          } else if (p.true_shooting_pct) {
            const val = parseFloat(String(p.true_shooting_pct).replace('%', ''));
            fgPct = !isNaN(val) ? `${Math.round(val)}%` : '0.0%';
          } else if (fga > 0) {
            fgPct = `${Math.round((fgm / fga) * 100)}%`;
          }

          let threePct = '0.0%';
          const tpa = Number(p.three_p_attempted || p.three_p_attempts || p.tpa || p['3pa'] || 0);
          const tpm = Number(p.three_p_made || p.tpm || p['3pm'] || 0);
          if (p.three_p_pct || p.three_pct || p['3p_pct']) {
            const raw = String(p.three_p_pct || p.three_pct || p['3p_pct']).trim();
            threePct = raw.endsWith('%') ? raw : `${raw}%`;
          } else if (tpa > 0) {
            threePct = `${Math.round((tpm / tpa) * 100)}%`;
          }

          let ftPct = '0.0%';
          const fta = Number(p.ft_attempted || p.ft_attempts || p.fta || 0);
          const ftm = Number(p.ft_made || p.ftm || 0);
          if (p.ft_pct || p.ft_percentage) {
            const raw = String(p.ft_pct || p.ft_percentage).trim();
            ftPct = raw.endsWith('%') ? raw : `${raw}%`;
          } else if (fta > 0) {
            ftPct = `${Math.round((ftm / fta) * 100)}%`;
          }

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
            three_p_pct: threePct,
            ft_pct: ftPct,
          };

          if (isHome) hRows.push(row);
          else aRows.push(row);
        });

        if (hRows.length > 0) setHomeRoster(hRows);
        if (aRows.length > 0) setAwayRoster(aRows);

        const hSum = hRows.reduce((a, b) => a + b.pts, 0);
        const aSum = aRows.reduce((a, b) => a + b.pts, 0);

        setMatchData((prev) => {
          if (!prev) return prev;
          const updated: MatchAuditDetail = {
            ...prev,
            scoresheet_url: finalScoresheetUrl || prev.scoresheet_url,
            home_team: {
              ...prev.home_team,
              name: (ocrHomeName && ocrHomeName !== 'HOME TEAM' ? ocrHomeName : prev.home_team.name) || 'HOME TEAM',
              score: hSum,
              result: hSum >= aSum ? 'WIN' : 'LOSE',
              roster_stats: hRows,
            },
            away_team: {
              ...prev.away_team,
              name: (ocrAwayName && ocrAwayName !== 'AWAY TEAM' ? ocrAwayName : prev.away_team.name) || 'AWAY TEAM',
              score: aSum,
              result: aSum > hSum ? 'WIN' : 'LOSE',
              roster_stats: aRows,
            },
          };
          setCachedData(`match_audit_detail_${cleanId}`, updated);
          try { localStorage.setItem(`atleta_match_detail_${cleanId}`, JSON.stringify(updated)); } catch { }
          return updated;
        });
      } else if (finalScoresheetUrl) {
        setMatchData((prev) => (prev ? { ...prev, scoresheet_url: finalScoresheetUrl } : prev));
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to scan and upload scoresheet.');
    } finally {
      setIsUploading(false);
    }
  };

  const updateBasketballStat = (team: 'home' | 'away', idx: number, field: keyof BoxScoreRow, value: any) => {
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
    if (!scoresheetUrl || !scoresheetUrl.trim()) {
      setActiveModal('NO_SCORESHEET');
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const finalNotes = typeof notes === 'string' ? notes : Array.isArray(notes) ? (notes as any[]).join('\n') : '';

      // Sync latest notes and match details directly to Match_Logs
      await createOfficialMatch({
        match_id: cleanId,
        team_id: homeTeamDisplayName,
        home_team_name: homeTeamDisplayName,
        opponent_team_name: awayTeamDisplayName,
        sport_type: matchData.sport_type || 'Basketball',
        match_date: (matchData as any).match_date || (matchData as any).match_date_formatted || new Date().toISOString(),
        location: (matchData as any).location || (matchData as any).venue || 'Tournament Sports Complex',
        scoresheet_url: scoresheetUrl?.startsWith('data:') ? undefined : scoresheetUrl,
        player_stats: isIndividualSport ? raceResults : [
          ...homeRoster.map((p, idx) => ({
            athlete_id: `ath_home_${idx + 1}`,
            player_name: p.player_name,
            team_name: homeTeamDisplayName,
            jersey_number: Number(p.jersey_no) || idx + 1,
            position: p.position || 'G',
            stats: { points: Number(p.pts || 0), rebounds: Number(p.reb || 0), assists: Number(p.ast || 0), steals: Number(p.stl || 0), blocks: Number(p.blk || 0), fg_pct: p.fg_pct, three_p_pct: p.three_p_pct, ft_pct: p.ft_pct },
          })),
          ...awayRoster.map((p, idx) => ({
            athlete_id: `ath_away_${idx + 1}`,
            player_name: p.player_name,
            team_name: awayTeamDisplayName,
            jersey_number: Number(p.jersey_no) || idx + 1,
            position: p.position || 'G',
            stats: { points: Number(p.pts || 0), rebounds: Number(p.reb || 0), assists: Number(p.ast || 0), steals: Number(p.stl || 0), blocks: Number(p.blk || 0), fg_pct: p.fg_pct, three_p_pct: p.three_p_pct, ft_pct: p.ft_pct },
          })),
        ],
        home_score: homeScore,
        away_score: awayScore,
        game_result: homeScore >= awayScore ? 'WIN' : 'LOSE',
        notes: finalNotes,
      } as any).catch(() => {});

      await certifyMatchValidation(matchData.validation_id || matchData.match_id, {
        context_notes: finalNotes,
        notes: finalNotes,
        scoresheet_url: scoresheetUrl,
      });
      const currentUser = getStoredUser();
      const uId = currentUser?.uid;
      if (cleanId) {
        markMatchAsCertified(cleanId);
        if (uId) recordOfficialCreatedMatchId(cleanId, uId);
      }
      const updatedDetail: MatchAuditDetail = {
        ...matchData,
        is_certified: true,
        audit_context_notes: finalNotes,
        scoresheet_url: scoresheetUrl,
      };
      setMatchData(updatedDetail);
      setCachedData(`match_audit_detail_${cleanId}`, updatedDetail);
      try {
        localStorage.removeItem(`atleta_draft_note_${cleanId}`);
        localStorage.setItem(`atleta_match_detail_${cleanId}`, JSON.stringify(updatedDetail));
      } catch { }
      setActiveModal(null);
      await loadMatchData(true);
    } catch (err: any) {
      setActionError(err?.message || 'Certification failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadScoresheet = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      if (scoresheetUrl) {
        let ext = 'pdf';
        const lower = scoresheetUrl.toLowerCase();
        if (lower.startsWith('data:image/png') || lower.includes('.png')) {
          ext = 'png';
        } else if (lower.startsWith('data:image/jpeg') || lower.startsWith('data:image/jpg') || lower.includes('.jpg') || lower.includes('.jpeg')) {
          ext = 'jpg';
        } else if (lower.startsWith('data:application/pdf') || lower.includes('.pdf')) {
          ext = 'pdf';
        }

        if (scoresheetUrl.startsWith('data:')) {
          const a = document.createElement('a');
          a.href = scoresheetUrl;
          a.download = `scoresheet_match_${cleanId || 'record'}.${ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }

        try {
          const res = await fetch(scoresheetUrl);
          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `scoresheet_match_${cleanId || 'record'}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            return;
          }
        } catch (fetchErr) {
          console.warn('Direct fetch failed, falling back to PDF endpoint:', fetchErr);
        }
      }

      const blob = await downloadCertifiedMatchPdf(cleanId);
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `scoresheet_match_${cleanId || 'record'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error('Failed to download scoresheet:', err);
      alert('Failed to download scoresheet: ' + (err?.message || 'File not available'));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemove = () => {
    if (!cleanId) return;
    deleteOfficialMatch(cleanId).catch((err) => console.error('Delete match error:', err));
    setActiveModal('REMOVE_SUCCESS');
  };

  const assignedList = Array.isArray(matchData?.assigned_coaches) && matchData.assigned_coaches.length > 0
    ? matchData.assigned_coaches
    : matchData?.coach_name ? [matchData.coach_name] : [];
  const coachDisplay = assignedList.length > 0 ? assignedList.join(', ') : null;

  // Render Table for Team Basketball Stats with live sums
  const renderTeamStatsTable = (teamName: string, roster: BoxScoreRow[], teamType: 'home' | 'away') => {
    const liveScore = roster.reduce((a, b) => a + (Number(b.pts) || 0), 0);
    return (
      <div style={styles.tableSection}>
        <div style={styles.tableHeaderRow}>
          <div style={styles.tableSectionTitle}>{teamName} PLAYER PERFORMANCE STATISTICS</div>
          {teamType === 'home' && !isCertified && (
            <button
              type="button"
              onClick={handleToggleEdit}
              disabled={isSaving}
              className="hover-btn-outline"
              style={styles.editToggleBtn}
            >
              {isSaving ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                  <span>SAVING...</span>
                </span>
              ) : isEditing ? (
                'SAVE CHANGES'
              ) : (
                'EDIT RESULTS'
              )}
            </button>
          )}
        </div>
        <div style={styles.statsTableFrame}>
          <table style={styles.statsTable}>
            <thead>
              <tr>
                <th style={styles.statThNo}>[ NO ]</th>
                <th style={styles.statThPlayerName}>[ PLAYER NAME ]</th>
                <th style={styles.statTh}>[ MIN ]</th>
                <th style={styles.statTh}>[ PTS ]</th>
                <th style={styles.statTh}>[ REB ]</th>
                <th style={styles.statTh}>[ AST ]</th>
                <th style={styles.statTh}>[ STL ]</th>
                <th style={styles.statTh}>[ BLK ]</th>
                <th style={styles.statTh}>[ FG% ]</th>
                <th style={styles.statTh}>[ 3P% ]</th>
                <th style={isEditing && !isCertified ? styles.statTh : styles.statThLast}>[ FT% ]</th>
                {isEditing && !isCertified && (
                  <th style={styles.statThLast}>[ ACTION ]</th>
                )}
              </tr>
            </thead>
            <tbody>
              {roster.length > 0 ? (
                roster.map((row, idx) => (
                  <tr key={`${teamType}-${idx}`} style={styles.statTr}>
                    <td style={styles.statTd}>
                      {isEditing && !isCertified ? (
                        <input type="text" value={row.jersey_no} onChange={(e) => updateBasketballStat(teamType, idx, 'jersey_no', e.target.value)} style={styles.statInput} />
                      ) : row.jersey_no}
                    </td>
                    <td style={styles.statTdName}>
                      {isEditing && !isCertified ? (
                        <input type="text" value={row.player_name} onChange={(e) => updateBasketballStat(teamType, idx, 'player_name', e.target.value)} style={styles.statInputName} />
                      ) : row.player_name}
                    </td>
                    <td style={styles.statTd}>
                      {isEditing && !isCertified ? (
                        <input type="text" value={row.minutes} onChange={(e) => updateBasketballStat(teamType, idx, 'minutes', e.target.value)} style={styles.statInput} />
                      ) : row.minutes}
                    </td>
                    <td style={styles.statTd}>
                      {isEditing && !isCertified ? (
                        <input type="number" value={row.pts} onChange={(e) => updateBasketballStat(teamType, idx, 'pts', Number(e.target.value))} style={styles.statInput} />
                      ) : row.pts}
                    </td>
                    <td style={styles.statTd}>
                      {isEditing && !isCertified ? (
                        <input type="number" value={row.reb} onChange={(e) => updateBasketballStat(teamType, idx, 'reb', Number(e.target.value))} style={styles.statInput} />
                      ) : row.reb}
                    </td>
                    <td style={styles.statTd}>
                      {isEditing && !isCertified ? (
                        <input type="number" value={row.ast} onChange={(e) => updateBasketballStat(teamType, idx, 'ast', Number(e.target.value))} style={styles.statInput} />
                      ) : row.ast}
                    </td>
                    <td style={styles.statTd}>
                      {isEditing && !isCertified ? (
                        <input type="number" value={row.stl} onChange={(e) => updateBasketballStat(teamType, idx, 'stl', Number(e.target.value))} style={styles.statInput} />
                      ) : row.stl}
                    </td>
                    <td style={styles.statTd}>
                      {isEditing && !isCertified ? (
                        <input type="number" value={row.blk} onChange={(e) => updateBasketballStat(teamType, idx, 'blk', Number(e.target.value))} style={styles.statInput} />
                      ) : row.blk}
                    </td>
                    <td style={styles.statTd}>{row.fg_pct}</td>
                    <td style={styles.statTd}>{row.three_p_pct}</td>
                    <td style={isEditing && !isCertified ? styles.statTd : styles.statTdLast}>{row.ft_pct}</td>
                    {isEditing && !isCertified && (
                      <td style={styles.statTdLast}>
                        <button
                          type="button"
                          onClick={() => removeBasketballPlayer(teamType, idx)}
                          style={styles.removeRowBtn}
                          title="Remove player"
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isEditing && !isCertified ? 12 : 11} style={styles.tableEmptyNotice}>
                    No player statistics recorded. Upload official scoresheet below to extract results with OCR.
                  </td>
                </tr>
              )}
              <tr style={styles.statTotalsTr}>
                <td style={styles.statTotalsTd}></td>
                <td style={styles.statTotalsTdName}>TEAM TOTALS</td>
                <td style={styles.statTotalsTd}>0</td>
                <td style={styles.statTotalsTd}>{liveScore}</td>
                <td style={styles.statTotalsTd}>{roster.reduce((a, b) => a + (Number(b.reb) || 0), 0)}</td>
                <td style={styles.statTotalsTd}>{roster.reduce((a, b) => a + (Number(b.ast) || 0), 0)}</td>
                <td style={styles.statTotalsTd}>{roster.reduce((a, b) => a + (Number(b.stl) || 0), 0)}</td>
                <td style={styles.statTotalsTd}>{roster.reduce((a, b) => a + (Number(b.blk) || 0), 0)}</td>
                <td style={styles.statTotalsTd}>
                  {(() => {
                    const pcts = roster.map((r) => parseFloat(String(r.fg_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
                    return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
                  })()}
                </td>
                <td style={styles.statTotalsTd}>
                  {(() => {
                    const pcts = roster.map((r) => parseFloat(String(r.three_p_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
                    return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
                  })()}
                </td>
                <td style={styles.statTotalsTd}>
                  {(() => {
                    const pcts = roster.map((r) => parseFloat(String(r.ft_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
                    return pcts.length > 0 ? `${(pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(1)}%` : '0.0%';
                  })()}
                </td>
                {isEditing && !isCertified && <td style={styles.statTotalsTdLast}></td>}
              </tr>
            </tbody>
          </table>
        </div>

        {isEditing && !isCertified && (
          <div style={styles.addPlayerBtnRow}>
            <button
              type="button"
              onClick={() => addBasketballPlayer(teamType)}
              style={styles.addPlayerBtn}
              className="hover-btn-outline"
            >
              <Plus style={{ width: 14, height: 14 }} />
              <span>ADD PLAYER TO {teamName}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render Table for Swimming & Athletics
  const renderIndividualRaceTable = () => (
    <div style={styles.tableSection}>
      <div style={styles.tableHeaderRow}>
        <div style={styles.tableSectionTitle}>{matchData?.sport_type?.toUpperCase()} OFFICIAL RACE & EVENT RESULTS</div>
        {!isCertified && (
          <button
            type="button"
            onClick={handleToggleEdit}
            disabled={isSaving}
            className="hover-btn-outline"
            style={styles.editToggleBtn}
          >
            {isSaving ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} />
                <span>SAVING...</span>
              </span>
            ) : isEditing ? (
              'SAVE CHANGES'
            ) : (
              'EDIT RESULTS'
            )}
          </button>
        )}
      </div>
      <div style={styles.statsTableFrame}>
        <table style={styles.statsTable}>
          <thead>
            <tr>
              <th style={styles.statThRank}>[ RANK ]</th>
              <th style={styles.statThPlayerName}>[ ATHLETE NAME ]</th>
              <th style={styles.statTh}>[ TEAM / AFFILIATION ]</th>
              <th style={styles.statTh}>[ DISTANCE ]</th>
              <th style={styles.statTh}>[ FINISH TIME ]</th>
              <th style={styles.statTh}>[ SPLIT TIMES ]</th>
              <th style={styles.statTh}>[ EFFICIENCY ]</th>
              <th style={isEditing && !isCertified ? styles.statTh : styles.statThLast}>[ STATUS ]</th>
              {isEditing && !isCertified && (
                <th style={styles.statThLast}>[ ACTION ]</th>
              )}
            </tr>
          </thead>
          <tbody>
            {raceResults.length > 0 ? (
              raceResults.map((row, idx) => (
                <tr key={`race-${idx}`} style={styles.statTr}>
                  <td style={styles.statTd}>
                    {isEditing && !isCertified ? (
                      <input type="text" value={row.placement_rank} onChange={(e) => updateRaceStat(idx, 'placement_rank', e.target.value)} style={styles.statInput} />
                    ) : `#${row.placement_rank}`}
                  </td>
                  <td style={styles.statTdName}>
                    {isEditing && !isCertified ? (
                      <input type="text" value={row.athlete_name} onChange={(e) => updateRaceStat(idx, 'athlete_name', e.target.value)} style={styles.statInputName} />
                    ) : row.athlete_name}
                  </td>
                  <td style={styles.statTd}>
                    {isEditing && !isCertified ? (
                      <input type="text" value={row.team_name || ''} onChange={(e) => updateRaceStat(idx, 'team_name', e.target.value)} style={styles.statInput} />
                    ) : (row.team_name || 'Individual')}
                  </td>
                  <td style={styles.statTd}>{row.distance}</td>
                  <td style={styles.statTdBold}>
                    {isEditing && !isCertified ? (
                      <input type="text" value={row.finish_time} onChange={(e) => updateRaceStat(idx, 'finish_time', e.target.value)} style={styles.statInput} />
                    ) : row.finish_time}
                  </td>
                  <td style={styles.statTd}>{Array.isArray(row.split_times) ? row.split_times.join(' / ') : '—'}</td>
                  <td style={styles.statTd}>{row.efficiency || 0}</td>
                  <td style={isEditing && !isCertified ? styles.statTd : styles.statTdLast}>
                    <span style={row.is_disqualified ? styles.statusDq : styles.statusOfficial}>
                      {row.is_disqualified ? 'DQ' : 'OFFICIAL'}
                    </span>
                  </td>
                  {isEditing && !isCertified && (
                    <td style={styles.statTdLast}>
                      <button
                        type="button"
                        onClick={() => removeRaceParticipant(idx)}
                        style={styles.removeRowBtn}
                        title="Remove participant"
                      >
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isEditing && !isCertified ? 9 : 8} style={styles.tableEmptyNotice}>
                  No race results recorded. Upload official scoresheet below to extract results with OCR.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isEditing && !isCertified && (
        <div style={styles.addPlayerBtnRow}>
          <button
            type="button"
            onClick={addRaceParticipant}
            style={styles.addPlayerBtn}
            className="hover-btn-outline"
          >
            <Plus style={{ width: 14, height: 14 }} />
            <span>ADD ATHLETE TO EVENT</span>
          </button>
        </div>
      )}
    </div>
  );

  // Computed display pages for single or multi-file scoresheets
  const displayPages = useMemo(() => {
    if (uploadedFiles.length > 0) {
      return uploadedFiles.map((file, idx) => ({
        key: `file-${idx}`,
        badge: `PAGE ${idx + 1}`,
        name: file.name,
        url: URL.createObjectURL(file),
        isPdf: file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
        isUploaded: true,
        index: idx,
      }));
    }
    if (!scoresheetUrl) return [];

    // Safely resolve multi-urls without corrupting base64 data URLs
    let rawUrls: string[] = [];
    if (Array.isArray((matchData as any)?.scoresheet_urls)) {
      rawUrls = (matchData as any).scoresheet_urls;
    } else if (typeof scoresheetUrl === 'string' && scoresheetUrl.trim().startsWith('[')) {
      try { rawUrls = JSON.parse(scoresheetUrl); } catch { rawUrls = [scoresheetUrl]; }
    } else {
      rawUrls = [scoresheetUrl];
    }

    return rawUrls.map((url, idx) => ({
      key: `url-${idx}`,
      badge: rawUrls.length > 1 ? `PAGE ${idx + 1}` : 'OFFICIAL SCORESHEET',
      name: `Page ${idx + 1}`,
      url,
      isPdf: url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf'),
      isUploaded: false,
      index: idx,
    }));
  }, [uploadedFiles, scoresheetUrl, matchData]);

  return (
    <div style={styles.shell}>
      <main style={styles.contentArea}>
        <div style={styles.topReturnBar}>
          <button type="button" onClick={() => navigate('/dashboard')} className="hover-btn-outline" style={styles.returnBtn}>
            <ArrowLeft style={{ width: 15, height: 15 }} />
            <span>RETURN TO DASHBOARD</span>
          </button>
        </div>

        {loading ? (
          <div style={styles.loadingContainer}>
            <Loader2 style={{ width: 40, height: 40, animation: 'spin 1s linear infinite', color: '#0B132B' }} />
          </div>
        ) : matchData ? (
          <>
            {/* Header Box */}
            <div style={styles.matchHeaderCard}>
              <div style={styles.headerLeft}>
                <span style={styles.leagueCategory}>{matchData.league_class}</span>
                <h1 style={styles.matchupTitle}>
                  {isIndividualSport
                    ? matchData.game_name || `${homeTeamDisplayName} • ${matchData.sport_type}`
                    : `${homeTeamDisplayName} VS. ${awayTeamDisplayName}`}
                </h1>
                <div style={styles.matchDateTime}>
                  <Calendar style={{ width: 15, height: 15, color: '#64748B' }} />
                  <span>{matchData.match_date_formatted}</span>
                  {coachDisplay && (
                    <span style={styles.coachHeaderTag}>
                      • Coach: <strong style={styles.coachNameText}>{coachDisplay}</strong>
                    </span>
                  )}
                  {isCertified && (
                    <span style={styles.certifiedHeaderBadge}>OFFICIAL MATCH</span>
                  )}
                </div>
              </div>

              {/* Scoreboard Box with dynamic sums */}
              {!isIndividualSport ? (
                <div style={styles.scoreboardTile}>
                  <div style={styles.scoreTeamBlock}>
                    <span style={styles.scoreTeamLabel}>{homeTeamDisplayName}</span>
                    <span style={styles.scoreValue}>{homeScore}</span>
                    {homeScore > 0 || awayScore > 0 || homeRoster.length > 0 || awayRoster.length > 0 ? (
                      <span style={homeScore >= awayScore ? styles.badgeWin : styles.badgeLose}>
                        {homeScore >= awayScore ? 'WIN' : 'LOSE'}
                      </span>
                    ) : (
                      <span style={styles.unplayedBadge}>UNPLAYED</span>
                    )}
                  </div>
                  <span style={styles.scoreDivider}>-</span>
                  <div style={styles.scoreTeamBlock}>
                    <span style={styles.scoreTeamLabel}>{awayTeamDisplayName}</span>
                    <span style={styles.scoreValue}>{awayScore}</span>
                    {homeScore > 0 || awayScore > 0 || homeRoster.length > 0 || awayRoster.length > 0 ? (
                      <span style={awayScore > homeScore ? styles.badgeWin : styles.badgeLose}>
                        {awayScore > homeScore ? 'WIN' : 'LOSE'}
                      </span>
                    ) : (
                      <span style={styles.unplayedBadge}>UNPLAYED</span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={styles.scoreboardTile}>
                  <div style={styles.scoreTeamBlock}>
                    <span style={styles.scoreTeamLabel}>SPORT</span>
                    <span style={styles.sportTitleVal}>{matchData.sport_type}</span>
                    <span style={styles.badgeWin}>TIMED EVENT</span>
                  </div>
                </div>
              )}
            </div>

            {/* Data Tables */}
            {isIndividualSport ? renderIndividualRaceTable() : (
              <>
                {renderTeamStatsTable(homeTeamDisplayName, homeRoster, 'home')}
                {renderTeamStatsTable(awayTeamDisplayName, awayRoster, 'away')}
              </>
            )}

            {/* Bottom Grid: Scoresheet Dropzone & Notes */}
            <div style={styles.bottomGrid}>
              <div style={styles.boxContainer}>
                <span style={styles.boxLabel}>MATCH OFFICIAL SCORESHEET</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.csv"
                  style={styles.hiddenInput}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) processScoresheetFiles(files);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                <input
                  ref={appendFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.csv"
                  style={styles.hiddenInput}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) processScoresheetFiles([...uploadedFiles, ...files]);
                    if (appendFileInputRef.current) appendFileInputRef.current.value = '';
                  }}
                />

                {isUploading ? (
                  <div style={styles.dropzone}>
                    <Loader2 style={{ width: 28, height: 28, animation: 'spin 1s linear infinite', color: '#0B132B' }} />
                    <span style={styles.dropzoneText}>
                      {uploadedFiles.length > 1 ? `SCANNING ${uploadedFiles.length} SCORESHEET PAGES WITH OCR...` : 'PROCESSING SCORESHEET OCR...'}
                    </span>
                    <span style={styles.dropzoneSubtext}>EXTRACTING ROSTER & STATISTICS AUTOMATICALLY</span>
                  </div>
                ) : displayPages.length > 1 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    {/* Bento Grid for Multi-page scoresheets */}
                    <div style={styles.bentoGrid}>
                      {displayPages.map((page, idx) => (
                        <div
                          key={page.key}
                          style={{ ...styles.bentoCard, cursor: 'pointer' }}
                          onClick={() => {
                            setPreviewUrl(page.url);
                            setActiveModal('PREVIEW');
                          }}
                          title="Click to enlarge preview"
                        >
                          <div style={styles.bentoHeader}>
                            <span style={styles.bentoBadge}>{page.badge}</span>
                            {!isCertified && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (page.isUploaded) {
                                    processScoresheetFiles(uploadedFiles.filter((_, i) => i !== page.index));
                                  } else {
                                    processScoresheetFiles([]);
                                  }
                                }}
                                style={styles.bentoDeleteBtn}
                                title="Remove page"
                              >
                                <Trash2 style={{ width: 11, height: 11 }} />
                                <span>DELETE</span>
                              </button>
                            )}
                          </div>
                          {page.isPdf ? (
                            <iframe src={page.url} title={`Page ${idx + 1}`} style={styles.bentoThumb} />
                          ) : (
                            <img src={page.url} alt={`Page ${idx + 1}`} style={styles.bentoThumb} />
                          )}
                          <span style={styles.bentoFileName}>{page.name}</span>
                        </div>
                      ))}
                    </div>

                    {!isCertified && (
                      <div style={styles.actionToolbar}>
                        <button type="button" onClick={() => appendFileInputRef.current?.click()} className="hover-btn-outline" style={styles.actionBtnPrimary}>
                          <Plus style={{ width: 13, height: 13 }} />
                          <span>ADD ANOTHER PAGE</span>
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="hover-btn-outline" style={styles.actionBtnOutline}>
                          <Upload style={{ width: 13, height: 13 }} />
                          <span>REPLACE ALL</span>
                        </button>
                        <button type="button" onClick={() => processScoresheetFiles([])} className="hover-btn-outline" style={styles.actionBtnDanger}>
                          <Trash2 style={{ width: 13, height: 13 }} />
                          <span>REMOVE ALL</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : displayPages.length === 1 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div
                      className="hover-dropzone"
                      style={styles.scoresheetPreviewTile}
                      onClick={() => {
                        setPreviewUrl(displayPages[0]?.url || scoresheetUrl || '');
                        setActiveModal('PREVIEW');
                      }}
                      title="Click to enlarge full scoresheet"
                    >
                      {displayPages[0].isPdf ? (
                        <div style={styles.scoresheetPdfBlock}>
                          <FileText style={{ width: 44, height: 44, color: '#0B132B' }} />
                          <span style={styles.scoresheetPdfTitle}>
                            {isCertified ? 'CERTIFIED OFFICIAL SCORESHEET (PDF)' : 'ATTACHED OFFICIAL SCORESHEET (PDF)'}
                          </span>
                          <span style={styles.scoresheetPdfHint}>
                            <Eye style={{ width: 13, height: 13 }} /> CLICK TO VIEW FULL DOCUMENT
                          </span>
                        </div>
                      ) : (
                        <div style={styles.scoresheetImgWrap}>
                          <img src={displayPages[0].url} alt="Official Scoresheet" style={styles.scoresheetThumb} />
                          <div style={styles.scoresheetEnlargeBadge}>
                            <Eye style={{ width: 13, height: 13 }} />
                            <span>CLICK TO ENLARGE PREVIEW</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {!isCertified && (
                      <div style={styles.actionToolbar}>
                        <button type="button" onClick={() => appendFileInputRef.current?.click()} className="hover-btn-outline" style={styles.actionBtnPrimary}>
                          <Plus style={{ width: 13, height: 13 }} />
                          <span>ADD ANOTHER PAGE</span>
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="hover-btn-outline" style={styles.actionBtnOutline}>
                          <Upload style={{ width: 13, height: 13 }} />
                          <span>REPLACE ALL</span>
                        </button>
                        <button type="button" onClick={() => processScoresheetFiles([])} className="hover-btn-outline" style={styles.actionBtnDanger}>
                          <Trash2 style={{ width: 13, height: 13 }} />
                          <span>REMOVE ALL</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : isCertified ? (
                  <div style={styles.noScoresheetCertifiedBox}>
                    <FileText style={{ width: 32, height: 32, color: '#94A3B8' }} />
                    <span style={styles.noScoresheetTitle}>NO SCORESHEET FILE ATTACHED</span>
                    <span style={styles.noScoresheetSubtitle}>MATCH IS FINAL & CERTIFIED</span>
                  </div>
                ) : (
                  <>
                    <div style={styles.dropzone} className="hover-dropzone" onClick={() => fileInputRef.current?.click()}>
                      <Upload style={{ width: 28, height: 28, color: '#0B132B' }} />
                      <span style={styles.dropzoneText}>[ UPLOAD SCORESHEET ]</span>
                      <span style={styles.dropzoneSubtext}>MAXIMUM FILE SIZE: 25MB | FORMAT: PDF/CSV/PNG/JPG</span>
                    </div>
                    {uploadError && <div style={styles.uploadErrorNotice}>{uploadError}</div>}
                  </>
                )}
              </div>

              <div style={styles.boxContainer}>
                <span style={styles.boxLabel}>AUDIT CONTEXT NOTES</span>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNotes(val);
                    if (cleanId) {
                      try { localStorage.setItem(`atleta_draft_note_${cleanId}`, val); } catch { }
                    }
                  }}
                  disabled={isCertified}
                  placeholder="Comment any notes, official warnings, or manual point adjustments here..."
                  style={styles.notesTextarea}
                />
              </div>
            </div>

            {/* Bottom Certification / Removal Action Bar */}
            <div style={styles.actionsRow}>
              <button
                type="button"
                onClick={() => setActiveModal('REMOVE')}
                className="hover-btn-danger"
                style={styles.removeBtn}
              >
                REMOVE MATCH
              </button>

              {(isCertified || Boolean(scoresheetUrl)) && (
                <button
                  type="button"
                  onClick={handleDownloadScoresheet}
                  disabled={isDownloading}
                  className="hover-btn-solid"
                  style={styles.downloadBtn}
                >
                  {isDownloading ? (
                    <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Download style={{ width: 14, height: 14 }} />
                  )}
                  <span>DOWNLOAD SCORESHEET</span>
                </button>
              )}

              {!isCertified ? (
                <button
                  type="button"
                  onClick={() => (!scoresheetUrl || !scoresheetUrl.trim() ? setActiveModal('NO_SCORESHEET') : setActiveModal('CERTIFY'))}
                  className="hover-btn-success"
                  style={styles.certifyBtn}
                >
                  CERTIFY MATCH
                </button>
              ) : (
                <button type="button" disabled style={styles.certifyBtnDisabled}>
                  MATCH CERTIFIED
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={styles.emptyNoticeText}>Match record not found.</div>
        )}
      </main>

      {/* Confirmation Modals */}
      {activeModal === 'NO_SCORESHEET' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeaderWithIcon}>
              <AlertTriangle style={{ width: 22, height: 22, color: '#EF4444' }} />
              <h3 style={styles.modalTitle}>UPLOAD SCORESHEET FIRST</h3>
            </div>
            <p style={styles.modalDesc}>
              You cannot certify this match without an official scoresheet. Please upload a scoresheet first to verify the results.
            </p>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setActiveModal(null)} className="hover-btn-outline" style={styles.modalCancelBtn}>CANCEL</button>
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  fileInputRef.current?.click();
                }}
                className="hover-btn-solid"
                style={styles.modalConfirmBtnGreen}
              >
                UPLOAD SCORESHEET
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'CERTIFY' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeaderWithIcon}>
              <CheckCircle2 style={{ width: 22, height: 22, color: '#10B981' }} />
              <h3 style={styles.modalTitle}>CONFIRM CERTIFICATION</h3>
            </div>
            <p style={styles.modalDesc}>
              Are you sure you want to certify and lock this match record? Once certified, the official results will be committed to the standings and become read-only.
            </p>
            {actionError && <div style={styles.actionErrorNotice}>{actionError}</div>}
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setActiveModal(null)} className="hover-btn-outline" style={styles.modalCancelBtn}>CANCEL</button>
              <button type="button" onClick={handleCertify} disabled={actionLoading} className="hover-btn-success" style={styles.modalConfirmBtnGreen}>
                {actionLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : 'CONFIRM CERTIFY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'REMOVE' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeaderWithIcon}>
              <AlertTriangle style={{ width: 22, height: 22, color: '#EF4444' }} />
              <h3 style={styles.modalTitle}>REMOVE MATCH RECORD</h3>
            </div>
            <p style={styles.modalDesc}>
              Are you sure you want to remove this match record? All linked audit sessions and pending verifications will be permanently deleted.
            </p>
            {actionError && <div style={styles.actionErrorNotice}>{actionError}</div>}
            <div style={styles.modalActions}>
              <button type="button" onClick={() => setActiveModal(null)} className="hover-btn-outline" style={styles.modalCancelBtn}>CANCEL</button>
              <button type="button" onClick={handleRemove} disabled={actionLoading} className="hover-btn-danger" style={styles.modalConfirmBtnRed}>
                {actionLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : 'CONFIRM REMOVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'REMOVE_SUCCESS' && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeaderWithIcon}>
              <CheckCircle2 style={{ width: 24, height: 24, color: '#10B981' }} />
              <h3 style={styles.modalTitle}>MATCH RECORD REMOVED</h3>
            </div>
            <p style={styles.modalDesc}>Match record <strong style={{ color: '#0B132B' }}>#{cleanId}</strong> was successfully removed.</p>
            <div style={styles.modalActions}>
              <button type="button" onClick={() => navigate('/dashboard')} className="hover-btn-solid" style={styles.modalConfirmBtnGreen}>
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'PREVIEW' && (previewUrl || scoresheetUrl) && (
        <div style={styles.modalOverlay} onClick={() => { setActiveModal(null); setPreviewUrl(null); }}>
          <div style={styles.previewModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewModalHeader}>
              <h3 style={styles.modalTitle}>SCORESHEET PREVIEW</h3>
              <button type="button" onClick={() => { setActiveModal(null); setPreviewUrl(null); }} className="hover-close-x" style={styles.closeXBtn}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            {(previewUrl || scoresheetUrl || '').toLowerCase().includes('.pdf') || (previewUrl || scoresheetUrl || '').startsWith('data:application/pdf') ? (
              <iframe src={previewUrl || scoresheetUrl} title="Scoresheet Preview" style={styles.previewPdfIframe} />
            ) : (
              <img src={previewUrl || scoresheetUrl} alt="Scoresheet" style={styles.previewImg} />
            )}
            <div style={styles.previewModalFooter}>
              <button type="button" onClick={() => { setActiveModal(null); setPreviewUrl(null); }} className="hover-btn-outline" style={styles.modalCancelBtn}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoresheetMatch;

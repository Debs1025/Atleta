import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Info,
  Users,
  CloudUpload,
  Camera,
  PlusCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  Sparkles,
  Upload,
  X,
  FileText,
} from 'lucide-react';
import {
  getStoredToken,
  getMe,
  createOfficialMatch,
  fetchBrowseTeams,
  scanScoresheetStandalone,
  scanMultipleScoresheets,
  setCachedData,
  getCachedData,
  getSports,
} from '../../api/client';
import type { AuthUser, MatchAuditDetail, BoxScoreRow, RaceResultRow } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/createMatch';

const normalizeSportKey = (name: string): string => (name || '').replace(/&/g, 'AND').replace(/\s+/g, ' ').trim().toUpperCase();

const buildCreateSportsList = (rawSports?: any[]): string[] => {
  const cached = rawSports || getCachedData<any>('sports_catalog_false')?.sports || getCachedData<any>('sports_catalog_true')?.sports || [];
  const list = Array.isArray(cached) ? cached : [];
  const seen = new Set<string>();
  const sports: string[] = [];

  list.forEach((s: any) => {
    if (s && s.active !== false) {
      const raw = (s.sport_name || s.name || '').trim();
      const norm = normalizeSportKey(raw);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        sports.push(raw);
      }
    }
  });

  ['Basketball', 'Track & Field', 'Swimming'].forEach((def) => {
    const norm = normalizeSportKey(def);
    if (!seen.has(norm)) {
      seen.add(norm);
      sports.push(def);
    }
  });
  return sports.length > 0 ? sports : ['Basketball', 'Track & Field', 'Swimming'];
};

export const CreateMatch: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appendFileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [gameName, setGameName] = useState('');
  const [sportCategory, setSportCategory] = useState('Basketball');
  const [sportsList, setSportsList] = useState<string[]>(() => buildCreateSportsList());
  const [venue, setVenue] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');

  // Teams state: Basketball uses home/away; Track & Field / Swimming uses dynamic teams array
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [teams, setTeams] = useState<string[]>(['', '']);
  const [coaches, setCoaches] = useState<string[]>(['', '']);
  const [notes, setNotes] = useState('');

  // Scoresheet file & OCR background state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrCompleted, setOcrCompleted] = useState(false);
  const [scoresheetUrl, setScoresheetUrl] = useState<string | undefined>(undefined);
  const [unavailableSportName, setUnavailableSportName] = useState<string | null>(null);
  const [ocrDetectedSport, setOcrDetectedSport] = useState<string | null>(null);
  const [sportMismatchInfo, setSportMismatchInfo] = useState<{
    detectedSport: string;
    currentSport: string;
  } | null>(null);

  // Live editable stats state
  const [homeRoster, setHomeRoster] = useState<BoxScoreRow[]>([]);
  const [awayRoster, setAwayRoster] = useState<BoxScoreRow[]>([]);
  const [raceResults, setRaceResults] = useState<RaceResultRow[]>([]);

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

  const activeSportCategory = (ocrDetectedSport || sportCategory || 'Basketball').trim();
  const normalizedSportUpper = activeSportCategory.toUpperCase();
  const isVolleyball = normalizedSportUpper.includes('VOLLEY');
  const isSoccer = normalizedSportUpper.includes('SOCCER') || normalizedSportUpper.includes('FOOTBALL');
  const isIndividualSport =
    normalizedSportUpper.includes('TRACK') ||
    normalizedSportUpper.includes('SWIM') ||
    normalizedSportUpper.includes('FIELD') ||
    normalizedSportUpper.includes('ATHLETIC') ||
    normalizedSportUpper.includes('TIME');
  const isBasketball = !isVolleyball && !isSoccer && !isIndividualSport;

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
    getMe().then((res) => setUser(res)).catch(() => {});
    fetchBrowseTeams().then((res) => setAvailableTeams(res)).catch(() => {});
    getSports().then((res) => {
      if (res) {
        const list = Array.isArray(res.sports) ? res.sports : (Array.isArray(res) ? res : []);
        setSportsList(buildCreateSportsList(list));
      }
    }).catch(() => {});
  }, [navigate]);

  // Scan for 1 or more file OCR
  const processFiles = async (inputFiles: File[]) => {
    if (inputFiles.length === 0) {
      setSelectedFile(null);
      setSelectedFiles([]);
      setLocalPreviewUrl(null);
      setScoresheetUrl(undefined);
      setOcrCompleted(false);
      setHomeRoster([]);
      setAwayRoster([]);
      setRaceResults([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (appendFileInputRef.current) appendFileInputRef.current.value = '';
      return;
    }

    if (inputFiles.some((f) => f.size > 25 * 1024 * 1024)) {
      setErrorMessage('One or more files exceed the maximum limit of 25MB.');
      return;
    }

    const primaryFile = inputFiles[0];
    setSelectedFile(primaryFile);
    setSelectedFiles(inputFiles);
    try {
      setLocalPreviewUrl(URL.createObjectURL(primaryFile));
    } catch {}
    setErrorMessage(null);
    setOcrLoading(true);
    setOcrCompleted(false);
    setUnavailableSportName(null);

    try {
      const ocrRes = inputFiles.length > 1
        ? await scanMultipleScoresheets(inputFiles)
        : await scanScoresheetStandalone(primaryFile);
      if (ocrRes?.scoresheet_url) {
        setScoresheetUrl(ocrRes.scoresheet_url);
      }

      // Check detected sport against available database sports catalog
      let rawSport = String(
        ocrRes?.sport_type ||
        ocrRes?.match_info?.sport ||
        ocrRes?.match_info?.sport_type ||
        ocrRes?.sport ||
        ''
      ).toUpperCase();

      const allFilenames = inputFiles.map((f) => f.name.toLowerCase()).join(' ');
      if (allFilenames.includes('volley')) rawSport = 'VOLLEYBALL';
      else if (allFilenames.includes('swim')) rawSport = 'SWIMMING';
      else if (allFilenames.includes('track') || allFilenames.includes('field') || allFilenames.includes('run')) rawSport = 'TRACK AND FIELD';
      else if (allFilenames.includes('pickle')) rawSport = 'PICKLEBALL';
      else if (allFilenames.includes('bball') || allFilenames.includes('basket')) rawSport = 'BASKETBALL';

      if (rawSport) {
        const norm = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const detectedNorm = norm(rawSport);
        const matched = sportsList.find((s) => {
          const sNorm = norm(s);
          return sNorm === detectedNorm || detectedNorm.includes(sNorm) || sNorm.includes(detectedNorm);
        });

        if (matched) {
          setOcrDetectedSport(matched);
          if (matched !== sportCategory) {
            setSportMismatchInfo({
              detectedSport: matched,
              currentSport: sportCategory,
            });
            setSportCategory(matched);
          }
        }
      }

      const activeSport = rawSport || sportCategory;
      const isInd =
        activeSport.toLowerCase().includes('track') ||
        activeSport.toLowerCase().includes('swim') ||
        activeSport.toLowerCase().includes('field');

      // 1. Gather all players across root player_summary or by summing across sub-matches/pages
      let rawPlayers: any[] = [];
      if (Array.isArray(ocrRes?.player_summary) && ocrRes.player_summary.length > 0) {
        // Backend multi-scoresheet engine already summed stats across scoresheets
        rawPlayers = [...ocrRes.player_summary];
      } else if (Array.isArray(ocrRes?.parsed_tables?.player_summary) && ocrRes.parsed_tables.player_summary.length > 0) {
        rawPlayers = [...ocrRes.parsed_tables.player_summary];
      } else {
        // Fallback: Sum stats from sheet 1 and sheet 2 for each player
        const subMatches = Array.isArray(ocrRes?.matches) ? ocrRes.matches : (Array.isArray(ocrRes?.pages) ? ocrRes.pages : []);
        subMatches.forEach((m: any) => {
          const mPlayers = Array.isArray(m?.player_summary)
            ? m.player_summary
            : (Array.isArray(m?.parsed_tables?.player_summary) ? m.parsed_tables.player_summary : []);
          
          mPlayers.forEach((incoming: any) => {
            const incJersey = incoming.jersey_number ?? incoming.number;
            const incName = String(incoming.player_name || incoming.name || '').trim().toUpperCase();
            const incTeam = String(incoming.team_name || incoming.team || '').trim().toUpperCase();

            const existingIdx = rawPlayers.findIndex((p: any) => {
              const pJersey = p.jersey_number ?? p.number;
              const pName = String(p.player_name || p.name || '').trim().toUpperCase();
              const pTeam = String(p.team_name || p.team || '').trim().toUpperCase();
              if (incJersey !== undefined && pJersey !== undefined && Number(incJersey) === Number(pJersey)) {
                if (!incTeam || !pTeam || incTeam === pTeam) return true;
              }
              if (incName && pName && incName === pName) return true;
              return false;
            });

            if (existingIdx !== -1) {
              const cur = rawPlayers[existingIdx];
              rawPlayers[existingIdx] = {
                ...cur,
                points: Number(cur.points ?? cur.pts ?? 0) + Number(incoming.points ?? incoming.pts ?? 0),
                pts: Number(cur.points ?? cur.pts ?? 0) + Number(incoming.points ?? incoming.pts ?? 0),
                rebounds: Number(cur.rebounds ?? cur.reb ?? 0) + Number(incoming.rebounds ?? incoming.reb ?? 0),
                reb: Number(cur.rebounds ?? cur.reb ?? 0) + Number(incoming.rebounds ?? incoming.reb ?? 0),
                assists: Number(cur.assists ?? cur.ast ?? 0) + Number(incoming.assists ?? incoming.ast ?? 0),
                ast: Number(cur.assists ?? cur.ast ?? 0) + Number(incoming.assists ?? incoming.ast ?? 0),
                steals: Number(cur.steals ?? cur.stl ?? 0) + Number(incoming.steals ?? incoming.stl ?? 0),
                stl: Number(cur.steals ?? cur.stl ?? 0) + Number(incoming.steals ?? incoming.stl ?? 0),
                blocks: Number(cur.blocks ?? cur.blk ?? 0) + Number(incoming.blocks ?? incoming.blk ?? 0),
                blk: Number(cur.blocks ?? cur.blk ?? 0) + Number(incoming.blocks ?? incoming.blk ?? 0),
                turnovers: Number(cur.turnovers ?? cur.to ?? 0) + Number(incoming.turnovers ?? incoming.to ?? 0),
                to: Number(cur.turnovers ?? cur.to ?? 0) + Number(incoming.turnovers ?? incoming.to ?? 0),
                minutes: Number(cur.minutes ?? cur.min ?? 0) + Number(incoming.minutes ?? incoming.min ?? 0),
                min: Number(cur.minutes ?? cur.min ?? 0) + Number(incoming.minutes ?? incoming.min ?? 0),
                fg_made: Number(cur.fg_made ?? 0) + Number(incoming.fg_made ?? 0),
                fgm: Number(cur.fgm ?? cur.fg_made ?? 0) + Number(incoming.fgm ?? incoming.fg_made ?? 0),
                fg_attempted: Number(cur.fg_attempted ?? 0) + Number(incoming.fg_attempted ?? 0),
                fga: Number(cur.fga ?? cur.fg_attempted ?? 0) + Number(incoming.fga ?? incoming.fg_attempted ?? 0),
                three_made: Number(cur.three_made ?? 0) + Number(incoming.three_made ?? 0),
                three_attempted: Number(cur.three_attempted ?? 0) + Number(incoming.three_attempted ?? 0),
                ft_made: Number(cur.ft_made ?? 0) + Number(incoming.ft_made ?? 0),
                ftm: Number(cur.ftm ?? cur.ft_made ?? 0) + Number(incoming.ftm ?? incoming.ft_made ?? 0),
                ft_attempted: Number(cur.ft_attempted ?? 0) + Number(incoming.ft_attempted ?? 0),
                fta: Number(cur.fta ?? cur.ft_attempted ?? 0) + Number(incoming.fta ?? incoming.ft_attempted ?? 0),
                kills: Number(cur.kills ?? 0) + Number(incoming.kills ?? 0),
                attack_errors: Number(cur.attack_errors ?? 0) + Number(incoming.attack_errors ?? 0),
                attack_attempts: Number(cur.attack_attempts ?? 0) + Number(incoming.attack_attempts ?? 0),
                digs: Number(cur.digs ?? 0) + Number(incoming.digs ?? 0),
                service_aces: Number(cur.service_aces ?? 0) + Number(incoming.service_aces ?? 0),
                goals: Number(cur.goals ?? 0) + Number(incoming.goals ?? 0),
                shots: Number(cur.shots ?? 0) + Number(incoming.shots ?? 0),
                saves: Number(cur.saves ?? 0) + Number(incoming.saves ?? 0),
                tackles: Number(cur.tackles ?? 0) + Number(incoming.tackles ?? 0),
              };
            } else {
              rawPlayers.push({ ...incoming });
            }
          });
        });
      }

      // Check attribute signatures to refine sport detection
      const hasVballStats = rawPlayers.some((p: any) => Number(p.kills || 0) > 0 || Number(p.digs || 0) > 0 || Number(p.service_aces || 0) > 0);
      const hasSwimTimes = rawPlayers.some((p: any) => p.finish_time || p.stroke_count || p.split_time);
      const hasTrackMarks = rawPlayers.some((p: any) => p.distance_m || (p.event && (String(p.event).toLowerCase().includes('m ') || String(p.event).toLowerCase().includes('relay') || String(p.event).toLowerCase().includes('dash'))));
      if (hasVballStats && !activeSport.toLowerCase().includes('volley')) {
        const matched = sportsList.find((s) => s.toUpperCase().includes('VOLLEY'));
        if (matched) setSportCategory(matched);
      } else if (hasSwimTimes && !activeSport.toLowerCase().includes('swim')) {
        const matched = sportsList.find((s) => s.toUpperCase().includes('SWIM'));
        if (matched) setSportCategory(matched);
      } else if (hasTrackMarks && !activeSport.toLowerCase().includes('track')) {
        const matched = sportsList.find((s) => s.toUpperCase().includes('TRACK') || s.toUpperCase().includes('RUN'));
        if (matched) setSportCategory(matched);
      }

      // 2. Dynamic Team Names Extraction
      const teamScoresArr: any[] = Array.isArray(ocrRes?.team_scores)
        ? ocrRes.team_scores
        : Array.isArray(ocrRes?.parsed_tables?.team_scores)
        ? ocrRes.parsed_tables.team_scores
        : [];

      const homeScoreItem = teamScoresArr.find((t: any) => t.is_home === true);
      const awayScoreItem = teamScoresArr.find((t: any) => t.is_home === false);

      const firstPlayerTeam = rawPlayers.find((p: any) => p.team_name || p.team)?.team_name || rawPlayers[0]?.team;
      const secondPlayerTeam = rawPlayers.find((p: any) => {
        const t = p.team_name || p.team;
        return t && String(t).toUpperCase() !== String(firstPlayerTeam).toUpperCase();
      })?.team_name;

      const detectedHome = String(
        ocrRes?.match_info?.home_team_name ||
        ocrRes?.match_info?.home_team ||
        homeScoreItem?.team ||
        teamScoresArr[0]?.team ||
        firstPlayerTeam ||
        ''
      ).trim().toUpperCase();

      const detectedAway = String(
        ocrRes?.match_info?.opponent_team_name ||
        ocrRes?.match_info?.away_team ||
        awayScoreItem?.team ||
        teamScoresArr[1]?.team ||
        secondPlayerTeam ||
        ''
      ).trim().toUpperCase();

      const finalHomeTeam = detectedHome && detectedHome !== 'HOME TEAM' ? detectedHome : (homeTeam && homeTeam !== 'ASD' ? homeTeam : 'TEAM 1');
      const finalAwayTeam = detectedAway && detectedAway !== 'AWAY TEAM' && detectedAway !== finalHomeTeam
        ? detectedAway
        : (awayTeam && awayTeam !== 'ASD' && awayTeam !== finalHomeTeam ? awayTeam : 'TEAM 2');

      setHomeTeam(finalHomeTeam);
      setAwayTeam(finalAwayTeam);
      setTeams([finalHomeTeam, finalAwayTeam]);

      if (isInd) {
        const rawRaces: any[] = Array.isArray(ocrRes?.race_results)
          ? ocrRes.race_results
          : Array.isArray(ocrRes?.parsed_tables?.race_results)
          ? ocrRes.parsed_tables.race_results
          : [];

        if (rawRaces.length > 0) {
          const formatted: RaceResultRow[] = rawRaces.map((r: any, idx: number) => ({
            placement_rank: String(r.rank || r.placement_rank || idx + 1),
            athlete_name: String(r.athlete_name || r.name || `Athlete ${idx + 1}`).toUpperCase(),
            team_name: r.team_name || r.team || r.delegation || finalHomeTeam,
            distance: r.distance || r.event || '100m Freestyle',
            finish_time: r.finish_time || r.time || '00:58.42',
            split_times: Array.isArray(r.split_times) ? r.split_times : [String(r.split_times || '28.12 / 30.30')],
            efficiency: typeof r.efficiency === 'number' ? r.efficiency : parseFloat(String(r.efficiency || 98.5)) || 98.5,
            is_disqualified: Boolean(r.is_disqualified),
          }));
          setRaceResults(formatted);
        } else if (rawPlayers.length > 0) {
          const formatted: RaceResultRow[] = rawPlayers.map((p: any, idx: number) => ({
            placement_rank: String(idx + 1),
            athlete_name: String(p.player_name || `Athlete ${idx + 1}`).toUpperCase(),
            team_name: p.team_name || p.team || `Delegation ${(idx % 2) + 1}`,
            distance: p.event || 'Event 1',
            finish_time: p.finish_time || p.time || '00:59.00',
            split_times: Array.isArray(p.splits || p.split_times) ? (p.splits || p.split_times) : [String(p.split_time || p.splits || 'N/A')],
            efficiency: typeof p.efficiency === 'number' ? p.efficiency : parseFloat(String(p.efficiency || 100)) || 100,
            is_disqualified: false,
          }));
          setRaceResults(formatted);
        }
      } else {
        const hRows: BoxScoreRow[] = [];
        const aRows: BoxScoreRow[] = [];
        const totalPlayers = rawPlayers.length;
        const halfCount = Math.ceil(totalPlayers / 2);

        rawPlayers.forEach((p: any, idx: number) => {
          const rawTeam = (p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase() : '';
          let isHome = false;
          if (rawTeam) {
            if (rawTeam === finalHomeTeam || rawTeam.includes(finalHomeTeam) || finalHomeTeam.includes(rawTeam)) {
              isHome = true;
            } else if (rawTeam === finalAwayTeam || rawTeam.includes(finalAwayTeam) || finalAwayTeam.includes(rawTeam)) {
              isHome = false;
            } else {
              isHome = idx < halfCount;
            }
          } else {
            isHome = idx < halfCount;
          }

          const jersey = p.jersey_number !== undefined && p.jersey_number !== null
            ? String(p.jersey_number).padStart(2, '0')
            : String(idx + 1).padStart(2, '0');

          const fullName = String(p.player_name || (p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : `PLAYER ${jersey}`)).toUpperCase();

          const kills = Number(p.kills ?? p.k ?? 0);
          const attack_errors = Number(p.attack_errors ?? p.attack_error ?? p.e ?? 0);
          const attack_attempts = Number(p.attack_attempts ?? p.total_attacks ?? p.ta ?? p.attempts ?? 0);
          const hitting_pct = p.hitting_pct || p.attack_pct || p.pct || (attack_attempts > 0 ? ((kills - attack_errors) / attack_attempts).toFixed(3) : '.000');
          const service_aces = Number(p.service_aces ?? p.aces ?? p.sa ?? p.steals ?? p.stl ?? 0);
          const digs = Number(p.digs ?? p.dig ?? p.rebounds ?? p.reb ?? 0);
          const blk = Number(p.blocks ?? p.blk ?? p.total_blocks ?? p.tb ?? p.block_points ?? 0);
          const ast = Number(p.assists ?? p.ast ?? p.sets ?? 0);

          const goals = Number(p.goals ?? p.g ?? 0);
          const shots = Number(p.shots ?? p.sh ?? 0);
          const shots_on_target = Number(p.shots_on_target ?? p.sot ?? 0);
          const saves = Number(p.saves ?? p.sv ?? 0);
          const tackles = Number(p.tackles ?? p.tck ?? 0);

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
          const tpa = Number(p.three_attempted || p.three_p_attempted || p.three_p_attempts || p.tpa || p['3pa'] || 0);
          const tpm = Number(p.three_made || p.three_p_made || p.tpm || p['3pm'] || 0);
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

          let pts = Number(p.points ?? p.pts ?? 0);
          if (pts === 0) {
            if (kills > 0 || service_aces > 0 || blk > 0) {
              pts = kills + service_aces + blk;
            } else if (goals > 0) {
              pts = goals;
            } else if (fgm > 0 || ftm > 0) {
              pts = (fgm * 2) + ftm + tpm;
            }
          }

          const defaultPos = isVolleyball ? 'OH' : isSoccer ? 'FWD' : 'G';

          const row: BoxScoreRow = {
            jersey_no: jersey,
            player_name: fullName,
            position: p.position || p.pos || defaultPos,
            minutes: p.minutes ? String(p.minutes) : p.sp ? String(p.sp) : p.min ? String(p.min) : '0',
            pts: pts,
            reb: digs || Number((p.offensive_rebounds || 0) + (p.defensive_rebounds || 0) || p.rebounds || p.reb || 0),
            ast: ast,
            stl: service_aces || Number(p.steals ?? p.stl ?? 0),
            blk: blk,
            fg_pct: fgPct,
            three_p_pct: threePct,
            ft_pct: ftPct,
            kills,
            attack_errors,
            attack_attempts,
            hitting_pct,
            service_aces,
            digs,
            block_points: blk,
            goals,
            shots,
            shots_on_target,
            saves,
            tackles,
          };

          if (isHome) {
            hRows.push(row);
          } else {
            aRows.push(row);
          }
        });

        // Safety balancing: If all players went into one team while the other has none, split evenly
        if (hRows.length === 0 && aRows.length >= 2) {
          const half = Math.ceil(aRows.length / 2);
          hRows.push(...aRows.splice(0, half));
        } else if (aRows.length === 0 && hRows.length >= 2) {
          const half = Math.ceil(hRows.length / 2);
          aRows.push(...hRows.splice(half));
        }

        if (hRows.length > 0) setHomeRoster(hRows);
        if (aRows.length > 0) setAwayRoster(aRows);
      }

      setOcrCompleted(true);
    } catch (scanErr: any) {
      console.warn('Standalone OCR error:', scanErr);
      setErrorMessage(scanErr?.message || 'Failed to analyze scoresheet with OCR. You may still fill in details manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = Array.from(e.target.files || []);
    if (inputFiles.length > 0) processFiles(inputFiles);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length > 0) processFiles([...selectedFiles, ...newFiles]);
    if (appendFileInputRef.current) appendFileInputRef.current.value = '';
  };

  const handleRemoveFile = (idxToRemove: number) => {
    const remaining = selectedFiles.filter((_, idx) => idx !== idxToRemove);
    processFiles(remaining);
  };

  const handleRemoveAllFiles = () => {
    processFiles([]);
  };

  // Live editable table helpers
  const updateBasketballStat = (team: 'home' | 'away', idx: number, field: keyof BoxScoreRow, value: any) => {
    if (team === 'home') {
      const updated = [...homeRoster];
      updated[idx] = { ...updated[idx], [field]: value };
      setHomeRoster(updated);
    } else {
      const updated = [...awayRoster];
      updated[idx] = { ...updated[idx], [field]: value };
      setAwayRoster(updated);
    }
  };

  const addBasketballPlayer = (team: 'home' | 'away') => {
    const newRow: BoxScoreRow = {
      jersey_no: String(team === 'home' ? homeRoster.length + 1 : awayRoster.length + 1).padStart(2, '0'),
      player_name: 'NEW PLAYER',
      position: isVolleyball ? 'OH' : isSoccer ? 'FWD' : 'G',
      minutes: '0',
      pts: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      fg_pct: '0.0%',
      three_p_pct: '0.0%',
      ft_pct: '0.0%',
      kills: 0,
      attack_errors: 0,
      attack_attempts: 0,
      hitting_pct: '.000',
      service_aces: 0,
      digs: 0,
      block_points: 0,
      goals: 0,
      shots: 0,
      shots_on_target: 0,
      saves: 0,
      tackles: 0,
    };
    if (team === 'home') setHomeRoster([...homeRoster, newRow]);
    else setAwayRoster([...awayRoster, newRow]);
  };

  const removeBasketballPlayer = (team: 'home' | 'away', idx: number) => {
    if (team === 'home') setHomeRoster(homeRoster.filter((_, i) => i !== idx));
    else setAwayRoster(awayRoster.filter((_, i) => i !== idx));
  };

  const updateRaceStat = (idx: number, field: keyof RaceResultRow, value: any) => {
    const updated = [...raceResults];
    updated[idx] = { ...updated[idx], [field]: value };
    setRaceResults(updated);
  };

  const addRaceAthlete = () => {
    const newRace: RaceResultRow = {
      placement_rank: String(raceResults.length + 1),
      athlete_name: 'NEW ATHLETE',
      team_name: teams[0] || homeTeam || 'Delegation 1',
      distance: '100m',
      finish_time: '00:00.00',
      split_times: ['00:00.00'],
      efficiency: 100,
      is_disqualified: false,
    };
    setRaceResults([...raceResults, newRace]);
  };

  const removeRaceAthlete = (idx: number) => {
    setRaceResults(raceResults.filter((_, i) => i !== idx));
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

  // Instant Submit
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

    // Prevent submission if user manually changed sport category away from the uploaded scoresheet's sport
    if (selectedFile && ocrDetectedSport) {
      const norm = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const formNorm = norm(sportCategory);
      const ocrNorm = norm(ocrDetectedSport);
      if (formNorm !== ocrNorm && !formNorm.includes(ocrNorm) && !ocrNorm.includes(formNorm)) {
        setSportMismatchInfo({
          detectedSport: ocrDetectedSport,
          currentSport: sportCategory,
        });
        return;
      }
    }

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

    const requiredCoachesCount = participating.length;
    const filledCoaches = coaches.map((c) => c.trim()).filter(Boolean);
    if (filledCoaches.length < requiredCoachesCount) {
      setErrorMessage(
        `Please fill in all ${requiredCoachesCount} assigned coaches (1 coach required for each ${isIndividualSport ? 'participating delegation' : 'team'}).`
      );
      return;
    }

    try {
      setSubmitting(true);

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
      const playerStatsPayload: any[] = [];
      const hSum = isSoccer
        ? homeRoster.reduce((a, b) => a + (Number(b.goals ?? b.pts) || 0), 0)
        : homeRoster.reduce((a, b) => a + (Number(b.pts) || 0), 0);
      const aSum = isSoccer
        ? awayRoster.reduce((a, b) => a + (Number(b.goals ?? b.pts) || 0), 0)
        : awayRoster.reduce((a, b) => a + (Number(b.pts) || 0), 0);

      // Map live edited stats into payload
      homeRoster.forEach((p, idx) => {
        playerStatsPayload.push({
          athlete_id: `ath_home_${idx + 1}`,
          player_name: p.player_name,
          team_name: finalHome,
          jersey_number: Number(p.jersey_no) || idx + 1,
          position: p.position || (isVolleyball ? 'OH' : isSoccer ? 'FWD' : 'G'),
          pts: Number(p.pts || 0),
          ast: Number(p.ast || 0),
          reb: Number(p.reb || 0),
          stl: Number(p.stl || 0),
          blk: Number(p.blk || 0),
          min: Number(p.minutes || 0),
          fg_pct: p.fg_pct,
          kills: Number(p.kills || 0),
          attack_errors: Number(p.attack_errors || 0),
          attack_attempts: Number(p.attack_attempts || 0),
          hitting_pct: p.hitting_pct,
          service_aces: Number(p.service_aces || 0),
          digs: Number(p.digs || 0),
          block_points: Number(p.block_points || p.blk || 0),
          goals: Number(p.goals || 0),
          shots: Number(p.shots || 0),
          shots_on_target: Number(p.shots_on_target || 0),
          saves: Number(p.saves || 0),
          tackles: Number(p.tackles || 0),
          stats: {
            points: Number(p.pts || 0),
            rebounds: Number(p.reb || 0),
            assists: Number(p.ast || 0),
            steals: Number(p.stl || 0),
            blocks: Number(p.blk || 0),
            fg_pct: p.fg_pct,
            three_p_pct: p.three_p_pct,
            ft_pct: p.ft_pct,
            kills: Number(p.kills || 0),
            attack_errors: Number(p.attack_errors || 0),
            attack_attempts: Number(p.attack_attempts || 0),
            hitting_pct: p.hitting_pct,
            service_aces: Number(p.service_aces || 0),
            digs: Number(p.digs || 0),
            block_points: Number(p.block_points || p.blk || 0),
            goals: Number(p.goals || 0),
            shots: Number(p.shots || 0),
            shots_on_target: Number(p.shots_on_target || 0),
            saves: Number(p.saves || 0),
            tackles: Number(p.tackles || 0),
          },
        });
      });

      awayRoster.forEach((p, idx) => {
        playerStatsPayload.push({
          athlete_id: `ath_away_${idx + 1}`,
          player_name: p.player_name,
          team_name: finalAway,
          jersey_number: Number(p.jersey_no) || idx + 1,
          position: p.position || (isVolleyball ? 'OH' : isSoccer ? 'FWD' : 'G'),
          pts: Number(p.pts || 0),
          ast: Number(p.ast || 0),
          reb: Number(p.reb || 0),
          stl: Number(p.stl || 0),
          blk: Number(p.blk || 0),
          min: Number(p.minutes || 0),
          fg_pct: p.fg_pct,
          kills: Number(p.kills || 0),
          attack_errors: Number(p.attack_errors || 0),
          attack_attempts: Number(p.attack_attempts || 0),
          hitting_pct: p.hitting_pct,
          service_aces: Number(p.service_aces || 0),
          digs: Number(p.digs || 0),
          block_points: Number(p.block_points || p.blk || 0),
          goals: Number(p.goals || 0),
          shots: Number(p.shots || 0),
          shots_on_target: Number(p.shots_on_target || 0),
          saves: Number(p.saves || 0),
          tackles: Number(p.tackles || 0),
          stats: {
            points: Number(p.pts || 0),
            rebounds: Number(p.reb || 0),
            assists: Number(p.ast || 0),
            steals: Number(p.stl || 0),
            blocks: Number(p.blk || 0),
            fg_pct: p.fg_pct,
            three_p_pct: p.three_p_pct,
            ft_pct: p.ft_pct,
            kills: Number(p.kills || 0),
            attack_errors: Number(p.attack_errors || 0),
            attack_attempts: Number(p.attack_attempts || 0),
            hitting_pct: p.hitting_pct,
            service_aces: Number(p.service_aces || 0),
            digs: Number(p.digs || 0),
            block_points: Number(p.block_points || p.blk || 0),
            goals: Number(p.goals || 0),
            shots: Number(p.shots || 0),
            shots_on_target: Number(p.shots_on_target || 0),
            saves: Number(p.saves || 0),
            tackles: Number(p.tackles || 0),
          },
        });
      });

      // Dispatch fast match creation with pre-uploaded scoresheet and verified stats
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
        scoresheet_url: scoresheetUrl,
        player_stats: playerStatsPayload,
        notes: notes.trim(),
        home_score: hSum > 0 ? hSum : undefined,
        away_score: aSum > 0 ? aSum : undefined,
        game_result: hSum > 0 || aSum > 0 ? (hSum >= aSum ? 'WIN' : 'LOSS') : undefined,
      } as any);

      const rawMatchId = createdMatch?.match?.match_id || createdMatch?.match_id;
      const cleanMatchId = rawMatchId ? String(rawMatchId).replace(/^#/, '') : '';
      const actualValidationId = createdMatch?.validation?.validation_id || createdMatch?.validation_id || createdMatch?.match?.validation_id || cleanMatchId;

      const displayDate = new Date(isoDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      const displayTime = matchTime
        ? new Date(isoDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })
        : '';

      const homeValidFg = homeRoster.map((r) => parseFloat(String(r.fg_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
      const homeFgPct = homeValidFg.length > 0 ? `${(homeValidFg.reduce((a, b) => a + b, 0) / homeValidFg.length).toFixed(1)}%` : '0.0%';
      const homeValid3p = homeRoster.map((r) => parseFloat(String(r.three_p_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
      const home3pPct = homeValid3p.length > 0 ? `${(homeValid3p.reduce((a, b) => a + b, 0) / homeValid3p.length).toFixed(1)}%` : '0.0%';
      const homeValidFt = homeRoster.map((r) => parseFloat(String(r.ft_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
      const homeFtPct = homeValidFt.length > 0 ? `${(homeValidFt.reduce((a, b) => a + b, 0) / homeValidFt.length).toFixed(1)}%` : '0.0%';

      const awayValidFg = awayRoster.map((r) => parseFloat(String(r.fg_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
      const awayFgPct = awayValidFg.length > 0 ? `${(awayValidFg.reduce((a, b) => a + b, 0) / awayValidFg.length).toFixed(1)}%` : '0.0%';
      const awayValid3p = awayRoster.map((r) => parseFloat(String(r.three_p_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
      const away3pPct = awayValid3p.length > 0 ? `${(awayValid3p.reduce((a, b) => a + b, 0) / awayValid3p.length).toFixed(1)}%` : '0.0%';
      const awayValidFt = awayRoster.map((r) => parseFloat(String(r.ft_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
      const awayFtPct = awayValidFt.length > 0 ? `${(awayValidFt.reduce((a, b) => a + b, 0) / awayValidFt.length).toFixed(1)}%` : '0.0%';

      if (cleanMatchId) {
        const cachedDetail: MatchAuditDetail = {
          match_id: cleanMatchId,
          validation_id: actualValidationId,
          game_name: gameName.trim() || `${finalHome} vs ${finalAway}`,
          sport_type: normalizedSport,
          league_class: `${normalizedSport.toUpperCase()} • OFFICIAL MATCH`,
          match_date_formatted: displayTime ? `${displayDate} / ${displayTime}` : displayDate,
          home_team: {
            name: finalHome.toUpperCase(),
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
              kills: homeRoster.reduce((a, b) => a + (Number(b.kills) || 0), 0),
              attack_errors: homeRoster.reduce((a, b) => a + (Number(b.attack_errors) || 0), 0),
              attack_attempts: homeRoster.reduce((a, b) => a + (Number(b.attack_attempts) || 0), 0),
              service_aces: homeRoster.reduce((a, b) => a + (Number(b.service_aces) || 0), 0),
              digs: homeRoster.reduce((a, b) => a + (Number(b.digs) || 0), 0),
              block_points: homeRoster.reduce((a, b) => a + (Number(b.blk || b.block_points) || 0), 0),
              goals: homeRoster.reduce((a, b) => a + (Number(b.goals) || 0), 0),
              shots: homeRoster.reduce((a, b) => a + (Number(b.shots) || 0), 0),
              shots_on_target: homeRoster.reduce((a, b) => a + (Number(b.shots_on_target) || 0), 0),
              saves: homeRoster.reduce((a, b) => a + (Number(b.saves) || 0), 0),
              tackles: homeRoster.reduce((a, b) => a + (Number(b.tackles) || 0), 0),
              fg_pct: homeFgPct,
              three_p_pct: home3pPct,
              ft_pct: homeFtPct,
            },
          },
          away_team: {
            name: finalAway.toUpperCase(),
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
              kills: awayRoster.reduce((a, b) => a + (Number(b.kills) || 0), 0),
              attack_errors: awayRoster.reduce((a, b) => a + (Number(b.attack_errors) || 0), 0),
              attack_attempts: awayRoster.reduce((a, b) => a + (Number(b.attack_attempts) || 0), 0),
              service_aces: awayRoster.reduce((a, b) => a + (Number(b.service_aces) || 0), 0),
              digs: awayRoster.reduce((a, b) => a + (Number(b.digs) || 0), 0),
              block_points: awayRoster.reduce((a, b) => a + (Number(b.blk || b.block_points) || 0), 0),
              goals: awayRoster.reduce((a, b) => a + (Number(b.goals) || 0), 0),
              shots: awayRoster.reduce((a, b) => a + (Number(b.shots) || 0), 0),
              shots_on_target: awayRoster.reduce((a, b) => a + (Number(b.shots_on_target) || 0), 0),
              saves: awayRoster.reduce((a, b) => a + (Number(b.saves) || 0), 0),
              tackles: awayRoster.reduce((a, b) => a + (Number(b.tackles) || 0), 0),
              fg_pct: awayFgPct,
              three_p_pct: away3pPct,
              ft_pct: awayFtPct,
            },
          },
          race_results: raceResults,
          scoresheet_url: scoresheetUrl,
          audit_context_notes: notes.trim(),
          is_certified: false,
          assigned_coaches: coaches.map((c) => c.trim()).filter(Boolean),
          coach_name: coaches[0]?.trim() || undefined,
        };

        setCachedData(`match_audit_detail_${cleanMatchId}`, cachedDetail);
        try {
          localStorage.setItem(`atleta_match_detail_${cleanMatchId}`, JSON.stringify(cachedDetail));
        } catch {}
      }

      setCreatedMatchInfo({
        matchId: cleanMatchId ? `#${cleanMatchId}` : `#match_${Date.now()}`,
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

  // Render Box Score Table for Team Ball Sports
  const renderTeamBoxScoreTable = (teamType: 'home' | 'away', teamName: string, roster: BoxScoreRow[]) => {
    // Basketball totals
    const totalPts = roster.reduce((a, b) => a + (Number(b.pts) || 0), 0);
    const totalReb = roster.reduce((a, b) => a + (Number(b.reb) || 0), 0);
    const totalAst = roster.reduce((a, b) => a + (Number(b.ast) || 0), 0);
    const totalStl = roster.reduce((a, b) => a + (Number(b.stl) || 0), 0);
    const totalBlk = roster.reduce((a, b) => a + (Number(b.blk) || 0), 0);

    const validFgPcts = roster.map((r) => parseFloat(String(r.fg_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
    const totalFgPct = validFgPcts.length > 0 ? `${(validFgPcts.reduce((a, b) => a + b, 0) / validFgPcts.length).toFixed(1)}%` : '0.0%';

    const validThreePcts = roster.map((r) => parseFloat(String(r.three_p_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
    const totalThreePct = validThreePcts.length > 0 ? `${(validThreePcts.reduce((a, b) => a + b, 0) / validThreePcts.length).toFixed(1)}%` : '0.0%';

    const validFtPcts = roster.map((r) => parseFloat(String(r.ft_pct || '').replace('%', ''))).filter((n) => !isNaN(n) && n > 0);
    const totalFtPct = validFtPcts.length > 0 ? `${(validFtPcts.reduce((a, b) => a + b, 0) / validFtPcts.length).toFixed(1)}%` : '0.0%';

    // Volleyball totals
    const totalKills = roster.reduce((a, b) => a + (Number(b.kills) || 0), 0);
    const totalAtkErr = roster.reduce((a, b) => a + (Number(b.attack_errors) || 0), 0);
    const totalAttempts = roster.reduce((a, b) => a + (Number(b.attack_attempts) || 0), 0);
    const teamHitPct = totalAttempts > 0 ? ((totalKills - totalAtkErr) / totalAttempts).toFixed(3) : '.000';
    const totalAces = roster.reduce((a, b) => a + (Number(b.service_aces) || 0), 0);
    const totalDigs = roster.reduce((a, b) => a + (Number(b.digs) || 0), 0);
    const totalVolleyPts = roster.reduce((a, b) => a + (Number(b.pts || (b.kills || 0) + (b.service_aces || 0) + (b.blk || 0)) || 0), 0);

    // Soccer totals
    const totalGoals = roster.reduce((a, b) => a + (Number(b.goals ?? b.pts) || 0), 0);
    const totalShots = roster.reduce((a, b) => a + (Number(b.shots) || 0), 0);
    const totalSot = roster.reduce((a, b) => a + (Number(b.shots_on_target) || 0), 0);
    const totalSaves = roster.reduce((a, b) => a + (Number(b.saves) || 0), 0);
    const totalTackles = roster.reduce((a, b) => a + (Number(b.tackles) || 0), 0);

    return (
      <div style={styles.tableSection}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={styles.tableSectionTitle}>
            {teamName ? teamName.toUpperCase() : teamType === 'home' ? 'TEAM 1 (HOME)' : 'TEAM 2 (AWAY)'} ROSTER STATS ({roster.length} PLAYERS)
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B' }}>
            SCORE: <strong style={{ color: '#0B132B', fontSize: '13px' }}>
              {isSoccer ? `${totalGoals} GOALS` : isVolleyball ? `${totalVolleyPts} PTS` : `${totalPts} PTS`}
            </strong>
          </span>
        </div>

        <div style={styles.statsTableFrame}>
          <table style={styles.statsTable}>
            <thead>
              {/* Volleyball Headers */}
              {isVolleyball && (
                <tr>
                  <th style={{ ...styles.statTh, width: '45px' }}>[ # ]</th>
                  <th style={{ ...styles.statTh, textAlign: 'left', paddingLeft: '12px' }}>[ PLAYER NAME ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ POS ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ KILLS ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ ATK ERR ]</th>
                  <th style={{ ...styles.statTh, width: '65px' }}>[ ATTEMPTS ]</th>
                  <th style={{ ...styles.statTh, width: '65px' }}>[ HIT % ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ AST ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ ACES ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ DIGS ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ BLK ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ PTS ]</th>
                  <th style={{ ...styles.statTh, width: '40px', borderRight: 'none' }}></th>
                </tr>
              )}

              {/* Soccer Headers */}
              {isSoccer && (
                <tr>
                  <th style={{ ...styles.statTh, width: '45px' }}>[ # ]</th>
                  <th style={{ ...styles.statTh, textAlign: 'left', paddingLeft: '12px' }}>[ PLAYER NAME ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ POS ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ MIN ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ GOALS ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ AST ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ SHOTS ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ SOT ]</th>
                  <th style={{ ...styles.statTh, width: '50px' }}>[ SAVES ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ TACKLES ]</th>
                  <th style={{ ...styles.statTh, width: '40px', borderRight: 'none' }}></th>
                </tr>
              )}

              {/* Basketball / Default Headers */}
              {isBasketball && (
                <tr>
                  <th style={{ ...styles.statTh, width: '45px' }}>[ # ]</th>
                  <th style={{ ...styles.statTh, textAlign: 'left', paddingLeft: '12px' }}>[ PLAYER NAME ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ MIN ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ PTS ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ REB ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ AST ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ STL ]</th>
                  <th style={{ ...styles.statTh, width: '55px' }}>[ BLK ]</th>
                  <th style={{ ...styles.statTh, width: '65px' }}>[ FG% ]</th>
                  <th style={{ ...styles.statTh, width: '65px' }}>[ 3P% ]</th>
                  <th style={{ ...styles.statTh, width: '65px' }}>[ FT% ]</th>
                  <th style={{ ...styles.statTh, width: '40px', borderRight: 'none' }}></th>
                </tr>
              )}
            </thead>
            <tbody>
              {roster.length > 0 ? (
                roster.map((row, idx) => (
                  <tr key={`${teamType}-${idx}`} style={styles.statTr}>
                    <td style={styles.statTd}>
                      <input
                        type="text"
                        value={row.jersey_no}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'jersey_no', e.target.value)}
                        style={styles.statInput}
                      />
                    </td>
                    <td style={{ ...styles.statTd, ...styles.statTdName }}>
                      <input
                        type="text"
                        value={row.player_name}
                        onChange={(e) => updateBasketballStat(teamType, idx, 'player_name', e.target.value)}
                        style={styles.statInputName}
                      />
                    </td>

                    {/* Volleyball Data Cells */}
                    {isVolleyball && (
                      <>
                        <td style={styles.statTd}>
                          <input
                            type="text"
                            value={row.position || 'OH'}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'position', e.target.value)}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.kills ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'kills', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.attack_errors ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'attack_errors', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.attack_attempts ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'attack_attempts', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="text"
                            value={row.hitting_pct || '.000'}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'hitting_pct', e.target.value)}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.ast ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'ast', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.service_aces ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'service_aces', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.digs ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'digs', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.blk ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'blk', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.pts ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'pts', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                      </>
                    )}

                    {/* Soccer Data Cells */}
                    {isSoccer && (
                      <>
                        <td style={styles.statTd}>
                          <input
                            type="text"
                            value={row.position || 'FWD'}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'position', e.target.value)}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="text"
                            value={row.minutes ?? '0'}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'minutes', e.target.value)}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.goals ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'goals', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.ast ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'ast', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.shots ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'shots', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.shots_on_target ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'shots_on_target', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.saves ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'saves', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.tackles ?? 0}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'tackles', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                      </>
                    )}

                    {/* Basketball Data Cells */}
                    {isBasketball && (
                      <>
                        <td style={styles.statTd}>
                          <input
                            type="text"
                            value={row.minutes}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'minutes', e.target.value)}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.pts}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'pts', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.reb}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'reb', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.ast}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'ast', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.stl}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'stl', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="number"
                            value={row.blk}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'blk', Number(e.target.value))}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="text"
                            value={row.fg_pct}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'fg_pct', e.target.value)}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="text"
                            value={row.three_p_pct}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'three_p_pct', e.target.value)}
                            style={styles.statInput}
                          />
                        </td>
                        <td style={styles.statTd}>
                          <input
                            type="text"
                            value={row.ft_pct}
                            onChange={(e) => updateBasketballStat(teamType, idx, 'ft_pct', e.target.value)}
                            style={styles.statInput}
                          />
                        </td>
                      </>
                    )}

                    <td style={{ ...styles.statTd, borderRight: 'none', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeBasketballPlayer(teamType, idx)}
                        style={styles.removeRowBtn}
                        title="Remove Player"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} style={{ padding: '20px', color: '#64748B', textAlign: 'center' }}>
                    No player roster rows extracted. Click below to add players manually.
                  </td>
                </tr>
              )}

              {/* Totals Row */}
              <tr style={styles.statTotalsTr}>
                <td style={styles.statTotalsTd}></td>
                <td style={{ ...styles.statTotalsTd, textAlign: 'left', paddingLeft: '12px' }}>TEAM TOTALS</td>

                {isVolleyball && (
                  <>
                    <td style={styles.statTotalsTd}>-</td>
                    <td style={styles.statTotalsTd}>{totalKills}</td>
                    <td style={styles.statTotalsTd}>{totalAtkErr}</td>
                    <td style={styles.statTotalsTd}>{totalAttempts}</td>
                    <td style={styles.statTotalsTd}>{teamHitPct}</td>
                    <td style={styles.statTotalsTd}>{totalAst}</td>
                    <td style={styles.statTotalsTd}>{totalAces}</td>
                    <td style={styles.statTotalsTd}>{totalDigs}</td>
                    <td style={styles.statTotalsTd}>{totalBlk}</td>
                    <td style={styles.statTotalsTd}>{totalVolleyPts}</td>
                  </>
                )}

                {isSoccer && (
                  <>
                    <td style={styles.statTotalsTd}>-</td>
                    <td style={styles.statTotalsTd}>-</td>
                    <td style={styles.statTotalsTd}>{totalGoals}</td>
                    <td style={styles.statTotalsTd}>{totalAst}</td>
                    <td style={styles.statTotalsTd}>{totalShots}</td>
                    <td style={styles.statTotalsTd}>{totalSot}</td>
                    <td style={styles.statTotalsTd}>{totalSaves}</td>
                    <td style={styles.statTotalsTd}>{totalTackles}</td>
                  </>
                )}

                {isBasketball && (
                  <>
                    <td style={styles.statTotalsTd}>-</td>
                    <td style={styles.statTotalsTd}>{totalPts}</td>
                    <td style={styles.statTotalsTd}>{totalReb}</td>
                    <td style={styles.statTotalsTd}>{totalAst}</td>
                    <td style={styles.statTotalsTd}>{totalStl}</td>
                    <td style={styles.statTotalsTd}>{totalBlk}</td>
                    <td style={styles.statTotalsTd}>{totalFgPct}</td>
                    <td style={styles.statTotalsTd}>{totalThreePct}</td>
                    <td style={styles.statTotalsTd}>{totalFtPct}</td>
                  </>
                )}

                <td style={{ ...styles.statTotalsTd, borderRight: 'none' }}></td>
              </tr>
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => addBasketballPlayer(teamType)}
          className="hover-btn-outline"
          style={styles.addRowBtn}
        >
          <Plus style={{ width: 13, height: 13 }} />
          <span>ADD PLAYER TO {teamName || teamType.toUpperCase()}</span>
        </button>
      </div>
    );
  };

  // Render Table for Individual Sports (Swimming / Track & Field)
  const renderIndividualRaceTable = () => (
    <div style={styles.tableSection}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={styles.tableSectionTitle}>
          {sportCategory.toUpperCase()} EVENT RESULTS ({raceResults.length} PARTICIPANTS)
        </div>
      </div>

      <div style={styles.statsTableFrame}>
        <table style={styles.statsTable}>
          <thead>
            <tr>
              <th style={{ ...styles.statTh, width: '55px' }}>[ RANK ]</th>
              <th style={{ ...styles.statTh, textAlign: 'left', paddingLeft: '12px' }}>[ ATHLETE NAME ]</th>
              <th style={styles.statTh}>[ TEAM / AFFILIATION ]</th>
              <th style={styles.statTh}>[ EVENT / DISTANCE ]</th>
              <th style={styles.statTh}>[ FINISH TIME ]</th>
              <th style={styles.statTh}>[ SPLIT TIMES ]</th>
              <th style={styles.statTh}>[ EFFICIENCY ]</th>
              <th style={{ ...styles.statTh, width: '40px', borderRight: 'none' }}></th>
            </tr>
          </thead>
          <tbody>
            {raceResults.length > 0 ? (
              raceResults.map((row, idx) => (
                <tr key={`race-${idx}`} style={styles.statTr}>
                  <td style={styles.statTd}>
                    <input
                      type="text"
                      value={row.placement_rank}
                      onChange={(e) => updateRaceStat(idx, 'placement_rank', e.target.value)}
                      style={styles.statInput}
                    />
                  </td>
                  <td style={{ ...styles.statTd, ...styles.statTdName }}>
                    <input
                      type="text"
                      value={row.athlete_name}
                      onChange={(e) => updateRaceStat(idx, 'athlete_name', e.target.value)}
                      style={styles.statInputName}
                    />
                  </td>
                  <td style={styles.statTd}>
                    <input
                      type="text"
                      value={row.team_name || ''}
                      onChange={(e) => updateRaceStat(idx, 'team_name', e.target.value)}
                      style={styles.statInput}
                    />
                  </td>
                  <td style={styles.statTd}>
                    <input
                      type="text"
                      value={row.distance}
                      onChange={(e) => updateRaceStat(idx, 'distance', e.target.value)}
                      style={styles.statInput}
                    />
                  </td>
                  <td style={styles.statTd}>
                    <input
                      type="text"
                      value={row.finish_time}
                      onChange={(e) => updateRaceStat(idx, 'finish_time', e.target.value)}
                      style={styles.statInput}
                    />
                  </td>
                  <td style={styles.statTd}>
                    <input
                      type="text"
                      value={Array.isArray(row.split_times) ? row.split_times.join(' / ') : String(row.split_times || '')}
                      onChange={(e) => updateRaceStat(idx, 'split_times', e.target.value.split('/').map((s) => s.trim()))}
                      style={styles.statInput}
                    />
                  </td>
                  <td style={styles.statTd}>
                    <input
                      type="number"
                      value={row.efficiency ?? 100}
                      onChange={(e) => updateRaceStat(idx, 'efficiency', Number(e.target.value) || 0)}
                      style={styles.statInput}
                    />
                  </td>
                  <td style={{ ...styles.statTd, borderRight: 'none', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeRaceAthlete(idx)}
                      style={styles.removeRowBtn}
                      title="Remove Athlete"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '20px', color: '#64748B', textAlign: 'center' }}>
                  No race results extracted yet. Click below to add an athlete row.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRaceAthlete}
        className="hover-btn-outline"
        style={styles.addRowBtn}
      >
        <Plus style={{ width: 13, height: 13 }} />
        <span>ADD ATHLETE RESULT</span>
      </button>
    </div>
  );

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
                    {sportsList.map((sport) => (
                      <option key={sport} value={sport}>
                        {sport}
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
                            onClick={() => {
                              setTeams(teams.filter((_, i) => i !== idx));
                              if (coaches.length > 2) {
                                setCoaches(coaches.filter((_, i) => i !== idx));
                              }
                            }}
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
                  <div
                    style={styles.addCoachBox}
                    className="hover-btn-outline"
                    onClick={() => {
                      setTeams([...teams, '']);
                      setCoaches([...coaches, '']);
                    }}
                  >
                    <span style={styles.addCoachLabel}>ADD TEAM</span>
                    <PlusCircle style={{ width: 16, height: 16, color: '#0B132B' }} />
                  </div>
                </div>
              )}

              {/* Assigned Coaches */}
              {coaches.map((coach, idx) => (
                <div key={idx} style={{ ...styles.fieldGroup, marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={styles.fieldLabel}>
                      {isIndividualSport
                        ? `ASSIGNED COACH (DELEGATION ${idx + 1}) *`
                        : idx === 0
                          ? 'ASSIGNED COACH (TEAM 1 - HOME) *'
                          : idx === 1
                            ? 'ASSIGNED COACH (TEAM 2 - AWAY) *'
                            : `ASSIGNED COACH ${idx + 1} *`}
                    </label>
                    {coaches.length > (isIndividualSport ? Math.max(2, teams.length) : 2) && (
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
                    required
                    placeholder={
                      isIndividualSport
                        ? `Coach Full Name / ID for Delegation ${idx + 1}`
                        : idx === 0
                          ? 'Coach Full Name / ID for Team 1 (Home)'
                          : 'Coach Full Name / ID for Team 2 (Away)'
                    }
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
                multiple
                accept=".png,.jpg,.jpeg,.pdf,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <input
                ref={appendFileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf,.csv"
                style={{ display: 'none' }}
                onChange={handleAddMoreFiles}
              />

              <div
                style={{
                  ...styles.dropzoneContainer,
                  ...(ocrLoading ? { backgroundColor: '#F8FAFC', borderColor: '#0B132B' } : {}),
                  ...(selectedFile ? { cursor: 'default' } : {}),
                }}
                className={selectedFile ? '' : 'hover-dropzone'}
                onClick={() => {
                  if (!selectedFile && !ocrLoading) fileInputRef.current?.click();
                }}
              >
                {ocrLoading ? (
                  <>
                    <Loader2 style={{ width: 34, height: 34, color: '#0B132B', animation: 'spin 1s linear infinite' }} />
                    <span style={styles.dropzoneTitle}>
                      {selectedFiles.length > 1 ? `SCANNING ${selectedFiles.length} SCORESHEET PAGES WITH OCR...` : 'SCANNING SCORESHEET WITH OCR...'}
                    </span>
                    <span style={styles.dropzoneHelper}>EXTRACTING ROSTER & STATISTICS AUTOMATICALLY</span>
                  </>
                ) : selectedFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {/* Bento Grid for Multi-File Uploads */}
                    {selectedFiles.length > 1 ? (
                      <div style={styles.bentoGrid}>
                        {selectedFiles.map((file, idx) => {
                          const fileUrl = URL.createObjectURL(file);
                          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                          return (
                            <div
                              key={idx}
                              style={{ ...styles.bentoCard, cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewModalUrl(fileUrl);
                              }}
                              title="Click to enlarge preview"
                            >
                              <div style={styles.bentoHeader}>
                                <span style={styles.bentoBadge}>PAGE {idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveFile(idx);
                                  }}
                                  style={styles.bentoDeleteBtn}
                                  title="Remove page"
                                >
                                  <Trash2 style={{ width: 11, height: 11 }} />
                                  <span>DELETE</span>
                                </button>
                              </div>
                              {isPdf ? (
                                <iframe src={fileUrl} title={`Page ${idx + 1}`} style={styles.bentoThumb} />
                              ) : (
                                <img src={fileUrl} alt={`Page ${idx + 1}`} style={styles.bentoThumb} />
                              )}
                              <span style={styles.bentoFileName}>{file.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Single File Compact Preview */
                      <div
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalUrl(scoresheetUrl || localPreviewUrl || '');
                        }}
                        title="Click to enlarge preview"
                      >
                        {selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                          <iframe src={scoresheetUrl || localPreviewUrl || ''} title="Scoresheet Preview" style={styles.singlePreviewIframe} />
                        ) : (
                          <img src={scoresheetUrl || localPreviewUrl || ''} alt={selectedFile.name} style={styles.singlePreviewImage} />
                        )}
                        <span style={styles.activeFileLabel}>{selectedFile.name}</span>
                      </div>
                    )}

                    {/* User Action Buttons Toolbar */}
                    <div style={styles.actionToolbar}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          appendFileInputRef.current?.click();
                        }}
                        className="hover-btn-outline"
                        style={styles.actionBtnPrimary}
                      >
                        <Plus style={{ width: 14, height: 14 }} />
                        <span>ADD ANOTHER PAGE</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="hover-btn-outline"
                        style={styles.actionBtnOutline}
                      >
                        <Upload style={{ width: 14, height: 14 }} />
                        <span>REPLACE ALL</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAllFiles();
                        }}
                        className="hover-btn-outline"
                        style={styles.actionBtnDanger}
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                        <span>REMOVE {selectedFiles.length > 1 ? 'ALL' : 'FILE'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Camera style={{ width: 32, height: 32, color: '#0B132B' }} />
                    <span style={styles.dropzoneTitle}>DRAG FILES HERE OR CLICK TO BROWSE</span>
                    <span style={styles.dropzoneHelper}>ACCEPTED FORMATS: PNG, JPG, PDF (SELECT SINGLE OR MULTIPLE PAGES, MAX 25MB)</span>
                  </>
                )}
              </div>
            </div>

            {/* Extracted Scoresheet Preview & Live Editing */}
            {(ocrCompleted || homeRoster.length > 0 || raceResults.length > 0 || ocrLoading) && (
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles style={{ width: 18, height: 18, color: '#0B132B' }} />
                    <h3 style={styles.sectionHeading}>EXTRACTED SCORESHEET PREVIEW & STATS</h3>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 8px', backgroundColor: '#0B132B', color: '#FFFFFF', letterSpacing: '0.04em' }}>
                    LIVE EDITABLE
                  </span>
                </div>

                {ocrLoading ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                    <Loader2 style={{ width: 26, height: 26, animation: 'spin 1s linear infinite', margin: '0 auto 12px', color: '#0B132B' }} />
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0B132B' }}>
                      Extracting statistics from uploaded scoresheet...
                    </p>
                  </div>
                ) : isIndividualSport ? (
                  renderIndividualRaceTable()
                ) : (
                  <>
                    {renderTeamBoxScoreTable('home', homeTeam, homeRoster)}
                    {renderTeamBoxScoreTable('away', awayTeam, awayRoster)}
                  </>
                )}
              </div>
            )}

            {/* Section 04: NOTES */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeaderRow}>
                <h3 style={styles.sectionHeading}>04. NOTES</h3>
                <FileText style={styles.headerIcon} />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>ADDITIONAL MATCH NOTES & OBSERVATIONS (OPTIONAL)</label>
                <textarea
                  rows={4}
                  placeholder="Enter any official observations, referee notes, weather/facility conditions, or match incident logs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="hover-input"
                  style={{
                    ...styles.input,
                    minHeight: '85px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div style={styles.footerActionsRow}>
              <button type="button" onClick={() => navigate('/dashboard')} className="hover-btn-outline" style={styles.cancelBtn}>
                CANCEL
              </button>
              <button type="submit" disabled={submitting || ocrLoading} className="hover-btn-solid" style={styles.createMatchBtn}>
                {submitting ? (
                  <>
                    <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                    <span>CREATING MATCH...</span>
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

      {/* SPORT MISMATCH INTERRUPTION MODAL */}
      {sportMismatchInfo && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <AlertTriangle style={{ width: 44, height: 44, color: '#D97706', margin: '0 auto 12px' }} />
            <h2 style={styles.modalTitle}>SPORT MISMATCH DETECTED</h2>
            <p style={styles.modalSubtitle}>
              The uploaded scoresheet was detected as <strong>{sportMismatchInfo.detectedSport}</strong>, which is not aligned with your current selection (<strong>{sportMismatchInfo.currentSport}</strong>). The match category has been automatically updated to <strong>{sportMismatchInfo.detectedSport}</strong>.
            </p>
            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setSportCategory(sportMismatchInfo.detectedSport);
                  setSportMismatchInfo(null);
                }}
                className="hover-btn-solid"
                style={styles.modalPrimaryBtn}
              >
                CHANGE TO {sportMismatchInfo.detectedSport.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSportCategory(sportMismatchInfo.currentSport);
                  setSportMismatchInfo(null);
                  setOcrDetectedSport(null);
                  setSelectedFile(null);
                  setOcrCompleted(false);
                  setHomeRoster([]);
                  setAwayRoster([]);
                  setRaceResults([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="hover-btn-outline"
                style={styles.modalSecondaryBtn}
              >
                DISMISS & CHOOSE ANOTHER FILE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNSUPPORTED SPORT INTERRUPTION MODAL */}
      {unavailableSportName && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <AlertTriangle style={{ width: 44, height: 44, color: '#EF4444', margin: '0 auto 12px' }} />
            <h2 style={styles.modalTitle}>UNSUPPORTED SPORT DETECTED</h2>
            <p style={styles.modalSubtitle}>
              The uploaded scoresheet is for <strong>{unavailableSportName}</strong>, which is not currently available or active in the tournament system. Please upload a valid scoresheet for one of the available sports.
            </p>
            <button
              type="button"
              onClick={() => {
                setUnavailableSportName(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="hover-btn-solid"
              style={styles.modalPrimaryBtn}
            >
              DISMISS & CHOOSE ANOTHER FILE
            </button>
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

      {/* SCORESHEET PREVIEW MODAL */}
      {previewModalUrl && (
        <div style={styles.modalOverlay} onClick={() => setPreviewModalUrl(null)}>
          <div style={styles.previewModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewModalHeader}>
              <h3 style={styles.modalTitle}>SCORESHEET PREVIEW</h3>
              <button type="button" onClick={() => setPreviewModalUrl(null)} className="hover-close-x" style={styles.closeXBtn}>
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            {previewModalUrl.toLowerCase().includes('.pdf') || previewModalUrl.startsWith('data:application/pdf') ? (
              <iframe src={previewModalUrl} title="Scoresheet Preview" style={styles.previewPdfIframe} />
            ) : (
              <img src={previewModalUrl} alt="Scoresheet" style={styles.previewImg} />
            )}
            <div style={styles.previewModalFooter}>
              <button type="button" onClick={() => setPreviewModalUrl(null)} className="hover-btn-outline" style={styles.modalSecondaryBtn}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CreateMatch;

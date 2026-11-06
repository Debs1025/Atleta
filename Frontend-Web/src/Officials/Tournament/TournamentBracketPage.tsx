import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Trophy, ArrowLeft, Award, RefreshCw, Plus, Edit2, Trash2, AlertCircle, X, GripVertical, FileText, CloudUpload } from 'lucide-react';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  invalidateCache,
  getSports,
  getTournamentBrackets,
  updateTournamentBracket,
  advanceBracketTeam,
  deleteTournamentBracket,
  TournamentBracket,
  BracketMatch,
  BracketStage,
} from '../../api/client';
import type { AuthUser } from '../../api/types';
import { styles } from './styles/TournamentBracketPage';
import { TournamentModal } from './TournamentModal';

export interface TeamSlotRef {
  stageIdx: number;
  matchIdx: number;
  side: 'home' | 'away';
}

export const slotKey = (ref: TeamSlotRef) => `${ref.stageIdx}-${ref.matchIdx}-${ref.side}`;

// Match card
interface MatchCardProps {
  match: BracketMatch;
  idx: number;
  stageIdx: number;
  advancing: boolean;
  isDraggable: boolean;
  draggingSlot: string | null;
  activeDropTarget: string | null;
  swappedSlots: Set<string>;
  onWin: (match: BracketMatch, winner: string) => void;
  onAddMoreTeams: () => void;
  onDragStartTeam: (e: React.DragEvent, source: TeamSlotRef) => void;
  onDragOverTeam: (e: React.DragEvent, target: TeamSlotRef) => void;
  onDragLeaveTeam: (e: React.DragEvent, target: TeamSlotRef) => void;
  onDropTeam: (e: React.DragEvent, target: TeamSlotRef) => void;
  onDragEndTeam: () => void;
  onViewScoresheet: (linkedMatchId: string) => void;
  onUploadMatch: (match: BracketMatch, stageIdx?: number, matchIdx?: number) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  idx,
  stageIdx,
  advancing,
  isDraggable,
  draggingSlot,
  activeDropTarget,
  swappedSlots,
  onWin,
  onAddMoreTeams,
  onDragStartTeam,
  onDragOverTeam,
  onDragLeaveTeam,
  onDropTeam,
  onDragEndTeam,
  onViewScoresheet,
  onUploadMatch,
}) => {
  const homeName = match.home_team?.team_name || 'TBD';
  const awayName = match.away_team?.team_name || 'TBD';
  const done = match.status === 'COMPLETED' && Boolean(match.winner_team_name);
  const homeWin = match.winner_team_name === homeName;
  const awayWin = match.winner_team_name === awayName;
  const isPlayable =
    !homeName.includes('TBD') &&
    !awayName.includes('TBD') &&
    homeName !== 'BYE' &&
    awayName !== 'BYE' &&
    homeName !== 'No Opponent' &&
    awayName !== 'No Opponent';

  const teamRow = (
    name: string,
    seed: number | undefined,
    isWinner: boolean,
    side: 'home' | 'away'
  ) => {
    const isNoOpponent = name === 'BYE' || name === 'No Opponent';
    const isTbd = name.includes('TBD');
    const isClickable = !done && !isTbd && !isNoOpponent;
    const displayName = isNoOpponent ? 'No Opponent' : name;

    const currentKey = `${stageIdx}-${idx}-${side}`;
    const canDrag = isDraggable && stageIdx === 0 && !isTbd && !isNoOpponent;
    const isDraggingThis = draggingSlot === currentKey;
    const isDropTargetThis = activeDropTarget === currentKey;
    const isSwappedThis = swappedSlots.has(currentKey);

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isNoOpponent) {
        onAddMoreTeams();
      } else if (isClickable && !advancing) {
        onWin(match, name);
      }
    };

    return (
      <div
        data-team-slot="true"
        draggable={canDrag}
        onDragStart={canDrag ? (e) => onDragStartTeam(e, { stageIdx, matchIdx: idx, side }) : undefined}
        onDragOver={isDraggable && stageIdx === 0 ? (e) => onDragOverTeam(e, { stageIdx, matchIdx: idx, side }) : undefined}
        onDragLeave={isDraggable && stageIdx === 0 ? (e) => onDragLeaveTeam(e, { stageIdx, matchIdx: idx, side }) : undefined}
        onDrop={isDraggable && stageIdx === 0 ? (e) => onDropTeam(e, { stageIdx, matchIdx: idx, side }) : undefined}
        onDragEnd={onDragEndTeam}
        onClick={handleClick}
        style={{
          ...styles.teamRow,
          ...(canDrag ? styles.teamRowDraggable : {}),
          ...(isDraggingThis ? styles.teamRowDragging : {}),
          ...(isDropTargetThis ? styles.teamRowDropTarget : {}),
          ...(isSwappedThis ? styles.teamRowSwapped : {}),
          ...(isWinner ? styles.teamRowWinner : {}),
          ...(isClickable ? styles.teamRowClickable : {}),
          ...(isNoOpponent ? styles.teamRowNoOpponent : {}),
        }}
        title={
          canDrag
            ? `Drag to interchange ${displayName}'s match position`
            : isNoOpponent
            ? 'Click to add more teams'
            : isClickable
            ? `Click to set ${displayName} as winner`
            : undefined
        }
      >
        <div style={styles.teamLeft}>
          {canDrag && <GripVertical size={13} style={styles.dragGrip} />}
          <span style={styles.teamSeed}>#{seed ?? '-'}</span>
          <span
            style={{
              ...styles.teamNameText,
              ...(isWinner ? styles.teamNameWinner : {}),
              ...(isTbd ? styles.teamNameTbd : {}),
              ...(isNoOpponent ? styles.teamNameNoOpponent : {}),
            }}
          >
            {displayName}
          </span>
        </div>
        <div style={styles.teamRightScoreArea}>
          {side === 'home' && match.home_team?.score !== undefined && (
            <span style={{ ...styles.teamActualScore, ...(isWinner ? styles.teamActualScoreWinner : {}) }}>
              {match.home_team.score}
            </span>
          )}
          {side === 'away' && match.away_team?.score !== undefined && (
            <span style={{ ...styles.teamActualScore, ...(isWinner ? styles.teamActualScoreWinner : {}) }}>
              {match.away_team.score}
            </span>
          )}
          {done && (
            <span style={{ ...styles.teamScore, ...(isWinner ? styles.teamScoreWinner : {}) }}>
              {isWinner ? 'W' : 'L'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ ...styles.matchCard, ...(done ? styles.matchCardDone : {}) }}>
      <div style={styles.matchMeta}>
        <span style={styles.matchIndex}>MATCH #{idx + 1}</span>
        {done && (
          <span style={{ ...styles.statusPill, ...styles.statusPillDone }}>
            COMPLETED
          </span>
        )}
      </div>
      {teamRow(homeName, match.home_team?.seed, homeWin, 'home')}
      {teamRow(awayName, match.away_team?.seed, awayWin, 'away')}

      {match.linked_match_id ? (
        <div style={styles.matchCardFooter}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewScoresheet(match.linked_match_id!);
            }}
            style={styles.scoresheetSlotBtn}
            title="View full match scoresheet & player statistics"
          >
            <FileText size={12} />
            <span>Scoresheet</span>
          </button>
        </div>
      ) : isPlayable ? (
        <div style={styles.matchCardFooter}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUploadMatch(match, stageIdx, idx);
            }}
            style={styles.uploadMatchSlotBtn}
            title={`Upload official match & scoresheet for ${homeName} vs ${awayName}`}
          >
            <CloudUpload size={12} />
            <span>Upload Match</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

// Stage column
const StageColumn: React.FC<{
  stage: BracketStage;
  idx: number;
  advancingId: string | null;
  isDraggable: boolean;
  draggingSlot: string | null;
  activeDropTarget: string | null;
  swappedSlots: Set<string>;
  onWin: (match: BracketMatch, winner: string) => void;
  onAddMoreTeams: () => void;
  onDragStartTeam: (e: React.DragEvent, source: TeamSlotRef) => void;
  onDragOverTeam: (e: React.DragEvent, target: TeamSlotRef) => void;
  onDragLeaveTeam: (e: React.DragEvent, target: TeamSlotRef) => void;
  onDropTeam: (e: React.DragEvent, target: TeamSlotRef) => void;
  onDragEndTeam: () => void;
  onViewScoresheet: (linkedMatchId: string) => void;
  onUploadMatch: (match: BracketMatch, stageIdx?: number, matchIdx?: number) => void;
}> = ({
  stage,
  idx,
  advancingId,
  isDraggable,
  draggingSlot,
  activeDropTarget,
  swappedSlots,
  onWin,
  onAddMoreTeams,
  onDragStartTeam,
  onDragOverTeam,
  onDragLeaveTeam,
  onDropTeam,
  onDragEndTeam,
  onViewScoresheet,
  onUploadMatch,
}) => (
  <div style={styles.stageCol}>
    <div style={styles.stageHeader}>
      <div style={styles.stageHeaderLeft}>
        <span style={styles.stageNum}>{idx + 1}</span>
        <span style={styles.stageName}>{stage.stage_name.toUpperCase()}</span>
      </div>
      <span style={styles.stageMatchCount}>
        {stage.matches.length} {stage.matches.length === 1 ? 'Match' : 'Matches'}
      </span>
    </div>
    <div style={styles.matchesCol}>
      {stage.matches.map((m, mi) => (
        <MatchCard
          key={m.match_id || mi}
          match={m}
          idx={mi}
          stageIdx={idx}
          advancing={advancingId === m.match_id}
          isDraggable={isDraggable}
          draggingSlot={draggingSlot}
          activeDropTarget={activeDropTarget}
          swappedSlots={swappedSlots}
          onWin={onWin}
          onAddMoreTeams={onAddMoreTeams}
          onDragStartTeam={onDragStartTeam}
          onDragOverTeam={onDragOverTeam}
          onDragLeaveTeam={onDragLeaveTeam}
          onDropTeam={onDropTeam}
          onDragEndTeam={onDragEndTeam}
          onViewScoresheet={onViewScoresheet}
          onUploadMatch={onUploadMatch}
        />
      ))}
    </div>
  </div>
);

// Tournament bracket page
export const TournamentBracketPage: React.FC = () => {
  const navigate = useNavigate();
  const { bracketId } = useParams<{ bracketId: string }>();
  const location = useLocation();
  const [currentUser] = useState<AuthUser | null>(getStoredUser());

  const [sports, setSports] = useState<string[]>(() => {
    const cached = getCachedData<any>('sports_catalog_false');
    if (cached?.sports?.length) {
      return ['ALL', ...cached.sports.map((s: any) => (s.sport_name || '').toUpperCase()).filter(Boolean)];
    }
    return ['ALL', 'BASKETBALL', 'VOLLEYBALL', 'BADMINTON'];
  });

  // Active bracket
  const [bracket, setBracket] = useState<TournamentBracket | null>(() => {
    if (bracketId) {
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('atleta_cached_bracket_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find((b: any) => b.bracket_id === bracketId);
                if (found) return found;
              }
            }
          }
        }
      } catch { }
    }
    return (location.state as any)?.bracket ?? null;
  });
  const [loading, setLoading] = useState(!bracket);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mouse drag-to-scroll for horizontal bracket stages
  const stagesRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !stagesRef.current) return;
      e.preventDefault();
      const x = e.pageX - stagesRef.current.offsetLeft;
      const walk = (x - startXRef.current) * 1.8;
      stagesRef.current.scrollLeft = scrollLeftRef.current - walk;
    };

    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !stagesRef.current) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[data-team-slot]')
    ) {
      return;
    }
    isDraggingRef.current = true;
    setIsDragging(true);
    startXRef.current = e.pageX - stagesRef.current.offsetLeft;
    scrollLeftRef.current = stagesRef.current.scrollLeft;
  };

  // Auth guard
  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
    }
  }, [navigate]);

  // Load sports
  useEffect(() => {
    getSports()
      .then((res) => {
        const names = (res.sports || []).map((s: any) => (s.sport_name || '').toUpperCase()).filter(Boolean);
        if (names.length) setSports(['ALL', ...names]);
      })
      .catch(() => {});
  }, []);

  // Fetch bracket
  const loadBracket = useCallback(async (force = false) => {
    if (!bracketId) return;

    const syncWithMasterMatches = (br: TournamentBracket): TournamentBracket => {
      try {
        let masterMatches: any[] = getCachedData<any[]>('all_official_matches_master') || [];
        if (!masterMatches.length) {
          const raw = localStorage.getItem('atleta_cached_official_matches_master');
          if (raw) masterMatches = JSON.parse(raw);
        }
        if (br && br.stages) {
          const stagesCopy = JSON.parse(JSON.stringify(br.stages));
          let changed = false;
          for (const stg of stagesCopy) {
            for (const m of stg.matches) {
              const hName = (m.home_team?.team_name || '').trim().toLowerCase();
              const aName = (m.away_team?.team_name || '').trim().toLowerCase();
              if (hName && aName && !hName.includes('tbd') && !aName.includes('tbd') && hName !== 'bye' && aName !== 'bye' && hName !== 'no opponent' && aName !== 'no opponent') {
                let detail: any = null;
                const cleanId = String(m.linked_match_id || '').replace(/^#/, '');

                // 1. Direct match detail lookup by linked_match_id
                if (cleanId) {
                  detail = getCachedData(`match_audit_detail_${cleanId}`);
                  if (!detail) {
                    try {
                      const raw = localStorage.getItem(`atleta_match_detail_${cleanId}`);
                      if (raw) detail = JSON.parse(raw);
                    } catch {}
                  }
                }

                // 2. Master matches lookup by tournament_id + team names
                if (!detail && masterMatches.length) {
                  const matchObj = masterMatches.find((om: any) => {
                    const rawM = om.raw_match || om;
                    const tId = rawM.tournament_id || om.tournament_id;
                    const rawH = (rawM.home_team?.name || rawM.home_team_name || '').trim().toLowerCase();
                    const rawA = (rawM.away_team?.name || rawM.opponent_team_name || '').trim().toLowerCase();
                    const matchesTeams = (rawH === hName && rawA === aName) || (rawH === aName && rawA === hName);
                    if (tId && tId === br.bracket_id) {
                      return matchesTeams || (cleanId && String(om.match_id || rawM.match_id || '').replace(/^#/, '') === cleanId);
                    }
                    return matchesTeams;
                  });
                  if (matchObj) {
                    detail = matchObj.raw_match || matchObj;
                    const mId = String(detail.match_id || matchObj.match_id || '').replace(/^#/, '');
                    if (!m.linked_match_id && mId) {
                      m.linked_match_id = mId;
                      changed = true;
                    }
                  }
                }

                if (detail) {
                  const sHomeName = (detail.home_team?.name || detail.home_team_name || '').trim().toLowerCase();
                  const sAwayName = (detail.away_team?.name || detail.opponent_team_name || detail.away_team_name || '').trim().toLowerCase();

                  const sHomeScore = typeof detail.home_team?.score === 'number'
                    ? detail.home_team.score
                    : typeof detail.home_score === 'number'
                    ? detail.home_score
                    : undefined;

                  const sAwayScore = typeof detail.away_team?.score === 'number'
                    ? detail.away_team.score
                    : typeof detail.away_score === 'number'
                    ? detail.away_score
                    : undefined;

                  if (sHomeScore !== undefined && sAwayScore !== undefined) {
                    if (sHomeName === hName || sAwayName === aName) {
                      if (m.home_team) m.home_team.score = sHomeScore;
                      if (m.away_team) m.away_team.score = sAwayScore;
                    } else if (sHomeName === aName || sAwayName === hName) {
                      if (m.home_team) m.home_team.score = sAwayScore;
                      if (m.away_team) m.away_team.score = sHomeScore;
                    } else {
                      if (m.home_team) m.home_team.score = sHomeScore;
                      if (m.away_team) m.away_team.score = sAwayScore;
                    }
                    changed = true;
                  }

                  if (detail.scoresheet_url && !m.scoresheet_url) {
                    m.scoresheet_url = detail.scoresheet_url;
                    changed = true;
                  }
                }
              }
            }
          }
          if (changed) {
            return { ...br, stages: stagesCopy };
          }
        }
      } catch {}
      return br;
    };

    if (!force) {
      const allSportCaches = ['ALL', 'all', bracket?.sport_type].filter(Boolean) as string[];
      for (const sp of allSportCaches) {
        const cached = getCachedData<TournamentBracket[]>(`tournament_brackets_${sp}`);
        const found = cached?.find((b) => b.bracket_id === bracketId);
        if (found) {
          setBracket(syncWithMasterMatches(found));
          setLoading(false);
          return;
        }
      }
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('atleta_cached_bracket_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list: TournamentBracket[] = JSON.parse(raw);
              if (Array.isArray(list)) {
                const found = list.find((b) => b.bracket_id === bracketId);
                if (found) {
                  setBracket(syncWithMasterMatches(found));
                  setLoading(false);
                  return;
                }
              }
            }
          }
        }
      } catch { }
    }

    try {
      const list = await getTournamentBrackets('ALL', force);
      const found = list.find((b) => b.bracket_id === bracketId);
      if (found) {
        setBracket(syncWithMasterMatches(found));
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [bracket?.sport_type, bracketId]);

  useEffect(() => {
    loadBracket();
  }, [loadBracket]);

  const handleUploadMatch = (m: BracketMatch, _stageIdx?: number, _matchIdx?: number) => {
    if (!bracket) return;
    const params = new URLSearchParams({
      tournamentId: bracket.bracket_id,
      tournamentName: bracket.tournament_name,
      bracketMatchId: m.match_id,
      home: m.home_team?.team_name || '',
      away: m.away_team?.team_name || '',
      sport: bracket.sport_type || '',
    });
    navigate(`/create-match?${params.toString()}`);
  };

  const handleViewScoresheet = (linkedMatchId: string) => {
    if (!bracket) return;
    navigate(`/matches/${linkedMatchId.replace(/^#/, '')}`, {
      state: {
        returnUrl: `/tournaments/${bracket.bracket_id}`,
        returnLabel: 'BACK TO TOURNAMENT BRACKET',
        tournamentId: bracket.bracket_id,
        tournamentName: bracket.tournament_name,
      },
    });
  };

  // Handle advancing winner
  const handleWin = async (match: BracketMatch, winner: string) => {
    if (!bracket || !winner || winner.includes('TBD')) return;
    setAdvancingId(match.match_id);
    try {
      const isHome = winner === match.home_team?.team_name;
      const hScore = match.home_team?.score !== undefined ? match.home_team.score : (isHome ? 2 : 0);
      const aScore = match.away_team?.score !== undefined ? match.away_team.score : (isHome ? 0 : 2);
      const updated = await advanceBracketTeam(
        bracket.bracket_id,
        match.match_id,
        winner,
        hScore,
        aScore,
      );
      invalidateCache('tournament_brackets');
      setBracket(updated);
    } catch {
      alert('Failed to advance team. Please try again.');
    } finally {
      setAdvancingId(null);
    }
  };

  const handleDelete = () => {
    if (!bracket) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!bracket) return;
    setShowDeleteConfirm(false);
    try {
      await deleteTournamentBracket(bracket.bracket_id);
      navigate('/tournaments');
    } catch {
      alert('Failed to remove tournament.');
    }
  };

  const totalTeams = bracket?.stages?.[0]?.matches?.length
    ? bracket.stages[0].matches.length * 2
    : 8;

  // Check if tournament has started / has any match winner
  const hasMatchWinner = Boolean(
    bracket?.champion_team ||
    bracket?.status === 'Completed' ||
    bracket?.stages?.some((stage) =>
      stage.matches?.some((m) => {
        const home = m.home_team?.team_name?.trim();
        const away = m.away_team?.team_name?.trim();
        const isRealMatch =
          home &&
          away &&
          home !== 'BYE' &&
          away !== 'BYE' &&
          home !== 'No Opponent' &&
          away !== 'No Opponent';
        return isRealMatch && m.status === 'COMPLETED' && Boolean(m.winner_team_name);
      })
    )
  );

  const isDraggable = !hasMatchWinner;

  // Drag and drop team interchange states
  const [draggingSlot, setDraggingSlot] = useState<string | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const [swappedSlots, setSwappedSlots] = useState<Set<string>>(new Set());

  const handleDragStartTeam = (e: React.DragEvent, source: TeamSlotRef) => {
    if (!isDraggable || source.stageIdx !== 0) return;
    e.dataTransfer.setData('application/json', JSON.stringify(source));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingSlot(slotKey(source));
  };

  const handleDragOverTeam = (e: React.DragEvent, target: TeamSlotRef) => {
    if (!isDraggable || target.stageIdx !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const key = slotKey(target);
    if (activeDropTarget !== key) {
      setActiveDropTarget(key);
    }
  };

  const handleDragLeaveTeam = (e: React.DragEvent, target: TeamSlotRef) => {
    const related = e.relatedTarget as Node | null;
    const current = e.currentTarget as Node;
    if (!related || !current.contains(related)) {
      if (activeDropTarget === slotKey(target)) {
        setActiveDropTarget(null);
      }
    }
  };

  const handleDropTeam = (e: React.DragEvent, target: TeamSlotRef) => {
    if (!isDraggable || target.stageIdx !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveDropTarget(null);
    setDraggingSlot(null);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const source: TeamSlotRef = JSON.parse(raw);
      handleSwapTeams(source, target);
    } catch (err) {
      console.error('Failed to parse drag drop data', err);
    }
  };

  const handleDragEndTeam = () => {
    setDraggingSlot(null);
    setActiveDropTarget(null);
  };

  const handleSwapTeams = async (source: TeamSlotRef, target: TeamSlotRef) => {
    if (!bracket || !bracket.stages || !isDraggable) return;
    if (
      source.stageIdx === target.stageIdx &&
      source.matchIdx === target.matchIdx &&
      source.side === target.side
    ) {
      return;
    }

    const newStages = JSON.parse(JSON.stringify(bracket.stages)) as BracketStage[];
    const sourceMatch = newStages[source.stageIdx]?.matches[source.matchIdx];
    const targetMatch = newStages[target.stageIdx]?.matches[target.matchIdx];
    if (!sourceMatch || !targetMatch) return;

    const sourceTeam = source.side === 'home' ? sourceMatch.home_team : sourceMatch.away_team;
    const targetTeam = target.side === 'home' ? targetMatch.home_team : targetMatch.away_team;

    // Interchange the team slots
    if (source.side === 'home') {
      sourceMatch.home_team = targetTeam;
    } else {
      sourceMatch.away_team = targetTeam;
    }

    if (target.side === 'home') {
      targetMatch.home_team = sourceTeam;
    } else {
      targetMatch.away_team = sourceTeam;
    }

    const srcKey = slotKey(source);
    const tgtKey = slotKey(target);
    setSwappedSlots(new Set([srcKey, tgtKey]));
    setTimeout(() => {
      setSwappedSlots(new Set());
    }, 650);

    const updatedBracket = { ...bracket, stages: newStages, updated_at: new Date().toISOString() };
    setBracket(updatedBracket);

    // Immediately persist to localStorage across all bracket cache keys
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('atleta_cached_bracket_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const idx = list.findIndex((item: any) => item.bracket_id === bracket.bracket_id);
              if (idx !== -1) {
                list[idx] = { ...list[idx], ...updatedBracket };
                localStorage.setItem(key, JSON.stringify(list));
              }
            }
          }
        }
      }
    } catch { }

    try {
      await updateTournamentBracket(bracket.bracket_id, {
        ...bracket,
        stages: newStages,
      });
    } catch {
      // Local state is already updated
    }
  };

  return (
    <div style={styles.shell}>
      <style>{`
        @keyframes interchangePulse {
          0% {
            transform: scale(0.92);
            background-color: #93C5FD !important;
            border-color: #2563EB !important;
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.35);
          }
          45% {
            transform: scale(1.04);
            background-color: #DBEAFE !important;
            border-color: #1D4ED8 !important;
            box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
          }
          100% {
            transform: scale(1);
            background-color: #F8FAFC;
            border-color: #E2E8F0;
            box-shadow: none;
          }
        }
      `}</style>
      <Navbar user={currentUser} />
      <div style={styles.layoutBody}>
        <Sidebar activeTab="TOURNAMENTS" />
        <main style={styles.main}>
          {/* Header Title */}
          <div style={styles.headerLeft}>
            <div>
              <h1 style={styles.titleH1}>TOURNAMENT BRACKETING SYSTEM</h1>
              <p style={styles.subtitle}>View and manage knockout tournament brackets and schedules</p>
            </div>
          </div>

          {/* Action Toolbar below Tournament Bracketing System */}
          <div style={styles.headerActions}>
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              style={styles.refreshBtn}
              title="Go back to all tournaments"
            >
              <ArrowLeft size={15} />
              <span>All Tournaments</span>
            </button>

            <button
              type="button"
              style={styles.refreshBtn}
              onClick={() => {
                setLoading(true);
                loadBracket(true);
              }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {bracket && (
              <>
                <button
                  type="button"
                  style={styles.refreshBtn}
                  onClick={() => setShowEditModal(true)}
                  title="Edit Tournament"
                >
                  <Edit2 size={15} color="#0284C7" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  style={{
                    ...styles.refreshBtn,
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#EF4444',
                  }}
                  onClick={handleDelete}
                  title="Remove Tournament"
                >
                  <Trash2 size={15} />
                  <span>Remove</span>
                </button>
              </>
            )}

            {!hasMatchWinner && (
              <button
                type="button"
                style={styles.createBtn}
                onClick={() => setShowEditModal(true)}
                title="Add more teams to this tournament"
              >
                <Plus size={16} />
                <span>ADD MORE TEAM</span>
              </button>
            )}
          </div>

          {/* Bracket Content or Empty/Loading States */}
          {loading && !bracket ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <span style={styles.spinnerText}>Loading tournament bracket...</span>
            </div>
          ) : !bracket ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}>
                <Trophy size={32} />
              </div>
              <h3 style={styles.emptyTitle}>No Bracket Found</h3>
              <p style={styles.emptyDesc}>
                This tournament bracket could not be found or has been removed.
              </p>
              <button
                type="button"
                style={styles.emptyCreateBtn}
                onClick={() => navigate('/tournaments')}
              >
                <ArrowLeft size={16} />
                <span>Back to Tournaments</span>
              </button>
            </div>
          ) : (
            <div style={styles.bracketContent}>
              {/* Summary Bar matching picture */}
              <div style={styles.summaryBar}>
                <div style={styles.summaryLeft}>
                  <span style={styles.sportBadge}>Single Elim</span>
                  <span style={styles.tournamentName}>{bracket.tournament_name}</span>
                  <span style={styles.formatLabel}>
                    {totalTeams} Teams • {bracket.stages.length} Rounds
                  </span>
                  <span
                    style={
                      bracket.status === 'Completed'
                        ? styles.statusBadgeCompleted
                        : styles.statusBadgeOngoing
                    }
                  >
                    {bracket.status === 'Completed' ? 'COMPLETED' : 'ONGOING'}
                  </span>
                </div>
                {bracket.champion_team && (
                  <div style={styles.championBadge}>
                    <Award size={16} />
                    <span>CHAMPION: {bracket.champion_team}</span>
                  </div>
                )}
              </div>

              {/* Stages + Champion columns with mouse drag-to-scroll */}
              <div
                ref={stagesRef}
                style={{
                  ...styles.stagesGrid,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: isDragging ? 'none' : 'auto',
                }}
                onMouseDown={handleMouseDown}
              >
                {bracket.stages.map((stage, i) => (
                  <StageColumn
                    key={stage.round_number ?? i}
                    stage={stage}
                    idx={i}
                    advancingId={advancingId}
                    isDraggable={isDraggable}
                    draggingSlot={draggingSlot}
                    activeDropTarget={activeDropTarget}
                    swappedSlots={swappedSlots}
                    onWin={handleWin}
                    onAddMoreTeams={() => setShowEditModal(true)}
                    onDragStartTeam={handleDragStartTeam}
                    onDragOverTeam={handleDragOverTeam}
                    onDragLeaveTeam={handleDragLeaveTeam}
                    onDropTeam={handleDropTeam}
                    onDragEndTeam={handleDragEndTeam}
                    onViewScoresheet={handleViewScoresheet}
                    onUploadMatch={handleUploadMatch}
                  />
                ))}

                {/* Champion Trophy Column */}
                <div style={styles.championCol}>
                  <div style={styles.championHeaderBadge}>
                    <Trophy size={14} color="#854D0E" />
                    <span>CHAMPION</span>
                  </div>
                  <div
                    style={{
                      ...styles.trophyCircle,
                      ...(bracket.champion_team ? styles.trophyCircleWon : {}),
                    }}
                  >
                    <Trophy size={42} color="#D4AF37" />
                  </div>
                  <div>
                    <span style={styles.trophyLabel}>TOURNAMENT CHAMPION</span>
                    <h3
                      style={{
                        ...styles.championTeam,
                        ...(bracket.champion_team ? styles.championTeamWon : {}),
                      }}
                    >
                      {bracket.champion_team || 'UNDECIDED'}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal to create another tournament bracket */}
      {showCreateModal && (
        <TournamentModal
          sports={sports}
          onClose={() => setShowCreateModal(false)}
          onSaved={(created) => {
            setShowCreateModal(false);
            setBracket(created);
            navigate(`/tournaments/${created.bracket_id}`, { state: { bracket: created }, replace: true });
          }}
        />
      )}

      {/* Modal to edit current tournament bracket */}
      {showEditModal && bracket && (
        <TournamentModal
          bracket={bracket}
          sports={sports}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => {
            setShowEditModal(false);
            setBracket(updated);
          }}
        />
      )}

      {/* Confirmation Modal to remove tournament (replaces browser confirm) */}
      {showDeleteConfirm && bracket && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmHeader}>
              <div style={styles.confirmHeaderLeft}>
                <AlertCircle size={20} color="#E11D48" />
                <h3 style={styles.confirmTitle}>Remove Tournament</h3>
              </div>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} style={styles.modalClose}>
                <X size={18} />
              </button>
            </div>

            <p style={styles.confirmDesc}>
              Are you sure you want to remove <span style={styles.confirmTournamentName}>"{bracket.tournament_name}"</span>?
            </p>

            <div style={styles.confirmActions}>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} style={styles.cancelBtn}>
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} style={styles.confirmDeleteBtn}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentBracketPage;

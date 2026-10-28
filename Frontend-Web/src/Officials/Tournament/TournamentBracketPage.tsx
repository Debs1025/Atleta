import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Trophy, ArrowLeft, Award, RefreshCw, Plus, Edit2, Trash2, AlertCircle, X } from 'lucide-react';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  invalidateCache,
  getSports,
  getTournamentBrackets,
  advanceBracketTeam,
  deleteTournamentBracket,
  TournamentBracket,
  BracketMatch,
  BracketStage,
} from '../../api/client';
import type { AuthUser } from '../../api/types';
import { styles } from './styles/TournamentBracketPage';
import { TournamentModal } from './TournamentModal';

// Match card
interface MatchCardProps {
  match: BracketMatch;
  idx: number;
  advancing: boolean;
  onWin: (match: BracketMatch, winner: string) => void;
  onAddMoreTeams: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, idx, advancing, onWin, onAddMoreTeams }) => {
  const homeName = match.home_team?.team_name || 'TBD';
  const awayName = match.away_team?.team_name || 'TBD';
  const done = match.status === 'COMPLETED' && Boolean(match.winner_team_name);
  const homeWin = match.winner_team_name === homeName;
  const awayWin = match.winner_team_name === awayName;

  const teamRow = (
    name: string,
    seed: number | undefined,
    isWinner: boolean,
  ) => {
    const isNoOpponent = name === 'BYE' || name === 'No Opponent';
    const isTbd = name.includes('TBD');
    const isClickable = !done && !isTbd && !isNoOpponent;
    const displayName = isNoOpponent ? 'No Opponent' : name;

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
        onClick={handleClick}
        style={{
          ...styles.teamRow,
          ...(isWinner ? styles.teamRowWinner : {}),
          ...(isClickable ? styles.teamRowClickable : {}),
          ...(isNoOpponent ? styles.teamRowNoOpponent : {}),
        }}
        title={
          isNoOpponent
            ? 'Click to add more teams'
            : isClickable
            ? `Click to set ${displayName} as winner`
            : undefined
        }
      >
        <div style={styles.teamLeft}>
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
        {done && (
          <span style={{ ...styles.teamScore, ...(isWinner ? styles.teamScoreWinner : {}) }}>
            {isWinner ? 'W' : 'L'}
          </span>
        )}
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
      {teamRow(homeName, match.home_team?.seed, homeWin)}
      {teamRow(awayName, match.away_team?.seed, awayWin)}
    </div>
  );
};

// Stage column
const StageColumn: React.FC<{
  stage: BracketStage;
  idx: number;
  advancingId: string | null;
  onWin: (match: BracketMatch, winner: string) => void;
  onAddMoreTeams: () => void;
}> = ({ stage, idx, advancingId, onWin, onAddMoreTeams }) => (
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
          advancing={advancingId === m.match_id}
          onWin={onWin}
          onAddMoreTeams={onAddMoreTeams}
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
  const [bracket, setBracket] = useState<TournamentBracket | null>(
    (location.state as any)?.bracket ?? null
  );
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
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;
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

    if (!force) {
      const allSportCaches = ['ALL', 'all', bracket?.sport_type].filter(Boolean) as string[];
      for (const sp of allSportCaches) {
        const cached = getCachedData<TournamentBracket[]>(`tournament_brackets_${sp}`);
        const found = cached?.find((b) => b.bracket_id === bracketId);
        if (found) {
          setBracket(found);
          setLoading(false);
          return;
        }
      }
    }

    try {
      const list = await getTournamentBrackets('ALL');
      const found = list.find((b) => b.bracket_id === bracketId);
      if (found) {
        setBracket(found);
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

  // Handle advancing winner
  const handleWin = async (match: BracketMatch, winner: string) => {
    if (!bracket || !winner || winner.includes('TBD')) return;
    setAdvancingId(match.match_id);
    try {
      const isHome = winner === match.home_team?.team_name;
      const updated = await advanceBracketTeam(
        bracket.bracket_id,
        match.match_id,
        winner,
        isHome ? 2 : 0,
        isHome ? 0 : 2,
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

  return (
    <div style={styles.shell}>
      <Navbar user={currentUser} />
      <div style={styles.layoutBody}>
        <Sidebar activeTab="TOURNAMENTS" />
        <main style={styles.main}>
          {/* Header Title */}
          <div style={styles.headerLeft}>
            <div style={styles.iconBox}>
              <Trophy size={20} />
            </div>
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
                    onWin={handleWin}
                    onAddMoreTeams={() => setShowEditModal(true)}
                  />
                ))}

                {/* Champion Trophy Column */}
                <div style={styles.championCol}>
                  <div style={styles.championHeaderBadge}>
                    <Trophy size={14} color="#92400E" />
                    <span>CHAMPION</span>
                  </div>
                  <div
                    style={{
                      ...styles.trophyCircle,
                      ...(bracket.champion_team ? styles.trophyCircleWon : {}),
                    }}
                  >
                    <Trophy size={42} color="#D97706" />
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

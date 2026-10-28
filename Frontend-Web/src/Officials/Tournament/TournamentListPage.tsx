import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus, RefreshCw, Award, ChevronRight, Edit2, Trash2, AlertCircle, X } from 'lucide-react';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getSports,
  getTournamentBrackets,
  deleteTournamentBracket,
  TournamentBracket,
} from '../../api/client';
import type { AuthUser } from '../../api/types';
import { styles } from './styles/TournamentListPage';
import { TournamentModal } from './TournamentModal';

// Status style resolver using styles from TournamentListPage.ts
const getStatusStyle = (status: string): React.CSSProperties => {
  if (status === 'Completed') return styles.cardStatusCompleted;
  if (status === 'Active' || status === 'Ongoing') return styles.cardStatusOngoing;
  return styles.cardStatusDefault;
};

const displayStatus = (status: string) => {
  if (status === 'Active' || status === 'Ongoing') return 'ONGOING';
  if (status === 'Completed') return 'COMPLETED';
  return (status || 'ONGOING').toUpperCase();
};

// Tournament card
interface TournamentCardProps {
  bracket: TournamentBracket;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ bracket, onClick, onEdit, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const totalMatches = bracket.stages.reduce((acc, s) => acc + s.matches.length, 0);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ ...styles.card, ...(hovered ? styles.cardHovered : {}) }}
    >
      <div style={styles.cardTopRow}>
        <span style={styles.cardSportBadge}>{bracket.sport_type}</span>
        <div style={styles.cardRightCluster}>
          <span style={getStatusStyle(bracket.status)}>{displayStatus(bracket.status)}</span>
          <button
            type="button"
            title="Edit tournament"
            onClick={onEdit}
            style={styles.cardEditBtn}
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            title="Remove tournament"
            onClick={onDelete}
            style={styles.cardDeleteBtn}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <h3 style={styles.cardName}>{bracket.tournament_name}</h3>

      <div style={styles.cardMeta}>
        <span style={styles.cardMetaItem}>
          <Trophy size={13} />
          {totalMatches} {totalMatches === 1 ? 'Match' : 'Matches'}
        </span>
        <span style={styles.cardMetaItem}>Single-Elimination</span>
      </div>

      {bracket.champion_team && (
        <div style={styles.cardChampion}>
          <Award size={14} />
          <span>Champion: {bracket.champion_team}</span>
        </div>
      )}

      <div style={styles.cardFooter}>
        <span style={styles.viewBtn}>
          VIEW BRACKET <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
};

// Tournament list page
export const TournamentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser] = useState<AuthUser | null>(getStoredUser());

  const [sports, setSports] = useState<string[]>(() => {
    const cached = getCachedData<any>('sports_catalog_false');
    if (cached?.sports?.length) {
      return ['ALL', ...cached.sports.map((s: any) => (s.sport_name || '').toUpperCase()).filter(Boolean)];
    }
    return ['ALL'];
  });

  const [selectedSport, setSelectedSport] = useState('ALL');

  const [brackets, setBrackets] = useState<TournamentBracket[]>(() =>
    getCachedData<TournamentBracket[]>('tournament_brackets_ALL') ||
    getCachedData<TournamentBracket[]>('tournament_brackets_all') || []
  );

  const [loading, setLoading] = useState(!brackets.length);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBracket, setEditingBracket] = useState<TournamentBracket | null>(null);
  const [deletingBracket, setDeletingBracket] = useState<TournamentBracket | null>(null);

  useEffect(() => {
    if (!getStoredToken()) navigate('/login');
  }, [navigate]);

  useEffect(() => {
    getSports()
      .then((res) => {
        const names = (res.sports || []).map((s: any) => (s.sport_name || '').toUpperCase()).filter(Boolean);
        if (names.length) setSports(['ALL', ...names]);
      })
      .catch(() => {});
  }, []);

  const loadBrackets = useCallback(async (sport: string, force = false) => {
    const cacheKey = `tournament_brackets_${sport}`;
    const cached = getCachedData<TournamentBracket[]>(cacheKey);

    if (cached && cached.length > 0 && !force) {
      setBrackets(cached);
      setLoading(false);
      getTournamentBrackets(sport).then(setBrackets).catch(() => {});
      return;
    }

    setLoading(true);
    try {
      const list = await getTournamentBrackets(sport);
      setBrackets(list);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBrackets(selectedSport);
  }, [selectedSport, loadBrackets]);

  const confirmDelete = async () => {
    if (!deletingBracket) return;
    const b = deletingBracket;
    setDeletingBracket(null);
    try {
      await deleteTournamentBracket(b.bracket_id);
      setBrackets((prev) => prev.filter((item) => item.bracket_id !== b.bracket_id));
    } catch {
      alert('Failed to remove tournament.');
    }
  };

  return (
    <div style={styles.shell}>
      <Navbar user={currentUser} />
      <div style={styles.layoutBody}>
        <Sidebar activeTab="TOURNAMENTS" />
        <main style={styles.main}>
          {/* Header */}
          <div style={styles.headerRow}>
            <div style={styles.headerLeft}>
              <div style={styles.iconBox}><Trophy size={22} /></div>
              <div>
                <h1 style={styles.titleH1}>TOURNAMENTS</h1>
                <p style={styles.subtitle}>
                  {brackets.length > 0
                    ? `${brackets.length} tournament${brackets.length !== 1 ? 's' : ''} found — click one to view its bracket`
                    : 'Create and manage single-elimination tournament brackets'}
                </p>
              </div>
            </div>
            <div style={styles.headerActions}>
              <button type="button" style={styles.refreshBtn} onClick={() => loadBrackets(selectedSport, true)}>
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button type="button" style={styles.createBtn} onClick={() => setShowCreate(true)}>
                <Plus size={16} /><span>NEW TOURNAMENT</span>
              </button>
            </div>
          </div>

          {/* Sport filter */}
          <div style={styles.filterBar}>
            {sports.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSport(s)}
                style={{ ...styles.sportPill, ...(selectedSport === s ? styles.sportPillActive : {}) }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading && !brackets.length ? (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <span style={styles.spinnerText}>Loading tournaments...</span>
            </div>
          ) : brackets.length === 0 ? (
            <div style={styles.emptyBox}>
              <div style={styles.emptyIcon}><Trophy size={36} /></div>
              <div>
                <h3 style={styles.emptyTitle}>No Tournaments Yet</h3>
                <p style={styles.emptyDesc}>
                  Create your first tournament for{' '}
                  {selectedSport === 'ALL' ? 'any sport' : selectedSport} to get started with bracket management.
                </p>
              </div>
              <button type="button" style={styles.emptyBtn} onClick={() => setShowCreate(true)}>
                <Plus size={16} /><span>CREATE FIRST TOURNAMENT</span>
              </button>
            </div>
          ) : (
            <div style={styles.grid}>
              {brackets.map((b) => (
                <TournamentCard
                  key={b.bracket_id}
                  bracket={b}
                  onClick={() => navigate(`/tournaments/${b.bracket_id}`, { state: { bracket: b } })}
                  onEdit={(e) => {
                    e.stopPropagation();
                    setEditingBracket(b);
                  }}
                  onDelete={(e) => {
                    e.stopPropagation();
                    setDeletingBracket(b);
                  }}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Unified modal for both creating and editing */}
      {(showCreate || editingBracket) && (
        <TournamentModal
          bracket={editingBracket}
          sports={sports}
          initialSport={selectedSport !== 'ALL' ? selectedSport : undefined}
          onClose={() => {
            setShowCreate(false);
            setEditingBracket(null);
          }}
          onSaved={(savedBracket) => {
            if (editingBracket) {
              setBrackets((prev) =>
                prev.map((item) => (item.bracket_id === savedBracket.bracket_id ? savedBracket : item))
              );
            } else {
              setBrackets((prev) => [savedBracket, ...prev]);
            }
            setShowCreate(false);
            setEditingBracket(null);
          }}
        />
      )}

      {/* Confirmation Modal to remove tournament (replaces browser confirm) */}
      {deletingBracket && (
        <div style={styles.modalOverlay} onClick={() => setDeletingBracket(null)}>
          <div style={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmHeader}>
              <div style={styles.confirmHeaderLeft}>
                <AlertCircle size={20} color="#E11D48" />
                <h3 style={styles.confirmTitle}>Remove Tournament</h3>
              </div>
              <button type="button" onClick={() => setDeletingBracket(null)} style={styles.modalClose}>
                <X size={18} />
              </button>
            </div>

            <p style={styles.confirmDesc}>
              Are you sure you want to remove <span style={styles.confirmTournamentName}>"{deletingBracket.tournament_name}"</span>?
            </p>

            <div style={styles.confirmActions}>
              <button type="button" onClick={() => setDeletingBracket(null)} style={styles.cancelBtn}>
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

export default TournamentListPage;

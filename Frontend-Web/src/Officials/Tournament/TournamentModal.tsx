import React, { useState, useEffect } from 'react';
import { Trophy, Edit3, X, AlertCircle, Info } from 'lucide-react';
import {
  saveTournamentBracket,
  updateTournamentBracket,
  getSports,
  getCachedData,
  invalidateCache,
  TournamentBracket,
  BracketStage,
  BracketMatch,
} from '../../api/client';
import { styles } from './styles/TournamentListPage';

export interface TournamentModalProps {
  bracket?: TournamentBracket | null;
  sports?: string[];
  initialSport?: string;
  onClose: () => void;
  onSaved: (b: TournamentBracket) => void;
}

// Dynamically extract team names from an existing tournament bracket
const extractBracketTeams = (b?: TournamentBracket | null): string[] => {
  if (!b) return Array(8).fill('');
  if (Array.isArray((b as any).teams) && (b as any).teams.length > 0) {
    return (b as any).teams;
  }
  const firstStage = b.stages?.[0];
  if (firstStage?.matches?.length) {
    const list: string[] = [];
    firstStage.matches.forEach((m) => {
      const h = m.home_team?.team_name?.trim();
      const a = m.away_team?.team_name?.trim();
      const isSkip = (name?: string) =>
        !name ||
        name.startsWith('BYE') ||
        name.startsWith('No Opponent') ||
        name.startsWith('Winner') ||
        name.startsWith('TBD');
      if (h && !isSkip(h)) list.push(h);
      if (a && !isSkip(a)) list.push(a);
    });
    if (list.length > 0) return list;
  }
  return Array(8).fill('');
};

// Generates single-elimination tournament stages based on seeded teams
function buildEliminationStages(cleanTeams: string[]): BracketStage[] {
  let bracketSize = 2;
  while (bracketSize < cleanTeams.length) bracketSize *= 2;
  const numRounds = Math.log2(bracketSize);

  let order = [1, 2];
  while (order.length < bracketSize) {
    const nextSize = order.length * 2;
    const nextOrder: number[] = [];
    for (const s of order) {
      nextOrder.push(s);
      nextOrder.push(nextSize + 1 - s);
    }
    order = nextOrder;
  }

  const seededSlots = order.map((seedNum) => ({
    team_name: seedNum <= cleanTeams.length ? cleanTeams[seedNum - 1] : 'No Opponent',
    seed: seedNum,
    isBye: seedNum > cleanTeams.length,
  }));

  const getStageName = (roundIdx: number) => {
    const fromFinals = numRounds - 1 - roundIdx;
    if (fromFinals === 0) return 'Finals';
    if (fromFinals === 1) return 'Semifinals';
    if (fromFinals === 2) return 'Quarterfinals';
    if (fromFinals === 3) return 'Round of 16';
    return `Round ${roundIdx + 1}`;
  };

  const stages: BracketStage[] = [];
  const r1Matches: BracketMatch[] = [];
  const r1Count = bracketSize / 2;

  for (let i = 0; i < r1Count; i++) {
    const home = seededSlots[i * 2];
    const away = seededSlots[i * 2 + 1];
    r1Matches.push({
      match_id: `M_R1_${i + 1}`,
      round_number: 1,
      stage_name: getStageName(0),
      home_team: { team_name: home.team_name, seed: home.seed, score: 0 },
      away_team: { team_name: away.team_name, seed: away.seed, score: 0 },
      status: 'SCHEDULED',
      winner_team_name: undefined,
      next_match_id: numRounds > 1 ? `M_R2_${Math.floor(i / 2) + 1}` : undefined,
      slot_for_next: i % 2 === 0 ? 'home' : 'away',
    });
  }
  stages.push({ stage_name: getStageName(0), round_number: 1, matches: r1Matches });

  for (let r = 1; r < numRounds; r++) {
    const roundNumber = r + 1;
    const roundMatches: BracketMatch[] = [];
    const matchCount = bracketSize / Math.pow(2, r + 1);
    const prevMatches = stages[r - 1].matches;

    for (let m = 0; m < matchCount; m++) {
      const prevHome = prevMatches[m * 2];
      const prevAway = prevMatches[m * 2 + 1];

      roundMatches.push({
        match_id: `M_R${roundNumber}_${m + 1}`,
        round_number: roundNumber,
        stage_name: getStageName(r),
        home_team: { team_name: `TBD (Winner ${prevHome?.match_id || ''})`, score: 0 },
        away_team: { team_name: `TBD (Winner ${prevAway?.match_id || ''})`, score: 0 },
        status: 'PENDING',
        next_match_id: roundNumber < numRounds ? `M_R${roundNumber + 1}_${Math.floor(m / 2) + 1}` : undefined,
        slot_for_next: m % 2 === 0 ? 'home' : 'away',
      });
    }
    stages.push({ stage_name: getStageName(r), round_number: roundNumber, matches: roundMatches });
  }

  return stages;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  bracket,
  sports = [],
  initialSport,
  onClose,
  onSaved,
}) => {
  const isEdit = Boolean(bracket);

  // Available sports - initialized from cache/props, refreshed from system admin API
  const [availableSports, setAvailableSports] = useState<string[]>(() => {
    const cached = getCachedData<any>('sports_catalog_false');
    if (cached?.sports?.length) {
      return cached.sports
        .filter((s: any) => s.is_active !== false)
        .map((s: any) => (s.sport_name || '').toUpperCase())
        .filter(Boolean);
    }
    const propSports = sports.filter((s) => s !== 'ALL');
    return propSports.length > 0 ? propSports : ['BASKETBALL', 'VOLLEYBALL', 'BADMINTON'];
  });

  const [title, setTitle] = useState(bracket?.tournament_name || '');
  const [sport, setSport] = useState(
    bracket?.sport_type ||
    (initialSport && initialSport !== 'ALL' ? initialSport : availableSports[0] || 'BASKETBALL')
  );

  // Dynamic teams list - initialized from existing bracket or default 8 slots
  const [teams, setTeams] = useState<string[]>(() => extractBracketTeams(bracket));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when bracket prop updates
  useEffect(() => {
    if (bracket) {
      setTitle(bracket.tournament_name || '');
      setSport(bracket.sport_type || 'BASKETBALL');
      setTeams(extractBracketTeams(bracket));
    }
  }, [bracket]);

  // Check if sport is timed (Track & Field, Swimming) vs Ball / Head-to-Head games
  const isTimedSport = /track|field|athletic|swim|running/i.test(sport);

  // Check if tournament is finished (has champion or completed status)
  const isFinished = Boolean(bracket?.champion_team || bracket?.status === 'Completed');

  // Check if tournament is ongoing / has any match winner (locks team roster)
  const isOngoing =
    isFinished ||
    Boolean(
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

  // Even validation for ball/head-to-head games
  const isEvenCount = teams.length >= 2 && teams.length % 2 === 0;

  // Fetch live sports created by system administrator
  useEffect(() => {
    getSports(false, true)
      .then((res) => {
        const names = (res.sports || [])
          .filter((s: any) => s.is_active !== false)
          .map((s: any) => (s.sport_name || '').toUpperCase())
          .filter(Boolean);
        if (names.length) {
          setAvailableSports(names);
        }
      })
      .catch(() => {});
  }, []);

  const updateTeam = (i: number, val: string) => {
    setTeams((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
    if (errorMsg) setErrorMsg(null);
  };

  const handleAddTeam = () => {
    setTeams((prev) => [...prev, '']);
    if (errorMsg) setErrorMsg(null);
  };

  const handleAddPair = () => {
    setTeams((prev) => [...prev, '', '']);
    if (errorMsg) setErrorMsg(null);
  };

  const handleRemoveTeam = () => {
    if (teams.length <= 2) return;
    setTeams((prev) => prev.slice(0, prev.length - 1));
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Validate even number for ball/head-to-head games
    if (!isTimedSport) {
      if (teams.length < 2) {
        setErrorMsg('At least 2 teams are required.');
        return;
      }
      if (teams.length % 2 !== 0) {
        setErrorMsg(
          `Cannot save tournament with ${teams.length} teams. An even number of teams (e.g. 4, 6, 8, 10, 12, 16) is required so every team has an opponent.`
        );
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const cleanTeams = teams.map((t, i) => t.trim() || `Team ${i + 1}`);

      if (isEdit && bracket) {
        const originalTeams = extractBracketTeams(bracket);
        const teamsChanged =
          !isOngoing &&
          (cleanTeams.length !== originalTeams.length ||
          cleanTeams.some((t, i) => t !== originalTeams[i]));

        const updatedStages = teamsChanged
          ? buildEliminationStages(cleanTeams)
          : bracket.stages;

        const updated = await updateTournamentBracket(bracket.bracket_id, {
          ...bracket,
          bracket_id: bracket.bracket_id,
          tournament_name: title.trim(),
          sport_type: sport,
          stages: updatedStages,
          ...({ teams: cleanTeams, total_teams: cleanTeams.length } as any),
        });
        onSaved(updated);
      } else {
        const generatedStages = buildEliminationStages(cleanTeams);
        const created = await saveTournamentBracket({
          tournament_name: title.trim(),
          sport_type: sport,
          format: isTimedSport ? ('round_robin' as any) : 'single_elimination',
          status: 'Active',
          stages: generatedStages,
          ...({
            teams: cleanTeams,
            total_teams: cleanTeams.length,
            tournament_type: isTimedSport ? 'timed_heats' : 'bracket',
          } as any),
        });
        invalidateCache('tournament_brackets');
        onSaved(created);
      }
    } catch {
      alert(`Failed to ${isEdit ? 'update' : 'create'} tournament. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalHeaderLeft}>
            {isEdit ? <Edit3 size={20} color="#0284C7" /> : <Trophy size={20} color="#E11D48" />}
            <h2 style={styles.modalTitle}>
              {isEdit
                ? 'Tournament & Teams'
                : isTimedSport
                ? 'Create Timed Meet (Heats & Finals)'
                : 'Create Single-Elimination Bracket'}
            </h2>
          </div>
          <button type="button" onClick={onClose} style={styles.modalClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.modalForm}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>TOURNAMENT TITLE</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Atleta Collegiate Championship 2026"
              style={styles.formInput}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.formLabel}>SPORT CATEGORY</label>
            <select
              value={sport}
              onChange={(e) => {
                setSport(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              style={styles.formSelect}
            >
              {availableSports.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Timed Sport Explanation Notice */}
          {isTimedSport && (
            <div style={styles.timedSportNotice}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                <Info size={16} />
                <span>Timed Progression Format (World Athletics / FINA)</span>
              </div>
              <span>
                {sport} uses timed rounds (Heats &rarr; Semifinals &rarr; Finals) with lane seeding.
                Athletes are seeded by qualification times and lane draws rather than 1-on-1 knockout matchups.
              </span>
            </div>
          )}

          {/* Team / Competitor Seeding Section for creation and editing */}
          <div>
            <div style={styles.seedingHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={styles.formLabel}>
                  {isTimedSport
                    ? `COMPETITORS / ENTRIES (${teams.length})`
                    : `TOURNAMENT TEAMS (${teams.length})`}
                </label>
                {!isTimedSport && !isOngoing && (
                  <span style={isEvenCount ? styles.evenValidationValid : styles.evenValidationInvalid}>
                    {isEvenCount ? '✓ Even count' : '⚠ Odd count (needs pair)'}
                  </span>
                )}
                {isOngoing && (
                  <span style={styles.evenValidationValid}>
                    {isFinished
                      ? '(Locked - Tournament is Finished)'
                      : '(Locked - Ongoing Tournament)'}
                  </span>
                )}
              </div>

              {!isOngoing && (
                <div style={styles.seedingControls}>
                  <button type="button" style={styles.addTeamBtn} onClick={handleAddPair}>
                    +2 Teams
                  </button>
                  <button type="button" style={styles.addTeamBtn} onClick={handleAddTeam}>
                    +1 Team
                  </button>
                  {teams.length > 2 && (
                    <button type="button" style={styles.removeTeamBtn} onClick={handleRemoveTeam}>
                      -1 Team
                    </button>
                  )}
                  <button
                    type="button"
                    style={styles.resetLink}
                    onClick={() => setTeams(Array(teams.length).fill(''))}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {errorMsg && (
              <div style={{ ...styles.evenErrorBanner, marginBottom: 10 }}>
                <AlertCircle size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                {errorMsg}
              </div>
            )}

            <div style={styles.seedingGrid}>
              {teams.map((val, i) => (
                <div key={i} style={styles.seedRow}>
                  <span style={styles.seedIdx}>#{i + 1}</span>
                  <input
                    type="text"
                    required
                    disabled={isOngoing}
                    value={val}
                    onChange={(e) => updateTeam(i, e.target.value)}
                    placeholder={isTimedSport ? `Athlete ${i + 1}` : `Team ${i + 1}`}
                    style={styles.seedInput}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (!isTimedSport && !isEvenCount)}
              style={
                !isTimedSport && !isEvenCount
                  ? { ...styles.submitBtn, opacity: 0.5, cursor: 'not-allowed' }
                  : isEdit
                  ? { ...styles.submitBtn, backgroundColor: '#1E3A8A' }
                  : styles.submitBtn
              }
            >
              {submitting
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                ? 'Save Changes'
                : isTimedSport
                ? 'Create Timed Meet'
                : 'Generate Bracket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TournamentModal;

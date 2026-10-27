import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Plus,
  RefreshCw,
  Award,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import {
  getStoredToken,
  getStoredUser,
  getTournamentBrackets,
  saveTournamentBracket,
  advanceBracketTeam,
  TournamentBracket,
  BracketMatch,
} from '../../api/client';
import type { AuthUser } from '../../api/types';

const SPORTS = ['BASKETBALL', 'VOLLEYBALL', 'SOCCER', 'BADMINTON', 'ALL'];

const DEFAULT_TEAMS_BY_SPORT: Record<string, string[]> = {
  BASKETBALL: [
    'Ateneo Blue Eagles',
    'La Salle Green Archers',
    'UP Fighting Maroons',
    'UST Growling Tigers',
    'FEU Tamaraws',
    'NU Bulldogs',
    'Adamson Soaring Falcons',
    'UE Red Warriors',
  ],
  VOLLEYBALL: [
    'Creamline Cool Smashers',
    'Petro Gazz Angels',
    'Choco Mucho Flying Titans',
    'Cignal HD Spikers',
    'Chery Tiggo Crossovers',
    'PLDT High Speed Hitters',
    'Akari Chargers',
    'Galeries Tower Highrisers',
  ],
  SOCCER: [
    'Kaya FC Iloilo',
    'Dynamic Herb Cebu',
    'Stallion Laguna FC',
    'United City FC',
    'Mendiola 1991',
    'Maharlika Manila',
    'Davao Aguilas',
    'Loyola FC',
  ],
  BADMINTON: [
    'Smashers Elite',
    'Metro Shuttlers',
    'Apex Badminton Club',
    'Prime Strikers',
    'Royal Racquets',
    'Thunder Shuttles',
    'Golden Birdies',
    'Phoenix Racquet Club',
  ],
};

export const TournamentBracketPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser] = useState<AuthUser | null>(getStoredUser());
  const [selectedSport, setSelectedSport] = useState<string>('BASKETBALL');
  const [brackets, setBrackets] = useState<TournamentBracket[]>([]);
  const [activeBracket, setActiveBracket] = useState<TournamentBracket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [advancingMatchId, setAdvancingMatchId] = useState<string | null>(null);

  // New Bracket Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSport, setNewSport] = useState<string>('BASKETBALL');
  const [teamInputs, setTeamInputs] = useState<string[]>(DEFAULT_TEAMS_BY_SPORT.BASKETBALL);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  const loadBrackets = async (sport: string) => {
    setLoading(true);
    try {
      const list = await getTournamentBrackets(sport);
      setBrackets(list);
      if (list.length > 0) {
        setActiveBracket((prev) => {
          if (!prev) return list[0];
          const found = list.find((b) => b.bracket_id === prev.bracket_id);
          return found || list[0];
        });
      } else {
        setActiveBracket(null);
      }
    } catch (err) {
      console.error('Error fetching brackets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrackets(selectedSport);
  }, [selectedSport]);

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
  };

  const handleOpenCreate = () => {
    const sp = selectedSport === 'ALL' ? 'BASKETBALL' : selectedSport;
    setNewSport(sp);
    setTeamInputs(DEFAULT_TEAMS_BY_SPORT[sp] || DEFAULT_TEAMS_BY_SPORT.BASKETBALL);
    setNewTitle(`Atleta ${sp} Cup 2026`);
    setShowCreateModal(true);
  };

  const handleCreateBracket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const cleanTeams = teamInputs.map((t, idx) => t.trim() || `Team ${idx + 1}`);
      const created = await saveTournamentBracket({
        tournament_name: newTitle.trim(),
        sport_type: newSport,
        format: 'single_elimination',
        status: 'Active',
        stages: [],
        ...( { teams: cleanTeams, total_teams: 8 } as any ),
      });
      setShowCreateModal(false);
      await loadBrackets(selectedSport);
      setActiveBracket(created);
    } catch (err) {
      console.error('Failed to create bracket:', err);
      alert('Failed to create tournament bracket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceWinner = async (match: BracketMatch, winnerTeam: string) => {
    if (!activeBracket || !winnerTeam || winnerTeam.toLowerCase().includes('tbd')) return;
    setAdvancingMatchId(match.match_id);
    try {
      const isHome = winnerTeam === match.home_team?.team_name;
      const homeScore = isHome ? 2 : 0;
      const awayScore = isHome ? 0 : 2;

      const updated = await advanceBracketTeam(
        activeBracket.bracket_id,
        match.match_id,
        winnerTeam,
        homeScore,
        awayScore
      );
      setActiveBracket(updated);
      setBrackets((prev) => prev.map((b) => (b.bracket_id === updated.bracket_id ? updated : b)));
    } catch (err) {
      console.error('Failed to advance team:', err);
      alert('Failed to advance team in bracket.');
    } finally {
      setAdvancingMatchId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0B0F17', color: '#F8FAFC', overflow: 'hidden' }}>
      <Navbar user={currentUser} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar activeTab="BRACKETS" />

        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(225, 29, 72, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E11D48' }}>
                  <Trophy size={22} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
                    TOURNAMENT BRACKETING SYSTEM
                  </h1>
                  <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#94A3B8' }}>
                    Manage team seedings, stage advancements (Quarterfinals, Semifinals, Finals), and determine tournament champions.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => loadBrackets(selectedSport)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#CBD5E1',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  backgroundColor: '#E11D48',
                  border: 'none',
                  borderRadius: 8,
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
                }}
              >
                <Plus size={16} />
                <span>NEW BRACKET</span>
              </button>
            </div>
          </div>

          {/* Sport Selector & Bracket List Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #1E293B', paddingBottom: 16 }}>
            {/* Sport Pills */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {SPORTS.map((sport) => {
                const isSelected = selectedSport === sport;
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => handleSportChange(sport)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #E11D48' : '1px solid #1E293B',
                      backgroundColor: isSelected ? '#E11D48' : '#131B2B',
                      color: isSelected ? '#FFFFFF' : '#94A3B8',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {sport}
                  </button>
                );
              })}
            </div>

            {/* Bracket selector dropdown if multiple brackets */}
            {brackets.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Active Bracket:</span>
                <select
                  value={activeBracket?.bracket_id || ''}
                  onChange={(e) => {
                    const found = brackets.find((b) => b.bracket_id === e.target.value);
                    if (found) setActiveBracket(found);
                  }}
                  style={{
                    backgroundColor: '#1E293B',
                    color: '#F8FAFC',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {brackets.map((b) => (
                    <option key={b.bracket_id} value={b.bracket_id}>
                      {b.tournament_name} ({b.sport_type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Bracket Main Stage View */}
          {loading && !activeBracket ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 350, gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #334155', borderTopColor: '#E11D48', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 14, color: '#94A3B8' }}>Loading tournament bracket data...</span>
            </div>
          ) : !activeBracket ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              backgroundColor: '#111827',
              borderRadius: 12,
              border: '1px dashed #334155',
              padding: 40,
              textAlign: 'center',
              gap: 16
            }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(225, 29, 72, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E11D48' }}>
                <Trophy size={32} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>No Tournament Brackets Found</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#94A3B8', maxWidth: 440 }}>
                  Create your first single-elimination bracket for {selectedSport === 'ALL' ? 'any sport' : selectedSport} to begin managing stage matchups, seeding, and advancement workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 22px',
                  backgroundColor: '#E11D48',
                  border: 'none',
                  borderRadius: 8,
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: 8,
                }}
              >
                <Plus size={16} />
                <span>CREATE FIRST BRACKET</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Bracket Summary Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                backgroundColor: '#131B2B',
                borderRadius: 10,
                border: '1px solid #1E293B',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    backgroundColor: 'rgba(225, 29, 72, 0.15)',
                    color: '#E11D48',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                  }}>
                    {activeBracket.sport_type}
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                    {activeBracket.tournament_name}
                  </span>
                  <span style={{ fontSize: 12, color: '#64748B' }}>
                    • Single-Elimination
                  </span>
                </div>

                {activeBracket.champion_team && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10B981',
                    borderRadius: 8,
                    color: '#10B981',
                    fontWeight: 700,
                    fontSize: 13,
                  }}>
                    <Award size={16} />
                    <span>CHAMPION: {activeBracket.champion_team}</span>
                  </div>
                )}
              </div>

              {/* Tournament Tree Columns */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 24,
                alignItems: 'start',
                overflowX: 'auto',
                paddingBottom: 20,
              }}>
                {activeBracket.stages.map((stage, stageIdx) => {
                  return (
                    <div
                      key={stage.round_number || stageIdx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16,
                        backgroundColor: '#101726',
                        border: '1px solid #1E293B',
                        borderRadius: 12,
                        padding: 18,
                        minWidth: 280,
                      }}
                    >
                      {/* Stage Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: '#1E293B',
                            color: '#94A3B8',
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            {stageIdx + 1}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', color: '#F1F5F9' }}>
                            {stage.stage_name.toUpperCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                          {stage.matches.length} {stage.matches.length === 1 ? 'Match' : 'Matches'}
                        </span>
                      </div>

                      {/* Matches in Stage */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {stage.matches.map((match, matchIdx) => {
                          const isComplete = match.status === 'COMPLETED' && !!match.winner_team_name;
                          const isHomeAdvancing = advancingMatchId === match.match_id;
                          const homeName = match.home_team?.team_name || 'TBD';
                          const awayName = match.away_team?.team_name || 'TBD';
                          const homeIsWinner = match.winner_team_name === homeName;
                          const awayIsWinner = match.winner_team_name === awayName;

                          return (
                            <div
                              key={match.match_id || matchIdx}
                              style={{
                                backgroundColor: '#162235',
                                borderRadius: 10,
                                border: isComplete ? '1px solid #334155' : '1px solid #1E293B',
                                padding: 12,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                position: 'relative',
                                boxShadow: isComplete ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                              }}
                            >
                              {/* Match meta */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '0.05em' }}>
                                  MATCH #{matchIdx + 1}
                                </span>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: isComplete ? '#10B981' : '#E2E8F0',
                                  backgroundColor: isComplete ? 'rgba(16, 185, 129, 0.1)' : '#1E293B',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                }}>
                                  {isComplete ? 'COMPLETED' : 'SCHEDULED'}
                                </span>
                              </div>

                              {/* Home Team Card */}
                              <div
                                onClick={() => !isComplete && homeName && !homeName.includes('TBD') && handleAdvanceWinner(match, homeName)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  backgroundColor: homeIsWinner ? 'rgba(16, 185, 129, 0.15)' : '#0F172A',
                                  border: homeIsWinner ? '1px solid #10B981' : '1px solid #1E293B',
                                  cursor: !isComplete && homeName && !homeName.includes('TBD') ? 'pointer' : 'default',
                                  transition: 'all 0.15s ease',
                                }}
                                title={!isComplete ? `Click to advance ${homeName}` : undefined}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', width: 20 }}>
                                    #{match.home_team?.seed || '-'}
                                  </span>
                                  <span style={{
                                    fontSize: 12,
                                    fontWeight: homeIsWinner ? 700 : 500,
                                    color: homeIsWinner ? '#10B981' : homeName.includes('TBD') ? '#64748B' : '#F8FAFC',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}>
                                    {homeName}
                                  </span>
                                </div>

                                {match.home_team?.score !== undefined && (
                                  <span style={{ fontSize: 12, fontWeight: 700, color: homeIsWinner ? '#10B981' : '#94A3B8', marginLeft: 8 }}>
                                    {match.home_team.score}
                                  </span>
                                )}

                                {!isComplete && homeName && !homeName.includes('TBD') && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAdvanceWinner(match, homeName);
                                    }}
                                    disabled={isHomeAdvancing}
                                    style={{
                                      marginLeft: 6,
                                      padding: '2px 6px',
                                      fontSize: 10,
                                      fontWeight: 700,
                                      backgroundColor: '#E11D48',
                                      color: '#FFF',
                                      border: 'none',
                                      borderRadius: 4,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    WIN
                                  </button>
                                )}
                              </div>

                              {/* Away Team Card */}
                              <div
                                onClick={() => !isComplete && awayName && !awayName.includes('TBD') && handleAdvanceWinner(match, awayName)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  backgroundColor: awayIsWinner ? 'rgba(16, 185, 129, 0.15)' : '#0F172A',
                                  border: awayIsWinner ? '1px solid #10B981' : '1px solid #1E293B',
                                  cursor: !isComplete && awayName && !awayName.includes('TBD') ? 'pointer' : 'default',
                                  transition: 'all 0.15s ease',
                                }}
                                title={!isComplete ? `Click to advance ${awayName}` : undefined}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', width: 20 }}>
                                    #{match.away_team?.seed || '-'}
                                  </span>
                                  <span style={{
                                    fontSize: 12,
                                    fontWeight: awayIsWinner ? 700 : 500,
                                    color: awayIsWinner ? '#10B981' : awayName.includes('TBD') ? '#64748B' : '#F8FAFC',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}>
                                    {awayName}
                                  </span>
                                </div>

                                {match.away_team?.score !== undefined && (
                                  <span style={{ fontSize: 12, fontWeight: 700, color: awayIsWinner ? '#10B981' : '#94A3B8', marginLeft: 8 }}>
                                    {match.away_team.score}
                                  </span>
                                )}

                                {!isComplete && awayName && !awayName.includes('TBD') && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAdvanceWinner(match, awayName);
                                    }}
                                    disabled={isHomeAdvancing}
                                    style={{
                                      marginLeft: 6,
                                      padding: '2px 6px',
                                      fontSize: 10,
                                      fontWeight: 700,
                                      backgroundColor: '#E11D48',
                                      color: '#FFF',
                                      border: 'none',
                                      borderRadius: 4,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    WIN
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Champion Trophy Column */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(225, 29, 72, 0.05)',
                    border: '1px dashed #E11D48',
                    borderRadius: 12,
                    padding: 24,
                    minWidth: 240,
                    minHeight: 300,
                    textAlign: 'center',
                    gap: 14,
                  }}
                >
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    backgroundColor: activeBracket.champion_team ? 'rgba(234, 179, 8, 0.2)' : 'rgba(225, 29, 72, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: activeBracket.champion_team ? '#EAB308' : '#E11D48',
                    boxShadow: activeBracket.champion_team ? '0 0 20px rgba(234, 179, 8, 0.4)' : 'none',
                  }}>
                    <Trophy size={36} />
                  </div>

                  <div>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: '#94A3B8' }}>
                      TOURNAMENT CHAMPION
                    </span>
                    <h3 style={{
                      margin: '6px 0 0 0',
                      fontSize: 18,
                      fontWeight: 800,
                      color: activeBracket.champion_team ? '#FDE047' : '#64748B',
                    }}>
                      {activeBracket.champion_team || 'UNDECIDED'}
                    </h3>
                  </div>

                  {activeBracket.champion_team && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#10B981',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      padding: '4px 10px',
                      borderRadius: 6,
                    }}>
                      <CheckCircle2 size={14} />
                      <span>Title Finalized</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create New Bracket Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            backgroundColor: '#0F172A',
            border: '1px solid #334155',
            borderRadius: 14,
            width: '100%',
            maxWidth: 580,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Trophy size={20} color="#E11D48" />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                  Create Single-Elimination Bracket
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBracket} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  TOURNAMENT TITLE
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Atleta Collegiate Championship 2026"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#F8FAFC',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#CBD5E1', marginBottom: 6 }}>
                  SPORT CATEGORY
                </label>
                <select
                  value={newSport}
                  onChange={(e) => {
                    const sp = e.target.value;
                    setNewSport(sp);
                    setTeamInputs(DEFAULT_TEAMS_BY_SPORT[sp] || DEFAULT_TEAMS_BY_SPORT.BASKETBALL);
                  }}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    padding: '10px 14px',
                    color: '#F8FAFC',
                    fontSize: 13,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {SPORTS.filter((s) => s !== 'ALL').map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#CBD5E1' }}>
                    SEEDING (8 TEAMS)
                  </label>
                  <button
                    type="button"
                    onClick={() => setTeamInputs(DEFAULT_TEAMS_BY_SPORT[newSport] || DEFAULT_TEAMS_BY_SPORT.BASKETBALL)}
                    style={{ fontSize: 11, color: '#E11D48', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Reset Defaults
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {teamInputs.map((val, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', width: 22 }}>
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        required
                        value={val}
                        onChange={(e) => {
                          const updated = [...teamInputs];
                          updated[idx] = e.target.value;
                          setTeamInputs(updated);
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          padding: '8px 10px',
                          color: '#F8FAFC',
                          fontSize: 12,
                          outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '9px 16px',
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: 8,
                    color: '#94A3B8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#E11D48',
                    border: 'none',
                    borderRadius: 8,
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Generating...' : 'Generate Bracket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default TournamentBracketPage;

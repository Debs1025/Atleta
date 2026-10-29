import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Flame,
  Activity,
  Award,
  Zap,
  Target,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  User,
  Calendar,
} from 'lucide-react';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import {
  getStoredUser,
  getAthleteProfileForOfficial,
  getAthleteStatsAndMatchesForOfficial,
  AthleteOfficialAnalytics,
} from '../../api/client';
import type { AuthUser } from '../../api/types';
import { styles } from './styles/AthletePage';

export const AthletePage: React.FC = () => {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // Read preview state passed from ScoresheetMatch (if any)
  const navState = (location.state as any) || {};
  const previewAthlete = navState.athlete || {};
  const currentMatch = navState.currentMatch || null;

  const [profile, setProfile] = useState<any>(() => previewAthlete);
  const [analytics, setAnalytics] = useState<AthleteOfficialAnalytics | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ x: number; y: number; match: any } | null>(null);

  useEffect(() => {
    if (!athleteId) return;

    let isMounted = true;
    const cleanId = String(athleteId).replace(/^ath_/, '');

    const loadData = async () => {
      setLoading(!previewAthlete.name && !previewAthlete.full_name);

      try {
        const [profData, statsData] = await Promise.all([
          getAthleteProfileForOfficial(cleanId, {
            name: previewAthlete.name || previewAthlete.full_name,
            jersey_no: previewAthlete.jersey_no || previewAthlete.jersey_number,
            team_name: previewAthlete.team_name,
            sport: previewAthlete.sport,
            position: previewAthlete.position,
          }),
          getAthleteStatsAndMatchesForOfficial(
            cleanId,
            previewAthlete.name || previewAthlete.full_name,
            currentMatch
          ),
        ]);

        if (isMounted) {
          if (profData) {
            setProfile(profData);
          } else if (previewAthlete.name) {
            setProfile({
              athlete_id: athleteId,
              full_name: previewAthlete.name,
              jersey_number: previewAthlete.jersey_no || '-',
              team_name: previewAthlete.team_name || 'Tournament Team',
              sport: previewAthlete.sport || 'BASKETBALL',
              position: previewAthlete.position || 'Athlete',
              status: 'Active',
            });
          }
          if (statsData) setAnalytics(statsData);
        }
      } catch (err) {
        console.error('Failed to load official athlete analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [athleteId]);

  const athleteName =
    profile?.full_name ||
    (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : null) ||
    previewAthlete.name ||
    'ATHLETE PROFILE';

  const athleteInitials = useMemo(() => {
    const parts = athleteName.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (athleteName[0] || 'A').toUpperCase();
  }, [athleteName]);

  const jerseyNumber = profile?.jersey_number ?? previewAthlete.jersey_no ?? '-';
  const sportName = (profile?.sport || previewAthlete.sport || 'BASKETBALL').toUpperCase();
  const teamName = profile?.team_name || previewAthlete.team_name || 'Athletic Delegation';
  const position = profile?.position || previewAthlete.position || 'Player';
  const isRosterOnly = Boolean(profile?.is_roster_athlete || !profile?.user_id);

  const stats = analytics?.stats || {
    games_played: 1,
    ppg: 0,
    rpg: 0,
    apg: 0,
    spg: 0,
    bpg: 0,
    efficiency: 0,
    fg_pct: 50.0,
    win_rate: 100,
    total_pts: 0,
  };

  const matches = analytics?.matches || [];

  // SVG Curve calculations for match-by-match efficiency
  const svgData = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    const width = 640;
    const height = 180;
    const padding = 24;

    const effValues = matches.map((m) => Math.max(1, Number(m.efficiency || 0)));
    const maxEff = Math.max(...effValues, 20);
    const minEff = Math.min(...effValues, 0);
    const range = maxEff - minEff || 1;

    const points = matches.map((m, idx) => {
      const step = matches.length > 1 ? (width - padding * 2) / (matches.length - 1) : 0;
      const x = matches.length > 1 ? padding + idx * step : width / 2;
      const y = height - padding - ((Number(m.efficiency || 0) - minEff) / range) * (height - padding * 2);
      return { x, y, match: m };
    });

    if (points.length === 1) {
      const p = points[0];
      return {
        path: `M ${padding} ${p.y} L ${width - padding} ${p.y}`,
        areaPath: `M ${padding} ${p.y} L ${width - padding} ${p.y} L ${width - padding} ${height} L ${padding} ${height} Z`,
        points,
      };
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const mx = (curr.x + next.x) / 2;
      path += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }

    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${path} L ${last.x} ${height} L ${first.x} ${height} Z`;

    return { path, areaPath, points };
  }, [matches]);

  return (
    <div style={styles.shell}>
      <Navbar user={currentUser} />
      <div style={styles.layoutBody}>
        <Sidebar activeTab="DASHBOARD" />
        <main style={styles.main}>
          <div style={styles.contentWrapper}>
            {/* Top Navigation Row */}
            <div style={styles.topBar}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={styles.backBtn}
                title="Return to match scoresheet"
              >
                <ArrowLeft size={16} />
                <span>Back to Match Scoresheet</span>
              </button>
              <div style={styles.badgeOfficialOnly}>
                <ShieldCheck size={14} />
                <span>Official Tournament Profiling</span>
              </div>
            </div>

            {loading ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner} />
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                  Loading athlete profile & performance stats...
                </span>
              </div>
            ) : (
              <>
                {/* Mobbin Hero Profile Card */}
                <div style={styles.heroCard}>
                  <div style={styles.heroLeft}>
                    <div style={styles.avatarContainer}>
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={athleteName} style={styles.avatarImg} />
                      ) : (
                        <span>{athleteInitials}</span>
                      )}
                      <span style={styles.jerseyBadge}>#{jerseyNumber}</span>
                    </div>

                    <div style={styles.heroMeta}>
                      <div style={styles.heroNameRow}>
                        <h1 style={styles.heroName}>{athleteName}</h1>
                        <span style={isRosterOnly ? styles.rosterPill : styles.verifiedPill}>
                          <Award size={12} />
                          {isRosterOnly ? 'Tournament Roster Athlete' : 'Verified Profile'}
                        </span>
                      </div>

                      <div style={styles.heroTeamRow}>
                        <span style={styles.sportPill}>{sportName}</span>
                        <span>•</span>
                        <span>{teamName}</span>
                        <span>•</span>
                        <span>Position: {position}</span>
                      </div>

                      <div style={styles.heroAttributesRow}>
                        <div style={styles.attrItem}>
                          <User size={13} color="#94A3B8" />
                          <span>Height: {profile?.height || "6'0\""}</span>
                        </div>
                        <span>|</span>
                        <div style={styles.attrItem}>
                          <span>Weight: {profile?.weight || '175 lbs'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={styles.heroRight}>
                    <div style={styles.quickStatBox}>
                      <span style={styles.quickStatLabel}>Games</span>
                      <span style={styles.quickStatVal}>{stats.games_played}</span>
                    </div>
                    <div style={styles.quickStatBox}>
                      <span style={styles.quickStatLabel}>Win Rate</span>
                      <span style={{ ...styles.quickStatVal, color: '#047857' }}>
                        {stats.win_rate}%
                      </span>
                    </div>
                    <div style={styles.quickStatBox}>
                      <span style={styles.quickStatLabel}>EFF</span>
                      <span style={{ ...styles.quickStatVal, color: '#2563EB' }}>
                        +{stats.efficiency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div style={styles.statGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statCardTop}>
                      <span style={styles.statCardTitle}>Points Per Game</span>
                      <div style={{ ...styles.statCardIconBox, backgroundColor: '#FFE4E6', color: '#E11D48' }}>
                        <Flame size={17} />
                      </div>
                    </div>
                    <div style={styles.statCardValRow}>
                      <span style={styles.statCardValue}>{stats.ppg}</span>
                      <span style={styles.statCardSub}>{stats.total_pts} Total Pts</span>
                    </div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statCardTop}>
                      <span style={styles.statCardTitle}>Rebounds Per Game</span>
                      <div style={{ ...styles.statCardIconBox, backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                        <Activity size={17} />
                      </div>
                    </div>
                    <div style={styles.statCardValRow}>
                      <span style={styles.statCardValue}>{stats.rpg}</span>
                      <span style={styles.statCardSub}>RPG Average</span>
                    </div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statCardTop}>
                      <span style={styles.statCardTitle}>Assists Per Game</span>
                      <div style={{ ...styles.statCardIconBox, backgroundColor: '#F0FDF4', color: '#047857' }}>
                        <Zap size={17} />
                      </div>
                    </div>
                    <div style={styles.statCardValRow}>
                      <span style={styles.statCardValue}>{stats.apg}</span>
                      <span style={styles.statCardSub}>APG Average</span>
                    </div>
                  </div>

                  <div style={styles.statCard}>
                    <div style={styles.statCardTop}>
                      <span style={styles.statCardTitle}>Shooting Accuracy</span>
                      <div style={{ ...styles.statCardIconBox, backgroundColor: '#FEF3C7', color: '#D97706' }}>
                        <Target size={17} />
                      </div>
                    </div>
                    <div style={styles.statCardValRow}>
                      <span style={styles.statCardValue}>{stats.fg_pct}%</span>
                      <span style={styles.statCardSub}>Field Goal %</span>
                    </div>
                  </div>
                </div>

                {/* Two-Column Analytics Section */}
                <div style={styles.analyticsRow}>
                  {/* Creative SVG Efficiency Rating Graph */}
                  <div style={styles.graphCard}>
                    <div style={styles.cardHeaderRow}>
                      <div style={styles.cardHeaderTitleGroup}>
                        <h3 style={styles.cardTitle}>Efficiency Rating Trend</h3>
                        <p style={styles.cardSubtitle}>Match-by-match game score & overall player impact</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>
                        Avg EFF: +{stats.efficiency}
                      </span>
                    </div>

                    <div style={styles.svgWrapper}>
                      {svgData ? (
                        <svg viewBox="0 0 640 180" style={styles.svgElement} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="effGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.32" />
                              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Grid lines */}
                          <line x1="24" y1="30" x2="616" y2="30" stroke="#F1F5F9" strokeWidth="1" />
                          <line x1="24" y1="90" x2="616" y2="90" stroke="#F1F5F9" strokeWidth="1" />
                          <line x1="24" y1="150" x2="616" y2="150" stroke="#F1F5F9" strokeWidth="1" />

                          {/* Gradient Area under curve */}
                          <path d={svgData.areaPath} fill="url(#effGradient)" />

                          {/* Smooth Curve */}
                          <path
                            d={svgData.path}
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />

                          {/* Data points */}
                          {svgData.points.map((pt, i) => (
                            <g key={i}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={hoveredNode?.match?.match_id === pt.match.match_id ? 7 : 4.5}
                                fill="#FFFFFF"
                                stroke="#2563EB"
                                strokeWidth="2.5"
                                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                                onMouseEnter={() => setHoveredNode(pt)}
                                onMouseLeave={() => setHoveredNode(null)}
                              />
                            </g>
                          ))}
                        </svg>
                      ) : (
                        <div style={styles.emptyBox}>
                          <TrendingUp size={32} color="#94A3B8" />
                          <span>No match efficiency data recorded yet.</span>
                        </div>
                      )}

                      {/* Tooltip on hovered point */}
                      {hoveredNode && (
                        <div
                          style={{
                            position: 'absolute',
                            left: Math.min(520, Math.max(10, hoveredNode.x - 60)),
                            top: Math.max(10, hoveredNode.y - 50),
                            backgroundColor: '#0B132B',
                            color: '#FFFFFF',
                            padding: '6px 12px',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            pointerEvents: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                            zIndex: 10,
                          }}
                        >
                          <div>vs {hoveredNode.match.opponent}</div>
                          <div style={{ color: '#60A5FA', fontSize: 10 }}>
                            {hoveredNode.match.date} • EFF: +{hoveredNode.match.efficiency}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Skill & Performance Breakdown Card */}
                  <div style={styles.breakdownCard}>
                    <div style={styles.cardHeaderTitleGroup}>
                      <h3 style={styles.cardTitle}>Skill & Impact Breakdown</h3>
                      <p style={styles.cardSubtitle}>Relative distribution of athlete strengths</p>
                    </div>

                    <div style={styles.breakdownList}>
                      <div style={styles.breakdownItem}>
                        <div style={styles.breakdownItemHeader}>
                          <span>Scoring Output</span>
                          <span>{Math.min(100, Math.round((stats.ppg / 28) * 100))}%</span>
                        </div>
                        <div style={styles.breakdownBarTrack}>
                          <div
                            style={{
                              ...styles.breakdownBarFill,
                              width: `${Math.min(100, Math.max(15, Math.round((stats.ppg / 28) * 100)))}%`,
                              backgroundColor: '#E11D48',
                            }}
                          />
                        </div>
                      </div>

                      <div style={styles.breakdownItem}>
                        <div style={styles.breakdownItemHeader}>
                          <span>Playmaking & Vision</span>
                          <span>{Math.min(100, Math.round((stats.apg / 10) * 100))}%</span>
                        </div>
                        <div style={styles.breakdownBarTrack}>
                          <div
                            style={{
                              ...styles.breakdownBarFill,
                              width: `${Math.min(100, Math.max(15, Math.round((stats.apg / 10) * 100)))}%`,
                              backgroundColor: '#2563EB',
                            }}
                          />
                        </div>
                      </div>

                      <div style={styles.breakdownItem}>
                        <div style={styles.breakdownItemHeader}>
                          <span>Rebounding & Board Presence</span>
                          <span>{Math.min(100, Math.round((stats.rpg / 14) * 100))}%</span>
                        </div>
                        <div style={styles.breakdownBarTrack}>
                          <div
                            style={{
                              ...styles.breakdownBarFill,
                              width: `${Math.min(100, Math.max(15, Math.round((stats.rpg / 14) * 100)))}%`,
                              backgroundColor: '#047857',
                            }}
                          />
                        </div>
                      </div>

                      <div style={styles.breakdownItem}>
                        <div style={styles.breakdownItemHeader}>
                          <span>Overall Efficiency Index</span>
                          <span>{Math.min(100, Math.round((stats.efficiency / 30) * 100))}%</span>
                        </div>
                        <div style={styles.breakdownBarTrack}>
                          <div
                            style={{
                              ...styles.breakdownBarFill,
                              width: `${Math.min(100, Math.max(20, Math.round((stats.efficiency / 30) * 100)))}%`,
                              backgroundColor: '#D97706',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Official Match History Card */}
                <div style={styles.matchHistoryCard}>
                  <div style={styles.cardHeaderRow}>
                    <div style={styles.cardHeaderTitleGroup}>
                      <h3 style={styles.cardTitle}>Official Match History</h3>
                      <p style={styles.cardSubtitle}>
                        Matches recorded in the tournament official portal involving {athleteName}
                      </p>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>
                      {matches.length} {matches.length === 1 ? 'Match' : 'Matches'} Found
                    </span>
                  </div>

                  {matches.length === 0 ? (
                    <div style={styles.emptyBox}>
                      <Calendar size={36} color="#94A3B8" />
                      <span>No completed match records found for this athlete yet.</span>
                    </div>
                  ) : (
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Result</th>
                            <th style={styles.th}>Date</th>
                            <th style={styles.th}>Opponent</th>
                            <th style={styles.th}>Final Score</th>
                            <th style={styles.th}>PTS</th>
                            <th style={styles.th}>REB</th>
                            <th style={styles.th}>AST</th>
                            <th style={styles.th}>EFF</th>
                            <th style={{ ...styles.th, textAlign: 'right' }}>Scoresheet</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((m) => (
                            <tr key={m.match_id} style={styles.tr}>
                              <td style={styles.td}>
                                <span style={m.result === 'W' ? styles.wlBadgeWin : styles.wlBadgeLoss}>
                                  {m.result}
                                </span>
                              </td>
                              <td style={{ ...styles.td, color: '#64748B', fontWeight: 600 }}>{m.date}</td>
                              <td style={{ ...styles.td, fontWeight: 700, color: '#0B132B' }}>
                                vs {m.opponent}
                              </td>
                              <td style={{ ...styles.td, fontWeight: 700 }}>{m.score}</td>
                              <td style={{ ...styles.td, fontWeight: 800, color: '#E11D48' }}>{m.pts}</td>
                              <td style={{ ...styles.td, fontWeight: 700 }}>{m.reb}</td>
                              <td style={{ ...styles.td, fontWeight: 700 }}>{m.ast}</td>
                              <td style={{ ...styles.td, fontWeight: 800, color: '#2563EB' }}>
                                +{m.efficiency}
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/matches/${m.match_id}`)}
                                  style={styles.viewScoresheetBtn}
                                  title="Open match scoresheet"
                                >
                                  <span>View</span>
                                  <ChevronRight size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Flame,
  Activity,
  Zap,
  Target,
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

  // Read preview state passed from ScoresheetMatch (if any)
  const navState = (location.state as any) || {};
  const previewAthlete = navState.athlete || {};
  const currentMatch = navState.currentMatch || null;
  const matchRow = navState.matchRow || null;

  const [profile, setProfile] = useState<any>(() => previewAthlete);
  const [analytics, setAnalytics] = useState<AthleteOfficialAnalytics | null>(() => {
    if (!matchRow) return null;
    const pts = Number(matchRow.pts ?? matchRow.points ?? matchRow.score ?? 0);
    const reb = Number(matchRow.reb ?? matchRow.rebounds ?? 0);
    const ast = Number(matchRow.ast ?? matchRow.assists ?? 0);
    const stl = Number(matchRow.stl ?? matchRow.steals ?? 0);
    const blk = Number(matchRow.blk ?? matchRow.blocks ?? 0);
    const kills = Number(matchRow.kills ?? matchRow.kill_points ?? 0);
    const digs = Number(matchRow.digs ?? matchRow.dig ?? 0);
    const aces = Number(matchRow.service_aces ?? matchRow.aces ?? 0);
    const goals = Number(matchRow.goals ?? 0);
    const finishTime = String(matchRow.finish_time || matchRow.time || matchRow.mark_time || '');
    const placementRank = matchRow.placement_rank ?? matchRow.rank ?? matchRow.place ?? '';
    const split = String(matchRow.split || matchRow.split_times || '');
    const distance = String(matchRow.distance || (matchRow.distance_meters ? `${matchRow.distance_meters}m` : '') || matchRow.event || (currentMatch as any)?.distance || '');

    const rankNum = Number(String(placementRank || '').replace(/[^0-9]/g, '')) || 0;
    let eff = Number(matchRow.efficiency || 0);
    if (eff === 0) {
      if (rankNum > 0) {
        eff = Math.max(50, 100 - (rankNum - 1) * 7);
      } else if (finishTime && finishTime !== '00:00.00' && finishTime !== '-') {
        eff = 85;
      } else if (kills > 0 || digs > 0 || aces > 0) {
        eff = kills * 3 + digs * 2 + aces * 3;
      } else if (goals > 0) {
        eff = goals * 6 + ast * 4;
      } else {
        eff = pts + reb + ast;
      }
    }
    const fgPct = Number(matchRow.fg_pct ?? (pts > 0 ? 50.0 : 0));
    const isIndiv = Boolean(String(previewAthlete.sport || currentMatch?.sport_type || '').toUpperCase().match(/SWIM|TRACK|FIELD|ATHLETIC/));
    const isWin = isIndiv ? (rankNum === 1 || rankNum === 2 || rankNum === 3 || eff >= 75) : (pts > 0 || eff > 0);

    return {
      stats: {
        games_played: 1,
        ppg: pts,
        rpg: reb,
        apg: ast,
        spg: stl,
        bpg: blk,
        kills,
        digs,
        aces,
        goals,
        finish_time: finishTime,
        best_time: finishTime,
        placement_rank: placementRank,
        distance: distance || '50m',
        split,
        efficiency: eff,
        fg_pct: fgPct,
        win_rate: isWin ? 100 : Math.max(30, Math.round(eff * 0.8)),
        total_pts: pts || goals || kills,
      },
      matches: currentMatch ? [{
        match_id: currentMatch.match_id || currentMatch.gameReferenceId || 'match_current',
        date: currentMatch.match_date || new Date().toISOString().split('T')[0],
        opponent: currentMatch.away_team_name || currentMatch.home_team_name || 'Opponent',
        tournament_name: currentMatch.tournament_name || currentMatch.league_class || 'Tournament Game',
        team_name: previewAthlete.team_name || 'Team',
        result: isWin ? 'W' : 'L',
        score: currentMatch.home_team && currentMatch.away_team ? `${currentMatch.home_team.score ?? 0} - ${currentMatch.away_team.score ?? 0}` : `${pts + 60} - ${pts + 55}`,
        distance: distance || '50m',
        pts,
        reb,
        ast,
        kills,
        digs,
        aces,
        goals,
        finish_time: finishTime,
        placement_rank: placementRank,
        split,
        efficiency: eff,
      }] : [],
    };
  });
  const [loading, setLoading] = useState(() => !matchRow && !previewAthlete.name && !previewAthlete.full_name);
  const [hoveredNode, setHoveredNode] = useState<{ x: number; y: number; match: any } | null>(null);

  useEffect(() => {
    if (!athleteId) return;

    let isMounted = true;
    const cleanId = String(athleteId).replace(/^ath_/, '');

    const loadData = async () => {
      setLoading(!matchRow && !analytics && !previewAthlete.name);

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

  const jerseyNumber = profile?.jersey_number ?? previewAthlete.jersey_no ?? '-';
  const sportName = (profile?.sport || previewAthlete.sport || 'BASKETBALL').toUpperCase();
  const teamName = profile?.team_name || previewAthlete.team_name || 'Athletic Delegation';
  const position = profile?.position || previewAthlete.position || 'Player';

  const stats: any = analytics?.stats || {
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

  const sportMetrics = useMemo(() => {
    const norm = sportName.toUpperCase();
    const isVolleyball = norm.includes('VOLLEY');
    const isSoccer = norm.includes('SOCCER') || norm.includes('FOOTBALL');
    const isSwimming = norm.includes('SWIM');
    const isTrack = norm.includes('TRACK') || norm.includes('FIELD') || norm.includes('ATHLETIC') || norm.includes('RUN');
    const isBadminton = norm.includes('BADM') || norm.includes('RACKET') || norm.includes('TENNIS');

    // 1. TRACK & FIELD
    if (isTrack) {
      const finishTime = stats.best_time || stats.finish_time || matchRow?.finish_time || (matches[0] as any)?.finish_time || (stats.ppg > 0 ? `${stats.ppg}s` : '-');
      const rankVal = stats.placement_rank || matchRow?.placement_rank || (matches[0] as any)?.placement_rank || (stats.win_rate >= 50 ? '#1' : '#2');
      const formattedRank = typeof rankVal === 'number' || (!isNaN(Number(rankVal)) && !String(rankVal).startsWith('#')) ? `#${rankVal}` : String(rankVal || '#1');
      const eventMark = matchRow?.distance || (matches[0] as any)?.distance || stats.distance || matchRow?.split || (matches[0] as any)?.split || '100m';
      const effDisplay = stats.efficiency > 0 ? `+${stats.efficiency}` : (Number(stats.win_rate) > 0 ? `${stats.win_rate}%` : '+85');

      return {
        cards: [
          {
            title: 'Best Finish Time',
            value: finishTime,
            sub: 'Fastest Recorded Time',
            icon: Flame,
            accentBg: styles.statCardAccentLine,
            iconBg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            iconColor: '#1D4ED8',
          },
          {
            title: 'Placement Rank',
            value: formattedRank,
            sub: 'Podium Standing',
            icon: Activity,
            accentBg: { background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)' },
            iconBg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            iconColor: '#0284C7',
          },
          {
            title: 'Primary Event / Mark',
            value: eventMark,
            sub: 'Track & Field Event',
            icon: Zap,
            accentBg: { background: 'linear-gradient(90deg, #0D9488 0%, #2DD4BF 100%)' },
            iconBg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
            iconColor: '#0D9488',
          },
          {
            title: 'Performance Rating',
            value: effDisplay,
            sub: 'Athletic Rating Index',
            icon: Target,
            accentBg: { background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 100%)' },
            iconBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            iconColor: '#4F46E5',
          },
        ],
        breakdown: [
          { label: 'Sprint & Acceleration', pct: Math.min(100, Math.max(35, Math.round((Number(stats.efficiency || 80) / 100) * 100))) },
          { label: 'Pacing & Split Control', pct: Math.min(100, Math.max(30, Math.round((Number(stats.efficiency || 80) / 100) * 94))) },
          { label: 'Clearance & Reaction', pct: Math.min(100, Math.max(30, Math.round(Number(stats.win_rate || 75) * 0.9))) },
          { label: 'Overall Athletic Index', pct: Math.min(100, Math.max(35, Math.round((Number(stats.efficiency || 80) / 100) * 98))) },
        ],
        tableHeaders: ['Result', 'Date', 'Event / Opponent', 'DISTANCE', 'FINISH TIME', 'RANK', 'SPLIT', 'EFF', 'Scoresheet'],
        renderRowStats: (m: any) => ({
          col1: m.finish_time || m.time || (m.pts ? `${m.pts}s` : '-'),
          col2: m.placement_rank ? (String(m.placement_rank).startsWith('#') ? m.placement_rank : `#${m.placement_rank}`) : (m.result === 'W' ? '#1' : '-'),
          col3: m.split || m.distance || '-',
          eff: `+${m.efficiency}`,
        }),
      };
    }

    // 2. SWIMMING
    if (isSwimming) {
      const finishTime = stats.best_time || stats.finish_time || matchRow?.finish_time || (matches[0] as any)?.finish_time || (stats.ppg > 0 ? `${stats.ppg}s` : '-');
      const rankVal = stats.placement_rank || matchRow?.placement_rank || (matches[0] as any)?.placement_rank || (stats.win_rate >= 50 ? '#1' : '#2');
      const formattedRank = typeof rankVal === 'number' || (!isNaN(Number(rankVal)) && !String(rankVal).startsWith('#')) ? `#${rankVal}` : String(rankVal || '#1');
      const strokeRateVal = stats.stroke_rate || matchRow?.stroke_rate || 'Optimum';
      const effDisplay = stats.efficiency > 0 ? `+${stats.efficiency}` : (Number(stats.win_rate) > 0 ? `${stats.win_rate}%` : '+85');

      return {
        cards: [
          {
            title: 'Best Finish Time',
            value: finishTime,
            sub: 'Fastest Recorded Lap',
            icon: Flame,
            accentBg: styles.statCardAccentLine,
            iconBg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            iconColor: '#1D4ED8',
          },
          {
            title: 'Placement Rank',
            value: formattedRank,
            sub: 'Heat Standing',
            icon: Activity,
            accentBg: { background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)' },
            iconBg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            iconColor: '#0284C7',
          },
          {
            title: 'Stroke Cadence',
            value: strokeRateVal,
            sub: 'Strokes / Min',
            icon: Zap,
            accentBg: { background: 'linear-gradient(90deg, #0D9488 0%, #2DD4BF 100%)' },
            iconBg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
            iconColor: '#0D9488',
          },
          {
            title: 'Lap & Split Rating',
            value: effDisplay,
            sub: 'Aquatic Index',
            icon: Target,
            accentBg: { background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 100%)' },
            iconBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            iconColor: '#4F46E5',
          },
        ],
        breakdown: [
          { label: 'Stroke Cadence & Propulsion', pct: Math.min(100, Math.max(35, Math.round((Number(stats.efficiency || 80) / 100) * 100))) },
          { label: 'Turn & Split Consistency', pct: Math.min(100, Math.max(30, Math.round((Number(stats.efficiency || 80) / 100) * 94))) },
          { label: 'Pacing & Endurance', pct: Math.min(100, Math.max(30, Math.round(Number(stats.win_rate || 75) * 0.9))) },
          { label: 'Overall Aquatic Index', pct: Math.min(100, Math.max(35, Math.round((Number(stats.efficiency || 80) / 100) * 98))) },
        ],
        tableHeaders: ['Result', 'Date', 'Heat / Opponent', 'DISTANCE', 'FINISH TIME', 'RANK', 'SPLIT', 'EFF', 'Scoresheet'],
        renderRowStats: (m: any) => ({
          col1: m.finish_time || m.time || (m.pts ? `${m.pts}s` : '-'),
          col2: m.placement_rank ? (String(m.placement_rank).startsWith('#') ? m.placement_rank : `#${m.placement_rank}`) : (m.result === 'W' ? '#1' : '-'),
          col3: m.split || m.distance || '-',
          eff: `+${m.efficiency}`,
        }),
      };
    }

    // 3. VOLLEYBALL
    if (isVolleyball) {
      const killsPerGame = Number(stats.kills_per_game ?? stats.kills ?? stats.ppg);
      const totalKills = Number(stats.total_kills ?? stats.total_pts ?? (killsPerGame * (stats.games_played || 1)));
      const digsPerGame = Number(stats.digs_per_game ?? stats.digs ?? stats.rpg);
      const acesPerGame = Number(stats.aces_per_game ?? stats.service_aces ?? stats.aces ?? stats.apg);
      const hittingPct = stats.hitting_pct ?? stats.attack_pct ?? stats.fg_pct;

      return {
        cards: [
          {
            title: 'Kills Per Match',
            value: killsPerGame,
            sub: `${totalKills} Total Kills`,
            icon: Flame,
            accentBg: styles.statCardAccentLine,
            iconBg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            iconColor: '#1D4ED8',
          },
          {
            title: 'Digs Per Match',
            value: digsPerGame,
            sub: 'Digs Average',
            icon: Activity,
            accentBg: { background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)' },
            iconBg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            iconColor: '#0284C7',
          },
          {
            title: 'Service Aces',
            value: acesPerGame,
            sub: 'Aces Average',
            icon: Zap,
            accentBg: { background: 'linear-gradient(90deg, #0D9488 0%, #2DD4BF 100%)' },
            iconBg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
            iconColor: '#0D9488',
          },
          {
            title: 'Hitting Efficiency',
            value: `${hittingPct}%`,
            sub: 'Attack Accuracy %',
            icon: Target,
            accentBg: { background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 100%)' },
            iconBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            iconColor: '#4F46E5',
          },
        ],
        breakdown: [
          { label: 'Spike & Attacking Power', pct: Math.min(100, Math.round((killsPerGame / 18) * 100) || 50) },
          { label: 'Defensive Floor Digs', pct: Math.min(100, Math.round((digsPerGame / 12) * 100) || 50) },
          { label: 'Serving & Net Presence', pct: Math.min(100, Math.round((acesPerGame / 5) * 100) || 50) },
          { label: 'Overall Match Impact', pct: Math.min(100, Math.round((stats.efficiency / 30) * 100) || 60) },
        ],
        tableHeaders: ['Result', 'Date', 'Opponent', 'Final Score', 'KILLS', 'DIGS', 'ACES', 'EFF', 'Scoresheet'],
        renderRowStats: (m: any) => ({
          col1: (m as any).kills ?? m.pts ?? 0,
          col2: (m as any).digs ?? m.reb ?? 0,
          col3: (m as any).service_aces ?? (m as any).aces ?? m.ast ?? 0,
          eff: `+${m.efficiency}`,
        }),
      };
    }

    // 4. SOCCER / FOOTBALL
    if (isSoccer) {
      const goalsPerGame = Number(stats.goals_per_game ?? stats.goals ?? stats.ppg);
      const totalGoals = Number(stats.total_goals ?? stats.total_pts ?? (goalsPerGame * (stats.games_played || 1)));
      const assistsPerGame = Number(stats.apg ?? stats.assists ?? 0);
      const sotPerGame = Number(stats.shots_on_target ?? stats.sot ?? stats.rpg ?? 0);
      const shotAccuracy = stats.shot_accuracy ?? stats.fg_pct;

      return {
        cards: [
          {
            title: 'Goals Per Match',
            value: goalsPerGame,
            sub: `${totalGoals} Total Goals`,
            icon: Flame,
            accentBg: styles.statCardAccentLine,
            iconBg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            iconColor: '#1D4ED8',
          },
          {
            title: 'Assists Per Match',
            value: assistsPerGame,
            sub: 'Assists Average',
            icon: Activity,
            accentBg: { background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)' },
            iconBg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            iconColor: '#0284C7',
          },
          {
            title: 'Shots On Target',
            value: sotPerGame,
            sub: 'SOT Average',
            icon: Zap,
            accentBg: { background: 'linear-gradient(90deg, #0D9488 0%, #2DD4BF 100%)' },
            iconBg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
            iconColor: '#0D9488',
          },
          {
            title: 'Shot Accuracy',
            value: `${shotAccuracy}%`,
            sub: 'Shooting %',
            icon: Target,
            accentBg: { background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 100%)' },
            iconBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            iconColor: '#4F46E5',
          },
        ],
        breakdown: [
          { label: 'Goal Scoring Threat', pct: Math.min(100, Math.round((goalsPerGame / 2) * 100) || 50) },
          { label: 'Playmaking & Vision', pct: Math.min(100, Math.round((assistsPerGame / 2) * 100) || 50) },
          { label: 'Shot Precision & SOT', pct: Math.min(100, Math.round((sotPerGame / 4) * 100) || 50) },
          { label: 'Overall Pitch Impact', pct: Math.min(100, Math.round((stats.efficiency / 25) * 100) || 60) },
        ],
        tableHeaders: ['Result', 'Date', 'Opponent', 'Final Score', 'GOALS', 'AST', 'SOT', 'EFF', 'Scoresheet'],
        renderRowStats: (m: any) => ({
          col1: (m as any).goals ?? m.pts ?? 0,
          col2: m.ast ?? 0,
          col3: (m as any).sot ?? (m as any).shots_on_target ?? m.reb ?? 0,
          eff: `+${m.efficiency}`,
        }),
      };
    }

    // 5. BADMINTON / RACKET
    if (isBadminton) {
      const ppg = stats.ppg;
      const smashes = Number(stats.smashes ?? stats.smash_winners ?? stats.rpg);
      const netKills = Number(stats.net_kills ?? stats.apg);
      const smashPct = stats.smash_pct ?? stats.fg_pct;

      return {
        cards: [
          {
            title: 'Points Per Game',
            value: ppg,
            sub: `${stats.total_pts} Total Points`,
            icon: Flame,
            accentBg: styles.statCardAccentLine,
            iconBg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            iconColor: '#1D4ED8',
          },
          {
            title: 'Smash Winners',
            value: smashes,
            sub: 'Smashes Average',
            icon: Activity,
            accentBg: { background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)' },
            iconBg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            iconColor: '#0284C7',
          },
          {
            title: 'Net Kills',
            value: netKills,
            sub: 'Net Play Average',
            icon: Zap,
            accentBg: { background: 'linear-gradient(90deg, #0D9488 0%, #2DD4BF 100%)' },
            iconBg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
            iconColor: '#0D9488',
          },
          {
            title: 'Smash Accuracy',
            value: `${smashPct}%`,
            sub: 'Winner %',
            icon: Target,
            accentBg: { background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 100%)' },
            iconBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
            iconColor: '#4F46E5',
          },
        ],
        breakdown: [
          { label: 'Smash & Attack Power', pct: Math.min(100, Math.round((smashes / 15) * 100) || 50) },
          { label: 'Net Play & Precision', pct: Math.min(100, Math.round((netKills / 10) * 100) || 50) },
          { label: 'Rally Defense & Control', pct: Math.min(100, Math.round(stats.win_rate * 0.9) || 75) },
          { label: 'Overall Court Rating', pct: Math.min(100, Math.round((stats.efficiency / 30) * 100) || 60) },
        ],
        tableHeaders: ['Result', 'Date', 'Opponent', 'Final Score', 'PTS', 'SMASH', 'NET', 'EFF', 'Scoresheet'],
        renderRowStats: (m: any) => ({
          col1: m.pts ?? 0,
          col2: (m as any).smashes ?? (m as any).smash_winners ?? m.reb ?? 0,
          col3: (m as any).net_kills ?? m.ast ?? 0,
          eff: `+${m.efficiency}`,
        }),
      };
    }

    // 6. DEFAULT BASKETBALL
    return {
      cards: [
        {
          title: 'Points Per Game',
          value: stats.ppg,
          sub: `${stats.total_pts} Total Pts`,
          icon: Flame,
          accentBg: styles.statCardAccentLine,
          iconBg: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
          iconColor: '#1D4ED8',
        },
        {
          title: 'Rebounds Per Game',
          value: stats.rpg,
          sub: 'RPG Average',
          icon: Activity,
          accentBg: { background: 'linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)' },
          iconBg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
          iconColor: '#0284C7',
        },
        {
          title: 'Assists Per Game',
          value: stats.apg,
          sub: 'APG Average',
          icon: Zap,
          accentBg: { background: 'linear-gradient(90deg, #0D9488 0%, #2DD4BF 100%)' },
          iconBg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
          iconColor: '#0D9488',
        },
        {
          title: 'Shooting Accuracy',
          value: `${stats.fg_pct}%`,
          sub: 'Field Goal %',
          icon: Target,
          accentBg: { background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 100%)' },
          iconBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
          iconColor: '#4F46E5',
        },
      ],
      breakdown: [
        { label: 'Scoring Output', pct: Math.min(100, Math.round((stats.ppg / 28) * 100)) },
        { label: 'Playmaking & Vision', pct: Math.min(100, Math.round((stats.apg / 10) * 100)) },
        { label: 'Rebounding & Board Presence', pct: Math.min(100, Math.round((stats.rpg / 14) * 100)) },
        { label: 'Overall Efficiency Index', pct: Math.min(100, Math.round((stats.efficiency / 30) * 100)) },
      ],
      tableHeaders: ['Result', 'Date', 'Opponent', 'Final Score', 'PTS', 'REB', 'AST', 'EFF', 'Scoresheet'],
      renderRowStats: (m: any) => ({
        col1: m.pts,
        col2: m.reb,
        col3: m.ast,
        eff: `+${m.efficiency}`,
      }),
    };
  }, [sportName, stats, matchRow, matches]);

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
            </div>

            {loading ? (
              <div style={styles.loadingBox}>
                <div style={styles.spinner} />
                <span style={styles.loadingText}>
                  Loading athlete profile & performance stats...
                </span>
              </div>
            ) : (
              <>
                {/* Mobbin Hero Profile Card */}
                <div style={styles.heroCard}>
                  <div style={styles.heroLeft}>
                    <div style={styles.avatarContainer}>
                      {profile?.avatar_url || profile?.profile_image ? (
                        <img
                          src={profile.avatar_url || profile.profile_image}
                          alt={athleteName}
                          style={styles.avatarImg}
                          onError={(e) => {
                            // If remote image fails, gracefully fallback to vector athlete avatar
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }}
                        />
                      ) : null}
                      <svg
                        viewBox="0 0 100 100"
                        style={{
                          ...styles.avatarSvgFallback,
                          display: profile?.avatar_url || profile?.profile_image ? 'none' : 'block',
                        }}
                      >
                        <defs>
                          <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1E40AF" />
                            <stop offset="50%" stopColor="#2563EB" />
                            <stop offset="100%" stopColor="#38BDF8" />
                          </linearGradient>
                        </defs>
                        <rect width="100" height="100" rx="20" fill="url(#avatarGrad)" />
                        {/* Athlete Silhouette Profile */}
                        <circle cx="50" cy="36" r="17" fill="#FFFFFF" opacity="0.95" />
                        <path
                          d="M20 86 C20 63, 34 56, 50 56 C66 56, 80 63, 80 86 Z"
                          fill="#FFFFFF"
                          opacity="0.95"
                        />
                      </svg>
                      <span style={styles.jerseyBadge}>#{jerseyNumber}</span>
                    </div>

                    <div style={styles.heroMeta}>
                      <div style={styles.heroNameRow}>
                        <h1 style={styles.heroName}>{athleteName}</h1>
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
                          <User size={13} color="#93C5FD" />
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
                      <span style={{ ...styles.quickStatVal, color: '#34D399' }}>
                        {stats.win_rate}%
                      </span>
                    </div>
                    <div style={styles.quickStatBox}>
                      <span style={styles.quickStatLabel}>EFF</span>
                      <span style={{ ...styles.quickStatVal, color: '#60A5FA' }}>
                        +{stats.efficiency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div style={styles.statGrid}>
                  {sportMetrics.cards.map((card, cIdx) => {
                    const IconComp = card.icon;
                    return (
                      <div key={card.title || cIdx} style={styles.statCard}>
                        <div style={{ ...styles.statCardAccentLine, ...(card.accentBg || {}) }} />
                        <div style={styles.statCardTop}>
                          <span style={styles.statCardTitle}>{card.title}</span>
                          <div style={{ ...styles.statCardIconBox, background: card.iconBg, color: card.iconColor }}>
                            <IconComp size={17} />
                          </div>
                        </div>
                        <div style={styles.statCardValRow}>
                          <span style={styles.statCardValue}>{card.value}</span>
                          <span style={cIdx === 0 ? styles.statCardSub : { ...styles.statCardSub, color: card.iconColor }}>
                            {card.sub}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
                      <span style={styles.badgeAvgEff}>
                        Avg EFF: +{stats.efficiency}
                      </span>
                    </div>

                    <div style={styles.svgWrapper}>
                      {svgData ? (
                        <svg viewBox="0 0 640 180" style={styles.svgElement} preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="effGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.38" />
                              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Grid lines */}
                          <line x1="24" y1="30" x2="616" y2="30" stroke="#DBEAFE" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="24" y1="90" x2="616" y2="90" stroke="#DBEAFE" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="24" y1="150" x2="616" y2="150" stroke="#DBEAFE" strokeWidth="1" strokeDasharray="3 3" />

                          {/* Gradient Area under curve */}
                          <path d={svgData.areaPath} fill="url(#effGradient)" />

                          {/* Smooth Curve */}
                          <path
                            d={svgData.path}
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />

                          {/* Data points */}
                          {svgData.points.map((pt, i) => (
                            <g key={i}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={hoveredNode?.match?.match_id === pt.match.match_id ? 7.5 : 5}
                                fill="#FFFFFF"
                                stroke="#1D4ED8"
                                strokeWidth="3"
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
                            background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%)',
                            color: '#FFFFFF',
                            padding: '7px 14px',
                            borderRadius: 10,
                            border: '1px solid rgba(147, 197, 253, 0.4)',
                            fontSize: 11,
                            fontWeight: 700,
                            pointerEvents: 'none',
                            boxShadow: '0 8px 20px rgba(15, 23, 42, 0.35)',
                            zIndex: 10,
                          }}
                        >
                          <div>vs {hoveredNode.match.opponent}</div>
                          <div style={{ color: '#93C5FD', fontSize: 10, marginTop: 2 }}>
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
                      {sportMetrics.breakdown.map((item, bIdx) => {
                        const colors = [
                          { text: '#2563EB', fill: 'linear-gradient(90deg, #2563EB 0%, #38BDF8 100%)' },
                          { text: '#0284C7', fill: 'linear-gradient(90deg, #0284C7 0%, #06B6D4 100%)' },
                          { text: '#0D9488', fill: 'linear-gradient(90deg, #0D9488 0%, #14B8A6 100%)' },
                          { text: '#4F46E5', fill: 'linear-gradient(90deg, #4F46E5 0%, #6366F1 100%)' },
                        ];
                        const theme = colors[bIdx % colors.length];
                        return (
                          <div key={item.label} style={styles.breakdownItem}>
                            <div style={styles.breakdownItemHeader}>
                              <span>{item.label}</span>
                              <span style={{ ...styles.breakdownPctText, color: theme.text }}>{item.pct}%</span>
                            </div>
                            <div style={styles.breakdownBarTrack}>
                              <div
                                style={{
                                  ...styles.breakdownBarFill,
                                  width: `${Math.min(100, Math.max(15, item.pct))}%`,
                                  background: theme.fill,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Match History Card */}
                <div style={styles.matchHistoryCard}>
                  <div style={styles.cardHeaderRow}>
                    <div style={styles.cardHeaderTitleGroup}>
                      <h3 style={styles.cardTitle}>Match History</h3>
                      <p style={styles.cardSubtitle}>
                        Matches recorded in the tournament official portal involving {athleteName}
                      </p>
                    </div>
                    <span style={styles.matchCountBadge}>
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
                            {sportMetrics.tableHeaders.map((header, hIdx) => (
                              <th
                                key={header}
                                style={{
                                  ...styles.th,
                                  ...(hIdx === sportMetrics.tableHeaders.length - 1 ? { textAlign: 'right' } : {}),
                                }}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {matches.map((m) => {
                            const rowStats = sportMetrics.renderRowStats(m);
                            return (
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
                                <td style={{ ...styles.td, fontWeight: 700, color: (sportName.includes('SWIM') || sportName.includes('TRACK') || sportName.includes('FIELD')) ? '#0284C7' : '#0B132B' }}>
                                  {(sportName.includes('SWIM') || sportName.includes('TRACK') || sportName.includes('FIELD'))
                                    ? ((m as any).distance || matchRow?.distance || stats.distance || '50m')
                                    : m.score}
                                </td>
                                <td style={{ ...styles.td, fontWeight: 800, color: '#E11D48' }}>{rowStats.col1}</td>
                                <td style={{ ...styles.td, fontWeight: 700 }}>{rowStats.col2}</td>
                                <td style={{ ...styles.td, fontWeight: 700 }}>{rowStats.col3}</td>
                                <td style={{ ...styles.td, fontWeight: 800, color: '#2563EB' }}>
                                  {rowStats.eff}
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
                            );
                          })}
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

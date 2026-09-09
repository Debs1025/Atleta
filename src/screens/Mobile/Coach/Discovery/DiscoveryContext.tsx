import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  AthleteDiscoveryItem,
  ScoutingProposalItem,
  DiscoveryTeamItem,
  DiscoveryEventItem,
  DiscoveryMatchItem,
  DiscoveryTab,
  SportCategoryFilter,
} from './discoveryTypes';
import { requestAuthenticatedJson } from '../../Authentication/authShared';

interface DiscoveryContextType {
  athletes: AthleteDiscoveryItem[];
  scoutingProposals: ScoutingProposalItem[];
  teams: DiscoveryTeamItem[];
  events: DiscoveryEventItem[];
  activeTab: DiscoveryTab;
  setActiveTab: (tab: DiscoveryTab) => void;
  activeSportFilter: SportCategoryFilter;
  setActiveSportFilter: (sport: SportCategoryFilter) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedAthlete: AthleteDiscoveryItem | null;
  setSelectedAthlete: (athlete: AthleteDiscoveryItem | null) => void;
  selectedTeam: DiscoveryTeamItem | null;
  setSelectedTeam: (team: DiscoveryTeamItem | null) => void;
  selectedMatch: DiscoveryMatchItem | null;
  setSelectedMatch: (match: DiscoveryMatchItem | null) => void;
  scoutAthlete: (athlete: AthleteDiscoveryItem) => void;
  filteredAthletes: AthleteDiscoveryItem[];
  filteredTeams: DiscoveryTeamItem[];
  filteredEvents: DiscoveryEventItem[];
  sortRecruits: 'date' | 'status';
  setSortRecruits: (sort: 'date' | 'status') => void;
}

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined);

export const DiscoveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [athletes, setAthletes] = useState<AthleteDiscoveryItem[]>([]);
  const [scoutingProposals, setScoutingProposals] = useState<ScoutingProposalItem[]>([]);
  const [teams, setTeams] = useState<DiscoveryTeamItem[]>([]);
  const [events, setEvents] = useState<DiscoveryEventItem[]>([]);

  const [activeTab, setActiveTab] = useState<DiscoveryTab>('PLAYERS');
  const [activeSportFilter, setActiveSportFilter] = useState<SportCategoryFilter>('BASKETBALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteDiscoveryItem | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<DiscoveryTeamItem | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<DiscoveryMatchItem | null>(null);
  const [sortRecruits, setSortRecruits] = useState<'date' | 'status'>('date');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [athletesRes, proposalsRes, teamsRes, matchesRes]: [any, any, any, any] = await Promise.all([
          requestAuthenticatedJson('/athletes').catch(() => null),
          requestAuthenticatedJson('/scouting/proposals/list').catch(() => null),
          requestAuthenticatedJson('/teams').catch(() => null),
          requestAuthenticatedJson('/matches').catch(() => null),
        ]);

        if (isMounted) {
          // 1. Map Athletes
          const rawAthletesList = Array.isArray(athletesRes)
            ? athletesRes
            : Array.isArray(athletesRes?.athletes)
            ? athletesRes.athletes
            : [];

          if (rawAthletesList.length > 0) {
            const seenIds = new Set<string>();
            const mappedAthletes: AthleteDiscoveryItem[] = [];

            rawAthletesList.forEach((a: any) => {
              const rawId = a.athlete_id || a.user_id || '';
              const normalizedId = rawId.replace(/^ath_/, '');
              if (!rawId || seenIds.has(normalizedId)) return;
              seenIds.add(normalizedId);

              const ppg = Number(a.averages?.ppg || a.stats?.ppg || 0);
              const rpg = Number(a.averages?.rpg || a.stats?.rpg || 0);
              const ast = Number(a.averages?.apg || a.stats?.ast || 0);
              const fgPct = Number(a.averages?.fg_percentage || a.stats?.fg_pct || 0);
              const per = Number(a.averages?.per_score || a.calculated_per || (ppg > 0 ? Math.round(ppg * 1.3) : 25));
              const eff = Number(a.efficiency_pct || (ppg > 0 ? Math.min(99, Math.round(ppg * 3.5)) : 75));

              const heightCm = a.physical_attributes?.height_cm || a.height_cm;
              const weightKg = a.physical_attributes?.weight_kg || a.weight_kg;
              const wingspanCm = a.physical_attributes?.wingspan_cm || a.wingspan_cm;

              const fullName = a.full_name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Athlete';
              const rawSport = (a.sport_type || a.sport_category || a.category || 'BASKETBALL').toUpperCase().trim();
              const sportCategory: SportCategoryFilter =
                rawSport.includes('SWIM') ? 'SWIMMING' : rawSport.includes('TRACK') || rawSport.includes('FIELD') ? 'TRACK AND FIELD' : 'BASKETBALL';

              mappedAthletes.push({
                athlete_id: rawId,
                full_name: fullName,
                province: a.location || a.province || 'Camarines Sur',
                recruitment_status: a.recruitment_status || 'Available',
                position_tag: a.position || (sportCategory === 'SWIMMING' ? 'Freestyle' : sportCategory === 'TRACK AND FIELD' ? '100m Sprint' : 'Point Guard'),
                sport_category: sportCategory,
                biometrics: {
                  height_ft: heightCm
                    ? `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}"`
                    : a.biometrics?.height_ft || `6'0"`,
                  weight_lbs: weightKg
                    ? `${Math.round(weightKg * 2.20462)} lbs`
                    : a.biometrics?.weight_lbs || `175 lbs`,
                  wingspan_ft: wingspanCm
                    ? `${Math.floor(wingspanCm / 30.48)}'${Math.round((wingspanCm % 30.48) / 2.54)}"`
                    : a.biometrics?.wingspan_ft || `6'2"`,
                },
                stats: a.stats || {
                  ppg,
                  rpg,
                  ast,
                  fg_pct: fgPct,
                  times_100m: a.stats?.times_100m,
                  times_200m: a.stats?.times_200m,
                  times_400m: a.stats?.times_400m,
                  times_50m_free: a.stats?.times_50m_free,
                },
                calculated_per: per,
                efficiency_pct: eff,
                contact_info: {
                  email: a.email || 'athlete@atleta.ph',
                  phone: a.contact_number || '+63 900 000 0000',
                  facebook: a.facebook || 'N/A',
                },
                jersey_number: String(a.jersey_number || '0'),
                avatar_url: a.avatar_url,
              });
            });

            setAthletes(mappedAthletes);
          } else {
            setAthletes([]);
          }

          // 2. Map Scouting Proposals
          if (Array.isArray(proposalsRes)) {
            const mappedProposals: ScoutingProposalItem[] = proposalsRes.map((p: any) => ({
              scout_id: p.scout_id || p.id,
              athlete_id: p.athlete_id,
              athlete_name: p.athlete_details?.first_name
                ? `${p.athlete_details.first_name} ${p.athlete_details.last_name || ''}`.trim()
                : p.athlete_name || 'Athlete',
              sport_category: p.athlete_details?.sport_type || p.sport_category || 'Basketball',
              offer_status: (p.offer_status || 'PENDING').toUpperCase(),
              date_added_relative: 'Recent',
              created_at: p.created_at || new Date().toISOString().split('T')[0],
              avatar_url: p.avatar_url,
            }));
            setScoutingProposals(mappedProposals);
          } else {
            setScoutingProposals([]);
          }

          // 3. Map Teams
          const rawTeamsList = Array.isArray(teamsRes)
            ? teamsRes
            : Array.isArray(teamsRes?.teams)
            ? teamsRes.teams
            : [];

          if (rawTeamsList.length > 0) {
            const mappedTeams: DiscoveryTeamItem[] = rawTeamsList.map((t: any) => ({
              team_id: t.team_id || t.id,
              team_name: t.team_name || 'Team',
              sport_category: (t.sport_type?.toUpperCase() || 'BASKETBALL') as SportCategoryFilter,
              division_tag: t.division || 'Elite Division',
              description: t.description || `${t.team_name || 'Team'} competitive roster.`,
              head_coach: t.coach_name || t.head_coach || 'Head Coach',
              season_record: t.season_record
                ? `${t.season_record.wins || 0} - ${t.season_record.losses || 0}`
                : '0 - 0',
              logo_url: t.logo_url,
              banner_url: t.banner_url,
              roster: Array.isArray(t.roster_list)
                ? t.roster_list.map((r: any) => ({
                    athlete_id: r.athlete_id || r.user_id || 'ath_0',
                    full_name: r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Athlete',
                    province: r.province || r.location || 'Camarines Sur',
                    recruitment_status: r.recruitment_status || 'Available',
                    position_tag: r.position || 'PG',
                    sport_category: (r.sport_type?.toUpperCase() || t.sport_type?.toUpperCase() || 'BASKETBALL') as SportCategoryFilter,
                    biometrics: {
                      height_ft: r.height_ft || `6'0"`,
                      weight_lbs: r.weight_lbs || '175 lbs',
                      wingspan_ft: r.wingspan_ft || `6'2"`,
                    },
                    stats: r.stats || { ppg: 0, rpg: 0, ast: 0, fg_pct: 0 },
                    calculated_per: r.per || 25,
                    efficiency_pct: r.efficiency_pct || 75,
                    contact_info: {
                      email: r.email || 'athlete@atleta.ph',
                      facebook: r.facebook || '',
                      phone: r.contact_number || '+63 900 000 0000',
                    },
                    jersey_number: String(r.jersey_number || '0'),
                  }))
                : [],
            }));
            setTeams(mappedTeams);
          } else {
            setTeams([]);
          }

          // 4. Map Events & Matches
          const rawMatchesList = Array.isArray(matchesRes?.matches)
            ? matchesRes.matches
            : Array.isArray(matchesRes)
            ? matchesRes
            : [];

          if (rawMatchesList.length > 0) {
            const mappedEvents: DiscoveryEventItem[] = rawMatchesList.map((m: any) => {
              const homeScoreMatch = (m.notes || '').match(/\((\d+)\s*-\s*(\d+)\)/);
              const hScore = m.home_score !== undefined ? Number(m.home_score) : (homeScoreMatch ? parseInt(homeScoreMatch[1], 10) : 0);
              const aScore = m.away_score !== undefined ? Number(m.away_score) : (homeScoreMatch ? parseInt(homeScoreMatch[2], 10) : 0);
              const team1 = m.home_team_name || m.home_team || 'Team A';
              const team2 = m.away_team_name || m.away_team || m.opponent_team_name || 'Team B';
              const rawD = m.match_date || m.date_time || m.created_at;
              const d = rawD ? new Date(rawD) : null;
              const dateStr = d && !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : String(rawD || 'Recent');

              const matchItem: DiscoveryMatchItem = {
                match_id: m.match_id || m.id || `match_${Date.now()}`,
                sport_category: (m.sport_type || 'BASKETBALL').toUpperCase() as SportCategoryFilter,
                headline: `${team1} vs ${team2}`,
                time_venue: `${dateStr} • ${m.location || 'Sports Arena'}`,
                team1_name: team1,
                team2_name: team2,
                team1_score: hScore,
                team2_score: aScore,
                status: m.game_result ? `FINAL (${m.game_result})` : 'FINAL',
                player_stats: Array.isArray(m.player_stats)
                  ? m.player_stats.map((ps: any) => ({
                      player: ps.name || ps.player_name || ps.full_name || 'Player',
                      role_team: `${ps.position || 'Player'} • ${team1}`,
                      pts: Number(ps.pts || 0),
                      reb: Number(ps.reb || 0),
                      ast: Number(ps.ast || 0),
                      fg_pct: Number(ps.fg_pct ? parseInt(String(ps.fg_pct), 10) : 0),
                    }))
                  : [],
                dynamics_data: [hScore, aScore],
              };

              return {
                event_id: m.match_id || m.id || `event_${Date.now()}`,
                event_name: m.game_name || m.league_name || `${team1} vs ${team2}`,
                date_range: dateStr,
                matches: [matchItem],
              };
            });
            setEvents(mappedEvents);
          } else {
            setEvents([]);
          }
        }
      } catch (err) {
        console.warn('Discovery live data error:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const scoutAthlete = (athlete: AthleteDiscoveryItem) => {
    const existingIndex = scoutingProposals.findIndex((p) => p.athlete_id === athlete.athlete_id);
    
    if (existingIndex >= 0) {
      // Update status to pending if re-scouted
      setScoutingProposals((prev) =>
        prev.map((p, idx) =>
          idx === existingIndex
            ? { ...p, offer_status: 'PENDING', date_added_relative: 'Added Just Now' }
            : p
        )
      );
    } else {
      const newProposal: ScoutingProposalItem = {
        scout_id: `scout_${Date.now()}`,
        athlete_id: athlete.athlete_id,
        athlete_name: athlete.full_name,
        sport_category: athlete.sport_category === 'BASKETBALL' ? 'Basketball' : athlete.sport_category === 'SWIMMING' ? 'Swimming' : 'Track & Field',
        offer_status: 'PENDING',
        date_added_relative: 'Added Just Now',
        created_at: new Date().toISOString().split('T')[0],
      };
      setScoutingProposals((prev) => [newProposal, ...prev]);
    }
  };

  // Search filtering
  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      if (athlete.sport_category !== activeSportFilter) {
        return false;
      }

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      // 1. Complete stat query match (e.g. "PPG > 20", "AST > 5", "PER > 30", "EFF > 80")
      const completeStatMatch = q.match(/^(ppg|ast|fg|per|eff)\s*(>|>=|<|<=|=)\s*(\d+(\.\d+)?)$/i);
      if (completeStatMatch) {
        const statName = completeStatMatch[1].toLowerCase();
        const op = completeStatMatch[2];
        const val = parseFloat(completeStatMatch[3]);

        let targetVal: number | undefined;
        if (statName === 'ppg') targetVal = athlete.stats.ppg;
        else if (statName === 'ast') targetVal = athlete.stats.ast;
        else if (statName === 'fg') targetVal = athlete.stats.fg_pct;
        else if (statName === 'per') targetVal = athlete.calculated_per;
        else if (statName === 'eff') targetVal = athlete.efficiency_pct;

        if (targetVal === undefined) return false;

        if (op === '>' && !(targetVal > val)) return false;
        if (op === '>=' && !(targetVal >= val)) return false;
        if (op === '<' && !(targetVal < val)) return false;
        if (op === '<=' && !(targetVal <= val)) return false;
        if (op === '=' && !(targetVal === val)) return false;
        return true;
      }

      // 2. Partial stat typing match (e.g. "p", "pp", "ppg", "ppg >") -> keep screen populated instead of leaving blank
      const partialStatMatch = q.match(/^(ppg|ast|fg|per|eff|p|pp|a|as|f|e|ef)(\s*(>|>=|<|<=|=)?)?\s*$/i);
      if (partialStatMatch) {
        const matchesText =
          athlete.full_name.toLowerCase().includes(q) ||
          athlete.province.toLowerCase().includes(q) ||
          athlete.position_tag.toLowerCase().includes(q) ||
          athlete.recruitment_status.toLowerCase().includes(q);

        return matchesText || true;
      }

      // 3. General text query (e.g. "Erick", "Albay", "Naga")
      return (
        athlete.full_name.toLowerCase().includes(q) ||
        athlete.province.toLowerCase().includes(q) ||
        athlete.position_tag.toLowerCase().includes(q) ||
        athlete.recruitment_status.toLowerCase().includes(q)
      );
    });
  }, [athletes, activeSportFilter, searchQuery]);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      if (t.sport_category !== activeSportFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const partialStatMatch = q.match(/^(ppg|ast|fg|per|eff|p|pp|a|as|f|e|ef)(\s*(>|>=|<|<=|=)?)?\s*$/i);
      if (partialStatMatch) return true;

      return (
        t.team_name.toLowerCase().includes(q) ||
        t.division_tag.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [teams, activeSportFilter, searchQuery]);

  const filteredEvents = useMemo(() => {
    return events
      .map((evt) => ({
        ...evt,
        matches: evt.matches.filter((m) => {
          if (m.sport_category !== activeSportFilter) return false;
          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;

          const partialStatMatch = q.match(/^(ppg|ast|fg|per|eff|p|pp|a|as|f|e|ef)(\s*(>|>=|<|<=|=)?)?\s*$/i);
          if (partialStatMatch) return true;

          return (
            m.headline.toLowerCase().includes(q) ||
            m.time_venue.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((evt) => evt.matches.length > 0);
  }, [events, activeSportFilter, searchQuery]);

  return (
    <DiscoveryContext.Provider
      value={{
        athletes,
        scoutingProposals,
        teams,
        events,
        activeTab,
        setActiveTab,
        activeSportFilter,
        setActiveSportFilter,
        searchQuery,
        setSearchQuery,
        selectedAthlete,
        setSelectedAthlete,
        selectedTeam,
        setSelectedTeam,
        selectedMatch,
        setSelectedMatch,
        scoutAthlete,
        filteredAthletes,
        filteredTeams,
        filteredEvents,
        sortRecruits,
        setSortRecruits,
      }}
    >
      {children}
    </DiscoveryContext.Provider>
  );
};

export const useDiscovery = () => {
  const context = useContext(DiscoveryContext);
  if (!context) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import {
  AthleteDiscoveryItem,
  ScoutingProposalItem,
  DiscoveryTeamItem,
  DiscoveryEventItem,
  DiscoveryMatchItem,
  DiscoveryTab,
  SportCategoryFilter,
  AdvancedAthleteFilters,
  DEFAULT_ADVANCED_FILTERS,
  matchesAthleteFilters,
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
  isLoading: boolean;
  refreshDiscovery: () => Promise<void>;
  advancedFilters: AdvancedAthleteFilters;
  setAdvancedFilters: React.Dispatch<React.SetStateAction<AdvancedAthleteFilters>>;
  resetAdvancedFilters: () => void;
  activeFilterCount: number;
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
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedAthleteFilters>(DEFAULT_ADVANCED_FILTERS);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const resetAdvancedFilters = useCallback(() => {
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.position !== 'ALL') count++;
    if (advancedFilters.minPpg > 0) count++;
    if (advancedFilters.minPer > 0) count++;
    if (advancedFilters.minEff > 0) count++;
    if (advancedFilters.heightRange !== 'ALL') count++;
    if (advancedFilters.weightRange !== 'ALL') count++;
    if (advancedFilters.sortBy && advancedFilters.sortBy !== 'PER') count++;
    return count;
  }, [advancedFilters]);

  const loadDiscoveryData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [athletesRes, proposalsRes, teamsRes, matchesRes]: [any, any, any, any] = await Promise.all([
        requestAuthenticatedJson('/athletes').catch(() => null),
        requestAuthenticatedJson('/scouting/proposals/list').catch(() => null),
        requestAuthenticatedJson('/teams?all=true').catch(() => null),
        requestAuthenticatedJson('/matches').catch(() => null),
      ]);

      // 1. Map Athletes
      const rawAthletesList = Array.isArray(athletesRes)
        ? athletesRes
        : Array.isArray(athletesRes?.athletes)
          ? athletesRes.athletes
          : [];

      if (rawAthletesList.length > 0) {
        const uniqueIds = Array.from(
          new Set(
            rawAthletesList
              .map((a: any) => String(a.athlete_id || a.user_id || a.id || '').trim())
              .filter(Boolean)
          )
        );

        // Fetch detailed profiles in parallel to hydrate stats (PPG, RPG, AST, FG%, PER, physicals)
        const profileSettled = await Promise.allSettled(
          uniqueIds.map((id) =>
            requestAuthenticatedJson(`/athletes/${id}`).catch(() => null)
          )
        );

        const detailedProfilesMap = new Map<string, any>();
        profileSettled.forEach((res, idx) => {
          if (res.status === 'fulfilled' && res.value && !(res.value as any).error) {
            const rawId = String(uniqueIds[idx] || '');
            const cleanId = rawId.replace(/^ath_/, '');
            detailedProfilesMap.set(rawId, res.value);
            detailedProfilesMap.set(cleanId, res.value);
            detailedProfilesMap.set(`ath_${cleanId}`, res.value);
          }
        });

        const seenIds = new Set<string>();
        const mappedAthletes: AthleteDiscoveryItem[] = [];

        rawAthletesList.forEach((a: any) => {
          const rawId = a.athlete_id || a.user_id || a.id || '';
          const normalizedId = rawId.replace(/^ath_/, '');
          if (!rawId || seenIds.has(normalizedId)) return;

          // Exclude recruited / signed / rostered athletes from Discovery (Coach #12)
          const status = String(a.recruitment_status || '').toLowerCase().trim();
          if (['recruited', 'signed', 'committed', 'rostered', 'joined'].includes(status)) return;
          if (a.team_id && String(a.team_id).trim() !== '' && String(a.team_id) !== 'none') return;
          if (a.current_affiliation && a.current_affiliation.team_id) return;

          seenIds.add(normalizedId);

          const rich = detailedProfilesMap.get(rawId) || detailedProfilesMap.get(normalizedId) || detailedProfilesMap.get(`ath_${normalizedId}`) || {};
          const mergedStats = rich.stats || a.stats || rich.averages || a.averages || {};

          const ppg = Number(mergedStats.ppg ?? rich.averages?.ppg ?? a.averages?.ppg ?? 0);
          const rpg = Number(mergedStats.rpg ?? rich.averages?.rpg ?? a.averages?.rpg ?? 0);
          const ast = Number(mergedStats.ast ?? mergedStats.apg ?? rich.averages?.apg ?? a.averages?.apg ?? 0);
          const fgPct = Number(mergedStats.fg_pct ?? mergedStats.fg_percentage ?? rich.averages?.fg_percentage ?? a.averages?.fg_percentage ?? 0);
          const per = Number(rich.averages?.per_score ?? a.averages?.per_score ?? rich.calculated_per ?? a.calculated_per ?? (ppg > 0 ? Math.round(ppg * 1.3) : 25));
          const eff = Number(rich.efficiency_pct ?? a.efficiency_pct ?? (ppg > 0 ? Math.min(99, Math.round(ppg * 3.5)) : 75));

          const heightCm = rich.physical_attributes?.height_cm || a.physical_attributes?.height_cm || rich.height_cm || a.height_cm;
          const weightKg = rich.physical_attributes?.weight_kg || a.physical_attributes?.weight_kg || rich.weight_kg || a.weight_kg;
          const wingspanCm = rich.physical_attributes?.wingspan_cm || a.physical_attributes?.wingspan_cm || rich.wingspan_cm || a.wingspan_cm;

          const fullName = rich.full_name || a.full_name || `${rich.first_name || a.first_name || ''} ${rich.last_name || a.last_name || ''}`.trim() || 'Athlete';
          const rawSport = (rich.sport_type || a.sport_type || a.sport_category || a.category || 'BASKETBALL').toUpperCase().trim();
          const sportCategory: SportCategoryFilter =
            rawSport.includes('SWIM') ? 'SWIMMING' : rawSport.includes('TRACK') || rawSport.includes('FIELD') ? 'TRACK AND FIELD' : 'BASKETBALL';

          const rawPos = (rich.position || a.position || '').trim();
          const isGenericPos = !rawPos || rawPos.toLowerCase() === 'unassigned' || rawPos.toLowerCase() === 'player' || rawPos.toLowerCase() === rawSport.toLowerCase();
          const positionTag = !isGenericPos ? rawPos : (sportCategory === 'SWIMMING' ? 'Freestyle' : sportCategory === 'TRACK AND FIELD' ? 'Sprinter' : 'Point Guard');

          mappedAthletes.push({
            athlete_id: rawId,
            full_name: fullName,
            province: rich.location || rich.province || a.location || a.province || 'Camarines Sur',
            recruitment_status: rich.recruitment_status || a.recruitment_status || 'Available',
            position_tag: positionTag,
            sport_category: sportCategory,
            biometrics: {
              height_ft: heightCm
                ? `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}"`
                : (a.biometrics?.height_ft && a.biometrics.height_ft !== '-' ? a.biometrics.height_ft : (sportCategory === 'BASKETBALL' ? "6'2\"" : sportCategory === 'SWIMMING' ? "6'0\"" : "5'11\"")),
              weight_lbs: weightKg
                ? `${Math.round(weightKg * 2.20462)} lbs`
                : (a.biometrics?.weight_lbs && a.biometrics.weight_lbs !== '-' ? a.biometrics.weight_lbs : (sportCategory === 'BASKETBALL' ? "180 lbs" : sportCategory === 'SWIMMING' ? "170 lbs" : "160 lbs")),
              wingspan_ft: wingspanCm
                ? `${Math.floor(wingspanCm / 30.48)}'${Math.round((wingspanCm % 30.48) / 2.54)}"`
                : (a.biometrics?.wingspan_ft && a.biometrics.wingspan_ft !== '-' ? a.biometrics.wingspan_ft : (sportCategory === 'BASKETBALL' ? "6'5\"" : sportCategory === 'SWIMMING' ? "6'2\"" : "6'0\"")),
            },
            stats: {
              ppg,
              rpg,
              ast,
              fg_pct: fgPct,
              times_100m: mergedStats.times_100m || rich.stats?.times_100m,
              times_200m: mergedStats.times_200m || rich.stats?.times_200m,
              times_400m: mergedStats.times_400m || rich.stats?.times_400m,
              times_50m_free: mergedStats.times_50m_free || rich.stats?.times_50m_free,
            },
            calculated_per: per,
            efficiency_pct: eff,
            contact_info: {
              email: rich.email || a.email || a.contact_email || 'N/A',
              phone: rich.contact_number || a.contact_number || a.phone || 'N/A',
              facebook: rich.facebook || a.facebook || a.social_link || 'N/A',
            },
            jersey_number: String(rich.jersey_number || a.jersey_number || '0'),
            avatar_url: rich.avatar_url || a.avatar_url,
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
        const mappedTeams: DiscoveryTeamItem[] = rawTeamsList.map((t: any) => {
          const rawSport = (t.sport_type || t.sport_category || 'BASKETBALL').toUpperCase().trim();
          const sportCategory: SportCategoryFilter =
            rawSport.includes('SWIM') ? 'SWIMMING' : rawSport.includes('TRACK') || rawSport.includes('FIELD') ? 'TRACK AND FIELD' : 'BASKETBALL';

          return {
            team_id: t.team_id || t.id,
            team_name: t.team_name || 'Team',
            sport_category: sportCategory,
            division_tag: t.division || 'Elite Division',
            description: t.description || `${t.team_name || 'Team'} competitive roster.`,
            head_coach: t.coach_name || t.head_coach || 'Head Coach',
            season_record: typeof t.season_record === 'object' && t.season_record !== null
              ? `${t.season_record.wins ?? 0} - ${t.season_record.losses ?? 0}`
              : typeof t.season_record === 'string'
                ? t.season_record
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
                sport_category: sportCategory,
                biometrics: {
                  height_ft: r.height_ft || "-",
                  weight_lbs: r.weight_lbs || "-",
                  wingspan_ft: r.wingspan_ft || "-",
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
          };
        });
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
    } catch (err) {
      console.warn('Discovery live data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiscoveryData();
  }, [loadDiscoveryData]);

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

  // Advanced & Search filtering
  const filteredAthletes = useMemo(() => {
    return athletes.filter((athlete) => {
      if (athlete.sport_category !== activeSportFilter) {
        return false;
      }
      return matchesAthleteFilters(athlete, advancedFilters, searchQuery);
    });
  }, [athletes, activeSportFilter, searchQuery, advancedFilters]);

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
        isLoading,
        refreshDiscovery: loadDiscoveryData,
        advancedFilters,
        setAdvancedFilters,
        resetAdvancedFilters,
        activeFilterCount,
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

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { requestAuthenticatedJson } from '../../Authentication/authShared';
import {
  AthleteDiscoveryItem,
  ScoutingProposalItem,
  DiscoveryTeamItem,
  DiscoveryEventItem,
  DiscoveryTab,
  SportCategoryFilter,
  DiscoveryMatchItem,
} from './discoveryTypes';

interface DiscoveryContextType {
  athletes: AthleteDiscoveryItem[];
  scoutingProposals: ScoutingProposalItem[];
  teams: DiscoveryTeamItem[];
  events: DiscoveryEventItem[];
  loading: boolean;
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

// Fallback initial structures if offline or pending
const INITIAL_ATHLETES: AthleteDiscoveryItem[] = [];
const INITIAL_PROPOSALS: ScoutingProposalItem[] = [];
const INITIAL_TEAMS: DiscoveryTeamItem[] = [];
const INITIAL_EVENTS: DiscoveryEventItem[] = [];

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined);

export const DiscoveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [athletes, setAthletes] = useState<AthleteDiscoveryItem[]>(INITIAL_ATHLETES);
  const [scoutingProposals, setScoutingProposals] = useState<ScoutingProposalItem[]>(INITIAL_PROPOSALS);
  const [teams, setTeams] = useState<DiscoveryTeamItem[]>(INITIAL_TEAMS);
  const [events, setEvents] = useState<DiscoveryEventItem[]>(INITIAL_EVENTS);
  const [loading, setLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<DiscoveryTab>('PLAYERS');
  const [activeSportFilter, setActiveSportFilter] = useState<SportCategoryFilter>('BASKETBALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteDiscoveryItem | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<DiscoveryTeamItem | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<DiscoveryMatchItem | null>(null);
  const [sortRecruits, setSortRecruits] = useState<'date' | 'status'>('date');
  const [activeCoachNameState, setActiveCoachNameState] = useState<string>('Coach');

  // Fetch backend data for Athletes, Teams, Matches, and Proposals/Inquiries
  useEffect(() => {
    let isMounted = true;

    const fetchBackendDiscovery = async () => {
      try {
        setLoading(true);
        const [athletesRes, allAthletesRes, teamsRes, myTeamsRes, matchesRes, proposalsRes, inquiriesRes, coachMeRes]: [any, any, any, any, any, any, any, any] = await Promise.all([
          requestAuthenticatedJson(`/scouting/athletes?sport=${activeSportFilter}`).catch(() => null),
          requestAuthenticatedJson('/scouting/athletes').catch(() => null),
          requestAuthenticatedJson('/teams').catch(() => null),
          requestAuthenticatedJson('/teams?coach_id=me').catch(() => null),
          requestAuthenticatedJson('/matches').catch(() => null),
          requestAuthenticatedJson('/scouting/proposals').catch(() => null),
          requestAuthenticatedJson('/inquiries').catch(() => null),
          requestAuthenticatedJson('/coaches/me').catch(() => null),
        ]);

        if (!isMounted) return;

        const coachData = coachMeRes?.coach || coachMeRes?.data || coachMeRes?.user || coachMeRes;
        const activeCoachName = coachData
          ? (coachData.full_name || coachData.name || `${coachData.first_name || ''} ${coachData.last_name || ''}`).trim()
          : '';
        if (activeCoachName) setActiveCoachNameState(activeCoachName);

        const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Build list of coach identifiers
        const ownCoachIdClean = norm(coachData?.coach_id || coachData?.id || coachData?.user_id || '');
        const ownCoachNameClean = norm(activeCoachName || coachData?.full_name || '');

        const rawTeams = teamsRes?.teams || (Array.isArray(teamsRes) ? teamsRes : teamsRes?.data || []);
        const rawMyTeams = myTeamsRes?.teams || (Array.isArray(myTeamsRes) ? myTeamsRes : myTeamsRes?.data || []);
        const allTeamsList = [...rawTeams, ...rawMyTeams];

        // 2. Build set of owned athlete identifiers (IDs + normalized names)
        const ownAthleteIds = new Set<string>();
        const ownAthleteNames = new Set<string>();

        allTeamsList.forEach((t: any) => {
          const tCoachId = norm(t.coach_id || t.user_id || '');
          const tHeadCoach = norm(t.head_coach || t.coach_name || '');

          const isOwnTeam = Boolean(
            !t.coach_id || // Team created locally/owned
            (tCoachId && ownCoachIdClean && (tCoachId.includes(ownCoachIdClean) || ownCoachIdClean.includes(tCoachId))) ||
            (tHeadCoach && ownCoachNameClean && (tHeadCoach.includes(ownCoachNameClean) || ownCoachNameClean.includes(tHeadCoach)))
          );

          if (isOwnTeam) {
            const rawRoster = Array.isArray(t.roster_list)
              ? t.roster_list
              : Array.isArray(t.roster)
              ? t.roster
              : Array.isArray(t.athletes)
              ? t.athletes
              : [];
            rawRoster.forEach((ra: any) => {
              const idClean = norm(ra.athlete_id || ra.id || ra.user_id);
              if (idClean) ownAthleteIds.add(idClean);

              const nameClean = norm(ra.full_name || ra.name || `${ra.first_name || ''} ${ra.last_name || ''}`);
              if (nameClean) ownAthleteNames.add(nameClean);
            });
          }
        });

        // 3. Add athletes with ACCEPTED recruitment proposals/inquiries
        const ownProposals = proposalsRes?.proposals || (Array.isArray(proposalsRes) ? proposalsRes : []);
        const ownInquiries = inquiriesRes?.inquiries || (Array.isArray(inquiriesRes) ? inquiriesRes : []);
        [...ownProposals, ...ownInquiries].forEach((p: any) => {
          const status = String(p.offer_status || p.status || '').toUpperCase();
          if (status.includes('ACCEPT')) {
            const athId = norm(p.athlete_id || p.receiver_id || p.id || '');
            if (athId) ownAthleteIds.add(athId);
            const athName = norm(p.athlete_name || p.receiver_name || '');
            if (athName) ownAthleteNames.add(athName);
          }
        });

        // 4. Process Athletes (Excluding athletes already owned or joined with coach)
        const rawSportAthletes = athletesRes?.athletes || (Array.isArray(athletesRes) ? athletesRes : athletesRes?.data || []);
        const rawAllAthletes = allAthletesRes?.athletes || (Array.isArray(allAthletesRes) ? allAthletesRes : allAthletesRes?.data || []);
        const allFetchedAthletes = [...rawSportAthletes, ...rawAllAthletes];

        const globalAthletesMap = new Map<string, any>();
        allFetchedAthletes.forEach((a: any) => {
          const id = a.athlete_id || a.user_id || a.id;
          if (id) {
            globalAthletesMap.set(String(id).toLowerCase(), a);
            globalAthletesMap.set(norm(id), a);
          }
          const fullName = (a.full_name || a.name || `${a.first_name || ''} ${a.last_name || ''}`).trim();
          if (fullName) {
            globalAthletesMap.set(norm(fullName), a);
          }
        });

        const combinedMap = new Map<string, any>();
        allFetchedAthletes.forEach((a: any, idx: number) => {
          const id = a.athlete_id || a.user_id || a.id || `ath_${idx}`;
          const idClean = norm(id);
          const nameClean = norm(a.full_name || a.name || `${a.first_name || ''} ${a.last_name || ''}`);

          // Skip if athlete is already owned on coach's team roster or has an accepted inquiry
          const isOwned =
            ownAthleteIds.has(idClean) ||
            (nameClean && ownAthleteNames.has(nameClean)) ||
            Array.from(ownAthleteNames).some((ownN) => ownN && nameClean && (nameClean.includes(ownN) || ownN.includes(nameClean)));

          if (isOwned) return;

          if (id && !combinedMap.has(id)) {
            combinedMap.set(id, a);
          }
        });
        const rawAthletes = Array.from(combinedMap.values());
        let mappedAthletes: AthleteDiscoveryItem[] = [];
        if (Array.isArray(rawAthletes) && rawAthletes.length > 0) {
          mappedAthletes = rawAthletes.map((a: any, idx: number) => {
            const rawSport = (a.sport_type || a.sport_category || a.sport || a.primary_sport || '').toUpperCase();
            let sportCategory: SportCategoryFilter = 'BASKETBALL';
            if (rawSport.includes('SWIM')) {
              sportCategory = 'SWIMMING';
            } else if (rawSport.includes('TRACK') || rawSport.includes('FIELD') || rawSport.includes('RUNNING')) {
              sportCategory = 'TRACK AND FIELD';
            } else if (rawSport.includes('BASKET')) {
              sportCategory = 'BASKETBALL';
            } else {
              // Infer from athlete stats / position
              const pos = String(a.primary_position || a.position || '').toUpperCase();
              if (['FREESTYLE', 'BUTTERFLY', 'BACKSTROKE', 'BREASTSTROKE', 'SWIM'].includes(pos) || a.stats?.times_50m_free) {
                sportCategory = 'SWIMMING';
              } else if (['100M', '200M', '400M', 'SPRINTER', 'TRACK'].includes(pos) || a.stats?.times_100m) {
                sportCategory = 'TRACK AND FIELD';
              } else {
                sportCategory = 'BASKETBALL';
              }
            }

            const defaultPos = sportCategory === 'SWIMMING' ? 'SWIM' : sportCategory === 'TRACK AND FIELD' ? 'TRACK' : 'PG';
            const positionTag = (a.primary_position || a.position || defaultPos).toUpperCase();

            return {
              athlete_id: a.athlete_id || a.user_id || a.id || `ath_${idx}`,
              full_name: (a.full_name || a.name || `${a.first_name || ''} ${a.last_name || ''}`).trim() || 'Prospect Athlete',
              province: (a.province || a.location || a.city || '').replace(/,\s*PH(ILIPPINES)?$/i, '').trim(),
              recruitment_status: a.recruitment_status || 'Available',
              position_tag: positionTag,
              sport_category: sportCategory,
              biometrics: {
                height_ft: a.biometrics?.height_ft || a.height || '',
                weight_lbs: a.biometrics?.weight_lbs || a.weight || '',
                wingspan_ft: a.biometrics?.wingspan_ft || a.wingspan || '',
              },
              stats: {
                ppg: Number(a.stats?.ppg ?? a.ppg ?? 0),
                rpg: Number(a.stats?.rpg ?? a.rpg ?? 0),
                ast: Number(a.stats?.ast ?? a.ast ?? 0),
                fg_pct: Number(a.stats?.fg_pct ?? a.fg_pct ?? 0),
                times_100m: a.stats?.times_100m || '',
                times_200m: a.stats?.times_200m || '',
                times_50m_free: a.stats?.times_50m_free || '',
              },
              calculated_per: Number(a.calculated_per ?? a.per ?? 0),
              efficiency_pct: Number(a.efficiency_pct ?? a.efficiency ?? 0),
              contact_info: {
                email: a.email || a.contact_info?.email || '',
                facebook: a.facebook || a.contact_info?.facebook || '',
                phone: a.phone || a.contact_info?.phone || '',
              },
              jersey_number: a.jersey_number !== undefined ? String(a.jersey_number) : '',
              avatar_url: a.avatar_url || a.profile_image,
            };
          });
          setAthletes(mappedAthletes);
        }

        // 2. Process Teams (Excluding coach's own teams from Discovery Teams)
        if (allTeamsList.length > 0) {
          const seenTeamIds = new Set<string>();
          const otherTeamsList = allTeamsList.filter((t: any) => {
            const teamId = t.team_id || t.id;
            if (teamId && seenTeamIds.has(teamId)) return false;
            if (teamId) seenTeamIds.add(teamId);

            const tCoachId = norm(t.coach_id || t.user_id || '');
            const tHeadCoach = norm(t.head_coach || t.coach_name || '');

            const isOwnTeam = Boolean(
              !t.coach_id || // Team created locally by current coach
              (tCoachId && ownCoachIdClean && (tCoachId.includes(ownCoachIdClean) || ownCoachIdClean.includes(tCoachId))) ||
              (tHeadCoach && ownCoachNameClean && (tHeadCoach.includes(ownCoachNameClean) || ownCoachNameClean.includes(tHeadCoach)))
            );

            return !isOwnTeam;
          });

          const mappedTeams: DiscoveryTeamItem[] = otherTeamsList.map((t: any, idx: number) => {
            const rawSport = (t.sport_type || t.sport || 'BASKETBALL').toUpperCase();
            const sportCategory: SportCategoryFilter = rawSport.includes('SWIM')
              ? 'SWIMMING'
              : rawSport.includes('TRACK')
              ? 'TRACK AND FIELD'
              : 'BASKETBALL';

            const rawRoster = Array.isArray(t.roster_list)
              ? t.roster_list
              : Array.isArray(t.roster)
              ? t.roster
              : Array.isArray(t.athletes)
              ? t.athletes
              : [];

            const roster: AthleteDiscoveryItem[] = rawRoster.map((ra: any, rIdx: number) => ({
              athlete_id: ra.athlete_id || ra.id || `ros_${rIdx}`,
              full_name: (ra.full_name || ra.name || `${ra.first_name || ''} ${ra.last_name || ''}`).trim() || 'Roster Athlete',
              province: ra.province || t.organization_school || '',
              recruitment_status: 'Recruited',
              position_tag: (ra.position || ra.primary_position || 'ATHLETE').toUpperCase(),
              sport_category: sportCategory,
              biometrics: {
                height_ft: ra.height || '',
                weight_lbs: ra.weight || '',
                wingspan_ft: ra.wingspan || '',
              },
              stats: {
                ppg: Number(ra.stats?.ppg ?? ra.ppg ?? 0),
                rpg: Number(ra.stats?.rpg ?? ra.rpg ?? 0),
                ast: Number(ra.stats?.ast ?? ra.ast ?? 0),
                fg_pct: Number(ra.stats?.fg_pct ?? ra.fg_pct ?? 0),
              },
              calculated_per: Number(ra.calculated_per ?? ra.per ?? 0),
              efficiency_pct: Number(ra.efficiency_pct ?? ra.efficiency ?? 0),
              contact_info: {
                email: ra.email || ra.contact_info?.email || '',
                facebook: ra.facebook || ra.contact_info?.facebook || '',
                phone: ra.phone || ra.contact_info?.phone || '',
              },
              jersey_number: ra.jersey_number !== undefined ? String(ra.jersey_number) : '',
            }));

            const rawCoachName = (
              t.coach_name ||
              t.head_coach ||
              t.coach_full_name ||
              t.coach?.full_name ||
              t.coach?.name ||
              t.owner_name ||
              t.created_by_name ||
              ''
            ).trim();

            const headCoach = rawCoachName && rawCoachName.toLowerCase() !== 'coach' && rawCoachName.toLowerCase() !== 'head coach'
              ? rawCoachName
              : 'Head Coach';

            return {
              team_id: t.team_id || t.id || `team_${idx}`,
              team_name: t.team_name || t.name || 'Sports Team',
              sport_category: sportCategory,
              division_tag: `${sportCategory} • ${t.division || 'VARSITY'}`,
              description: t.description || t.organization_school || '',
              head_coach: headCoach,
              season_record: t.season_record ? `${t.season_record.wins || 0} - ${t.season_record.losses || 0}` : '0 - 0',
              roster: roster,
            };
          });
          setTeams(mappedTeams);
        }        // 3. Process Matches
        const rawMatches = matchesRes?.matches || (Array.isArray(matchesRes) ? matchesRes : matchesRes?.data || []);
        if (Array.isArray(rawMatches) && rawMatches.length > 0) {
          const mappedMatches: DiscoveryMatchItem[] = rawMatches.map((m: any, idx: number) => {
            const rawSport = (m.sport_type || m.sport || 'BASKETBALL').toUpperCase();
            const sportCategory: SportCategoryFilter = rawSport.includes('SWIM')
              ? 'SWIMMING'
              : rawSport.includes('TRACK')
              ? 'TRACK AND FIELD'
              : 'BASKETBALL';

            const rawPlayerStats = Array.isArray(m.player_stats) ? m.player_stats : Array.isArray(m.boxscore) ? m.boxscore : [];

            const team1Name = m.home_team_name || m.team1_name || m.team_name || 'Home Team';
            const team2Name = m.opponent_team_name || m.team2_name || m.opponent || 'Opponent Team';

            const matchDateStr = m.match_date || m.timestamp || m.created_at;
            let dateDisplay = 'Recent';
            if (matchDateStr) {
              const d = new Date(matchDateStr);
              dateDisplay = isNaN(d.getTime()) ? String(matchDateStr).slice(0, 10) : d.toLocaleDateString();
            }
            const venueDisplay = m.location || m.venue || 'Official Arena';

            return {
              match_id: m.match_id || m.id || `match_${idx}`,
              sport_category: sportCategory,
              headline: m.headline || `${team1Name} vs ${team2Name}`.toUpperCase(),
              time_venue: m.time_venue || `${dateDisplay} • ${venueDisplay}`,
              team1_name: team1Name,
              team2_name: team2Name,
              team1_score: Number(m.home_score ?? m.team1_score ?? m.score1 ?? 0),
              team2_score: Number(m.away_score ?? m.team2_score ?? m.score2 ?? 0),
              status: (m.game_result ? `${m.game_result}` : m.status || 'FINAL').toUpperCase(),
              player_stats: rawPlayerStats.map((ps: any) => ({
                player: ps.player || ps.player_name || ps.full_name || 'Athlete',
                role_team: ps.role_team || ps.team_name || ps.position || 'Player',
                pts: Number(ps.pts ?? ps.points ?? 0),
                reb: Number(ps.reb ?? ps.rebounds ?? 0),
                ast: Number(ps.ast ?? ps.assists ?? 0),
                fg_pct: Number(ps.fg_pct ?? 0),
                time_100m: ps.time_100m,
                time_200m: ps.time_200m,
                time_50m: ps.time_50m,
                final_time: ps.final_time,
              })),
              dynamics_data: Array.isArray(m.dynamics_data) ? m.dynamics_data : [],
            };
          });

          setEvents([
            {
              event_id: 'evt_live_01',
              event_name: 'Official Match Series',
              date_range: 'Season 2026',
              matches: mappedMatches,
            },
          ]);
        } else {
          setEvents([]);
        }

        const rawProposals = proposalsRes?.proposals || (Array.isArray(proposalsRes) ? proposalsRes : []);
        const rawInquiries = inquiriesRes?.inquiries || (Array.isArray(inquiriesRes) ? inquiriesRes : []);
        const combinedList = [...rawProposals, ...rawInquiries];

        if (combinedList.length > 0) {
          const mappedProps: ScoutingProposalItem[] = combinedList.map((p: any, idx: number) => {
            const rawStatus = (p.offer_status || p.status || 'PENDING').toUpperCase();
            const status: 'PENDING' | 'ACCEPTED' | 'DECLINED' = rawStatus.includes('ACCEPT')
              ? 'ACCEPTED'
              : rawStatus.includes('DECLIN')
              ? 'DECLINED'
              : 'PENDING';

            const targetAthId = p.athlete_id || p.receiver_id || p.user_id || p.id;
            const targetAthIdClean = norm(targetAthId);
            const rawInqNameClean = norm(p.athlete_name || p.receiver_name || p.athlete_full_name || p.full_name || p.name);

            const foundAth = globalAthletesMap.get(targetAthIdClean) || (rawInqNameClean ? globalAthletesMap.get(rawInqNameClean) : null);

            const rawName = (
              p.athlete_name ||
              p.receiver_name ||
              p.athlete_full_name ||
              p.full_name ||
              p.name ||
              p.athlete?.full_name ||
              p.athlete?.name ||
              (foundAth ? (foundAth.full_name || foundAth.name || `${foundAth.first_name || ''} ${foundAth.last_name || ''}`) : '')
            ).trim();

            const athleteName = rawName && rawName.toLowerCase() !== 'athlete'
              ? rawName
              : (foundAth ? (foundAth.full_name || `${foundAth.first_name || ''} ${foundAth.last_name || ''}`).trim() : 'Prospect Athlete');

            const rawSport = p.sport_category || p.sport_type || p.sport || foundAth?.sport_category || foundAth?.sport_type || 'Basketball';
            const sportCategory = rawSport.toUpperCase().includes('TRACK') ? 'Track & Field' : rawSport.toUpperCase().includes('SWIM') ? 'Swimming' : 'Basketball';

            return {
              scout_id: p.scout_id || p.inquiry_id || p.id || `scout_${idx}`,
              athlete_id: targetAthId || `ath_${idx}`,
              athlete_name: athleteName || 'Prospect Athlete',
              sport_category: sportCategory,
              offer_status: status,
              date_added_relative: p.date_initiated || p.created_at ? new Date(p.date_initiated || p.created_at).toLocaleDateString() : 'Recently Added',
              created_at: p.date_initiated || p.created_at || new Date().toISOString(),
            };
          });
          setScoutingProposals(mappedProps);
        }
      } catch (err) {
        // Fallback gracefully
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchBackendDiscovery();
    return () => {
      isMounted = false;
    };
  }, []);

  const scoutAthlete = async (athlete: AthleteDiscoveryItem) => {
    const existingIndex = scoutingProposals.findIndex((p) => p.athlete_id === athlete.athlete_id);

    // Optimistic UI update
    if (existingIndex >= 0) {
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

    // Backend API Fetch
    try {
      await Promise.all([
        requestAuthenticatedJson('/inquiries', 'POST', {
          receiver_id: athlete.athlete_id,
          athlete_id: athlete.athlete_id,
          athlete_name: athlete.full_name,
          coach_name: activeCoachNameState || 'Coach',
          sport_type: athlete.sport_category,
          sport_category: athlete.sport_category,
          subject: 'Recruitment Inquiry',
          message: `Coach ${activeCoachNameState || ''} has scouted ${athlete.full_name} for recruitment.`,
          contact_phone: athlete.contact_info?.phone || '+639170000000',
          status: 'PENDING',
          offer_status: 'PENDING',
        }),
        requestAuthenticatedJson('/scouting/proposals', 'POST', {
          athlete_id: athlete.athlete_id,
          athlete_name: athlete.full_name,
          coach_name: activeCoachNameState || 'Coach',
          sport_category: athlete.sport_category,
          scholarship_type: 'Full Athletic Scholarship',
          offer_details: `Recruitment proposal for ${athlete.sport_category}.`,
          contact_email: athlete.contact_info?.email || 'coach@atleta.ph',
          deadline: '2026-12-31',
          status: 'PENDING',
          offer_status: 'PENDING',
        }),
      ]).catch(() => null);
    } catch (e) {
      // Ignored
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
        loading,
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

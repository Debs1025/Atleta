import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  AthleteDiscoveryItem,
  ScoutingProposalItem,
  DiscoveryTeamItem,
  DiscoveryEventItem,
  DiscoveryMatchItem,
  DiscoveryTab,
  SportCategoryFilter,
} from './discoveryTypes';

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

//sample data for testing 
const INITIAL_ATHLETES: AthleteDiscoveryItem[] = [
  {
    athlete_id: 'ath_disc_01',
    full_name: 'Erick De Belen',
    province: 'Albay',
    recruitment_status: 'Available',
    position_tag: 'PG',
    sport_category: 'BASKETBALL',
    biometrics: { height_ft: `6'2"`, weight_lbs: '185 lbs', wingspan_ft: `6'5"` },
    stats: { ppg: 22.4, rpg: 6.4, ast: 8.1, fg_pct: 48 },
    calculated_per: 32.4,
    efficiency_pct: 88,
    contact_info: { email: 'erick@atleta.ph', facebook: 'fb.com/erick.debelen', phone: '+63 917 123 4567' },
    jersey_number: '2',
  },
  {
    athlete_id: 'ath_disc_02',
    full_name: 'Mickey Mouse',
    province: 'Albay',
    recruitment_status: 'Available',
    position_tag: 'SWIMMING',
    sport_category: 'SWIMMING',
    biometrics: { height_ft: `5'11"`, weight_lbs: '160 lbs', wingspan_ft: `6'1"` },
    stats: { times_100m: '48.2s', times_200m: '1m 34s', times_50m_free: '22.1s' },
    calculated_per: 30.1,
    efficiency_pct: 85,
    contact_info: { email: 'mickey@atleta.ph', facebook: 'fb.com/mickey.mouse', phone: '+63 917 987 6543' },
    jersey_number: '5',
  },
  {
    athlete_id: 'ath_disc_03',
    full_name: 'Marcus Thorne',
    province: 'Camarines Sur',
    recruitment_status: 'Available',
    position_tag: 'PG',
    sport_category: 'BASKETBALL',
    biometrics: { height_ft: `6'4"`, weight_lbs: '195 lbs', wingspan_ft: `6'7"` },
    stats: { ppg: 24.1, rpg: 7.8, ast: 9.2, fg_pct: 51 },
    calculated_per: 34.2,
    efficiency_pct: 92,
    contact_info: { email: 'marcus@atleta.ph', facebook: 'fb.com/marcus.thorne', phone: '+63 918 111 2233' },
    jersey_number: '42',
  },
  {
    athlete_id: 'ath_disc_04',
    full_name: 'Gabriel Santos',
    province: 'Albay',
    recruitment_status: 'Available',
    position_tag: 'TRACK AND FIELD',
    sport_category: 'TRACK AND FIELD',
    biometrics: { height_ft: `6'0"`, weight_lbs: '170 lbs', wingspan_ft: `6'2"` },
    stats: { times_100m: '10.2s', times_200m: '20.9s', times_400m: '46.8s' },
    calculated_per: 33.1,
    efficiency_pct: 90,
    contact_info: { email: 'gabriel@atleta.ph', facebook: 'fb.com/gabriel.santos', phone: '+63 919 333 4455' },
    jersey_number: '7',
  },
  {
    athlete_id: 'ath_disc_05',
    full_name: 'Julian Vance',
    province: 'Naga City',
    recruitment_status: 'Recruited',
    position_tag: 'SG',
    sport_category: 'BASKETBALL',
    biometrics: { height_ft: `6'3"`, weight_lbs: '188 lbs', wingspan_ft: `6'4"` },
    stats: { ppg: 19.8, rpg: 4.2, ast: 4.5, fg_pct: 46 },
    calculated_per: 28.5,
    efficiency_pct: 79,
    contact_info: { email: 'julian@atleta.ph', facebook: 'fb.com/julian.vance', phone: '+63 920 555 6677' },
    jersey_number: '22',
  },
  {
    athlete_id: 'ath_disc_06',
    full_name: 'Diego Cruz',
    province: 'Camarines Sur',
    recruitment_status: 'Available',
    position_tag: 'SWIMMING',
    sport_category: 'SWIMMING',
    biometrics: { height_ft: `6'1"`, weight_lbs: '175 lbs', wingspan_ft: `6'3"` },
    stats: { times_100m: '47.5s', times_200m: '1m 32s', times_50m_free: '21.8s' },
    calculated_per: 31.5,
    efficiency_pct: 89,
    contact_info: { email: 'diego@atleta.ph', facebook: 'fb.com/diego.cruz', phone: '+63 921 777 8899' },
    jersey_number: '1',
  },
  {
    athlete_id: 'ath_disc_07',
    full_name: 'Elena Rodriguez',
    province: 'Naga City',
    recruitment_status: 'Available',
    position_tag: 'PG',
    sport_category: 'BASKETBALL',
    biometrics: { height_ft: `5'9"`, weight_lbs: '145 lbs', wingspan_ft: `5'11"` },
    stats: { ppg: 21.0, rpg: 5.1, ast: 7.5, fg_pct: 49 },
    calculated_per: 30.8,
    efficiency_pct: 86,
    contact_info: { email: 'elena@atleta.ph', facebook: 'fb.com/elena.rodriguez', phone: '+63 922 999 0011' },
    jersey_number: '11',
  },
  {
    athlete_id: 'ath_disc_08',
    full_name: 'Kaleb Rossi',
    province: 'Albay',
    recruitment_status: 'Available',
    position_tag: 'TRACK AND FIELD',
    sport_category: 'TRACK AND FIELD',
    biometrics: { height_ft: `6'1"`, weight_lbs: '178 lbs', wingspan_ft: `6'2"` },
    stats: { times_100m: '10.6s', times_200m: '21.5s', times_400m: '48.2s' },
    calculated_per: 29.4,
    efficiency_pct: 81,
    contact_info: { email: 'kaleb@atleta.ph', facebook: 'fb.com/kaleb.rossi', phone: '+63 923 111 4477' },
    jersey_number: '7',
  },
  {
    athlete_id: 'ath_disc_09',
    full_name: 'Dominic Hayes',
    province: 'Camarines Sur',
    recruitment_status: 'Available',
    position_tag: 'SF',
    sport_category: 'BASKETBALL',
    biometrics: { height_ft: `6'5"`, weight_lbs: '205 lbs', wingspan_ft: `6'8"` },
    stats: { ppg: 18.5, rpg: 8.5, ast: 6.2, fg_pct: 44 },
    calculated_per: 27.9,
    efficiency_pct: 78,
    contact_info: { email: 'dominic@atleta.ph', facebook: 'fb.com/dominic.hayes', phone: '+63 924 333 8811' },
    jersey_number: '33',
  },
  {
    athlete_id: 'ath_disc_10',
    full_name: 'Sienna Reyes',
    province: 'Naga City',
    recruitment_status: 'Available',
    position_tag: 'SWIMMING',
    sport_category: 'SWIMMING',
    biometrics: { height_ft: `5'8"`, weight_lbs: '138 lbs', wingspan_ft: `5'10"` },
    stats: { times_100m: '49.1s', times_50m_free: '22.5s' },
    calculated_per: 28.9,
    efficiency_pct: 82,
    contact_info: { email: 'sienna@atleta.ph', facebook: 'fb.com/sienna.reyes', phone: '+63 925 555 9922' },
    jersey_number: '4',
  },
];

const INITIAL_PROPOSALS: ScoutingProposalItem[] = [
  {
    scout_id: 'scout_01',
    athlete_id: 'ath_disc_03',
    athlete_name: 'Marcus Thorne',
    sport_category: 'Basketball',
    offer_status: 'ACCEPTED',
    date_added_relative: 'Added 2 days ago',
    created_at: '2026-08-11',
  },
  {
    scout_id: 'scout_02',
    athlete_id: 'ath_disc_04',
    athlete_name: 'Gabriel Santos',
    sport_category: 'Track & Field',
    offer_status: 'PENDING',
    date_added_relative: 'Added 5 days ago',
    created_at: '2026-08-08',
  },
  {
    scout_id: 'scout_03',
    athlete_id: 'ath_disc_06',
    athlete_name: 'Diego Cruz',
    sport_category: 'Swimming',
    offer_status: 'DECLINED',
    date_added_relative: 'Added 1 week ago',
    created_at: '2026-08-06',
  },
];

const INITIAL_TEAMS: DiscoveryTeamItem[] = [
  {
    team_id: 'disc_team_01',
    team_name: 'Camarines Sur Panthers',
    sport_category: 'BASKETBALL',
    division_tag: 'BASKETBALL • DIVISION I',
    description: 'Elite-level basketball program focused on advanced defensive transitions and high-precision shooting drills. Recruiting for the summer season.',
    head_coach: 'Joseph Alaba',
    season_record: '2025-26 | 14 - 2',
    roster: INITIAL_ATHLETES.filter((a) => a.sport_category === 'BASKETBALL'),
  },
  {
    team_id: 'disc_team_02',
    team_name: 'Bicol Velocity Track',
    sport_category: 'TRACK AND FIELD',
    division_tag: 'TRACK AND FIELD • REGIONAL',
    description: 'Specializing in short-distance sprints and relay optimization around the Naga City athletic complex. High-performance data tracking included.',
    head_coach: 'Joseph Alaba',
    season_record: '2025-26 | 12 - 3',
    roster: INITIAL_ATHLETES.filter((a) => a.sport_category === 'TRACK AND FIELD'),
  },
  {
    team_id: 'disc_team_03',
    team_name: 'Naga City Swimmers',
    sport_category: 'SWIMMING',
    division_tag: 'SWIMMING • YOUTH LEAGUE',
    description: 'Specialize in stroke efficiency and form optimization for competitive age-group swimmers. Weekly technique workshops and video analysis.',
    head_coach: 'David Brunson',
    season_record: '2025-26 | 18 - 1',
    roster: INITIAL_ATHLETES.filter((a) => a.sport_category === 'SWIMMING'),
  },
  {
    team_id: 'disc_team_04',
    team_name: 'Bicol Tritons Swim Club',
    sport_category: 'SWIMMING',
    division_tag: 'SWIMMING • DIVISION I',
    description: 'Premier competitive swimming team specializing in 50m and 100m freestyle sprint events and medley relays. Underwater motion tracking included.',
    head_coach: 'Elena Vance',
    season_record: '2025-26 | 16 - 2',
    roster: INITIAL_ATHLETES.filter((a) => a.sport_category === 'SWIMMING'),
  },
  {
    team_id: 'disc_team_05',
    team_name: 'Camarines Blue Marlins',
    sport_category: 'SWIMMING',
    division_tag: 'SWIMMING • VARSITY LEAGUE',
    description: 'Championship-winning aquatics squad training at the Metro Aquatics Arena. Focused on backstroke and butterfly technique refinement.',
    head_coach: 'Marcus Thorne',
    season_record: '2025-26 | 14 - 4',
    roster: INITIAL_ATHLETES.filter((a) => a.sport_category === 'SWIMMING'),
  },
];

const INITIAL_EVENTS: DiscoveryEventItem[] = [
  {
    event_id: 'evt_01',
    event_name: 'Naga City Sports Meet 2026',
    date_range: 'OCT 20 - OCT 28, 2026',
    matches: [
      {
        match_id: 'm_01',
        sport_category: 'BASKETBALL',
        headline: 'PANTHERS VS. HAWKS',
        time_venue: '19:30 | Metro Sports Arena, Court 4',
        team1_name: 'PANTHERS',
        team2_name: 'HAWKS',
        team1_score: 84,
        team2_score: 78,
        status: 'FINAL',
        player_stats: [
          { player: 'Erick De Belen', role_team: 'Forward • Panthers', pts: 24, reb: 7, ast: 8, fg_pct: 52 },
          { player: 'Marcus Thorne', role_team: 'Guard • Panthers', pts: 19, reb: 4, ast: 6, fg_pct: 48 },
          { player: 'Julian Vance', role_team: 'Guard • Hawks', pts: 14, reb: 3, ast: 3, fg_pct: 44 },
        ],
        dynamics_data: [40, 65, 88, 70, 95, 82, 90, 60],
      },
      {
        match_id: 'm_03',
        sport_category: 'TRACK AND FIELD',
        headline: 'STRIKERS VS. TITANS',
        time_venue: '10:30 | Naga City Athletic Oval',
        team1_name: 'STRIKERS',
        team2_name: 'TITANS',
        team1_score: '40 pts',
        team2_score: '28 pts',
        status: 'FINAL',
        player_stats: [
          { player: 'Gabriel Santos', role_team: 'Sprint • Strikers', time_100m: '10.2s', time_200m: '20.9s', time_400m: '46.8s', final_time: '10.2s' },
          { player: 'Kaleb Rossi', role_team: 'Sprint • Titans', time_100m: '10.6s', time_200m: '21.5s', time_400m: '48.2s', final_time: '10.6s' },
        ],
        dynamics_data: [45, 60, 80, 95, 90, 85, 75, 70],
      },
    ],
  },
  {
    event_id: 'evt_02',
    event_name: 'Bicol Regional Swimming Meet 2026',
    date_range: 'NOV 12 - NOV 18, 2026',
    matches: [
      {
        match_id: 'm_02',
        sport_category: 'SWIMMING',
        headline: 'TRITONS VS. DOLPHINS',
        time_venue: '09:00 | Naga City Aquatic Center',
        team1_name: 'TRITONS',
        team2_name: 'DOLPHINS',
        team1_score: '3 Gold',
        team2_score: '1 Gold',
        status: 'FINAL',
        player_stats: [
          { player: 'Diego Cruz', role_team: 'Freestyle • Tritons', time_50m: '21.8s', time_100m: '47.5s', time_200m: '1m 32s', final_time: '47.5s' },
          { player: 'Mickey Mouse', role_team: 'Freestyle • Tritons', time_50m: '22.1s', time_100m: '48.2s', time_200m: '1m 34s', final_time: '48.2s' },
          { player: 'Sienna Reyes', role_team: 'Backstroke • Dolphins', time_50m: '22.5s', time_100m: '49.1s', time_200m: '1m 36s', final_time: '49.1s' },
        ],
        dynamics_data: [50, 70, 85, 90, 95, 88, 92, 80],
      },
      {
        match_id: 'm_04',
        sport_category: 'SWIMMING',
        headline: 'BLUE MARLINS VS. AQUA JAYS',
        time_venue: '14:00 | Olympic Swimming Complex',
        team1_name: 'MARLINS',
        team2_name: 'AQUA JAYS',
        team1_score: '2 Gold',
        team2_score: '2 Gold',
        status: 'FINAL',
        player_stats: [
          { player: 'Diego Cruz', role_team: 'Butterfly • Marlins', time_50m: '23.1s', time_100m: '50.4s', time_200m: '1m 40s', final_time: '50.4s' },
          { player: 'Sienna Reyes', role_team: 'Freestyle • Aqua Jays', time_50m: '22.8s', time_100m: '49.8s', time_200m: '1m 38s', final_time: '49.8s' },
        ],
        dynamics_data: [60, 75, 80, 85, 90, 95, 85, 75],
      },
    ],
  },
];

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined);

export const DiscoveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [athletes] = useState<AthleteDiscoveryItem[]>(INITIAL_ATHLETES);
  const [scoutingProposals, setScoutingProposals] = useState<ScoutingProposalItem[]>(INITIAL_PROPOSALS);
  const [teams] = useState<DiscoveryTeamItem[]>(INITIAL_TEAMS);
  const [events] = useState<DiscoveryEventItem[]>(INITIAL_EVENTS);

  const [activeTab, setActiveTab] = useState<DiscoveryTab>('PLAYERS');
  const [activeSportFilter, setActiveSportFilter] = useState<SportCategoryFilter>('BASKETBALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteDiscoveryItem | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<DiscoveryTeamItem | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<DiscoveryMatchItem | null>(null);
  const [sortRecruits, setSortRecruits] = useState<'date' | 'status'>('date');

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

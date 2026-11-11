import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs } from 'firebase/firestore';
import { db, getActiveCoachSportsOfflineFirst, getTeamsOfflineFirst } from '../../../../services/firebaseClient';
import { requestAuthenticatedJson, clearAuthMicroCache } from '../../Authentication/authShared';

// ─── Interfaces & Schemas ────────────────────────────────────────────────────
export interface Coach {
  coach_id: string;
  full_name: string;
  role_title: string;
  years_experience: string;
  quote: string;
  avatar_url?: string;
  is_verified?: boolean;
}

export interface TeamSchema {
  team_id: string;
  team_name: string;
  sport_type: string;
  managed_by_coach_id: string;
  created_at: string;
  roster_athletes: string[];
  program_type_tag?: string;
  description: string;
  region: string;
  is_my_team?: boolean;
  head_coach: Coach;
}

export interface CoachProfileSchema {
  coach_id: string;
  full_name: string;
  institution: string;
  role_title: string;
  sport?: string;
  sport_type?: string;
  avatar_url?: string;
  tags: string[];
  years_experience: string;
  core_specialties: string[];
  success_rate?: string;
  recruits_placed?: string;
  philosophy: string;
  quote: string;
  certificates: string[];
  contact_info: {
    email: string;
    facebook: string;
    phone: string;
  };
}

export interface InquirySchema {
  inquiry_id: string;
  coach_name: string;
  institution_sport: string;
  status: 'ACCEPTED' | 'PENDING' | 'DECLINED';
  updated_at_relative: string;
  sub_note?: string;
}

export interface CoachesCacheState {
  teams: TeamSchema[];
  inquiries: InquirySchema[];
  sportChips: { label: string; value: string }[];
  myCurrentTeamId: string;
  myCurrentTeamName: string;
  myJoinedTeamIds: string[];
  lastFetched: number;
}

export const COACHES_CACHE_KEY = 'atleta_athlete_coaches_snapshot_cache_v3';
export const COACHES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL (Stale-While-Revalidate)

export const DEFAULT_SPORT_CHIPS: { label: string; value: string }[] = [
  { label: 'ALL', value: 'ALL' },
];

let coachesMemoryCache: CoachesCacheState | null = null;

export function clearCoachesMemoryCache() {
  coachesMemoryCache = null;
}

export interface CoachesContextType {
  teams: TeamSchema[];
  inquiries: InquirySchema[];
  sportChips: { label: string; value: string }[];
  myCurrentTeamId: string;
  myCurrentTeamName: string;
  myJoinedTeamIds: Set<string>;
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  refreshCoaches: () => Promise<void>;
  filteredTeams: TeamSchema[];
  setInquiries: React.Dispatch<React.SetStateAction<InquirySchema[]>>;
  addInquiry: (inquiry: InquirySchema) => void;
}

export const CoachesContext = createContext<CoachesContextType | undefined>(undefined);

const normSport = (s: string) => (s || '').toUpperCase().replace(/&/g, 'AND').replace(/\s+/g, '').trim();

export const CoachesProvider: React.FC<{ children: React.ReactNode; athleteCategory?: string }> = ({
  children,
  athleteCategory,
}) => {
  const [teams, setTeams] = useState<TeamSchema[]>(coachesMemoryCache?.teams || []);
  const [inquiries, setInquiries] = useState<InquirySchema[]>(coachesMemoryCache?.inquiries || []);
  const [sportChips, setSportChips] = useState<{ label: string; value: string }[]>(
    coachesMemoryCache?.sportChips && coachesMemoryCache.sportChips.length > 1
      ? coachesMemoryCache.sportChips
      : DEFAULT_SPORT_CHIPS
  );
  const [myCurrentTeamId, setMyCurrentTeamId] = useState<string>(coachesMemoryCache?.myCurrentTeamId || '');
  const [myCurrentTeamName, setMyCurrentTeamName] = useState<string>(coachesMemoryCache?.myCurrentTeamName || '');
  const [myJoinedTeamIds, setMyJoinedTeamIds] = useState<Set<string>>(
    new Set(coachesMemoryCache?.myJoinedTeamIds || [])
  );
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(
    !coachesMemoryCache?.teams || coachesMemoryCache.teams.length === 0
  );

  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  const sportChipsRef = useRef(sportChips);
  sportChipsRef.current = sportChips;

  // 1. Instant persistent cache hydration on mount (<10ms)
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(COACHES_CACHE_KEY)
      .then((raw) => {
        if (!isMounted || !raw) return;
        try {
          const cached: CoachesCacheState = JSON.parse(raw);
          if (Array.isArray(cached.teams) && cached.teams.length > 0) {
            setTeams((prev) => (prev.length === 0 ? cached.teams : prev));
            setIsLoading(false);
          }
          if (Array.isArray(cached.inquiries) && cached.inquiries.length > 0) {
            setInquiries((prev) => (prev.length === 0 ? cached.inquiries : prev));
          }
          if (Array.isArray(cached.sportChips) && cached.sportChips.length > 1) {
            setSportChips((prev) => (prev.length <= 1 ? cached.sportChips : prev));
          }
          if (cached.myCurrentTeamId) {
            setMyCurrentTeamId((prev) => prev || cached.myCurrentTeamId);
          }
          if (cached.myCurrentTeamName) {
            setMyCurrentTeamName((prev) => prev || cached.myCurrentTeamName);
          }
          if (Array.isArray(cached.myJoinedTeamIds) && cached.myJoinedTeamIds.length > 0) {
            setMyJoinedTeamIds((prev) => (prev.size === 0 ? new Set(cached.myJoinedTeamIds) : prev));
          }

          if (!coachesMemoryCache && Array.isArray(cached.teams) && cached.teams.length > 0) {
            coachesMemoryCache = {
              teams: cached.teams,
              inquiries: cached.inquiries || [],
              sportChips: cached.sportChips || DEFAULT_SPORT_CHIPS,
              myCurrentTeamId: cached.myCurrentTeamId || '',
              myCurrentTeamName: cached.myCurrentTeamName || '',
              myJoinedTeamIds: cached.myJoinedTeamIds || [],
              lastFetched: cached.lastFetched || Date.now(),
            };
          }
        } catch (_) {}
      })
      .catch(() => null);

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch dynamic sports list offline-first
  useEffect(() => {
    let isMounted = true;
    getActiveCoachSportsOfflineFirst()
      .then((sports: string[]) => {
        if (!isMounted || !Array.isArray(sports) || sports.length === 0) return;
        const seen = new Set<string>(['ALL']);
        const mapped: { label: string; value: string }[] = [{ label: 'ALL', value: 'ALL' }];
        sports.forEach((raw: string) => {
          const upper = String(raw).toUpperCase().trim();
          if (!upper || upper === 'ALL' || seen.has(upper)) return;
          seen.add(upper);
          mapped.push({ label: upper, value: upper });
        });
        if (mapped.length > 1) {
          setSportChips((prev) => {
            const currentLabels = new Set(prev.map((c) => c.value));
            const hasNew = mapped.some((m) => !currentLabels.has(m.value));
            return hasNew || prev.length <= 1 ? mapped : prev;
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Stale-While-Revalidate data loader
  const loadCoachesData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      const hasCached = (coachesMemoryCache?.teams && coachesMemoryCache.teams.length > 0) || teamsRef.current.length > 0;
      if (!hasCached && !forceRefresh) {
        setIsLoading(true);
      }

      if (forceRefresh) {
        clearCoachesMemoryCache();
        clearAuthMicroCache();
      }

      const [offlineTeams, teamsRes, inquiriesRes, myTeamRes, activeCoachSports]: [any, any, any, any, string[]] = await Promise.all([
        getTeamsOfflineFirst(forceRefresh).catch(() => []),
        requestAuthenticatedJson('/teams?all=true', 'GET', undefined, forceRefresh).catch(() => null),
        requestAuthenticatedJson('/inquiries', 'GET', undefined, forceRefresh).catch(() => null),
        requestAuthenticatedJson('/athletes/team', 'GET', undefined, forceRefresh).catch(() => null),
        getActiveCoachSportsOfflineFirst(forceRefresh).catch(() => []),
      ]);

      const currentTeamId = myTeamRes?.team?.team_id || myTeamRes?.team_id || '';
      const currentTeamName = myTeamRes?.team?.team_name || myTeamRes?.team_name || '';
      setMyCurrentTeamId(currentTeamId);
      setMyCurrentTeamName(currentTeamName);

      const joinedSet = new Set<string>();
      if (currentTeamId) joinedSet.add(currentTeamId);

      // Collect from multiple assigned teams
      const assignedArr = myTeamRes?.assigned_teams || myTeamRes?.teams || [];
      if (Array.isArray(assignedArr)) {
        assignedArr.forEach((t: any) => {
          const tid = t.team_id || t.id;
          if (tid) joinedSet.add(tid);
        });
      }

      // Collect from accepted inquiries
      const rawInq = inquiriesRes?.inquiries || (Array.isArray(inquiriesRes) ? inquiriesRes : []);
      if (Array.isArray(rawInq)) {
        rawInq.forEach((inq: any) => {
          const st = (inq.offer_status || inq.status || '').toUpperCase();
          if (st === 'ACCEPTED' || st === 'JOINED') {
            const tid = inq.team_id || inq.scout_id;
            if (tid) joinedSet.add(tid);
          }
        });
      }
      setMyJoinedTeamIds(joinedSet);

      const restTeams = teamsRes?.teams || (Array.isArray(teamsRes) ? teamsRes : []);
      let rawList = [...restTeams, ...(Array.isArray(offlineTeams) ? offlineTeams : [])];
      if (rawList.length === 0) {
        try {
          const snap = await getDocs(collection(db, 'Teams'));
          if (!snap.empty) {
            rawList = snap.docs.map((d) => ({ team_id: d.id, id: d.id, ...d.data() }));
          }
        } catch (_) {}
      }

      const mergedMap = new Map<string, any>();
      rawList.forEach((item: any) => {
        const tid = item.team_id || item.id;
        if (!tid) return;
        const existing = mergedMap.get(tid);
        if (!existing) {
          mergedMap.set(tid, item);
        } else {
          const existingCoach = existing.coach_name || existing.head_coach?.full_name;
          const itemCoach = item.coach_name || item.head_coach?.full_name;
          const isExistingPlaceholder =
            !existingCoach ||
            existingCoach.trim().toLowerCase() === 'coach' ||
            existingCoach.trim().toLowerCase() === 'head coach';
          const isItemReal =
            itemCoach &&
            itemCoach.trim().toLowerCase() !== 'coach' &&
            itemCoach.trim().toLowerCase() !== 'head coach';
          if (isExistingPlaceholder && isItemReal) {
            mergedMap.set(tid, { ...existing, ...item });
          } else {
            mergedMap.set(tid, { ...item, ...existing });
          }
        }
      });
      const rawTeams = Array.from(mergedMap.values());

      const mappedTeams: TeamSchema[] = rawTeams.map((t: any, idx: number) => {
        const isMyTeam = Boolean(
          (currentTeamId && (t.team_id === currentTeamId || t.id === currentTeamId)) ||
          (currentTeamName && t.team_name && t.team_name.trim().toLowerCase() === currentTeamName.trim().toLowerCase())
        );
        const coachName = (
          t.coach_name ||
          t.head_coach?.full_name ||
          (t.coach_first_name ? `${t.coach_first_name} ${t.coach_last_name || ''}`.trim() : '') ||
          'Head Coach'
        );
        return {
          team_id: t.team_id || t.id || `team_${idx}`,
          team_name: t.team_name || 'Varsity Team',
          sport_type: (t.sport_type || 'BASKETBALL').toUpperCase() as any,
          managed_by_coach_id: t.coach_id || t.managed_by_coach_id || '',
          created_at: t.timestamp || new Date().toISOString(),
          roster_athletes: Array(t.athlete_count || (Array.isArray(t.roster_list) ? t.roster_list.length : 0)).fill('ath_uuid'),
          program_type_tag: `${(t.division || 'VARSITY').toUpperCase()} PROGRAM`,
          description: t.description || t.mission_statement || `Official ${t.sport_type || 'Sports'} program in ${t.region || t.province || 'Camarines Sur'}.`,
          region: t.region || t.province || 'Camarines Sur',
          is_my_team: isMyTeam,
          head_coach: {
            coach_id: t.coach_id || t.managed_by_coach_id || '',
            full_name: (coachName.trim().toLowerCase() !== 'coach' ? coachName : 'Head Coach').toUpperCase(),
            role_title: t.head_coach?.role_title || `${(t.sport_type || 'Varsity').toUpperCase()} HEAD COACH`,
            years_experience: t.years_experience ? `${t.years_experience} Years` : (t.head_coach?.years_experience || 'Experienced Coach'),
            quote: t.quote || t.head_coach?.quote || 'Dedicated to athletic excellence and player development.',
          },
        };
      });

      if (mappedTeams.length > 0) {
        setTeams(mappedTeams);
      }

      // Dynamic sports chips from active coach sports & managed teams
      const distinctSports = new Set<string>();
      if (Array.isArray(activeCoachSports)) {
        activeCoachSports.forEach((s) => {
          const norm = String(s).toUpperCase().replace(/&/g, 'AND').replace(/\s+/g, ' ').trim();
          if (norm && norm !== 'ALL') distinctSports.add(norm);
        });
      }
      mappedTeams.forEach((t) => {
        const hasCoach = t.managed_by_coach_id || (t.head_coach?.full_name && t.head_coach.full_name !== 'HEAD COACH');
        if (hasCoach && t.sport_type) {
          const norm = String(t.sport_type).toUpperCase().replace(/&/g, 'AND').replace(/\s+/g, ' ').trim();
          if (norm && norm !== 'ALL') distinctSports.add(norm);
        }
      });

      let finalSportChips = sportChipsRef.current;
      if (distinctSports.size > 0) {
        const sorted = Array.from(distinctSports).sort();
        const mapped: { label: string; value: string }[] = [{ label: 'ALL', value: 'ALL' }];
        sorted.forEach((upper) => {
          mapped.push({ label: upper, value: upper });
        });
        finalSportChips = mapped;
        setSportChips(mapped);
      }

      // Map inquiries
      const rawInquiries = inquiriesRes?.inquiries || (Array.isArray(inquiriesRes) ? inquiriesRes : []);
      let mappedInquiries: InquirySchema[] = [];
      if (Array.isArray(rawInquiries) && rawInquiries.length > 0) {
        mappedInquiries = rawInquiries.map((inq: any, idx: number) => {
          const rawStatus = (inq.offer_status || inq.status || 'PENDING').toUpperCase();
          const mappedStatus = rawStatus.includes('ACCEPT') ? 'ACCEPTED' : rawStatus.includes('DECLIN') ? 'DECLINED' : 'PENDING';
          return {
            inquiry_id: inq.scout_id || inq.inquiry_id || `inq_${idx}`,
            coach_name: inq.coach_name || 'Coach',
            institution_sport: `${inq.current_institution || inq.institution || 'Varsity'} • ${inq.sport_type || inq.role_title || 'Basketball'}`,
            status: mappedStatus as any,
            updated_at_relative: `Sent: ${inq.date_initiated ? new Date(inq.date_initiated).toLocaleDateString() : 'Recently'}`,
            sub_note: inq.decline_reason || inq.sub_note || undefined,
          };
        });
        setInquiries(mappedInquiries);
      } else {
        const cachedStr = await AsyncStorage.getItem('atleta_offline_inquiries_cache').catch(() => null);
        if (cachedStr) {
          try {
            const cachedItems: InquirySchema[] = JSON.parse(cachedStr);
            if (Array.isArray(cachedItems) && cachedItems.length > 0) {
              mappedInquiries = cachedItems;
              setInquiries(cachedItems);
            }
          } catch (_) {}
        }
      }

      // Update in-memory & persistent cache snapshot (0ms instant access on subsequent visits)
      const snapshot: CoachesCacheState = {
        teams: mappedTeams.length > 0 ? mappedTeams : (coachesMemoryCache?.teams || []),
        inquiries: mappedInquiries.length > 0 ? mappedInquiries : (coachesMemoryCache?.inquiries || []),
        sportChips: finalSportChips,
        myCurrentTeamId: currentTeamId,
        myCurrentTeamName: currentTeamName,
        myJoinedTeamIds: Array.from(joinedSet),
        lastFetched: Date.now(),
      };
      coachesMemoryCache = snapshot;
      AsyncStorage.setItem(COACHES_CACHE_KEY, JSON.stringify(snapshot)).catch(() => null);
    } catch (err) {
      console.warn('loadCoachesData error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 4. Stale-While-Revalidate execution on mount
  useEffect(() => {
    if (coachesMemoryCache && Date.now() - coachesMemoryCache.lastFetched < COACHES_CACHE_TTL_MS) {
      return;
    }
    loadCoachesData(false);
  }, [loadCoachesData]);

  // 5. Add single inquiry optimistically
  const addInquiry = useCallback((newInquiry: InquirySchema) => {
    setInquiries((prev) => {
      const updated = [newInquiry, ...prev.filter((i) => i.inquiry_id !== newInquiry.inquiry_id)];
      if (coachesMemoryCache) {
        coachesMemoryCache.inquiries = updated;
      }
      return updated;
    });
  }, []);

  // 6. Filtered teams memoization
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      // Hide teams the athlete has already joined
      if (
        team.is_my_team ||
        myJoinedTeamIds.has(team.team_id) ||
        myJoinedTeamIds.has((team as any).id) ||
        (myCurrentTeamId && (team.team_id === myCurrentTeamId || (team as any).id === myCurrentTeamId)) ||
        (myCurrentTeamName && team.team_name && team.team_name.trim().toLowerCase() === myCurrentTeamName.trim().toLowerCase())
      ) {
        return false;
      }

      const matchesSearch =
        team.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.sport_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.head_coach.full_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSport = !selectedSport || selectedSport === 'ALL'
        ? true
        : normSport(team.sport_type) === normSport(selectedSport) ||
          normSport(team.sport_type).includes(normSport(selectedSport)) ||
          normSport(selectedSport).includes(normSport(team.sport_type));
      return matchesSearch && matchesSport;
    });
  }, [teams, myJoinedTeamIds, myCurrentTeamId, myCurrentTeamName, searchQuery, selectedSport]);

  const value = useMemo(
    () => ({
      teams,
      inquiries,
      sportChips,
      myCurrentTeamId,
      myCurrentTeamName,
      myJoinedTeamIds,
      selectedSport,
      setSelectedSport,
      searchQuery,
      setSearchQuery,
      isLoading,
      refreshCoaches: () => loadCoachesData(true),
      filteredTeams,
      setInquiries,
      addInquiry,
    }),
    [
      teams,
      inquiries,
      sportChips,
      myCurrentTeamId,
      myCurrentTeamName,
      myJoinedTeamIds,
      selectedSport,
      searchQuery,
      isLoading,
      loadCoachesData,
      filteredTeams,
      addInquiry,
    ]
  );

  return <CoachesContext.Provider value={value}>{children}</CoachesContext.Provider>;
};

export const useCoaches = () => {
  const context = useContext(CoachesContext);
  if (!context) {
    throw new Error('useCoaches must be used within a CoachesProvider');
  }
  return context;
};


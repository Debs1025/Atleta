import React, { createContext, useContext, useState, ReactNode } from "react";
import { MatchLogSessionState, SportCategory, AthleteRosterItem } from "./types";

interface MatchSessionContextType {
  session: MatchLogSessionState;
  setSportCategory: (sport: SportCategory) => void;
  setSessionDetails: (details: Partial<MatchLogSessionState>) => void;
  addAthleteToRoster: (athlete: AthleteRosterItem) => void;
  removeAthleteFromRoster: (athleteId: string) => void;
  toggleAthleteActiveStatus: (athleteId: string) => void;
  updateBasketballStats: (
    athleteId: string,
    stat: keyof NonNullable<AthleteRosterItem["basketball_stats"]>,
    delta: number
  ) => void;
  updateTimingStats: (
    athleteId: string,
    stats: Partial<NonNullable<AthleteRosterItem["timing_stats"]>>
  ) => void;
  resetSession: () => void;
}

// Sample data for testing
const INITIAL_ROSTER: AthleteRosterItem[] = [
  {
    athlete_id: "ath_101",
    jersey_number: "12",
    last_name: "RIVERA",
    full_name: "MARCUS RIVERA",
    position_or_event: "Point Guard",
    is_active_on_field: true,
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
  },
  {
    athlete_id: "ath_102",
    jersey_number: "24",
    last_name: "DELA CRUZ",
    full_name: "JUAN DELA CRUZ",
    position_or_event: "Forward",
    is_active_on_field: true,
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
    timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
  },
];

const DEFAULT_SESSION: MatchLogSessionState = {
  match_id: `match_${Date.now()}`,
  sport_type: "BASKETBALL",
  team_name: "Camarines Sur Panthers",
  opponent_team_name: "Metro Warriors",
  game_name: "Regional Finals 2026",
  game_type: "Tournament",
  game_result: "Win",
  date_time: "",
  location: "",
  notes: "",
  active_roster: [],
  bench_roster: [],
};

const MatchSessionContext = createContext<MatchSessionContextType | undefined>(undefined);

export const MatchSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<MatchLogSessionState>(DEFAULT_SESSION);

  const setSportCategory = (sport_type: SportCategory) => {
    setSession((prev) => ({ ...prev, sport_type }));
  };

  const setSessionDetails = (details: Partial<MatchLogSessionState>) => {
    setSession((prev) => ({ ...prev, ...details }));
  };

  const addAthleteToRoster = (athlete: AthleteRosterItem) => {
    setSession((prev) => {
      const exists = prev.active_roster.some((a) => a.athlete_id === athlete.athlete_id);
      if (exists) return prev;
      return {
        ...prev,
        active_roster: [...prev.active_roster, athlete],
      };
    });
  };

  const removeAthleteFromRoster = (athleteId: string) => {
    setSession((prev) => ({
      ...prev,
      active_roster: prev.active_roster.filter((a) => a.athlete_id !== athleteId),
      bench_roster: prev.bench_roster.filter((a) => a.athlete_id !== athleteId),
    }));
  };

  const toggleAthleteActiveStatus = (athleteId: string) => {
    setSession((prev) => {
      const isActiveInActiveRoster = prev.active_roster.some((a) => a.athlete_id === athleteId);
      if (isActiveInActiveRoster) {
        const item = prev.active_roster.find((a) => a.athlete_id === athleteId);
        if (!item) return prev;
        return {
          ...prev,
          active_roster: prev.active_roster.filter((a) => a.athlete_id !== athleteId),
          bench_roster: [...prev.bench_roster, { ...item, is_active_on_field: false }],
        };
      } else {
        const item = prev.bench_roster.find((a) => a.athlete_id === athleteId);
        if (!item) return prev;
        return {
          ...prev,
          bench_roster: prev.bench_roster.filter((a) => a.athlete_id !== athleteId),
          active_roster: [...prev.active_roster, { ...item, is_active_on_field: true }],
        };
      }
    });
  };

  const updateBasketballStats = (
    athleteId: string,
    statKey: keyof NonNullable<AthleteRosterItem["basketball_stats"]>,
    delta: number
  ) => {
    setSession((prev) => {
      const updateList = (list: AthleteRosterItem[]) =>
        list.map((item) => {
          if (item.athlete_id !== athleteId) return item;
          const currentStats = item.basketball_stats || { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 };
          const newValue = Math.max(0, (currentStats[statKey] || 0) + delta);
          return {
            ...item,
            basketball_stats: {
              ...currentStats,
              [statKey]: newValue,
            },
          };
        });

      return {
        ...prev,
        active_roster: updateList(prev.active_roster),
        bench_roster: updateList(prev.bench_roster),
      };
    });
  };

  const updateTimingStats = (
    athleteId: string,
    stats: Partial<NonNullable<AthleteRosterItem["timing_stats"]>>
  ) => {
    setSession((prev) => {
      const updateList = (list: AthleteRosterItem[]) =>
        list.map((item) => {
          if (item.athlete_id !== athleteId) return item;
          const currentStats = item.timing_stats || {
            timer_seconds: 0,
            formatted_time: "00:00.00",
            distance_meters: 100,
            split_times: [],
            is_foul_dq: false,
          };
          return {
            ...item,
            timing_stats: {
              ...currentStats,
              ...stats,
            },
          };
        });

      return {
        ...prev,
        active_roster: updateList(prev.active_roster),
        bench_roster: updateList(prev.bench_roster),
      };
    });
  };

  const resetSession = () => {
    setSession({
      ...DEFAULT_SESSION,
      match_id: `match_${Date.now()}`,
    });
  };

  return (
    <MatchSessionContext.Provider
      value={{
        session,
        setSportCategory,
        setSessionDetails,
        addAthleteToRoster,
        removeAthleteFromRoster,
        toggleAthleteActiveStatus,
        updateBasketballStats,
        updateTimingStats,
        resetSession,
      }}
    >
      {children}
    </MatchSessionContext.Provider>
  );
};

export const useMatchSession = () => {
  const context = useContext(MatchSessionContext);
  if (!context) {
    throw new Error("useMatchSession must be used within a MatchSessionProvider");
  }
  return context;
};

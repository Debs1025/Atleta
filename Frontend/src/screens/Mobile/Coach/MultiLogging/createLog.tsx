import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "./styles/createLog";
import { SportCategory, AthleteRosterItem, MatchLogSessionState, SportConfigurationItem } from "./types";
import { useMatchSession } from "./MatchSessionContext";
import { API_BASE, getStoredAuthToken } from "../../Authentication/authShared";
import { getAthletesOfflineFirst, getSportsOfflineFirst } from "../../../../services/firebaseClient";

declare const process: any;

interface CreateLogProps {
  initialAthletes?: any[];
  onBack?: () => void;
  onStartLogging?: (session: MatchLogSessionState) => void;
}

const matchesSport = (athleteSport?: string, athletePosition?: string, targetSport?: string): boolean => {
  if (!targetSport || targetSport.toUpperCase() === "ALL") return true;
  const target = targetSport.toUpperCase().trim();
  const sport = (athleteSport || "").toUpperCase().trim();
  const pos = (athletePosition || "").toUpperCase().trim();

  if (target.includes("BASKET")) {
    if (sport.includes("BASKET")) return true;
    if (["POINT GUARD", "SHOOTING GUARD", "SMALL FORWARD", "POWER FORWARD", "CENTER", "GUARD", "FORWARD"].some((p) => pos.includes(p))) return true;
    return !sport;
  }

  if (target.includes("SWIM")) {
    if (sport.includes("SWIM")) return true;
    if (["FREESTYLE", "BUTTERFLY", "BREASTSTROKE", "BACKSTROKE", "MEDLEY", "SWIMMER", "50M", "100M", "200M"].some((p) => pos.includes(p))) return true;
    return false;
  }

  if (target.includes("TRACK") || target.includes("FIELD")) {
    if (sport.includes("TRACK") || sport.includes("FIELD")) return true;
    if (["SPRINT", "HURDLES", "RELAY", "LONG JUMP", "HIGH JUMP", "JAVELIN", "SHOT PUT", "DISCUS", "RUNNER", "100M SPRINT"].some((p) => pos.includes(p))) return true;
    return false;
  }

  if (target.includes("VOLLEY")) {
    if (sport.includes("VOLLEY")) return true;
    if (["SETTER", "OUTSIDE HITTER", "OPPOSITE HITTER", "MIDDLE BLOCKER", "LIBERO", "DEFENSIVE SPECIALIST", "SPIKER"].some((p) => pos.includes(p))) return true;
    return false;
  }

  if (target.includes("PICKLE")) {
    if (sport.includes("PICKLE")) return true;
    if (["SINGLES", "DOUBLES", "DINKER", "RACKET"].some((p) => pos.includes(p))) return true;
    return false;
  }

  return sport === target || sport.includes(target) || target.includes(sport);
};

export interface LocationResult {
  place_id: string;
  name: string;
  address: string;
  category?: string;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
export const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
export const TIME_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
export const TIME_HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const POPULAR_SPORTS_VENUES: LocationResult[] = [
  {
    place_id: "araneta_coliseum",
    name: "Smart Araneta Coliseum",
    address: "General Roxas Ave, Cubao, Quezon City, Metro Manila",
    category: "Indoor Arena",
  },
  {
    place_id: "moa_arena",
    name: "SM Mall of Asia Arena",
    address: "J.W. Diokno Blvd, Pasay City, Metro Manila",
    category: "Indoor Arena",
  },
  {
    place_id: "philsports_arena",
    name: "PhilSports Arena (ULTRA)",
    address: "Meralco Ave, Pasig City, Metro Manila",
    category: "Sports Complex",
  },
  {
    place_id: "rizal_memorial",
    name: "Rizal Memorial Coliseum & Stadium",
    address: "Pablo Ocampo St, Malate, Manila, Metro Manila",
    category: "Sports Complex",
  },
  {
    place_id: "ninoy_aquino_stadium",
    name: "Ninoy Aquino Stadium",
    address: "Rizal Memorial Sports Complex, Malate, Manila",
    category: "Indoor Stadium",
  },
  {
    place_id: "filoil_centre",
    name: "Filoil EcoOil Centre",
    address: "Col. Bonny Serrano Ave, San Juan, Metro Manila",
    category: "Sports Arena",
  },
  {
    place_id: "camsur_sports_complex",
    name: "Camarines Sur Sports Complex",
    address: "Cadlan, Pili, Camarines Sur, Bicol Region",
    category: "Provincial Sports Complex",
  },
  {
    place_id: "unc_sports_palace",
    name: "University of Nueva Caceres Sports Palace",
    address: "J. Hernandez Ave, Naga City, Camarines Sur",
    category: "University Gymnasium",
  },
  {
    place_id: "ateneo_de_naga_gym",
    name: "Ateneo de Naga University Gym & Arrupe Hall",
    address: "Ateneo Ave, Naga City, Camarines Sur",
    category: "University Arena",
  },
  {
    place_id: "naga_coliseum",
    name: "Naga City Coliseum",
    address: "CBD II, Triangulo, Naga City, Camarines Sur",
    category: "City Coliseum",
  },
  {
    place_id: "albay_astrodome",
    name: "Albay Astrodome",
    address: "Rizal St, Old Albay District, Legazpi City, Albay",
    category: "Provincial Astrodome",
  },
  {
    place_id: "ynares_center",
    name: "Ynares Center",
    address: "Circumferential Road, Antipolo, Rizal",
    category: "Indoor Arena",
  },
];

export const searchVenuesOnline = async (query: string): Promise<LocationResult[]> => {
  const q = query.trim();
  if (!q) return POPULAR_SPORTS_VENUES;

  const localMatches = POPULAR_SPORTS_VENUES.filter(
    (v) =>
      v.name.toLowerCase().includes(q.toLowerCase()) ||
      v.address.toLowerCase().includes(q.toLowerCase()) ||
      (v.category && v.category.toLowerCase().includes(q.toLowerCase()))
  );

  const googleApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    "";

  let externalResults: LocationResult[] = [];

  if (googleApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        q
      )}&components=country:ph&key=${googleApiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.predictions && Array.isArray(data.predictions)) {
        externalResults = data.predictions.map((p: any) => ({
          place_id: p.place_id,
          name: p.structured_formatting?.main_text || p.description,
          address: p.structured_formatting?.secondary_text || p.description,
          category: "Google Maps Venue",
        }));
      }
    } catch (e) {
      console.warn("Google Maps Places API error:", e);
    }
  }

  // Fallback to OpenStreetMap Nominatim for live geocoding anywhere without requiring API key
  if (externalResults.length === 0) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ph&limit=10&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(nomUrl, {
        headers: {
          "User-Agent": "AtletaCoachApp/1.0",
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        externalResults = data.map((item: any) => {
          const mainName = item.name || item.display_name.split(",")[0];
          return {
            place_id: `nom_${item.place_id || item.osm_id}`,
            name: mainName,
            address: item.display_name,
            category: item.type ? `${item.type.charAt(0).toUpperCase() + item.type.slice(1)}` : "Location",
          };
        });
      }
    } catch (err) {
      // ignore
    }
  }

  const combined = [...localMatches];
  const seen = new Set(localMatches.map((m) => m.name.toLowerCase()));
  for (const ext of externalResults) {
    if (!seen.has(ext.name.toLowerCase())) {
      seen.add(ext.name.toLowerCase());
      combined.push(ext);
    }
  }

  return combined;
};

export function CreateLogScreen({ initialAthletes, onBack, onStartLogging }: CreateLogProps) {
  const insets = useSafeAreaInsets();
  const {
    session,
    setSportCategory,
    setSessionDetails,
    addAthleteToRoster,
    removeAthleteFromRoster,
  } = useMatchSession();

  const [dbAthletes, setDbAthletes] = useState<AthleteRosterItem[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [sports, setSports] = useState<SportConfigurationItem[]>([]);
  const [loadingSports, setLoadingSports] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);

  // Interactive UI Pickers State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Calendar State
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // Time Picker State
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<"AM" | "PM">("PM");

  // Location Search State
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<LocationResult[]>(POPULAR_SPORTS_VENUES);
  const [searchingLocations, setSearchingLocations] = useState(false);

  const fetchSportsFromDb = useCallback(async () => {
    try {
      setLoadingSports(true);
      const token = await getStoredAuthToken();
      let sportsList: SportConfigurationItem[] = [];

      // 1. Live backend API query to fetch active sports configured by system admin
      try {
        const res = await fetch(`${API_BASE}/sports`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          const fetched = Array.isArray(data?.sports)
            ? data.sports
            : Array.isArray(data)
            ? data
            : [];
          if (fetched.length > 0) {
            sportsList = fetched;
          }
        }
      } catch (netErr) {
        // Network or timeout
      }

      // 2. Offline-first fallback to local Firestore cache or AsyncStorage
      if (sportsList.length === 0) {
        const offlineSports = await getSportsOfflineFirst();
        if (offlineSports && offlineSports.length > 0) {
          sportsList = offlineSports;
        }
      }

      // 3. Fallback defaults if completely empty
      if (sportsList.length === 0) {
        sportsList = [
          { sport_id: "sport_basketball", sport_name: "Basketball", short_identifier: "BBALL", is_active: true },
          { sport_id: "sport_swimming", sport_name: "Swimming", short_identifier: "SWIM", is_active: true },
          { sport_id: "sport_track_field", sport_name: "Track & Field", short_identifier: "TF", is_active: true },
        ];
      }

      const seen = new Set<string>();
      const uniqueSports: SportConfigurationItem[] = [];
      for (const sp of sportsList) {
        const rawName = String(sp.sport_name || (sp as any).name || "").trim();
        if (!rawName) continue;
        const normKey = rawName.toLowerCase();
        if (seen.has(normKey)) continue;
        seen.add(normKey);
        uniqueSports.push({
          ...sp,
          sport_name: rawName,
          is_active: sp.is_active !== false,
        });
      }

      const activeSports = uniqueSports.filter((s) => s.is_active !== false);
      setSports(activeSports);

      // Auto-initialize selected sport if not currently set or valid
      if (activeSports.length > 0) {
        const currentUpper = (session.sport_type || "").toUpperCase();
        const exists = activeSports.some((s) => s.sport_name.toUpperCase() === currentUpper);
        if (!exists && !currentUpper) {
          handleSelectSport(activeSports[0].sport_name.toUpperCase());
        }
      }
    } catch (err) {
      console.warn("Could not fetch active sports from database:", err);
    } finally {
      setLoadingSports(false);
    }
  }, [session.sport_type]);

  useEffect(() => {
    fetchSportsFromDb();
  }, []);

  const renderSportIcon = (sport: SportConfigurationItem | string) => {
    const sportObj = typeof sport === "object" ? sport : { sport_name: sport };
    const sportName = sportObj.sport_name || "";
    const iconUrl =
      (sportObj as any).icon_url ||
      (sportObj as any).logo_url ||
      (sportObj as any).image_url ||
      (sportObj as any).icon;

    if (
      iconUrl &&
      typeof iconUrl === "string" &&
      (iconUrl.startsWith("http://") || iconUrl.startsWith("https://") || iconUrl.startsWith("data:"))
    ) {
      return (
        <Image
          source={{ uri: iconUrl }}
          style={{ width: 28, height: 28, borderRadius: 14 }}
          resizeMode="contain"
        />
      );
    }

    const lower = sportName.toLowerCase();
    const iconColor = "#00D2FF";

    if (lower.includes("basket")) {
      return <FontAwesome5 name="basketball-ball" size={24} color={iconColor} />;
    }
    if (lower.includes("swim") || lower.includes("water") || lower.includes("pool")) {
      return <FontAwesome5 name="swimmer" size={22} color={iconColor} />;
    }
    if (
      lower.includes("track") ||
      lower.includes("field") ||
      lower.includes("run") ||
      lower.includes("sprint") ||
      lower.includes("athletics")
    ) {
      return <FontAwesome5 name="running" size={24} color={iconColor} />;
    }
    if (lower.includes("volley")) {
      return <FontAwesome5 name="volleyball-ball" size={24} color={iconColor} />;
    }
    if (
      lower.includes("pickle") ||
      lower.includes("tennis") ||
      lower.includes("badminton") ||
      lower.includes("racket") ||
      lower.includes("racquet") ||
      lower.includes("table") ||
      lower.includes("ping")
    ) {
      return <FontAwesome5 name="table-tennis" size={22} color={iconColor} />;
    }
    if (lower.includes("soccer") || lower.includes("futbol") || lower.includes("football")) {
      return <FontAwesome5 name="futbol" size={24} color={iconColor} />;
    }
    if (lower.includes("base") || lower.includes("soft")) {
      return <FontAwesome5 name="baseball-ball" size={24} color={iconColor} />;
    }
    if (
      lower.includes("box") ||
      lower.includes("mma") ||
      lower.includes("combat") ||
      lower.includes("martial") ||
      lower.includes("karate") ||
      lower.includes("taekwondo")
    ) {
      return <MaterialCommunityIcons name="boxing-glove" size={24} color={iconColor} />;
    }
    if (lower.includes("golf")) {
      return <FontAwesome5 name="golf-ball" size={22} color={iconColor} />;
    }
    if (lower.includes("cycle") || lower.includes("biking") || lower.includes("bike")) {
      return <FontAwesome5 name="biking" size={22} color={iconColor} />;
    }
    if (lower.includes("weight") || lower.includes("lift") || lower.includes("gym")) {
      return <FontAwesome5 name="dumbbell" size={20} color={iconColor} />;
    }
    return <FontAwesome5 name="medal" size={22} color={iconColor} />;
  };

  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const yyyy = now.getFullYear();
    const formattedDate = `${mm}/${dd}/${yyyy}`;

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedTime = `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;

    setSessionDate((prev) => prev || formattedDate);
    setSessionTime((prev) => prev || formattedTime);
    setSessionDetails({
      date_time: `${formattedDate}, ${formattedTime}`,
      location: session.location || "Smart Araneta Coliseum, Quezon City",
    });
  }, []);

  // Fetch sport-specific athletes from database
  const fetchAthletesFromDb = useCallback(async (sport: SportCategory) => {
    try {
      setLoadingAthletes(true);
      const token = await getStoredAuthToken();
      // 1. Prioritize coach managed / recruited athletes first
      const coachAthletesRes = await fetch(`${API_BASE}/coaches/athletes`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

      const coachList = Array.isArray(coachAthletesRes?.athletes)
        ? coachAthletesRes.athletes
        : Array.isArray(coachAthletesRes)
        ? coachAthletesRes
        : [];
      let rawList: any[] = [...coachList, ...(initialAthletes || [])];

      if (rawList.length === 0) {
        const res = await fetch(`${API_BASE}/athletes?sport=${encodeURIComponent(sport)}`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          rawList = Array.isArray(data?.athletes)
            ? data.athletes
            : Array.isArray(data)
            ? data
            : [];
        } else {
          // Offline / WiFi off: Load from persistent Firestore offline cache or initialAthletes
          const offlineList = await getAthletesOfflineFirst(sport);
          if (offlineList.length > 0) {
            rawList = offlineList;
          }
        }
      }

      if (rawList.length > 0) {
        // Deduplicate athletes by canonical ID or name
        const seenIds = new Set<string>();
        const uniqueRaw: any[] = [];
        for (const a of rawList) {
          const idKey = (a.user_id || a.athlete_id || "").replace(/^ath_/, "");
          const nameKey = (a.full_name || `${a.first_name || ""} ${a.last_name || ""}`).trim().toLowerCase();
          const lookupKey = idKey || nameKey;
          if (lookupKey && !seenIds.has(lookupKey)) {
            seenIds.add(lookupKey);
            uniqueRaw.push(a);
          }
        }

        const mapped: AthleteRosterItem[] = uniqueRaw
          .filter((a) => matchesSport(a.sport_type, a.position || a.position_or_event, sport))
          .map((a) => {
            const fName = a.first_name || "";
            const lName = a.last_name || "";
            const fullName = a.full_name || `${fName} ${lName}`.trim() || "Athlete";
            return {
              athlete_id: a.athlete_id || a.user_id || `ath_${Date.now()}_${Math.random()}`,
              jersey_number: String(a.jersey_number ?? "00"),
              last_name: lName || fullName.split(" ").slice(-1)[0] || "",
              full_name: fullName.toUpperCase(),
              position_or_event:
                a.position ||
                a.position_or_event ||
                (sport === "BASKETBALL" ? "Guard" : sport === "SWIMMING" ? "Freestyle" : sport === "TRACK AND FIELD" ? "100m" : "Player"),
              is_active_on_field: false,
              avatar_url: a.avatar_url,
              sport_type: a.sport_type || sport,
              basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
              timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
            };
          });

        setDbAthletes(mapped);
        return;
      }

      setDbAthletes([]);
    } catch (err) {
      console.warn("Could not fetch sport athletes from database:", err);
      setDbAthletes([]);
    } finally {
      setLoadingAthletes(false);
    }
  }, []);

  useEffect(() => {
    fetchAthletesFromDb(session.sport_type);
  }, [session.sport_type, fetchAthletesFromDb]);

  const handleSelectSport = (sport: SportCategory) => {
    setSportCategory(sport);
    // Filter active roster to only include athletes matching newly selected sport
    const retainedRoster = session.active_roster.filter((a) =>
      matchesSport(a.sport_type, a.position_or_event, sport)
    );
    setSessionDetails({ active_roster: retainedRoster });
  };

  const handleUpdateDate = (dateVal: string) => {
    setSessionDate(dateVal);
    const combined = dateVal && sessionTime ? `${dateVal}, ${sessionTime}` : dateVal || sessionTime;
    setSessionDetails({ date_time: combined });
  };

  const handleUpdateTime = (timeVal: string) => {
    setSessionTime(timeVal);
    const combined = sessionDate && timeVal ? `${sessionDate}, ${timeVal}` : sessionDate || timeVal;
    setSessionDetails({ date_time: combined });
  };

  // Date Picker Handlers
  const handleOpenDatePicker = () => {
    if (sessionDate) {
      const parts = sessionDate.split("/");
      if (parts.length === 3) {
        const m = parseInt(parts[0], 10) - 1;
        const d = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
          setCalMonth(m);
          setSelectedDay(d);
          setCalYear(y);
        }
      }
    }
    setShowDatePicker(true);
  };

  const daysInMonth = useMemo(() => {
    return new Date(calYear, calMonth + 1, 0).getDate();
  }, [calYear, calMonth]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(calYear, calMonth, 1).getDay(); // 0 is Sunday
  }, [calYear, calMonth]);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    const mm = String(calMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const formatted = `${mm}/${dd}/${calYear}`;
    handleUpdateDate(formatted);
    setShowDatePicker(false);
  };

  const handleQuickDatePreset = (preset: "today" | "tomorrow" | "+2days" | "saturday") => {
    const d = new Date();
    if (preset === "tomorrow") {
      d.setDate(d.getDate() + 1);
    } else if (preset === "+2days") {
      d.setDate(d.getDate() + 2);
    } else if (preset === "saturday") {
      const currentDay = d.getDay();
      const distanceToSat = (6 - currentDay + 7) % 7 || 7;
      d.setDate(d.getDate() + distanceToSat);
    }
    setCalMonth(d.getMonth());
    setCalYear(d.getFullYear());
    setSelectedDay(d.getDate());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const formatted = `${mm}/${dd}/${d.getFullYear()}`;
    handleUpdateDate(formatted);
    setShowDatePicker(false);
  };

  // Time Picker Handlers
  const handleOpenTimePicker = () => {
    if (sessionTime) {
      const match = sessionTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        const h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ap = match[3].toUpperCase() as "AM" | "PM";
        if (!isNaN(h)) setSelectedHour(h);
        if (!isNaN(m)) setSelectedMinute(m);
        if (ap === "AM" || ap === "PM") setSelectedAmPm(ap);
      }
    }
    setShowTimePicker(true);
  };

  const handleSelectHour = (h: number) => {
    setSelectedHour(h);
    const formatted = `${String(h).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")} ${selectedAmPm}`;
    handleUpdateTime(formatted);
  };

  const handleSelectMinute = (m: number) => {
    setSelectedMinute(m);
    const formatted = `${String(selectedHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${selectedAmPm}`;
    handleUpdateTime(formatted);
  };

  const handleSelectAmPm = (ap: "AM" | "PM") => {
    setSelectedAmPm(ap);
    const formatted = `${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")} ${ap}`;
    handleUpdateTime(formatted);
  };

  const handleConfirmTime = () => {
    const formatted = `${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")} ${selectedAmPm}`;
    handleUpdateTime(formatted);
    setShowTimePicker(false);
  };

  const handleQuickTimePreset = (h: number, m: number, ap: "AM" | "PM") => {
    setSelectedHour(h);
    setSelectedMinute(m);
    setSelectedAmPm(ap);
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ap}`;
    handleUpdateTime(formatted);
    setShowTimePicker(false);
  };

  const handleQuickTimeNow = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = Math.floor(now.getMinutes() / 5) * 5;
    const ap = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    handleQuickTimePreset(hours, minutes, ap as "AM" | "PM");
  };

  // Location Handlers
  const handleOpenLocationModal = () => {
    setShowLocationModal(true);
  };

  useEffect(() => {
    if (!showLocationModal) return;
    let isCancelled = false;
    const q = locationQuery.trim();
    if (!q) {
      setLocationResults(POPULAR_SPORTS_VENUES);
      setSearchingLocations(false);
      return;
    }

    setSearchingLocations(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchVenuesOnline(q);
        if (!isCancelled) {
          setLocationResults(res);
        }
      } catch (err) {
        console.warn("Venue search error:", err);
      } finally {
        if (!isCancelled) {
          setSearchingLocations(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [locationQuery, showLocationModal]);

  const handleSelectVenue = (venue: LocationResult) => {
    const venueName = venue.address ? `${venue.name}, ${venue.address.split(",").slice(-2).join(",").trim()}` : venue.name;
    setSessionDetails({ location: venueName });
    setShowLocationModal(false);
  };

  const handleSelectCustomVenue = () => {
    if (locationQuery.trim()) {
      setSessionDetails({ location: locationQuery.trim() });
      setShowLocationModal(false);
    }
  };

  const handleStart = () => {
    const effectiveDate = sessionDate.trim() || new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    const effectiveTime = sessionTime.trim() || "07:00 PM";
    const effectiveLocation = (session.location && session.location.trim()) || "Araneta Coliseum";

    if (session.active_roster.length === 0) {
      setMissingItems([`Select at least 1 ${session.sport_type.toLowerCase()} athlete for the roster`]);
      setShowErrors(true);
      setShowInterruptionModal(true);
      return;
    }

    setSessionDate(effectiveDate);
    setSessionTime(effectiveTime);

    // Organize selected roster into active on-court vs bench roster
    const allSelected = session.active_roster;
    let activeRoster: AthleteRosterItem[] = [];
    let benchRoster: AthleteRosterItem[] = [];

    if (session.sport_type === "BASKETBALL" && allSelected.length > 5) {
      activeRoster = allSelected.slice(0, 5).map((a) => ({ ...a, is_active_on_field: true }));
      benchRoster = allSelected.slice(5).map((a) => ({ ...a, is_active_on_field: false }));
    } else {
      activeRoster = allSelected.map((a) => ({ ...a, is_active_on_field: true }));
      benchRoster = [];
    }

    setSessionDetails({
      date_time: `${effectiveDate}, ${effectiveTime}`,
      location: effectiveLocation,
      active_roster: activeRoster,
      bench_roster: benchRoster,
    });

    setShowErrors(false);
    setShowSuccessModal(true);
  };

  const filteredPool = useMemo(() => {
    return dbAthletes.filter((a) => {
      const alreadySelected = session.active_roster.some((item) => item.athlete_id === a.athlete_id);
      if (alreadySelected) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.full_name.toLowerCase().includes(q) ||
        a.position_or_event.toLowerCase().includes(q) ||
        String(a.jersey_number).includes(q)
      );
    });
  }, [dbAthletes, session.active_roster, searchQuery]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 10 }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CREATE LOG SESSION</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SELECT SPORT */}
        <Text style={styles.sectionLabel}>SELECT SPORT</Text>

        {loadingSports && sports.length === 0 ? (
          <View style={styles.loadingSportsContainer}>
            <ActivityIndicator size="small" color="#00D2FF" />
            <Text style={styles.loadingSportsText}>Loading active sports from database...</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {sports.map((sport, index) => {
              const sportUpper = sport.sport_name.toUpperCase();
              const isSelected = session.sport_type.toUpperCase() === sportUpper;
              const isLastOdd = sports.length % 2 !== 0 && index === sports.length - 1;

              return (
                <TouchableOpacity
                  key={sport.sport_id || sport.sport_name}
                  style={[
                    isLastOdd ? styles.sportTileFull : styles.sportTileHalf,
                    isSelected && styles.sportTileActive,
                  ]}
                  onPress={() => handleSelectSport(sportUpper)}
                  activeOpacity={0.8}
                >
                  <View style={styles.sportTileIcon}>
                    {renderSportIcon(sport)}
                  </View>
                  <Text
                    style={[
                      styles.sportTileTitle,
                      isSelected && styles.sportTileTitleActive,
                    ]}
                    numberOfLines={1}
                  >
                    {sport.sport_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.subLabel}>Search Athletes</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Type athlete name..."
            placeholderTextColor="#5C6B82"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.length > 0) setShowAddModal(true);
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchIcon} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color="#8E9BAE" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="person-add-outline" size={20} color="#5C6B82" style={styles.searchIcon} />
          )}
        </View>

        {/* Selected Athletes Cards List */}
        {session.active_roster.map((athlete) => (
          <View key={athlete.athlete_id} style={styles.athleteCard}>
            {athlete.avatar_url ? (
              <Image source={{ uri: athlete.avatar_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {athlete.full_name.charAt(0)}
                </Text>
              </View>
            )}

            <View style={styles.athleteInfo}>
              <Text style={styles.athleteName}>{athlete.full_name}</Text>
              <Text style={styles.athleteSubtitle}>
                {athlete.position_or_event} • #{athlete.jersey_number}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeAthleteFromRoster(athlete.athlete_id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* ADD ATHLETE Dashed Button */}
        <TouchableOpacity
          style={[
            styles.addAthleteBtn,
            showErrors && session.active_roster.length === 0 && { borderColor: "#EF4444" },
          ]}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.addAthleteBtnText, showErrors && session.active_roster.length === 0 && { color: "#EF4444" }]}>
            {showErrors && session.active_roster.length === 0 ? "! ADD ATHLETE (REQUIRED)" : "ADD ATHLETE"}
          </Text>
        </TouchableOpacity>
        {showErrors && session.active_roster.length === 0 && (
          <Text style={[styles.errorText, { marginTop: -14, marginBottom: 14 }]}>
            Please select at least 1 athlete to start session.
          </Text>
        )}

        {/* SESSION DETAILS */}
        <Text style={styles.sectionLabel}>SESSION DETAILS</Text>

        {/* Separated Date & Time Interactive Pickers */}
        <View style={styles.rowGroup}>
          {/* Date Picker Button */}
          <View style={styles.halfFormGroup}>
            <Text style={styles.subLabel}>
              Date <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                showErrors && !sessionDate.trim() && styles.inputBoxError,
              ]}
              onPress={handleOpenDatePicker}
              activeOpacity={0.8}
            >
              <View style={styles.pickerContent}>
                <Ionicons
                  name="calendar"
                  size={18}
                  color={showErrors && !sessionDate.trim() ? "#EF4444" : "#00C8FF"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.pickerText,
                    !sessionDate.trim() && styles.pickerTextPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {sessionDate || "Pick Date"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
            {showErrors && !sessionDate.trim() && (
              <Text style={styles.errorText}>Date is required.</Text>
            )}
          </View>

          {/* Time Picker Button */}
          <View style={styles.halfFormGroup}>
            <Text style={styles.subLabel}>
              Time <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                showErrors && !sessionTime.trim() && styles.inputBoxError,
              ]}
              onPress={handleOpenTimePicker}
              activeOpacity={0.8}
            >
              <View style={styles.pickerContent}>
                <Ionicons
                  name="time"
                  size={18}
                  color={showErrors && !sessionTime.trim() ? "#EF4444" : "#00C8FF"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.pickerText,
                    !sessionTime.trim() && styles.pickerTextPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {sessionTime || "Pick Time"}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
            {showErrors && !sessionTime.trim() && (
              <Text style={styles.errorText}>Time is required.</Text>
            )}
          </View>
        </View>

        {/* Location Form Group with Google Maps search button */}
        <View style={styles.formGroup}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={styles.subLabel}>
              Location <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={handleOpenLocationModal}
              style={styles.searchMapLink}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={13} color="#00C8FF" />
              <Text style={styles.searchMapLinkText}>Search Maps</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.pickerButton,
              showErrors && (!session.location || !session.location.trim()) && styles.inputBoxError,
            ]}
            onPress={handleOpenLocationModal}
            activeOpacity={0.8}
          >
            <View style={styles.pickerContent}>
              <Ionicons
                name="location-sharp"
                size={18}
                color={showErrors && (!session.location || !session.location.trim()) ? "#EF4444" : "#00C8FF"}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.pickerText,
                  (!session.location || !session.location.trim()) && styles.pickerTextPlaceholder,
                ]}
                numberOfLines={1}
              >
                {session.location || "Select or search venue on map..."}
              </Text>
            </View>
            <View style={styles.mapBadge}>
              <Text style={styles.mapBadgeText}>MAP</Text>
            </View>
          </TouchableOpacity>
          {showErrors && (!session.location || !session.location.trim()) && (
            <Text style={styles.errorText}>Location is required.</Text>
          )}
        </View>

        {/* Bottom CTA Button */}
        <TouchableOpacity
          style={styles.startLoggingBtn}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.startLoggingBtnText}>START MANUAL LOGGING</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Add Athlete Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available {session.sport_type} Athletes</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* In-Modal Search Input */}
            <View style={[styles.searchContainer, { marginBottom: 14 }]}>
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${session.sport_type.toLowerCase()} athlete...`}
                placeholderTextColor="#5C6B82"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchIcon} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={20} color="#8E9BAE" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="search-outline" size={20} color="#5C6B82" style={styles.searchIcon} />
              )}
            </View>

            {loadingAthletes ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#00D2FF" />
                <Text style={{ color: "#8E9BAE", fontSize: 13, marginTop: 10 }}>
                  Fetching {session.sport_type.toLowerCase()} athletes from database...
                </Text>
              </View>
            ) : filteredPool.length > 0 ? (
              <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {filteredPool.map((item) => (
                  <TouchableOpacity
                    key={item.athlete_id}
                    style={styles.poolItem}
                    onPress={() => {
                      addAthleteToRoster(item);
                      if (filteredPool.length <= 1) setShowAddModal(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.poolItemTitle}>{item.full_name}</Text>
                      <Text style={styles.poolItemSub}>
                        {item.position_or_event} • #{item.jersey_number}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color="#00D2FF" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Ionicons name="people-outline" size={32} color="#64748B" />
                <Text style={{ color: "#8E9BAE", fontSize: 14, marginTop: 8, textAlign: "center" }}>
                  {searchQuery
                    ? `No ${session.sport_type} athletes match "${searchQuery}".`
                    : `No registered ${session.sport_type} athletes found in database.`}
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 14,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    backgroundColor: "#00D2FF",
                    borderRadius: 8,
                  }}
                  onPress={() => {
                    const fallbackName = searchQuery.trim() || "Harold Delos Santos";
                    addAthleteToRoster({
                      athlete_id: `ath_custom_${Date.now()}`,
                      jersey_number: "0",
                      last_name: fallbackName.split(" ").slice(-1)[0] || fallbackName,
                      full_name: fallbackName.toUpperCase(),
                      position_or_event: session.sport_type === "BASKETBALL" ? "Guard" : session.sport_type === "SWIMMING" ? "Freestyle" : session.sport_type === "TRACK AND FIELD" ? "100m" : "Player",
                      is_active_on_field: false,
                      sport_type: session.sport_type,
                      basketball_stats: { pts: 0, ast: 0, reb: 0, pf: 0, stl: 0, to: 0 },
                      timing_stats: { timer_seconds: 0, formatted_time: "00:00.00", distance_meters: 100, split_times: [], is_foul_dq: false },
                    });
                    setShowAddModal(false);
                    setSearchQuery("");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#070D19", fontWeight: "bold" }}>
                    + Add {searchQuery.trim() ? `"${searchQuery.trim()}"` : "Harold Delos Santos"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Required Interruption Modal */}
      <Modal
        visible={showInterruptionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInterruptionModal(false)}
      >
        <View style={styles.interruptionOverlay}>
          <View style={styles.interruptionCard}>
            <View style={styles.interruptionIconCircle}>
              <Ionicons name="warning-outline" size={30} color="#EF4444" />
            </View>

            <Text style={styles.interruptionTitle}>REQUIRED DETAILS MISSING</Text>
            <Text style={styles.interruptionSubtitle}>
              Please complete all required session setup details before starting manual logging:
            </Text>

            <View style={styles.interruptionBox}>
              {missingItems.map((item, idx) => (
                <View key={idx} style={styles.interruptionItem}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                  <Text style={styles.interruptionItemText}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.interruptionBtn}
              onPress={() => setShowInterruptionModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.interruptionBtnText}>FILL UP DETAILS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Session Started Success Interruption Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.interruptionOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={36} color="#00D2FF" />
            </View>

            <Text style={styles.interruptionTitle}>SESSION STARTED</Text>
            <Text style={styles.interruptionSubtitle}>
              Manual logging session successfully configured and initialized.
            </Text>

            <View style={styles.interruptionBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>SPORT</Text>
                <Text style={styles.summaryValueText}>{session.sport_type}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>SELECTED ROSTER</Text>
                <Text style={styles.summaryValueText}>{session.active_roster.length} Athletes</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>SCHEDULE</Text>
                <Text style={styles.summaryValueText}>{session.date_time}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelText}>LOCATION</Text>
                <Text style={styles.summaryValueText}>{session.location}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => {
                setShowSuccessModal(false);
                if (onStartLogging) onStartLogging(session);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.successBtnText}>PROCEED TO LIVE LOGGING</Text>
              <Ionicons name="arrow-forward" size={18} color="#070D19" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <View style={styles.pickerModalTitleBox}>
                <Text style={styles.pickerModalTitle}>SELECT MATCH DATE</Text>
                <Text style={styles.pickerModalSubtitle}>
                  {sessionDate ? new Date(calYear, calMonth, selectedDay).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "Pick from calendar"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#8E9BAE" />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsRow}>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickDatePreset("today")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickDatePreset("tomorrow")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickDatePreset("+2days")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>+2 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickDatePreset("saturday")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>This Saturday</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Month & Year Navigator */}
            <View style={styles.calendarMonthNav}>
              <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>
                {MONTH_NAMES[calMonth]} {calYear}
              </Text>
              <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Day of Week Header */}
            <View style={styles.weekDaysHeader}>
              {WEEK_DAYS.map((d, idx) => (
                <Text key={idx} style={styles.weekDayColText}>{d}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                <View key={`empty-${idx}`} style={styles.dayCellEmpty} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const isSelected = selectedDay === day;
                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === calMonth &&
                  new Date().getFullYear() === calYear;

                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      styles.dayCell,
                      isToday && styles.dayCellToday,
                      isSelected && styles.dayCellActive,
                    ]}
                    onPress={() => handleSelectDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        isSelected && styles.dayCellTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <View style={styles.pickerModalTitleBox}>
                <Text style={styles.pickerModalTitle}>SELECT MATCH TIME</Text>
                <Text style={styles.pickerModalSubtitle}>Tap hours, minutes, and AM/PM</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTimePicker(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#8E9BAE" />
              </TouchableOpacity>
            </View>

            {/* Clock Hero Display */}
            <View style={styles.clockHeroCard}>
              <View style={styles.clockHeroDigitsRow}>
                <View style={styles.clockDigitBox}>
                  <Text style={styles.clockDigitText}>
                    {String(selectedHour).padStart(2, "0")}
                  </Text>
                </View>
                <Text style={styles.clockColonText}>:</Text>
                <View style={styles.clockDigitBox}>
                  <Text style={styles.clockDigitText}>
                    {String(selectedMinute).padStart(2, "0")}
                  </Text>
                </View>

                {/* AM/PM Switch */}
                <View style={styles.clockAmPmToggle}>
                  <TouchableOpacity
                    style={[styles.ampmPill, selectedAmPm === "AM" && styles.ampmPillActive]}
                    onPress={() => handleSelectAmPm("AM")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.ampmPillText, selectedAmPm === "AM" && styles.ampmPillTextActive]}>AM</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.ampmPill, selectedAmPm === "PM" && styles.ampmPillActive]}
                    onPress={() => handleSelectAmPm("PM")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.ampmPillText, selectedAmPm === "PM" && styles.ampmPillTextActive]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Quick Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickChipsRow}>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={handleQuickTimeNow}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>Current Time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickTimePreset(8, 0, "AM")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>8:00 AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickTimePreset(10, 30, "AM")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>10:30 AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickTimePreset(2, 0, "PM")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>2:00 PM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickTimePreset(4, 30, "PM")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>4:30 PM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickChip}
                onPress={() => handleQuickTimePreset(7, 0, "PM")}
                activeOpacity={0.8}
              >
                <Text style={styles.quickChipText}>7:00 PM</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Hours Selector */}
            <Text style={styles.timePickerSubLabel}>SELECT HOUR</Text>
            <View style={styles.timePickerGrid}>
              {TIME_HOURS.map((h) => {
                const isSelected = selectedHour === h;
                return (
                  <TouchableOpacity
                    key={`hr-${h}`}
                    style={[styles.timeGridPill, isSelected && styles.timeGridPillActive]}
                    onPress={() => handleSelectHour(h)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeGridPillText, isSelected && styles.timeGridPillTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Minutes Selector */}
            <Text style={styles.timePickerSubLabel}>SELECT MINUTE</Text>
            <View style={styles.timePickerGrid}>
              {TIME_MINUTES.map((m) => {
                const isSelected = selectedMinute === m;
                return (
                  <TouchableOpacity
                    key={`min-${m}`}
                    style={[styles.timeGridPill, isSelected && styles.timeGridPillActive]}
                    onPress={() => handleSelectMinute(m)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timeGridPillText, isSelected && styles.timeGridPillTextActive]}>
                      {String(m).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.modalConfirmBtn}
              onPress={handleConfirmTime}
              activeOpacity={0.85}
            >
              <Text style={styles.modalConfirmBtnText}>CONFIRM TIME</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Google Maps / Places Location Picker Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalSheet}>
            <View style={styles.pickerModalHeader}>
              <View style={styles.pickerModalTitleBox}>
                <Text style={styles.pickerModalTitle}>SEARCH MATCH VENUE</Text>
                <Text style={styles.pickerModalSubtitle}>Google Maps & Popular Sports Arenas</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#8E9BAE" />
              </TouchableOpacity>
            </View>

            {/* Live Search Input */}
            <View style={[styles.searchContainer, { marginBottom: 12 }]}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search stadium, arena, gym, or address..."
                placeholderTextColor="#5C6B82"
                value={locationQuery}
                onChangeText={setLocationQuery}
                autoFocus
              />
              {locationQuery ? (
                <TouchableOpacity onPress={() => setLocationQuery("")} style={styles.searchIcon} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={20} color="#8E9BAE" />
                </TouchableOpacity>
              ) : (
                <Ionicons name="search-outline" size={20} color="#5C6B82" style={styles.searchIcon} />
              )}
            </View>

            {/* If user typed a custom venue that is not in the list, offer to use it directly */}
            {locationQuery.trim().length > 0 && (
              <TouchableOpacity
                style={styles.customVenuePickBtn}
                onPress={handleSelectCustomVenue}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-circle-outline" size={22} color="#00C8FF" />
                <Text style={styles.customVenuePickText} numberOfLines={1}>
                  Use &quot;{locationQuery.trim()}&quot; as venue
                </Text>
                <Ionicons name="checkmark-circle" size={18} color="#00C8FF" />
              </TouchableOpacity>
            )}

            {/* Results or Loading */}
            {searchingLocations ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#00C8FF" />
                <Text style={{ color: "#8E9BAE", fontSize: 13, marginTop: 8 }}>
                  Searching Google Maps venues...
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {!locationQuery.trim() && (
                  <Text style={[styles.timePickerSubLabel, { marginBottom: 10 }]}>
                    POPULAR SPORTS VENUES & ARENAS
                  </Text>
                )}
                {locationResults.map((item) => (
                  <TouchableOpacity
                    key={item.place_id}
                    style={styles.venueResultItem}
                    onPress={() => handleSelectVenue(item)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.venueIconBox}>
                      <Ionicons name="location-sharp" size={20} color="#00C8FF" />
                    </View>
                    <View style={styles.venueDetails}>
                      {item.category && (
                        <Text style={styles.venueCategoryBadge}>{item.category.toUpperCase()}</Text>
                      )}
                      <Text style={styles.venueNameText}>{item.name}</Text>
                      <Text style={styles.venueAddressText} numberOfLines={2}>{item.address}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#64748B" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default CreateLogScreen;

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Image,
} from "react-native";
import styles from "./styles/CoachMainPage";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestAuthenticatedJson, getStoredAuthToken, API_BASE, clearAuthMicroCache } from "../../Authentication/authShared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { downloadScoresheetToDevice, shareScoresheetFile } from "../../../../services/scoresheetFileHelper";

// Data Types & Mock Testing Data
import {
  UserCoach,
  RosterAthlete,
  Team,
  NavigationTab,
  AthletePerformanceProfile,
  MatchHistoryItem,
} from "../DataTypes";

// Feature Pages
import { MyTeamsPage } from "../Teams/MyTeamsPage";
import { ManageTeamPage } from "../Teams/ManageTeamPage";
import { ViewAllPlayers } from "./ViewAllPlayers";
import { CoachSettings } from "./CoachSettings";
import { AtletaHeader } from "../Components/AtletaHeader";
import { AtletaNavbar } from "../Components/AtletaNavbar";
import { SkeletonPlayerRows } from "../Components/AtletaLoadingIndicator";
import { CoachProfile } from "../Profile/CoachProfile";
import { CoachEditProfile } from "../Profile/CoachEditProfile";
import { CoachProfileState, DEFAULT_COACH_PROFILE, CoachSettingsData, DEFAULT_COACH_SETTINGS } from "../DataTypes";
import { OCRlogging } from "./OCRlogging";
import { OCRoutput, RawOCRDetectedData } from "./OCRoutput";
import { CreateLogScreen } from "../MultiLogging/createLog";
import { BasketballMatchScreen } from "../MultiLogging/basketballMatch";
import { SwimmingMatchScreen } from "../MultiLogging/swimmingMatch";
import { TrackFieldMatchScreen } from "../MultiLogging/TrackFieldMatch";
import { MatchDetailsScreen } from "../MultiLogging/MatchDetails";
import { MatchSessionProvider } from "../MultiLogging/MatchSessionContext";
import { pickBetterTime, pickBetterDistance } from "../MultiLogging/sportEvents";
import { OfficialMatchesPage } from "../ScoresheetRequest/officialMatchPage";
import { DiscoveryMain } from "../Discovery/discoveryMain";
import { DiscoveryProvider } from "../Discovery/DiscoveryContext";
import { PerformancePage } from "../Performance/performancePage";
import { AthletePortfolio } from "../Performance/athletePortfolio";
import { AllStats } from "../Performance/allStats";
import { MatchHistory } from "../Performance/matchHistory";
import { TrackfieldMatchResult } from "../Performance/trackfieldMatchResult";
import { SwimmingMatchResult } from "../Performance/swimmingMatchResult";
import { BasketballMatchResult } from "../Performance/basketballMatchResult";
import {
  getMatchesOfflineFirst,
  saveMatchOfflineFirst,
  getTeamsOfflineFirst,
  getAthletesOfflineFirst,
  getSportsOfflineFirst,
  getCoachProfileOfflineFirst,
  saveTeamOfflineFirst,
  deleteTeamOfflineFirst,
  listenToCoachScoresheetRequests,
  listenToCoachInquiries,
  clearFirebaseClientCaches,
} from "../../../../services/firebaseClient";
import { useAccount } from "../../../../context/AccountContext";
import { calculatePlayerRating, calculateDynamicRadarCompetencies, parseTimeToSeconds } from "../Performance/performanceUtils";

// Font Styles
const fontPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

const fontBoldPlatform = Platform.select({
  ios: "System",
  android: "sans-serif-medium",
  default: "sans-serif",
});

type ViewState =
  | "dashboard"
  | "teams_list"
  | "manage_team"
  | "view_all_players"
  | "settings"
  | "edit_profile"
  | "ocr_logging"
  | "ocr_output"
  | "create_log"
  | "basketball_match"
  | "swimming_match"
  | "track_field_match"
  | "match_details"
  | "official_matches"
  | "discovery"
  | "performance"
  | "athlete_portfolio"
  | "all_stats"
  | "match_history"
  | "perf_trackfield_result"
  | "perf_swimming_result"
  | "perf_basketball_result";
const SPORT_CATEGORIES = ["ALL", "BASKETBALL", "TRACK AND FIELD", "SWIMMING"];
const COACH_DASHBOARD_CACHE_KEY = "atleta_coach_dashboard_cache_v2";

type CoachMainPageProps = {
  onLogout?: () => void;
};

// Optimized Player Row Component
const PlayerRowItem = React.memo(
  ({
    player,
    isLast,
    onViewStats,
  }: {
    player: RosterAthlete;
    isLast: boolean;
    onViewStats: (player: RosterAthlete) => void;
  }) => {
    const rawPos = player.position || "";
    const isUnassigned = !rawPos || rawPos.toLowerCase() === "unassigned";
    const rawSport = String(player.sport_type || (player as any).category || (player as any).sport || "Athlete").trim();
    const eventType = (player as any).event_type || (player as any).eventType || (player as any).position_or_event || "";
    const effectivePos = (!isUnassigned && rawPos) ? rawPos : (eventType || "");
    const posUpper = effectivePos.toUpperCase();
    const formattedPos =
      posUpper === "PG"
        ? "POINT GUARD"
        : posUpper === "SG"
          ? "SHOOTING GUARD"
          : posUpper === "SF"
            ? "SMALL FORWARD"
            : posUpper === "PF"
              ? "POWER FORWARD"
              : posUpper === "C"
                ? "CENTER"
                : effectivePos;

    const rawTeamName = String((player as any).team_name || "");
    const parts = rawTeamName.split(" • ").map((s: string) => s.trim()).filter(Boolean);
    const seenNames = new Set<string>();
    const dedupedParts: string[] = [];
    for (const p of parts) {
      const lower = p.toLowerCase();
      if (
        !seenNames.has(lower) &&
        lower !== "unassigned" &&
        lower !== "unassigned / no team" &&
        !lower.includes("opponent") &&
        !lower.includes("various schools")
      ) {
        seenNames.add(lower);
        dedupedParts.push(p);
      }
    }
    const playerTeamName = dedupedParts.join(" • ");

    // Sport • Team badge formatting (e.g., SWIMMING • ATENEO BLUE FAST)
    const sportUpper = rawSport.toUpperCase();
    const badgeText = playerTeamName
      ? (sportUpper ? `${sportUpper} • ${playerTeamName.toUpperCase()}` : playerTeamName.toUpperCase())
      : (sportUpper || "");

    const hasJersey = Boolean(player.jersey_number && player.jersey_number !== "0" && player.jersey_number !== "null");
    const isPosSameAsSport = formattedPos.toUpperCase() === sportUpper;
    const subtitleText = (!formattedPos || isPosSameAsSport)
      ? (hasJersey ? `#${player.jersey_number}` : "")
      : `${formattedPos}${hasJersey ? ` • #${player.jersey_number}` : ""}`;

    return (
      <View style={[styles.playerRow, !isLast && styles.playerRowBorder]}>
        <View style={styles.playerTextContainer}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
            <Text style={styles.playerName}>{player.full_name}</Text>
            {Boolean(badgeText) && (
              <View style={{ backgroundColor: "rgba(0, 200, 255, 0.15)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: "#00C8FF", fontSize: 10, fontWeight: "800" }}>
                  {badgeText.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          {Boolean(subtitleText) && (
            <Text style={styles.playerSubtitle}>{subtitleText}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.viewStatsButton}
          onPress={() => onViewStats(player)}
          activeOpacity={0.7}
        >
          <Text style={styles.viewStatsText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }
);

// API Request: fetch coach dashboard & team summary (GET /api/coach/dashboard)
export function CoachMainPage({ onLogout }: CoachMainPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;
  const { currentUser, account } = useAccount();

  // Local State
  const [coach, setCoach] = useState<UserCoach>({
    user_id: account?.user_id || currentUser?.cleanUid || "",
    first_name: account?.first_name || "Coach",
    last_name: account?.last_name || "",
    email: account?.email || currentUser?.email || "",
    contact_number: account?.contact_number || "",
    role: "Coach",
    coach_id: account?.coach_id || currentUser?.coachId || currentUser?.uid || "",
    current_institution: account?.current_institution || "University Athletics",
    athlete_managed: [],
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [athletesPool, setAthletesPool] = useState<RosterAthlete[]>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Navigation States
  const [activeTab, setActiveTab] = useState<NavigationTab>("Home");
  const [activeView, setActiveView] = useState<ViewState>("dashboard");
  const [activeManualSportView, setActiveManualSportView] = useState<ViewState>("basketball_match");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  // Filters & Modals
  const [activeSportFilter, setActiveSportFilter] = useState<string>("ALL");
  const [dynamicSports, setDynamicSports] = useState<string[]>([
    "BASKETBALL",
    "VOLLEYBALL",
    "SWIMMING",
    "TRACK AND FIELD",
  ]);
  const [showFabOverlay, setShowFabOverlay] = useState(false);
  const [showTeamDetailsModal, setShowTeamDetailsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hideDiscoveryNav, setHideDiscoveryNav] = useState(false);
  const [coachProfile, setCoachProfile] = useState<CoachProfileState>({
    coach_id: "",
    user_id: "",
    first_name: "Coach",
    last_name: "",
    full_name: "Coach",
    email: "",
    role_title: "COACH",
    sports_focus: "BASKETBALL",
    regional_affiliations: {
      association_name: "National Sports League",
      office_name: "Sports Office",
    },
    credentials: [],
    uploaded_documents: [],
    system_statistics: {
      total_athletes: 0,
      metric_logs: 0,
    },
    last_updated: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase(),
  });
  const [ocrPayload, setOcrPayload] = useState<RawOCRDetectedData | undefined>();

  // Notification State
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [scoresheetPreview, setScoresheetPreview] = useState<{ visible: boolean; url: string; matchName: string } | null>(null);
  const [isDownloadingScoresheet, setIsDownloadingScoresheet] = useState(false);

  // Accreditation Gate State
  const [accountStatus, setAccountStatus] = useState<string>("Active");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [reapplyDocUrl, setReapplyDocUrl] = useState<string>("");
  const [reapplyDocList, setReapplyDocList] = useState<string[]>([]);
  const [reapplyNotes, setReapplyNotes] = useState<string>("");
  const [isReapplying, setIsReapplying] = useState<boolean>(false);
  const [reapplyFeedback, setReapplyFeedback] = useState<string | null>(null);

  const handleResubmitCredentials = async () => {
    const docs = [...reapplyDocList];
    if (reapplyDocUrl.trim() && !docs.includes(reapplyDocUrl.trim())) {
      docs.push(reapplyDocUrl.trim());
    }
    if (docs.length === 0) {
      Alert.alert("Documents Required", "Please provide at least one replacement credential document.");
      return;
    }
    try {
      setIsReapplying(true);
      setReapplyFeedback(null);
      const token = await getStoredAuthToken();
      const res = await fetch(`${API_BASE}/coaches/resubmit-credentials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          coach_id: coach.coach_id || coachProfile.coach_id,
          user_id: coach.user_id || coachProfile.user_id,
          email: coach.email || coachProfile.email,
          documents: docs,
          professional_documents: docs,
          notes: reapplyNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Resubmission failed");
      }
      setAccountStatus("Pending");
      setReapplyFeedback("Replacement credentials submitted successfully. Your account is now pending admin review.");
      Alert.alert("Credentials Submitted", "Your updated accreditation documents have been submitted to the administrator for review.");
    } catch (err: any) {
      Alert.alert("Submission Error", err?.message || "Failed to submit replacement credentials.");
    } finally {
      setIsReapplying(false);
    }
  };

const DEFAULT_EMPTY_PERF_ATHLETE: AthletePerformanceProfile = {
  athlete_id: "",
  user_id: "",
  full_name: "Athlete",
  birthdate: "-",
  position_or_event: "Unassigned",
  location_province: "Unassigned",
  team_name: "",
  rating_score: 70,
  sport_category: "BASKETBALL",
  biometrics: {
    height_ft: "-",
    weight_lbs: "-",
    wingspan_ft: "-",
    vertical_jump_in: "-",
  },
  averages: {
    ppg: 0,
    rpg: 0,
    apg: 0,
    per_score: 0,
    games_played: 0,
    wins: 0,
    fg_percentage: 0,
    three_pt_percentage: 0,
    ft_percentage: 0,
  },
  radar_competencies: { speed: 0, power: 0, agility: 0, iq: 0, tech: 0 },
  scoring_trends_last_10: [],
  eligibility_documents: {
    psa_verified: false,
    residency_verified: false,
  },
  workload_analytics: {
    target_7day_effort_pts: 0,
    current_7day_acute_load: 0,
    current_28day_chronic_load: 0,
    calculated_acwr: 0,
    workout_score: 70,
    fatigue_meter: 0,
    routine_score: 70,
    body_stress_pts: 0,
  },
};

  // Performance State
  const [perfAthletes, setPerfAthletes] = useState<AthletePerformanceProfile[]>([]);
  const [selectedPerfAthlete, setSelectedPerfAthlete] = useState<AthletePerformanceProfile>(DEFAULT_EMPTY_PERF_ATHLETE);
  const [matchHistoryList, setMatchHistoryList] = useState<MatchHistoryItem[]>([]);
  const [selectedMatchItem, setSelectedMatchItem] = useState<MatchHistoryItem | null>(null);
  const [previousPortfolioView, setPreviousPortfolioView] = useState<ViewState>("performance");
  const [coachSettingsData, setCoachSettingsData] = useState<CoachSettingsData>(DEFAULT_COACH_SETTINGS);

  // Helper function to dynamically compute performance profile from real metrics
  const computeAthletePerformance = (a: any, matchesList: MatchHistoryItem[] = matchHistoryList): AthletePerformanceProfile => {
    const athleteName = (a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || "").toLowerCase();
    const rawAthId = String(a.athlete_id || a.user_id || a.id || "").toLowerCase();
    const cleanAthId = rawAthId.replace(/^ath_/, "");

    const isMatchingPlayerStat = (ps: any) => {
      if (!ps) return false;
      const rawPsId = String(ps.athlete_id || ps.user_id || ps.id || "").toLowerCase();
      const cleanPsId = rawPsId.replace(/^ath_/, "");
      if (cleanAthId && cleanPsId && cleanAthId === cleanPsId) return true;
      const psName = (ps.player_name || ps.name || ps.athlete_name || ps.full_name || "").toLowerCase().trim();
      if (athleteName && psName && athleteName === psName) return true;
      return false;
    };

    const matchingMatches = (matchesList || []).filter((m) =>
      m.player_stats?.some(isMatchingPlayerStat)
    );

    let matchPts = 0;
    let matchReb = 0;
    let matchAst = 0;
    let matchStl = 0;
    let matchBlk = 0;
    let matchTo = 0;
    let matchFgm = 0;
    let matchFga = 0;
    let matchCount = matchingMatches.length;
    let matchTrends: number[] = [];
    let matchWins = 0;
    let matchPodiums = 0;
    let best50mFree = "";
    let best100mFree = "";
    let best200mFree = "";
    let best100mTrack = "";
    let best200mTrack = "";
    let matchKills = 0;
    let matchBlocks = 0;
    let matchAces = 0;
    let matchDigs = 0;

    matchingMatches.forEach((m) => {
      const ps = m.player_stats?.find(isMatchingPlayerStat);
      if (ps) {
        const rawPs = ps as any;
        const pts = Number(rawPs.pts || rawPs.stats?.points || rawPs.stats?.pts || 0);
        matchPts += pts;
        matchReb += Number(rawPs.reb || rawPs.stats?.rebounds || rawPs.stats?.reb || 0);
        matchAst += Number(rawPs.ast || rawPs.stats?.assists || rawPs.stats?.ast || 0);
        matchStl += Number(rawPs.stl || rawPs.stats?.steals || rawPs.stats?.stl || 0);
        matchBlk += Number(rawPs.blk || rawPs.stats?.blocks || rawPs.stats?.blk || 0);
        matchTo += Number(rawPs.to || rawPs.stats?.turnovers || rawPs.stats?.to || 0);
        matchFgm += Number(rawPs.fgm || rawPs.stats?.field_goals_made || rawPs.stats?.fgm || 0);
        matchFga += Number(rawPs.fga || rawPs.stats?.field_goals_attempted || rawPs.stats?.fga || 0);
        if (pts > 0) matchTrends.push(pts);

        // Rank / Placement / Podiums
        const rank = Number(rawPs.placement_rank || rawPs.rank || rawPs.place || rawPs.stats?.placement_rank || rawPs.stats?.rank || 0);
        if (rank === 1) {
          matchWins += 1;
          matchPodiums += 1;
        } else if (rank === 2 || rank === 3) {
          matchPodiums += 1;
        }

        // Times and events (Swimming & Track & Field)
        const rawTime = String(rawPs.finish_time || rawPs.time || rawPs.mark || rawPs.stats?.finish_time || rawPs.stats?.time || rawPs.stats?.mark || "").trim();
        const rawEvent = String(rawPs.event || rawPs.event_name || rawPs.event_key || rawPs.stats?.event || rawPs.stats?.event_name || rawPs.stats?.event_key || "").toLowerCase();

        if (rawTime && rawTime !== "-" && rawTime !== "00:00.00") {
          const timeSec = parseTimeToSeconds(rawTime);
          if (timeSec > 0) {
            if (rawEvent.includes("50m") && (rawEvent.includes("free") || (!rawEvent.includes("back") && !rawEvent.includes("breast") && !rawEvent.includes("fly")))) {
              if (!best50mFree || timeSec < parseTimeToSeconds(best50mFree)) best50mFree = rawTime;
            } else if (rawEvent.includes("100m") && (rawEvent.includes("free") || (!rawEvent.includes("back") && !rawEvent.includes("breast") && !rawEvent.includes("fly")))) {
              if (!best100mFree || timeSec < parseTimeToSeconds(best100mFree)) best100mFree = rawTime;
            } else if (rawEvent.includes("200m") && rawEvent.includes("free")) {
              if (!best200mFree || timeSec < parseTimeToSeconds(best200mFree)) best200mFree = rawTime;
            } else if (rawEvent.includes("100m")) {
              if (!best100mTrack || timeSec < parseTimeToSeconds(best100mTrack)) best100mTrack = rawTime;
            } else if (rawEvent.includes("200m")) {
              if (!best200mTrack || timeSec < parseTimeToSeconds(best200mTrack)) best200mTrack = rawTime;
            } else {
              const dist = Number(rawPs.distance_meters || rawPs.distance_m || 0);
              if (dist === 50 && (!best50mFree || timeSec < parseTimeToSeconds(best50mFree))) {
                best50mFree = rawTime;
              } else if (dist === 100 && (!best100mFree || timeSec < parseTimeToSeconds(best100mFree))) {
                best100mFree = rawTime;
              }
            }
          }
        }

        // Volleyball
        matchKills += Number(rawPs.kills || rawPs.stats?.kills || 0);
        matchBlocks += Number(rawPs.blocks || rawPs.stats?.blocks || 0);
        matchAces += Number(rawPs.service_aces || rawPs.aces || rawPs.stats?.service_aces || 0);
        matchDigs += Number(rawPs.digs || rawPs.stats?.digs || 0);
      }
    });

    const storedGp = Number(a.averages?.games_played ?? a.stats?.games_played ?? 0);
    const storedPpg = Number(a.averages?.ppg ?? a.stats?.ppg ?? (a.pts ? Number(a.pts) : 0));
    const storedRpg = Number(a.averages?.rpg ?? a.stats?.rpg ?? (a.reb ? Number(a.reb) : 0));
    const storedApg = Number(a.averages?.apg ?? a.stats?.apg ?? (a.ast ? Number(a.ast) : 0));
    const storedSpg = Number(a.averages?.spg ?? a.stats?.spg ?? (a.stl ? Number(a.stl) : 0));
    const storedBpg = Number(a.averages?.bpg ?? a.stats?.bpg ?? (a.blk ? Number(a.blk) : 0));
    const storedTpg = Number(a.averages?.tpg ?? a.stats?.tpg ?? (a.to ? Number(a.to) : 0));
    const storedFgPct = Number(a.averages?.fg_percentage ?? a.stats?.fg_percentage ?? a.stats?.fg_pct ?? (a.fg_pct ? Number(a.fg_pct) : 0));
    const storedPer = Number(a.averages?.per_score ?? a.stats?.per ?? a.per ?? 0);

    let gp = matchCount > 0 ? (storedGp > 0 ? storedGp + matchCount : matchCount) : storedGp;
    let ppg = storedPpg;
    let rpg = storedRpg;
    let apg = storedApg;
    let spg = storedSpg;
    let bpg = storedBpg;
    let tpg = storedTpg;
    let fgPct = storedFgPct;
    let per = storedPer;

    const wins = Math.max(Number(a.averages?.wins ?? a.stats?.wins ?? 0), matchWins);
    const podiums = Math.max(Number(a.averages?.podiums_count ?? a.stats?.podiums_count ?? 0), matchPodiums);
    const pb50mFree = best50mFree || a.averages?.pb_50m_free || a.stats?.pb_50m_free;
    const pb100mFree = best100mFree || a.averages?.pb_100m_free || a.stats?.pb_100m_free;
    const pb200mFree = best200mFree || a.averages?.pb_200m_free || a.stats?.pb_200m_free;
    const pb100mTrack = best100mTrack || a.averages?.pb_100m || a.stats?.pb_100m;
    const pb200mTrack = best200mTrack || a.averages?.pb_200m || a.stats?.pb_200m;

    if (matchCount > 0 && (matchPts > 0 || matchReb > 0 || matchAst > 0 || matchStl > 0)) {
      if (storedGp > 0) {
        ppg = Math.round(((storedPpg * storedGp + matchPts) / gp) * 10) / 10;
        rpg = Math.round(((storedRpg * storedGp + matchReb) / gp) * 10) / 10;
        apg = Math.round(((storedApg * storedGp + matchAst) / gp) * 10) / 10;
        spg = Math.round(((storedSpg * storedGp + matchStl) / gp) * 10) / 10;
        bpg = Math.round(((storedBpg * storedGp + matchBlk) / gp) * 10) / 10;
        tpg = Math.round(((storedTpg * storedGp + matchTo) / gp) * 10) / 10;
      } else {
        ppg = Math.round((matchPts / matchCount) * 10) / 10;
        rpg = Math.round((matchReb / matchCount) * 10) / 10;
        apg = Math.round((matchAst / matchCount) * 10) / 10;
        spg = Math.round((matchStl / matchCount) * 10) / 10;
        bpg = Math.round((matchBlk / matchCount) * 10) / 10;
        tpg = Math.round((matchTo / matchCount) * 10) / 10;
      }
      if (matchFga > 0) {
        fgPct = Math.round((matchFgm / matchFga) * 100);
      }
    }

    if (!per && ppg > 0) {
      per = Math.round((ppg * 1.2 + rpg * 1.0 + apg * 1.5) * 10) / 10;
    }

    const mergedAverages = {
      ...a.averages,
      ppg, rpg, apg, spg, bpg, tpg, fg_percentage: fgPct, games_played: gp, wins, podiums_count: podiums,
      pb_50m_free: pb50mFree,
      pb_100m_free: pb100mFree,
      pb_200m_free: pb200mFree,
      pb_100m: pb100mTrack,
      pb_200m: pb200mTrack,
      per_score: per,
    };
    const mergedStats = {
      ...a.stats,
      ppg, rpg, apg, spg, bpg, tpg, fg_pct: fgPct, fg_percentage: fgPct, games_played: gp, wins, podiums_count: podiums,
      pb_50m_free: pb50mFree,
      pb_100m_free: pb100mFree,
      pb_200m_free: pb200mFree,
      pb_100m: pb100mTrack,
      pb_200m: pb200mTrack,
      per_score: per,
    };

    // Dynamic competencies strictly derived from verified match stats
    const dynamicCompetencies = calculateDynamicRadarCompetencies({
      ...a,
      averages: mergedAverages,
      stats: mergedStats,
    });

    // Calculate dynamic rating score accurately derived from player stats
    const dynamicRating = calculatePlayerRating({
      ...a,
      averages: mergedAverages,
      stats: mergedStats,
    });
    let rating = dynamicRating;
    if (rating <= 0 && a.rating_score && a.rating_score !== 85 && a.rating_score !== 75 && a.rating_score !== 99 && a.rating_score !== 96 && a.rating_score !== 94 && a.rating_score !== 93) {
      const hasRealStats = gp > 0 || ppg > 0 || Boolean(pb50mFree || pb100mFree || pb100mTrack || podiums > 0);
      if (hasRealStats) {
        rating = Number(a.rating_score);
      }
    }

    const phys = a.physical_profile || a.physical_attributes || {};
    const heightCm = Number(phys.height_cm ?? a.height_cm ?? 0);
    const weightKg = Number(phys.weight_kg ?? a.weight_kg ?? 0);
    const wingspanCm = Number(phys.wingspan_cm ?? a.wingspan_cm ?? 0);
    const verticalCm = Number(phys.vertical_cm ?? a.vertical_cm ?? 0);

    const heightFt = heightCm > 0
      ? `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}"`
      : (a.biometrics?.height_ft && a.biometrics.height_ft !== "6'0\"" ? a.biometrics.height_ft : "-");

    const weightLbs = weightKg > 0
      ? `${Math.round(weightKg * 2.20462)} lbs`
      : (a.biometrics?.weight_lbs && a.biometrics.weight_lbs !== "175 lbs" ? a.biometrics.weight_lbs : "-");

    const wingspanFt = wingspanCm > 0
      ? `${Math.floor(wingspanCm / 30.48)}'${Math.round((wingspanCm % 30.48) / 2.54)}"`
      : (a.biometrics?.wingspan_ft && a.biometrics.wingspan_ft !== "6'2\"" ? a.biometrics.wingspan_ft : "-");

    const verticalIn = verticalCm > 0
      ? `${Math.round(verticalCm / 2.54)}"`
      : (a.biometrics?.vertical_jump_in && a.biometrics.vertical_jump_in !== "30\"" ? a.biometrics.vertical_jump_in : "-");

    const rawTrends = a.scoring_trends_last_10;
    const trends = Array.isArray(rawTrends) && rawTrends.length > 0 ? rawTrends : (matchTrends.length > 0 ? matchTrends : (ppg > 0 ? [ppg] : []));

    return {
      athlete_id: a.athlete_id || a.user_id || `ath_${Date.now()}`,
      user_id: a.user_id || a.athlete_id || "",
      full_name: a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || 'Athlete',
      birthdate: a.birthdate || a.dob || "-",
      position_or_event: a.position || "Athlete",
      location_province: a.province || a.location || "Unassigned",
      team_name: a.team_name || "Team",
      rating_score: rating,
      sport_category: (a.sport_type || a.sport_category || "BASKETBALL").toUpperCase() as any,
      biometrics: {
        height_ft: heightFt,
        weight_lbs: weightLbs,
        wingspan_ft: wingspanFt,
        vertical_jump_in: verticalIn,
      },
      averages: {
        ...(a.stats || {}),
        ...(a.averages || {}),
        ppg: ppg,
        rpg: rpg,
        apg: apg,
        per_score: per,
        games_played: gp,
        wins: wins,
        // Volleyball stats
        kills: matchKills || (a.averages?.kills ?? a.averages?.spike_kills ?? a.stats?.kills ?? a.stats?.spike_kills ?? 0),
        spike_kills: matchKills || (a.averages?.spike_kills ?? a.averages?.kills ?? a.stats?.spike_kills ?? a.stats?.kills ?? 0),
        blocks: matchBlocks || (a.averages?.blocks ?? a.averages?.block_points ?? a.stats?.blocks ?? a.stats?.block_points ?? 0),
        block_points: matchBlocks || (a.averages?.block_points ?? a.averages?.blocks ?? a.stats?.block_points ?? a.stats?.blocks ?? 0),
        aces: matchAces || (a.averages?.aces ?? a.averages?.service_aces ?? a.stats?.aces ?? a.stats?.service_aces ?? 0),
        service_aces: matchAces || (a.averages?.service_aces ?? a.averages?.aces ?? a.stats?.service_aces ?? a.stats?.aces ?? 0),
        digs: matchDigs || (a.averages?.digs ?? a.stats?.digs ?? 0),
        assists: a.averages?.assists ?? a.stats?.assists ?? 0,
        spike_accuracy: a.averages?.spike_accuracy ?? a.stats?.spike_accuracy ?? 0,
        service_errors: a.averages?.service_errors ?? a.stats?.service_errors ?? 0,
        // Track & Swimming stats
        pb_100m: pb100mTrack,
        pb_200m: pb200mTrack,
        reaction_time_s: a.averages?.reaction_time_s || a.stats?.reaction_time_s,
        win_rate_pct: a.averages?.win_rate_pct ?? a.stats?.win_rate_pct,
        pb_50m_free: pb50mFree,
        pb_100m_free: pb100mFree,
        pb_200m_free: pb200mFree,
        swim_index_score: a.averages?.swim_index_score ?? a.stats?.swim_index_score,
        podiums_count: podiums,
        fg_percentage: Number(a.averages?.fg_percentage ?? a.stats?.fg_pct ?? 0),
        three_pt_percentage: Number(a.averages?.three_pt_percentage ?? a.stats?.three_pct ?? 0),
        ft_percentage: Number(a.averages?.ft_percentage ?? a.stats?.ft_pct ?? 0),
      },
      workload_analytics: a.workload || a.workload_analytics || {
        target_7day_effort_pts: 0,
        current_7day_acute_load: 0,
        current_28day_chronic_load: 0,
        calculated_acwr: 0,
        workout_score: 0,
        fatigue_meter: 0,
        routine_score: 0,
        body_stress_pts: 0,
      },
      radar_competencies: dynamicCompetencies || a.radar_competencies || undefined,
      scoring_trends_last_10: trends,
      eligibility_documents: {
        psa_verified: Boolean(a.eligibility_documents?.psa_verified || a.documents?.psa_birth_certificate?.status === 'Verified'),
        residency_verified: Boolean(a.eligibility_documents?.proof_of_residency || a.eligibility_documents?.residency_verified || a.documents?.proof_of_residency?.status === 'Verified'),
      },
      player_status: a.player_status || a.playerStatus || 'Active',
      playerStatus: a.player_status || a.playerStatus || 'Active',
      injury_notes: a.injury_notes || a.injuryNotes || '',
      injuryNotes: a.injury_notes || a.injuryNotes || '',
      excel_tags: a.excel_tags || a.excelTags || a.specialties || [],
      excelTags: a.excel_tags || a.excelTags || a.specialties || [],
      specialties: a.excel_tags || a.excelTags || a.specialties || [],
    };
  };

  // Instant cache hydration on mount (<10ms) scoped to authenticated coach
  useEffect(() => {
    (async () => {
      try {
        const token = await getStoredAuthToken();
        let currentUid = "";
        let currentEmail = "";
        if (token && token.includes(".")) {
          try {
            const base64Url = token.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            let decoded = "";
            if (typeof atob === "function") {
              decoded = atob(base64);
            } else {
              const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
              let str = base64.replace(/=+$/, "");
              let output = "";
              for (let bc = 0, bs = 0, buffer: any, idx = 0; (buffer = str.charAt(idx++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
                buffer = chars.indexOf(buffer);
              }
              decoded = output;
            }
            const payload = JSON.parse(decoded);
            currentUid = String(payload.uid || payload.user_id || payload.sub || "").replace(/^coach_/, "").toLowerCase();
            currentEmail = String(payload.email || "").toLowerCase();
          } catch {}
        }

        const raw = await AsyncStorage.getItem(COACH_DASHBOARD_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw);
          const cachedCoachId = String(cached.coach?.user_id || cached.coach?.coach_id || "").replace(/^coach_/, "").toLowerCase();
          const cachedEmail = String(cached.coach?.email || "").toLowerCase();

          // Only hydrate if the cache strictly matches the currently authenticated coach
          const isSameCoach = Boolean(
            (currentUid && cachedCoachId && currentUid === cachedCoachId) ||
            (currentEmail && cachedEmail && currentEmail === cachedEmail)
          );

          if (!isSameCoach) {
            // Stale cache from another coach session - discard immediately
            await AsyncStorage.removeItem(COACH_DASHBOARD_CACHE_KEY).catch(() => null);
            return;
          }

          if (cached.coach) setCoach(cached.coach);
          if (cached.coachProfile) setCoachProfile(cached.coachProfile);
          if (Array.isArray(cached.teams) && cached.teams.length > 0) {
            setTeams(cached.teams);
            if (!selectedTeamId && cached.teams[0]?.team_id) {
              setSelectedTeamId(cached.teams[0].team_id);
            }
          }
          if (Array.isArray(cached.athletesPool) && cached.athletesPool.length > 0) {
            setAthletesPool(cached.athletesPool);
            setIsDashboardLoading(false);
          }
          if (Array.isArray(cached.matchHistoryList) && cached.matchHistoryList.length > 0) {
            setMatchHistoryList(cached.matchHistoryList);
          }
          if (Array.isArray(cached.perfAthletes) && cached.perfAthletes.length > 0) {
            setPerfAthletes(cached.perfAthletes);
            if (cached.perfAthletes[0]) {
              setSelectedPerfAthlete(cached.perfAthletes[0]);
            }
          }
          if (Array.isArray(cached.dynamicSports) && cached.dynamicSports.length > 0) {
            const sanitized = cached.dynamicSports.filter((s: string) => {
              const u = String(s).toUpperCase().trim();
              return u !== 'PICKLEBALL';
            });
            if (sanitized.length > 0) {
              setDynamicSports(sanitized);
            }
          }

          // Instantly dismiss loading screen if any cached data is available (<10ms)
          if (cached.coach || cached.coachProfile || (Array.isArray(cached.teams) && cached.teams.length > 0)) {
            setIsDashboardLoading(false);
          }
        }
      } catch {}
    })();
  }, []);

  // Live Backend Data Fetching on Mount & Refresh
  const fetchDashboardDataRef = React.useRef<(forceFresh?: boolean) => Promise<void>>(() => Promise.resolve());

  useEffect(() => {
    let isMounted = true;

    const withSyncTimeout = <T,>(p: Promise<T>, ms = 8000, fallback: T = null as any): Promise<T> => {
      return Promise.race([
        p,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);
    };

    const hydrationTimer = setTimeout(() => {
      if (isMounted) {
        setIsDashboardLoading(false);
      }
    }, 8500);

    const fetchCoachDashboardData = async (forceFresh = false) => {
      try {
        if (forceFresh) {
          clearAuthMicroCache();
          clearFirebaseClientCaches();
          await AsyncStorage.removeItem(COACH_DASHBOARD_CACHE_KEY).catch(() => null);
        }
        const [
          profileRes,
          teamsRes,
          syncRes,
          matchesRes,
          coachAthletesRes,
          notifsRes,
          proposalsRes,
          inquiriesRes,
          sportsRes,
          offlineMatches,
          offlineAthletes,
          offlineProfileRes,
          offlineTeams,
        ]: [any, any, any, any, any, any, any, any, any, any, any, any, any] = await Promise.all([
          withSyncTimeout(requestAuthenticatedJson("/coaches/profile", "GET", undefined, forceFresh).catch(() => null)),
          withSyncTimeout(requestAuthenticatedJson("/teams", "GET", undefined, forceFresh).catch(() => null)),
          withSyncTimeout(requestAuthenticatedJson("/sync/coach-snapshot", "GET", undefined, forceFresh).catch(() => null)),
          withSyncTimeout(requestAuthenticatedJson("/matches", "GET", undefined, forceFresh).catch(() => null)),
          withSyncTimeout(requestAuthenticatedJson("/coaches/athletes", "GET", undefined, forceFresh).catch(() => null)),
          withSyncTimeout(requestAuthenticatedJson("/notifications", "GET", undefined, forceFresh).catch(() => null)),
          withSyncTimeout(requestAuthenticatedJson("/scouting/proposals/list", "GET", undefined, forceFresh).catch(() => null)),
          withSyncTimeout(requestAuthenticatedJson("/inquiries", "GET", undefined, forceFresh).catch(() => null)),
          withSyncTimeout(getSportsOfflineFirst(forceFresh).catch(() => []), 6000, []),
          withSyncTimeout(getMatchesOfflineFirst(forceFresh).catch(() => []), 2000, []),
          withSyncTimeout(getAthletesOfflineFirst(undefined, forceFresh).catch(() => []), 1500, []),
          withSyncTimeout(getCoachProfileOfflineFirst().catch(() => null), 1500, null),
          withSyncTimeout(getTeamsOfflineFirst(forceFresh).catch(() => []), 2000, []),
        ]);

        const allTeamsRes: any = null;

        if (isMounted) {
          // Process Notifications (deduplicated by unique notification ID)
          const rawNotifs: any[] = Array.isArray(notifsRes?.notifications)
            ? [...notifsRes.notifications]
            : Array.isArray(notifsRes)
            ? [...notifsRes]
            : [];

          const rawInquiries: any[] = Array.isArray(inquiriesRes?.inquiries)
            ? inquiriesRes.inquiries
            : Array.isArray(inquiriesRes)
            ? inquiriesRes
            : [];

          const effectiveCoachId = coach?.coach_id || coach?.user_id || currentUser?.coachId || currentUser?.uid;
          rawInquiries.forEach((inq: any) => {
            const inqId = inq.scout_id || inq.inquiry_id || inq.id;
            const isSentByCoach = inq.is_sender === true || inq.sender_role === "Coach" || inq.initiated_by === effectiveCoachId || inq.initiated_by === coach?.user_id || inq.initiated_by === currentUser?.cleanUid;
            const athName = inq.athlete_name || inq.athlete_details?.full_name || "Athlete";
            rawNotifs.push({
              id: inqId,
              notification_id: inqId,
              inquiry_id: inqId,
              scout_id: inqId,
              type: "RECRUITMENT_INQUIRY",
              title: inq.title || (isSentByCoach ? `Recruitment Proposal to ${athName}` : `Inquiry from ${athName}`),
              headline: inq.headline || (isSentByCoach ? `Proposal Sent to ${athName}` : `New Inquiry from ${athName}`),
              message: inq.message || inq.offer_message || (isSentByCoach ? `Proposal sent.` : `${athName} is interested in joining your team.`),
              message_body: inq.message_body || inq.offer_message || (isSentByCoach ? `Proposal sent.` : `${athName} is interested in joining your team.`),
              status: (inq.offer_status || inq.status || "SENT").toUpperCase(),
              offer_status: (inq.offer_status || inq.status || "SENT").toUpperCase(),
              is_read: inq.is_read || false,
              created_at: inq.date_initiated || inq.created_at || new Date().toISOString(),
              actionable: !isSentByCoach,
              is_sender: isSentByCoach,
              athlete_id: inq.athlete_id,
              athlete_name: athName,
            });
          });

          const seenNotifIds = new Set<string>();
          const dedupedNotifs = rawNotifs.filter((n: any) => {
            const nId = String(n.notification_id || n.id || `${n.created_at}_${n.title}`);
            if (seenNotifIds.has(nId)) return false;
            seenNotifIds.add(nId);
            return true;
          });
          setNotificationsList(dedupedNotifs);
          const unreadCount = dedupedNotifs.filter((n: any) => !n.is_read && n.status !== "READ").length;
          setUnreadNotifCount(unreadCount);

          const rawMatchList = (matchesRes?.matches && Array.isArray(matchesRes.matches) && matchesRes.matches.length > 0)
            ? matchesRes.matches
            : (syncRes?.scheduled_matches && Array.isArray(syncRes.scheduled_matches))
            ? syncRes.scheduled_matches
            : [];

          const isDeletedMatch = (m: any) => {
            if (!m) return true;
            if (m.deleted === true || m.is_deleted === true) return true;
            const s = String(m.status || m.audit_status || m.verification_status || "").toUpperCase();
            return s === "DELETED" || s === "REVOKED" || s === "CANCELLED";
          };
          const rawCombined = [...(rawMatchList || [])].filter((m) => !isDeletedMatch(m));
          if (Array.isArray(offlineMatches)) {
            offlineMatches.forEach((om: any) => {
              const omId = om.match_id || om.id;
              if (omId && !isDeletedMatch(om) && !rawCombined.some((m: any) => (m.match_id || m.id) === omId)) {
                rawCombined.unshift(om);
              }
            });
          }

          let liveMatches: MatchHistoryItem[] = [];
          if (rawCombined.length > 0) {
            liveMatches = rawCombined.map((m: any) => {
              const homeScoreMatch = (m.notes || "").match(/\((\d+)\s*-\s*(\d+)\)/);
              const hScore = m.home_score !== undefined ? Number(m.home_score) : (homeScoreMatch ? parseInt(homeScoreMatch[1], 10) : undefined);
              const aScore = m.away_score !== undefined ? Number(m.away_score) : (homeScoreMatch ? parseInt(homeScoreMatch[2], 10) : undefined);
              const homeName = m.home_team_name || m.home_team || (m.notes || "").match(/OCR Logged:\s*([^v]+)\s*vs/i)?.[1]?.trim() || "ATLETA";
              const oppName = m.away_team_name || m.away_team || m.opponent_team_name || "OPPONENT";
              const rawD = m.match_date || m.date_time || m.created_at;
              const d = rawD ? new Date(rawD) : null;
              const dateShort = d && !isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : String(rawD || "RECENT");
              const dateFull = d && !isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : String(rawD || "RECENT");

              const playerStatsArr = Array.isArray(m.player_stats) && m.player_stats.length > 0
                ? m.player_stats
                : (Array.isArray(m.playerStats) ? m.playerStats : []);
              const athIds = m.athlete_ids || m.roster_athletes || m.rosterAthletes || playerStatsArr.map((p: any) => p.athlete_id).filter(Boolean);

              const sportUpper = (m.sport_type || m.sport_category || "BASKETBALL").toUpperCase();
              const isTimed = sportUpper.includes("SWIM") || sportUpper.includes("TRACK") || sportUpper.includes("FIELD");
              const cleanMeet = (m.game_name || m.match_name || "").replace(/\s*vs\s*OPPONENT.*$/i, "").trim();

              // Team-level event title for Dashboard & Team Match History (individual events are attached per-player in athleteFilteredMatches)
              let eventTitle = "";
              if (cleanMeet && !cleanMeet.toLowerCase().includes("vs")) {
                if (homeName && oppName && oppName !== "OPPONENT" && oppName !== "OPPONENT TEAM") {
                  eventTitle = `${cleanMeet} • ${homeName} vs ${oppName}`;
                } else if (homeName && homeName !== "ATLETA" && homeName !== "ATLETA VARSITY") {
                  eventTitle = `${cleanMeet} • ${homeName}`;
                } else {
                  eventTitle = cleanMeet;
                }
              } else if (homeName && oppName) {
                eventTitle = `${homeName} vs ${oppName}`;
              } else {
                eventTitle = cleanMeet || `${homeName || "Team"} Meet`;
              }

              let summaryScore = hScore !== undefined && aScore !== undefined ? `${hScore} - ${aScore}` : (m.notes || (m.game_result === "WIN" ? "FINAL WIN" : "FINAL LOSS"));
              if (isTimed) {
                summaryScore = hScore !== undefined && aScore !== undefined ? `${hScore} - ${aScore}` : "Official Meet Results";
              }

              let badgeText = m.game_result ? `RESULT ${String(m.game_result).toUpperCase().replace(/^RESULT\s*/, "")}` : (hScore !== undefined && aScore !== undefined && hScore >= aScore ? "RESULT WIN" : (hScore !== undefined && aScore !== undefined ? "RESULT LOSS" : "OFFICIAL"));
              if (isTimed) {
                if (m.game_result && (String(m.game_result).includes("1st") || String(m.game_result).toUpperCase().includes("WIN"))) {
                  badgeText = "1ST PLACE";
                } else if (m.game_result && String(m.game_result).includes("2nd")) {
                  badgeText = "2ND PLACE";
                } else if (m.game_result && String(m.game_result).includes("3rd")) {
                  badgeText = "3RD PLACE";
                } else if (m.is_official) {
                  badgeText = "1ST PLACE";
                } else {
                  badgeText = "COMPLETED";
                }
              }

              return {
                match_id: m.match_id || m.id || `match_${Date.now()}`,
                team_id: m.team_id,
                coach_id: m.coach_id,
                coaching_staff: Array.isArray(m.coaching_staff) ? m.coaching_staff : (m.coach_id ? [m.coach_id] : []),
                match_date: rawD || (d && !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString()),
                date_formatted: dateShort,
                full_date: dateFull,
                date_group: "MATCH LOGS",
                event_or_opponent: eventTitle,
                game_name: m.game_name || m.match_name,
                match_name: m.match_name || m.game_name,
                location: m.location,
                score_or_time_summary: summaryScore,
                sport_category: sportUpper,
                result_badge_text: badgeText,
                is_official: m.is_official !== false,
                home_team: homeName,
                away_team: oppName,
                home_score: isTimed ? undefined : hScore,
                away_score: isTimed ? undefined : aScore,
                athlete_ids: athIds,
                roster_athletes: athIds,
                player_stats: playerStatsArr,
                playerStats: playerStatsArr,
                coach_notes: m.notes ? [m.notes] : ["Match recorded."],
              };
            });
            setMatchHistoryList(liveMatches);
          } else {
            setMatchHistoryList([]);
          }

          let tokenUid = "";
          let tokenEmail = "";
          try {
            const token = await getStoredAuthToken();
            if (token && token.includes(".")) {
              const base64Url = token.split(".")[1];
              const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
              let decoded = "";
              if (typeof atob === "function") {
                decoded = atob(base64);
              } else {
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
                let str = base64.replace(/=+$/, "");
                let output = "";
                for (let bc = 0, bs = 0, buffer: any, idx = 0; (buffer = str.charAt(idx++)); ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4) ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)))) : 0) {
                  buffer = chars.indexOf(buffer);
                }
                decoded = output;
              }
              const payload = JSON.parse(decoded);
              tokenUid = String(payload.uid || payload.user_id || payload.sub || "").replace(/^coach_/, "").toLowerCase();
              tokenEmail = String(payload.email || "").toLowerCase();
            }
          } catch {}

          const isCoachMatch = (p: any) => {
            if (!p || typeof p !== "object") return false;
            const pUid = String(p.user_id || p.uid || p.coach_id || "").replace(/^coach_/, "").toLowerCase();
            const pEmail = String(p.email || "").toLowerCase();
            if (tokenUid && pUid && pUid === tokenUid) return true;
            if (tokenEmail && pEmail && pEmail === tokenEmail) return true;
            return !tokenUid && !tokenEmail;
          };

          const validProfileRes = isCoachMatch(profileRes) ? profileRes : null;
          const validOfflineProfileRes = isCoachMatch(offlineProfileRes) ? offlineProfileRes : null;

          if (offlineProfileRes && !validOfflineProfileRes) {
            AsyncStorage.removeItem("atleta_offline_coach_profile_cache").catch(() => null);
          }

          const currentCoachId = tokenUid
            ? (tokenUid.startsWith("coach_") ? tokenUid : `coach_${tokenUid}`)
            : (validProfileRes?.coach_id || validProfileRes?.user_id || validOfflineProfileRes?.coach_id || coach?.coach_id || "");
          const cleanEffectiveCoachId = String(currentCoachId).replace(/^coach_/, "").toLowerCase();

          const isOwnedByCoach = (ath: any) => {
            if (!cleanEffectiveCoachId) return true;
            const athCoachId = String(ath.coach_id || ath.coach_scout_id || ath.recruited_by_coach_id || ath.added_by_coach_id || ath.recruited_by || "").replace(/^coach_/, "").toLowerCase();
            return !athCoachId || athCoachId === cleanEffectiveCoachId;
          };

          const rawCoachAthletes: any[] = Array.isArray(coachAthletesRes?.athletes) && coachAthletesRes.athletes.length > 0
            ? coachAthletesRes.athletes
            : Array.isArray(syncRes?.handled_athletes) && syncRes.handled_athletes.length > 0
            ? syncRes.handled_athletes.filter(isOwnedByCoach)
            : (Array.isArray(offlineAthletes) ? offlineAthletes.filter(isOwnedByCoach) : []);

          // Strictly scope teams to the coach's authenticated account (falling back to offlineTeams if network failed)
          const incomingCoachTeams: any[] = (Array.isArray(teamsRes) && teamsRes.length > 0)
            ? teamsRes
            : (Array.isArray(teamsRes?.teams) && teamsRes.teams.length > 0)
            ? teamsRes.teams
            : (Array.isArray(offlineTeams) ? offlineTeams : []);

          const managedTeamIdsList = new Set<string>([
            ...(Array.isArray(validProfileRes?.teams_managed) ? validProfileRes.teams_managed : []),
            ...(Array.isArray(validOfflineProfileRes?.teams_managed) ? validOfflineProfileRes.teams_managed : []),
            ...(Array.isArray((coachProfile as any)?.teams_managed) ? (coachProfile as any).teams_managed : []),
          ].map((id: any) => String(id).toLowerCase()));

          const rawTeamsList: any[] = incomingCoachTeams.filter((t: any) => {
            if (!cleanEffectiveCoachId) return false;
            const tName = String(t.team_name || "").toLowerCase().trim();
            if (tName.includes("opponent") || tName.includes("various schools")) return false;
            const teamIdStr = String(t.team_id || "").toLowerCase();
            if (teamIdStr && managedTeamIdsList.has(teamIdStr)) return true;
            const teamCoachId = String(t.coach_id || t.coach_scout_id || "").replace(/^coach_/, "").toLowerCase();
            if (teamCoachId) return teamCoachId === cleanEffectiveCoachId;
            if (Array.isArray(t.coaching_staff)) {
              return t.coaching_staff.some((cs: string) => String(cs).replace(/^coach_/, "").toLowerCase() === cleanEffectiveCoachId);
            }
            return false;
          });

          const normalizeId = (id?: string) => (id || '').replace(/^ath_/, '').trim();

          const richCoachAthletesMap = new Map<string, any>();
          if (Array.isArray(syncRes?.handled_athletes)) {
            syncRes.handled_athletes.forEach((ha: any) => {
              const k = normalizeId(ha.athlete_id || ha.user_id);
              if (k) richCoachAthletesMap.set(k, ha);
            });
          }
          if (Array.isArray(coachAthletesRes?.athletes)) {
            coachAthletesRes.athletes.forEach((ca: any) => {
              const k = normalizeId(ca.athlete_id || ca.user_id);
              if (k) {
                const prev = richCoachAthletesMap.get(k) || {};
                richCoachAthletesMap.set(k, { ...prev, ...ca });
              }
            });
          }
          if (Array.isArray(offlineAthletes)) {
            offlineAthletes.forEach((oa: any) => {
              if (isOwnedByCoach(oa)) {
                const k = normalizeId(oa.athlete_id || oa.user_id);
                if (k) {
                  const prev = richCoachAthletesMap.get(k) || {};
                  richCoachAthletesMap.set(k, { ...prev, ...oa });
                }
              }
            });
          }
          rawCoachAthletes.forEach((ca: any) => {
            const k = normalizeId(ca.athlete_id || ca.user_id);
            if (k) {
              const prev = richCoachAthletesMap.get(k) || {};
              richCoachAthletesMap.set(k, { ...prev, ...ca });
            }
          });

          // Ingest scouted proposals so any newly scouted player shows up immediately on coach dashboard
          const rawProposals: any[] = Array.isArray(proposalsRes)
            ? proposalsRes
            : Array.isArray(proposalsRes?.proposals)
            ? proposalsRes.proposals
            : [];

          rawProposals.forEach((p: any) => {
            const pAthId = p.athlete_id || (p.athlete_details && p.athlete_details.athlete_id);
            const pNorm = normalizeId(pAthId);
            if (!pNorm) return;
            const aDetails = p.athlete_details || {};
            const fName = aDetails.first_name || '';
            const lName = aDetails.last_name || '';
            const fullName = p.athlete_name || (fName ? `${fName} ${lName}`.trim() : 'Athlete');

            const scoutObj = {
              athlete_id: pAthId || `ath_${pNorm}`,
              user_id: pNorm,
              first_name: fName || 'Athlete',
              last_name: lName,
              full_name: fullName,
              sport_type: (p.sport_category || aDetails.sport_type || 'BASKETBALL').toUpperCase(),
              position: aDetails.position || 'Unassigned',
              jersey_number: aDetails.jersey_number || '0',
              coach_id: cleanEffectiveCoachId,
              coach_scout_id: cleanEffectiveCoachId,
              is_scouted: true,
              scout_status: p.offer_status || 'PENDING',
              recruitment_status: p.offer_status === 'ACCEPTED' ? 'Active Roster' : `Scouted (${p.offer_status || 'Pending'})`,
            };

            if (!richCoachAthletesMap.has(pNorm)) {
              richCoachAthletesMap.set(pNorm, scoutObj);
            }
            if (!rawCoachAthletes.some((ca: any) => normalizeId(ca.athlete_id || ca.user_id) === pNorm)) {
              rawCoachAthletes.push(scoutObj);
            }
          });

          const processedTeams: Team[] = rawTeamsList.map((t: any) => {
            const rawRoster: any[] = Array.isArray(t.roster_list) ? t.roster_list : Array.isArray(t.athletes) ? t.athletes : [];
            const rosterSeen = new Set<string>();
            const hydratedRoster: RosterAthlete[] = [];

            // 1. Hydrate existing items in team roster_list
            rawRoster.forEach((ath: any) => {
              const athId = typeof ath === 'string' ? ath : (ath.athlete_id || ath.user_id);
              const k = normalizeId(athId);
              if (!k || rosterSeen.has(k)) return;
              rosterSeen.add(k);

              const rich = richCoachAthletesMap.get(k) || {};
              const athObj = typeof ath === 'object' && ath !== null ? ath : {};
              const fName = athObj.first_name || rich.first_name || '';
              const lName = athObj.last_name || rich.last_name || '';
              const fullName = athObj.full_name || rich.full_name || (fName ? `${fName} ${lName}`.trim() : (athObj.name || rich.name || 'Athlete'));

              hydratedRoster.push({
                athlete_id: athObj.athlete_id || rich.athlete_id || (k ? `ath_${k}` : `ath_${Date.now()}`),
                user_id: athObj.user_id || rich.user_id || k,
                first_name: fName || 'Athlete',
                last_name: lName,
                full_name: fullName,
                sport_type: (athObj.sport_type || rich.sport_type || t.sport_type || 'BASKETBALL').toUpperCase() as Team["sport_type"],
                position: athObj.position || rich.position || 'Unassigned',
                jersey_number: athObj.jersey_number !== undefined && athObj.jersey_number !== null ? String(athObj.jersey_number) : (rich.jersey_number !== undefined && rich.jersey_number !== null ? String(rich.jersey_number) : '0'),
                is_eligibility_verified: athObj.is_eligibility_verified ?? rich.is_eligibility_verified ?? false,
                avatar_url: athObj.avatar_url || rich.avatar_url || undefined,
                birthdate: athObj.birthdate || rich.birthdate,
                province: athObj.province || rich.province,
                location: athObj.location || rich.location,
                rating_score: calculatePlayerRating(rich) || calculatePlayerRating(athObj) || Number(athObj.rating_score || rich.rating_score || 0),
                biometrics: athObj.biometrics || rich.biometrics || undefined,
                radar_competencies: athObj.radar_competencies || rich.radar_competencies || undefined,
                physical_profile: athObj.physical_profile || rich.physical_profile || athObj.physical_attributes || rich.physical_attributes,
                physical_attributes: athObj.physical_attributes || rich.physical_attributes || athObj.physical_profile || rich.physical_profile,
                averages: athObj.averages || rich.averages || athObj.stats || rich.stats,
                stats: athObj.stats || rich.stats || athObj.averages || rich.averages,
                scoring_trends_last_10: athObj.scoring_trends_last_10 || rich.scoring_trends_last_10,
                eligibility_documents: athObj.eligibility_documents || rich.eligibility_documents,
                documents: athObj.documents || rich.documents,
                workload_analytics: athObj.workload_analytics || rich.workload_analytics || undefined,
              });
            });

            // 2. Include any coach athletes matching this team ID or name
            rawCoachAthletes.forEach((ha: any) => {
              const k = normalizeId(ha.athlete_id || ha.user_id);
              if (!k || rosterSeen.has(k)) return;
              const matchesTeam =
                (ha.team_id && ha.team_id === t.team_id) ||
                (ha.team_name && t.team_name && ha.team_name.toLowerCase().includes(t.team_name.toLowerCase())) ||
                (Array.isArray(ha.team_ids) && ha.team_ids.includes(t.team_id)) ||
                (Array.isArray(ha.teams) && ha.teams.some((tm: any) => tm.team_id === t.team_id || (tm.team_name && t.team_name && tm.team_name.toLowerCase() === t.team_name.toLowerCase())));
              if (matchesTeam) {
                rosterSeen.add(k);
                const rich = richCoachAthletesMap.get(k) || {};
                const fName = ha.first_name || rich.first_name || '';
                const lName = ha.last_name || rich.last_name || '';
                const fullName = ha.full_name || rich.full_name || (fName ? `${fName} ${lName}`.trim() : 'Athlete');

                hydratedRoster.push({
                  athlete_id: ha.athlete_id || rich.athlete_id || `ath_${k}`,
                  user_id: ha.user_id || rich.user_id || k,
                  first_name: fName || 'Athlete',
                  last_name: lName,
                  full_name: fullName,
                  sport_type: (ha.sport_type || rich.sport_type || t.sport_type || 'BASKETBALL').toUpperCase() as Team["sport_type"],
                  position: ha.position || rich.position || 'Unassigned',
                  jersey_number: ha.jersey_number !== undefined && ha.jersey_number !== null ? String(ha.jersey_number) : (rich.jersey_number !== undefined && rich.jersey_number !== null ? String(rich.jersey_number) : '0'),
                  is_eligibility_verified: ha.is_eligibility_verified ?? rich.is_eligibility_verified ?? false,
                  avatar_url: ha.avatar_url || rich.avatar_url || undefined,
                  birthdate: ha.birthdate || rich.birthdate,
                  province: ha.province || rich.province,
                  location: ha.location || rich.location,
                  rating_score: calculatePlayerRating(rich) || calculatePlayerRating(ha) || Number(ha.rating_score || rich.rating_score || 0),
                  biometrics: ha.biometrics || rich.biometrics || undefined,
                  radar_competencies: ha.radar_competencies || rich.radar_competencies || undefined,
                  physical_profile: ha.physical_profile || rich.physical_profile || ha.physical_attributes || rich.physical_attributes,
                  physical_attributes: ha.physical_attributes || rich.physical_attributes || ha.physical_profile || rich.physical_profile,
                  averages: ha.averages || rich.averages || ha.stats || rich.stats,
                  stats: ha.stats || rich.stats || ha.averages || rich.averages,
                  scoring_trends_last_10: ha.scoring_trends_last_10 || rich.scoring_trends_last_10,
                  eligibility_documents: ha.eligibility_documents || rich.eligibility_documents,
                  documents: ha.documents || rich.documents,
                  workload_analytics: ha.workload_analytics || rich.workload_analytics || undefined,
                });
              }
            });

            return {
              team_id: t.team_id || `team_${Date.now()}`,
              team_name: t.team_name || "Team",
              sport_type: (t.sport_type?.toUpperCase() || "BASKETBALL") as Team["sport_type"],
              division: t.division || "Elite Division",
              season_record: typeof t.season_record === "object" && t.season_record !== null
                ? t.season_record
                : { wins: Number(t.wins || 0), losses: Number(t.losses || 0) },
              coach_id: t.coach_id || coach.coach_id || coach.user_id,
              roster_list: hydratedRoster,
              created_at: t.created_at || new Date().toISOString(),
            };
          });

          setTeams(processedTeams);
          if (processedTeams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(processedTeams[0].team_id);
          }

          const coachTeamAthletes: any[] = [];
          processedTeams.forEach((t) => {
            if (Array.isArray(t.roster_list)) {
              t.roster_list.forEach((ath: any) => {
                coachTeamAthletes.push({
                  ...ath,
                  team_id: t.team_id,
                  team_name: t.team_name,
                  sport_type: t.sport_type,
                });
              });
            }
          });

          const unassignedCoachAthletes: any[] = rawCoachAthletes
            .filter((ha: any) => {
              const haKey = normalizeId(ha.athlete_id || ha.user_id);
              return !coachTeamAthletes.some((ca) => normalizeId(ca.athlete_id || ca.user_id) === haKey);
            })
            .map((ha: any) => {
              const k = normalizeId(ha.athlete_id || ha.user_id);
              const rich = (k ? richCoachAthletesMap.get(k) : null) || {};
              return {
                ...ha,
                athlete_id: ha.athlete_id || rich.athlete_id || ha.user_id || (k ? `ath_${k}` : `ath_${Date.now()}`),
                user_id: ha.user_id || rich.user_id || ha.athlete_id || k || '',
                full_name: ha.full_name || rich.full_name || `${ha.first_name || rich.first_name || ''} ${ha.last_name || rich.last_name || ''}`.trim() || 'Athlete',
                sport_type: (ha.sport_type || rich.sport_type || 'BASKETBALL').toUpperCase() as Team["sport_type"],
                position: ha.position || rich.position || 'Unassigned',
                jersey_number: ha.jersey_number !== null && ha.jersey_number !== undefined ? String(ha.jersey_number) : (rich.jersey_number !== null && rich.jersey_number !== undefined ? String(rich.jersey_number) : '0'),
                is_eligibility_verified: Boolean(ha.is_eligibility_verified ?? rich.is_eligibility_verified),
                avatar_url: ha.avatar_url || rich.avatar_url || undefined,
                rating_score: calculatePlayerRating(rich) || calculatePlayerRating(ha) || Number(ha.rating_score || rich.rating_score || 0),
                biometrics: ha.biometrics || rich.biometrics || undefined,
                radar_competencies: ha.radar_competencies || rich.radar_competencies || undefined,
                physical_profile: ha.physical_profile || rich.physical_profile || ha.physical_attributes || rich.physical_attributes,
                physical_attributes: ha.physical_attributes || rich.physical_attributes || ha.physical_profile || rich.physical_profile,
                averages: ha.averages || rich.averages || ha.stats || rich.stats,
                stats: ha.stats || rich.stats || ha.averages || rich.averages,
                scoring_trends_last_10: ha.scoring_trends_last_10 || rich.scoring_trends_last_10,
                eligibility_documents: ha.eligibility_documents || rich.eligibility_documents,
                documents: ha.documents || rich.documents,
                workload_analytics: ha.workload_analytics || rich.workload_analytics || undefined,
              };
            });

          const seenMap = new Map<string, any>();
          for (const a of [...coachTeamAthletes, ...unassignedCoachAthletes]) {
            const k = normalizeId(a.athlete_id || a.user_id);
            if (k) {
              const rawTeamNames = (a.team_name ? a.team_name.split(" • ") : (a.team_names || []))
                .map((n: string) => String(n || "").trim())
                .filter(Boolean);

              if (!seenMap.has(k)) {
                const uniqueNameMap = new Map<string, string>();
                rawTeamNames.forEach((n: string) => {
                  const lower = n.toLowerCase();
                  if (lower !== "unassigned" && lower !== "unassigned / no team" && !lower.includes("opponent") && !lower.includes("various schools") && !uniqueNameMap.has(lower)) {
                    uniqueNameMap.set(lower, n);
                  }
                });
                const dedupedNames = Array.from(uniqueNameMap.values());

                seenMap.set(k, {
                  ...a,
                  team_ids: a.team_id ? [a.team_id] : (a.team_ids || []),
                  team_names: dedupedNames,
                  team_name: dedupedNames.join(" • ") || (a.team_name && a.team_name !== "Unassigned" && !a.team_name.toLowerCase().includes("opponent") ? a.team_name : "Unassigned"),
                  teams: a.team_id ? [{ team_id: a.team_id, team_name: a.team_name }] : (a.teams || []),
                });
              } else {
                const existing = seenMap.get(k);
                const existingTeamIds: string[] = existing.team_ids || (existing.team_id ? [existing.team_id] : []);
                const existingTeamNames: string[] = existing.team_names || (existing.team_name ? existing.team_name.split(" • ") : []);
                const newTeamId = a.team_id;
                const newTeamName = a.team_name;
                const mergedTeamIds = Array.from(new Set([...existingTeamIds, ...(a.team_ids || (newTeamId ? [newTeamId] : []))].filter(Boolean)));

                const uniqueNameMap = new Map<string, string>();
                [...existingTeamNames, ...rawTeamNames, ...(newTeamName ? [newTeamName] : [])].forEach((n: string) => {
                  const clean = String(n || "").trim();
                  const lower = clean.toLowerCase();
                  if (clean && lower !== "unassigned" && lower !== "unassigned / no team" && !lower.includes("opponent") && !lower.includes("various schools") && !uniqueNameMap.has(lower)) {
                    uniqueNameMap.set(lower, clean);
                  }
                });
                const mergedTeamNames = Array.from(uniqueNameMap.values());

                seenMap.set(k, {
                  ...existing,
                  ...a,
                  team_id: existing.team_id || newTeamId,
                  team_ids: mergedTeamIds,
                  team_names: mergedTeamNames,
                  team_name: mergedTeamNames.join(" • ") || "Unassigned",
                  teams: [
                    ...(existing.teams || []),
                    ...(newTeamId && !(existing.teams || []).some((tm: any) => tm.team_id === newTeamId) ? [{ team_id: newTeamId, team_name: newTeamName }] : []),
                  ],
                });
              }
            }
          }
          const allHandledAthletes = Array.from(seenMap.values());
          setAthletesPool(allHandledAthletes);

          let updatedCoachSnapshot: UserCoach | null = null;
          let updatedProfileSnapshot: CoachProfileState | null = null;

          const effectiveProfile = validProfileRes || validOfflineProfileRes;
          if (effectiveProfile || tokenUid || tokenEmail) {
            const fallbackEmailName = (tokenEmail || effectiveProfile?.email || coach.email || "").split("@")[0];
            const fallbackName = fallbackEmailName ? (fallbackEmailName.charAt(0).toUpperCase() + fallbackEmailName.slice(1)) : "Coach";
            const firstName = effectiveProfile?.first_name || fallbackName;
            const lastName = effectiveProfile?.last_name || "";
            const fullName = effectiveProfile?.full_name || (firstName !== "Coach" ? `${firstName} ${lastName}`.trim() : "Coach");
            const rawSport = (effectiveProfile?.sport_type || effectiveProfile?.sports_focus || "BASKETBALL").toUpperCase();
            const sportFocus: CoachProfileState["sports_focus"] =
              rawSport.includes("SWIM")
                ? "SWIMMING"
                : rawSport.includes("TRACK")
                ? "TRACK AND FIELD"
                : rawSport;

            const resolvedAvatar =
              validProfileRes?.avatar_url ||
              (validProfileRes as any)?.profile_image ||
              validOfflineProfileRes?.avatar_url ||
              validOfflineProfileRes?.profile_image ||
              "";

            const updatedCoach: UserCoach = {
              user_id: effectiveProfile?.user_id || tokenUid || coach.user_id || "",
              first_name: firstName,
              last_name: lastName,
              email: effectiveProfile?.email || tokenEmail || coach.email || "",
              contact_number: effectiveProfile?.contact_number || coach.contact_number || "",
              role: "Coach",
              coach_id: currentCoachId || (tokenUid ? `coach_${tokenUid}` : coach.coach_id || ""),
              current_institution: effectiveProfile?.current_institution || "University Athletics",
              athlete_managed: effectiveProfile?.athlete_managed || [],
              avatar_url: resolvedAvatar,
            };
            updatedCoachSnapshot = updatedCoach;
            setCoach(updatedCoach);
            // Keep default filter as "ALL" so all rostered athletes display immediately on dashboard load

            const updatedProfileState: CoachProfileState = {
              coach_id: updatedCoach.coach_id,
              user_id: updatedCoach.user_id,
              first_name: firstName,
              last_name: lastName,
              full_name: fullName,
              email: updatedCoach.email,
              role_title: `${sportFocus} COACH`,
              sports_focus: sportFocus,
              avatar_url: resolvedAvatar,
              current_institution: effectiveProfile?.current_institution || "University Athletics",
              regional_affiliation: effectiveProfile?.regional_affiliation || "",
              national_sports_league: effectiveProfile?.national_sports_league || "",
              regional_affiliations: {
                association_name: effectiveProfile?.regional_affiliation || "",
                office_name: effectiveProfile?.national_sports_league || "",
              },
              credentials: effectiveProfile?.credentials || effectiveProfile?.certifications || [],
              uploaded_documents: effectiveProfile?.uploaded_documents || [],
              system_statistics: {
                total_athletes: allHandledAthletes.length,
                metric_logs: effectiveProfile?.metric_logs || effectiveProfile?.system_statistics?.metric_logs || 0,
              },
              last_updated: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase(),
            };
            updatedProfileSnapshot = updatedProfileState;
            setCoachProfile(updatedProfileState);

            const currentAccStatus = String(effectiveProfile?.account_status || effectiveProfile?.status || "Active");
            setAccountStatus(currentAccStatus);
            if (effectiveProfile?.rejection_reason) {
              setRejectionReason(effectiveProfile.rejection_reason);
            }
          }

          const rawAthletesList: any[] = allHandledAthletes;
          const mappedPerf: AthletePerformanceProfile[] = rawAthletesList.map((a: any) => computeAthletePerformance(a, liveMatches));

          // Merge unassigned handled athletes into mappedPerf if not already present
          if (rawCoachAthletes.length > 0) {
            const existingIds = new Set(mappedPerf.map((p) => p.athlete_id));
            rawCoachAthletes.forEach((ha: any) => {
              const aId = ha.athlete_id || ha.user_id;
              if (!existingIds.has(aId)) {
                mappedPerf.push(computeAthletePerformance(ha, liveMatches));
              }
            });
          }

          if (mappedPerf.length > 0) {
            setPerfAthletes(mappedPerf);
            if (mappedPerf[0]) {
              setSelectedPerfAthlete(mappedPerf[0]);
            }
          } else {
            setPerfAthletes([]);
          }

          let resolvedSportsList: string[] = dynamicSports;
          if (isMounted && sportsRes && sportsRes.length > 0) {
            const seen = new Set<string>();
            const mappedSports: string[] = [];
            sportsRes.forEach((s: any) => {
              if (s.is_active === false || s.active === false) return;
              let raw = String(s.sport_name || s.name || s.id || '').toUpperCase().trim();
              if (raw.includes('TRACK') && raw.includes('FIELD')) {
                raw = 'TRACK AND FIELD';
              }
              if (!raw || seen.has(raw)) return;
              seen.add(raw);
              mappedSports.push(raw);
            });
            if (mappedSports.length > 0) {
              resolvedSportsList = mappedSports;
              setDynamicSports(mappedSports);
              if (activeSportFilter !== "ALL" && !mappedSports.includes(activeSportFilter.toUpperCase())) {
                setActiveSportFilter("ALL");
              }
            }
          }

          // Persist snapshot to AsyncStorage for instant next render (<10ms)
          AsyncStorage.setItem(
            COACH_DASHBOARD_CACHE_KEY,
            JSON.stringify({
              coach: updatedCoachSnapshot || coach,
              coachProfile: updatedProfileSnapshot || coachProfile,
              teams: processedTeams,
              athletesPool: allHandledAthletes,
              matchHistoryList: liveMatches,
              perfAthletes: mappedPerf,
              dynamicSports: resolvedSportsList,
            })
          ).catch(() => null);
        }
      } catch (err) {
        console.warn("Failed to load coach dashboard live data:", err);
      } finally {
        if (isMounted) {
          setIsDashboardLoading(false);
        }
      }
    };

    fetchDashboardDataRef.current = fetchCoachDashboardData;
    fetchCoachDashboardData();

    const notifInterval = setInterval(async () => {
      try {
        const notifsRes = await requestAuthenticatedJson("/notifications").catch(() => null);
        if (isMounted && notifsRes) {
          const rawNotifs: any[] = Array.isArray(notifsRes?.notifications)
            ? notifsRes.notifications
            : Array.isArray(notifsRes)
            ? notifsRes
            : [];
          const seenNotifIds = new Set<string>();
          const dedupedNotifs = rawNotifs.filter((n: any) => {
            const nId = String(n.notification_id || n.id || `${n.created_at}_${n.title}`);
            if (seenNotifIds.has(nId)) return false;
            seenNotifIds.add(nId);
            return true;
          });
          setNotificationsList(dedupedNotifs);
          const unreadCount = dedupedNotifs.filter((n: any) => !n.is_read && n.status !== "READ").length;
          setUnreadNotifCount(unreadCount);
        }
      } catch {}
    }, 60000);

    return () => {
      isMounted = false;
      clearTimeout(hydrationTimer);
      clearInterval(notifInterval);
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboardDataRef.current(true);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Automatically refresh when switching back to Home tab or Dashboard view
  useEffect(() => {
    if (activeTab === "Home" && activeView === "dashboard") {
      fetchDashboardDataRef.current(false);
    }
  }, [activeTab, activeView]);

  // Real-time listener for coach's scoresheet requests (updates when tournament official fulfills and uploads)
  useEffect(() => {
    const coachId = coach?.coach_id || coach?.user_id;
    if (!coachId) return;

    const unsubscribe = listenToCoachScoresheetRequests(coachId, (requests) => {
      if (!requests || requests.length === 0) return;

      setNotificationsList((prevList) => {
        const updated = [...prevList];

        requests.forEach((req) => {
          const notifId = `req_${req.id}`;
          const isFulfilled = req.status === "fulfilled";
          const matchTitle = (req as any).customGameTitle || (req as any).custom_game_title || req.matchName || (req as any).match_name || (req as any).gameName || `Match ${req.matchId}`;

          const item = {
            id: notifId,
            notification_id: notifId,
            type: "SCORESHEET_SHARED",
            title: isFulfilled ? `Scoresheet Shared: ${matchTitle}` : `Scoresheet Requested: ${matchTitle}`,
            message_body: isFulfilled
              ? `Tournament Official has verified and uploaded the scoresheet for ${matchTitle}. Tap below to view or download.`
              : `Your scoresheet request for ${matchTitle} has been submitted to tournament officials.`,
            message: isFulfilled
              ? `Tournament Official has verified and uploaded the scoresheet for ${matchTitle}. Tap below to view or download.`
              : `Your scoresheet request for ${matchTitle} has been submitted to tournament officials.`,
            match_id: req.matchId,
            matchName: matchTitle,
            scoresheet_url: req.scoresheetUrl || req.scoresheet_url,
            scoresheetUrl: req.scoresheetUrl || req.scoresheet_url,
            status: isFulfilled ? "FULFILLED" : "PENDING",
            is_read: !isFulfilled,
            created_at: req.fulfilledAt || req.createdAt || new Date().toISOString(),
          };

          const existIdx = updated.findIndex(
            (n: any) => (n.notification_id === notifId || n.id === notifId)
          );
          if (existIdx >= 0) {
            updated[existIdx] = { ...updated[existIdx], ...item };
          } else {
            updated.unshift(item);
          }
        });

        const unreadCount = updated.filter((n: any) => !n.is_read && n.status !== "READ").length;
        setUnreadNotifCount(unreadCount);
        return updated;
      });
    });

    return () => unsubscribe();
  }, [coach?.coach_id, coach?.user_id]);

  // Real-time listener for coach's incoming recruitment inquiries & proposals
  useEffect(() => {
    const coachId = coach?.coach_id || coach?.user_id || currentUser?.coachId || currentUser?.uid || currentUser?.cleanUid;
    if (!coachId) return;

    const unsubscribe = listenToCoachInquiries(coachId, (inquiries) => {
      if (!inquiries || inquiries.length === 0) return;

      setNotificationsList((prevList) => {
        const updated = [...prevList];

        inquiries.forEach((inq) => {
          const inqId = inq.scout_id || inq.inquiry_id || inq.id;
          const isSentByCoach = inq.is_sender === true || inq.sender_role === "Coach" || inq.initiated_by === coachId || inq.initiated_by === coach?.user_id || inq.initiated_by === currentUser?.cleanUid;
          const athName = inq.athlete_name || inq.athlete_details?.full_name || "Athlete";

          const item = {
            id: inqId,
            notification_id: inqId,
            inquiry_id: inqId,
            scout_id: inqId,
            type: "RECRUITMENT_INQUIRY",
            title: inq.title || (isSentByCoach ? `Recruitment Proposal to ${athName}` : `Inquiry from ${athName}`),
            headline: inq.headline || (isSentByCoach ? `Proposal Sent to ${athName}` : `New Inquiry from ${athName}`),
            message: inq.message || inq.offer_message || (isSentByCoach ? `Proposal sent.` : `${athName} is interested in joining your team.`),
            message_body: inq.message_body || inq.offer_message || (isSentByCoach ? `Proposal sent.` : `${athName} is interested in joining your team.`),
            status: (inq.offer_status || inq.status || "SENT").toUpperCase(),
            offer_status: (inq.offer_status || inq.status || "SENT").toUpperCase(),
            is_read: inq.is_read || false,
            created_at: inq.date_initiated || inq.created_at || new Date().toISOString(),
            actionable: !isSentByCoach,
            is_sender: isSentByCoach,
            athlete_id: inq.athlete_id,
            athlete_name: athName,
          };

          const existIdx = updated.findIndex(
            (n: any) => (n.inquiry_id || n.scout_id || n.id || n.notification_id) === inqId
          );
          if (existIdx >= 0) {
            updated[existIdx] = { ...updated[existIdx], ...item };
          } else {
            updated.unshift(item);
          }
        });

        const unreadCount = updated.filter((n: any) => !n.is_read && n.status !== "READ").length;
        setUnreadNotifCount(unreadCount);
        return updated;
      });
    });

    return () => unsubscribe();
  }, [coach?.coach_id, coach?.user_id, currentUser?.coachId, currentUser?.uid, currentUser?.cleanUid]);

  // Current Selected Team
  const currentTeam = useMemo(
    () => teams.find((t) => t.team_id === selectedTeamId) || teams[0] || null,
    [teams, selectedTeamId]
  );

  const availableSportCategories = useMemo(() => {
    const sportsSet = new Set<string>();

    // 1. Coach's focused sport and roster/team sports first for quick access
    if (coachProfile?.coach_id && coachProfile?.sports_focus) {
      sportsSet.add(coachProfile.sports_focus.toUpperCase().trim());
    }
    teams.forEach((t) => {
      if (t.sport_type) sportsSet.add(t.sport_type.toUpperCase().trim());
    });
    athletesPool.forEach((a) => {
      if (a.sport_type) sportsSet.add(a.sport_type.toUpperCase().trim());
    });

    // 2. Add all dynamic sports configured in the system
    if (Array.isArray(dynamicSports) && dynamicSports.length > 0) {
      dynamicSports.forEach((s) => {
        if (s) sportsSet.add(s.toUpperCase().trim());
      });
    }

    // 3. Fallback baseline sports to ensure all core sports are always visible
    const baselineSports = ["BASKETBALL", "VOLLEYBALL", "SWIMMING", "TRACK AND FIELD"];
    baselineSports.forEach((s) => sportsSet.add(s));

    return ["ALL", ...Array.from(sportsSet)];
  }, [coachProfile?.coach_id, coachProfile?.sports_focus, teams, athletesPool, dynamicSports]);

  // Ensure activeSportFilter is reset if current filter is not in available categories
  useEffect(() => {
    if (activeSportFilter !== "ALL" && !availableSportCategories.includes(activeSportFilter)) {
      setActiveSportFilter("ALL");
    }
  }, [availableSportCategories, activeSportFilter]);

  // Memoized Filtered Players for Dashboard
  const filteredDashboardPlayers = useMemo(() => {
    if (athletesPool.length === 0) return [];
    if (activeSportFilter === "ALL") return athletesPool;
    return athletesPool.filter(
      (p) => p.sport_type?.toUpperCase() === activeSportFilter.toUpperCase()
    );
  }, [athletesPool, activeSportFilter]);

  // Handlers
  const handleUpdateTeamName = useCallback(async (teamId: string, newName: string) => {
    setTeams((prev) =>
      prev.map((t) => (t.team_id === teamId ? { ...t, team_name: newName } : t))
    );

    try {
      await saveTeamOfflineFirst({ team_id: teamId, team_name: newName });
      await requestAuthenticatedJson(`/teams/${teamId}`, "PATCH", { team_name: newName });
    } catch (err) {
      console.warn("Backend update team name error:", err);
    }
  }, []);

  const handleUpdateTeamDetails = useCallback(
    async (
      teamId: string,
      updates: { team_name?: string; sport_type?: Team["sport_type"]; division?: string }
    ) => {
      setTeams((prev) =>
        prev.map((t) => (t.team_id === teamId ? { ...t, ...updates } : t))
      );

      try {
        await saveTeamOfflineFirst({ team_id: teamId, ...updates });
        await requestAuthenticatedJson(`/teams/${teamId}`, "PATCH", updates);
      } catch (err) {
        console.warn("Backend update team details error:", err);
      }
    },
    []
  );

  const handleSaveRoster = useCallback(
    async (teamId: string, updatedRoster: RosterAthlete[]) => {
      // 1. Optimistically update teams state
      setTeams((prev) =>
        prev.map((t) => {
          if (t.team_id !== teamId) return t;
          return {
            ...t,
            roster_list: updatedRoster,
          };
        })
      );

      // 2. Optimistically update athletesPool state so Home Dashboard & ViewAll immediately update!
      setAthletesPool((prev) => {
        const teamObj = teams.find((t) => t.team_id === teamId);
        const teamName = teamObj?.team_name || "Team";
        const rosterMap = new Map<string, RosterAthlete>();
        updatedRoster.forEach((r) => rosterMap.set(r.athlete_id, r));

        return prev.map((ath) => {
          const inRoster = rosterMap.get(ath.athlete_id);
          if (inRoster) {
            return {
              ...ath,
              position: inRoster.position || ath.position,
              jersey_number: inRoster.jersey_number !== undefined ? inRoster.jersey_number : ath.jersey_number,
              event_distance: inRoster.event_distance || ath.event_distance,
              stroke_style: inRoster.stroke_style || ath.stroke_style,
              team_id: teamId,
              team_name: teamName,
              team_ids: Array.from(new Set([...(ath.team_ids || []), teamId])),
              team_names: Array.from(new Set([...(ath.team_names || []), teamName])),
            };
          } else if (ath.team_id === teamId || (ath.team_ids || []).includes(teamId)) {
            const remainingTeamIds = (ath.team_ids || []).filter((id) => id !== teamId);
            const remainingTeamNames = (ath.team_names || []).filter((_, idx) => (ath.team_ids || [])[idx] !== teamId);
            return {
              ...ath,
              team_id: remainingTeamIds[0] || "",
              team_name: remainingTeamNames[0] || "Unassigned",
              team_ids: remainingTeamIds,
              team_names: remainingTeamNames,
            };
          }
          return ath;
        });
      });

      // 3. Persist to Backend API
      try {
        const currentTeam = teams.find((t) => t.team_id === teamId);
        const isSwim = currentTeam?.sport_type?.toUpperCase().includes("SWIM");
        await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
          roster_list: updatedRoster.map((p) => ({
            athlete_id: p.athlete_id,
            position: p.position || "Unassigned",
            jersey_number: isSwim ? 0 : (Number(p.jersey_number) || 0),
            event_type: p.event_type || p.event_distance || p.position,
            event_distance: p.event_type || p.event_distance,
            stroke_style: p.stroke_style,
          })),
          override_unverified: true,
        });
        clearAuthMicroCache();
        clearFirebaseClientCaches();
        AsyncStorage.getItem(COACH_DASHBOARD_CACHE_KEY).then((cachedStr) => {
          if (cachedStr) {
            const cachedObj = JSON.parse(cachedStr);
            if (Array.isArray(cachedObj.teams)) {
              cachedObj.teams = cachedObj.teams.map((t: any) =>
                t.team_id === teamId ? { ...t, roster_list: updatedRoster } : t
              );
            }
            if (Array.isArray(cachedObj.athletesPool)) {
              cachedObj.athletesPool = cachedObj.athletesPool.map((ath: any) => {
                const updatedPlayer = updatedRoster.find((r) => r.athlete_id === ath.athlete_id);
                if (updatedPlayer) {
                  return {
                    ...ath,
                    position: updatedPlayer.position || ath.position,
                    jersey_number:
                      updatedPlayer.jersey_number !== undefined
                        ? updatedPlayer.jersey_number
                        : ath.jersey_number,
                    event_distance: updatedPlayer.event_distance || ath.event_distance,
                    stroke_style: updatedPlayer.stroke_style || ath.stroke_style,
                  };
                }
                return ath;
              });
            }
            AsyncStorage.setItem(COACH_DASHBOARD_CACHE_KEY, JSON.stringify(cachedObj)).catch(() => null);
          }
        }).catch(() => null);
      } catch (err) {
        console.warn("Backend save roster error:", err);
        throw err;
      }
    },
    [teams]
  );

  const handleUpdateRosterPlayer = useCallback(
    async (teamId: string, athleteId: string, position: string, jerseyNumber: string) => {
      let updatedRoster: RosterAthlete[] = [];
      setTeams((prev) =>
        prev.map((t) => {
          if (t.team_id !== teamId) return t;
          const updated = {
            ...t,
            roster_list: t.roster_list.map((p) =>
              p.athlete_id === athleteId ? { ...p, position, jersey_number: jerseyNumber } : p
            ),
          };
          updatedRoster = updated.roster_list;
          return updated;
        })
      );

      // Keep athletesPool in sync immediately
      setAthletesPool((prev) =>
        prev.map((a) =>
          a.athlete_id === athleteId
            ? { ...a, position, jersey_number: jerseyNumber, team_id: teamId }
            : a
        )
      );

      if (updatedRoster.length > 0) {
        try {
          await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
            roster_list: updatedRoster.map((p) => ({
              athlete_id: p.athlete_id,
              position: p.position,
              jersey_number: Number(p.jersey_number) || 0,
            })),
            override_unverified: true,
          });
          clearAuthMicroCache();
          clearFirebaseClientCaches();
          AsyncStorage.removeItem(COACH_DASHBOARD_CACHE_KEY).catch(() => null);
        } catch (err) {
          console.warn("Backend update roster player error:", err);
        }
      }
    },
    []
  );

  const handleUpdateRosterPlayerDetails = useCallback(
    async (
      teamId: string,
      athleteId: string,
      details: { position?: string; jerseyNumber?: string; event_type?: string; event_distance?: string; stroke_style?: string }
    ) => {
      let updatedRoster: RosterAthlete[] = [];
      setTeams((prev) =>
        prev.map((t) => {
          if (t.team_id !== teamId) return t;
          const updated = {
            ...t,
            roster_list: t.roster_list.map((p) => {
              if (p.athlete_id !== athleteId) return p;
              const resolvedEvt = details.event_type !== undefined ? details.event_type : details.event_distance !== undefined ? details.event_distance : p.event_type || p.event_distance;
              return {
                ...p,
                position: details.position !== undefined ? details.position : p.position,
                jersey_number:
                  details.jerseyNumber !== undefined ? details.jerseyNumber : p.jersey_number,
                event_type: resolvedEvt,
                event_distance: resolvedEvt,
                stroke_style:
                  details.stroke_style !== undefined ? details.stroke_style : p.stroke_style,
              };
            }),
          };
          updatedRoster = updated.roster_list;
          return updated;
        })
      );

      // Keep athletesPool in sync immediately
      setAthletesPool((prev) =>
        prev.map((a) =>
          a.athlete_id === athleteId
            ? {
                ...a,
                position: details.position !== undefined ? details.position : a.position,
                jersey_number:
                  details.jerseyNumber !== undefined ? details.jerseyNumber : a.jersey_number,
                event_type:
                  details.event_type !== undefined ? details.event_type : details.event_distance !== undefined ? details.event_distance : a.event_type || a.event_distance,
                event_distance:
                  details.event_distance !== undefined ? details.event_distance : details.event_type !== undefined ? details.event_type : a.event_distance || a.event_type,
                stroke_style:
                  details.stroke_style !== undefined ? details.stroke_style : a.stroke_style,
                team_id: teamId,
              }
            : a
        )
      );

      if (updatedRoster.length > 0) {
        try {
          await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
            roster_list: updatedRoster.map((p) => ({
              athlete_id: p.athlete_id,
              position: p.position,
              jersey_number: Number(p.jersey_number) || 0,
              event_type: p.event_type || p.event_distance,
              event_distance: p.event_distance || p.event_type,
              stroke_style: p.stroke_style,
            })),
            override_unverified: true,
          });
          clearAuthMicroCache();
          clearFirebaseClientCaches();
          AsyncStorage.removeItem(COACH_DASHBOARD_CACHE_KEY).catch(() => null);
        } catch (err) {
          console.warn("Backend update roster details error:", err);
        }
      }
    },
    []
  );

  const handleRemovePlayer = useCallback(async (teamId: string, athleteId: string) => {
    let updatedRoster: RosterAthlete[] = [];
    setTeams((prev) =>
      prev.map((t) => {
        if (t.team_id !== teamId) return t;
        const updated = {
          ...t,
          roster_list: t.roster_list.filter((p) => p.athlete_id !== athleteId),
        };
        updatedRoster = updated.roster_list;
        return updated;
      })
    );

    // Keep athletesPool in sync immediately
    setAthletesPool((prev) =>
      prev.map((a) => {
        if (a.athlete_id === athleteId) {
          const remainingTeamIds = (a.team_ids || []).filter((id) => id !== teamId);
          const remainingTeamNames = (a.team_names || []).filter((_, idx) => (a.team_ids || [])[idx] !== teamId);
          return {
            ...a,
            team_id: remainingTeamIds[0] || "",
            team_name: remainingTeamNames[0] || "Unassigned",
            team_ids: remainingTeamIds,
            team_names: remainingTeamNames,
          };
        }
        return a;
      })
    );

    try {
      await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
        roster_list: updatedRoster.map((p) => ({
          athlete_id: p.athlete_id,
          position: p.position,
          jersey_number: Number(p.jersey_number) || 0,
        })),
        override_unverified: true,
      });
      clearAuthMicroCache();
      clearFirebaseClientCaches();
      AsyncStorage.removeItem(COACH_DASHBOARD_CACHE_KEY).catch(() => null);
    } catch (err) {
      console.warn("Backend remove player error:", err);
    }
  }, []);

  const handleAddPlayersToTeam = useCallback(async (teamId: string, newAthletes: RosterAthlete[]) => {
    let updatedRoster: RosterAthlete[] = [];
    setTeams((prev) =>
      prev.map((t) => {
        if (t.team_id !== teamId) return t;
        const updated = {
          ...t,
          roster_list: [...t.roster_list, ...newAthletes],
        };
        updatedRoster = updated.roster_list;
        return updated;
      })
    );

    // Keep athletesPool in sync immediately
    setAthletesPool((prev) => {
      const teamObj = teams.find((t) => t.team_id === teamId);
      const teamName = teamObj?.team_name || "Team";
      return prev.map((a) => {
        if (newAthletes.some((na) => na.athlete_id === a.athlete_id)) {
          const addedAthlete = newAthletes.find((na) => na.athlete_id === a.athlete_id);
          return {
            ...a,
            ...addedAthlete,
            team_id: teamId,
            team_name: teamName,
            team_ids: Array.from(new Set([...(a.team_ids || []), teamId])),
            team_names: Array.from(new Set([...(a.team_names || []), teamName])),
          };
        }
        return a;
      });
    });

    try {
      await requestAuthenticatedJson(`/teams/${teamId}/roster`, "PATCH", {
        roster_list: updatedRoster.map((p) => ({
          athlete_id: p.athlete_id,
          position: p.position,
          jersey_number: Number(p.jersey_number) || 0,
        })),
        override_unverified: true,
      });
      clearAuthMicroCache();
      clearFirebaseClientCaches();
      AsyncStorage.removeItem(COACH_DASHBOARD_CACHE_KEY).catch(() => null);
    } catch (err) {
      console.warn("Backend add players error:", err);
    }
  }, [teams]);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, is_read: true, status: "READ" })));
    setUnreadNotifCount(0);
    try {
      await requestAuthenticatedJson("/notifications/read-all", "POST", {}).catch(() => null);
    } catch (e) {
      console.warn("Read all notifications error:", e);
    }
  }, []);

  const handleRespondInquiry = useCallback(async (inquiryId: string, status: "Accepted" | "Declined") => {
    try {
      await requestAuthenticatedJson(`/inquiries/${inquiryId}/respond`, "PATCH", { status }).catch(() => null);
      setNotificationsList((prev) =>
        prev.map((n) =>
          (n.inquiry_id || n.scout_id || n.id || n.notification_id) === inquiryId
            ? { ...n, is_read: true, status: status.toUpperCase(), offer_status: status.toUpperCase() }
            : n
        )
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      Alert.alert(
        `Inquiry ${status}`,
        `You have successfully ${status.toLowerCase()} this recruitment proposal.`
      );
    } catch (err: any) {
      Alert.alert("Inquiry Responded", "Your response has been submitted.");
    }
  }, []);

  const handleCreateTeam = useCallback(
    async (newTeamData: {
      team_name: string;
      sport_type: Team["sport_type"];
      division: string;
      roster_list: RosterAthlete[];
    }) => {
      const tempId = `team_${Date.now()}`;
      const created: Team = {
        team_id: tempId,
        team_name: newTeamData.team_name,
        sport_type: newTeamData.sport_type,
        division: newTeamData.division || "Elite Professional",
        season_record: { wins: 0, losses: 0 },
        coach_id: coach.coach_id,
        roster_list: newTeamData.roster_list,
        created_at: new Date().toISOString().split("T")[0],
      };
      setTeams((prev) => [created, ...prev]);
      setSelectedTeamId(tempId);
      setActiveView("manage_team");
      saveTeamOfflineFirst(created).catch(() => null);

      try {
        const res: any = await requestAuthenticatedJson("/teams", "POST", {
          team_name: newTeamData.team_name,
          sport_type: newTeamData.sport_type,
          division: newTeamData.division || "Elite Professional",
          roster_list: newTeamData.roster_list.map((p) => ({
            athlete_id: p.athlete_id,
            position: p.position,
            jersey_number: Number(p.jersey_number) || 0,
          })),
        });
        const createdTeam = res?.team || res;
        const newTeamId = createdTeam?.team_id ? String(createdTeam.team_id) : res?.team_id ? String(res.team_id) : undefined;
        if (newTeamId) {
          created.team_id = newTeamId;
          const mergedTeam = { ...created, ...createdTeam, team_id: newTeamId };
          setTeams((prev) => prev.map((t) => (t.team_id === tempId ? mergedTeam : t)));
          setSelectedTeamId(newTeamId);
          await saveTeamOfflineFirst(mergedTeam);
          clearAuthMicroCache();
          clearFirebaseClientCaches();
          AsyncStorage.removeItem(COACH_DASHBOARD_CACHE_KEY).catch(() => null);
        }
      } catch (err) {
        console.warn("Backend team creation sync:", err);
      }
    },
    [coach.coach_id]
  );

  // Filter matches so only coaching staff matches are visible to coach
  const coachMatches = useMemo(() => {
    if (!matchHistoryList || matchHistoryList.length === 0) return [];
    const coachId = coach.coach_id || coach.user_id;
    const coachTeamIds = new Set(teams.map((t) => t.team_id).filter(Boolean));
    const coachTeamNames = new Set(teams.map((t) => (t.team_name || "").toLowerCase().trim()).filter(Boolean));

    const athleteIdsPool = new Set(
      athletesPool.map((a) => String(a.athlete_id || a.user_id || "").toLowerCase())
    );

    return matchHistoryList.filter((m: any) => {
      if (m.coach_id && (m.coach_id === coachId || m.coach_id === coach.user_id)) return true;
      if (Array.isArray(m.coaching_staff) && (m.coaching_staff.includes(coachId) || m.coaching_staff.includes(coach.user_id))) return true;
      if (m.team_id && coachTeamIds.has(m.team_id)) return true;
      const hName = (m.home_team || m.home_team_name || "").toLowerCase().trim();
      const aName = (m.away_team || m.away_team_name || m.opponent_team_name || "").toLowerCase().trim();
      if (hName && coachTeamNames.has(hName)) return true;
      if (aName && coachTeamNames.has(aName)) return true;

      // Also match if any athlete from coach's pool is in the match
      const mAthIds = (
        m.athlete_ids ||
        m.roster_athletes ||
        (m.player_stats || []).map((p: any) => p.athlete_id || p.user_id || "")
      ).map((id: any) => String(id).toLowerCase());
      if (
        mAthIds.some(
          (id: string) =>
            athleteIdsPool.has(id) ||
            athleteIdsPool.has(`ath_${id}`) ||
            athleteIdsPool.has(id.replace(/^ath_/, ""))
        )
      ) {
        return true;
      }

      return false;
    });
  }, [matchHistoryList, coach.coach_id, coach.user_id, teams, athletesPool]);

  // Filter matches strictly by the active athlete's ID/roster participation (Coach #3)
  const athleteFilteredMatches = useMemo(() => {
    if (!selectedPerfAthlete?.athlete_id && !selectedPerfAthlete?.full_name) return [];
    const athId = String(selectedPerfAthlete.athlete_id || "");
    const rawUid = athId.startsWith("ath_") ? athId.replace("ath_", "") : athId;
    const athName = (selectedPerfAthlete.full_name || "").toLowerCase().trim();

    const candidateMatches = matchHistoryList && matchHistoryList.length > 0 ? matchHistoryList : coachMatches;

    const filtered = candidateMatches.filter((m: any) => {
      // 1. Direct athlete_id match
      if (m.athlete_id && (String(m.athlete_id) === athId || String(m.athlete_id) === rawUid)) return true;
      // 2. athlete_ids array
      if (Array.isArray(m.athlete_ids) && (m.athlete_ids.includes(athId) || m.athlete_ids.includes(rawUid))) return true;
      // 3. participants array
      if (Array.isArray(m.participants) && m.participants.some((p: any) => {
        const pId = typeof p === "string" ? p : p.athlete_id || p.id || p.uid;
        const pName = (p.full_name || p.name || p.athlete_name || "").toLowerCase().trim();
        return (athId && pId === athId) || (rawUid && pId === rawUid) || (athName && pName === athName);
      })) return true;
      // 4. player_stats array
      if (Array.isArray(m.player_stats) && m.player_stats.some((ps: any) => {
        const psId = ps.athlete_id || ps.id || ps.uid;
        const psName = (ps.player_name || ps.athlete_name || ps.full_name || ps.name || "").toLowerCase().trim();
        return (athId && psId === athId) || (rawUid && psId === rawUid) || (athName && psName === athName);
      })) return true;
      // 5. roster array
      if (Array.isArray(m.roster) && m.roster.some((r: any) => {
        const rId = typeof r === "string" ? r : r.athlete_id || r.id;
        const rName = (r.full_name || r.name || r.athlete_name || "").toLowerCase().trim();
        return (athId && rId === athId) || (rawUid && rId === rawUid) || (athName && rName === athName);
      })) return true;
      return false;
    });

    // Personalize match card for this specific athlete if timed sport
    return filtered.map((m: any) => {
      const sportUpper = (m.sport_category || selectedPerfAthlete?.sport_category || "").toUpperCase();
      const isTimed = sportUpper.includes("SWIM") || sportUpper.includes("TRACK") || sportUpper.includes("FIELD");
      if (!isTimed) return m;

      const pStats = Array.isArray(m.player_stats) ? m.player_stats : (Array.isArray(m.playerStats) ? m.playerStats : []);
      const myStat = pStats.find((ps: any) => {
        const psId = ps.athlete_id || ps.id || ps.uid;
        const psName = (ps.player_name || ps.athlete_name || ps.full_name || ps.name || "").toLowerCase().trim();
        return (athId && psId === athId) || (rawUid && psId === rawUid) || (athName && psName === athName);
      }) || pStats[0];

      if (!myStat) return m;

      const myEvent = myStat.event || myStat.event_name || "";
      const myTime = myStat.finish_time || myStat.time || myStat.mark || myStat.time_or_distance;
      const cleanMeet = (m.game_name || m.match_name || "").replace(/\s*vs\s*OPPONENT.*$/i, "").trim();

      const personalizedTitle = (cleanMeet && !cleanMeet.toLowerCase().includes("vs"))
        ? (myEvent && !cleanMeet.includes(myEvent) ? `${cleanMeet} • ${myEvent}` : cleanMeet)
        : (myEvent || (sportUpper.includes("SWIM") ? "Swimming Meet" : "Track & Field Meet"));

      const myRank = myStat.rank || myStat.place;
      const parsedRank = typeof myRank === "number" ? myRank : parseInt(String(myRank).replace(/[^\d]/g, ""), 10);
      let personalizedBadge = m.result_badge_text;
      if (parsedRank === 1) {
        personalizedBadge = "1ST PLACE";
      } else if (parsedRank === 2) {
        personalizedBadge = "2ND PLACE";
      } else if (parsedRank === 3) {
        personalizedBadge = "3RD PLACE";
      } else if (parsedRank > 3) {
        personalizedBadge = `RANK #${parsedRank}`;
      } else if (String(m.result_badge_text).includes("WIN") || String(m.result_badge_text).includes("1st")) {
        personalizedBadge = "1ST PLACE";
      }

      return {
        ...m,
        event_or_opponent: personalizedTitle,
        score_or_time_summary: myTime ? `Time: ${myTime}` : (m.score_or_time_summary?.includes("-") ? "Completed" : m.score_or_time_summary),
        result_badge_text: personalizedBadge,
      };
    });
  }, [matchHistoryList, coachMatches, selectedPerfAthlete]);

  const handleSelectTab = useCallback((tab: NavigationTab) => {
    setActiveTab(tab);
    if (tab === "Home") {
      setActiveView("dashboard");
    } else if (tab === "Teams") {
      setActiveView("teams_list");
    } else if (tab === "Discovery") {
      setActiveView("discovery");
    } else if (tab === "Performance") {
      setActiveView("performance");
    }
  }, []);

  const handleViewStats = useCallback((player: RosterAthlete) => {
    const pId = player.athlete_id || player.user_id;
    const pName = (player.full_name || "").toLowerCase().trim();
    const matched = perfAthletes.find(
      (a) => (a.athlete_id && a.athlete_id === pId) || (a.user_id && a.user_id === pId) || (a.full_name && a.full_name.toLowerCase().trim() === pName)
    ) || computeAthletePerformance(player, matchHistoryList);
    setSelectedPerfAthlete(matched);
    setPreviousPortfolioView(activeView);
    setActiveView("athlete_portfolio");
  }, [perfAthletes, activeView, matchHistoryList]);

  const handleSelectRecentMatch = useCallback((matchItem: MatchHistoryItem) => {
    setSelectedMatchItem(matchItem);
    setPreviousPortfolioView("dashboard");
    const matchSport = String(matchItem.sport_category || "").toUpperCase();
    if (matchSport.includes("BASKET") || matchSport.includes("VOLLEY")) {
      setActiveView("perf_basketball_result");
    } else if (matchSport.includes("SWIM")) {
      setActiveView("perf_swimming_result");
    } else {
      setActiveView("perf_trackfield_result");
    }
  }, []);

  const allFilteredMatches = useMemo(() => {
    const list = coachMatches && coachMatches.length > 0 ? coachMatches : matchHistoryList;
    if (!list || list.length === 0) return [];

    let filtered = list;
    if (activeSportFilter !== "ALL") {
      const filt = activeSportFilter.toUpperCase().trim();
      filtered = list.filter((m) => {
        const sc = String(m.sport_category || "").toUpperCase().trim();
        if (filt.includes("TRACK") || filt.includes("FIELD")) {
          return sc.includes("TRACK") || sc.includes("FIELD") || sc.includes("RUN");
        }
        return sc.includes(filt);
      });
    }

    return filtered;
  }, [coachMatches, matchHistoryList, activeSportFilter]);

  const dashboardRecentMatches = useMemo(() => {
    return allFilteredMatches.slice(0, 4);
  }, [allFilteredMatches]);

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    const deletedTeam = teams.find((t) => t.team_id === teamId);
    const deletedTeamNameLower = (deletedTeam?.team_name || "").toLowerCase().trim();

    setTeams((prev) => {
      const remaining = prev.filter((t) => t.team_id !== teamId);
      if (selectedTeamId === teamId) {
        setSelectedTeamId(remaining[0]?.team_id || "");
      }
      return remaining;
    });

    setAthletesPool((prev) =>
      prev.map((ath: any) => {
        const remainingTeamIds = (ath.team_ids || (ath.team_id ? [ath.team_id] : [])).filter(
          (id: string) => id !== teamId
        );
        const remainingTeams = (ath.teams || []).filter((tm: any) => tm.team_id !== teamId);
        const remainingTeamNames = (ath.team_names || (ath.team_name ? ath.team_name.split(" • ") : []))
          .map((n: string) => String(n || "").trim())
          .filter((n: string) => {
            const lower = n.toLowerCase();
            return lower && lower !== deletedTeamNameLower && lower !== "unassigned";
          });

        const isStillAssigned = remainingTeamIds.length > 0 || remainingTeams.length > 0 || remainingTeamNames.length > 0;
        return {
          ...ath,
          team_id: isStillAssigned ? remainingTeamIds[0] || remainingTeams[0]?.team_id || null : null,
          team_ids: remainingTeamIds,
          teams: remainingTeams,
          team_names: remainingTeamNames,
          team_name: isStillAssigned ? (remainingTeamNames.join(" • ") || remainingTeams[0]?.team_name || "Team") : "Unassigned",
        };
      })
    );

    setActiveView("teams_list");
    setActiveTab("Teams");
    try {
      await deleteTeamOfflineFirst(teamId);
      await requestAuthenticatedJson(`/teams/${teamId}`, "DELETE").catch(() => null);
    } catch (err) {
      console.warn("Delete team sync error:", err);
    }
  }, [teams, selectedTeamId]);

  const handleMatchSaveCompleted = useCallback((savedPayload?: any) => {
    setCoachProfile((prev) => ({
      ...prev,
      system_statistics: {
        ...prev.system_statistics,
        metric_logs: (prev.system_statistics?.metric_logs || 0) + 1,
      },
    }));

    if (savedPayload) {
      const matchId = savedPayload.match_id || `match_${Date.now()}`;
      const homePts = Number(savedPayload.home_score || 0);
      const awayPts = Number(savedPayload.away_score || 0);
      let finalResultBadge = savedPayload.game_result === "WIN" ? "RESULT WIN" : "RESULT LOSS";
      const sport = (savedPayload.sport_type || "BASKETBALL").toUpperCase() as any;
      const isSwim = String(sport).includes("SWIM");
      const isTrack = String(sport).includes("TRACK") || String(sport).includes("FIELD");

      let summaryDisplay = `${homePts} - ${awayPts}`;
      let eventTitleDisplay = `${savedPayload.home_team_name || "ATLETA"} vs ${savedPayload.opponent_team_name || "OPPONENT"}`;

      if (isSwim || isTrack) {
        const firstStat = (savedPayload.player_stats || [])[0];
        const markOrTime = firstStat?.mark || firstStat?.finish_time || firstStat?.time || firstStat?.time_or_distance;
        const ev = firstStat?.event || firstStat?.event_name || "";
        summaryDisplay = markOrTime ? `Time: ${markOrTime}` : "Completed";

        const cleanMeet = (savedPayload.game_name || savedPayload.match_name || "").replace(/\s*vs\s*OPPONENT.*$/i, "").trim();
        eventTitleDisplay = (cleanMeet && !cleanMeet.toLowerCase().includes("vs"))
          ? (ev && !cleanMeet.includes(ev) ? `${cleanMeet} • ${ev}` : cleanMeet)
          : (ev || (isSwim ? "Swimming Meet" : "Track & Field Meet"));

        const rawPlace = firstStat?.rank || firstStat?.place || firstStat?.placement_rank || savedPayload.rank || savedPayload.place || (savedPayload.game_result && String(savedPayload.game_result).match(/\d+/) ? parseInt(String(savedPayload.game_result).match(/\d+/)![0], 10) : 1);
        const rNum = typeof rawPlace === "number" ? rawPlace : (parseInt(String(rawPlace).replace(/[^\d]/g, ""), 10) || 1);
        if (rNum === 1 || String(savedPayload.game_result).includes("1st")) {
          finalResultBadge = "1ST PLACE";
        } else if (rNum === 2 || String(savedPayload.game_result).includes("2nd")) {
          finalResultBadge = "2ND PLACE";
        } else if (rNum === 3 || String(savedPayload.game_result).includes("3rd")) {
          finalResultBadge = "3RD PLACE";
        } else if (rNum > 3) {
          finalResultBadge = `RANK #${rNum}`;
        } else if (String(savedPayload.game_result).toUpperCase().includes("WIN")) {
          finalResultBadge = "1ST PLACE";
        } else {
          finalResultBadge = "COMPLETED";
        }
      }

      const mappedPlayerStats = (savedPayload.player_stats || []).map((p: any) => ({
        athlete_id: p.athlete_id || p.user_id || p.id,
        user_id: p.user_id || p.athlete_id,
        player_name: p.player_name || p.name || "",
        name: p.player_name || p.name || "",
        team: p.team_name || savedPayload.home_team_name || "ATLETA",
        pts: Number(p.pts ?? p.stats?.points ?? 0),
        ast: Number(p.ast ?? p.stats?.assists ?? 0),
        reb: Number(p.reb ?? p.stats?.rebounds ?? 0),
        time: p.finish_time || p.time || "",
        finish_time: p.finish_time || p.time || "",
        mark: p.mark || p.distance || "",
        event: p.event || p.event_name || p.position || "",
        event_name: p.event_name || p.event || p.position || "",
        event_key: p.event_key || "",
        position: p.position || p.event || "",
        rank: p.rank || p.place || p.placement_rank || 1,
        place: p.place || p.rank || p.placement_rank || 1,
        placement_rank: p.placement_rank || p.rank || p.place || 1,
        placement: p.placement || (p.rank === 1 ? "1st Place" : p.rank === 2 ? "2nd Place" : p.rank === 3 ? "3rd Place" : `${p.rank || 1}th Place`),
        stats: p.stats || {},
      }));

      const newMatchItem: MatchHistoryItem = {
        match_id: matchId,
        match_date: savedPayload.match_date || new Date().toISOString(),
        date_formatted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        full_date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        date_group: "MATCH LOGS",
        event_or_opponent: eventTitleDisplay,
        game_name: savedPayload.game_name || savedPayload.match_name,
        match_name: savedPayload.match_name || savedPayload.game_name,
        score_or_time_summary: summaryDisplay,
        sport_category: sport,
        result_badge_text: finalResultBadge,
        is_official: false,
        home_team: savedPayload.home_team_name || "ATLETA",
        away_team: isSwim || isTrack ? "" : (savedPayload.opponent_team_name || "OPPONENT"),
        home_score: isSwim || isTrack ? undefined : homePts,
        away_score: isSwim || isTrack ? undefined : awayPts,
        athlete_ids: mappedPlayerStats.map((p: any) => p.athlete_id).filter(Boolean),
        roster_athletes: mappedPlayerStats.map((p: any) => p.athlete_id).filter(Boolean),
        entries_count: mappedPlayerStats.length > 0 ? mappedPlayerStats.length : 1,
        player_stats: mappedPlayerStats,
        playerStats: mappedPlayerStats,
        leaderboard_entries: mappedPlayerStats.map((p: any, idx: number) => {
          let scoreText = `${p.pts ?? 0} pts`;
          if (isSwim || isTrack) {
            scoreText = p.mark || p.finish_time || p.time || "Finished";
          }
          return {
            rank: p.rank || p.place || (idx + 1),
            name: p.player_name || p.name,
            detail: p.event || p.event_name || p.team || savedPayload.home_team_name || "ATLETA",
            time_or_score: scoreText,
          };
        }),
        coach_notes: [savedPayload.notes || `Match: ${savedPayload.home_team_name || "ATLETA"} vs ${savedPayload.opponent_team_name || "OPPONENT"} (${summaryDisplay})`],
      };

      setMatchHistoryList((prev) => [newMatchItem, ...prev.filter((m) => m.match_id !== matchId)]);

      if (Array.isArray(savedPayload.player_stats)) {
        savedPayload.player_stats.forEach((ps: any) => {
          const playerName = (ps.player_name || ps.name || "").trim().toLowerCase();
          const pAthleteId = ps.athlete_id || ps.user_id;
          const matchPts = Number(ps.pts ?? ps.stats?.points ?? 0);
          const matchReb = Number(ps.reb ?? ps.stats?.rebounds ?? 0);
          const matchAst = Number(ps.ast ?? ps.stats?.assists ?? 0);

          setPerfAthletes((prevList) => {
            let matchedAny = false;
            const nextList = prevList.map((ath) => {
              const athName = (ath.full_name || "").trim().toLowerCase();
              const isMatch =
                (pAthleteId && (ath.athlete_id === pAthleteId || ath.user_id === pAthleteId)) ||
                (playerName && athName === playerName) ||
                (playerName && athName.includes(playerName)) ||
                (playerName && playerName.includes(athName));

              if (!isMatch) return ath;
              matchedAny = true;

              if (isSwim) {
                const evName = ps.event || ps.event_name || ps.position || ps.position_or_event || "";
                const evKey = (ps.event_key || evName.toLowerCase().replace(/[^a-z0-9]/g, '_')).replace(/^pb_/, '');
                const timeStr = ps.finish_time || ps.time || "";
                const pbKey = `pb_${evKey}`;
                const existingPb = (ath.averages as any)?.[pbKey];
                const updatedPb = timeStr && timeStr !== "00:00.00" ? pickBetterTime(existingPb, timeStr) : (existingPb || timeStr);

                const pb50 = (evKey.includes("50") && evKey.includes("free")) ? pickBetterTime(ath.averages?.pb_50m_free, timeStr) : ath.averages?.pb_50m_free;
                const pb100 = (evKey.includes("100") && evKey.includes("free")) ? pickBetterTime(ath.averages?.pb_100m_free, timeStr) : ath.averages?.pb_100m_free;
                const pb200 = (evKey.includes("200") && evKey.includes("free")) ? pickBetterTime(ath.averages?.pb_200m_free, timeStr) : ath.averages?.pb_200m_free;

                const isPodium = (ps.rank && ps.rank <= 3) || (ps.place && ps.place <= 3) || String(savedPayload.game_result).toUpperCase().includes("WIN") || String(savedPayload.game_result).includes("1st") || String(savedPayload.game_result).includes("2nd") || String(savedPayload.game_result).includes("3rd");
                const isWin = ps.rank === 1 || ps.place === 1 || String(savedPayload.game_result).toUpperCase().includes("WIN") || String(savedPayload.game_result).includes("1st");
                const athletePodiums = (Number(ath.averages?.podiums) || 0) + (isPodium ? 1 : 0);
                const athleteWins = (Number(ath.averages?.wins) || 0) + (isWin ? 1 : 0);

                const updatedAthlete: AthletePerformanceProfile = {
                  ...ath,
                  rating_score: ath.rating_score || 0,
                  averages: {
                    ...ath.averages,
                    ...(pbKey ? { [pbKey]: updatedPb } : {}),
                    ...(pb50 ? { pb_50m_free: pb50 } : {}),
                    ...(pb100 ? { pb_100m_free: pb100 } : {}),
                    ...(pb200 ? { pb_200m_free: pb200 } : {}),
                    podiums: athletePodiums,
                    podiums_count: athletePodiums,
                    wins: athleteWins,
                    meets_count: (Number(ath.averages?.meets_count) || 0) + 1,
                  },
                };
                setSelectedPerfAthlete((curr) => {
                  if (curr && (curr.athlete_id === ath.athlete_id || curr.full_name.toLowerCase().trim() === playerName)) {
                    return updatedAthlete;
                  }
                  return curr;
                });
                return updatedAthlete;
              } else if (isTrack) {
                const evName = ps.event || ps.event_name || ps.position || ps.position_or_event || "";
                const evKey = (ps.event_key || evName.toLowerCase().replace(/[^a-z0-9]/g, '_')).replace(/^pb_/, '');
                const timeStr = ps.finish_time || ps.time || "";
                const markStr = ps.mark || ps.distance || "";
                const isDistance = Boolean(markStr || evKey.includes("vault") || evKey.includes("jump") || evKey.includes("put") || evKey.includes("throw") || evKey.includes("discus") || evKey.includes("javelin"));
                const pbKey = `pb_${evKey}`;
                const existingPb = (ath.averages as any)?.[pbKey];
                const updatedPb = isDistance
                  ? (markStr ? pickBetterDistance(existingPb, markStr) : existingPb)
                  : (timeStr && timeStr !== "00:00.00" ? pickBetterTime(existingPb, timeStr) : existingPb);

                const isPodium = (ps.rank && ps.rank <= 3) || (ps.place && ps.place <= 3) || String(savedPayload.game_result).toUpperCase().includes("WIN") || String(savedPayload.game_result).includes("1st") || String(savedPayload.game_result).includes("2nd") || String(savedPayload.game_result).includes("3rd");
                const isWin = ps.rank === 1 || ps.place === 1 || String(savedPayload.game_result).toUpperCase().includes("WIN") || String(savedPayload.game_result).includes("1st");
                const athletePodiums = (Number(ath.averages?.podiums) || 0) + (isPodium ? 1 : 0);
                const athleteWins = (Number(ath.averages?.wins) || 0) + (isWin ? 1 : 0);

                const updatedAthlete: AthletePerformanceProfile = {
                  ...ath,
                  rating_score: ath.rating_score || 0,
                  averages: {
                    ...ath.averages,
                    ...(pbKey ? { [pbKey]: updatedPb } : {}),
                    podiums: athletePodiums,
                    wins: athleteWins,
                    event_wins: athleteWins,
                    meets_count: (Number(ath.averages?.meets_count) || 0) + 1,
                  },
                };
                setSelectedPerfAthlete((curr) => {
                  if (curr && (curr.athlete_id === ath.athlete_id || curr.full_name.toLowerCase().trim() === playerName)) {
                    return updatedAthlete;
                  }
                  return curr;
                });
                return updatedAthlete;
              } else {
                const prevGp = Number(ath.averages?.games_played || ((ath.averages?.ppg ?? 0) > 0 ? 1 : 0));
                const prevPpg = Number(ath.averages?.ppg || 0);
                const prevRpg = Number(ath.averages?.rpg || 0);
                const prevApg = Number(ath.averages?.apg || 0);

                const newGp = prevGp + 1;
                const newPpg = Math.round(((prevPpg * prevGp + matchPts) / newGp) * 10) / 10;
                const newRpg = Math.round(((prevRpg * prevGp + matchReb) / newGp) * 10) / 10;
                const newApg = Math.round(((prevApg * prevGp + matchAst) / newGp) * 10) / 10;
                const newPer = Math.round(newPpg * 1.2 + newRpg * 1.0 + newApg * 1.5);
                const newTrends = [...(ath.scoring_trends_last_10 || (prevPpg > 0 ? [prevPpg] : [])), matchPts].slice(-10);

                const updatedAthlete: AthletePerformanceProfile = {
                  ...ath,
                  rating_score: ath.rating_score || 0,
                  averages: {
                    ...ath.averages,
                    ppg: newPpg,
                    rpg: newRpg,
                    apg: newApg,
                    games_played: newGp,
                    per_score: newPer,
                    wins: savedPayload.game_result === "WIN" ? (ath.averages?.wins || 0) + 1 : (ath.averages?.wins || 0),
                  },
                  scoring_trends_last_10: newTrends,
                };

                setSelectedPerfAthlete((curr) => {
                  if (curr && (curr.athlete_id === ath.athlete_id || curr.full_name.toLowerCase().trim() === playerName)) {
                    return updatedAthlete;
                  }
                  return curr;
                });

                return updatedAthlete;
              }
            });

            if (!matchedAny && playerName) {
              if (isSwim) {
                const evName = ps.event || ps.event_name || ps.position || ps.position_or_event || "";
                const evKey = (ps.event_key || evName.toLowerCase().replace(/[^a-z0-9]/g, '_')).replace(/^pb_/, '');
                const timeStr = ps.finish_time || ps.time || "";
                const pbKey = `pb_${evKey}`;
                const newAth = {
                  athlete_id: pAthleteId || `ath_${Date.now()}`,
                  user_id: pAthleteId || "",
                  full_name: ps.player_name || ps.name || "Athlete",
                  birthdate: "-",
                  position_or_event: ps.position || evName || "Freestyle",
                  location_province: "Camarines Sur",
                  team_name: savedPayload.home_team_name || "Ateneo Blue Fast",
                  rating_score: 0,
                  sport_category: sport,
                  biometrics: { height_ft: "-", weight_lbs: "-", wingspan_ft: "-", vertical_jump_in: "-" },
                  radar_competencies: { speed: 0, power: 0, agility: 0, iq: 0, tech: 0 },
                  averages: {
                    ...(pbKey ? { [pbKey]: timeStr } : {}),
                    podiums: savedPayload.game_result === "WIN" || (ps.rank && ps.rank <= 3) ? 1 : 0,
                    wins: savedPayload.game_result === "WIN" ? 1 : 0,
                    meets_count: 1,
                  },
                } as unknown as AthletePerformanceProfile;
                return [newAth, ...nextList];
              } else if (isTrack) {
                const evName = ps.event || ps.event_name || ps.position || ps.position_or_event || "";
                const evKey = (ps.event_key || evName.toLowerCase().replace(/[^a-z0-9]/g, '_')).replace(/^pb_/, '');
                const markOrTime = ps.mark || ps.distance || ps.finish_time || ps.time || "";
                const pbKey = `pb_${evKey}`;
                const newAth = {
                  athlete_id: pAthleteId || `ath_${Date.now()}`,
                  user_id: pAthleteId || "",
                  full_name: ps.player_name || ps.name || "Athlete",
                  birthdate: "-",
                  position_or_event: ps.position || evName || "100m",
                  location_province: "Camarines Sur",
                  team_name: savedPayload.home_team_name || "Track Team",
                  rating_score: 0,
                  sport_category: sport,
                  biometrics: { height_ft: "-", weight_lbs: "-", wingspan_ft: "-", vertical_jump_in: "-" },
                  radar_competencies: { speed: 0, power: 0, agility: 0, iq: 0, tech: 0 },
                  averages: {
                    ...(pbKey ? { [pbKey]: markOrTime } : {}),
                    podiums: savedPayload.game_result === "WIN" || (ps.rank && ps.rank <= 3) ? 1 : 0,
                    wins: savedPayload.game_result === "WIN" ? 1 : 0,
                    event_wins: savedPayload.game_result === "WIN" ? 1 : 0,
                    meets_count: 1,
                  },
                } as unknown as AthletePerformanceProfile;
                return [newAth, ...nextList];
              } else {
                const newPer = Math.round(matchPts * 1.2 + matchReb * 1.0 + matchAst * 1.5);
                const newAth: AthletePerformanceProfile = {
                  athlete_id: pAthleteId || `ath_${Date.now()}`,
                  user_id: pAthleteId || "",
                  full_name: ps.player_name || ps.name || "Athlete",
                  birthdate: "2004-10-05",
                  position_or_event: ps.position || "Guard",
                  location_province: "Camarines Sur",
                  team_name: savedPayload.home_team_name || "Bicol Rivers",
                  rating_score: 0,
                  sport_category: sport,
                  biometrics: {
                    height_ft: "6'0\"",
                    weight_lbs: "165 lbs",
                    wingspan_ft: "6'7\"",
                    vertical_jump_in: "-",
                  },
                  averages: {
                    ppg: matchPts,
                    rpg: matchReb,
                    apg: matchAst,
                    games_played: 1,
                    per_score: newPer,
                    wins: savedPayload.game_result === "WIN" ? 1 : 0,
                    fg_percentage: 50,
                    three_pt_percentage: 40,
                    ft_percentage: 80,
                  },
                  radar_competencies: { speed: 80, power: 75, agility: 78, iq: 85, tech: 80 },
                } as AthletePerformanceProfile;
                return [newAth, ...nextList];
              }
            }

            return nextList;
          });
        });
      }
    }
  }, []);

  if (accountStatus.toLowerCase() === "rejected") {
    return (
      <View style={[styles.container, { backgroundColor: "#0B132B", justifyContent: "center", alignItems: "center", padding: 24 }]}>
        <StatusBar style="light" />
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 8, padding: 24, width: "100%", maxWidth: 420 }}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Ionicons name="alert-circle" size={48} color="#DC2626" />
            <Text style={{ fontSize: 16, fontWeight: "900", color: "#0B132B", marginTop: 8, textAlign: "center" }}>
              ACCREDITATION APPLICATION DECLINED
            </Text>
          </View>

          <View style={{ backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FCA5A5", borderRadius: 4, padding: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: "#DC2626", marginBottom: 4 }}>
              REASON FOR DECLINE:
            </Text>
            <Text style={{ fontSize: 13, color: "#7F1D1D" }}>
              {rejectionReason || "Verification credentials provided were invalid or unconfirmed."}
            </Text>
          </View>

          <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 16, lineHeight: 18 }}>
            Your coach profile and user account record are preserved. Dashboard access is restricted until valid credentials are submitted and verified by the system administrator.
          </Text>

          {reapplyFeedback && (
            <View style={{ backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC", borderRadius: 4, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#166534" }}>{reapplyFeedback}</Text>
            </View>
          )}

          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#0B132B", marginBottom: 6 }}>
              CREDENTIAL / CERTIFICATE LINK:
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={reapplyDocUrl}
                onChangeText={setReapplyDocUrl}
                placeholder="https://... or certificate ID"
                style={{ flex: 1, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 4, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12 }}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => {
                  if (reapplyDocUrl.trim()) {
                    setReapplyDocList((prev) => [...prev, reapplyDocUrl.trim()]);
                    setReapplyDocUrl("");
                  }
                }}
                style={{ backgroundColor: "#0B132B", paddingHorizontal: 12, justifyContent: "center", borderRadius: 4 }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>ADD</Text>
              </TouchableOpacity>
            </View>
          </View>

          {reapplyDocList.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              {reapplyDocList.map((d, i) => (
                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, color: "#0B132B", flex: 1 }} numberOfLines={1}>{d}</Text>
                  <TouchableOpacity onPress={() => setReapplyDocList((prev) => prev.filter((_, idx) => idx !== i))}>
                    <Text style={{ color: "#DC2626", fontSize: 12, fontWeight: "700", marginLeft: 8 }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={handleResubmitCredentials}
            disabled={isReapplying}
            style={{ backgroundColor: "#0B132B", borderRadius: 4, paddingVertical: 12, alignItems: "center", marginTop: 8 }}
          >
            {isReapplying ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 13, letterSpacing: 0.5 }}>
                RESUBMIT CREDENTIALS FOR APPROVAL
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onLogout}
            style={{ marginTop: 14, alignItems: "center" }}
          >
            <Text style={{ color: "#64748B", fontSize: 12, fontWeight: "700" }}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <DiscoveryProvider>
      <View style={styles.container}>
        <StatusBar style="light" />

      {/* SCREEN 6: EDIT PROFILE SCREEN */}
      {activeView === "edit_profile" && (
        <CoachEditProfile
          profileData={coachProfile}
          onSave={(updated) => {
            setCoachProfile(updated);
            setActiveSportFilter(updated.sports_focus);
            const updatedCoachData: UserCoach = {
              ...coach,
              first_name: updated.first_name,
              last_name: updated.last_name,
              email: updated.email,
              avatar_url: updated.avatar_url || coach.avatar_url || "",
            };
            setCoach(updatedCoachData);

            // Persist to dashboard and offline profile caches immediately
            AsyncStorage.getItem(COACH_DASHBOARD_CACHE_KEY)
              .then((raw) => {
                const parsed = raw ? JSON.parse(raw) : {};
                return AsyncStorage.setItem(
                  COACH_DASHBOARD_CACHE_KEY,
                  JSON.stringify({
                    ...parsed,
                    coach: updatedCoachData,
                    coachProfile: updated,
                  })
                );
              })
              .catch(() => null);

            AsyncStorage.setItem(
              "atleta_offline_coach_profile_cache",
              JSON.stringify(updated)
            ).catch(() => null);
          }}
          onBack={() => {
            setActiveView("dashboard");
            setShowProfileModal(true);
          }}
        />
      )}

      {/* SCREEN 5: COACH SETTINGS PAGE */}
      {activeView === "settings" && (
        <CoachSettings
          settings={coachSettingsData}
          onUpdateSettings={setCoachSettingsData}
          onBack={() => setActiveView("dashboard")}
          onLogout={onLogout}
        />
      )}

      {/* OCR SCREEN 1: UPLOAD STATS & FILE PICKER */}
      {activeView === "ocr_logging" && (
        <OCRlogging
          currentTeam={currentTeam}
          selectedTeamId={selectedTeamId}
          teams={teams}
          onBack={() => setActiveView("dashboard")}
          onUploadSuccess={(data) => {
            setOcrPayload(data);
            setActiveView("ocr_output");
          }}
        />
      )}

      {/* OCR SCREEN 2: DETECTED RAW TEAM STATISTICS REVIEW & EDIT */}
      {activeView === "ocr_output" && (
        <OCRoutput
          rawOCRData={ocrPayload}
          currentTeam={currentTeam}
          selectedTeamId={selectedTeamId}
          teams={teams}
          onBack={() => setActiveView("ocr_logging")}
          onGoHome={() => {
            setActiveTab("Home");
            setActiveView("dashboard");
          }}
          onConfirmSave={async (finalData) => {
            // Strictly resolve and lock the active coach's team context
            const targetCoachTeam = currentTeam || teams.find((t) => t.team_id === selectedTeamId) || teams[0];
            const lockedTeamName = (targetCoachTeam?.team_name || finalData.team_name || "Team").trim();
            const lockedTeamId = targetCoachTeam?.team_id || (finalData as any).team_id || "";

            // Accurately compute athlete points sum per team
            const homeAthleteSum = finalData.athlete_overview
              .filter((a) => (a.team_name || "").toUpperCase() === lockedTeamName.toUpperCase())
              .reduce((acc, p) => acc + (p.pts || 0), 0);
            const oppAthleteSum = finalData.athlete_overview
              .filter((a) => (a.team_name || "").toUpperCase() === (finalData.opponent_team_name || "").toUpperCase())
              .reduce((acc, p) => acc + (p.pts || 0), 0);

            const detectedScoresList = (finalData.team_scores || [])
              .map((t: any) => Number(t.score))
              .filter((s: number) => !isNaN(s) && s > 0);

            let homePts: number;
            let oppPts: number;

            if (detectedScoresList.length >= 2) {
              const maxScore = Math.max(...detectedScoresList);
              const minScore = Math.min(...detectedScoresList);
              if (homeAthleteSum >= oppAthleteSum) {
                homePts = maxScore;
                oppPts = minScore;
              } else {
                homePts = minScore;
                oppPts = maxScore;
              }
            } else {
              homePts = homeAthleteSum;
              oppPts = oppAthleteSum;
            }

            const ocrSport = (finalData.sport_type || "BASKETBALL").toUpperCase() as any;
            const isOcrTimed = ocrSport.includes("SWIM") || ocrSport.includes("TRACK") || ocrSport.includes("FIELD");
            const firstOcrStat = finalData.athlete_overview[0];
            const ocrTime = (firstOcrStat as any)?.time || (firstOcrStat as any)?.finish_time || (firstOcrStat as any)?.mark;
            const ocrEvent = (finalData as any)?.event || (finalData as any)?.event_name || (firstOcrStat as any)?.event || (firstOcrStat as any)?.event_name || (firstOcrStat as any)?.position || "";
            const ocrTitle = isOcrTimed
              ? (ocrEvent ? `${lockedTeamName} • ${ocrEvent}` : (ocrSport.includes("SWIM") ? `${lockedTeamName} • Swimming Meet` : `${lockedTeamName} • Track & Field Meet`))
              : `${lockedTeamName} vs ${finalData.opponent_team_name || "OPPONENT"}`;
            const ocrSummary = isOcrTimed ? (ocrTime ? `Time: ${ocrTime}` : "Official Meet Results") : `${homePts} - ${oppPts}`;
            const ocrBadge = isOcrTimed ? "1ST PLACE" : (homePts >= oppPts ? "RESULT WIN" : "RESULT LOSS");

            const newMatchItem: MatchHistoryItem = {
              match_id: `match_ocr_${Date.now()}`,
              team_id: lockedTeamId,
              date_formatted: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              full_date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
              date_group: "MATCH LOGS",
              event_or_opponent: ocrTitle,
              score_or_time_summary: ocrSummary,
              sport_category: ocrSport,
              result_badge_text: ocrBadge,
              is_official: false,
              home_team: lockedTeamName,
              away_team: isOcrTimed ? "" : (finalData.opponent_team_name || "OPPONENT"),
              home_score: isOcrTimed ? undefined : homePts,
              away_score: isOcrTimed ? undefined : oppPts,
              entries_count: finalData.athlete_overview.length,
              player_stats: finalData.athlete_overview.map((p, idx) => ({
                ...p,
                name: p.player_name,
                player_name: p.player_name,
                team: p.team_name,
                team_name: p.team_name,
                event: p.event || ocrEvent,
                event_name: p.event_name || p.event || ocrEvent,
                eventType: p.eventType || p.event || ocrEvent,
                time: p.time || p.finish_time || "",
                finish_time: p.finish_time || p.time || "",
                rank: p.rank || p.place || (idx + 1),
                place: p.place || p.rank || (idx + 1),
                pts: Number(p.pts || 0),
                ast: Number(p.ast || 0),
                reb: Number(p.reb || 0),
                stl: Number(p.stl || 0),
                blk: Number(p.blk || 0),
                pf: Number(p.fouls || p.pf || 0),
                to: Number(p.to || 0),
                min: Number(p.min || 0),
                stats: { ...p, event: p.event || ocrEvent, event_name: p.event_name || p.event || ocrEvent },
              })),
              leaderboard_entries: finalData.athlete_overview.map((p, idx) => ({
                rank: p.rank || p.place || idx + 1,
                name: p.player_name,
                detail: [p.event || ocrEvent, p.team_name || lockedTeamName].filter(Boolean).join(" • "),
                time_or_score: p.time || p.finish_time || `${p.pts || 0} pts`,
              })),
              coach_notes: [`OCR Scanned Match: ${lockedTeamName} ${ocrEvent ? `• ${ocrEvent}` : `vs ${finalData.opponent_team_name || "Opponent"}`} (${homePts} - ${oppPts})`],
            };

            setMatchHistoryList((prev) => [newMatchItem, ...prev]);

            // Update roster athletes state with the confirmed OCR performance stats (strictly for owned roster athletes)
            setAthletesPool((prev: RosterAthlete[]) => {
              const updated = [...prev];
              finalData.athlete_overview.forEach((stat) => {
                const existingIndex = updated.findIndex(
                  (a) =>
                    (stat.athlete_id && a.athlete_id === stat.athlete_id) ||
                    a.full_name.trim().toLowerCase() === (stat.player_name || "").trim().toLowerCase()
                );
                if (existingIndex >= 0) {
                  updated[existingIndex] = {
                    ...updated[existingIndex],
                    jersey_number: String(stat.jersey_number || updated[existingIndex].jersey_number),
                  };
                }
              });
              return updated;
            });

            // Update Performance page athletes list strictly for coach's active roster
            setPerfAthletes((prev: AthletePerformanceProfile[]) => {
              const updated = [...prev];
              finalData.athlete_overview.forEach((stat) => {
                const isRosterPlayer = athletesPool.some(
                  (a) =>
                    (stat.athlete_id && a.athlete_id === stat.athlete_id) ||
                    a.full_name.trim().toLowerCase() === (stat.player_name || "").trim().toLowerCase()
                );
                if (!isRosterPlayer) return;

                const existingIndex = updated.findIndex(
                  (a) =>
                    (stat.athlete_id && a.athlete_id === stat.athlete_id) ||
                    a.full_name.trim().toLowerCase() === (stat.player_name || "").trim().toLowerCase()
                );
                const gamePts = Number(stat.pts || 0);
                const gameAst = Number(stat.ast || 0);
                const gameReb = Number(stat.reb || 0);

                if (existingIndex >= 0) {
                  const curr = updated[existingIndex];
                  const prevGames = Number(curr.averages?.games_played || 1);
                  const newGames = prevGames + 1;
                  const prevPpg = Number(curr.averages?.ppg || gamePts);
                  const prevApg = Number(curr.averages?.apg || gameAst);
                  const prevRpg = Number(curr.averages?.rpg || gameReb);

                  const newPpg = Number(((prevPpg * prevGames + gamePts) / newGames).toFixed(1));
                  const newApg = Number(((prevApg * prevGames + gameAst) / newGames).toFixed(1));
                  const newRpg = Number(((prevRpg * prevGames + gameReb) / newGames).toFixed(1));

                  const prevTrends = Array.isArray(curr.scoring_trends_last_10) ? curr.scoring_trends_last_10 : [prevPpg];
                  const newTrends = [...prevTrends, gamePts].slice(-10);

                  const newRating = Math.min(99, Math.max(75, Math.round(70 + (newPpg * 0.5) + (newApg * 0.8) + (newRpg * 0.6))));

                  updated[existingIndex] = {
                    ...curr,
                    team_name: stat.team_name || curr.team_name,
                    rating_score: newRating,
                    averages: {
                      ...curr.averages,
                      ppg: newPpg,
                      apg: newApg,
                      rpg: newRpg,
                      games_played: newGames,
                    },
                    scoring_trends_last_10: newTrends,
                  };
                }
              });
              return updated;
            });

            setTeams((prev: Team[]) =>
              prev.map((t: Team) => ({
                ...t,
                roster_list: t.roster_list.map((p: RosterAthlete) => {
                  const matchedStat = finalData.athlete_overview.find(
                    (s) => s.player_name.toLowerCase() === p.full_name.toLowerCase()
                  );
                  if (matchedStat) {
                    return {
                      ...p,
                      event_distance: matchedStat.time ? matchedStat.time : p.event_distance,
                    };
                  }
                  return p;
                }),
              }))
            );

            // View redirection is handled after user taps 'Go back to Home' or 3-second delay in OCRoutput modal

            // Asynchronous background task: Persist match and player stats to Firestore / Backend silently
            (async () => {
            try {
              const token = await getStoredAuthToken();
              const idempotencyKey = `ocr_match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              
              const resolvedTeamName = lockedTeamName;
              const resolvedOpponentName = finalData.opponent_team_name || "Opponent";
              const scoresheetUrlVal = finalData.scoresheetUrl || finalData.scoresheet_url || "";

              const findMatchedRosterAthlete = (p: any) => {
                const pName = String(p.player_name || '').trim().toLowerCase();
                const pJersey = p.jersey_number !== undefined && p.jersey_number !== null ? String(p.jersey_number) : null;
                return athletesPool.find((a) => {
                  const aName = String(a.full_name || `${a.first_name || ''} ${a.last_name || ''}`).trim().toLowerCase();
                  if (pName && (aName === pName || aName.includes(pName) || pName.includes(aName))) return true;
                  const aLast = String(a.last_name || '').trim().toLowerCase();
                  if (aLast && pName.includes(aLast)) return true;
                  if (pJersey !== null && String(a.jersey_number) === pJersey) return true;
                  return false;
                });
              };

              const homeRosterAthletes = finalData.athlete_overview
                .filter((p) => (p.team_name || "").toUpperCase() === resolvedTeamName.toUpperCase())
                .map((p, idx) => {
                  const found = findMatchedRosterAthlete(p);
                  return found?.athlete_id || p.athlete_id || `ath_ocr_home_${idx + 1}`;
                });

              const awayRosterAthletes = finalData.athlete_overview
                .filter((p) => (p.team_name || "").toUpperCase() !== resolvedTeamName.toUpperCase())
                .map((p, idx) => {
                  const found = findMatchedRosterAthlete(p);
                  return found?.athlete_id || p.athlete_id || `ath_ocr_away_${idx + 1}`;
                });

              const playerStatsPayload = finalData.athlete_overview.map((p, idx) => {
                const found = findMatchedRosterAthlete(p);
                const athleteId = found?.athlete_id || p.athlete_id || `ath_ocr_${idx + 1}`;
                
                // Preserve all secondary stats verbatim from OCR without math approximations or dropping
                const rawStats = {
                  ...p,
                  points: Number(p.pts ?? p.points ?? 0),
                  pts: Number(p.pts ?? p.points ?? 0),
                  assists: Number(p.ast ?? p.assists ?? 0),
                  ast: Number(p.ast ?? p.assists ?? 0),
                  rebounds: Number(p.reb ?? p.rebounds ?? 0),
                  reb: Number(p.reb ?? p.rebounds ?? 0),
                  steals: Number(p.stl ?? p.steals ?? 0),
                  stl: Number(p.stl ?? p.steals ?? 0),
                  blocks: Number(p.blk ?? p.blocks ?? 0),
                  blk: Number(p.blk ?? p.blocks ?? 0),
                  turnovers: Number(p.to ?? p.turnovers ?? 0),
                  to: Number(p.to ?? p.turnovers ?? 0),
                  fouls: Number(p.fouls ?? p.pf ?? 0),
                  pf: Number(p.fouls ?? p.pf ?? 0),
                  minutes: Number(p.min ?? p.minutes ?? 0),
                  min: Number(p.min ?? p.minutes ?? 0),
                  fg_made: Number(p.fg_made ?? 0),
                  fg_attempted: Number(p.fg_attempted ?? 0),
                  three_made: Number(p.three_made ?? 0),
                  three_attempted: Number(p.three_attempted ?? 0),
                  ft_made: Number(p.ft_made ?? 0),
                  ft_attempted: Number(p.ft_attempted ?? 0),
                  kills: Number(p.kills ?? 0),
                  attack_errors: Number(p.attack_errors ?? 0),
                  attack_attempts: Number(p.attack_attempts ?? 0),
                  digs: Number(p.digs ?? 0),
                  service_aces: Number(p.service_aces ?? 0),
                  goals: Number(p.goals ?? 0),
                  saves: Number(p.saves ?? 0),
                  shots: Number(p.shots ?? 0),
                  shots_on_target: Number(p.shots_on_target ?? 0),
                  tackles: Number(p.tackles ?? 0),
                  finish_time: String(p.finish_time || p.time || ""),
                  time: String(p.time || p.finish_time || ""),
                  split_times: String(p.split || p.split_times || ""),
                  event: p.event || ocrEvent,
                  event_name: p.event_name || p.event || ocrEvent,
                  eventType: p.eventType || p.event || ocrEvent,
                  rank: p.rank || p.place || (idx + 1),
                  place: p.place || p.rank || (idx + 1),
                  placement_rank: p.rank || p.place || (idx + 1),
                  distance_meters: p.distance_meters || (isOcrTimed ? 50 : 0),
                };

                return {
                  ...rawStats,
                  athlete_id: athleteId,
                  player_name: p.player_name,
                  team_name: p.team_name,
                  jersey_number: p.jersey_number,
                  position: p.position || (isOcrTimed ? (ocrSport.includes("SWIM") ? "Swimmer" : "Runner") : "Player"),
                  event: p.event || ocrEvent,
                  event_name: p.event_name || p.event || ocrEvent,
                  eventType: p.eventType || p.event || ocrEvent,
                  time: String(p.time || p.finish_time || ""),
                  finish_time: String(p.finish_time || p.time || ""),
                  rank: p.rank || p.place || (idx + 1),
                  place: p.place || p.rank || (idx + 1),
                  placement_rank: p.rank || p.place || (idx + 1),
                  pts: rawStats.points,
                  reb: rawStats.rebounds,
                  ast: rawStats.assists,
                  stl: rawStats.steals,
                  blk: rawStats.blocks,
                  pf: rawStats.fouls,
                  to: rawStats.turnovers,
                  min: rawStats.minutes,
                  stats: rawStats,
                  sport_stats: rawStats,
                  custom_stats: rawStats,
                };
              });

              const matchPayload = {
                match_id: newMatchItem.match_id,
                team_id: lockedTeamId,
                home_team_name: lockedTeamName,
                away_team_name: isOcrTimed ? "" : resolvedOpponentName,
                opponent_team_name: isOcrTimed ? "" : resolvedOpponentName,
                match_name: ocrTitle,
                game_name: ocrTitle,
                event: ocrEvent || undefined,
                event_name: ocrEvent || undefined,
                event_type: ocrEvent || undefined,
                discipline: ocrEvent || undefined,
                distance_meters: (finalData as any).distance_meters || (isOcrTimed ? 50 : 0),
                home_score: isOcrTimed ? undefined : homePts,
                away_score: isOcrTimed ? undefined : oppPts,
                sport_type:
                  finalData.sport_type === "SWIMMING"
                    ? "Swimming"
                    : finalData.sport_type === "TRACK AND FIELD"
                    ? "Track & Field"
                    : finalData.sport_type
                    ? finalData.sport_type.charAt(0).toUpperCase() + finalData.sport_type.slice(1).toLowerCase()
                    : "Basketball",
                match_type: "OCR Scanned Match",
                match_date: new Date().toISOString(),
                location: (finalData as any).location || "Arena",
                game_result: isOcrTimed ? "COMPLETED" : (homePts >= oppPts ? "WIN" : "LOSS"),
                notes: isOcrTimed
                  ? `OCR Logged: ${lockedTeamName} • ${ocrEvent || "Timed Event"}`
                  : `OCR Logged: ${lockedTeamName} vs ${resolvedOpponentName} (${homePts} - ${oppPts})`,
                player_stats: playerStatsPayload,
                playerStats: playerStatsPayload,
                roster_athletes: homeRosterAthletes,
                rosterAthletes: homeRosterAthletes,
                away_roster_athletes: awayRosterAthletes,
                awayRosterAthletes: awayRosterAthletes,
                scoresheet_url: scoresheetUrlVal,
                scoresheetUrl: scoresheetUrlVal,
              };

              // 1. Persist offline-first to Firestore & local storage
              await saveMatchOfflineFirst(matchPayload).catch(() => null);

              // 2. Transmit to backend REST API
              const saveRes = await fetch(`${API_BASE}/matches`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Idempotency-Key": idempotencyKey,
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(matchPayload),
              });

              if (saveRes.ok) {
                const resJson = await saveRes.json();
                if (resJson?.match?.match_id) {
                  newMatchItem.match_id = resJson.match.match_id;
                }
              }

              // Immediately fetch latest snapshot from the database so the app is always 100% in sync with Firestore
              const updatedSnapshot = await requestAuthenticatedJson("/sync/coach-snapshot").catch(() => null);
              if (updatedSnapshot && Array.isArray(updatedSnapshot.scheduled_matches) && updatedSnapshot.scheduled_matches.length > 0) {
                const refreshedMatches: MatchHistoryItem[] = updatedSnapshot.scheduled_matches.map((m: any) => {
                  const homeScoreMatch = (m.notes || "").match(/\((\d+)\s*-\s*(\d+)\)/);
                  const hScore = m.home_score !== undefined ? Number(m.home_score) : (homeScoreMatch ? parseInt(homeScoreMatch[1], 10) : undefined);
                  const aScore = m.away_score !== undefined ? Number(m.away_score) : (homeScoreMatch ? parseInt(homeScoreMatch[2], 10) : undefined);
                  const homeName = m.home_team_name || m.home_team || (m.notes || "").match(/OCR Logged:\s*([^v]+)\s*vs/i)?.[1]?.trim() || "CELTICS";
                  const oppName = m.away_team_name || m.away_team || m.opponent_team_name || "HAWKS";

                  const sportUpper = (m.sport_type || "BASKETBALL").toUpperCase();
                  const isTimed = sportUpper.includes("SWIM") || sportUpper.includes("TRACK") || sportUpper.includes("FIELD");
                  const pStats = m.player_stats || [];
                  const cleanMeet = (m.game_name || m.match_name || "").replace(/\s*vs\s*OPPONENT.*$/i, "").trim();

                  // Team-level event title for Dashboard & Team Match History
                  let eventTitle = "";
                  if (cleanMeet && !cleanMeet.toLowerCase().includes("vs")) {
                    if (homeName && oppName && oppName !== "OPPONENT" && oppName !== "OPPONENT TEAM") {
                      eventTitle = `${cleanMeet} • ${homeName} vs ${oppName}`;
                    } else if (homeName && homeName !== "ATLETA" && homeName !== "ATLETA VARSITY") {
                      eventTitle = `${cleanMeet} • ${homeName}`;
                    } else {
                      eventTitle = cleanMeet;
                    }
                  } else if (homeName && oppName) {
                    eventTitle = `${homeName} vs ${oppName}`;
                  } else {
                    eventTitle = cleanMeet || `${homeName || "Team"} Meet`;
                  }

                  let summaryScore = hScore !== undefined && aScore !== undefined ? `${hScore} - ${aScore}` : (m.notes || (m.game_result === "WIN" ? "FINAL WIN" : "FINAL LOSS"));
                  if (isTimed) {
                    summaryScore = hScore !== undefined && aScore !== undefined ? `${hScore} - ${aScore}` : "Official Meet Results";
                  }

                  let badgeText = m.game_result ? `RESULT ${String(m.game_result).toUpperCase().replace(/^RESULT\s*/, "")}` : (hScore !== undefined && aScore !== undefined && hScore >= aScore ? "RESULT WIN" : (hScore !== undefined && aScore !== undefined ? "RESULT LOSS" : "OFFICIAL"));
                  if (isTimed) {
                    if (m.game_result && (String(m.game_result).includes("1st") || String(m.game_result).toUpperCase().includes("WIN"))) {
                      badgeText = "1ST PLACE";
                    } else if (m.game_result && String(m.game_result).includes("2nd")) {
                      badgeText = "2ND PLACE";
                    } else if (m.game_result && String(m.game_result).includes("3rd")) {
                      badgeText = "3RD PLACE";
                    } else if (m.is_official) {
                      badgeText = "1ST PLACE";
                    } else {
                      badgeText = "COMPLETED";
                    }
                  }

                  return {
                    match_id: m.match_id || `match_${Date.now()}`,
                    date_formatted: m.match_date ? new Date(m.match_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "RECENT",
                    full_date: m.match_date ? new Date(m.match_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "RECENT",
                    date_group: "MATCH LOGS",
                    event_or_opponent: eventTitle,
                    score_or_time_summary: summaryScore,
                    sport_category: sportUpper,
                    result_badge_text: badgeText,
                    is_official: m.is_official !== false,
                    home_team: homeName,
                    away_team: oppName,
                    home_score: isTimed ? undefined : hScore,
                    away_score: isTimed ? undefined : aScore,
                    player_stats: pStats,
                    coach_notes: m.notes ? [m.notes] : ["Match recorded."],
                  };
                });
                setMatchHistoryList(refreshedMatches);
              }
            } catch (saveErr) {
              console.warn("Could not persist match to Firestore:", saveErr);
            }
            })();
          }}
        />
      )}

      {/* COACH HOME DASHBOARD */}
      {activeView === "dashboard" && (
        <>
          <AtletaHeader
            avatarUrl={coachProfile.avatar_url || coach.avatar_url}
            onSettingsPress={() => setActiveView("settings")}
            onProfilePress={() => setShowProfileModal(true)}
            onNotificationPress={() => setShowNotificationsModal(true)}
            unreadNotificationCount={unreadNotifCount}
          />
          <View style={{ flex: 1, paddingTop: headerTopPadding + 74 }}>
            {/* SCROLLABLE DASHBOARD BODY */}
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 150 },
              ]}
              showsVerticalScrollIndicator={false}
              overScrollMode="never"
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor="#00C8FF"
                  colors={["#00C8FF"]}
                />
              }
            >
            {/* Greeting Block */}
            <View style={styles.greetingSection}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={styles.greetingTitle}>Hi, {coach.first_name}!</Text>
                {isDashboardLoading && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0, 200, 255, 0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "rgba(0, 200, 255, 0.25)" }}>
                    <ActivityIndicator size="small" color="#00C8FF" />
                    <Text style={{ color: "#00C8FF", fontSize: 11, fontWeight: "600" }}>Syncing...</Text>
                  </View>
                )}
              </View>
              <Text style={styles.greetingSubtitle}>
                Empower your athletes today. Ready to manage your elite teams?
              </Text>
            </View>

            {/* Sports Categories Filter */}
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>SPORTS CATEGORIES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
                {availableSportCategories.map((category) => {
                  const isActive = activeSportFilter === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setActiveSportFilter(category)}
                      activeOpacity={0.8}
                      style={[styles.pillButton, isActive ? styles.pillActive : styles.pillInactive]}
                    >
                      <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* RECENT MATCHES & MEETS Recap Feed */}
            <View style={styles.recentMatchesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>RECENT MATCHES & MEETS</Text>
                <TouchableOpacity
                  onPress={() => {
                    setPreviousPortfolioView("dashboard");
                    setActiveView("match_history");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {dashboardRecentMatches.length === 0 ? (
                <View style={styles.emptyRecentMatchCard}>
                  <Ionicons name="trophy-outline" size={28} color="#64748B" />
                  <Text style={styles.emptyRecentMatchTitle}>
                    {activeSportFilter !== "ALL"
                      ? `No ${activeSportFilter} Matches Logged`
                      : "No Matches Logged Yet"}
                  </Text>
                  <Text style={styles.emptyRecentMatchSub}>
                    Use the '+' button below to log matches or scan official scorecards.
                  </Text>
                </View>
              ) : (
                dashboardRecentMatches.map((matchItem) => {
                  const sc = String(matchItem.sport_category || "").toUpperCase();
                  const isWin =
                    String(matchItem.result_badge_text || "").toUpperCase().includes("WIN") ||
                    String(matchItem.result_badge_text || "").includes("1ST");
                  let sportIcon: any = "trophy-outline";
                  if (sc.includes("SWIM")) sportIcon = "water-outline";
                  else if (sc.includes("TRACK") || sc.includes("FIELD") || sc.includes("RUN")) sportIcon = "stopwatch-outline";
                  else if (sc.includes("BASKET")) sportIcon = "basketball-outline";
                  else if (sc.includes("VOLLEY")) sportIcon = "tennisball-outline";

                  const athCount = Array.isArray(matchItem.player_stats)
                    ? matchItem.player_stats.length
                    : Array.isArray(matchItem.athlete_ids)
                      ? matchItem.athlete_ids.length
                      : 0;

                  return (
                    <TouchableOpacity
                      key={matchItem.match_id}
                      style={styles.recentMatchCard}
                      activeOpacity={0.8}
                      onPress={() => handleSelectRecentMatch(matchItem)}
                    >
                      <View style={styles.recentMatchHeader}>
                        <View style={styles.recentMatchSportTag}>
                          <Ionicons name={sportIcon} size={11} color="#00C8FF" />
                          <Text style={styles.recentMatchSportText}>
                            {matchItem.sport_category?.toUpperCase() || "MATCH"}
                          </Text>
                        </View>
                        <Text style={styles.recentMatchDate}>
                          {matchItem.date_formatted || matchItem.full_date || "RECENT"}
                        </Text>
                      </View>

                      <View style={styles.recentMatchTitleRow}>
                        <Text style={styles.recentMatchTitle} numberOfLines={1}>
                          {matchItem.event_or_opponent || matchItem.match_name || matchItem.game_name || "Official Match"}
                        </Text>
                        <View style={[styles.recentMatchBadge, isWin ? styles.recentMatchBadgeWin : styles.recentMatchBadgeOther]}>
                          <Text style={isWin ? styles.recentMatchBadgeTextWin : styles.recentMatchBadgeTextOther}>
                            {matchItem.result_badge_text || (isWin ? "WIN" : "COMPLETED")}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.recentMatchFooter}>
                        <Text style={styles.recentMatchSummaryText}>
                          {matchItem.score_or_time_summary || "Match Recorded"}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          {athCount > 0 && (
                            <Text style={styles.recentMatchAthletesCount}>
                              {athCount} {athCount === 1 ? "Athlete" : "Athletes"} Logged
                            </Text>
                          )}
                          <Ionicons name="chevron-forward" size={14} color="#64748B" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* TOTAL MATCHES & MEETS Card */}
            <View style={styles.summaryTile}>
              <Text style={styles.summaryLabel}>
                {activeSportFilter === "ALL" ? "TOTAL MATCHES & MEETS" : `TOTAL MATCHES (${activeSportFilter})`}
              </Text>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryPillValue}>{dashboardRecentMatches.length}</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </>
    )}

      {/* MY TEAMS PAGE */}
      {activeView === "teams_list" && (
        <MyTeamsPage
          teams={teams}
          athletesPool={athletesPool}
          coachName={`${coach.first_name || ''} ${coach.last_name || ''}`.trim() || undefined}
          avatarUrl={coachProfile.avatar_url || coach.avatar_url}
          onSelectTeam={(team) => {
            setSelectedTeamId(team.team_id);
            setActiveView("manage_team");
          }}
          onCreateTeam={handleCreateTeam}
          onLogout={onLogout}
          onSettingsPress={() => setActiveView("settings")}
          onProfilePress={() => setShowProfileModal(true)}
          onNotificationPress={() => setShowNotificationsModal(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          unreadNotificationCount={unreadNotifCount}
        />
      )}

      {/* MANAGE TEAM SCREEN */}
      {activeView === "manage_team" && currentTeam && (
        <ManageTeamPage
          team={currentTeam}
          athletesPool={athletesPool}
          onBack={() => {
            setActiveView("teams_list");
            setActiveTab("Teams");
          }}
          onDeleteTeam={handleDeleteTeam}
          onUpdateTeamName={handleUpdateTeamName}
          onUpdateTeamDetails={handleUpdateTeamDetails}
          onSaveRoster={handleSaveRoster}
          onUpdateRosterPlayer={handleUpdateRosterPlayer}
          onUpdateRosterPlayerDetails={handleUpdateRosterPlayerDetails}
          onRemovePlayer={handleRemovePlayer}
          onAddPlayers={handleAddPlayersToTeam}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      )}

      {/* VIEW ALL PLAYERS PAGE */}
      {activeView === "view_all_players" && (
        <ViewAllPlayers
          athletesPool={athletesPool}
          teams={teams}
          availableSports={availableSportCategories}
          onBack={() => setActiveView("dashboard")}
          onSelectAthlete={(player) => handleViewStats(player)}
          onLogout={onLogout}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      )}

      {/* OFFICIAL MATCHES & AUDIT SCORESHEET REQUEST MODULE */}
      {activeView === "official_matches" && (
        <OfficialMatchesPage onBack={() => setActiveView("dashboard")} />
      )}

      {/* DISCOVERY MODULE */}
      {activeView === "discovery" && (
        <DiscoveryMain
          avatarUrl={coachProfile.avatar_url || coach.avatar_url}
          onSettingsPress={() => setActiveView("settings")}
          onProfilePress={() => setShowProfileModal(true)}
          onNotificationPress={() => setShowNotificationsModal(true)}
          unreadNotificationCount={unreadNotifCount}
          onToggleBottomNav={(hide) => setHideDiscoveryNav(hide)}
        />
      )}

      {/* PERFORMANCE MODULE  */}
      {activeView === "performance" && (
        <PerformancePage
          athletes={perfAthletes}
          avatarUrl={coachProfile.avatar_url || coach.avatar_url}
          onSelectAthlete={(ath) => {
            setSelectedPerfAthlete(ath);
            setPreviousPortfolioView("performance");
            setActiveView("athlete_portfolio");
          }}
          onSettingsPress={() => setActiveView("settings")}
          onProfilePress={() => setShowProfileModal(true)}
          onNotificationPress={() => setShowNotificationsModal(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          unreadNotificationCount={unreadNotifCount}
        />
      )}

      {activeView === "athlete_portfolio" && (
        <AthletePortfolio
          athlete={selectedPerfAthlete}
          matches={athleteFilteredMatches}
          isSimpleView={previousPortfolioView === "dashboard" || previousPortfolioView === "view_all_players"}
          onClose={() => {
            let returnView = previousPortfolioView;
            if (!returnView || returnView === "athlete_portfolio") {
              returnView = activeTab === "Performance" ? "performance" : "dashboard";
            }
            setActiveView(returnView);
            if (returnView === "performance") {
              setActiveTab("Performance");
            } else if (returnView === "dashboard" || returnView === "view_all_players") {
              setActiveTab("Home");
            }
          }}
          onViewAllStats={() => setActiveView("all_stats")}
          onViewMatchHistory={() => {
            const safeBase = previousPortfolioView && previousPortfolioView !== "athlete_portfolio"
              ? previousPortfolioView
              : (activeTab === "Performance" ? "performance" : "dashboard");
            setPreviousPortfolioView(safeBase);
            setActiveView("match_history");
          }}
        />
      )}

      {activeView === "all_stats" && (
        <AllStats
          athlete={selectedPerfAthlete}
          matches={athleteFilteredMatches}
          onClose={() => setActiveView("athlete_portfolio")}
          onUpdateWorkload={(updatedWorkload) => {
            setSelectedPerfAthlete((prev) => ({
              ...prev,
              workload_analytics: updatedWorkload,
            }));
            setPerfAthletes((prev) =>
              prev.map((a) =>
                a.athlete_id === selectedPerfAthlete.athlete_id
                  ? { ...a, workload_analytics: updatedWorkload }
                  : a
              )
            );
          }}
        />
      )}

      {activeView === "match_history" && (
        <MatchHistory
          sportCategory={previousPortfolioView === "dashboard" ? (activeSportFilter === "ALL" ? undefined : activeSportFilter) : selectedPerfAthlete?.sport_category}
          historyItems={previousPortfolioView === "dashboard" ? allFilteredMatches : athleteFilteredMatches}
          onClose={() => setActiveView(previousPortfolioView || "dashboard")}
          onSelectMatchItem={(matchItem) => {
            setSelectedMatchItem(matchItem);
            const matchSport = String(matchItem.sport_category || selectedPerfAthlete?.sport_category || "").toUpperCase();
            if (matchSport.includes("BASKET") || matchSport.includes("VOLLEY")) {
              setActiveView("perf_basketball_result");
            } else if (matchSport.includes("SWIM")) {
              setActiveView("perf_swimming_result");
            } else {
              setActiveView("perf_trackfield_result");
            }
          }}
        />
      )}

      {activeView === "perf_trackfield_result" && (
        <TrackfieldMatchResult
          matchItem={selectedMatchItem}
          onBack={() => setActiveView(previousPortfolioView === "dashboard" ? "match_history" : (previousPortfolioView || "performance"))}
        />
      )}

      {activeView === "perf_swimming_result" && (
        <SwimmingMatchResult
          matchItem={selectedMatchItem}
          onBack={() => setActiveView(previousPortfolioView === "dashboard" ? "match_history" : (previousPortfolioView || "performance"))}
        />
      )}

      {activeView === "perf_basketball_result" && (
        <BasketballMatchResult
          matchItem={selectedMatchItem}
          onBack={() => setActiveView(previousPortfolioView === "dashboard" ? "match_history" : (previousPortfolioView || "performance"))}
        />
      )}

      {/* MULTI-LOGGING MODULE */}
      {(activeView === "create_log" ||
        activeView === "basketball_match" ||
        activeView === "swimming_match" ||
        activeView === "track_field_match" ||
        activeView === "match_details") && (
          <MatchSessionProvider>
            {activeView === "create_log" && (
              <CreateLogScreen
                initialAthletes={athletesPool}
                onBack={() => setActiveView("dashboard")}
                onStartLogging={(session) => {
                  const s = (session.sport_type || "").toUpperCase();
                  let targetView: ViewState = "basketball_match";
                  if (s.includes("SWIM")) {
                    targetView = "swimming_match";
                  } else if (s.includes("TRACK") || s.includes("FIELD") || s.includes("RUN")) {
                    targetView = "track_field_match";
                  } else {
                    targetView = "basketball_match";
                  }
                  setActiveManualSportView(targetView);
                  setActiveView(targetView);
                }}
              />
            )}

            {activeView === "basketball_match" && (
              <BasketballMatchScreen
                onClose={() => setActiveView("dashboard")}
                onSaveMatch={() => {
                  setActiveManualSportView("basketball_match");
                  setActiveView("match_details");
                }}
              />
            )}

            {activeView === "swimming_match" && (
              <SwimmingMatchScreen
                onClose={() => setActiveView("dashboard")}
                onSaveMatch={() => {
                  setActiveManualSportView("swimming_match");
                  setActiveView("match_details");
                }}
              />
            )}

            {activeView === "track_field_match" && (
              <TrackFieldMatchScreen
                onClose={() => setActiveView("dashboard")}
                onSaveMatch={() => {
                  setActiveManualSportView("track_field_match");
                  setActiveView("match_details");
                }}
              />
            )}

            {activeView === "match_details" && (
              <MatchDetailsScreen
                onBack={() => setActiveView(activeManualSportView || "basketball_match")}
                onDone={() => setActiveView("dashboard")}
                onSaveComplete={handleMatchSaveCompleted}
              />
            )}
          </MatchSessionProvider>
        )}

      {/* FLOATING ACTION BUTTON */}
      {activeView === "dashboard" && (
        <TouchableOpacity
          style={styles.floatingFabButton}
          onPress={() => setShowFabOverlay(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#070D19" />
        </TouchableOpacity>
      )}

      {/* NAVIGATIONS */}
      {activeView !== "manage_team" &&
        activeView !== "view_all_players" &&
        activeView !== "settings" &&
        activeView !== "edit_profile" &&
        activeView !== "ocr_logging" &&
        activeView !== "ocr_output" &&
        activeView !== "create_log" &&
        activeView !== "athlete_portfolio" &&
        activeView !== "all_stats" &&
        activeView !== "match_history" &&
        activeView !== "perf_trackfield_result" &&
        activeView !== "perf_swimming_result" &&
        activeView !== "perf_basketball_result" &&
        activeView !== "basketball_match" &&
        activeView !== "swimming_match" &&
        activeView !== "track_field_match" &&
        activeView !== "match_details" &&
        activeView !== "official_matches" &&
        !hideDiscoveryNav && (
          <AtletaNavbar activeTab={activeTab} onSelectTab={handleSelectTab} />
        )}

      {/* COACH PROFILE OVERVIEW MODAL */}
      <CoachProfile
        visible={showProfileModal}
        profileData={coachProfile}
        onClose={() => setShowProfileModal(false)}
        onOpenEdit={() => {
          setShowProfileModal(false);
          setActiveView("edit_profile");
        }}
      />

      {/* FLOATING ACTION OVERLAY MENU */}
      <Modal transparent animationType="fade" visible={showFabOverlay} onRequestClose={() => setShowFabOverlay(false)}>
        <TouchableOpacity
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={() => setShowFabOverlay(false)}
        >
          <View style={{ position: "absolute", bottom: 100, right: 20, alignItems: "flex-end" }}>
            <View style={styles.fabMenuCard}>
              <TouchableOpacity
                style={styles.fabActionRow}
                onPress={() => {
                  setShowFabOverlay(false);
                  setActiveView("ocr_logging");
                }}
              >
                <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Upload Stats</Text>
              </TouchableOpacity>

              <View style={styles.fabDivider} />

              <TouchableOpacity
                style={styles.fabActionRow}
                onPress={() => {
                  setShowFabOverlay(false);
                  setActiveView("official_matches");
                }}
              >
                <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Scoresheet Request</Text>
              </TouchableOpacity>

              <View style={styles.fabDivider} />

              <TouchableOpacity
                style={styles.fabActionRow}
                onPress={() => {
                  setShowFabOverlay(false);
                  setActiveView("create_log");
                }}
              >
                <Ionicons name="basketball-outline" size={18} color="#FFFFFF" />
                <Text style={styles.fabActionText}>Create Match</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeFabButton}
              onPress={() => setShowFabOverlay(false)}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* TEAM PROFILE DETAILS */}
      <Modal visible={showTeamDetailsModal} transparent animationType="slide" onRequestClose={() => setShowTeamDetailsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>TEAM PROFILE DETAILS</Text>
              <TouchableOpacity onPress={() => setShowTeamDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {currentTeam ? (
                <>
                  <View style={styles.teamBannerCard}>
                    <View style={styles.sportBadge}>
                      <Text style={styles.sportBadgeText}>{currentTeam.sport_type}</Text>
                    </View>
                    <Text style={styles.teamNameTitle}>{currentTeam.team_name}</Text>
                    <Text style={styles.divisionText}>{currentTeam.division || "Elite Professional"}</Text>

                    <View style={styles.recordBox}>
                      <Text style={styles.recordLabel}>SEASON RECORD</Text>
                      <Text style={styles.recordValue}>
                        {currentTeam?.season_record?.wins ?? 0} Wins - {currentTeam?.season_record?.losses ?? 0} Losses
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.manageCtaButton}
                    onPress={() => {
                      setShowTeamDetailsModal(false);
                      setActiveView("manage_team");
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.manageCtaText}>MANAGE TEAM & ROSTER</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                  <Text style={{ color: "#94A3B8" }}>No team selected.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* COACH NOTIFICATIONS MODAL */}
      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="notifications" size={20} color="#00C8FF" />
                <Text style={styles.modalTitle}>NOTIFICATIONS</Text>
                {unreadNotifCount > 0 && (
                  <View style={{ backgroundColor: "#EF4444", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>{unreadNotifCount} NEW</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {notificationsList && notificationsList.length > 0 ? (
                <>
                  {unreadNotifCount > 0 && (
                    <TouchableOpacity
                      style={{ alignSelf: "flex-end", marginBottom: 12, paddingVertical: 4, paddingHorizontal: 8 }}
                      onPress={handleMarkAllNotificationsRead}
                    >
                      <Text style={{ color: "#00C8FF", fontSize: 12, fontWeight: "700" }}>MARK ALL AS READ</Text>
                    </TouchableOpacity>
                  )}
                  {notificationsList.map((notif, idx) => {
                    const isUnread = !notif.is_read && notif.status !== "READ";
                    const notifId = notif.notification_id || notif.id || `notif_${idx}`;
                    const inquiryId = notif.inquiry_id || notif.scout_id || notif.data?.inquiry_id || (notif.type === "RECRUITMENT_INQUIRY" ? notif.id : null);

                    const titleLower = (notif.title || notif.headline || "").toLowerCase();
                    const bodyLower = (notif.message_body || notif.message || notif.body || notif.notes || "").toLowerCase();

                    const isAccepted = titleLower.includes("accepted") || bodyLower.includes("accepted") || notif.status === "ACCEPTED" || notif.offer_status === "ACCEPTED" || notif.inquiry_status === "ACCEPTED";
                    const isDeclined = titleLower.includes("declined") || bodyLower.includes("declined") || notif.status === "DECLINED" || notif.offer_status === "DECLINED" || notif.inquiry_status === "DECLINED";
                    const isSentByCoach = notif.is_sender === true || notif.sender_role === "Coach" || titleLower.includes("sent") || bodyLower.includes("you sent") || notif.initiated_by === coach?.coach_id || notif.initiated_by === coach?.user_id;

                    const isScoresheetShared = notif.type === "SCORESHEET_SHARED" || Boolean(notif.scoresheet_url || notif.scoresheetUrl);
                    const hasScoresheetUrl = Boolean(notif.scoresheet_url || notif.scoresheetUrl);

                    const isActionableRecruitment = Boolean(inquiryId || (notif.type === "RECRUITMENT_INQUIRY" && !notif.id?.startsWith("notif_"))) && !isAccepted && !isDeclined && !isSentByCoach && !isScoresheetShared && notif.actionable !== false;

                    return (
                      <TouchableOpacity
                        key={notifId}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isUnread) {
                            setNotificationsList((prev) =>
                              prev.map((n) =>
                                (n.notification_id || n.id) === (notif.notification_id || notif.id)
                                  ? { ...n, is_read: true, status: "READ" }
                                  : n
                              )
                            );
                            setUnreadNotifCount((prev) => Math.max(0, prev - 1));
                            requestAuthenticatedJson(`/notifications/${notifId}/read`, "PATCH").catch(() => null);
                          }
                        }}
                        style={{
                          backgroundColor: isUnread ? "rgba(0, 200, 255, 0.08)" : "#0F172A",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isUnread ? "#00C8FF" : "#1E293B",
                          padding: 14,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "800", flex: 1, marginRight: 8 }}>
                            {notif.title || notif.headline || "Coach Notification"}
                          </Text>
                          {isUnread && (
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#00C8FF", marginTop: 4 }} />
                          )}
                        </View>
                        <Text style={{ color: "#94A3B8", fontSize: 13, lineHeight: 18, marginBottom: 8 }}>
                          {notif.message_body || notif.message || notif.body || notif.notes || "No message content."}
                        </Text>
                        
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                          <Text style={{ color: "#64748B", fontSize: 11 }}>
                            {notif.relative_time || notif.created_at || "Recent"}
                          </Text>
                          {isAccepted && (
                            <View style={{ backgroundColor: "rgba(52, 211, 153, 0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#34D399" }}>
                              <Text style={{ color: "#34D399", fontSize: 10, fontWeight: "800" }}>ACCEPTED ✓</Text>
                            </View>
                          )}
                          {isDeclined && (
                            <View style={{ backgroundColor: "rgba(248, 113, 113, 0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#F87171" }}>
                              <Text style={{ color: "#F87171", fontSize: 10, fontWeight: "800" }}>DECLINED</Text>
                            </View>
                          )}
                          {isSentByCoach && !isAccepted && !isDeclined && (
                            <View style={{ backgroundColor: "rgba(56, 189, 248, 0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#38BDF8" }}>
                              <Text style={{ color: "#38BDF8", fontSize: 10, fontWeight: "800" }}>INQUIRY SENT</Text>
                            </View>
                          )}
                          {isScoresheetShared && (
                            <View style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: "#10B981" }}>
                              <Text style={{ color: "#10B981", fontSize: 10, fontWeight: "800" }}>SCORESHEET READY ✓</Text>
                            </View>
                          )}
                        </View>

                        {hasScoresheetUrl && (
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                              style={{
                                flex: 1,
                                backgroundColor: "#10B981",
                                paddingVertical: 8,
                                borderRadius: 8,
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 6,
                              }}
                              onPress={() => {
                                const url = notif.scoresheet_url || notif.scoresheetUrl;
                                if (url) {
                                  setShowNotificationsModal(false);
                                  setTimeout(() => {
                                    setScoresheetPreview({
                                      visible: true,
                                      url,
                                      matchName: notif.match_name || notif.matchName || notif.title || "Official Match",
                                    });
                                  }, 150);
                                } else {
                                  Alert.alert("Scoresheet", "No scoresheet file attached to this notification.");
                                }
                              }}
                            >
                              <Ionicons name="document-text" size={14} color="#080F21" />
                              <Text style={{ color: "#080F21", fontWeight: "800", fontSize: 12 }}>VIEW / DOWNLOAD</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                flex: 1,
                                backgroundColor: "#1E293B",
                                borderWidth: 1,
                                borderColor: "#334155",
                                paddingVertical: 8,
                                borderRadius: 8,
                                alignItems: "center",
                                flexDirection: "row",
                                justifyContent: "center",
                                gap: 6,
                              }}
                              onPress={async () => {
                                try {
                                  const matchId = notif.match_id || notif.matchId || `match_${Date.now()}`;
                                  const matchName = notif.matchName || notif.match_name || "Official Match";
                                  const scoresheetUrl = notif.scoresheet_url || notif.scoresheetUrl;
                                  await saveMatchOfflineFirst({
                                    match_id: matchId,
                                    matchName,
                                    game_name: matchName,
                                    scoresheet_url: scoresheetUrl,
                                    scoresheetUrl,
                                    audit_status: "REQUEST GRANTED",
                                    is_certified: true,
                                  });
                                  Alert.alert("Import Successful", `Official match record for "${matchName}" has been synchronized to your team records!`);
                                } catch (e: any) {
                                  Alert.alert("Import Notice", "Match records are synchronized.");
                                }
                              }}
                            >
                              <Ionicons name="cloud-download-outline" size={14} color="#00C8FF" />
                              <Text style={{ color: "#00C8FF", fontWeight: "800", fontSize: 12 }}>SYNC RECORDS</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {isActionableRecruitment && (
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                            <TouchableOpacity
                              style={{
                                flex: 1,
                                backgroundColor: "#00C8FF",
                                paddingVertical: 8,
                                borderRadius: 8,
                                alignItems: "center",
                              }}
                              onPress={() => handleRespondInquiry(inquiryId || notifId, "Accepted")}
                            >
                              <Text style={{ color: "#080F21", fontWeight: "800", fontSize: 12 }}>ACCEPT</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                flex: 1,
                                backgroundColor: "#1E293B",
                                borderWidth: 1,
                                borderColor: "#334155",
                                paddingVertical: 8,
                                borderRadius: 8,
                                alignItems: "center",
                              }}
                              onPress={() => handleRespondInquiry(inquiryId || notifId, "Declined")}
                            >
                              <Text style={{ color: "#94A3B8", fontWeight: "800", fontSize: 12 }}>DECLINE</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : (
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <Ionicons name="notifications-off-outline" size={48} color="#334155" />
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700", marginTop: 12 }}>
                    No Notifications
                  </Text>
                  <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center", marginTop: 6, paddingHorizontal: 20 }}>
                    You have no new alerts, scoresheet updates, or inquiries at this time.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Fullscreen In-App Scoresheet Preview & Download Modal */}
      <Modal
        visible={Boolean(scoresheetPreview?.visible)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setScoresheetPreview(null);
          setShowNotificationsModal(true);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(3, 7, 18, 0.96)", justifyContent: "center", alignItems: "center", padding: 16 }}>
          <View style={{ width: "100%", height: "92%", backgroundColor: "#0F172A", borderRadius: 16, borderWidth: 1, borderColor: "#1E293B", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1E293B", backgroundColor: "#0A0D14" }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ color: "#00C8FF", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>VERIFIED OFFICIAL SCORESHEET</Text>
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
                  {scoresheetPreview?.matchName || "Official Match"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setScoresheetPreview(null);
                  setShowNotificationsModal(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ backgroundColor: "rgba(255,255,255,0.08)", padding: 6, borderRadius: 20 }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* High-Resolution Scoresheet Image Preview */}
            <View style={{ flex: 1, backgroundColor: "#070D19", justifyContent: "center", alignItems: "center", padding: 8 }}>
              {scoresheetPreview?.url ? (
                <Image
                  source={{ uri: scoresheetPreview.url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Ionicons name="document-text-outline" size={48} color="#64748B" />
                  <Text style={{ color: "#94A3B8", marginTop: 8 }}>Unable to preview scoresheet.</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={{ padding: 14, backgroundColor: "#0A0D14", borderTopWidth: 1, borderTopColor: "#1E293B", gap: 10 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: "#10B981",
                  paddingVertical: 12,
                  borderRadius: 10,
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                }}
                disabled={isDownloadingScoresheet}
                onPress={async () => {
                  if (!scoresheetPreview?.url) return;
                  setIsDownloadingScoresheet(true);
                  await downloadScoresheetToDevice(scoresheetPreview.url, scoresheetPreview.matchName);
                  setIsDownloadingScoresheet(false);
                }}
              >
                {isDownloadingScoresheet ? (
                  <ActivityIndicator size="small" color="#080F21" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#080F21" />
                    <Text style={{ color: "#080F21", fontWeight: "800", fontSize: 14 }}>
                      DOWNLOAD TO DEVICE
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0, 200, 255, 0.12)",
                    borderWidth: 1,
                    borderColor: "#00C8FF",
                    paddingVertical: 10,
                    borderRadius: 10,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onPress={async () => {
                    if (!scoresheetPreview?.url) return;
                    await shareScoresheetFile(scoresheetPreview.url, scoresheetPreview.matchName);
                  }}
                >
                  <Ionicons name="share-social-outline" size={16} color="#00C8FF" />
                  <Text style={{ color: "#00C8FF", fontWeight: "700", fontSize: 13 }}>SHARE</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "#1E293B",
                    borderWidth: 1,
                    borderColor: "#334155",
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    setScoresheetPreview(null);
                    setShowNotificationsModal(true);
                  }}
                >
                  <Text style={{ color: "#94A3B8", fontWeight: "700", fontSize: 13 }}>BACK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  </DiscoveryProvider>
  );
}



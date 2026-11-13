import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AtletaHeader } from "../Components/AtletaHeader";
import { AthletePerformanceProfile } from "../DataTypes";
import { styles } from "./styles/performancePage";
import { getSportsOfflineFirst, getAthletesOfflineFirst } from "../../../../services/firebaseClient";
import { calculatePlayerRating } from "./performanceUtils";

interface PerformancePageProps {
  onSelectAthlete: (athlete: AthletePerformanceProfile) => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  unreadNotificationCount?: number;
  athletes?: AthletePerformanceProfile[];
  avatarUrl?: string | null;
}

const DEFAULT_CATEGORIES = ["ALL", "BASKETBALL", "SWIMMING", "TRACK AND FIELD"];

export const PerformancePage: React.FC<PerformancePageProps> = ({
  onSelectAthlete,
  onSettingsPress,
  onProfilePress,
  onNotificationPress,
  onRefresh,
  isRefreshing = false,
  unreadNotificationCount = 0,
  athletes = [],
  avatarUrl,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(5);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [liveAthletes, setLiveAthletes] = useState<AthletePerformanceProfile[]>([]);

  useEffect(() => {
    let isMounted = true;
    getAthletesOfflineFirst()
      .then((list) => {
        if (!isMounted || !Array.isArray(list) || list.length === 0) return;
        const mapped: AthletePerformanceProfile[] = list.map((a: any) => {
          const stats = a.stats || a.averages || {};
          const avg = a.averages || a.stats || {};
          const sType = String(a.sport_type || a.sport_category || "BASKETBALL").toUpperCase();
          const isSwim = sType.includes("SWIM");
          const isTrack = sType.includes("TRACK") || sType.includes("FIELD");

          const ppg = Number(avg.ppg ?? stats.ppg ?? a.ppg ?? a.pts ?? 0);
          const rpg = Number(avg.rpg ?? stats.rpg ?? a.rpg ?? a.reb ?? 0);
          const apg = Number(avg.apg ?? stats.apg ?? a.ast ?? a.apg ?? 0);
          const per = Number(avg.per_score ?? stats.per_score ?? stats.per ?? a.per ?? (ppg > 0 ? Math.round(ppg * 1.3 + 12) : 0));
          
          const rating = calculatePlayerRating({
            ...a,
            sport_category: sType,
            averages: {
              ...avg,
              ...(!isSwim && !isTrack ? { ppg, rpg, apg, per_score: per } : {}),
              fg_percentage: Number(avg.fg_percentage ?? stats.fg_pct ?? 0),
              games_played: Number(avg.games_played ?? stats.games_played ?? 0),
              wins: Number(avg.wins ?? stats.wins ?? 0),
            },
            stats,
          });

          const heightCm = a.physical_attributes?.height_cm || a.physical_profile?.height_cm || a.height_cm;
          const weightKg = a.physical_attributes?.weight_kg || a.physical_profile?.weight_kg || a.weight_kg;
          const wingspanCm = a.physical_attributes?.wingspan_cm || a.physical_profile?.wingspan_cm || a.wingspan_cm;

          return {
            athlete_id: a.athlete_id || a.user_id || a.id || `ath_${Date.now()}`,
            user_id: a.user_id || a.athlete_id || a.id || "",
            full_name: a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim() || "Athlete",
            birthdate: a.birthdate || a.dob || "2004-10-03",
            position_or_event: a.position || a.position_or_event || "Player",
            location_province: a.province || a.location || "Camarines Sur",
            team_name: a.team_name || "Free Agent",
            rating_score: rating,
            sport_category: sType as any,
            biometrics: a.biometrics || {
              height_ft: heightCm ? `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}"` : "-",
              weight_lbs: weightKg ? `${Math.round(weightKg * 2.20462)} lbs` : "-",
              wingspan_ft: wingspanCm ? `${Math.floor(wingspanCm / 30.48)}'${Math.round((wingspanCm % 30.48) / 2.54)}"` : "-",
              vertical_jump_in: a.physical_profile?.vertical_cm ? `${Math.round(a.physical_profile.vertical_cm / 2.54)}"` : "-",
            },
            averages: {
              ...(stats || {}),
              ...(avg || {}),
              ...(!isSwim && !isTrack ? { ppg, rpg, apg, per_score: per } : {}),
              games_played: Number(avg.games_played ?? stats.games_played ?? 0),
              wins: Number(avg.wins ?? stats.wins ?? 0),
              per_score: per,
              fg_percentage: Number(avg.fg_percentage ?? stats.fg_pct ?? 0),
              kills: avg.kills ?? avg.spike_kills ?? stats.kills ?? stats.spike_kills ?? 0,
              spike_kills: avg.spike_kills ?? avg.kills ?? stats.spike_kills ?? stats.kills ?? 0,
              blocks: avg.blocks ?? avg.block_points ?? stats.blocks ?? stats.block_points ?? 0,
              block_points: avg.block_points ?? avg.blocks ?? stats.block_points ?? stats.blocks ?? 0,
              aces: avg.aces ?? avg.service_aces ?? stats.aces ?? stats.service_aces ?? 0,
              service_aces: avg.service_aces ?? avg.aces ?? stats.service_aces ?? stats.aces ?? 0,
              digs: avg.digs ?? stats.digs ?? 0,
              assists: avg.assists ?? stats.assists ?? 0,
              spike_accuracy: avg.spike_accuracy ?? stats.spike_accuracy ?? 0,
              service_errors: avg.service_errors ?? stats.service_errors ?? 0,
              pb_100m: avg.pb_100m || stats.pb_100m,
              pb_200m: avg.pb_200m || stats.pb_200m,
              reaction_time_s: avg.reaction_time_s || stats.reaction_time_s,
              win_rate_pct: avg.win_rate_pct ?? stats.win_rate_pct,
              pb_50m_free: avg.pb_50m_free || stats.pb_50m_free,
              pb_100m_free: avg.pb_100m_free || stats.pb_100m_free,
              swim_index_score: avg.swim_index_score ?? stats.swim_index_score,
              podiums_count: avg.podiums_count ?? stats.podiums_count,
            },
            radar_competencies: a.radar_competencies || undefined,
            eligibility_documents: {
              psa_verified: Boolean(a.eligibility_documents?.psa_verified || a.documents?.psa_birth_certificate?.status === 'Verified'),
              residency_verified: Boolean(a.eligibility_documents?.proof_of_residency || a.eligibility_documents?.residency_verified || a.documents?.proof_of_residency?.status === 'Verified'),
            },
            workload_analytics: a.workload_analytics || a.workload || undefined,
            scoring_trends_last_10: Array.isArray(a.scoring_trends_last_10) && a.scoring_trends_last_10.length > 0 ? a.scoring_trends_last_10 : [],
          };
        });
        setLiveAthletes(mapped);
      })
      .catch((err) => console.warn("Performance live sync:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    getSportsOfflineFirst()
      .then((sports: any) => {
        if (!isMounted || !Array.isArray(sports) || sports.length === 0) return;
        const seen = new Set<string>();
        const mapped: string[] = ["ALL"];
        sports.forEach((s: any) => {
          const raw = String(s.sport_name || s.name || s.id || '').toUpperCase().trim();
          if (!raw || seen.has(raw)) return;
          seen.add(raw);
          mapped.push(raw);
        });
        if (mapped.length > 1) {
          setCategories(mapped);
        }
      })
      .catch((err: any) => console.warn('Could not fetch dynamic sports for performance:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const displayAthletes = useMemo(() => {
    if (Array.isArray(athletes) && athletes.length > 0) {
      return athletes.map((ath) => {
        const matchingLive = liveAthletes.find(
          (la) =>
            (la.athlete_id && ath.athlete_id && (la.athlete_id === ath.athlete_id || la.user_id === ath.user_id)) ||
            (la.full_name && ath.full_name && la.full_name.toLowerCase() === ath.full_name.toLowerCase())
        );
        const resolvedRating = calculatePlayerRating(ath) || (matchingLive ? calculatePlayerRating(matchingLive) : 0);
        if (matchingLive) {
          return {
            ...ath,
            rating_score: resolvedRating,
            averages: { ...(matchingLive.averages || {}), ...(ath.averages || {}) },
            biometrics: matchingLive.biometrics || ath.biometrics,
            scoring_trends_last_10: (matchingLive.scoring_trends_last_10 && matchingLive.scoring_trends_last_10.length > 0)
              ? matchingLive.scoring_trends_last_10
              : ath.scoring_trends_last_10,
          };
        }
        return {
          ...ath,
          rating_score: resolvedRating || ath.rating_score || 0,
        };
      });
    }
    return [];
  }, [athletes, liveAthletes]);

  const filteredAthletes = useMemo(() => {
    return displayAthletes.filter((ath) => {
      const matchesTab =
        activeTab === "ALL" || (ath.sport_category || "").toUpperCase() === activeTab.toUpperCase();
      const matchesSearch =
        (ath.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ath.team_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ath.position_or_event || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [displayAthletes, activeTab, searchQuery]);

  return (
    <View style={styles.container}>
      <AtletaHeader
        avatarUrl={avatarUrl}
        onSettingsPress={onSettingsPress}
        onProfilePress={onProfilePress}
        onNotificationPress={onNotificationPress}
        unreadNotificationCount={unreadNotificationCount}
      />
      <View style={{ flex: 1, paddingTop: headerTopPadding + 74 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 150 },
          ]}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(isRefreshing)}
                onRefresh={onRefresh}
                tintColor="#00C8FF"
                colors={["#00C8FF"]}
              />
            ) : undefined
          }
        >
        <Text style={styles.pageTitle}>Performance</Text>
        <Text style={styles.pageSubtitle}>
          Performance Metrics and Player Analytics
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search athletes..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {categories.map((cat) => {
            const isActive = activeTab === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.tabText, isActive && styles.tabTextActive]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Ranked Athlete List / Empty State */}
        {filteredAthletes.length === 0 ? (
          <View style={{ paddingVertical: 48, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="people-outline" size={42} color="#64748B" />
            <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "800", marginTop: 12 }}>
              No Athletes in Roster
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 4, textAlign: "center", paddingHorizontal: 20 }}>
              {searchQuery
                ? `No athletes match "${searchQuery}".`
                : "You don't have any athletes assigned to your roster yet. Use the Teams or Discovery tab to add players."}
            </Text>
          </View>
        ) : (
          filteredAthletes.slice(0, visibleCount).map((athlete) => (
            <TouchableOpacity
              key={athlete.athlete_id}
              style={styles.athleteCard}
              onPress={() => onSelectAthlete(athlete)}
              activeOpacity={0.85}
            >
              <View style={styles.avatarBox}>
                <Ionicons name="person" size={24} color="#00C8FF" />
              </View>

              <View style={styles.cardCenter}>
                <Text style={styles.athleteName}>{athlete.full_name}</Text>
                <Text style={styles.athleteSubline}>
                  {athlete.team_name} • {athlete.position_or_event}
                </Text>
                {(() => {
                  const sc = String(athlete.sport_category || '').toUpperCase().trim();
                  if (!athlete.averages) return null;
                  if (sc.includes("BASKETBALL")) {
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {athlete.averages.ppg ?? 0} PPG • {athlete.averages.rpg ?? 0} RPG • {athlete.averages.apg ?? 0} APG
                      </Text>
                    );
                  } else if (sc.includes("SWIM")) {
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {athlete.averages.pb_50m_free ? `${athlete.averages.pb_50m_free} 50M` : "-"} • {athlete.averages.swim_index_score ? `${athlete.averages.swim_index_score} SWIM INDEX` : "-"}
                      </Text>
                    );
                  } else if (sc.includes("TRACK") || sc.includes("FIELD")) {
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {athlete.averages.pb_100m ? `${athlete.averages.pb_100m} 100M` : "-"} • {athlete.averages.win_rate_pct !== undefined && athlete.averages.win_rate_pct !== null ? `${athlete.averages.win_rate_pct}% WIN` : "-"}
                      </Text>
                    );
                  } else if (sc.includes("VOLLEY")) {
                    const kills = athlete.averages.kills ?? athlete.averages.spike_kills ?? 0;
                    const blocks = athlete.averages.blocks ?? athlete.averages.block_points ?? 0;
                    const aces = athlete.averages.aces ?? athlete.averages.service_aces ?? 0;
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {kills} KILLS • {blocks} BLOCKS • {aces} ACES
                      </Text>
                    );
                  } else if (sc.includes("PICKLE")) {
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {athlete.averages.points_scored ?? 0} PTS • {athlete.averages.aces ?? 0} ACES • {athlete.averages.dinks ?? 0} DINKS
                      </Text>
                    );
                  } else if (sc.includes("SWIM")) {
                    const athAny: any = athlete;
                    const pb = athAny.averages?.pb_50m_free || athAny.averages?.pb_100m_free || athAny.stats?.pb_50m_free || athAny.stats?.times_50m_free || "-";
                    const podiums = athAny.averages?.podiums_count ?? athAny.averages?.podiums ?? athAny.stats?.podiums_count ?? 0;
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {pb !== "-" ? `PB: ${pb}` : "NO LOGGED MEETS"} • {podiums} PODIUMS
                      </Text>
                    );
                  } else if (sc.includes("TRACK") || sc.includes("FIELD") || sc.includes("RUN")) {
                    const athAny: any = athlete;
                    const pb = athAny.averages?.pb_100m || athAny.averages?.pb_200m || athAny.stats?.pb_100m || athAny.stats?.times_100m || "-";
                    const wins = athAny.averages?.event_wins ?? athAny.averages?.wins ?? athAny.stats?.event_wins ?? 0;
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {pb !== "-" ? `PB: ${pb}` : "NO LOGGED MEETS"} • {wins} WINS
                      </Text>
                    );
                  } else {
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {athlete.rating_score && athlete.rating_score > 0 ? `${athlete.rating_score} RATING` : "-"}
                      </Text>
                    );
                  }
                })()}
                <View style={[styles.progressTrack, { marginTop: 6 }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, Math.max(0, athlete.rating_score || 0))}%` },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.cardRight}>
                <Text style={styles.ratingValue}>{athlete.rating_score && athlete.rating_score > 0 ? athlete.rating_score : "-"}</Text>
                <Text style={styles.ratingLabel}>{athlete.rating_score && athlete.rating_score > 0 ? "RATING" : "UNRATED"}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Expansion Button */}
        {visibleCount < filteredAthletes.length && (
          <TouchableOpacity
            style={styles.seeMoreButton}
            onPress={() => setVisibleCount((prev) => prev + 5)}
            activeOpacity={0.8}
          >
            <Text style={styles.seeMoreText}>SEE MORE PLAYERS</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  </View>
);
};

export default PerformancePage;

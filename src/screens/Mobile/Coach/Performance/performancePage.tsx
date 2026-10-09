import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AtletaHeader } from "../Components/AtletaHeader";
import { AthletePerformanceProfile } from "../DataTypes";
import { styles } from "./styles/performancePage";
import { getSportsOfflineFirst, getAthletesOfflineFirst } from "../../../../services/firebaseClient";

interface PerformancePageProps {
  onSelectAthlete: (athlete: AthletePerformanceProfile) => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  unreadNotificationCount?: number;
  athletes?: AthletePerformanceProfile[];
  avatarUrl?: string | null;
}

const DEFAULT_CATEGORIES = ["ALL", "BASKETBALL", "VOLLEYBALL", "TRACK AND FIELD", "SWIMMING", "PICKLEBALL"];

export const PerformancePage: React.FC<PerformancePageProps> = ({
  onSelectAthlete,
  onSettingsPress,
  onProfilePress,
  onNotificationPress,
  unreadNotificationCount = 0,
  athletes = [],
  avatarUrl,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 18;

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
          const ppg = Number(avg.ppg ?? stats.ppg ?? a.ppg ?? a.pts ?? 0);
          const rpg = Number(avg.rpg ?? stats.rpg ?? a.rpg ?? a.reb ?? 0);
          const apg = Number(avg.apg ?? stats.apg ?? a.ast ?? a.apg ?? 0);
          const per = Number(avg.per_score ?? stats.per_score ?? stats.per ?? a.per ?? (ppg > 0 ? Math.round(ppg * 1.3 + 12) : 25));
          const rating = Number(a.rating_score || a.rating || (ppg > 0 ? Math.min(99, Math.round(ppg * 2.5 + 25)) : 75));

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
            sport_category: (a.sport_type || a.sport_category || "BASKETBALL").toUpperCase() as any,
            biometrics: a.biometrics || {
              height_ft: heightCm ? `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}"` : "-",
              weight_lbs: weightKg ? `${Math.round(weightKg * 2.20462)} lbs` : "-",
              wingspan_ft: wingspanCm ? `${Math.floor(wingspanCm / 30.48)}'${Math.round((wingspanCm % 30.48) / 2.54)}"` : "-",
              vertical_jump_in: a.physical_profile?.vertical_cm ? `${Math.round(a.physical_profile.vertical_cm / 2.54)}"` : "-",
            },
            averages: {
              ppg,
              rpg,
              apg,
              games_played: Number(avg.games_played ?? stats.games_played ?? 0),
              wins: Number(avg.wins ?? stats.wins ?? 0),
              per_score: per,
              fg_percentage: Number(avg.fg_percentage ?? stats.fg_pct ?? 0),
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
        if (matchingLive && (!ath.averages?.ppg || ath.averages.ppg === 0)) {
          return {
            ...ath,
            rating_score: matchingLive.rating_score || 85,
            averages: matchingLive.averages || ath.averages,
            biometrics: matchingLive.biometrics || ath.biometrics,
            scoring_trends_last_10: matchingLive.scoring_trends_last_10 || ath.scoring_trends_last_10,
          };
        }
        return ath;
      });
    }
    return liveAthletes;
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
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 56, paddingBottom: 150 },
        ]}
        showsVerticalScrollIndicator={false}
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
                {athlete.sport_category === "BASKETBALL" && athlete.averages ? (
                  <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                    {athlete.averages.ppg ?? 0} PPG • {athlete.averages.rpg ?? 0} RPG • {athlete.averages.apg ?? 0} APG
                  </Text>
                ) : athlete.sport_category === "SWIMMING" && athlete.averages ? (
                  <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                    {athlete.averages.pb_50m_free ? `${athlete.averages.pb_50m_free} 50M` : "-"} • {athlete.averages.swim_index_score ? `${athlete.averages.swim_index_score} SWIM INDEX` : "-"}
                  </Text>
                ) : athlete.sport_category === "TRACK AND FIELD" && athlete.averages ? (
                  <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                    {athlete.averages.pb_100m ? `${athlete.averages.pb_100m} 100M` : "-"} • {athlete.averages.win_rate_pct !== undefined && athlete.averages.win_rate_pct !== null ? `${athlete.averages.win_rate_pct}% WIN` : "-"}
                  </Text>
                ) : athlete.averages ? (
                  <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                    {athlete.averages.ppg ? `${athlete.averages.ppg} PPG • ` : ""}{athlete.averages.per_score ? `${athlete.averages.per_score} PER` : (athlete.rating_score ? `${athlete.rating_score} RATING` : "-")}
                  </Text>
                ) : null}
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
                <Text style={styles.ratingValue}>{athlete.rating_score || "-"}</Text>
                <Text style={styles.ratingLabel}>RATING</Text>
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
      <AtletaHeader
        avatarUrl={avatarUrl}
        onSettingsPress={onSettingsPress}
        onProfilePress={onProfilePress}
        onNotificationPress={onNotificationPress}
        unreadNotificationCount={unreadNotificationCount}
      />
    </View>
  );
};

export default PerformancePage;

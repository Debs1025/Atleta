import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AtletaHeader } from "../Components/AtletaHeader";
import { AthletePerformanceProfile } from "../DataTypes";
import { styles } from "./styles/performancePage";
import { getSportsOfflineFirst, getAthletesOfflineFirst } from "../../../../services/firebaseClient";
import { calculatePlayerRating } from "./performanceUtils";
import {
  SWIMMING_EVENTS,
  TRACK_FIELD_EVENTS,
  SportEventOption,
  findEventOption,
  matchesEvent,
  parseSecondsOrMeters,
} from "../MultiLogging/sportEvents";

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
  const [selectedEventType, setSelectedEventType] = useState<string>("ALL");
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [liveAthletes, setLiveAthletes] = useState<AthletePerformanceProfile[]>([]);

  const isTimedTab =
    activeTab === "SWIMMING" ||
    activeTab === "TRACK AND FIELD" ||
    activeTab.includes("SWIM") ||
    activeTab.includes("TRACK") ||
    activeTab.includes("FIELD");

  const availableEvents: SportEventOption[] = useMemo(() => {
    if (activeTab === "SWIMMING" || activeTab.includes("SWIM")) return SWIMMING_EVENTS;
    if (activeTab === "TRACK AND FIELD" || activeTab.includes("TRACK") || activeTab.includes("FIELD")) return TRACK_FIELD_EVENTS;
    return [];
  }, [activeTab]);

  useEffect(() => {
    setSelectedEventType("ALL");
  }, [activeTab]);

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
    const baseList = Array.isArray(athletes) && athletes.length > 0 ? athletes : liveAthletes;
    if (Array.isArray(baseList) && baseList.length > 0) {
      return baseList.map((ath) => {
        const matchingLive = liveAthletes.find(
          (la) =>
            (la.athlete_id && ath.athlete_id && (la.athlete_id === ath.athlete_id || la.user_id === ath.user_id)) ||
            (la.full_name && ath.full_name && la.full_name.toLowerCase() === ath.full_name.toLowerCase())
        );
        const sourceAthlete = matchingLive || ath;
        const mergedAverages = { ...(sourceAthlete?.averages || {}), ...(ath.averages || {}) };
        const mergedStats = { ...((sourceAthlete as any)?.stats || {}), ...((ath as any)?.stats || {}) };
        const combined = { ...sourceAthlete, ...ath, averages: mergedAverages, stats: mergedStats };
        const resolvedRating = calculatePlayerRating(combined);

        return {
          ...ath,
          ...sourceAthlete,
          rating_score: resolvedRating,
          averages: mergedAverages,
          biometrics: sourceAthlete?.biometrics || ath.biometrics,
          scoring_trends_last_10: (sourceAthlete?.scoring_trends_last_10 && sourceAthlete.scoring_trends_last_10.length > 0)
            ? sourceAthlete.scoring_trends_last_10
            : ath.scoring_trends_last_10,
        };
      });
    }
    return [];
  }, [athletes, liveAthletes]);

  const filteredAthletes = useMemo(() => {
    let list = displayAthletes.filter((ath) => {
      const matchesTab =
        activeTab === "ALL" || (ath.sport_category || "").toUpperCase() === activeTab.toUpperCase();
      const matchesSearch =
        (ath.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ath.team_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ath.position_or_event || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });

    if (isTimedTab && selectedEventType !== "ALL") {
      const opt = findEventOption(activeTab, selectedEventType);
      const key = opt?.key || selectedEventType.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const isDist = !!opt?.isDistanceEvent;

      list = [...list].sort((a, b) => {
        const avgA = (a as any).averages || {};
        const statsA = (a as any).stats || {};
        const avgB = (b as any).averages || {};
        const statsB = (b as any).stats || {};

        const valA = avgA[`pb_${key}`] || statsA[`pb_${key}`] || avgA[key] || statsA[key] || avgA[`times_${key}`] || statsA[`times_${key}`];
        const valB = avgB[`pb_${key}`] || statsB[`pb_${key}`] || avgB[key] || statsB[key] || avgB[`times_${key}`] || statsB[`times_${key}`];

        const numA = parseSecondsOrMeters(valA);
        const numB = parseSecondsOrMeters(valB);

        if (numA > 0 && numB > 0) {
          return isDist ? numB - numA : numA - numB;
        }
        if (numA > 0) return -1;
        if (numB > 0) return 1;
        return 0;
      });
    }

    return list;
  }, [displayAthletes, activeTab, searchQuery, isTimedTab, selectedEventType]);

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

        {/* Event Type Filter for Swimming and Track & Field */}
        {isTimedTab && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: "#94A3B8", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" }}>
                FILTER BY EVENT TYPE
              </Text>
              {selectedEventType !== "ALL" && (
                <TouchableOpacity onPress={() => setSelectedEventType("ALL")}>
                  <Text style={{ color: "#00C8FF", fontSize: 11, fontWeight: "700" }}>RESET TO ALL</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Dropdown Selector Button */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#0B1528",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderWidth: 1.5,
                borderColor: selectedEventType !== "ALL" ? "#00C8FF" : "#1E293B",
              }}
              onPress={() => setIsEventModalOpen(true)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons
                  name={activeTab.includes("SWIM") ? "water-outline" : "stopwatch-outline"}
                  size={18}
                  color="#00C8FF"
                />
                <View>
                  <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>
                    DISCIPLINE / EVENT
                  </Text>
                  <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "900", marginTop: 2 }}>
                    {selectedEventType === "ALL" ? "All Events" : selectedEventType}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0, 200, 255, 0.1)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0, 200, 255, 0.25)" }}>
                <Text style={{ color: "#00C8FF", fontSize: 10, fontWeight: "900" }}>CHOOSE</Text>
                <Ionicons name="chevron-down" size={14} color="#00C8FF" />
              </View>
            </TouchableOpacity>

            {/* Horizontal Quick Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
              contentContainerStyle={{ gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedEventType("ALL")}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: selectedEventType === "ALL" ? "#00C8FF" : "#0B1528",
                  borderWidth: 1,
                  borderColor: selectedEventType === "ALL" ? "#00C8FF" : "#1E293B",
                }}
              >
                <Text
                  style={{
                    color: selectedEventType === "ALL" ? "#060B14" : "#94A3B8",
                    fontSize: 11,
                    fontWeight: selectedEventType === "ALL" ? "800" : "600",
                  }}
                >
                  ALL
                </Text>
              </TouchableOpacity>
              {availableEvents.slice(0, 8).map((evt) => {
                const isSelected = selectedEventType === evt.label || selectedEventType === evt.key;
                return (
                  <TouchableOpacity
                    key={evt.key}
                    onPress={() => setSelectedEventType(evt.label)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: isSelected ? "#00C8FF" : "#0B1528",
                      borderWidth: 1,
                      borderColor: isSelected ? "#00C8FF" : "#1E293B",
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? "#060B14" : "#94A3B8",
                        fontSize: 11,
                        fontWeight: isSelected ? "800" : "600",
                      }}
                    >
                      {evt.shortLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Modal Event Picker */}
            <Modal
              visible={isEventModalOpen}
              transparent
              animationType="fade"
              onRequestClose={() => setIsEventModalOpen(false)}
            >
              <Pressable
                style={{ flex: 1, backgroundColor: "rgba(3, 7, 18, 0.8)", justifyContent: "center", alignItems: "center", paddingHorizontal: 20 }}
                onPress={() => setIsEventModalOpen(false)}
              >
                <Pressable
                  style={{ width: "100%", maxWidth: 360, backgroundColor: "#0B1528", borderRadius: 18, padding: 18, borderWidth: 1, borderColor: "rgba(0, 200, 255, 0.3)" }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.08)", marginBottom: 10 }}>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: "900", color: "#FFFFFF" }}>Select Event Type</Text>
                      <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                        Filter athletes by {activeTab} event
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsEventModalOpen(false)} style={{ padding: 4 }}>
                      <Ionicons name="close" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 10,
                        marginBottom: 6,
                        backgroundColor: selectedEventType === "ALL" ? "rgba(0, 200, 255, 0.12)" : "#0F1E36",
                        borderWidth: 1,
                        borderColor: selectedEventType === "ALL" ? "#00C8FF" : "transparent",
                      }}
                      onPress={() => {
                        setSelectedEventType("ALL");
                        setIsEventModalOpen(false);
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: selectedEventType === "ALL" ? "rgba(0, 200, 255, 0.2)" : "rgba(255, 255, 255, 0.05)", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="layers-outline" size={16} color={selectedEventType === "ALL" ? "#00C8FF" : "#64748B"} />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: selectedEventType === "ALL" ? "#FFFFFF" : "#CBD5E1" }}>
                          All Events
                        </Text>
                      </View>
                      {selectedEventType === "ALL" && <Ionicons name="checkmark-circle" size={20} color="#00C8FF" />}
                    </TouchableOpacity>

                    {availableEvents.map((evt) => {
                      const isSelected = selectedEventType === evt.label || selectedEventType === evt.key;
                      return (
                        <TouchableOpacity
                          key={evt.key}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingVertical: 12,
                            paddingHorizontal: 12,
                            borderRadius: 10,
                            marginBottom: 6,
                            backgroundColor: isSelected ? "rgba(0, 200, 255, 0.12)" : "#0F1E36",
                            borderWidth: 1,
                            borderColor: isSelected ? "#00C8FF" : "transparent",
                          }}
                          onPress={() => {
                            setSelectedEventType(evt.label);
                            setIsEventModalOpen(false);
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isSelected ? "rgba(0, 200, 255, 0.2)" : "rgba(255, 255, 255, 0.05)", alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name={evt.isDistanceEvent ? "trending-up-outline" : "timer-outline"} size={16} color={isSelected ? "#00C8FF" : "#64748B"} />
                            </View>
                            <View>
                              <Text style={{ fontSize: 13, fontWeight: "800", color: isSelected ? "#FFFFFF" : "#CBD5E1" }}>
                                {evt.label}
                              </Text>
                              <Text style={{ fontSize: 10, color: "#64748B", marginTop: 1 }}>
                                {evt.shortLabel} {evt.isDistanceEvent ? "• Field Event" : "• Timed Event"}
                              </Text>
                            </View>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#00C8FF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>
          </View>
        )}

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
                    const athAny: any = athlete;
                    const avg = athAny.averages || {};
                    const stats = athAny.stats || {};
                    let bestPbStr = "";
                    let bestEventName = "";

                    if (selectedEventType !== "ALL") {
                      const opt = findEventOption("SWIMMING", selectedEventType);
                      const key = opt?.key || selectedEventType.toLowerCase().replace(/[^a-z0-9]/g, "_");
                      const pbKeys = [`pb_${key}`, key, `times_${key}`, `pb_${key.replace(/_/g, "")}`];
                      for (const pk of pbKeys) {
                        const val = avg[pk] || stats[pk];
                        if (val && val !== "-" && val !== "N/A" && val !== "00:00.00") {
                          bestPbStr = val;
                          bestEventName = opt?.shortLabel || selectedEventType.toUpperCase();
                          break;
                        }
                      }
                    } else {
                      const pbKeys = Object.keys({ ...stats, ...avg }).filter(
                        (k) => k.startsWith("pb_") || k.startsWith("times_")
                      );
                      for (const k of pbKeys) {
                        const val = avg[k] || stats[k];
                        if (val && val !== "-" && val !== "N/A" && val !== "00:00.00") {
                          bestPbStr = val;
                          bestEventName = k.replace(/^pb_/, "").replace(/^times_/, "").replace(/_/g, " ").toUpperCase();
                          break;
                        }
                      }
                    }
                    const podiums = Number(avg.podiums_count ?? avg.podiums ?? stats.podiums_count ?? stats.podiums ?? 0);
                    const opt = selectedEventType !== "ALL" ? findEventOption("SWIMMING", selectedEventType) : null;
                    const displayStat = bestPbStr
                      ? `PB: ${bestPbStr}${bestEventName ? ` (${bestEventName})` : ""}`
                      : selectedEventType !== "ALL"
                      ? `NO LOGGED MARKS IN ${(opt?.shortLabel || selectedEventType).toUpperCase()}`
                      : "NO LOGGED MEETS";
                    const displayMetric = `${podiums} PODIUMS`;
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {displayStat} • {displayMetric}
                      </Text>
                    );
                  } else if (sc.includes("TRACK") || sc.includes("FIELD") || sc.includes("RUN")) {
                    const athAny: any = athlete;
                    const avg = athAny.averages || {};
                    const stats = athAny.stats || {};
                    let bestMarkStr = "";
                    let bestEventName = "";

                    if (selectedEventType !== "ALL") {
                      const opt = findEventOption("TRACK AND FIELD", selectedEventType);
                      const key = opt?.key || selectedEventType.toLowerCase().replace(/[^a-z0-9]/g, "_");
                      const pbKeys = [`pb_${key}`, key, `times_${key}`, `pb_${key.replace(/_/g, "")}`];
                      for (const pk of pbKeys) {
                        const val = avg[pk] || stats[pk];
                        if (val && val !== "-" && val !== "N/A" && val !== "00:00.00") {
                          bestMarkStr = val;
                          bestEventName = opt?.shortLabel || selectedEventType.toUpperCase();
                          break;
                        }
                      }
                    } else {
                      const pbKeys = Object.keys({ ...stats, ...avg }).filter(
                        (k) => k.startsWith("pb_") || k.startsWith("times_") || k === "pole_vault" || k === "long_jump"
                      );
                      for (const k of pbKeys) {
                        const val = avg[k] || stats[k];
                        if (val && val !== "-" && val !== "N/A" && val !== "00:00.00") {
                          bestMarkStr = val;
                          bestEventName = k.replace(/^pb_/, "").replace(/^times_/, "").replace(/_/g, " ").toUpperCase();
                          break;
                        }
                      }
                    }
                    const podiums = Number(avg.podiums_count ?? avg.podiums ?? stats.podiums_count ?? stats.podiums ?? 0);
                    const opt = selectedEventType !== "ALL" ? findEventOption("TRACK AND FIELD", selectedEventType) : null;
                    const displayStat = bestMarkStr
                      ? `PB: ${bestMarkStr}${bestEventName ? ` (${bestEventName})` : ""}`
                      : selectedEventType !== "ALL"
                      ? `NO LOGGED MARKS IN ${(opt?.shortLabel || selectedEventType).toUpperCase()}`
                      : "NO LOGGED MEETS";
                    const displayMetric = `${podiums} PODIUMS`;
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {displayStat} • {displayMetric}
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
                  } else {
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {athlete.rating_score && athlete.rating_score > 0 ? `${athlete.rating_score} RATING` : "- UNRATED"}
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

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
import { calculatePlayerRating, detectSport } from "./performanceUtils";
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
  sportsFocus?: string;
}

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
  sportsFocus,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<string>("ALL");
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const displayAthletes = useMemo(() => {
    if (Array.isArray(athletes) && athletes.length > 0) {
      return athletes.map((ath) => {
        const resolvedSport = detectSport(ath);
        const resolvedRating = calculatePlayerRating(ath);
        return {
          ...ath,
          sport_category: resolvedSport,
          rating_score: resolvedRating || ath.rating_score,
        };
      });
    }
    return [];
  }, [athletes]);

  const isTimedTab = useMemo(() => {
    const focus = (sportsFocus || "").toUpperCase();
    if (focus) {
      return (
        focus === "SWIMMING" ||
        focus === "TRACK AND FIELD" ||
        focus.includes("SWIM") ||
        focus.includes("TRACK") ||
        focus.includes("FIELD")
      );
    }
    if (displayAthletes.length === 0) return false;
    return displayAthletes.every(
      (a) =>
        (a.sport_category || "").toUpperCase().includes("SWIM") ||
        (a.sport_category || "").toUpperCase().includes("TRACK") ||
        (a.sport_category || "").toUpperCase().includes("FIELD")
    );
  }, [sportsFocus, displayAthletes]);

  const timedSport = useMemo(() => {
    const focus = (sportsFocus || "").toUpperCase();
    if (focus.includes("SWIM")) return "SWIMMING";
    if (focus.includes("TRACK") || focus.includes("FIELD")) return "TRACK AND FIELD";
    const timedAthlete = displayAthletes.find(
      (a) =>
        (a.sport_category || "").toUpperCase().includes("SWIM") ||
        (a.sport_category || "").toUpperCase().includes("TRACK") ||
        (a.sport_category || "").toUpperCase().includes("FIELD")
    );
    if (!timedAthlete) return null;
    const cat = (timedAthlete.sport_category || "").toUpperCase();
    if (cat.includes("SWIM")) return "SWIMMING";
    return "TRACK AND FIELD";
  }, [sportsFocus, displayAthletes]);

  const availableEvents: SportEventOption[] = useMemo(() => {
    if (timedSport === "SWIMMING") return SWIMMING_EVENTS;
    if (timedSport === "TRACK AND FIELD") return TRACK_FIELD_EVENTS;
    return [];
  }, [timedSport]);

  const filteredAthletes = useMemo(() => {
    let list = displayAthletes.filter((ath) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        (ath.full_name || "").toLowerCase().includes(q) ||
        (ath.team_name || "").toLowerCase().includes(q) ||
        (ath.position_or_event || "").toLowerCase().includes(q)
      );
    });

    if (isTimedTab && selectedEventType !== "ALL") {
      const opt = findEventOption(timedSport || "", selectedEventType);
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
  }, [displayAthletes, searchQuery, isTimedTab, selectedEventType, timedSport]);

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
                  name={timedSport === "SWIMMING" ? "water-outline" : "stopwatch-outline"}
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
                        Filter athletes by {timedSport || "sport"} event
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
                  const sc = detectSport(athlete);
                  if (!athlete.averages && !(athlete as any).stats) return null;
                  if (sc.includes("BASKETBALL")) {
                    return (
                      <Text style={{ color: "#38BDF8", fontSize: 11, fontWeight: "700", marginTop: 2 }}>
                        {athlete.averages?.ppg ?? (athlete as any).stats?.ppg ?? 0} PPG • {athlete.averages?.rpg ?? (athlete as any).stats?.rpg ?? 0} RPG • {athlete.averages?.apg ?? (athlete as any).stats?.apg ?? 0} APG
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
                    const kills = athlete.averages?.spike_kills ?? athlete.averages?.kills ?? (athlete as any).stats?.spike_kills ?? (athlete as any).stats?.kills ?? 0;
                    const blocks = athlete.averages?.block_points ?? athlete.averages?.blocks ?? (athlete as any).stats?.block_points ?? (athlete as any).stats?.blocks ?? 0;
                    const aces = athlete.averages?.service_aces ?? athlete.averages?.aces ?? (athlete as any).stats?.service_aces ?? (athlete as any).stats?.aces ?? 0;
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

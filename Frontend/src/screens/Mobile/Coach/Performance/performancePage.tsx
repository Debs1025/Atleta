import React, { useState, useMemo } from "react";
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
import {
  AthletePerformanceProfile,
  MOCK_PERFORMANCE_ATHLETES,
} from "../DataTypes";
import { styles } from "./styles/performancePage";

interface PerformancePageProps {
  onSelectAthlete: (athlete: AthletePerformanceProfile) => void;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  athletes?: AthletePerformanceProfile[];
}

const CATEGORIES = ["ALL", "BASKETBALL", "TRACK AND FIELD", "SWIMMING"];

export const PerformancePage: React.FC<PerformancePageProps> = ({
  onSelectAthlete,
  onSettingsPress,
  onProfilePress,
  athletes = MOCK_PERFORMANCE_ATHLETES,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(5);

  const displayAthletes = (athletes && athletes.length > 0) ? athletes : MOCK_PERFORMANCE_ATHLETES;

  const filteredAthletes = useMemo(() => {
    return displayAthletes.filter((ath) => {
      const matchesTab =
        activeTab === "ALL" || ath.sport_category === activeTab;
      const matchesSearch =
        ath.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ath.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ath.position_or_event.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [displayAthletes, activeTab, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Atleta Header Component */}
      <AtletaHeader
        onSettingsPress={onSettingsPress}
        onProfilePress={onProfilePress}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 64, paddingBottom: 150 },
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
          {CATEGORIES.map((cat) => {
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

        {/* Ranked Athlete List */}
        {filteredAthletes.slice(0, visibleCount).map((athlete) => (
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
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, athlete.rating_score)}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.cardRight}>
              <Text style={styles.ratingValue}>{athlete.rating_score}</Text>
              <Text style={styles.ratingLabel}>RATING</Text>
            </View>
          </TouchableOpacity>
        ))}

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
  );
};

export default PerformancePage;

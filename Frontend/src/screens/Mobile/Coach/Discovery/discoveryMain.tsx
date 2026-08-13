import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AtletaHeader } from '../Components/AtletaHeader';
import { DiscoveryProvider, useDiscovery } from './DiscoveryContext';
import { DiscoveryPlayer } from './discoveryPlayer';
import { DiscoveryTeams } from './discoveryTeams';
import { DiscoveryEvent } from './discoveryEvent';
import { ViewTeam } from './viewTeam';
import { ViewMatch } from './viewMatch';
import { ScoutAthlete } from './scoutAthlete';
import { styles } from './styles/discoveryMain';
import { DiscoveryTab, SportCategoryFilter } from './discoveryTypes';

const rankingIconAsset = require('../../../../assets/ranking.png');
const recruitsIconAsset = require('../../../../assets/recruits.png');

export interface DiscoveryMainProps {
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  onToggleBottomNav?: (hide: boolean) => void;
}

const SPORT_CHIPS: { label: string; value: SportCategoryFilter }[] = [
  { label: 'Basketball', value: 'BASKETBALL' },
  { label: 'Swimming', value: 'SWIMMING' },
  { label: 'Track and Field', value: 'TRACK AND FIELD' },
];

const DiscoveryContent: React.FC<DiscoveryMainProps> = ({
  onSettingsPress,
  onProfilePress,
  onToggleBottomNav,
}) => {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  const {
    activeTab,
    setActiveTab,
    activeSportFilter,
    setActiveSportFilter,
    searchQuery,
    setSearchQuery,
    selectedAthlete,
    setSelectedAthlete,
  } = useDiscovery();

  const [subView, setSubView] = useState<'none' | 'rankings' | 'recruits' | 'viewTeam' | 'viewMatch'>('none');

  const isFullSubPage = subView !== 'none' || !!selectedAthlete;

  useEffect(() => {
    onToggleBottomNav?.(isFullSubPage);
    return () => onToggleBottomNav?.(false);
  }, [isFullSubPage, onToggleBottomNav]);

  if (selectedAthlete) {
    return <ScoutAthlete athlete={selectedAthlete} onBack={() => setSelectedAthlete(null)} />;
  }

  return (
    <View style={styles.container}>
      {subView === 'none' && (
        <AtletaHeader onSettingsPress={onSettingsPress} onProfilePress={onProfilePress} />
      )}

      <View style={{ flex: 1, paddingTop: subView === 'none' ? headerTopPadding + 55 : insets.top }}>
        {subView === 'rankings' || subView === 'recruits' ? (
          <DiscoveryPlayer mode={subView} onCloseSubView={() => setSubView('none')} />
        ) : subView === 'viewTeam' ? (
          <ViewTeam onBack={() => setSubView('none')} />
        ) : subView === 'viewMatch' ? (
          <ViewMatch onBack={() => setSubView('none')} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} overScrollMode="never">
            {/* Search & Quick Navigation Bar */}
            <View style={styles.searchNavRow}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={18} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search (PPG > 20)"
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.topActionButtonsGroup}>
                <TouchableOpacity style={styles.topActionButton} onPress={() => setSubView('rankings')} activeOpacity={0.8}>
                  <View style={styles.actionIconBox}>
                    <Image source={rankingIconAsset} style={{ width: 28, height: 28, resizeMode: 'contain' }} />
                  </View>
                  <Text style={styles.topActionLabel}>Top Players</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.topActionButton} onPress={() => setSubView('recruits')} activeOpacity={0.8}>
                  <View style={styles.actionIconBox}>
                    <Image source={recruitsIconAsset} style={{ width: 28, height: 28, resizeMode: 'contain' }} />
                  </View>
                  <Text style={styles.topActionLabel}>Recruits</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Segmented Top Tabs */}
            <View style={styles.segmentedControlContainer}>
              {(['PLAYERS', 'TEAMS', 'EVENTS'] as DiscoveryTab[]).map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.segmentPillButton, isActive ? styles.segmentPillActive : styles.segmentPillInactive]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentPillText, isActive ? styles.segmentPillTextActive : styles.segmentPillTextInactive]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sport Category Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportChipsScroll} contentContainerStyle={styles.sportChipsContent}>
              {SPORT_CHIPS.map((chip) => {
                const isActive = activeSportFilter === chip.value;
                return (
                  <TouchableOpacity
                    key={chip.value}
                    style={[styles.sportChip, isActive ? styles.sportChipActive : styles.sportChipInactive]}
                    onPress={() => setActiveSportFilter(chip.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sportChipText, isActive ? styles.sportChipTextActive : styles.sportChipTextInactive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Active Tab Views */}
            {activeTab === 'PLAYERS' && <DiscoveryPlayer mode="feed" onCloseSubView={() => setSubView('none')} />}
            {activeTab === 'TEAMS' && <DiscoveryTeams onViewTeam={() => setSubView('viewTeam')} />}
            {activeTab === 'EVENTS' && <DiscoveryEvent onViewMatch={() => setSubView('viewMatch')} />}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export function DiscoveryMain(props: DiscoveryMainProps) {
  return (
    <DiscoveryProvider>
      <DiscoveryContent {...props} />
    </DiscoveryProvider>
  );
}

export default DiscoveryMain;

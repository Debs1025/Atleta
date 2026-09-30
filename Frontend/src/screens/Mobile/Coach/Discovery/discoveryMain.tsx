import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView, Text, Image, RefreshControl } from 'react-native';
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
import { AdvancedFilterModal } from './AdvancedFilterModal';
import { styles } from './styles/discoveryMain';
import { DiscoveryTab, SportCategoryFilter } from './discoveryTypes';

const rankingIconAsset = require('../../../../assets/ranking.png');
const recruitsIconAsset = require('../../../../assets/recruits.png');

export interface DiscoveryMainProps {
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
  unreadNotificationCount?: number;
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
  onNotificationPress,
  unreadNotificationCount = 0,
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
    isLoading,
    refreshDiscovery,
    activeFilterCount,
  } = useDiscovery();

  const [showFilterModal, setShowFilterModal] = useState(false);
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
        <AtletaHeader
          onSettingsPress={onSettingsPress}
          onProfilePress={onProfilePress}
          onNotificationPress={onNotificationPress}
          unreadNotificationCount={unreadNotificationCount}
        />
      )}

      <View style={{ flex: 1, paddingTop: subView === 'none' ? headerTopPadding + 55 : insets.top }}>
        {subView === 'rankings' || subView === 'recruits' ? (
          <DiscoveryPlayer mode={subView} onCloseSubView={() => setSubView('none')} />
        ) : subView === 'viewTeam' ? (
          <ViewTeam onBack={() => setSubView('none')} />
        ) : subView === 'viewMatch' ? (
          <ViewMatch onBack={() => setSubView('none')} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refreshDiscovery}
                tintColor="#00C8FF"
                colors={["#00C8FF"]}
              />
            }
          >
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
                <TouchableOpacity
                  onPress={() => setShowFilterModal(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 6,
                    backgroundColor: activeFilterCount > 0 ? 'rgba(0, 200, 255, 0.15)' : '#1E293B',
                    borderWidth: 1,
                    borderColor: activeFilterCount > 0 ? '#00C8FF' : 'rgba(255, 255, 255, 0.08)',
                    marginLeft: 4,
                    gap: 4,
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? '#00C8FF' : '#94A3B8'} />
                  {activeFilterCount > 0 && (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#00C8FF', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#080F21', fontSize: 10, fontWeight: '900' }}>{activeFilterCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
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

      {/* Advanced Filter Modal */}
      <AdvancedFilterModal visible={showFilterModal} onClose={() => setShowFilterModal(false)} />
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

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDiscovery } from './DiscoveryContext';
import {
  AdvancedAthleteFilters,
  DEFAULT_ADVANCED_FILTERS,
  SportCategoryFilter,
  matchesAthleteFilters,
  SPORT_METRICS,
  RankingSortMetric,
} from './discoveryTypes';

interface AdvancedFilterModalProps {
  visible: boolean;
  onClose: () => void;
}

const POSITION_OPTIONS: Record<SportCategoryFilter, { label: string; value: string }[]> = {
  BASKETBALL: [
    { label: 'All', value: 'ALL' },
    { label: 'Point Guard (PG)', value: 'Point Guard' },
    { label: 'Shooting Guard (SG)', value: 'Shooting Guard' },
    { label: 'Small Forward (SF)', value: 'Small Forward' },
    { label: 'Power Forward (PF)', value: 'Power Forward' },
    { label: 'Center (C)', value: 'Center' },
    { label: 'Guard', value: 'Guard' },
    { label: 'Forward', value: 'Forward' },
  ],
  SWIMMING: [
    { label: 'All', value: 'ALL' },
    { label: 'Freestyle', value: 'Freestyle' },
    { label: 'Backstroke', value: 'Backstroke' },
    { label: 'Breaststroke', value: 'Breaststroke' },
    { label: 'Butterfly', value: 'Butterfly' },
    { label: 'Individual Medley', value: 'Medley' },
  ],
  'TRACK AND FIELD': [
    { label: 'All', value: 'ALL' },
    { label: 'Sprinter', value: 'Sprinter' },
    { label: '100m Sprint', value: '100m' },
    { label: '200m Sprint', value: '200m' },
    { label: '400m Sprint', value: '400m' },
    { label: 'Hurdles', value: 'Hurdles' },
    { label: 'Long Jump', value: 'Jump' },
  ],
};

const PPG_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '10+ PPG', value: 10 },
  { label: '15+ PPG', value: 15 },
  { label: '20+ PPG', value: 20 },
  { label: '25+ PPG', value: 25 },
];

const PER_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '15+ PER', value: 15 },
  { label: '20+ PER', value: 20 },
  { label: '25+ PER', value: 25 },
  { label: '30+ PER', value: 30 },
];

const EFF_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '60%+', value: 60 },
  { label: '75%+', value: 75 },
  { label: '85%+', value: 85 },
  { label: '90%+', value: 90 },
];

const HEIGHT_OPTIONS = [
  { label: 'Any Height', value: 'ALL' },
  { label: '< 5\'9"', value: '<5\'9' },
  { label: '5\'9" - 6\'1"', value: '5\'9-6\'1' },
  { label: '6\'2" - 6\'5"', value: '6\'2-6\'5' },
  { label: '6\'6"+', value: '6\'6+' },
];

const WEIGHT_OPTIONS = [
  { label: 'Any Weight', value: 'ALL' },
  { label: '< 150 lbs', value: '<150' },
  { label: '150 - 180 lbs', value: '150-180' },
  { label: '180 - 210 lbs', value: '180-210' },
  { label: '210+ lbs', value: '210+' },
];

export const AdvancedFilterModal: React.FC<AdvancedFilterModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const {
    activeSportFilter,
    advancedFilters,
    setAdvancedFilters,
    athletes,
    searchQuery,
  } = useDiscovery();

  const [draftFilters, setDraftFilters] = useState<AdvancedAthleteFilters>(advancedFilters);

  // Sync draft with current when opened
  React.useEffect(() => {
    if (visible) {
      setDraftFilters(advancedFilters);
    }
  }, [visible, advancedFilters]);

  const matchingCount = useMemo(() => {
    return athletes.filter((athlete) => {
      if (athlete.sport_category !== activeSportFilter) return false;
      return matchesAthleteFilters(athlete, draftFilters, searchQuery);
    }).length;
  }, [athletes, activeSportFilter, draftFilters, searchQuery]);

  const handleApply = () => {
    setAdvancedFilters(draftFilters);
    onClose();
  };

  const handleReset = () => {
    setDraftFilters(DEFAULT_ADVANCED_FILTERS);
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
  };

  const positions = POSITION_OPTIONS[activeSportFilter] || POSITION_OPTIONS.BASKETBALL;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <Pressable style={modalStyles.backdrop} onPress={onClose} />
        <View style={[modalStyles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Modal Header */}
          <View style={modalStyles.headerRow}>
            <View>
              <Text style={modalStyles.headerTitle}>ADVANCED FILTERS</Text>
              <Text style={modalStyles.headerSubtitle}>
                Filter {activeSportFilter.toLowerCase().replace(/_/g, ' ')} athletes
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={handleReset} activeOpacity={0.7}>
                <Text style={modalStyles.resetText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeButton} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollContent}>
            {/* 1. Sort & Rank Metric Section */}
            <View style={modalStyles.filterSection}>
              <Text style={modalStyles.sectionLabel}>SORT & RANK ATHLETES BY</Text>
              <View style={modalStyles.chipsWrap}>
                {(SPORT_METRICS[activeSportFilter] || SPORT_METRICS.BASKETBALL).map((m) => {
                  const isSelected = (draftFilters.sortBy || 'PER') === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[modalStyles.chip, isSelected && modalStyles.chipActive]}
                      onPress={() => setDraftFilters((prev) => ({
                        ...prev,
                        sortBy: m.key,
                      }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[modalStyles.chipText, isSelected && modalStyles.chipTextActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Position Section */}
            <View style={modalStyles.filterSection}>
              <Text style={modalStyles.sectionLabel}>PLAYER POSITION</Text>
              <View style={modalStyles.chipsWrap}>
                {positions.map((pos) => {
                  const isSelected = draftFilters.position === pos.value;
                  return (
                    <TouchableOpacity
                      key={pos.value}
                      style={[modalStyles.chip, isSelected && modalStyles.chipActive]}
                      onPress={() => setDraftFilters((prev) => ({
                        ...prev,
                        position: prev.position === pos.value ? 'ALL' : pos.value,
                      }))}
                      activeOpacity={0.75}
                    >
                      <Text style={[modalStyles.chipText, isSelected && modalStyles.chipTextActive]}>
                        {pos.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Key Stats Thresholds */}
            <View style={modalStyles.filterSection}>
              <Text style={modalStyles.sectionLabel}>KEY STAT THRESHOLDS</Text>

              {activeSportFilter === 'BASKETBALL' && (
                <View style={modalStyles.subSection}>
                  <Text style={modalStyles.subSectionLabel}>Minimum Points Per Game (PPG)</Text>
                  <View style={modalStyles.chipsWrap}>
                    {PPG_OPTIONS.map((opt) => {
                      const isSelected = draftFilters.minPpg === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[modalStyles.chip, isSelected && modalStyles.chipActive]}
                          onPress={() => setDraftFilters((prev) => ({
                            ...prev,
                            minPpg: prev.minPpg === opt.value ? 0 : opt.value,
                            sortBy: prev.minPpg === opt.value ? (prev.sortBy === 'PPG' ? 'PER' : prev.sortBy) : 'PPG',
                          }))}
                          activeOpacity={0.75}
                        >
                          <Text style={[modalStyles.chipText, isSelected && modalStyles.chipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={modalStyles.subSection}>
                <Text style={modalStyles.subSectionLabel}>Minimum PER Score</Text>
                <View style={modalStyles.chipsWrap}>
                  {PER_OPTIONS.map((opt) => {
                    const isSelected = draftFilters.minPer === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[modalStyles.chip, isSelected && modalStyles.chipActive]}
                        onPress={() => setDraftFilters((prev) => ({
                          ...prev,
                          minPer: prev.minPer === opt.value ? 0 : opt.value,
                          sortBy: prev.minPer === opt.value ? (prev.sortBy === 'PER' ? 'PER' : prev.sortBy) : 'PER',
                        }))}
                        activeOpacity={0.75}
                      >
                        <Text style={[modalStyles.chipText, isSelected && modalStyles.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={modalStyles.subSection}>
                <Text style={modalStyles.subSectionLabel}>Minimum Efficiency Rate</Text>
                <View style={modalStyles.chipsWrap}>
                  {EFF_OPTIONS.map((opt) => {
                    const isSelected = draftFilters.minEff === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[modalStyles.chip, isSelected && modalStyles.chipActive]}
                        onPress={() => setDraftFilters((prev) => ({
                          ...prev,
                          minEff: prev.minEff === opt.value ? 0 : opt.value,
                          sortBy: prev.minEff === opt.value ? (prev.sortBy === 'EFF' ? 'PER' : prev.sortBy) : 'EFF',
                        }))}
                        activeOpacity={0.75}
                      >
                        <Text style={[modalStyles.chipText, isSelected && modalStyles.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 3. Physical Traits */}
            <View style={modalStyles.filterSection}>
              <Text style={modalStyles.sectionLabel}>PHYSICAL TRAITS</Text>

              <View style={modalStyles.subSection}>
                <Text style={modalStyles.subSectionLabel}>Height Range</Text>
                <View style={modalStyles.chipsWrap}>
                  {HEIGHT_OPTIONS.map((opt) => {
                    const isSelected = draftFilters.heightRange === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[modalStyles.chip, isSelected && modalStyles.chipActive]}
                        onPress={() => setDraftFilters((prev) => ({
                          ...prev,
                          heightRange: prev.heightRange === opt.value ? 'ALL' : opt.value,
                        }))}
                        activeOpacity={0.75}
                      >
                        <Text style={[modalStyles.chipText, isSelected && modalStyles.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={modalStyles.subSection}>
                <Text style={modalStyles.subSectionLabel}>Weight Range</Text>
                <View style={modalStyles.chipsWrap}>
                  {WEIGHT_OPTIONS.map((opt) => {
                    const isSelected = draftFilters.weightRange === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[modalStyles.chip, isSelected && modalStyles.chipActive]}
                        onPress={() => setDraftFilters((prev) => ({
                          ...prev,
                          weightRange: prev.weightRange === opt.value ? 'ALL' : opt.value,
                        }))}
                        activeOpacity={0.75}
                      >
                        <Text style={[modalStyles.chipText, isSelected && modalStyles.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={modalStyles.footerRow}>
            <TouchableOpacity style={modalStyles.clearButton} onPress={handleReset} activeOpacity={0.8}>
              <Text style={modalStyles.clearButtonText}>CLEAR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={modalStyles.applyButton} onPress={handleApply} activeOpacity={0.85}>
              <Text style={modalStyles.applyButtonText}>
                SHOW RESULTS ({matchingCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '82%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  resetText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },
  filterSection: {
    gap: 10,
  },
  sectionLabel: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  subSection: {
    gap: 8,
    marginTop: 4,
  },
  subSectionLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 200, 255, 0.15)',
    borderColor: '#00C8FF',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#00C8FF',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  clearButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  applyButton: {
    flex: 2,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#00C8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#080F21',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default AdvancedFilterModal;

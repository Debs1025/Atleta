import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TeamWizardState } from "../DataTypes";
import styles from "./styles/CreateTeam";

const SPORT_CATEGORIES: Array<TeamWizardState["sport_type"]> = [
  "BASKETBALL",
  "TRACK AND FIELD",
  "SWIMMING",
  "VOLLEYBALL",
];

export interface CreateTeamProps {
  wizardState: TeamWizardState;
  onChangeState: (updated: Partial<TeamWizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CreateTeam({
  wizardState,
  onChangeState,
  onNext,
  onBack,
}: CreateTeamProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 12;

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isFormValid =
    wizardState.team_name.trim().length > 0 && wizardState.sport_type !== "";

  return (
    <View style={styles.container}>
      {/* FIXED TOP HEADER */}
      <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CREATE NEW TEAM</Text>
        </View>
      </View>

      {/* SCROLLABLE FORM BODY */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BANNER CARD */}
        <View style={styles.heroBannerCard}>
          <View style={styles.heroTagBadge}>
            <Text style={styles.heroTagText}>MAKE YOUR TEAM !</Text>
          </View>
          <Text style={styles.heroDescriptionText}>
            Initialize your team parameters to begin tracking performance metrics.
          </Text>
        </View>

        {/* TEAM NAME FIELD */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>TEAM NAME</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Bicol Runners"
            placeholderTextColor="#94A3B8"
            value={wizardState.team_name}
            onChangeText={(text) => onChangeState({ team_name: text })}
            autoCapitalize="words"
          />
          <Text style={styles.fieldHint}>
            Use a unique identifier for easier scouting reports.
          </Text>
        </View>

        {/* SPORT CATEGORY DROPDOWN */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>SPORT CATEGORY</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setDropdownOpen((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text
              style={
                wizardState.sport_type
                  ? styles.dropdownValueText
                  : styles.dropdownPlaceholderText
              }
            >
              {wizardState.sport_type || "Select Sport"}
            </Text>
            <Ionicons
              name={dropdownOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color="#0F172A"
            />
          </TouchableOpacity>

          {/* DROPDOWN MENU OPTIONS */}
          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {SPORT_CATEGORIES.map((sport) => {
                const isSelected = wizardState.sport_type === sport;
                return (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.dropdownOptionItem,
                      isSelected && styles.dropdownOptionSelected,
                    ]}
                    onPress={() => {
                      onChangeState({ sport_type: sport });
                      setDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        isSelected && styles.dropdownOptionTextSelected,
                      ]}
                    >
                      {sport}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FIXED BOTTOM ACTION BUTTON */}
      <View style={styles.fixedBottomContainer}>
        <TouchableOpacity
          style={[styles.primaryCtaButton, !isFormValid && styles.primaryCtaDisabled]}
          disabled={!isFormValid}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryCtaText}>ADD PLAYERS</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default CreateTeam;

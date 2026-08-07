import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/CoachProfile";
import { CoachProfileState, DEFAULT_COACH_PROFILE } from "../DataTypes";

export interface CoachProfileProps {
  visible: boolean;
  onClose: () => void;
  onOpenEdit?: () => void;
  profileData?: CoachProfileState;
}

function InlineProfileSkeleton() {
  const animatedValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  return (
    <Animated.View style={[styles.skeletonContainer, { opacity: animatedValue }]}>
      <View style={styles.skeletonDiamondWrapper}>
        <View style={styles.skeletonDiamond} />
      </View>
      <View style={[styles.skeletonTile, { width: 220, height: 24, alignSelf: "center", marginBottom: 8 }]} />
      <View style={[styles.skeletonTile, { width: 140, height: 16, alignSelf: "center", marginBottom: 24 }]} />
      <View style={[styles.skeletonCard, { height: 100 }]} />
      <View style={[styles.skeletonCard, { height: 75 }]} />
      <View style={[styles.skeletonCard, { height: 150 }]} />
      <View style={styles.skeletonGridRow}>
        <View style={[styles.skeletonGridTile, { height: 85 }]} />
        <View style={[styles.skeletonGridTile, { height: 85 }]} />
      </View>
    </Animated.View>
  );
}

export function CoachProfile({
  visible,
  onClose,
  onOpenEdit,
  profileData,
}: CoachProfileProps) {
  const insets = useSafeAreaInsets();
  const profile = profileData || DEFAULT_COACH_PROFILE;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const renderCredentialIcon = (iconName: string) => {
    switch (iconName) {
      case "shield-check":
        return <Ionicons name="shield-checkmark-outline" size={20} color="#00C8FF" />;
      case "user-plus":
        return <Ionicons name="person-add-outline" size={20} color="#00C8FF" />;
      case "star":
        return <Ionicons name="star-outline" size={20} color="#00C8FF" />;
      default:
        return <Ionicons name="ribbon-outline" size={20} color="#00C8FF" />;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* TOP BAR HEADER */}
        <View style={styles.topHeaderBar}>
          <Text style={styles.headerTitle}>MY PROFILE</Text>
          <TouchableOpacity
            style={styles.closeIconButton}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Close Profile"
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <InlineProfileSkeleton />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* DIAMOND AVATAR & HERO HEADER */}
            <View style={styles.heroSection}>
              <View style={styles.diamondWrapper}>
                <View style={styles.diamondFrame}>
                  <View style={styles.diamondInnerIcon}>
                    <Ionicons name="person" size={42} color="#00C8FF" />
                  </View>
                </View>
              </View>

              <Text style={styles.fullNameText}>{profile.full_name}</Text>
              <Text style={styles.roleTitleText}>{profile.role_title}</Text>
            </View>

            {/* REGIONAL AFFILIATION CARD */}
            <View style={styles.cardContainer}>
              <Text style={styles.cyanSubLabel}>REGIONAL AFFILIATION</Text>

              <View style={styles.affiliationItemRow}>
                <Ionicons name="location-outline" size={18} color="#00C8FF" />
                <Text style={styles.affiliationItemText}>
                  {profile.regional_affiliations?.association_name || "Bicol Region Athletic Association (BRAA)"}
                </Text>
              </View>

              <View style={[styles.affiliationItemRow, { marginBottom: 0 }]}>
                <Ionicons name="business-outline" size={18} color="#00C8FF" />
                <Text style={styles.affiliationItemText}>
                  {profile.regional_affiliations?.office_name || "Albay Provincial Sports Office"}
                </Text>
              </View>
            </View>

            {/* SPORTS FOCUS CARD */}
            <View style={styles.cardContainer}>
              <Text style={styles.cyanSubLabel}>SPORTS FOCUS</Text>
              <View style={styles.sportsPillBadge}>
                <Text style={styles.sportsPillText}>{profile.sports_focus}</Text>
              </View>
            </View>

            {/* CREDENTIALS CONTAINER */}
            <View style={styles.cardContainer}>
              <Text style={styles.credentialsHeading}>CREDENTIALS</Text>

              {profile.credentials?.map((item, index) => {
                const isLast = index === profile.credentials.length - 1;
                return (
                  <View
                    key={item.id || `cred_${index}`}
                    style={[
                      styles.credentialItemRow,
                      !isLast && styles.credentialBorderBottom,
                    ]}
                  >
                    <Text style={styles.credentialTitleText}>{item.title}</Text>
                    {renderCredentialIcon(item.icon_name)}
                  </View>
                );
              })}
            </View>

            {/* SYSTEM STATISTICS */}
            <Text style={styles.systemStatsSectionLabel}>SYSTEM STATISTICS</Text>
            <View style={styles.statsGridContainer}>
              <View style={[styles.statColumn, styles.statBorderRight]}>
                <Text style={styles.statNumberText}>
                  {profile.system_statistics?.total_athletes ?? 42}
                </Text>
                <Text style={styles.statLabelText}>TOTAL ATHLETES</Text>
              </View>

              <View style={styles.statColumn}>
                <Text style={styles.statNumberText}>
                  {profile.system_statistics?.metric_logs ?? 156}
                </Text>
                <Text style={styles.statLabelText}>METRIC LOGS</Text>
              </View>
            </View>

            {/* EDIT PROFILE BUTTON */}
            {onOpenEdit && (
              <TouchableOpacity
                style={styles.editProfileCtaBtn}
                onPress={onOpenEdit}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={18} color="#00C8FF" />
                <Text style={styles.editProfileCtaText}>EDIT PROFILE</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export default CoachProfile;

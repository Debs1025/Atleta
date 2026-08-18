import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Image,
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

function InlineProfileSkeleton({ topPadding }: { topPadding: number }) {
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
    <Animated.View style={[styles.skeletonContainer, { opacity: animatedValue, paddingTop: topPadding }]}>
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

// API Request: fetch coach profile details (GET /api/coach/profile)
export function CoachProfile({
  visible,
  onClose,
  onOpenEdit,
  profileData,
}: CoachProfileProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  const profile = profileData || DEFAULT_COACH_PROFILE;
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    if (visible && !hasLoadedOnce.current) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
        hasLoadedOnce.current = true;
      }, 200);
      return () => clearTimeout(timer);
    } else if (visible) {
      setIsLoading(false);
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
      animationType="none"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* FIXED TOP HEADER BAR */}
        <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>MY PROFILE</Text>
            <View style={styles.headerRightActions}>
              {onOpenEdit && (
                <TouchableOpacity
                  style={styles.editAssetIconButton}
                  onPress={onOpenEdit}
                  activeOpacity={0.8}
                  accessibilityLabel="Edit Profile"
                >
                  <Image
                    source={require("../../../../assets/editbutton.png")}
                    style={styles.editAssetImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closeIconButton}
                onPress={onClose}
                activeOpacity={0.8}
                accessibilityLabel="Close Profile"
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isLoading ? (
          <InlineProfileSkeleton topPadding={headerTopPadding + 64} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: headerTopPadding + 64, paddingBottom: 50 },
            ]}
          >
            {/* AVATAR & HERO HEADER */}
            <View style={styles.heroSection}>
              <View style={styles.avatarCircleFrame}>
                {profile.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatarCircleImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={44} color="#00C8FF" />
                )}
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

              {(() => {
                const displayCredentials = [
                  ...(profile.credentials || []),
                  ...(profile.uploaded_documents || [])
                    .filter((doc) => !profile.credentials?.some((c) => c.id === doc.id))
                    .map((doc) => ({
                      id: doc.id,
                      title: doc.file_name.replace(/\.[^/.]+$/, ""),
                      type: "certified",
                      icon_name: "shield-check",
                    })),
                ];

                return displayCredentials.map((item, index) => {
                  const isLast = index === displayCredentials.length - 1;
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
                });
              })()}
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
                <Text style={styles.statLabelText}>MATCH LOGGED</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export default CoachProfile;

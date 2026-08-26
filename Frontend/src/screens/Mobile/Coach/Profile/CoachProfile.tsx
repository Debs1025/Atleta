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
import { requestAuthenticatedJson } from "../../Authentication/authShared";
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

  const [profile, setProfile] = useState<CoachProfileState>(profileData || DEFAULT_COACH_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profileData) {
      setProfile(profileData);
    }
  }, [profileData]);

  useEffect(() => {
    let isMounted = true;
    if (visible) {
      setIsLoading(true);
      const fetchProfile = async () => {
        try {
          const [profileRes, teamsRes]: [any, any] = await Promise.all([
            requestAuthenticatedJson("/coaches/profile").catch(() => null),
            requestAuthenticatedJson("/teams").catch(() => null),
          ]);

          if (isMounted && profileRes) {
            const firstName = profileRes.first_name || profile.first_name || "Coach";
            const lastName = profileRes.last_name || profile.last_name || "";
            const fullName = profileRes.full_name || `${firstName} ${lastName}`.trim();
            const rawSport = (profileRes.sport_type || profileRes.sports_focus || profile.sports_focus || "BASKETBALL").toUpperCase();
            const sportFocus: CoachProfileState["sports_focus"] =
              rawSport.includes("SWIM")
                ? "SWIMMING"
                : rawSport.includes("TRACK")
                ? "TRACK AND FIELD"
                : "BASKETBALL";

            let totalAthletesCount = 0;
            if (Array.isArray(teamsRes)) {
              teamsRes.forEach((t: any) => {
                totalAthletesCount += Array.isArray(t.roster_list) ? t.roster_list.length : 0;
              });
            }

            const updated: CoachProfileState = {
              coach_id: profileRes.coach_id || profileRes.user_id || profile.coach_id,
              user_id: profileRes.user_id || profile.user_id,
              first_name: firstName,
              last_name: lastName,
              full_name: fullName,
              email: profileRes.email || profile.email,
              role_title: `${sportFocus} COACH`,
              sports_focus: sportFocus,
              avatar_url: profileRes.avatar_url || profile.avatar_url,
              regional_affiliations: profileRes.regional_affiliations || profile.regional_affiliations || {
                association_name: "National Sports League",
                office_name: profileRes.current_institution || "Sports Office",
              },
              credentials: profileRes.certifications || profile.credentials || DEFAULT_COACH_PROFILE.credentials,
              uploaded_documents: profileRes.uploaded_documents || profile.uploaded_documents || DEFAULT_COACH_PROFILE.uploaded_documents,
              system_statistics: {
                total_athletes: totalAthletesCount || profileRes.system_statistics?.total_athletes || profile.system_statistics?.total_athletes || 0,
                metric_logs: profileRes.metric_logs || profile.system_statistics?.metric_logs || 0,
              },
              last_updated: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase(),
            };
            setProfile(updated);
          }
        } catch (err) {
          console.warn("Failed to fetch coach profile in modal:", err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      fetchProfile();
    }

    return () => {
      isMounted = false;
    };
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

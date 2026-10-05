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
import { getCoachProfileOfflineFirst, getTeamsOfflineFirst, getMatchesOfflineFirst } from "../../../../services/firebaseClient";

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

// API & Firestore Data: fetch coach profile details live from Firestore
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
          // Fetch from Firestore-backed offline first & backend API in parallel
          const [offlineProfileRes, profileRes, teamsRes, matchesRes]: [any, any, any, any] = await Promise.all([
            getCoachProfileOfflineFirst(profileData?.user_id || profileData?.coach_id).catch(() => null),
            requestAuthenticatedJson("/coaches/profile").catch(() => null),
            getTeamsOfflineFirst().catch(() => null),
            getMatchesOfflineFirst().catch(() => null),
          ]);

          const combined = profileRes || offlineProfileRes;

          if (isMounted && combined) {
            const firstName = combined.first_name || offlineProfileRes?.first_name || profile.first_name || "Coach";
            const lastName = combined.last_name || offlineProfileRes?.last_name || profile.last_name || "";
            const fullName = combined.full_name || offlineProfileRes?.full_name || `${firstName} ${lastName}`.trim();
            const rawSport = (combined.sport_type || combined.sports_focus || offlineProfileRes?.sport_type || profile.sports_focus || "BASKETBALL").toUpperCase();
            const sportFocus: CoachProfileState["sports_focus"] =
              rawSport.includes("SWIM")
                ? "SWIMMING"
                : rawSport.includes("TRACK")
                ? "TRACK AND FIELD"
                : rawSport;

            let totalAthletesCount = 0;
            if (Array.isArray(teamsRes)) {
              const athleteIds = new Set<string>();
              teamsRes.forEach((t: any) => {
                if (Array.isArray(t.roster_list)) {
                  t.roster_list.forEach((r: any) => {
                    const id = r.athlete_id || r.user_id;
                    if (id) athleteIds.add(id);
                  });
                }
              });
              totalAthletesCount = athleteIds.size;
            }

            let totalMatchesCount = 0;
            if (Array.isArray(matchesRes)) {
              totalMatchesCount = matchesRes.length;
            }

            const institution = combined.current_institution || offlineProfileRes?.current_institution || profile.current_institution || "";
            const regionalAffiliation = combined.regional_affiliation || offlineProfileRes?.regional_affiliation || profile.regional_affiliation || "";
            const nationalLeague = combined.national_sports_league || offlineProfileRes?.national_sports_league || profile.national_sports_league || "";
            const avatarUrl = combined.avatar_url || offlineProfileRes?.avatar_url || profile.avatar_url;

            const creds = combined.certifications || combined.credentials || offlineProfileRes?.certifications || offlineProfileRes?.credentials || profile.credentials || [];
            const docs = combined.uploaded_documents || offlineProfileRes?.uploaded_documents || profile.uploaded_documents || [];

            const updated: CoachProfileState = {
              coach_id: combined.coach_id || offlineProfileRes?.coach_id || profile.coach_id,
              user_id: combined.user_id || offlineProfileRes?.user_id || profile.user_id,
              first_name: firstName,
              last_name: lastName,
              full_name: fullName,
              email: combined.email || offlineProfileRes?.email || profile.email,
              role_title: `${sportFocus} COACH`,
              sports_focus: sportFocus,
              avatar_url: avatarUrl,
              current_institution: institution,
              regional_affiliation: regionalAffiliation,
              national_sports_league: nationalLeague,
              regional_affiliations: {
                association_name: regionalAffiliation || nationalLeague || "",
                office_name: institution || "",
              },
              credentials: creds,
              uploaded_documents: docs,
              system_statistics: {
                total_athletes: totalAthletesCount || combined.system_statistics?.total_athletes || offlineProfileRes?.system_statistics?.total_athletes || 0,
                metric_logs: totalMatchesCount || combined.system_statistics?.metric_logs || combined.metric_logs || offlineProfileRes?.system_statistics?.metric_logs || 0,
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

            {/* CURRENT INSTITUTION CARD */}
            <View style={styles.cardContainer}>
              <Text style={styles.cyanSubLabel}>CURRENT INSTITUTION</Text>
              <View style={styles.affiliationItemRow}>
                <Ionicons name="business-outline" size={18} color="#00C8FF" />
                <Text style={styles.affiliationItemText}>
                  {profile.current_institution || "No Institution Specified"}
                </Text>
              </View>
            </View>

            {/* REGIONAL AFFILIATION CARD */}
            <View style={styles.cardContainer}>
              <Text style={styles.cyanSubLabel}>REGIONAL AFFILIATION & LEAGUE</Text>

              <View style={styles.affiliationItemRow}>
                <Ionicons name="location-outline" size={18} color="#00C8FF" />
                <Text style={styles.affiliationItemText}>
                  {profile.regional_affiliation || profile.regional_affiliations?.association_name || "No Regional Affiliation"}
                </Text>
              </View>

              <View style={[styles.affiliationItemRow, { marginBottom: 0 }]}>
                <Ionicons name="trophy-outline" size={18} color="#00C8FF" />
                <Text style={styles.affiliationItemText}>
                  {profile.national_sports_league || profile.regional_affiliations?.office_name || "No League Specified"}
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

                if (displayCredentials.length === 0) {
                  return (
                    <View style={[styles.credentialItemRow, { justifyContent: "center", borderBottomWidth: 0 }]}>
                      <Text style={[styles.credentialTitleText, { color: "#64748B", fontSize: 13 }]}>
                        No credentials uploaded
                      </Text>
                    </View>
                  );
                }

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
                  {profile.system_statistics?.total_athletes ?? 0}
                </Text>
                <Text style={styles.statLabelText}>TOTAL ATHLETES</Text>
              </View>

              <View style={styles.statColumn}>
                <Text style={styles.statNumberText}>
                  {profile.system_statistics?.metric_logs ?? 0}
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

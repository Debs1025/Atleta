import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/CoachProfile";
import { CoachProfileSchema } from "../Teams/Teams";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

export type CoachProfileData = CoachProfileSchema;

interface CoachProfileProps {
  coachId?: string;
  coachData?: CoachProfileData;
  onBack: () => void;
}

export function CoachProfileScreen({
  coachId,
  coachData: propCoachData,
  onBack,
}: CoachProfileProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;
  const [coachData, setCoachData] = useState<CoachProfileData | null>(propCoachData || null);
  const [loading, setLoading] = useState<boolean>(!propCoachData);

  useEffect(() => {
    setCoachData(propCoachData || null);
    setLoading(!propCoachData);

    if (propCoachData) {
      return;
    }

    let isMounted = true;
    const fetchCoach = async () => {
      try {
        setLoading(true);
        const path = coachId ? `/coaches/${coachId}` : "/coaches/me";
        const res: any = await requestAuthenticatedJson(path).catch(() => null);

        if (isMounted && res) {
          const c = res.profile || res.coach || res;
          const firstName = c.first_name || "";
          const lastName = c.last_name || "";
          const fullName = c.full_name || `${firstName} ${lastName}`.trim() || "Coach Profile";
          const inst = c.current_institution || c.institution || "Athletic Program";
          const sport = (c.sport_type || "Basketball").toUpperCase();

          const mapped: CoachProfileData = {
            coach_id: c.coach_id || coachId || "",
            full_name: fullName.toUpperCase(),
            institution: inst,
            role_title: c.role_title || `${sport} HEAD COACH`,
            tags: Array.isArray(c.tags) && c.tags.length > 0 ? c.tags : [sport, "VERIFIED COACH"],
            years_experience: c.years_of_experience || c.years_experience ? `${c.years_of_experience || c.years_experience}+` : "5+",
            core_specialties: Array.isArray(c.specialties) && c.specialties.length > 0 ? c.specialties : Array.isArray(c.core_specialties) ? c.core_specialties : ["Tactical Strategy", "Physical Conditioning", "Talent Scouting"],
            success_rate: c.success_rate ? `${c.success_rate}%` : "90%",
            recruits_placed: c.recruits_placed || "Certified Athletic Staff",
            philosophy: c.philosophy || c.bio || `${fullName} brings extensive athletic experience and tactical discipline. The coaching approach focuses on athlete development and high performance.`,
            quote: c.quote || "Discipline and consistent effort drive championship execution.",
            certificates: Array.isArray(c.professional_documents) && c.professional_documents.length > 0 ? c.professional_documents.map((d: any) => typeof d === 'string' ? d.replace(/\.[^/.]+$/, "") : (d.name || "Certified Coach")) : (c.certificates || ["Professional Coaching Certification"]),
            contact_info: {
              email: c.email || c.contact_info?.email || "coach@atleta.com",
              facebook: c.facebook || c.contact_info?.facebook || fullName,
              phone: c.contact_number || c.phone || c.contact_info?.phone || "Contact via App",
            },
          };
          setCoachData(mapped);
        }
      } catch (err) {
        if (isMounted) setCoachData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCoach();
    return () => {
      isMounted = false;
    };
  }, [coachId, propCoachData]);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>COACH PROFILE</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 }}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={{ color: "#94A3B8", marginTop: 12, fontSize: 14 }}>Loading coach profile...</Text>
        </View>
      ) : !coachData ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, paddingTop: 40 }}>
          <Ionicons name="person-circle-outline" size={64} color="#64748B" />
          <Text style={{ color: "#F8FAFC", fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" }}>
            Coach Profile Unavailable
          </Text>
          <Text style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", marginTop: 8 }}>
            Unable to load coach details at this time.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header Block */}
          <View style={styles.profileHeaderBlock}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBox}>
                <Ionicons name="person-outline" size={48} color="#64748B" />
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#38BDF8" />
              </View>
            </View>

            <Text style={styles.coachName}>{coachData.full_name}</Text>
            <Text style={styles.institutionRole}>
              {coachData.institution} | {coachData.role_title}
            </Text>

            {/* Tags Row */}
            <View style={styles.tagsRow}>
              {coachData.tags.map((tag, idx) => {
                const isActive = tag.includes("ACTIVE") || tag.includes("SCOUTING") || tag.includes("VERIFIED");
                return (
                  <View
                    key={idx}
                    style={[
                      styles.tagPill,
                      isActive && styles.tagPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        isActive && styles.tagTextActive,
                      ]}
                    >
                      {tag}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Metric Cards Stack */}
          <View style={styles.metricCardStack}>
            {/* Card 1: Experience */}
            <View style={styles.metricCardCenter}>
              <Text style={styles.metricCardLabel}>EXPERIENCE</Text>
              <Text style={styles.metricBigValue}>{coachData.years_experience}</Text>
              <Text style={styles.metricSubtext}>Years of Elite Coaching</Text>
            </View>

            {/* Card 2: Core Specialties */}
            <View style={styles.metricCard}>
              <Text style={styles.metricCardLabel}>CORE SPECIALTIES</Text>
              <View style={styles.specialtiesList}>
                {coachData.core_specialties.map((item, idx) => (
                  <View key={idx} style={styles.specialtyItemCard}>
                    <Ionicons
                      name={
                        idx === 0
                          ? "basketball-outline"
                          : idx === 1
                          ? "fitness-outline"
                          : "body-outline"
                      }
                      size={16}
                      color="#38BDF8"
                      style={styles.specialtyIcon}
                    />
                    <Text style={styles.specialtyText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Card 3: Success Rate */}
            <View style={styles.metricCardCenter}>
              <Text style={styles.metricCardLabel}>SUCCESS RATE</Text>
              <Text style={styles.metricBigValue}>{coachData.success_rate}</Text>
              <Text style={styles.metricSubtext}>{coachData.recruits_placed}</Text>
            </View>
          </View>

          {/* Section: Coaching Philosophy */}
          <View style={styles.philosophySection}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.verticalAccentBar} />
              <Text style={styles.sectionTitleText}>COACHING PHILOSOPHY</Text>
            </View>

            <Text style={styles.philosophyParagraph}>{coachData.philosophy}</Text>

            <View style={styles.quoteCard}>
              <Text style={styles.quoteText}>"{coachData.quote}"</Text>
            </View>
          </View>

          {/* Certificates Container */}
          <View style={styles.certificatesCard}>
            <Text style={styles.metricCardLabel}>CERTIFICATES</Text>
            {coachData.certificates.map((cert, idx) => (
              <View key={idx} style={styles.certBox}>
                <Text style={styles.certText}>{cert}</Text>
              </View>
            ))}
          </View>

          {/* Contact Information Box */}
          <View style={styles.contactCard}>
            <Text style={styles.metricCardLabel}>CONTACT INFORMATION</Text>
            <View style={styles.contactRow}>
              <Ionicons name="mail-outline" size={16} color="#38BDF8" />
              <Text style={styles.contactText}>{coachData.contact_info.email}</Text>
            </View>

            <View style={styles.contactRow}>
              <Ionicons name="logo-facebook" size={16} color="#38BDF8" />
              <Text style={styles.contactText}>{coachData.contact_info.facebook}</Text>
            </View>

            <View style={styles.contactRow}>
              <Ionicons name="call-outline" size={16} color="#38BDF8" />
              <Text style={styles.contactText}>{coachData.contact_info.phone}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

export const CoachProfile = CoachProfileScreen;



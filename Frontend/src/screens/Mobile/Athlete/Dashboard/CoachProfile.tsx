import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./styles/CoachProfile";

import { CoachProfileSchema } from "../Teams/Teams";

export type CoachProfileData = CoachProfileSchema;

// sample coach data for testing 
export const DEFAULT_COACH_PROFILE: CoachProfileData = {
  coach_id: "coach_erick_01",
  full_name: "COACH ERICK NATHANIEL",
  institution: "Albay National High School",
  role_title: "Head Coach",
  tags: ["BASKETBALL", "ACTIVE SCOUTING"],
  years_experience: "15+",
  core_specialties: [
    "Basketball Strategy",
    "Strength & Conditioning",
    "Player Development",
  ],
  success_rate: "94%",
  recruits_placed: "80+ Recruits Placed",
  philosophy:
    "Coach Erick Nathaniel brings over a decade of high-stakes experience to Albay National High School. His approach centers on the \"Total Athlete\" concept—integrating rigorous tactical basketball training with advanced physiological conditioning and academic excellence.",
  quote:
    "We don't just build players; we build professionals. My goal is to bridge the gap between high school potential and collegiate readiness by instilling discipline, tactical intelligence, and a relentless work ethic from day one.",
  certificates: [
    "Professional Basketball",
    "Certified Athlete Coach",
    "Certified Basketball Trainer",
  ],
  contact_info: {
    email: "coach@gmail.com",
    facebook: "Gerard Pelonio",
    phone: "+67000",
  },
};

interface CoachProfileProps {
  coachData?: CoachProfileData;
  onBack: () => void;
}

export function CoachProfileScreen({
  coachData = DEFAULT_COACH_PROFILE,
  onBack,
}: CoachProfileProps) {
  const {
    full_name,
    institution,
    role_title,
    tags,
    years_experience,
    core_specialties,
    success_rate,
    recruits_placed,
    philosophy,
    quote,
    certificates,
    contact_info,
  } = coachData;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>COACH PROFILE</Text>
      </View>

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

          <Text style={styles.coachName}>{full_name}</Text>
          <Text style={styles.institutionRole}>
            {institution} | {role_title}
          </Text>

          {/* Tags Row */}
          <View style={styles.tagsRow}>
            {tags.map((tag, idx) => {
              const isActive = tag.includes("ACTIVE") || tag.includes("SCOUTING");
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
            <Text style={styles.metricBigValue}>{years_experience}</Text>
            <Text style={styles.metricSubtext}>Years of Elite Coaching</Text>
          </View>

          {/* Card 2: Core Specialties */}
          <View style={styles.metricCard}>
            <Text style={styles.metricCardLabel}>CORE SPECIALTIES</Text>
            <View style={styles.specialtiesList}>
              {core_specialties.map((item, idx) => (
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
            <Text style={styles.metricBigValue}>{success_rate}</Text>
            <Text style={styles.metricSubtext}>{recruits_placed}</Text>
          </View>
        </View>

        {/* Section: Coaching Philosophy */}
        <View style={styles.philosophySection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.verticalAccentBar} />
            <Text style={styles.sectionTitleText}>COACHING PHILOSOPHY</Text>
          </View>

          <Text style={styles.philosophyParagraph}>{philosophy}</Text>

          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{quote}"</Text>
          </View>
        </View>

        {/* Certificates Container */}
        <View style={styles.certificatesCard}>
          <Text style={styles.metricCardLabel}>CERTIFICATES</Text>
          {certificates.map((cert, idx) => (
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
            <Text style={styles.contactText}>{contact_info.email}</Text>
          </View>

          <View style={styles.contactRow}>
            <Ionicons name="logo-facebook" size={16} color="#38BDF8" />
            <Text style={styles.contactText}>{contact_info.facebook}</Text>
          </View>

          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#38BDF8" />
            <Text style={styles.contactText}>{contact_info.phone}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export const CoachProfile = CoachProfileScreen;


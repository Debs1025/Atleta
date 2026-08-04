import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CoachProfileSchema } from "./Teams";

interface InquireCoachProps {
  coach: CoachProfileSchema;
  onBack: () => void;
  onGoHome: () => void;
  onGoInquiries: () => void;
}

export function InquireCoachScreen({
  coach,
  onBack,
  onGoHome,
  onGoInquiries,
}: InquireCoachProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSendInquiry = () => {
    setModalVisible(true);
  };

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
        {/* Header Section */}
        <View style={styles.profileHeaderBlock}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBox}>
              <Ionicons name="person-outline" size={48} color="#64748B" />
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#38BDF8" />
            </View>
          </View>

          <Text style={styles.coachName}>{coach.full_name}</Text>
          <Text style={styles.institutionRole}>
            {coach.institution} | {coach.role_title}
          </Text>

          {/* Tags Row */}
          <View style={styles.tagsRow}>
            {coach.tags && coach.tags.map((tag, idx) => {
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
            <Text style={styles.metricBigValue}>{coach.years_experience}</Text>
            <Text style={styles.metricSubtext}>Years of Elite Coaching</Text>
          </View>

          {/* Card 2: Core Specialties */}
          <View style={styles.metricCard}>
            <Text style={styles.metricCardLabel}>CORE SPECIALTIES</Text>
            <View style={styles.specialtiesList}>
              {coach.core_specialties.map((item, idx) => (
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
            <Text style={styles.metricBigValue}>{coach.success_rate}</Text>
            <Text style={styles.metricSubtext}>{coach.recruits_placed}</Text>
          </View>
        </View>

        {/* Section: Coaching Philosophy */}
        <View style={styles.philosophySection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.verticalAccentBar} />
            <Text style={styles.sectionTitleText}>COACHING PHILOSOPHY</Text>
          </View>

          <Text style={styles.philosophyParagraph}>{coach.philosophy}</Text>

          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{coach.quote}"</Text>
          </View>
        </View>

        {/* Certificates Container */}
        <View style={styles.certificatesCard}>
          <Text style={styles.metricCardLabel}>CERTIFICATES</Text>
          {coach.certificates.map((cert, idx) => (
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
            <Text style={styles.contactText}>{coach.contact_info.email}</Text>
          </View>

          <View style={styles.contactRow}>
            <Ionicons name="logo-facebook" size={16} color="#38BDF8" />
            <Text style={styles.contactText}>{coach.contact_info.facebook}</Text>
          </View>

          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={16} color="#38BDF8" />
            <Text style={styles.contactText}>{coach.contact_info.phone}</Text>
          </View>
        </View>

        {/* Primary CTA Button */}
        <Pressable style={styles.sendInquiryButton} onPress={handleSendInquiry}>
          <Ionicons
            name="paper-plane-outline"
            size={18}
            color="#FFFFFF"
            style={styles.sendIcon}
          />
          <Text style={styles.sendInquiryText}>SEND RECRUITMENT INQUIRY</Text>
        </Pressable>
      </ScrollView>

      {/* SCREEN 4: INQUIRY SENT SUCCESS MODAL (image_067d57.jpg) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Inquiry Sent ✓</Text>
            <Text style={styles.modalSubtitle}>
              You can view your inquiry to the inquiry page
            </Text>

            <View style={styles.modalButtonRow}>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  onGoHome();
                }}
              >
                <Text style={styles.modalButtonText}>Back Home</Text>
              </Pressable>

              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setModalVisible(false);
                  onGoInquiries();
                }}
              >
                <Text style={styles.modalButtonText}>View Page</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
  },
  headerBar: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0B132B",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  profileHeaderBlock: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarBox: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: "#111C35",
    borderWidth: 1,
    borderColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#0B132B",
    borderRadius: 12,
  },
  coachName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 4,
  },
  institutionRole: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 14,
  },
  tagsRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  tagPill: {
    backgroundColor: "#111C35",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 3,
    marginBottom: 6,
  },
  tagPillActive: {
    backgroundColor: "#0284C7",
    borderColor: "#38BDF8",
  },
  tagText: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "800",
  },
  tagTextActive: {
    color: "#FFFFFF",
  },
  metricCardStack: {
    marginBottom: 20,
  },
  metricCardCenter: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  metricCard: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 12,
  },
  metricCardLabel: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 8,
  },
  metricBigValue: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginVertical: 2,
  },
  metricSubtext: {
    color: "#64748B",
    fontSize: 12,
  },
  specialtiesList: {
    marginTop: 4,
  },
  specialtyItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  specialtyIcon: {
    marginRight: 10,
  },
  specialtyText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  philosophySection: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  verticalAccentBar: {
    width: 3,
    height: 16,
    backgroundColor: "#38BDF8",
    marginRight: 8,
    borderRadius: 2,
  },
  sectionTitleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  philosophyParagraph: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  quoteCard: {
    backgroundColor: "#111C35",
    borderLeftWidth: 3,
    borderLeftColor: "#38BDF8",
    borderRadius: 8,
    padding: 14,
  },
  quoteText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },
  certificatesCard: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 20,
  },
  certBox: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  certText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  contactCard: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 24,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  contactText: {
    color: "#FFFFFF",
    fontSize: 13,
    marginLeft: 10,
  },
  sendInquiryButton: {
    backgroundColor: "#00A3FF",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  sendIcon: {
    marginRight: 8,
  },
  sendInquiryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  /* MODAL STYLES (Screen 4) */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#10B981",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  modalSubtitle: {
    color: "#FFFFFF",
    fontSize: 13,
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 0.48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "800",
  },
});

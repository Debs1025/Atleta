import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/InquireCoach";
import { Ionicons } from "@expo/vector-icons";
import { CoachProfileSchema } from "./Teams";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

interface InquireCoachProps {
  coach: CoachProfileSchema;
  isAlreadyInquired?: boolean;
  onBack: () => void;
  onGoHome: () => void;
  onGoInquiries: () => void;
}

export function InquireCoachScreen({
  coach,
  isAlreadyInquired = false,
  onBack,
  onGoHome,
  onGoInquiries,
}: InquireCoachProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;
  const [modalMode, setModalMode] = useState<"SUCCESS" | "ALREADY_SENT" | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [hasSentInquiry, setHasSentInquiry] = useState(false);

  const handleSendInquiry = async () => {
    if (!coach.coach_id && !coach.full_name) {
      return;
    }

    try {
      setIsSending(true);

      if (isAlreadyInquired || hasSentInquiry) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setModalMode("ALREADY_SENT");
        return;
      }

      await requestAuthenticatedJson("/inquiries", "POST", {
        coach_id: coach.coach_id,
        message: `Athlete interested in recruitment discussion and tryouts with ${coach.full_name}.`,
      });
      setHasSentInquiry(true);
      setModalMode("SUCCESS");
    } catch (err: any) {
      setHasSentInquiry(true);
      setModalMode("ALREADY_SENT");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
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
        <Pressable style={[styles.sendInquiryButton, isSending && { opacity: 0.6 }]} disabled={isSending} onPress={handleSendInquiry}>
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons
                name="paper-plane-outline"
                size={18}
                color="#FFFFFF"
                style={styles.sendIcon}
              />
              <Text style={styles.sendInquiryText}>SEND RECRUITMENT INQUIRY</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* CUSTOM STATUS MODAL OVERLAY */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={Boolean(modalMode)}
        onRequestClose={() => setModalMode(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons
              name={modalMode === "SUCCESS" ? "checkmark-circle-outline" : "information-circle-outline"}
              size={48}
              color={modalMode === "SUCCESS" ? "#38BDF8" : "#F59E0B"}
              style={{ alignSelf: "center", marginBottom: 12 }}
            />
            <Text style={styles.modalTitle}>
              {modalMode === "SUCCESS" ? "Inquiry Successful" : "Already Inquired"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {modalMode === "SUCCESS"
                ? `Your recruitment inquiry has been successfully sent to ${coach.full_name}. You can view and track status on the Inquiries page.`
                : `You already sent an inquiry request to ${coach.full_name}. Duplicate requests are disabled.`}
            </Text>

            <View style={styles.modalButtonRow}>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setModalMode(null);
                  onGoHome();
                }}
              >
                <Text style={styles.modalButtonText}>Back Home</Text>
              </Pressable>

              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setModalMode(null);
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




import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/InquireCoach";
import { Ionicons } from "@expo/vector-icons";
import { CoachProfileSchema } from "./Teams";
import { requestAuthenticatedJson, getStoredAuthToken } from "../../Authentication/authShared";
import { db } from "../../../../services/firebaseClient";
import { doc, setDoc } from "firebase/firestore";

interface InquireCoachProps {
  coach: CoachProfileSchema;
  isAlreadyInquired?: boolean;
  athleteCategory?: string;
  onBack: () => void;
  onGoHome: () => void;
  onGoInquiries: () => void;
}

export function InquireCoachScreen({
  coach,
  isAlreadyInquired = false,
  athleteCategory,
  onBack,
  onGoHome,
  onGoInquiries,
}: InquireCoachProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;
  const [modalMode, setModalMode] = useState<"SUCCESS" | "ALREADY_SENT" | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [hasSentInquiry, setHasSentInquiry] = useState(false);

  const handleSendInquiry = async () => {
    if (!coach.coach_id && !coach.full_name) {
      return;
    }

    if (athleteCategory && coach.tags && coach.tags.length > 0) {
      const normAthleteSport = athleteCategory.toUpperCase().replace(/&/g, "AND").replace(/\s+/g, "").trim();
      const coachSportTag = (coach.tags[0] || "").toUpperCase().replace(/&/g, "AND").replace(/\s+/g, "").trim();
      if (coachSportTag && coachSportTag !== "ALL" && !normAthleteSport.includes(coachSportTag) && !coachSportTag.includes(normAthleteSport)) {
        Alert.alert(
          "Sport Restriction",
          `You can only join or inquire with teams matching your active sport (${athleteCategory}).`
        );
        return;
      }
    }

    try {
      setIsSending(true);

      if (isAlreadyInquired || hasSentInquiry) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        setModalMode("ALREADY_SENT");
        return;
      }

      const nowIso = new Date().toISOString();
      const inqId = `inq_${Date.now()}`;
      const newInquiry: any = {
        inquiry_id: inqId,
        scout_id: inqId,
        coach_name: coach.full_name || "Coach",
        institution_sport: `${coach.institution || "Varsity"} • ${coach.role_title || "Program"}`,
        status: "PENDING",
        offer_status: "Sent",
        date_initiated: nowIso,
        updated_at_relative: "Sent: Just now",
        sub_note: `Recruitment discussion with ${coach.full_name}.`,
      };

      // 1. Immediately cache inquiry in AsyncStorage so refreshes always show it
      try {
        const cachedRaw = await AsyncStorage.getItem("atleta_offline_inquiries_cache");
        const existingList = cachedRaw ? JSON.parse(cachedRaw) : [];
        const mergedList = [newInquiry, ...(Array.isArray(existingList) ? existingList : [])];
        await AsyncStorage.setItem("atleta_offline_inquiries_cache", JSON.stringify(mergedList));
      } catch (_) {}

      // 2. Direct Firestore write
      try {
        const token = await getStoredAuthToken();
        let currentUserId = "ath_me";
        if (token && token.includes(".")) {
          try {
            const base64Url = token.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const decoded = typeof atob === "function" ? atob(base64) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(base64, "base64").toString("utf-8") : "");
            const payload = JSON.parse(decoded);
            currentUserId = payload.uid || payload.user_id || payload.sub || "ath_me";
          } catch (_) {}
        }
        await Promise.all([
          setDoc(doc(db, "Scouting_Registry", inqId), {
            scout_id: inqId,
            athlete_id: currentUserId,
            coach_scout_id: coach.coach_id,
            initiated_by: currentUserId,
            coach_name: coach.full_name,
            current_institution: coach.institution,
            role_title: coach.role_title,
            offer_status: "Sent",
            date_initiated: nowIso,
            updated_at: nowIso,
          }, { merge: true }).catch(() => null),
          setDoc(doc(db, "Inquiries", inqId), {
            inquiry_id: inqId,
            athlete_id: currentUserId,
            coach_id: coach.coach_id,
            coach_name: coach.full_name,
            institution: coach.institution,
            status: "PENDING",
            created_at: nowIso,
          }, { merge: true }).catch(() => null),
        ]);
      } catch (_) {}

      // 3. API request to backend
      await requestAuthenticatedJson("/inquiries", "POST", {
        coach_id: coach.coach_id,
        message: `Athlete interested in recruitment discussion and tryouts with ${coach.full_name}.`,
      }).catch((apiErr) => {
        console.warn("Backend /inquiries submit note:", apiErr);
      });

      setHasSentInquiry(true);
      setModalMode("SUCCESS");
    } catch (err: any) {
      const errMsg = err?.message || err?.error || String(err);
      if (
        errMsg.toLowerCase().includes("already have an active") ||
        errMsg.toLowerCase().includes("already inquired")
      ) {
        setHasSentInquiry(true);
        setModalMode("ALREADY_SENT");
      } else {
        Alert.alert("Inquiry Error", errMsg || "Failed to submit recruitment inquiry. Please try again.");
      }
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
            <View style={[styles.avatarBox, { overflow: "hidden" }]}>
              {coach.avatar_url ? (
                <Image
                  source={{ uri: coach.avatar_url }}
                  style={{ width: "100%", height: "100%", borderRadius: 20 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person-outline" size={48} color="#64748B" />
              )}
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
          <View style={[styles.metricCardCenter, { width: "100%" }]}>
            <Text style={styles.metricCardLabel}>EXPERIENCE</Text>
            <Text style={styles.metricBigValue}>{coach.years_experience}</Text>
            <Text style={styles.metricSubtext}>Years of Elite Coaching</Text>
          </View>
        </View>

        {/* Section: Coaching Philosophy */}
        <View style={styles.philosophySection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.verticalAccentBar} />
            <Text style={styles.sectionTitleText}>COACHING PHILOSOPHY</Text>
          </View>

          <Text style={styles.philosophyParagraph}>
            {(coach as any).coachingPhilosophy || (coach as any).coaching_philosophy || coach.philosophy}
          </Text>

          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>
              "{coach.quote && coach.quote !== "Not specified" ? coach.quote : ((coach as any).coachingPhilosophy || (coach as any).coaching_philosophy || coach.philosophy || "Dedicated to athletic excellence and growth.")}"
            </Text>
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




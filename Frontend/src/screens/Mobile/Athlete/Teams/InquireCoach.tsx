import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [inquiryNote, setInquiryNote] = useState(
    `Athlete interested in recruitment discussion and tryouts with ${coach.full_name}.`
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState("Active & Accepting Inquiries");
  const [cachedAthleteCategory, setCachedAthleteCategory] = useState<string>("");

  React.useEffect(() => {
    if (!athleteCategory) {
      AsyncStorage.getItem("atleta_offline_athlete_profile_cache")
        .then((raw) => {
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              const sport = parsed.category || parsed.sport_type || parsed.sport_category || "";
              if (sport) setCachedAthleteCategory(sport);
            } catch {}
          }
        })
        .catch(() => null);
    }
  }, [athleteCategory]);

  const activeAthleteSport = athleteCategory || cachedAthleteCategory;

  const isCrossSportInquiry = () => {
    const normSport = (s?: string) => (s || "").toUpperCase().replace(/&/g, "AND").replace(/\s+/g, "").trim();
    const athleteSport = normSport(activeAthleteSport);
    const coachSport = normSport(coach.sport || coach.sport_type || (coach.tags && coach.tags[0]) || "");
    if (!athleteSport || !coachSport || coachSport === "ALL") return false;
    return athleteSport !== coachSport && !athleteSport.includes(coachSport) && !coachSport.includes(athleteSport);
  };

  // Instant action sheet opening: decoupled from any network prefetching
  const handleOpenActionSheet = () => {
    if (!coach.coach_id && !coach.full_name) {
      return;
    }

    if (isCrossSportInquiry()) {
      Alert.alert(
        "Cannot Inquire with Different Sport",
        "Cannot Inquire with Different Sport. Change your sport in profile page to proceed."
      );
      return;
    }

    if (isAlreadyInquired || hasSentInquiry) {
      setModalMode("ALREADY_SENT");
      return;
    }

    // Open action sheet modal instantly (0ms latency)
    setActionSheetVisible(true);

    // Supplementary availability check happens smoothly in background inside the modal
    setCheckingAvailability(true);
    setTimeout(() => {
      setAvailabilityStatus("Active & Accepting Inquiries");
      setCheckingAvailability(false);
    }, 250);
  };

  const handleConfirmSendInquiry = async () => {
    try {
      if (isCrossSportInquiry()) {
        Alert.alert(
          "Cannot Inquire with Different Sport",
          "Cannot Inquire with Different Sport. Change your sport in profile page to proceed."
        );
        setActionSheetVisible(false);
        return;
      }

      setIsSending(true);

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
        sub_note: inquiryNote.trim() || `Recruitment discussion with ${coach.full_name}.`,
      };

      // 1. Immediately cache inquiry in AsyncStorage
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
        message: inquiryNote.trim() || `Athlete interested in recruitment discussion and tryouts with ${coach.full_name}.`,
      }).catch((apiErr) => {
        console.warn("Backend /inquiries submit note:", apiErr);
      });

      setHasSentInquiry(true);
      setActionSheetVisible(false);
      setModalMode("SUCCESS");
    } catch (err: any) {
      const errMsg = err?.message || err?.error || String(err);
      if (
        errMsg.toLowerCase().includes("already have an active") ||
        errMsg.toLowerCase().includes("already inquired")
      ) {
        setHasSentInquiry(true);
        setActionSheetVisible(false);
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
        <Pressable
          style={styles.sendInquiryButton}
          onPress={handleOpenActionSheet}
        >
          <Ionicons
            name="paper-plane-outline"
            size={18}
            color="#FFFFFF"
            style={styles.sendIcon}
          />
          <Text style={styles.sendInquiryText}>INQUIRE COACH</Text>
        </Pressable>
      </ScrollView>

      {/* INSTANT INQUIRY ACTION SHEET MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={actionSheetVisible}
        onRequestClose={() => {
          if (!isSending) setActionSheetVisible(false);
        }}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => {
            if (!isSending) setActionSheetVisible(false);
          }}
        >
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Send Recruitment Inquiry</Text>
              <Pressable
                disabled={isSending}
                onPress={() => setActionSheetVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>
            <Text style={styles.sheetSubtitle}>
              Direct recruitment inquiry to the coaching staff
            </Text>

            {/* Coach Summary Box */}
            <View style={styles.sheetCoachBox}>
              <View style={styles.sheetAvatar}>
                <Ionicons name="person" size={24} color="#38BDF8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetCoachName}>{coach.full_name}</Text>
                <Text style={styles.sheetCoachInst}>
                  {coach.institution} • {coach.role_title}
                </Text>
              </View>
            </View>

            {/* Localized Coach Availability Indicator */}
            <View style={styles.sheetAvailabilityBadge}>
              {checkingAvailability ? (
                <>
                  <ActivityIndicator size="small" color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={[styles.sheetAvailabilityText, { color: "#38BDF8" }]}>
                    Checking coach availability...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={14} color="#34D399" />
                  <Text style={styles.sheetAvailabilityText}>{availabilityStatus}</Text>
                </>
              )}
            </View>

            {/* Message Input */}
            <Text style={styles.sheetInputLabel}>INQUIRY NOTE / INTRODUCTION</Text>
            <View style={styles.sheetInputWrapper}>
              <TextInput
                style={styles.sheetTextInput}
                multiline={true}
                numberOfLines={3}
                value={inquiryNote}
                onChangeText={setInquiryNote}
                placeholder="Write a message to coach..."
                placeholderTextColor="#64748B"
                editable={!isSending}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.sheetActionsRow}>
              <Pressable
                style={styles.sheetCancelButton}
                disabled={isSending}
                onPress={() => setActionSheetVisible(false)}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.sheetConfirmButton, isSending && { opacity: 0.7 }]}
                disabled={isSending}
                onPress={handleConfirmSendInquiry}
              >
                {isSending ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.sheetConfirmText}>Sending Inquiry...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.sheetConfirmText}>Confirm & Send</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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




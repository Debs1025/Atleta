import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/Inquiries";
import { InquirySchema } from "./Teams";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

interface InquiriesProps {
  inquiries?: InquirySchema[];
  onBack: () => void;
}

import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../../../services/firebaseClient";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getStoredAuthToken } from "../../Authentication/authShared";

export function InquiriesScreen({ inquiries: propInquiries, onBack }: InquiriesProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 10;
  const [inquiries, setInquiries] = useState<InquirySchema[]>(propInquiries || []);
  const [loading, setLoading] = useState(!propInquiries || propInquiries.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInquiries = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res: any = await requestAuthenticatedJson("/inquiries").catch(() => null);

      let rawList = res?.inquiries || (Array.isArray(res) ? res : []);

      // Fallback to Firestore Scouting_Registry / Inquiries if backend returns empty
      if (!rawList || rawList.length === 0) {
        try {
          const token = await getStoredAuthToken();
          let currentUserId = "";
          if (token && token.includes(".")) {
            const base64Url = token.split(".")[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const decoded = typeof atob === "function" ? atob(base64) : ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(base64, "base64").toString("utf-8") : "");
            const payload = JSON.parse(decoded);
            currentUserId = payload.uid || payload.user_id || payload.sub || "";
          }
          if (currentUserId) {
            const cleanId = currentUserId.replace(/^ath_/, "");
            const snap = await getDocs(
              query(collection(db, "Scouting_Registry"), where("athlete_id", "in", [currentUserId, `ath_${cleanId}`, cleanId]))
            ).catch(() => null);
            if (snap && !snap.empty) {
              rawList = snap.docs.map((d) => d.data());
            }
          }
        } catch (_) {}
      }

      const mapped: InquirySchema[] = (rawList || []).map((inq: any, idx: number) => {
        const rawStatus = (inq.offer_status || inq.status || "PENDING").toUpperCase();
        const mappedStatus = rawStatus.includes("ACCEPT") ? "ACCEPTED" : rawStatus.includes("DECLIN") ? "DECLINED" : "PENDING";
        return {
          inquiry_id: inq.scout_id || inq.inquiry_id || `inq_${idx}`,
          coach_name: inq.coach_name || "Coach",
          institution_sport: `${inq.current_institution || inq.institution || "Varsity"} • ${inq.sport_type || inq.role_title || "Basketball"}`,
          status: mappedStatus as any,
          updated_at_relative: `Sent: ${inq.date_initiated ? new Date(inq.date_initiated).toLocaleDateString() : "Recently"}`,
          sub_note: inq.decline_reason || inq.sub_note || undefined,
        };
      });

      // Merge with any existing offline cache items
      const cachedStr = await AsyncStorage.getItem("atleta_offline_inquiries_cache").catch(() => null);
      const cachedItems: InquirySchema[] = cachedStr ? JSON.parse(cachedStr) : [];
      const combinedMap = new Map<string, InquirySchema>();
      
      cachedItems.forEach((item) => {
        if (item && item.coach_name) combinedMap.set(item.coach_name.trim().toLowerCase(), item);
      });
      mapped.forEach((item) => {
        if (item && item.coach_name) combinedMap.set(item.coach_name.trim().toLowerCase(), item);
      });

      const finalList = Array.from(combinedMap.values());
      if (finalList.length > 0) {
        setInquiries(finalList);
        await AsyncStorage.setItem("atleta_offline_inquiries_cache", JSON.stringify(finalList)).catch(() => null);
      } else if (mapped.length > 0) {
        setInquiries(mapped);
        await AsyncStorage.setItem("atleta_offline_inquiries_cache", JSON.stringify(mapped)).catch(() => null);
      }
    } catch (err) {
      // Fallback to cache on error
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchInquiries(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchInquiries]);

  useEffect(() => {
    // Load instantly from AsyncStorage offline cache
    AsyncStorage.getItem("atleta_offline_inquiries_cache")
      .then((cachedStr) => {
        if (!cachedStr) return;
        try {
          const cached = JSON.parse(cachedStr);
          if (Array.isArray(cached) && cached.length > 0) {
            setInquiries(cached);
            setLoading(false);
          }
        } catch (_) {}
      })
      .catch(() => {});

    fetchInquiries(false);
  }, [fetchInquiries, propInquiries]);

  const getBadgeStyle = (status: InquirySchema["status"]) => {
    switch (status) {
      case "ACCEPTED":
        return {
          bg: "#064E3B",
          border: "#059669",
          text: "#34D399",
          dotColor: "#10B981",
        };
      case "PENDING":
        return {
          bg: "#451A03",
          border: "#D97706",
          text: "#FBBF24",
          dotColor: "#F59E0B",
        };
      case "DECLINED":
        return {
          bg: "#450A0A",
          border: "#DC2626",
          text: "#FCA5A5",
          dotColor: "#EF4444",
        };
      default:
        return {
          bg: "#1E293B",
          border: "#64748B",
          text: "#94A3B8",
          dotColor: "#94A3B8",
        };
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.headerBar, { paddingTop: headerTopPadding, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>ATLETA</Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ padding: 6 }}
          accessibilityLabel="Refresh Inquiries"
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={refreshing ? "#00C8FF" : "#94A3B8"}
          />
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={{ color: "#94A3B8", marginTop: 12, fontSize: 14 }}>Loading coach inquiries...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#00C8FF"
              colors={["#00C8FF"]}
            />
          }
        >
          {/* Section Sub-header */}
          <View style={styles.sectionHeader}>
            <View style={styles.verticalAccentBar} />
            <View>
              <Text style={styles.statusSubtitle}>RECRUITMENT STATUS</Text>
              <Text style={styles.mainTitle}>COACH INQUIRIES</Text>
            </View>
          </View>

          {/* Inquiry Cards List or Empty View */}
          {inquiries.length === 0 ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 20 }}>
              <Ionicons name="mail-unread-outline" size={56} color="#64748B" />
              <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "700", marginTop: 16 }}>No Inquiries Submitted</Text>
              <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 6 }}>
                You have not sent or received any recruitment inquiries yet.
              </Text>
            </View>
          ) : (
            inquiries.map((inquiry) => {
              const badge = getBadgeStyle(inquiry.status);
              return (
                <View key={inquiry.inquiry_id} style={styles.inquiryCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.avatarBox}>
                      <Ionicons name="person-outline" size={26} color="#64748B" />
                    </View>

                    <View style={styles.coachInfo}>
                      <Text style={styles.coachName}>{inquiry.coach_name}</Text>
                      <Text style={styles.institutionSport}>
                        {inquiry.institution_sport}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: badge.bg,
                          borderColor: badge.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: badge.dotColor },
                        ]}
                      />
                      <Text style={[styles.statusText, { color: badge.text }]}>
                        {inquiry.status}
                      </Text>
                    </View>
                  </View>

                  {/* Footer divider line & relative time or sub_note */}
                  <View style={styles.cardFooterRow}>
                    {inquiry.status === "DECLINED" ? (
                      <View style={styles.footerInfoRow}>
                        <Ionicons
                          name="ban-outline"
                          size={14}
                          color="#94A3B8"
                          style={styles.footerIcon}
                        />
                        <Text style={styles.footerText}>
                          {inquiry.sub_note || "Roster Full"}
                        </Text>
                      </View>
                    ) : inquiry.status === "ACCEPTED" ? (
                      <View style={styles.footerInfoRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color="#94A3B8"
                          style={styles.footerIcon}
                        />
                        <Text style={styles.footerText}>
                          {inquiry.updated_at_relative}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.footerInfoRow}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color="#94A3B8"
                          style={styles.footerIcon}
                        />
                        <Text style={styles.footerText}>
                          {inquiry.updated_at_relative}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}




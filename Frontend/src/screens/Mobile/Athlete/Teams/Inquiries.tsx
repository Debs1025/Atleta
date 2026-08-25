import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/Inquiries";
import { InquirySchema } from "./Teams";
import { requestAuthenticatedJson } from "../../Authentication/authShared";

interface InquiriesProps {
  inquiries?: InquirySchema[];
  onBack: () => void;
}

export function InquiriesScreen({ inquiries: propInquiries, onBack }: InquiriesProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;
  const [inquiries, setInquiries] = useState<InquirySchema[]>(propInquiries || []);
  const [loading, setLoading] = useState(!propInquiries);

  useEffect(() => {
    if (propInquiries && propInquiries.length > 0) {
      setInquiries(propInquiries);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchInquiries = async () => {
      try {
        setLoading(true);
        const res: any = await requestAuthenticatedJson("/inquiries").catch(() => null);

        if (isMounted && res) {
          const rawList = res.inquiries || (Array.isArray(res) ? res : []);
          const mapped: InquirySchema[] = rawList.map((inq: any, idx: number) => {
            const rawStatus = (inq.offer_status || "PENDING").toUpperCase();
            const mappedStatus = rawStatus.includes("ACCEPT") ? "ACCEPTED" : rawStatus.includes("DECLIN") ? "DECLINED" : "PENDING";
            return {
              inquiry_id: inq.scout_id || inq.inquiry_id || `inq_${idx}`,
              coach_name: inq.coach_name || "Coach",
              institution_sport: `${inq.current_institution || "Varsity"} • ${inq.sport_type || "Basketball"}`,
              status: mappedStatus as any,
              updated_at_relative: `Sent: ${inq.date_initiated ? new Date(inq.date_initiated).toLocaleDateString() : "Recently"}`,
              sub_note: inq.decline_reason || undefined,
            };
          });
          setInquiries(mapped);
        }
      } catch (err) {
        if (isMounted) setInquiries([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchInquiries();
    return () => {
      isMounted = false;
    };
  }, [propInquiries]);

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
      <View style={[styles.headerBar, { paddingTop: headerTopPadding }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>ATLETA</Text>
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




import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styles from "./styles/Inquiries";
import { InquirySchema } from "./Teams";

interface InquiriesProps {
  inquiries: InquirySchema[];
  onBack: () => void;
}

// API Request: fetch athlete recruitment status & inquiries (GET /api/athlete/inquiries)
export function InquiriesScreen({ inquiries, onBack }: InquiriesProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

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

        {/* Inquiry Cards List */}
        {inquiries.map((inquiry) => {
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
        })}
      </ScrollView>
    </View>
  );
}



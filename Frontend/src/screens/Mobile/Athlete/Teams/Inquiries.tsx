import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { InquirySchema } from "./Teams";

interface InquiriesProps {
  inquiries: InquirySchema[];
  onBack: () => void;
}

export function InquiriesScreen({ inquiries, onBack }: InquiriesProps) {
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
      <View style={styles.headerBar}>
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
    letterSpacing: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  verticalAccentBar: {
    width: 4,
    height: 36,
    backgroundColor: "#38BDF8",
    marginRight: 12,
    borderRadius: 2,
  },
  statusSubtitle: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  mainTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  inquiryCard: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1E293B",
    padding: 16,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  institutionSport: {
    color: "#94A3B8",
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardFooterRow: {
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
    paddingTop: 10,
  },
  footerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerIcon: {
    marginRight: 6,
  },
  footerText: {
    color: "#94A3B8",
    fontSize: 12,
  },
});

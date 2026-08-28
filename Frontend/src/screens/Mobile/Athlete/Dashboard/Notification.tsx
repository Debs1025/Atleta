import React, { useEffect, useState } from "react";
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
import styles from "./styles/Notification";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { requestAuthenticatedJson, requestMultipart } from "../../Authentication/authShared";

export type NotificationType = "RECRUITMENT_INQUIRY" | "ACTION_REQUIRED";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  date_group: string; // e.g. "TODAY"
  timestamp_relative?: string; // e.g. "5h ago"
  read_status: boolean;
  sender?: {
    name: string;
    role_category: string; // e.g. "Basketball Inquiry"
    avatar_url?: string;
  };
  title: string;
  message_body: string;
  highlighted_text?: string; // e.g. "PSA (Birth Certificate)"
  action_label: string; // e.g. "View Inquiry" or "Upload Now"
  target_route?: string;
  inquiry_details?: {
    inquiry_id: string;
    coach_id: string;
    coach_name: string;
    role_title: string;
    team_name: string;
    sport: string;
    message: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED";
    is_sent_by_me?: boolean;
  };
  document_details?: {
    document_name: string;
    required_type: string;
    is_uploaded: boolean;
    file_name?: string;
  };
}

export interface NotificationPageProps {
  onBack: () => void;
  notifications?: NotificationItem[];
  onNotificationsChange?: (items: NotificationItem[]) => void;
  onUploadDocumentSuccess?: (payload: {
    document_name: string;
    required_type: string;
    fileName: string;
    fileUri?: string;
  }) => void;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Just now";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function NotificationPage({
  onBack,
  notifications: externalNotifications,
  onNotificationsChange,
  onUploadDocumentSuccess,
}: NotificationPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  const [notifications, setNotifications] = useState<NotificationItem[]>(
    externalNotifications || []
  );
  const [loading, setLoading] = useState(!externalNotifications);

  // Modal States
  const [selectedInquiryNotif, setSelectedInquiryNotif] =
    useState<NotificationItem | null>(null);
  const [viewCoachDetailNotif, setViewCoachDetailNotif] =
    useState<NotificationItem | null>(null);
  const [selectedDocNotif, setSelectedDocNotif] =
    useState<NotificationItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    mimeType?: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (externalNotifications && externalNotifications.length > 0) {
      setNotifications(externalNotifications);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [notifRes, inqRes]: [any, any] = await Promise.all([
          requestAuthenticatedJson("/notifications").catch(() => null),
          requestAuthenticatedJson("/inquiries").catch(() => null),
        ]);

        if (isMounted) {
          const items: NotificationItem[] = [];

          // Process API notifications
          const apiNotifs = notifRes?.notifications || (Array.isArray(notifRes) ? notifRes : []);
          apiNotifs.forEach((n: any) => {
            const isDocReq = n.type === "DOCUMENT_REQUEST" || n.document_details;
            items.push({
              id: n.id || `notif_${Math.random()}`,
              type: "ACTION_REQUIRED",
              date_group: "TODAY",
              timestamp_relative: formatRelativeTime(n.created_at),
              read_status: n.read_status || false,
              sender: {
                name: n.title || "System Notification",
                role_category: "Notification",
              },
              title: n.title || "Notification",
              message_body: n.message || n.body || "",
              highlighted_text: n.highlighted_text,
              action_label: isDocReq ? "Upload Document" : "View Notification",
              document_details: n.document_details,
            });
          });

          // Process API recruitment inquiries
          const apiInquiries = inqRes?.inquiries || (Array.isArray(inqRes) ? inqRes : []);
          apiInquiries.forEach((inq: any) => {
            const rawStatus = (inq.offer_status || inq.status || "Sent").toUpperCase();
            const mappedStatus = rawStatus.includes("ACCEPT") ? "ACCEPTED" : rawStatus.includes("DECLIN") ? "DECLINED" : "PENDING";
            const coachName = (
              inq.coach_name ||
              inq.coach_full_name ||
              inq.sender_name ||
              inq.sender?.name ||
              inq.coach?.full_name ||
              inq.coach?.name ||
              "Coach"
            ).trim();

            // If the inquiry was sent BY the athlete and is still PENDING, skip showing in Notification inbox
            // (it belongs in the Inquiries Tracker screen, not as an incoming notification asking athlete to accept)
            const isSentByAthlete = inq.initiated_by && (inq.initiated_by === inq.athlete_id || inq.initiated_by !== inq.coach_scout_id);
            if (isSentByAthlete && mappedStatus === "PENDING") {
              return;
            }

            const notifTitle = isSentByAthlete
              ? `Inquiry ${mappedStatus === "ACCEPTED" ? "Accepted" : "Declined"}`
              : "Recruitment Inquiry";
            const notifMessage = isSentByAthlete
              ? `${coachName} has ${mappedStatus.toLowerCase()} your recruitment inquiry.`
              : `${coachName} from ${inq.current_institution || inq.team_name || "Athletic Department"} sent you a recruitment inquiry.`;

            items.push({
              id: inq.scout_id || inq.inquiry_id || inq.id || `inq_${Math.random()}`,
              type: "RECRUITMENT_INQUIRY",
              date_group: "TODAY",
              timestamp_relative: formatRelativeTime(inq.date_initiated || inq.created_at),
              read_status: mappedStatus !== "PENDING",
              sender: {
                name: coachName,
                role_category: `${inq.sport_type || inq.sport_category || "Basketball"} Inquiry`,
              },
              title: notifTitle,
              message_body: notifMessage,
              action_label: isSentByAthlete ? "View Details" : "View Inquiry",
              target_route: "CoachProfile",
              inquiry_details: {
                inquiry_id: inq.scout_id || inq.inquiry_id || inq.id,
                coach_id: inq.coach_scout_id || inq.coach_id || "",
                coach_name: coachName,
                role_title: "Head Coach",
                team_name: inq.current_institution || inq.team_name || inq.organization || "Varsity Team",
                sport: (inq.sport_type || inq.sport_category || "BASKETBALL").toUpperCase(),
                message: inq.offer_message || inq.message || inq.subject || "Recruitment inquiry discussion.",
                status: mappedStatus,
                is_sent_by_me: isSentByAthlete,
              },
            });
          });

          setNotifications(items);
          if (onNotificationsChange) onNotificationsChange(items);
        }
      } catch (err) {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllData();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateFeed = (updated: NotificationItem[]) => {
    setNotifications(updated);
    if (onNotificationsChange) {
      onNotificationsChange(updated);
    }
  };

  const handleMarkAllAsRead = async () => {
    const updated = notifications.map((item) => ({
      ...item,
      read_status: true,
    }));
    updateFeed(updated);
    await requestAuthenticatedJson("/notifications/read-all", "PATCH").catch(() => null);
  };

  const handleCardPress = async (item: NotificationItem) => {
    const updated = notifications.map((n) =>
      n.id === item.id ? { ...n, read_status: true } : n
    );
    updateFeed(updated);

    if (item.id && !item.id.startsWith("inq_")) {
      requestAuthenticatedJson(`/notifications/${item.id}/read`, "PATCH").catch(() => null);
    }

    if (item.type === "RECRUITMENT_INQUIRY") {
      setSelectedInquiryNotif(item);
    } else if (item.type === "ACTION_REQUIRED") {
      setSelectedDocNotif(item);
    }
  };

  const handleAcceptInquiry = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    const inquiryId = target?.inquiry_details?.inquiry_id || id;

    const updated = notifications.map((n) => {
      if (n.id === id && n.inquiry_details) {
        return {
          ...n,
          read_status: true,
          inquiry_details: {
            ...n.inquiry_details,
            status: "ACCEPTED" as const,
          },
        };
      }
      return n;
    });
    updateFeed(updated);

    if (selectedInquiryNotif && selectedInquiryNotif.id === id) {
      setSelectedInquiryNotif({
        ...selectedInquiryNotif,
        read_status: true,
        inquiry_details: selectedInquiryNotif.inquiry_details
          ? { ...selectedInquiryNotif.inquiry_details, status: "ACCEPTED" }
          : undefined,
      });
    }

    try {
      await requestAuthenticatedJson(`/inquiries/${inquiryId}/respond`, "PATCH", { status: "Accepted" }).catch(() =>
        requestAuthenticatedJson(`/inquiries/${inquiryId}/respond`, "PUT", { status: "Accepted" })
      );
      Alert.alert("Inquiry Accepted", "You have accepted the recruitment inquiry!");
    } catch (err: any) {
      Alert.alert("Inquiry Responded", "Your acceptance has been logged.");
    }
  };

  const handleDeclineInquiry = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    const inquiryId = target?.inquiry_details?.inquiry_id || id;

    const updated = notifications.map((n) => {
      if (n.id === id && n.inquiry_details) {
        return {
          ...n,
          read_status: true,
          inquiry_details: {
            ...n.inquiry_details,
            status: "DECLINED" as const,
          },
        };
      }
      return n;
    });
    updateFeed(updated);

    if (selectedInquiryNotif && selectedInquiryNotif.id === id) {
      setSelectedInquiryNotif({
        ...selectedInquiryNotif,
        read_status: true,
        inquiry_details: selectedInquiryNotif.inquiry_details
          ? { ...selectedInquiryNotif.inquiry_details, status: "DECLINED" }
          : undefined,
      });
    }

    try {
      await requestAuthenticatedJson(`/inquiries/${inquiryId}/respond`, "PATCH", { status: "Declined" }).catch(() =>
        requestAuthenticatedJson(`/inquiries/${inquiryId}/respond`, "PUT", { status: "Declined" })
      );
      Alert.alert("Inquiry Declined", "You have declined the recruitment inquiry.");
    } catch (err: any) {
      Alert.alert("Inquiry Responded", "Your decision has been logged.");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType || undefined,
        });
      }
    } catch (err) {
      console.log("Error selecting document:", err);
    }
  };

  const handleSubmitDocument = async () => {
    if (!selectedDocNotif) return;
    if (!selectedFile) {
      Alert.alert("No File Chosen", "Please pick a document file before submitting.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("document", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType || "application/pdf",
      } as any);
      formData.append("document_type", selectedDocNotif.document_details?.required_type || "ELIGIBILITY");

      await requestMultipart("/athletes/documents", formData).catch(() => null);

      const updated = notifications.map((n) => {
        if (n.id === selectedDocNotif.id) {
          return {
            ...n,
            read_status: true,
            title: "Document Submitted",
            message_body: `Submitted ${selectedFile.name} for verification.`,
            document_details: n.document_details
              ? {
                ...n.document_details,
                is_uploaded: true,
                file_name: selectedFile.name,
              }
              : undefined,
          };
        }
        return n;
      });
      updateFeed(updated);

      if (onUploadDocumentSuccess) {
        onUploadDocumentSuccess({
          document_name:
            selectedDocNotif.highlighted_text ||
            selectedDocNotif.document_details?.document_name ||
            "Eligibility Document",
          required_type:
            selectedDocNotif.document_details?.required_type ||
            "BIRTH_CERTIFICATE",
          fileName: selectedFile.name,
          fileUri: selectedFile.uri,
        });
      }

      Alert.alert(
        "Upload Successful",
        `${selectedFile.name} has been submitted successfully!`
      );
    } catch (err: any) {
      Alert.alert("Upload Error", err?.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
      setSelectedDocNotif(null);
      setSelectedFile(null);
    }
  };

  const renderBodyWithHighlight = (item: NotificationItem) => {
    if (!item.highlighted_text || !item.message_body.includes(item.highlighted_text)) {
      return <Text style={styles.cardBodyText}>{item.message_body}</Text>;
    }

    const parts = item.message_body.split(item.highlighted_text);
    return (
      <Text style={styles.cardBodyText}>
        {parts[0]}
        <Text
          style={styles.highlightedText}
          onPress={() => handleCardPress(item)}
        >
          {item.highlighted_text}
        </Text>
        {parts[1]}
      </Text>
    );
  };

  const unreadCount = notifications.filter((n) => !n.read_status).length;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={[styles.topHeaderBar, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerLeftContainer}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        </View>

        {unreadCount > 0 && (
          <Pressable style={styles.markReadButton} onPress={handleMarkAllAsRead}>
            <Text style={styles.markReadText}>Mark all as read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#38BDF8" />
          <Text style={{ color: "#94A3B8", marginTop: 12, fontSize: 14 }}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            notifications.length === 0 && { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingBottom: 80 },
          ]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
        >
          {notifications.length === 0 ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
              <Ionicons name="notifications-off-outline" size={56} color="#64748B" />
              <Text style={{ color: "#F8FAFC", fontSize: 16, fontWeight: "700", marginTop: 16 }}>No Notifications</Text>
              <Text style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", marginTop: 6 }}>
                You have no active alerts or pending recruitment inquiries.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.dateGroupHeader}>
                <Text style={styles.dateGroupText}>• TODAY</Text>
              </View>

              {notifications.map((item) => {
                const isUnread = !item.read_status;

                if (item.type === "RECRUITMENT_INQUIRY") {
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.cardContainer,
                        isUnread && styles.cardContainerUnread,
                      ]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.avatarContainer}>
                          <Image
                            source={require("../../../../assets/profile.png")}
                            style={styles.avatarImage}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={styles.headerTextContainer}>
                          <Text style={styles.senderName}>
                            {item.sender?.name || "Coach"}
                          </Text>
                          <Text style={styles.senderSubtitle}>
                            {item.sender?.role_category || "Inquiry"}
                          </Text>
                        </View>
                        {item.timestamp_relative && (
                          <Text style={styles.timestampText}>
                            {item.timestamp_relative}
                          </Text>
                        )}
                      </View>

                      <View style={styles.cardBodyContainer}>
                        <Text style={styles.cardBodyText}>{item.message_body}</Text>
                      </View>

                      <Pressable
                        style={styles.inquiryActionButton}
                        onPress={() => handleCardPress(item)}
                      >
                        <Text style={styles.inquiryActionText}>
                          {item.inquiry_details?.status === "ACCEPTED"
                            ? "Inquiry Accepted ✓"
                            : item.inquiry_details?.status === "DECLINED"
                              ? "Inquiry Declined"
                              : item.action_label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                }

                if (item.type === "ACTION_REQUIRED") {
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.cardContainer,
                        isUnread && styles.cardContainerUnread,
                      ]}
                    >
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.actionIconContainer}>
                          <Image
                            source={require("../../../../assets/actionreq.png")}
                            style={styles.actionIconImage}
                            resizeMode="contain"
                          />
                        </View>
                        <View style={styles.headerTextContainer}>
                          <Text style={styles.actionRequiredTitle}>{item.title}</Text>
                        </View>
                        {item.timestamp_relative && (
                          <Text style={styles.timestampText}>
                            {item.timestamp_relative}
                          </Text>
                        )}
                      </View>

                      <View style={styles.cardBodyContainer}>
                        {renderBodyWithHighlight(item)}
                      </View>

                      <Pressable
                        style={styles.actionLinkRow}
                        onPress={() => handleCardPress(item)}
                      >
                        <Text style={styles.actionLinkText}>
                          {item.document_details?.is_uploaded
                            ? "Document Uploaded ✓"
                            : item.action_label}
                        </Text>
                        {!item.document_details?.is_uploaded && (
                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color="#7DD3FC"
                            style={{ marginLeft: 4 }}
                          />
                        )}
                      </Pressable>
                    </View>
                  );
                }

                return null;
              })}
            </>
          )}
        </ScrollView>
      )}

      {/* MODAL 1: VIEW RECRUITMENT INQUIRY */}
      <Modal
        visible={!!selectedInquiryNotif}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedInquiryNotif(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>RECRUITMENT INQUIRY</Text>
              <Pressable onPress={() => setSelectedInquiryNotif(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>

            {selectedInquiryNotif && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalCoachProfile}>
                  <Image
                    source={require("../../../../assets/profile.png")}
                    style={styles.modalAvatar}
                  />
                  <Text style={styles.modalCoachName}>
                    {selectedInquiryNotif.inquiry_details?.coach_name || selectedInquiryNotif.sender?.name || "Coach"}
                  </Text>
                  <Text style={styles.modalCoachRole}>
                    {selectedInquiryNotif.inquiry_details?.role_title || "Head Coach"}{" "}
                    • {selectedInquiryNotif.inquiry_details?.team_name || "Varsity Team"}
                  </Text>
                  <Text style={styles.modalSportTag}>
                    {selectedInquiryNotif.inquiry_details?.sport || "BASKETBALL"}
                  </Text>

                  <Pressable
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(56, 189, 248, 0.15)",
                      borderColor: "#38BDF8",
                      borderWidth: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 20,
                      marginTop: 12,
                    }}
                    onPress={() => setViewCoachDetailNotif(selectedInquiryNotif)}
                  >
                    <Ionicons name="person-circle-outline" size={18} color="#38BDF8" style={{ marginRight: 6 }} />
                    <Text style={{ color: "#38BDF8", fontSize: 13, fontWeight: "700" }}>VIEW COACH DETAILS</Text>
                  </Pressable>
                </View>

                <View style={styles.modalMessageBox}>
                  <Text style={styles.modalMessageHeader}>MESSAGE FROM COACH:</Text>
                  <Text style={styles.modalMessageText}>
                    {selectedInquiryNotif.inquiry_details?.message}
                  </Text>
                </View>

                {selectedInquiryNotif.inquiry_details?.status === "PENDING" ? (
                  <View style={styles.decisionButtonContainer}>
                    <Pressable
                      style={styles.acceptButton}
                      onPress={() =>
                        handleAcceptInquiry(selectedInquiryNotif.id)
                      }
                    >
                      <Text style={styles.acceptButtonText}>ACCEPT INQUIRY</Text>
                    </Pressable>
                    <Pressable
                      style={styles.declineButton}
                      onPress={() =>
                        handleDeclineInquiry(selectedInquiryNotif.id)
                      }
                    >
                      <Text style={styles.declineButtonText}>DECLINE</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.statusBadgeContainer}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        selectedInquiryNotif.inquiry_details?.status === "ACCEPTED"
                          ? { color: "#34D399" }
                          : { color: "#F87171" },
                      ]}
                    >
                      {selectedInquiryNotif.inquiry_details?.status === "ACCEPTED"
                        ? "INQUIRY ACCEPTED ✓"
                        : "INQUIRY DECLINED"}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 1B: VIEW COACH PROFILE DETAILS */}
      <Modal
        visible={!!viewCoachDetailNotif}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setViewCoachDetailNotif(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>COACH PROFILE</Text>
              <Pressable onPress={() => setViewCoachDetailNotif(null)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>

            {viewCoachDetailNotif && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
                <View style={[styles.modalCoachProfile, { marginBottom: 16 }]}>
                  <Image
                    source={require("../../../../assets/profile.png")}
                    style={[styles.modalAvatar, { width: 72, height: 72, borderRadius: 36 }]}
                  />
                  <Text style={[styles.modalCoachName, { fontSize: 20, marginTop: 8 }]}>
                    {viewCoachDetailNotif.inquiry_details?.coach_name || viewCoachDetailNotif.sender?.name || "Coach"}
                  </Text>
                  <Text style={[styles.modalCoachRole, { color: "#38BDF8", fontWeight: "700" }]}>
                    {viewCoachDetailNotif.inquiry_details?.role_title || "Head Coach"}
                  </Text>
                  <Text style={{ color: "#94A3B8", fontSize: 13, marginTop: 2 }}>
                    {viewCoachDetailNotif.inquiry_details?.team_name || "Varsity Athletics Program"}
                  </Text>
                </View>

                <View style={{ backgroundColor: "#0F172A", padding: 14, borderRadius: 12, marginBottom: 12 }}>
                  <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>
                    SPORT & PROGRAM
                  </Text>
                  <Text style={{ color: "#F8FAFC", fontSize: 14, fontWeight: "600" }}>
                    {viewCoachDetailNotif.inquiry_details?.sport || "BASKETBALL"}
                  </Text>
                </View>

                <View style={{ backgroundColor: "#0F172A", padding: 14, borderRadius: 12, marginBottom: 16 }}>
                  <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700", marginBottom: 6 }}>
                    RECRUITMENT INQUIRY NOTE
                  </Text>
                  <Text style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 18 }}>
                    {viewCoachDetailNotif.inquiry_details?.message || "Active recruitment inquiry sent to your profile."}
                  </Text>
                </View>

                <Pressable
                  style={{
                    backgroundColor: "#38BDF8",
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                  }}
                  onPress={() => setViewCoachDetailNotif(null)}
                >
                  <Text style={{ color: "#0F172A", fontSize: 14, fontWeight: "800" }}>BACK TO INQUIRY</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: UPLOAD DOCUMENT */}
      <Modal
        visible={!!selectedDocNotif}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setSelectedDocNotif(null);
          setSelectedFile(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>UPLOAD REQUIRED DOCUMENT</Text>
              <Pressable
                onPress={() => {
                  setSelectedDocNotif(null);
                  setSelectedFile(null);
                }}
              >
                <Ionicons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>

            {selectedDocNotif && (
              <View style={{ paddingTop: 10 }}>
                <Text style={styles.uploadSubLabel}>Document Requested:</Text>
                <Text style={styles.uploadDocName}>
                  {selectedDocNotif.highlighted_text ||
                    selectedDocNotif.document_details?.document_name ||
                    "Eligibility Document"}
                </Text>

                <Pressable
                  style={styles.filePickerBox}
                  onPress={handlePickDocument}
                >
                  <Ionicons name="cloud-upload-outline" size={36} color="#38BDF8" />
                  <Text style={styles.filePickerTitle}>
                    {selectedFile ? selectedFile.name : "Tap to select document"}
                  </Text>
                  <Text style={styles.filePickerSub}>
                    {selectedFile
                      ? "File selected from device"
                      : "PDF, PNG, JPG (Max 10MB)"}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.submitUploadButton,
                    (!selectedFile || isUploading) && { opacity: 0.5 },
                  ]}
                  disabled={!selectedFile || isUploading}
                  onPress={handleSubmitDocument}
                >
                  <Text style={styles.submitUploadText}>
                    {isUploading ? "UPLOADING..." : "SUBMIT DOCUMENT"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default NotificationPage;



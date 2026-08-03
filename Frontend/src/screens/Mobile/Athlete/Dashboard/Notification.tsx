import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

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
  action_label: string; // e.g. "View Inquiry" or "Upload Now "
  target_route?: string;
  inquiry_details?: {
    coach_id: string;
    coach_name: string;
    role_title: string;
    team_name: string;
    sport: string;
    message: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED";
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

//sample notification from coach
const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif_001",
    type: "RECRUITMENT_INQUIRY",
    date_group: "TODAY",
    timestamp_relative: "2h ago",
    read_status: false,
    sender: {
      name: "Coach Marcus Sterling",
      role_category: "Basketball Inquiry",
    },
    title: "Recruitment Inquiry",
    message_body:
      "Coach Marcus Sterling from Camarines Sur Lakers sent you a recruitment inquiry for the upcoming Season 2026.",
    action_label: "View Inquiry",
    target_route: "CoachProfile",
    inquiry_details: {
      coach_id: "coach_01",
      coach_name: "Coach Marcus Sterling",
      role_title: "Head Coach",
      team_name: "Camarines Sur Lakers",
      sport: "BASKETBALL",
      message:
        "We have been following your impressive statistics this season! Our coaching staff would love to invite you for an official recruitment discussion and tryouts for our roster.",
      status: "PENDING",
    },
  },
  {
    id: "notif_002",
    type: "ACTION_REQUIRED",
    date_group: "TODAY",
    timestamp_relative: "5h ago",
    read_status: false,
    title: "Action Required",
    message_body:
      "Head Coach requested your updated PSA (Birth Certificate) for division verification.",
    highlighted_text: "PSA (Birth Certificate)",
    action_label: "Upload Now ->",
    target_route: "UploadDocument",
    document_details: {
      document_name: "PSA (Birth Certificate)",
      required_type: "BIRTH_CERTIFICATE",
      is_uploaded: false,
    },
  },
];

export function NotificationPage({
  onBack,
  notifications: externalNotifications,
  onNotificationsChange,
  onUploadDocumentSuccess,
}: NotificationPageProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top + 10, 52);

  const [notifications, setNotifications] = useState<NotificationItem[]>(
    externalNotifications || INITIAL_NOTIFICATIONS
  );

  // Modal States
  const [selectedInquiryNotif, setSelectedInquiryNotif] =
    useState<NotificationItem | null>(null);
  const [selectedDocNotif, setSelectedDocNotif] =
    useState<NotificationItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const updateFeed = (updated: NotificationItem[]) => {
    setNotifications(updated);
    if (onNotificationsChange) {
      onNotificationsChange(updated);
    }
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map((item) => ({
      ...item,
      read_status: true,
    }));
    updateFeed(updated);
  };

  const handleCardPress = (item: NotificationItem) => {
    // Mark as read when clicked
    const updated = notifications.map((n) =>
      n.id === item.id ? { ...n, read_status: true } : n
    );
    updateFeed(updated);

    if (item.type === "RECRUITMENT_INQUIRY") {
      setSelectedInquiryNotif(item);
    } else if (item.type === "ACTION_REQUIRED") {
      setSelectedDocNotif(item);
    }
  };

  const handleAcceptInquiry = (id: string) => {
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
    Alert.alert("Inquiry Accepted", "You have accepted the recruitment inquiry!");
  };

  const handleDeclineInquiry = (id: string) => {
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
    Alert.alert("Inquiry Declined", "You have declined the recruitment inquiry.");
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
        });
      }
    } catch (err) {
      console.log("Error selecting document:", err);
    }
  };

  const handleSubmitDocument = () => {
    if (!selectedDocNotif) return;
    if (!selectedFile) {
      Alert.alert("No File Chosen", "Please pick a document file before submitting.");
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      const updated = notifications.map((n) => {
        if (n.id === selectedDocNotif.id) {
          return {
            ...n,
            read_status: true,
            title: "Document Submitted",
            message_body: `Submitted ${selectedFile.name} for ${n.highlighted_text || "verification"}.`,
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
            "PSA (Birth Certificate)",
          required_type:
            selectedDocNotif.document_details?.required_type ||
            "BIRTH_CERTIFICATE",
          fileName: selectedFile.name,
          fileUri: selectedFile.uri,
        });
      }

      Alert.alert(
        "Upload Successful",
        `${selectedFile.name} has been uploaded to your coach!`
      );
      setSelectedDocNotif(null);
      setSelectedFile(null);
    }, 800);
  };

  // Helper to render body text with inline highlighted text
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

      {/* 2. HEADER & NAVIGATION LAYOUT */}
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

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
      >
        {/* Date Grouping Label */}
        <View style={styles.dateGroupHeader}>
          <Text style={styles.dateGroupText}>• TODAY</Text>
        </View>

        {/* 3. NOTIFICATION CARDS REPLICATION */}
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
                {/* Header Row */}
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

                {/* Body Text */}
                <View style={styles.cardBodyContainer}>
                  <Text style={styles.cardBodyText}>{item.message_body}</Text>
                </View>

                {/* Action Button */}
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
                {/* Header Row */}
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

                {/* Body Text with Dynamic Highlight */}
                <View style={styles.cardBodyContainer}>
                  {renderBodyWithHighlight(item)}
                </View>

                {/* Action Link */}
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
      </ScrollView>

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
                    {selectedInquiryNotif.sender?.name}
                  </Text>
                  <Text style={styles.modalCoachRole}>
                    {selectedInquiryNotif.inquiry_details?.role_title || "Head Coach"}{" "}
                    • {selectedInquiryNotif.inquiry_details?.team_name || "Lakers"}
                  </Text>
                  <Text style={styles.modalSportTag}>
                    {selectedInquiryNotif.inquiry_details?.sport || "BASKETBALL"}
                  </Text>
                </View>

                <View style={styles.modalMessageBox}>
                  <Text style={styles.modalMessageHeader}>MESSAGE FROM COACH:</Text>
                  <Text style={styles.modalMessageText}>
                    {selectedInquiryNotif.inquiry_details?.message}
                  </Text>
                </View>

                {/* Status or Decision Buttons */}
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
                    selectedDocNotif.document_details?.document_name}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
  },

  /* HEADER LAYOUT */
  topHeaderBar: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#0B132B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerLeftContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 14,
    padding: 2,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
  markReadButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },

  /* SCROLL FEED */
  scrollContainer: {
    flex: 1,
    backgroundColor: "#0B132B",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  dateGroupHeader: {
    marginTop: 18,
    marginBottom: 12,
  },
  dateGroupText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /* CARD LAYOUTS */
  cardContainer: {
    backgroundColor: "#111C35",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  cardContainerUnread: {
    borderColor: "#38BDF8",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
    backgroundColor: "#1E293B",
    marginRight: 12,
  },
  avatarImage: {
    width: 42,
    height: 42,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0D1B2A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  actionIconImage: {
    width: 24,
    height: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  senderName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  senderSubtitle: {
    color: "#7DD3FC",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  actionRequiredTitle: {
    color: "#7DD3FC",
    fontSize: 16,
    fontWeight: "800",
  },
  timestampText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  cardBodyContainer: {
    marginBottom: 14,
  },
  cardBodyText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
  },
  highlightedText: {
    color: "#7DD3FC",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  inquiryActionButton: {
    backgroundColor: "#93C5FD",
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inquiryActionText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  actionLinkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionLinkText: {
    color: "#7DD3FC",
    fontSize: 14,
    fontWeight: "800",
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#111C35",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  modalCoachProfile: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
  },
  modalCoachName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  modalCoachRole: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 2,
  },
  modalSportTag: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 6,
    backgroundColor: "#0D1B2A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalMessageBox: {
    backgroundColor: "#080F21",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  modalMessageHeader: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalMessageText: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 20,
  },
  decisionButtonContainer: {
    gap: 10,
  },
  acceptButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  acceptButtonText: {
    color: "#080F21",
    fontSize: 14,
    fontWeight: "900",
  },
  declineButton: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  declineButtonText: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "800",
  },
  statusBadgeContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  /* UPLOAD MODAL STYLES */
  uploadSubLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  uploadDocName: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 16,
  },
  filePickerBox: {
    backgroundColor: "#080F21",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  filePickerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10,
  },
  filePickerSub: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
  },
  submitUploadButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitUploadText: {
    color: "#080F21",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});

import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { requestAuthenticatedJson } from "../../Authentication/authShared";
import styles from "./styles/CoachEditProfile";
import { CoachProfileState, DEFAULT_COACH_PROFILE, UploadedDocument, CredentialItem } from "../DataTypes";

const SPORT_OPTIONS: CoachProfileState["sports_focus"][] = [
  "BASKETBALL",
  "SWIMMING",
  "TRACK AND FIELD",
];

export interface CoachEditProfileProps {
  onBack: () => void;
  profileData?: CoachProfileState;
  onSave?: (updatedProfile: CoachProfileState) => void;
}

// API Request: update coach profile details (PUT /api/coach/profile)
export function CoachEditProfile({
  onBack,
  profileData,
  onSave,
}: CoachEditProfileProps) {
  const insets = useSafeAreaInsets();
  const currentProfile = profileData || DEFAULT_COACH_PROFILE;

  const [showSportDropdown, setShowSportDropdown] = useState(false);

  // Form State
  const [form, setForm] = useState({
    full_name: currentProfile.full_name,
    email: currentProfile.email,
    sports_focus: currentProfile.sports_focus,
  });

  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentProfile.avatar_url);

  const [documents, setDocuments] = useState<UploadedDocument[]>(
    currentProfile.uploaded_documents || []
  );

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocName, setEditingDocName] = useState<string>("");

  useEffect(() => {
    setForm({
      full_name: currentProfile.full_name,
      email: currentProfile.email,
      sports_focus: currentProfile.sports_focus,
    });
    setAvatarUri(currentProfile.avatar_url);
    setDocuments(currentProfile.uploaded_documents || []);
  }, [currentProfile]);

  const handleRenameDocument = (docId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;

        // Preserve file extension if present in original file_name
        const originalExt = d.file_name.includes(".")
          ? "." + d.file_name.split(".").pop()
          : "";

        let finalFileName = trimmed;
        if (originalExt && !trimmed.toLowerCase().endsWith(originalExt.toLowerCase())) {
          finalFileName = `${trimmed}${originalExt}`;
        }

        return {
          ...d,
          file_name: finalFileName,
          file_type: d.file_type, // Strictly preserve original file_type (PDF / JPG / PNG)
        };
      })
    );
  };

  // API Request: upload coach profile image (POST /api/coach/avatar/upload)
  const handlePickAvatarImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        setAvatarUri(pickedAsset.uri);
      }
    } catch {
      Alert.alert("Image Error", "Failed to select profile image.");
    }
  };

  // Credentials Document Upload Handler
  // API Request: upload credential document (POST /api/coach/documents/upload)
  const handleUploadCertification = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        const fileExt = pickedAsset.name.split(".").pop()?.toUpperCase() || "PDF";
        const fileType: UploadedDocument["file_type"] =
          fileExt === "JPG" || fileExt === "JPEG"
            ? "JPG"
            : fileExt === "PNG"
              ? "PNG"
              : "PDF";

        const newDoc: UploadedDocument = {
          id: `doc_${Date.now()}`,
          file_name: pickedAsset.name,
          file_type: fileType,
          file_url: pickedAsset.uri,
        };

        setDocuments((prev) => [...prev, newDoc]);
        Alert.alert("Success", `Uploaded certification document: ${pickedAsset.name}`);
      }
    } catch {
      Alert.alert("Upload Error", "Failed to select document. Please try again.");
    }
  };

  // Delete Document Handler
  const handleDeleteDocument = (docId: string, fileName: string) => {
    Alert.alert(
      "Remove Certification",
      `Are you sure you want to remove "${fileName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDocuments((prev) => prev.filter((d) => d.id !== docId));
          },
        },
      ]
    );
  };

  // Submit Action Handler
  // API Request: save coach profile changes (PUT /api/coach/profile)
  const handleSaveChanges = async () => {
    if (!form.full_name.trim()) {
      Alert.alert("Validation Error", "Full Name cannot be empty.");
      return;
    }
    if (!form.email.trim()) {
      Alert.alert("Validation Error", "Email Address cannot be empty.");
      return;
    }

    const todayFormatted = new Date()
      .toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
      .toUpperCase();

    const nameParts = form.full_name.trim().split(/\s+/);
    let firstName = currentProfile.first_name || "";
    let lastName = currentProfile.last_name || "";

    if (nameParts.length === 1) {
      firstName = nameParts[0];
      lastName = "";
    } else if (nameParts.length > 1) {
      // The last word is the surname/last name (e.g., "Pelonio")
      // All preceding words form the first name (e.g., "Gerard Francis")
      firstName = nameParts.slice(0, -1).join(" ");
      lastName = nameParts[nameParts.length - 1];
    }
    const updatedRoleTitle = `${form.sports_focus} COACH`;

    const docCredentials: CredentialItem[] = documents.map((doc) => ({
      id: doc.id,
      title: doc.file_name.replace(/\.[^/.]+$/, ""),
      type: "certified",
      icon_name: "shield-check",
    }));

    const nonDocCredentials = (currentProfile.credentials || []).filter(
      (c) => !c.id.startsWith("doc_")
    );

    const updatedProfile: CoachProfileState = {
      ...currentProfile,
      first_name: firstName,
      last_name: lastName,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      sports_focus: form.sports_focus,
      role_title: updatedRoleTitle,
      avatar_url: avatarUri,
      credentials: [...nonDocCredentials, ...docCredentials],
      uploaded_documents: documents,
      last_updated: todayFormatted,
    };

    const canonicalSportType =
      form.sports_focus === "TRACK AND FIELD"
        ? "Track and Field"
        : form.sports_focus === "SWIMMING"
        ? "Swimming"
        : "Basketball";

    const patchPayload = {
      first_name: firstName,
      last_name: lastName,
      full_name: form.full_name.trim(),
      sport_type: canonicalSportType,
      sports_focus: form.sports_focus,
      email: form.email.trim(),
      avatar_url: avatarUri,
      uploaded_documents: documents,
      professional_documents: documents.map((d) => d.file_name),
      credentials: [...nonDocCredentials, ...docCredentials],
    };

    try {
      await requestAuthenticatedJson("/coaches/me/profile", "PATCH", patchPayload).catch(async () => {
        // Fallback to /coaches/profile
        return await requestAuthenticatedJson("/coaches/profile", "PATCH", patchPayload);
      });

      if (onSave) {
        onSave(updatedProfile);
      }

      Alert.alert("Profile Updated", "Your coach profile changes have been saved successfully.", [
        {
          text: "OK",
          onPress: () => onBack(),
        },
      ]);
    } catch (err: any) {
      console.warn("Coach profile sync error:", err);
      Alert.alert("Update Failed", err?.message || "Could not save profile changes to the server.");
    }
  };

  const headerTopPadding = Math.max(insets.top, 44) + 38;

  return (
    <View style={styles.container}>
      {/* TOP HEADER */}
      <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.8}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>EDIT PROFILE</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 64, paddingBottom: 50 },
        ]}
      >
        {/* AVATAR PREVIEW HEADER */}
        <View style={styles.avatarPreviewSection}>
          <TouchableOpacity
            style={styles.avatarCircleFrame}
            onPress={handlePickAvatarImage}
            activeOpacity={0.8}
            accessibilityLabel="Upload Profile Picture"
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarCircleImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="camera-outline" size={36} color="#00C8FF" />
            )}
          </TouchableOpacity>
          <Text style={styles.avatarCaption}>TAP CIRCLE TO UPLOAD AVATAR</Text>
        </View>

        {/* FORM INPUT FIELDS */}

        {/* FULL NAME */}
        <View style={styles.formFieldContainer}>
          <Text style={styles.inputLabel}>FULL NAME</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={form.full_name}
              onChangeText={(text) => setForm((prev) => ({ ...prev, full_name: text }))}
              placeholder="Enter Full Name"
              placeholderTextColor="#64748B"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* EMAIL ADDRESS */}
        <View style={styles.formFieldContainer}>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={form.email}
              onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
              placeholder="Enter Email Address"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* SPORT CATEGORY */}
        <View style={styles.formFieldContainer}>
          <Text style={styles.inputLabel}>SPORT CATEGORY</Text>
          <TouchableOpacity
            style={styles.selectWrapper}
            onPress={() => setShowSportDropdown((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectValueText}>{form.sports_focus}</Text>
            <Ionicons
              name={showSportDropdown ? "chevron-up" : "chevron-down"}
              size={18}
              color="#94A3B8"
            />
          </TouchableOpacity>

          {/* Dropdown Options */}
          {showSportDropdown && (
            <View style={styles.dropdownMenuCard}>
              {SPORT_OPTIONS.map((sport) => {
                const isSelected = form.sports_focus === sport;
                return (
                  <TouchableOpacity
                    key={sport}
                    style={styles.dropdownItemRow}
                    onPress={() => {
                      setForm((prev) => ({ ...prev, sports_focus: sport }));
                      setShowSportDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemActiveText,
                      ]}
                    >
                      {sport}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* CREDENTIALS UPLOADER BOX */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.inputLabel}>CREDENTIALS</Text>
          <TouchableOpacity
            style={styles.uploaderCard}
            onPress={handleUploadCertification}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={40} color="#00C8FF" />
            <Text style={styles.uploadActionText}>
              UPLOAD CERTIFICATION (PDF, JPG)
            </Text>
          </TouchableOpacity>
        </View>

        {/* UPLOADED CREDENTIALS LIST */}
        <View style={styles.uploadedListContainer}>
          <Text style={styles.uploadedSubLabel}>UPLOADED CREDENTIALS</Text>

          {documents.length === 0 ? (
            <View style={[styles.uploadedDocRow, { justifyContent: "center" }]}>
              <Text style={[styles.uploadedDocName, { color: "#64748B", textAlign: "center" }]}>
                No documents uploaded yet.
              </Text>
            </View>
          ) : (
            documents.map((doc) => {
              const isEditingThis = editingDocId === doc.id;
              return (
                <View key={doc.id} style={styles.uploadedDocRow}>
                  <View style={styles.uploadedDocLeft}>
                    <Ionicons name="document-text-outline" size={20} color="#00C8FF" />
                    {isEditingThis ? (
                      <TextInput
                        style={styles.inlineEditInput}
                        value={editingDocName}
                        onChangeText={setEditingDocName}
                        autoFocus
                        onSubmitEditing={() => {
                          if (editingDocName.trim()) {
                            handleRenameDocument(doc.id, editingDocName.trim());
                          }
                          setEditingDocId(null);
                        }}
                      />
                    ) : (
                      <Text style={styles.uploadedDocName} numberOfLines={1}>
                        {doc.file_name}
                      </Text>
                    )}
                  </View>

                  <View style={styles.uploadedDocActions}>
                    {isEditingThis ? (
                      <TouchableOpacity
                        style={styles.saveDocNameBtn}
                        onPress={() => {
                          if (editingDocName.trim()) {
                            handleRenameDocument(doc.id, editingDocName.trim());
                          }
                          setEditingDocId(null);
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel="Save document name"
                      >
                        <Ionicons name="checkmark" size={18} color="#00C8FF" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.editDocNameBtn}
                        onPress={() => {
                          setEditingDocId(doc.id);
                          setEditingDocName(doc.file_name);
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel={`Edit document name ${doc.file_name}`}
                      >
                        <Ionicons name="pencil-outline" size={18} color="#00C8FF" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.trashIconButton}
                      onPress={() => handleDeleteDocument(doc.id, doc.file_name)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Delete document ${doc.file_name}`}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* SUBMIT ACTION BUTTON */}
        <TouchableOpacity
          style={styles.saveSubmitBtn}
          onPress={handleSaveChanges}
          activeOpacity={0.85}
        >
          <Text style={styles.saveSubmitText}>SAVE CHANGES</Text>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* FOOTER TEXT */}
        <Text style={styles.footerUpdatedText}>
          LAST UPDATED: {currentProfile.last_updated || "OCT 24, 2023"}
        </Text>
      </ScrollView>
    </View>
  );
}

export default CoachEditProfile;

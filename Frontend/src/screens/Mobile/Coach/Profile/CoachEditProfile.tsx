import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, setDoc } from "firebase/firestore";
import { requestAuthenticatedJson, getStoredAuthToken } from "../../Authentication/authShared";
import styles from "./styles/CoachEditProfile";
import { CoachProfileState, DEFAULT_COACH_PROFILE, UploadedDocument, CredentialItem } from "../DataTypes";
import { getSportsOfflineFirst, db } from "../../../../services/firebaseClient";

function safeBase64Decode(str: string): string {
  if (typeof (globalThis as any).atob === "function") {
    try {
      return (globalThis as any).atob(str);
    } catch (_) {}
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  const cleaned = String(str).replace(/=+$/, "");
  let bc = 0;
  let bs = 0;
  for (let idx = 0; idx < cleaned.length; idx++) {
    const char = cleaned.charAt(idx);
    const charIndex = chars.indexOf(char);
    if (charIndex === -1) continue;
    bs = bc % 4 ? bs * 64 + charIndex : charIndex;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

const DEFAULT_SPORT_OPTIONS: CoachProfileState["sports_focus"][] = [
  "BASKETBALL",
  "SWIMMING",
  "TRACK AND FIELD",
];

export interface CoachEditProfileProps {
  onBack: () => void;
  profileData?: CoachProfileState;
  onSave?: (updatedProfile: CoachProfileState) => void;
}

function normalizeUploadedDocs(rawDocs: any[]): UploadedDocument[] {
  if (!Array.isArray(rawDocs)) return [];
  return rawDocs.map((d: any, idx: number) => {
    if (typeof d === "string") {
      const ext = d.includes(".") ? d.split(".").pop()?.toUpperCase() : "PDF";
      return {
        id: `doc_${idx}_${Date.now()}`,
        file_name: d,
        file_type: (ext === "PDF" || ext === "PNG" || ext === "JPG") ? ext : "PDF",
        file_url: d,
      };
    }
    const fileName = String(d.file_name || d.name || d.title || d.document_name || `Credential_${idx + 1}.pdf`);
    const ext = fileName.includes(".") ? fileName.split(".").pop()?.toUpperCase() : "PDF";
    return {
      id: String(d.id || d.doc_id || `doc_${idx}_${Date.now()}`),
      file_name: fileName,
      file_type: (d.file_type || (ext === "PDF" || ext === "PNG" || ext === "JPG" ? ext : "PDF")) as any,
      file_url: d.file_url || d.url || "",
    };
  });
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
  const [sportOptions, setSportOptions] = useState<CoachProfileState["sports_focus"][]>(DEFAULT_SPORT_OPTIONS);

  useEffect(() => {
    let isMounted = true;
    getSportsOfflineFirst()
      .then((sports: any) => {
        if (!isMounted || !Array.isArray(sports) || sports.length === 0) return;
        const seen = new Set<string>();
        const mapped: CoachProfileState["sports_focus"][] = [];
        sports.forEach((s: any) => {
          const raw = String(s.sport_name || s.name || s.id || '').trim().toUpperCase();
          if (!raw || seen.has(raw)) return;
          seen.add(raw);
          mapped.push(raw);
        });
        if (mapped.length > 0) {
          setSportOptions(mapped);
        }
      })
      .catch((err: any) => console.warn('Could not fetch dynamic sports for coach profile edit:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Form State
  const [form, setForm] = useState({
    full_name: currentProfile.full_name,
    email: currentProfile.email,
    contact_number: currentProfile.contact_number || (currentProfile as any).phone || "",
    sports_focus: currentProfile.sports_focus,
    current_institution: currentProfile.current_institution || "",
    regional_affiliation: currentProfile.regional_affiliation || currentProfile.regional_affiliations?.association_name || "",
    national_sports_league: currentProfile.national_sports_league || currentProfile.regional_affiliations?.office_name || "",
    coaching_philosophy: currentProfile.coaching_philosophy || (currentProfile as any).coachingPhilosophy || (currentProfile as any).philosophy || "",
  });

  const [contactNumberError, setContactNumberError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [avatarUri, setAvatarUri] = useState<string | undefined>(currentProfile.avatar_url);

  const initialDocs = normalizeUploadedDocs(
    currentProfile.uploaded_documents ||
    (currentProfile as any).credentials ||
    (currentProfile as any).certifications ||
    []
  );

  const [documents, setDocuments] = useState<UploadedDocument[]>(initialDocs);

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocName, setEditingDocName] = useState<string>("");

  useEffect(() => {
    setForm({
      full_name: currentProfile.full_name,
      email: currentProfile.email,
      contact_number: currentProfile.contact_number || (currentProfile as any).phone || "",
      sports_focus: currentProfile.sports_focus,
      current_institution: currentProfile.current_institution || "",
      regional_affiliation: currentProfile.regional_affiliation || currentProfile.regional_affiliations?.association_name || "",
      national_sports_league: currentProfile.national_sports_league || currentProfile.regional_affiliations?.office_name || "",
      coaching_philosophy: currentProfile.coaching_philosophy || (currentProfile as any).coachingPhilosophy || (currentProfile as any).philosophy || "",
    });
    setContactNumberError("");
    setAvatarUri(currentProfile.avatar_url);
    const docs = normalizeUploadedDocs(
      currentProfile.uploaded_documents ||
      (currentProfile as any).credentials ||
      (currentProfile as any).certifications ||
      []
    );
    if (docs.length > 0) {
      setDocuments(docs);
    }
  }, [currentProfile]);

  // Fetch credentials from API/offline store if not yet populated
  useEffect(() => {
    let isMounted = true;
    if (documents.length === 0) {
      requestAuthenticatedJson("/coaches/profile")
        .then((res: any) => {
          if (!isMounted || !res) return;
          const raw = res.uploaded_documents || res.credentials || res.certifications || res.documents || [];
          const fetchedDocs = normalizeUploadedDocs(raw);
          if (fetchedDocs.length > 0) {
            setDocuments(fetchedDocs);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRenameDocument = (docId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;

        const rawFileName = String(d.file_name || (d as any).name || (d as any).title || "");
        // Preserve file extension if present in original file_name
        const originalExt = rawFileName && rawFileName.includes(".")
          ? "." + rawFileName.split(".").pop()
          : "";

        let finalFileName = trimmed;
        if (originalExt && !trimmed.toLowerCase().endsWith(originalExt.toLowerCase())) {
          finalFileName = `${trimmed}${originalExt}`;
        }

        return {
          ...d,
          file_name: finalFileName,
          file_type: d.file_type || (originalExt ? (originalExt.replace(".", "").toUpperCase() as any) : "PDF"),
        };
      })
    );
  };

  // API Request: upload coach profile image (POST /api/coach/avatar/upload or /users/avatar)
  const handlePickAvatarImage = async () => {
    try {
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
      } catch {}

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];

        // Compress and resize to 300x300 square using ImageManipulator (~30KB clean payload)
        const manipResult = await ImageManipulator.manipulateAsync(
          pickedAsset.uri,
          [{ resize: { width: 300, height: 300 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        const finalDataUri = `data:image/jpeg;base64,${manipResult.base64}`;
        setAvatarUri(finalDataUri);

        const uid = currentProfile.user_id || currentProfile.coach_id;
        const rawUid = uid ? String(uid).replace(/^coach_/, "") : "";
        const canonicalCoachId = uid ? (String(uid).startsWith("coach_") ? String(uid) : `coach_${rawUid}`) : "";

        // Instantly save to user avatar endpoint
        try {
          await requestAuthenticatedJson("/users/avatar", "POST", {
            avatar_url: finalDataUri,
          }).catch(async () => {
            return await requestAuthenticatedJson("/coaches/avatar", "POST", {
              avatar_url: finalDataUri,
            });
          });
        } catch (syncErr) {
          console.warn("Direct avatar upload fallback notice:", syncErr);
        }

        // Write directly to Firestore Coach_Profiles and Users
        if (rawUid) {
          const avatarPayload = {
            avatar_url: finalDataUri,
            profile_image: finalDataUri,
            updated_at: new Date().toISOString(),
          };
          await Promise.all([
            setDoc(doc(db, "Coach_Profiles", canonicalCoachId), avatarPayload, { merge: true }).catch(() => null),
            setDoc(doc(db, "Coach_Profiles", rawUid), avatarPayload, { merge: true }).catch(() => null),
            setDoc(doc(db, "Users", rawUid), avatarPayload, { merge: true }).catch(() => null),
          ]);
        }
      }
    } catch (err) {
      console.warn("Avatar picker error:", err);
      Alert.alert("Image Error", "Failed to select profile image.");
    }
  };

  // Credentials Document Upload Handler
  // API Request: upload credential document (POST /api/coach/documents/upload)
  const handleUploadCertification = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
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

        const isDuplicate = documents.some(
          (d) =>
            d.file_name.toLowerCase() === pickedAsset.name.toLowerCase() ||
            (d.file_url && d.file_url === pickedAsset.uri)
        );

        if (isDuplicate) {
          Alert.alert("Duplicate Document", `"${pickedAsset.name}" is already in your uploaded documents.`);
          return;
        }

        const newDoc: UploadedDocument = {
          id: `doc_${Date.now()}`,
          file_name: pickedAsset.name,
          file_type: fileType,
          file_url: pickedAsset.uri,
        };

        setDocuments((prev) => {
          const filtered = prev.filter((d) => d.file_name.toLowerCase() !== pickedAsset.name.toLowerCase());
          return [...filtered, newDoc];
        });
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

    const rawContact = (form.contact_number || "").trim();
    let cleanedContact = "";
    if (rawContact) {
      cleanedContact = rawContact.replace(/[\s\-_()]/g, "");
      if (cleanedContact.startsWith("+63")) cleanedContact = "0" + cleanedContact.slice(3);
      else if (cleanedContact.startsWith("63") && cleanedContact.length === 12) cleanedContact = "0" + cleanedContact.slice(2);
      else if (cleanedContact.length === 10 && cleanedContact.startsWith("9")) cleanedContact = "0" + cleanedContact;

      if (!/^09\d{9}$/.test(cleanedContact)) {
        setContactNumberError("Contact number must be 11 digits starting with 09 (e.g. 09123456789).");
        Alert.alert("Invalid Contact Number", "Contact number must be 11 digits starting with 09 (e.g. 09123456789).");
        return;
      }
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
      contact_number: cleanedContact,
      sports_focus: form.sports_focus,
      role_title: updatedRoleTitle,
      avatar_url: avatarUri,
      current_institution: form.current_institution.trim(),
      regional_affiliation: form.regional_affiliation.trim(),
      national_sports_league: form.national_sports_league.trim(),
      coaching_philosophy: form.coaching_philosophy.trim(),
      coachingPhilosophy: form.coaching_philosophy.trim(),
      credentials: [...nonDocCredentials, ...docCredentials],
      uploaded_documents: documents,
      last_updated: todayFormatted,
    };

    const canonicalSportType =
      form.sports_focus === "TRACK AND FIELD"
        ? "Track and Field"
        : form.sports_focus === "SWIMMING"
        ? "Swimming"
        : form.sports_focus
        ? form.sports_focus.charAt(0).toUpperCase() + form.sports_focus.slice(1).toLowerCase()
        : "Basketball";

    const patchPayload = {
      first_name: firstName,
      last_name: lastName,
      full_name: form.full_name.trim(),
      sport_type: canonicalSportType,
      sports_focus: form.sports_focus,
      contact_number: cleanedContact || null,
      phoneNumber: cleanedContact || null,
      current_institution: form.current_institution.trim(),
      regional_affiliation: form.regional_affiliation.trim(),
      national_sports_league: form.national_sports_league.trim(),
      coaching_philosophy: form.coaching_philosophy.trim(),
      coachingPhilosophy: form.coaching_philosophy.trim(),
      philosophy: form.coaching_philosophy.trim(),
      quote: form.coaching_philosophy.trim(),
      email: form.email.trim(),
      avatar_url: avatarUri,
      uploaded_documents: documents,
      professional_documents: documents.map((d) => d.file_name),
      credentials: [...nonDocCredentials, ...docCredentials],
    };

    setIsSaving(true);

    try {
      // 1. Sync to backend REST API first to enforce phone uniqueness
      await requestAuthenticatedJson("/coaches/me/profile", "PATCH", patchPayload)
        .catch(() => requestAuthenticatedJson("/coaches/profile", "PATCH", patchPayload));

      // 2. Resolve UID with token fallback if missing on profileData
      let uid = currentProfile.user_id || currentProfile.coach_id;
      if (!uid) {
        try {
          const token = await getStoredAuthToken();
          if (token && token.includes(".")) {
            const decodedStr = safeBase64Decode(token.split(".")[1]);
            const parsed = JSON.parse(decodedStr);
            uid = parsed.uid || parsed.user_id || "";
          }
        } catch (_) {}
      }

      const rawUid = uid ? String(uid).replace(/^coach_/, "") : "";
      const canonicalCoachId = uid ? (String(uid).startsWith("coach_") ? String(uid) : `coach_${rawUid}`) : "";

      // 3. Direct Firestore synchronization
      if (rawUid) {
        await Promise.all([
          setDoc(doc(db, "Coach_Profiles", canonicalCoachId), patchPayload, { merge: true }).catch(() => null),
          setDoc(doc(db, "Coach_Profiles", rawUid), patchPayload, { merge: true }).catch(() => null),
          setDoc(doc(db, "Users", rawUid), {
            first_name: firstName,
            last_name: lastName,
            full_name: form.full_name.trim(),
            contact_number: cleanedContact || null,
            phoneNumber: cleanedContact || null,
            avatar_url: avatarUri,
            profile_image: avatarUri,
            coaching_philosophy: form.coaching_philosophy.trim(),
            coachingPhilosophy: form.coaching_philosophy.trim(),
            philosophy: form.coaching_philosophy.trim(),
            quote: form.coaching_philosophy.trim(),
            updated_at: new Date().toISOString(),
          }, { merge: true }).catch(() => null),
        ]);
      }

      // 4. Persist to local offline caches immediately
      await AsyncStorage.setItem(
        "atleta_offline_coach_profile_cache",
        JSON.stringify(updatedProfile)
      ).catch(() => null);

      // 5. Update parent component state
      if (onSave) {
        onSave(updatedProfile);
      }
      setContactNumberError("");

      Alert.alert("Profile Updated", "Your coach credentials and profile changes have been saved successfully.", [
        {
          text: "OK",
          onPress: () => onBack(),
        },
      ]);
    } catch (err: any) {
      console.warn("Coach profile sync error:", err);
      const errMsg = err?.message || String(err || "Failed to update profile.");
      const isPhoneDuplicate = errMsg.toLowerCase().includes("phone number") || errMsg.toLowerCase().includes("already registered");
      if (isPhoneDuplicate) {
        const errorText = "This phone number is already registered to another account.";
        setContactNumberError(errorText);
        Alert.alert("Profile Error", errorText);
        return;
      }

      // Fallback save directly to state so user never loses their changes on transient network issues
      if (onSave) {
        onSave(updatedProfile);
      }
      Alert.alert("Profile Updated", "Your coach credentials and profile changes have been saved locally.", [
        {
          text: "OK",
          onPress: () => onBack(),
        },
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const headerTopPadding = Math.max(insets.top, 16) + 10;

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

        {/* CONTACT NUMBER */}
        <View style={styles.formFieldContainer}>
          <Text style={styles.inputLabel}>CONTACT NUMBER</Text>
          <View style={[styles.inputWrapper, contactNumberError ? { borderColor: "#EF4444" } : null]}>
            <TextInput
              style={styles.textInput}
              value={form.contact_number}
              onChangeText={(text) => {
                setForm((prev) => ({ ...prev, contact_number: text }));
                if (contactNumberError) setContactNumberError("");
              }}
              placeholder="09XXXXXXXXX"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
            />
          </View>
          {contactNumberError ? (
            <Text style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>
              {contactNumberError}
            </Text>
          ) : null}
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
              {sportOptions.map((sport) => {
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

        {/* CURRENT INSTITUTION */}
        <View style={styles.formFieldContainer}>
          <Text style={styles.inputLabel}>CURRENT INSTITUTION</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={form.current_institution}
              onChangeText={(text) => setForm((prev) => ({ ...prev, current_institution: text }))}
              placeholder="e.g. Ateneo de Naga University"
              placeholderTextColor="#64748B"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* REGIONAL AFFILIATION */}
        <View style={styles.formFieldContainer}>
          <Text style={styles.inputLabel}>REGIONAL AFFILIATION</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={form.regional_affiliation}
              onChangeText={(text) => setForm((prev) => ({ ...prev, regional_affiliation: text }))}
              placeholder="e.g. Bicol Regional Athletic Association (BRAA)"
              placeholderTextColor="#64748B"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* NATIONAL SPORTS LEAGUE */}
        <View style={styles.formFieldContainer}>
          <Text style={styles.inputLabel}>NATIONAL SPORTS LEAGUE</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={form.national_sports_league}
              onChangeText={(text) => setForm((prev) => ({ ...prev, national_sports_league: text }))}
              placeholder="e.g. Batang Pinoy / Palarong Pambansa"
              placeholderTextColor="#64748B"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* COACHING PHILOSOPHY */}
        <View style={styles.formFieldContainer}>
          <Text style={styles.inputLabel}>COACHING PHILOSOPHY</Text>
          <View style={[styles.inputWrapper, { minHeight: 88, paddingVertical: 8, alignItems: "flex-start" }]}>
            <TextInput
              style={[styles.textInput, { minHeight: 72, textAlignVertical: "top" }]}
              value={form.coaching_philosophy}
              onChangeText={(text) => setForm((prev) => ({ ...prev, coaching_philosophy: text }))}
              placeholder="e.g. Relentless effort, high athletic IQ, and character on and off the court."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* CREDENTIALS UPLOADER BOX */}
        <View style={{ marginTop: 28, paddingTop: 4 }}>
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
              const displayName = doc.file_name || (doc as any).name || (doc as any).title || "Credential.pdf";
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
                        {displayName}
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
                          setEditingDocName(displayName);
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel={`Edit document name ${displayName}`}
                      >
                        <Ionicons name="pencil-outline" size={18} color="#00C8FF" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.trashIconButton}
                      onPress={() => handleDeleteDocument(doc.id, displayName)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Delete document ${displayName}`}
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
          style={[styles.saveSubmitBtn, isSaving && { opacity: 0.7 }]}
          onPress={handleSaveChanges}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
          ) : null}
          <Text style={styles.saveSubmitText}>{isSaving ? "SAVING..." : "SAVE CHANGES"}</Text>
          {!isSaving && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
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

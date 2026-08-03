import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { AthleteProfile, EligibleDocument } from "../Dashboard/HomeAnalyticsPage";

export interface DailySessionLog {
  date: string; // "YYYY-MM-DD"
  duration_minutes: number;
  srpe: number; // Scale 1 - 10
}

export interface WorkloadAnalyticsData {
  acute_load_7day_avg: number;
  chronic_load_28day_avg: number;
  weekly_logs: DailySessionLog[];
}

export interface AthleteProfilePageProps {
  profile: AthleteProfile;
  onUpdateProfile: (updatedProfile: AthleteProfile) => void;
  onChangePassword?: (currentPassword: string, newPassword: string) => Promise<void> | void;
  onLogout?: () => void;
  loading?: boolean;
  categoriesList?: Array<AthleteProfile["category"]>;
}

const DEFAULT_CATEGORIES: Array<AthleteProfile["category"]> = [
  "BASKETBALL",
  "SWIMMING",
  "TRACK AND FIELD",
];

const DEFAULT_WORKLOAD_DATA: WorkloadAnalyticsData = {
  acute_load_7day_avg: 420,
  chronic_load_28day_avg: 380,
  weekly_logs: [
    { date: "MON", duration_minutes: 75, srpe: 7 },
    { date: "TUE", duration_minutes: 60, srpe: 6 },
    { date: "WED", duration_minutes: 90, srpe: 8 },
    { date: "THU", duration_minutes: 45, srpe: 5 },
    { date: "FRI", duration_minutes: 80, srpe: 7 },
    { date: "SAT", duration_minutes: 60, srpe: 6 },
    { date: "SUN", duration_minutes: 0, srpe: 0 },
  ],
};

const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const YEARS_LIST = Array.from({ length: 57 }, (_, i) => 1970 + i);

//sample documents for testing
const DEFAULT_DOCUMENTS: EligibleDocument[] = [
  {
    id: "doc_01",
    title: "PSA / NSO Birth Certificate",
    category: "BIRTH_CERTIFICATE",
    fileName: "psa_birth_certificate_vance.pdf",
    status: "VERIFIED",
    uploadedAt: "JAN 12, 2026",
  },
  {
    id: "doc_02",
    title: "Medical Fitness Clearance",
    category: "MEDICAL_CLEARANCE",
    fileName: "medical_clearance_2026.pdf",
    status: "UPLOADED",
    uploadedAt: "FEB 04, 2026",
  },
  {
    id: "doc_03",
    title: "School / Student ID Verification",
    category: "SCHOOL_ID",
    status: "PENDING",
  },
];

export function AthleteProfilePage({
  profile,
  onUpdateProfile,
  onChangePassword,
  onLogout,
  loading = false,
  categoriesList = DEFAULT_CATEGORIES,
}: AthleteProfilePageProps) {
  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);

  // Profile form local state
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [birthdate, setBirthdate] = useState(profile.birthdate);
  const [category, setCategory] = useState<AthleteProfile["category"]>(profile.category);
  const [heightCm, setHeightCm] = useState(profile.height_cm);
  const [weightKg, setWeightKg] = useState(profile.weight_kg);
  const [wingspanCm, setWingspanCm] = useState(profile.wingspan_cm);

  // Eligible documents state
  const [documents, setDocuments] = useState<EligibleDocument[]>(
    profile.eligible_documents || DEFAULT_DOCUMENTS
  );

  // UI state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [docsDrawerOpen, setDocsDrawerOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Add Document Modal
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocAsset, setNewDocAsset] = useState<{ name: string; uri: string } | null>(null);
  const [addDocError, setAddDocError] = useState("");

  // Password change
  const [passwordDrawerOpen, setPasswordDrawerOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Calendar Birthdate Picker modal state
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [pickerYear, setPickerYear] = useState(2004);
  const [pickerMonth, setPickerMonth] = useState(9);
  const [calendarMode, setCalendarMode] = useState<"DAYS" | "MONTHS" | "YEARS">("DAYS");

  if (loading) {
    return <ProfileSkeletonLoader />;
  }

  // Calculate BMI & Ape Index dynamically using mathematical formulas:
  // BMI = weight_kg / (height_cm / 100)^2
  // Ape Index = wingspan_cm / height_cm
  const heightM = heightCm > 0 ? heightCm / 100 : 1;
  const bmiVal = weightKg / (heightM * heightM);
  const bmi = isNaN(bmiVal) ? "0.0" : bmiVal.toFixed(1);

  const apeRatioVal = heightCm > 0 ? wingspanCm / heightCm : 1;
  const apeIndex = isNaN(apeRatioVal) ? "1.00" : apeRatioVal.toFixed(2);
  const apeDiff = wingspanCm - heightCm;

  // Workload Analytics State (Read-only for athlete, provided by Coach)
  const [workloadData, setWorkloadData] = useState<WorkloadAnalyticsData>(
    (profile as any).workload_analytics || DEFAULT_WORKLOAD_DATA
  );
  const [workloadDrawerOpen, setWorkloadDrawerOpen] = useState(true);

  // Sync / fetch coach-provided workload logs for the athlete
  React.useEffect(() => {
    if ((profile as any).workload_analytics) {
      setWorkloadData((profile as any).workload_analytics);
    } else {
      setWorkloadData(DEFAULT_WORKLOAD_DATA);
    }
  }, [profile]);

  // Dynamic Client-side Formulas for Workload Indicators:
  // Session Load (Arbitrary Units AU) = duration_minutes * sRPE (scale 1-10)
  // Acute Load = Total 7-day session load sum
  const acuteLoadSum = workloadData.weekly_logs.reduce(
    (acc, log) => acc + log.duration_minutes * log.srpe,
    0
  );
  const chronicLoad = workloadData.chronic_load_28day_avg || 380;
  // ACWR (Acute:Chronic Workload Ratio) = Acute Load / Chronic Load
  const acwrRatio = chronicLoad > 0 ? acuteLoadSum / chronicLoad : 1.0;

  // Workload Risk Zone Status
  let acwrStatus = "OPTIMAL ZONE";
  let statusBadgeBg = "#064E3B";
  let statusBadgeColor = "#34D399";
  let acwrDesc = "Optimal training load — progressive fitness gains with minimal injury risk.";

  if (acwrRatio < 0.8) {
    acwrStatus = "UNDERLOAD";
    statusBadgeBg = "#451A03";
    statusBadgeColor = "#FBBF24";
    acwrDesc = "Underload zone — potential fitness loss or detraining risk.";
  } else if (acwrRatio > 1.5) {
    acwrStatus = "POOR PERFORMANCE";
    statusBadgeBg = "#450A0A";
    statusBadgeColor = "#F87171";
    acwrDesc = "High fatigue & workload spike detected — increased risk of poor performance.";
  } else if (acwrRatio > 1.3) {
    acwrStatus = "HIGH LOAD";
    statusBadgeBg = "#431407";
    statusBadgeColor = "#FB923C";
    acwrDesc = "Elevated workload — monitor athlete fatigue and recovery closely.";
  }

  // Handler to replace/upload existing document file
  const handlePickDocument = async (docId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setDocuments((prevDocs) =>
          prevDocs.map((doc) =>
            doc.id === docId
              ? {
                ...doc,
                fileName: asset.name,
                fileUri: asset.uri,
                status: "UPLOADED",
                uploadedAt: new Date().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).toUpperCase(),
              }
              : doc
          )
        );
      }
    } catch (error) {
      console.log("Error picking document:", error);
    }
  };

  // Handler to pick file inside Add Document
  const handlePickModalDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setNewDocAsset({ name: asset.name, uri: asset.uri });
        setAddDocError("");
      }
    } catch (error) {
      console.log("Error picking modal document:", error);
    }
  };

  // Handler to save new document 
  const handleSaveNewDocument = () => {
    if (!newDocTitle.trim()) {
      setAddDocError("Please enter a document name.");
      return;
    }

    const newDoc: EligibleDocument = {
      id: `doc_${Date.now()}`,
      title: newDocTitle.trim(),
      category: "OTHER",
      fileName: newDocAsset?.name,
      fileUri: newDocAsset?.uri,
      status: newDocAsset ? "UPLOADED" : "PENDING",
      uploadedAt: newDocAsset
        ? new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).toUpperCase()
        : undefined,
    };

    setDocuments((prev) => [...prev, newDoc]);
    setNewDocTitle("");
    setNewDocAsset(null);
    setAddDocError("");
    setShowAddDocModal(false);
  };

  const openCalendar = () => {
    const parts = (birthdate || "").split("-");
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && y >= 1950 && y <= 2030) setPickerYear(y);
      if (!isNaN(m) && m >= 0 && m <= 11) setPickerMonth(m);
    }
    setCalendarMode("DAYS");
    if (!isEditing) setIsEditing(true);
    setShowDatePickerModal(true);
  };

  const handlePrevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const yyyy = pickerYear;
    const mm = String(pickerMonth + 1).padStart(2, "0");
    const dd = String(dayNum).padStart(2, "0");
    setBirthdate(`${yyyy}-${mm}-${dd}`);
    setShowDatePickerModal(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (!newPassword) {
      setPasswordError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordError("");
      if (onChangePassword) {
        await onChangePassword(currentPassword, newPassword);
      }
      setPasswordSuccessMsg("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccessMsg(""), 3000);
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to change password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSave = () => {
    const updated: AthleteProfile = {
      ...profile,
      first_name: firstName,
      last_name: lastName,
      birthdate: birthdate,
      category: category,
      height_cm: Number(heightCm) || profile.height_cm,
      weight_kg: Number(weightKg) || profile.weight_kg,
      wingspan_cm: Number(wingspanCm) || profile.wingspan_cm,
      eligible_documents: documents,
    };
    onUpdateProfile(updated);
    setIsEditing(false);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleCancelEdit = () => {
    // Cancel Edit Profile
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setBirthdate(profile.birthdate);
    setCategory(profile.category);
    setHeightCm(profile.height_cm);
    setWeightKg(profile.weight_kg);
    setWingspanCm(profile.wingspan_cm);
    setDocuments(profile.eligible_documents || DEFAULT_DOCUMENTS);
    setIsEditing(false);
  };

  const selectCategoryOption = (selected: AthleteProfile["category"]) => {
    setCategory(selected);
    setShowCategoryPicker(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
    >
      {/* Section Heading & Edit Button Bar */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeadingContainer}>
          <Text style={styles.mainTitle}>MY PROFILE</Text>
          <View style={styles.activeUnderline} />
        </View>

        {/* Top Header Edit Toggle Button */}
        <Pressable
          style={[
            styles.headerEditButton,
            isEditing ? styles.headerEditButtonActive : styles.headerEditButtonInactive,
          ]}
          onPress={() => {
            if (isEditing) {
              handleCancelEdit();
            } else {
              setIsEditing(true);
            }
          }}
        >
          <Ionicons
            name={isEditing ? "close-circle-outline" : "create-outline"}
            size={16}
            color={isEditing ? "#FF4D4D" : "#38BDF8"}
          />
          <Text
            style={[
              styles.headerEditButtonText,
              { color: isEditing ? "#FF4D4D" : "#38BDF8" },
            ]}
          >
            {isEditing ? "CANCEL EDIT" : "EDIT PROFILE"}
          </Text>
        </Pressable>
      </View>

      {/* Mode Indicator Banner */}
      {isEditing && (
        <View style={styles.editingBanner}>
          <Ionicons name="create" size={16} color="#080F21" />
          <Text style={styles.editingBannerText}>
            EDITING MODE — Modify fields below & tap save
          </Text>
        </View>
      )}

      {/* Main Dark Card Container */}
      <View style={styles.profileMainCard}>
        {/* Avatar Header */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBox}>
            <Image
              source={require("../../../../assets/profile.png")}
              style={styles.avatarImage}
              resizeMode="contain"
            />
            {/* Blue Camera Badge Icon on bottom-right */}
            <Pressable
              style={styles.cameraBadge}
              onPress={() => {
                if (!isEditing) setIsEditing(true);
              }}
            >
              <Ionicons name="camera" size={16} color="#080F21" />
            </Pressable>
          </View>
        </View>

        {/* Full Name Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <View
            style={[
              styles.inputWrapper,
              isEditing && styles.inputWrapperEditable,
            ]}
          >
            <TextInput
              style={styles.textInput}
              value={`${firstName}${lastName ? " " + lastName : ""}`}
              editable={isEditing}
              onChangeText={(text) => {
                const parts = text.trimStart().split(" ");
                setFirstName(parts[0] || "");
                setLastName(parts.slice(1).join(" ") || "");
              }}
              placeholder="Enter full name"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />
            {isEditing && (
              <Ionicons name="pencil-sharp" size={14} color="#38BDF8" />
            )}
          </View>
        </View>

        {/* Birthdate & Category Row */}
        <View style={styles.rowTwoFields}>
          {/* Field 1: Birthdate Dropdown Picker */}
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>BIRTHDATE</Text>
            <Pressable
              style={[
                styles.dropdownWrapper,
                isEditing && styles.inputWrapperEditable,
              ]}
              onPress={openCalendar}
            >
              <Text style={styles.dropdownText}>{birthdate || "YYYY-MM-DD"}</Text>
              <Ionicons name="calendar-outline" size={18} color="#38BDF8" />
            </Pressable>
          </View>

          {/* Field 2: Category Dropdown Picker */}
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <Pressable
              style={[
                styles.dropdownWrapper,
                isEditing && styles.inputWrapperEditable,
              ]}
              onPress={() => {
                if (isEditing) {
                  setShowCategoryPicker(true);
                } else {
                  setIsEditing(true);
                  setShowCategoryPicker(true);
                }
              }}
            >
              <Text style={styles.dropdownText}>{category}</Text>
              <Ionicons name="chevron-down" size={18} color="#38BDF8" />
            </Pressable>
          </View>
        </View>

        {/* Physical Stats Section Header */}
        <View style={styles.physicalStatsHeaderRow}>
          <View style={styles.cyanAccentBar} />
          <Text style={styles.physicalStatsTitle}>PHYSICAL STATS</Text>
          <View style={styles.horizontalDivider} />
        </View>

        {/* 3 Equal Cards in a Row bound to state */}
        <View style={styles.statsRow}>
          {/* HEIGHT CARD */}
          <View
            style={[
              styles.statBox,
              isEditing && styles.statBoxEditable,
            ]}
          >
            <Text style={styles.statBoxLabel}>HEIGHT</Text>
            <View style={styles.statBoxValueRow}>
              <TextInput
                style={styles.statBoxValueInput}
                value={String(heightCm)}
                editable={isEditing}
                onChangeText={(val) => setHeightCm(Number(val.replace(/[^0-9]/g, "")) || 0)}
                keyboardType="numeric"
              />
              <Text style={styles.statBoxUnit}>CM</Text>
            </View>
          </View>

          {/* WEIGHT CARD */}
          <View
            style={[
              styles.statBox,
              isEditing && styles.statBoxEditable,
            ]}
          >
            <Text style={styles.statBoxLabel}>WEIGHT</Text>
            <View style={styles.statBoxValueRow}>
              <TextInput
                style={styles.statBoxValueInput}
                value={String(weightKg)}
                editable={isEditing}
                onChangeText={(val) => setWeightKg(Number(val.replace(/[^0-9]/g, "")) || 0)}
                keyboardType="numeric"
              />
              <Text style={styles.statBoxUnit}>KG</Text>
            </View>
          </View>

          {/* WINGSPAN CARD */}
          <View
            style={[
              styles.statBox,
              isEditing && styles.statBoxEditable,
            ]}
          >
            <Text style={styles.statBoxLabel}>WINGSPAN</Text>
            <View style={styles.statBoxValueRow}>
              <TextInput
                style={styles.statBoxValueInput}
                value={String(wingspanCm)}
                editable={isEditing}
                onChangeText={(val) => setWingspanCm(Number(val.replace(/[^0-9]/g, "")) || 0)}
                keyboardType="numeric"
              />
              <Text style={styles.statBoxUnit}>CM</Text>
            </View>
          </View>
        </View>

        {/* Physical Metrics Display Hook (BMI & Ape Index) */}
        <View style={styles.drawerContainer}>
          <Pressable
            style={styles.drawerHeader}
            onPress={() => setDrawerOpen(!drawerOpen)}
          >
            <View style={styles.drawerTitleRow}>
              <Ionicons name="analytics-outline" size={16} color="#38BDF8" />
              <Text style={styles.drawerTitleText}>
                Physical Metrics (BMI & Ape Index)
              </Text>
            </View>
            <Ionicons
              name={drawerOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#38BDF8"
            />
          </Pressable>

          {drawerOpen && (
            <View style={styles.drawerContent}>
              <View style={styles.calculatedItem}>
                <Text style={styles.calcLabel}>BMI (Body Mass Index)</Text>
                <Text style={styles.calcValue}>
                  {bmi} <Text style={styles.calcUnit}>kg/m²</Text>
                </Text>
              </View>

              <View style={styles.calculatedItem}>
                <Text style={styles.calcLabel}>Ape Index (Reach Ratio)</Text>
                <Text style={styles.calcValue}>
                  {apeIndex}{" "}
                  <Text style={styles.calcUnit}>
                    ({apeDiff >= 0 ? `+${apeDiff}` : apeDiff} cm reach)
                  </Text>
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Workload Analytics & Training Load Section */}
        <View style={styles.drawerContainer}>
          <Pressable
            style={styles.drawerHeader}
            onPress={() => setWorkloadDrawerOpen(!workloadDrawerOpen)}
          >
            <View style={styles.drawerTitleRow}>
              <Ionicons name="fitness-outline" size={16} color="#38BDF8" />
              <Text style={styles.drawerTitleText}>
                Workload Analytics & Training Load
              </Text>
            </View>
            <Ionicons
              name={workloadDrawerOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#38BDF8"
            />
          </Pressable>

          {workloadDrawerOpen && (
            <View style={styles.drawerContent}>
              {/* ACWR & Risk Zone Status Card */}
              <View style={styles.workloadAcwrCard}>
                <View style={styles.workloadAcwrHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.workloadSubLabel}>
                      ACWR (Acute:Chronic Workload Ratio)
                    </Text>
                    <Text style={styles.workloadAcwrValue}>
                      {acwrRatio.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.workloadStatusBadge,
                      { backgroundColor: statusBadgeBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.workloadStatusText,
                        { color: statusBadgeColor },
                      ]}
                    >
                      {acwrStatus}
                    </Text>
                  </View>
                </View>

                {/* Subtitle / Formula description */}
                <Text style={styles.workloadDescText}>{acwrDesc}</Text>

                {/* Acute vs Chronic Load Progress comparison */}
                <View style={styles.loadComparisonRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.loadBoxLabel}>7-Day Acute Load</Text>
                    <Text style={styles.loadBoxValue}>{Math.round(acuteLoadSum)} AU</Text>
                  </View>
                  <View style={styles.loadVerticalDivider} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.loadBoxLabel}>28-Day Chronic Load</Text>
                    <Text style={styles.loadBoxValue}>{Math.round(chronicLoad)} AU</Text>
                  </View>
                </View>
              </View>

              {/* 7-Day Session Log Summary (Provided by Coach) */}
              <View style={styles.weeklyLogSection}>
                <View style={styles.weeklyLogHeaderRow}>
                  <Text style={styles.weeklyLogTitle}>7-DAY TRAINING LOG</Text>
                  <View style={styles.coachBadgeTag}>
                    <Ionicons name="person-outline" size={12} color="#38BDF8" />
                    <Text style={styles.coachBadgeText}>COACH ASSIGNED</Text>
                  </View>
                </View>

                {/* Horizontal scrollable daily log cards for clear mobile visibility */}
                <ScrollView
                  horizontal
                  nestedScrollEnabled={true}
                  overScrollMode="never"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dailyLogsScrollContent}
                >
                  {workloadData.weekly_logs.map((log, index) => {
                    const sessionLoad = log.duration_minutes * log.srpe;
                    return (
                      <View key={index} style={styles.dailyLogCard}>
                        <Text style={styles.dailyLogDate}>{log.date}</Text>
                        <Text style={styles.dailyLogDuration}>
                          {log.duration_minutes > 0 ? `${log.duration_minutes}m` : "Rest"}
                        </Text>
                        {log.duration_minutes > 0 ? (
                          <View style={styles.srpeTag}>
                            <Text style={styles.srpeTagText}>sRPE {log.srpe}</Text>
                          </View>
                        ) : (
                          <View style={[styles.srpeTag, { backgroundColor: "#111C35" }]}>
                            <Text style={[styles.srpeTagText, { color: "#64748B" }]}>Off</Text>
                          </View>
                        )}
                        <Text style={styles.dailyLoadText}>{sessionLoad} AU</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}
        </View>

        {/* Current Affiliation Card */}
        <View style={styles.affiliationSection}>
          <Text style={styles.fieldLabel}>CURRENT AFFILIATION</Text>
          <View style={styles.affiliationCard}>
            <View style={styles.affiliationLeft}>
              <View style={styles.shieldIconWrapper}>
                <Ionicons name="shield-outline" size={22} color="#38BDF8" />
              </View>
              <View style={styles.affiliationTextGroup}>
                <Text style={styles.teamNameText}>
                  {profile.current_affiliation.team_name}
                </Text>
                <Text style={styles.sportTagText}>
                  {profile.current_affiliation.sport_type} TEAM
                </Text>
              </View>
            </View>

            {profile.current_affiliation.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={22} color="#38BDF8" />
              </View>
            )}
          </View>
        </View>

        {/* Upload Eligible Documents Drawer (Expandable, Collapsed by Default) */}
        <View style={styles.drawerContainer}>
          <Pressable
            style={styles.drawerHeader}
            onPress={() => setDocsDrawerOpen(!docsDrawerOpen)}
          >
            <View style={styles.drawerTitleRow}>
              <Ionicons name="folder-open-outline" size={16} color="#38BDF8" />
              <Text style={styles.drawerTitleText}>
                Eligible Documents ({documents.length} Files)
              </Text>
            </View>
            <Ionicons
              name={docsDrawerOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#38BDF8"
            />
          </Pressable>

          {docsDrawerOpen && (
            <View style={styles.drawerContent}>
              <View style={styles.documentsHeaderRow}>
                <Text style={styles.documentsSubtitleText}>
                  Official verification documents for league eligibility.
                </Text>
                <Pressable
                  style={styles.addDocButton}
                  onPress={() => {
                    setNewDocTitle("");
                    setNewDocAsset(null);
                    setAddDocError("");
                    setShowAddDocModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={14} color="#38BDF8" />
                  <Text style={styles.addDocButtonText}>Add Document</Text>
                </Pressable>
              </View>

              <View style={styles.documentsCardList}>
                {documents.map((doc) => (
                  <View key={doc.id} style={styles.documentItemCard}>
                    <View style={styles.docHeaderRow}>
                      <View style={styles.docTitleGroup}>
                        <Ionicons
                          name={
                            doc.category === "BIRTH_CERTIFICATE"
                              ? "ribbon-outline"
                              : doc.category === "MEDICAL_CLEARANCE"
                                ? "medical-outline"
                                : doc.category === "SCHOOL_ID"
                                  ? "card-outline"
                                  : "document-text-outline"
                          }
                          size={18}
                          color="#38BDF8"
                        />
                        {/* Editable Document Title */}
                        <TextInput
                          style={styles.docTitleInput}
                          value={doc.title}
                          onChangeText={(newTitle) => {
                            setDocuments((prevDocs) =>
                              prevDocs.map((d) =>
                                d.id === doc.id ? { ...d, title: newTitle } : d
                              )
                            );
                          }}
                          placeholder="Enter document name (e.g. PSA Birth Certificate)"
                          placeholderTextColor="#64748B"
                        />
                        <Ionicons name="pencil-sharp" size={12} color="#38BDF8" />
                      </View>

                      {/* Delete Button */}
                      {documents.length > 1 && (
                        <Pressable
                          style={styles.deleteDocButton}
                          onPress={() => {
                            setDocuments((prevDocs) =>
                              prevDocs.filter((d) => d.id !== doc.id)
                            );
                          }}
                        >
                          <Ionicons name="trash-outline" size={15} color="#FF4D4D" />
                        </Pressable>
                      )}
                    </View>

                    {/* File Detail Row */}
                    <View style={styles.docFileDetailsRow}>
                      {doc.fileName ? (
                        <View style={styles.docFileMeta}>
                          <Ionicons name="document-attach" size={14} color="#64748B" />
                          <Text style={styles.docFileNameText} numberOfLines={1}>
                            {doc.fileName}
                          </Text>
                          {doc.uploadedAt && (
                            <Text style={styles.docUploadedAtText}>• {doc.uploadedAt}</Text>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.docNoFileText}>
                          No document uploaded yet
                        </Text>
                      )}

                      {/* Upload / Replace Action Button */}
                      <Pressable
                        style={styles.uploadDocActionButton}
                        onPress={() => handlePickDocument(doc.id)}
                      >
                        <Ionicons
                          name={doc.fileName ? "refresh-outline" : "cloud-upload-outline"}
                          size={14}
                          color="#38BDF8"
                        />
                        <Text style={styles.uploadDocActionButtonText}>
                          {doc.fileName ? "Replace" : "Upload"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Security & Password Drawer */}
        <View style={styles.drawerContainer}>
          <Pressable
            style={styles.drawerHeader}
            onPress={() => setPasswordDrawerOpen(!passwordDrawerOpen)}
          >
            <View style={styles.drawerTitleRow}>
              <Ionicons name="lock-closed-outline" size={16} color="#38BDF8" />
              <Text style={styles.drawerTitleText}>Security & Password</Text>
            </View>
            <Ionicons
              name={passwordDrawerOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="#38BDF8"
            />
          </Pressable>

          {passwordDrawerOpen && (
            <View style={styles.drawerContent}>
              {/* Current Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperEditable]}>
                  <TextInput
                    style={styles.textInput}
                    value={currentPassword}
                    onChangeText={(val) => {
                      setCurrentPassword(val);
                      setPasswordError("");
                    }}
                    secureTextEntry={!showCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#64748B"
                  />
                  <Pressable onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                    <Ionicons
                      name={showCurrentPassword ? "eye-off" : "eye"}
                      size={16}
                      color="#38BDF8"
                    />
                  </Pressable>
                </View>
              </View>

              {/* New Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperEditable]}>
                  <TextInput
                    style={styles.textInput}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      setPasswordError("");
                    }}
                    secureTextEntry={!showNewPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#64748B"
                  />
                  <Pressable onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={16}
                      color="#38BDF8"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm New Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CONFIRM NEW PASSWORD</Text>
                <View style={[styles.inputWrapper, styles.inputWrapperEditable]}>
                  <TextInput
                    style={styles.textInput}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      setPasswordError("");
                    }}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#64748B"
                  />
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={16}
                      color="#38BDF8"
                    />
                  </Pressable>
                </View>
              </View>

              {/* Password Validation Error */}
              {passwordError ? (
                <Text style={styles.modalErrorText}>{passwordError}</Text>
              ) : null}

              {/* Password Success Toast */}
              {passwordSuccessMsg ? (
                <View style={styles.successToast}>
                  <Ionicons name="checkmark-done-circle" size={18} color="#080F21" />
                  <Text style={styles.successToastText}>{passwordSuccessMsg}</Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <Pressable
                style={styles.updatePasswordButton}
                onPress={handleChangePassword}
                disabled={passwordLoading}
              >
                <Ionicons name="key-outline" size={16} color="#080F21" style={{ marginRight: 6 }} />
                <Text style={styles.updatePasswordButtonText}>
                  {passwordLoading ? "UPDATING..." : "UPDATE PASSWORD"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Feedback Success Message */}
        {saveSuccessMsg && (
          <View style={styles.successToast}>
            <Ionicons name="checkmark-done-circle" size={18} color="#080F21" />
            <Text style={styles.successToastText}>Profile updated successfully!</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsGroup}>
          {isEditing ? (
            <>
              <Pressable style={styles.updateButton} onPress={handleSave}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#080F21" style={{ marginRight: 6 }} />
                <Text style={styles.updateButtonText}>SAVE ATHLETE PROFILE</Text>
              </Pressable>

              <Pressable style={styles.cancelButton} onPress={handleCancelEdit}>
                <Text style={styles.cancelButtonText}>CANCEL EDITING</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={styles.updateButton} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={18} color="#080F21" style={{ marginRight: 6 }} />
                <Text style={styles.updateButtonText}>EDIT ATHLETE PROFILE</Text>
              </Pressable>

              {onLogout && (
                <Pressable style={styles.logoutButton} onPress={() => setShowLogoutModal(true)}>
                  <Text style={styles.logoutButtonText}>LOGOUT</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </View>

      {/* Add Document Modal */}
      <Modal
        visible={showAddDocModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddDocModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAddDocModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD ELIGIBLE DOCUMENT</Text>
              <Pressable onPress={() => setShowAddDocModal(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Input document name & upload official file before saving to profile
            </Text>

            {/* Document Name Input */}
            <View style={styles.modalFieldGroup}>
              <Text style={styles.fieldLabel}>DOCUMENT NAME</Text>
              <View style={[styles.inputWrapper, styles.inputWrapperEditable]}>
                <TextInput
                  style={styles.textInput}
                  value={newDocTitle}
                  onChangeText={(val) => {
                    setNewDocTitle(val);
                    setAddDocError("");
                  }}
                  placeholder="e.g. PSA Birth Certificate, Medical Clearance"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            {/* Document File Picker Box */}
            <View style={styles.modalFieldGroup}>
              <Text style={styles.fieldLabel}>ATTACH FILE (PDF or IMAGE)</Text>
              <Pressable
                style={styles.filePickerBox}
                onPress={handlePickModalDocument}
              >
                <Ionicons
                  name={newDocAsset ? "document-attach" : "cloud-upload-outline"}
                  size={24}
                  color="#38BDF8"
                />
                <View style={styles.filePickerTextGroup}>
                  <Text style={styles.filePickerMainText} numberOfLines={1}>
                    {newDocAsset ? newDocAsset.name : "Tap to Select Document File"}
                  </Text>
                  <Text style={styles.filePickerSubText}>
                    {newDocAsset ? "File attached cleanly" : "PDF, JPEG, or PNG formats"}
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Validation Error Message */}
            {addDocError ? (
              <Text style={styles.modalErrorText}>{addDocError}</Text>
            ) : null}

            {/* Modal Action Buttons */}
            <View style={styles.modalActionRow}>
              <Pressable
                style={styles.modalSaveButton}
                onPress={handleSaveNewDocument}
              >
                <Ionicons name="checkmark" size={16} color="#080F21" style={{ marginRight: 4 }} />
                <Text style={styles.modalSaveButtonText}>Save Document</Text>
              </Pressable>

              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowAddDocModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>



      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCategoryPicker(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT SPORT CATEGORY</Text>
              <Pressable onPress={() => setShowCategoryPicker(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Choose your primary athletic division
            </Text>

            <View style={styles.categoryListGroup}>
              {categoriesList.map((item) => {
                const isSelected = item === category;
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.categoryOptionCard,
                      isSelected && styles.categoryOptionCardSelected,
                    ]}
                    onPress={() => selectCategoryOption(item)}
                  >
                    <View style={styles.categoryOptionLeft}>
                      <Ionicons
                        name={
                          item === "BASKETBALL"
                            ? "basketball-outline"
                            : item === "SWIMMING"
                              ? "water-outline"
                              : "fitness-outline"
                        }
                        size={20}
                        color={isSelected ? "#38BDF8" : "#94A3B8"}
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          isSelected && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#38BDF8" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLogoutModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CONFIRM LOGOUT</Text>
              <Pressable onPress={() => setShowLogoutModal(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Are you sure you want to log out of your account?
            </Text>

            <View style={styles.modalActionRow}>
              <Pressable
                style={styles.logoutConfirmButton}
                onPress={() => {
                  setShowLogoutModal(false);
                  onLogout?.();
                }}
              >
                <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.logoutConfirmButtonText}>LOG OUT</Text>
              </Pressable>

              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>CANCEL</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Birthdate Calendar Picker Modal */}
      <Modal
        visible={showDatePickerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDatePickerModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SELECT BIRTHDATE</Text>
              <Pressable onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              Tap Month or Year to quickly jump, or select day below
            </Text>

            {/* Calendar Header Bar (Prev, Month / Year Toggles, Next) */}
            <View style={styles.calendarNavRow}>
              <Pressable style={styles.calendarNavBtn} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={18} color="#38BDF8" />
              </Pressable>

              <View style={styles.calendarNavTitleGroup}>
                <Pressable
                  style={[
                    styles.calendarSelectorPill,
                    calendarMode === "MONTHS" && styles.calendarSelectorPillActive,
                  ]}
                  onPress={() =>
                    setCalendarMode(calendarMode === "MONTHS" ? "DAYS" : "MONTHS")
                  }
                >
                  <Text style={styles.calendarSelectorText}>
                    {MONTH_NAMES[pickerMonth]}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color="#38BDF8" />
                </Pressable>

                <Pressable
                  style={[
                    styles.calendarSelectorPill,
                    calendarMode === "YEARS" && styles.calendarSelectorPillActive,
                  ]}
                  onPress={() =>
                    setCalendarMode(calendarMode === "YEARS" ? "DAYS" : "YEARS")
                  }
                >
                  <Text style={styles.calendarSelectorText}>{pickerYear}</Text>
                  <Ionicons name="chevron-down" size={12} color="#38BDF8" />
                </Pressable>
              </View>

              <Pressable style={styles.calendarNavBtn} onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
              </Pressable>
            </View>

            {/* View Mode: DAYS */}
            {calendarMode === "DAYS" && (
              <View style={styles.calendarGridContainer}>
                {/* Days of week header */}
                <View style={styles.calendarWeekRow}>
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <Text key={idx} style={styles.calendarWeekText}>
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Days grid */}
                <View style={styles.calendarDaysGrid}>
                  {Array.from(
                    { length: new Date(pickerYear, pickerMonth, 1).getDay() },
                    (_, i) => i
                  ).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.calendarDayCell} />
                  ))}
                  {Array.from(
                    { length: new Date(pickerYear, pickerMonth + 1, 0).getDate() },
                    (_, i) => i + 1
                  ).map((dayNum) => {
                    const yyyy = pickerYear;
                    const mm = String(pickerMonth + 1).padStart(2, "0");
                    const dd = String(dayNum).padStart(2, "0");
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    const isSelected = birthdate === dateStr;

                    return (
                      <Pressable
                        key={dayNum}
                        style={[
                          styles.calendarDayCell,
                          isSelected && styles.calendarDayCellSelected,
                        ]}
                        onPress={() => handleSelectDay(dayNum)}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* View Mode: MONTHS */}
            {calendarMode === "MONTHS" && (
              <View style={styles.calendarMonthsGrid}>
                {MONTH_NAMES.map((mName, mIdx) => {
                  const isSelected = mIdx === pickerMonth;
                  return (
                    <Pressable
                      key={mName}
                      style={[
                        styles.calendarMonthItem,
                        isSelected && styles.calendarMonthItemSelected,
                      ]}
                      onPress={() => {
                        setPickerMonth(mIdx);
                        setCalendarMode("DAYS");
                      }}
                    >
                      <Text
                        style={[
                          styles.calendarMonthText,
                          isSelected && styles.calendarMonthTextSelected,
                        ]}
                      >
                        {mName.substring(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* View Mode: YEARS */}
            {calendarMode === "YEARS" && (
              <ScrollView
                style={styles.calendarYearsScrollView}
                contentContainerStyle={styles.calendarYearsGrid}
                showsVerticalScrollIndicator={true}
              >
                {YEARS_LIST.map((yr) => {
                  const isSelected = yr === pickerYear;
                  return (
                    <Pressable
                      key={yr}
                      style={[
                        styles.calendarYearItem,
                        isSelected && styles.calendarYearItemSelected,
                      ]}
                      onPress={() => {
                        setPickerYear(yr);
                        setCalendarMode("DAYS");
                      }}
                    >
                      <Text
                        style={[
                          styles.calendarYearText,
                          isSelected && styles.calendarYearTextSelected,
                        ]}
                      >
                        {yr}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setShowDatePickerModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function ProfileSkeletonLoader() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.skeletonPill, { width: 140, height: 32 }]} />
      <View style={[styles.profileMainCard, { height: 500, opacity: 0.6 }]} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080F21",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sectionHeadingContainer: {},
  mainTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  activeUnderline: {
    width: 42,
    height: 3,
    backgroundColor: "#38BDF8",
    borderRadius: 2,
    marginTop: 6,
  },
  headerEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerEditButtonInactive: {
    borderColor: "#38BDF8",
    backgroundColor: "#10233D",
  },
  headerEditButtonActive: {
    borderColor: "#FF4D4D",
    backgroundColor: "#33141E",
  },
  headerEditButtonText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  editingBanner: {
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  editingBannerText: {
    color: "#080F21",
    fontSize: 12,
    fontWeight: "800",
  },
  profileMainCard: {
    backgroundColor: "#111C35",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E2C4A",
    marginBottom: 20,
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  avatarBox: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: "#1C2943",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatarImage: {
    width: 50,
    height: 50,
    tintColor: "#FFFFFF",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    backgroundColor: "#38BDF8",
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#111C35",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  inputWrapper: {
    backgroundColor: "#16233E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#223354",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputWrapperEditable: {
    borderColor: "#38BDF8",
    backgroundColor: "#152844",
  },
  textInput: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    padding: 0,
    flex: 1,
  },
  rowTwoFields: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dropdownWrapper: {
    backgroundColor: "#16233E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#223354",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  physicalStatsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  cyanAccentBar: {
    width: 3,
    height: 16,
    backgroundColor: "#38BDF8",
    borderRadius: 2,
    marginRight: 8,
  },
  physicalStatsTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  horizontalDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#203050",
    marginLeft: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#16233E",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#223354",
  },
  statBoxEditable: {
    borderColor: "#38BDF8",
    backgroundColor: "#152844",
  },
  statBoxLabel: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  statBoxValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  statBoxValueInput: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    padding: 0,
    minWidth: 40,
  },
  statBoxUnit: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },
  drawerContainer: {
    backgroundColor: "#0C152B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1B2A48",
    padding: 12,
    marginBottom: 18,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  drawerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  drawerTitleText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
  },
  drawerContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1B2A48",
    gap: 12,
  },
  calculatedItem: {
    gap: 2,
  },
  calcLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },
  calcValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  calcUnit: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "700",
  },
  calcFormula: {
    color: "#64748B",
    fontSize: 10,
    fontStyle: "italic",
  },
  affiliationSection: {
    marginBottom: 20,
  },
  affiliationCard: {
    backgroundColor: "#0B1327",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1B2A48",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  affiliationLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  shieldIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#162441",
    justifyContent: "center",
    alignItems: "center",
  },
  affiliationTextGroup: {
    marginLeft: 12,
    flex: 1,
  },
  teamNameText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  sportTagText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  documentsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  addDocButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#16233E",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#223354",
  },
  addDocButtonText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
  },
  documentsSubtitleText: {
    color: "#64748B",
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  documentsCardList: {
    gap: 10,
  },
  documentItemCard: {
    backgroundColor: "#0B1327",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1B2A48",
  },
  docHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  docTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  docTitleInput: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    padding: 0,
    flex: 1,
  },
  deleteDocButton: {
    padding: 4,
    marginLeft: 8,
  },
  docFileDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#15223A",
  },
  docFileMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  docFileNameText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 140,
  },
  docUploadedAtText: {
    color: "#64748B",
    fontSize: 10,
  },
  docNoFileText: {
    color: "#64748B",
    fontSize: 11,
    fontStyle: "italic",
    flex: 1,
  },
  uploadDocActionButton: {
    backgroundColor: "#162540",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#25385C",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  uploadDocActionButtonText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
  },
  modalFieldGroup: {
    marginBottom: 16,
  },
  filePickerBox: {
    backgroundColor: "#16233E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#223354",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  filePickerTextGroup: {
    flex: 1,
  },
  filePickerMainText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  filePickerSubText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  modalErrorText: {
    color: "#FF4D4D",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  modalSaveButtonText: {
    color: "#080F21",
    fontSize: 14,
    fontWeight: "900",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#64748B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "800",
  },
  successToast: {
    backgroundColor: "#38BDF8",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  successToastText: {
    color: "#080F21",
    fontSize: 13,
    fontWeight: "800",
  },
  updatePasswordButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
  },
  updatePasswordButtonText: {
    color: "#080F21",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  actionButtonsGroup: {
    gap: 12,
    marginTop: 8,
  },
  updateButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonText: {
    color: "#080F21",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#64748B",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  logoutButton: {
    backgroundColor: "#FF4D4D",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  logoutConfirmButton: {
    flex: 1,
    backgroundColor: "#FF4D4D",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  logoutConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(4, 9, 20, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#111C35",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#1E2C4A",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  categoryListGroup: {
    gap: 10,
    marginBottom: 18,
  },
  categoryOptionCard: {
    backgroundColor: "#16233E",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#223354",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryOptionCardSelected: {
    borderColor: "#38BDF8",
    backgroundColor: "#152844",
  },
  categoryOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryOptionText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "800",
  },
  categoryOptionTextSelected: {
    color: "#FFFFFF",
  },
  modalCloseButton: {
    backgroundColor: "#38BDF8",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseButtonText: {
    color: "#080F21",
    fontSize: 14,
    fontWeight: "900",
  },
  skeletonPill: {
    backgroundColor: "#16233E",
    borderRadius: 8,
    marginBottom: 16,
  },
  calendarNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  calendarNavBtn: {
    backgroundColor: "#16233E",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#223354",
  },
  calendarNavTitleGroup: {
    flexDirection: "row",
    gap: 8,
  },
  calendarSelectorPill: {
    backgroundColor: "#16233E",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#223354",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calendarSelectorPillActive: {
    borderColor: "#38BDF8",
    backgroundColor: "#152844",
  },
  calendarSelectorText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  calendarGridContainer: {
    marginBottom: 16,
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarWeekText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    width: "14%",
    textAlign: "center",
  },
  calendarDaysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDayCell: {
    width: "14%",
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginVertical: 2,
  },
  calendarDayCellSelected: {
    backgroundColor: "#38BDF8",
  },
  calendarDayText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },
  calendarDayTextSelected: {
    color: "#080F21",
    fontWeight: "900",
  },
  calendarMonthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  calendarMonthItem: {
    width: "30%",
    backgroundColor: "#16233E",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#223354",
  },
  calendarMonthItemSelected: {
    borderColor: "#38BDF8",
    backgroundColor: "#152844",
  },
  calendarMonthText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "800",
  },
  calendarMonthTextSelected: {
    color: "#38BDF8",
  },
  calendarYearsScrollView: {
    maxHeight: 200,
    marginBottom: 16,
  },
  calendarYearsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calendarYearItem: {
    width: "30%",
    backgroundColor: "#16233E",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#223354",
  },
  calendarYearItemSelected: {
    borderColor: "#38BDF8",
    backgroundColor: "#152844",
  },
  calendarYearText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "800",
  },
  calendarYearTextSelected: {
    color: "#38BDF8",
  },

  /* WORKLOAD ANALYTICS STYLES */
  workloadAcwrCard: {
    backgroundColor: "#0D1B2A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  workloadAcwrHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  workloadSubLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  workloadAcwrValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
  },
  workloadStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  workloadStatusText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  workloadDescText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 14,
  },
  loadComparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111C35",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  loadBoxLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
  },
  loadBoxValue: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 2,
  },
  loadVerticalDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#1E293B",
  },
  weeklyLogSection: {
    marginTop: 6,
  },
  weeklyLogHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  weeklyLogTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  coachBadgeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#111C35",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  coachBadgeText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dailyLogsScrollContent: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  dailyLogCard: {
    width: 76,
    backgroundColor: "#0D1B2A",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  dailyLogDate: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 4,
  },
  dailyLogDuration: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },
  srpeTag: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  srpeTagText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "800",
  },
  dailyLoadText: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },
});

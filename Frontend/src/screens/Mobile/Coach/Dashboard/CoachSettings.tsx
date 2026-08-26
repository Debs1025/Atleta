import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CoachSettingsData, DEFAULT_COACH_SETTINGS } from "../DataTypes";
import { requestAuthenticatedJson } from "../../Authentication/authShared";
import styles from "./styles/CoachSettings";

export interface CoachSettingsProps {
  settings?: CoachSettingsData;
  onUpdateSettings?: (updated: CoachSettingsData) => void;
  onBack?: () => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

// Helper Reusable Password Input Field Component
const PasswordInputField = ({
  label,
  value,
  placeholder,
  onChangeText,
  isSecure,
  onToggleSecure,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
  isSecure: boolean;
  onToggleSecure: () => void;
}) => (
  <>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputWrapper}>
      <TextInput
        style={styles.passwordInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        secureTextEntry={isSecure}
      />
      <TouchableOpacity onPress={onToggleSecure}>
        <Ionicons
          name={isSecure ? "eye-off-outline" : "eye-outline"}
          size={20}
          color="#64748B"
        />
      </TouchableOpacity>
    </View>
  </>
);

// API Request: update coach settings & preferences (PUT /api/coach/settings)
export function CoachSettings({
  settings = DEFAULT_COACH_SETTINGS,
  onUpdateSettings,
  onBack,
  onLogout,
  onChangePassword,
  onOpenTerms,
  onOpenPrivacy,
}: CoachSettingsProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

  // Local Reactive Client State
  const [settingsState, setSettingsState] = useState<CoachSettingsData>(settings);

  // Modals & Passwords State
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showPasswordSuccessModal, setShowPasswordSuccessModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentSec, setShowCurrentSec] = useState(true);
  const [showNewSec, setShowNewSec] = useState(true);
  const [showConfirmSec, setShowConfirmSec] = useState(true);
  const [passwordError, setPasswordError] = useState("");

  // Update Setting Helper with live backend sync
  const updateSetting = async (key: keyof CoachSettingsData, value: any) => {
    const updated = { ...settingsState, [key]: value, updated_at: new Date().toISOString() };
    setSettingsState(updated);
    if (onUpdateSettings) onUpdateSettings(updated);

    try {
      await requestAuthenticatedJson("/coaches/me/settings", "PATCH", {
        data_sync_preference: updated.data_sync_preference,
        notification_preferences: {
          game_log_updates: updated.game_log_updates,
          recruitment_inquiries: updated.recruitment_inquiries,
        },
      });
    } catch (err) {
      console.warn("Settings sync error:", err);
    }
  };

  const handleOpenChangePassword = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowCurrentSec(true);
    setShowNewSec(true);
    setShowConfirmSec(true);
    setShowChangePasswordModal(true);
    if (onChangePassword) onChangePassword();
  };

  const handleSavePassword = async () => {
    if (!currentPassword.trim()) return setPasswordError("Current password is required.");
    if (newPassword.length < 6) return setPasswordError("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setPasswordError("New password and confirm password do not match.");

    try {
      await requestAuthenticatedJson("/users/change-password", "POST", { password: newPassword });
      setPasswordError("");
      setShowChangePasswordModal(false);
      setShowPasswordSuccessModal(true);
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password.");
    }
  };

  const isSyncAuto = settingsState.data_sync_preference === "Automatic";

  return (
    <View style={styles.container}>
      {/* FIXED TOP HEADER */}
      <View style={[styles.fixedHeaderContainer, { paddingTop: headerTopPadding }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SETTINGS</Text>
        </View>
      </View>

      {/* SCROLLABLE SETTINGS BODY */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerTopPadding + 70 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* PRIVACY & DATA */}
        <Text style={styles.sectionLabel}>PRIVACY & DATA</Text>
        <View style={styles.cardBox}>
          <View style={styles.rowItem}>
            <View style={styles.itemLeftContent}>
              <Text style={styles.itemTitle}>Data Sync Preference</Text>
              <Text style={styles.itemSubtext}>
                {isSyncAuto ? "Automatic background sync" : "Manual sync required for all logs"}
              </Text>
            </View>
            <Switch
              value={isSyncAuto}
              onValueChange={(val) => updateSetting("data_sync_preference", val ? "Automatic" : "Manual")}
              trackColor={{ false: "#1E293B", true: "#00C8FF" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* APPLICATION PREFERENCES */}
        <Text style={styles.sectionLabel}>APPLICATION PREFERENCES</Text>
        <View style={styles.cardBox}>
          <View style={[styles.rowItem, styles.rowBorder]}>
            <Text style={styles.itemTitle}>Game Log Updates</Text>
            <Switch
              value={settingsState.game_log_updates}
              onValueChange={(val) => updateSetting("game_log_updates", val)}
              trackColor={{ false: "#1E293B", true: "#00C8FF" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.itemTitle}>Recruitment Inquiries</Text>
            <Switch
              value={settingsState.recruitment_inquiries}
              onValueChange={(val) => updateSetting("recruitment_inquiries", val)}
              trackColor={{ false: "#1E293B", true: "#00C8FF" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* SECURITY & COMPLIANCE */}
        <Text style={styles.sectionLabel}>SECURITY & COMPLIANCE</Text>
        <View style={styles.cardBox}>
          <TouchableOpacity style={[styles.rowItem, styles.rowBorder]} onPress={handleOpenChangePassword} activeOpacity={0.7}>
            <Text style={styles.itemTitle}>Change Password</Text>
            <Ionicons name="key-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.rowItem, styles.rowBorder]} onPress={onOpenTerms} activeOpacity={0.7}>
            <Text style={styles.itemTitle}>Terms of Service</Text>
            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.rowItem} onPress={onOpenPrivacy} activeOpacity={0.7}>
            <Text style={styles.itemTitle}>Privacy Protocol</Text>
            <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)} activeOpacity={0.8}>
          <Text style={styles.logoutText}>LOG OUT</Text>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <TouchableOpacity style={styles.confirmOverlayBackdrop} activeOpacity={1} onPress={() => setShowLogoutModal(false)}>
          <View style={styles.confirmDialogCard}>
            <View style={styles.logoutIconCircle}>
              <Ionicons name="log-out-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.logoutConfirmTitle}>Log Out Account?</Text>
            <Text style={styles.logoutConfirmMessage}>
              Are you sure you want to log out of your Coach session? You will need to log back in to access your teams.
            </Text>
            <View style={styles.confirmButtonRow}>
              <TouchableOpacity style={styles.cancelLogoutButton} onPress={() => setShowLogoutModal(false)} activeOpacity={0.8}>
                <Text style={styles.cancelLogoutText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmLogoutButton}
                onPress={() => {
                  setShowLogoutModal(false);
                  if (onLogout) onLogout();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmLogoutText}>YES, LOG OUT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal visible={showChangePasswordModal} transparent animationType="slide" onRequestClose={() => setShowChangePasswordModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowChangePasswordModal(false)}>
          <TouchableOpacity style={styles.modalContentCard} activeOpacity={1} onPress={(e) => e.stopPropagation?.()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CHANGE PASSWORD</Text>
              <TouchableOpacity onPress={() => setShowChangePasswordModal(false)}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <PasswordInputField
              label="CURRENT PASSWORD *"
              value={currentPassword}
              placeholder="Current Password"
              onChangeText={setCurrentPassword}
              isSecure={showCurrentSec}
              onToggleSecure={() => setShowCurrentSec(!showCurrentSec)}
            />

            <PasswordInputField
              label="NEW PASSWORD *"
              value={newPassword}
              placeholder="New Password"
              onChangeText={setNewPassword}
              isSecure={showNewSec}
              onToggleSecure={() => setShowNewSec(!showNewSec)}
            />

            <PasswordInputField
              label="CONFIRM PASSWORD *"
              value={confirmPassword}
              placeholder="Confirm Password"
              onChangeText={setConfirmPassword}
              isSecure={showConfirmSec}
              onToggleSecure={() => setShowConfirmSec(!showConfirmSec)}
            />

            {Boolean(passwordError) && <Text style={styles.errorText}>{passwordError}</Text>}

            <TouchableOpacity style={styles.primaryCtaBtn} onPress={handleSavePassword} activeOpacity={0.8}>
              <Text style={styles.primaryCtaBtnText}>UPDATE PASSWORD</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* PASSWORD CHANGED SUCCESS MODAL */}
      <Modal visible={showPasswordSuccessModal} transparent animationType="fade" onRequestClose={() => setShowPasswordSuccessModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPasswordSuccessModal(false)}>
          <View style={styles.modalContentCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle-sharp" size={44} color="#00C8FF" />
            </View>
            <Text style={styles.successTitle}>PASSWORD UPDATED !</Text>
            <Text style={styles.successMessage}>
              Your coach account password has been successfully updated. Please use your new password next time you log in.
            </Text>
            <TouchableOpacity style={styles.primaryCtaBtn} onPress={() => setShowPasswordSuccessModal(false)} activeOpacity={0.85}>
              <Text style={styles.primaryCtaBtnText}>CONTINUE</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default CoachSettings;

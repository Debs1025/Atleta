import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import styles from "./styles/AthleteProfilePage";
import { Ionicons } from "@expo/vector-icons";
import { AthleteProfile } from "../Dashboard/HomeAnalyticsPage";

// Overtraining / Workload Warning Modal Component
export interface WorkloadWarningModalProps {
  visible: boolean;
  onClose: () => void;
}

export function WorkloadWarningModal({ visible, onClose }: WorkloadWarningModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: "#EF4444" }]}>
              OVERTRAINING RISK WARNING
            </Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </Pressable>
          </View>

          <Text style={{ color: "#F87171", fontSize: 13, lineHeight: 18, marginBottom: 16 }}>
            High workload ratio or workout monotony detected! Rest and recovery are strongly advised to prevent acute physical injury.
          </Text>

          <Pressable
            style={{ backgroundColor: "#EF4444", borderRadius: 10, paddingVertical: 12, alignItems: "center" }}
            onPress={onClose}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 }}>
              I UNDERSTAND &amp; WILL REST
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Add Eligible Document Modal Component
export interface AddDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  newDocTitle: string;
  setNewDocTitle: (val: string) => void;
  newDocAsset: { name: string; uri: string } | null;
  addDocError: string;
  setAddDocError: (val: string) => void;
  onPickDocument: () => void;
  onSaveDocument: () => void;
}

export function AddDocumentModal({
  visible,
  onClose,
  newDocTitle,
  setNewDocTitle,
  newDocAsset,
  addDocError,
  setAddDocError,
  onPickDocument,
  onSaveDocument,
}: AddDocumentModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>ADD ELIGIBLE DOCUMENT</Text>
            <Pressable onPress={onClose}>
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
            <Pressable style={styles.filePickerBox} onPress={onPickDocument}>
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
                  {newDocAsset ? "File attached." : "PDF, JPEG, or PNG formats"}
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
            <Pressable style={styles.modalSaveButton} onPress={onSaveDocument}>
              <Ionicons name="checkmark" size={16} color="#080F21" style={{ marginRight: 4 }} />
              <Text style={styles.modalSaveButtonText}>Save Document</Text>
            </Pressable>

            <Pressable style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Sport Category Picker Modal Component
export interface CategoryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  categoriesList: Array<AthleteProfile["category"]>;
  category: AthleteProfile["category"];
  onSelectCategory: (cat: AthleteProfile["category"]) => void;
}

export function CategoryPickerModal({
  visible,
  onClose,
  categoriesList,
  category,
  onSelectCategory,
}: CategoryPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>SELECT SPORT CATEGORY</Text>
            <Pressable onPress={onClose}>
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
                  onPress={() => onSelectCategory(item)}
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

          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <Text style={styles.modalCloseButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Logout Confirmation Modal Component
export interface LogoutConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmLogout?: () => void;
}

export function LogoutConfirmModal({
  visible,
  onClose,
  onConfirmLogout,
}: LogoutConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
          onPress={onClose}
        />
        <View style={[styles.modalCard, { zIndex: 10, elevation: 10 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>CONFIRM LOGOUT</Text>
            <Pressable onPress={onClose} hitSlop={10}>
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
                onClose();
                onConfirmLogout?.();
              }}
            >
              <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.logoutConfirmButtonText}>LOG OUT</Text>
            </Pressable>

            <Pressable style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelButtonText}>CANCEL</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Calendar Date Picker Modal Component
export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  pickerYear: number;
  pickerMonth: number;
  calendarMode: "DAYS" | "MONTHS" | "YEARS";
  setCalendarMode: (mode: "DAYS" | "MONTHS" | "YEARS") => void;
  setPickerMonth: (month: number | ((m: number) => number)) => void;
  setPickerYear: (year: number | ((y: number) => number)) => void;
  birthdate: string;
  onSelectDay: (dayNum: number) => void;
  monthNames: string[];
  daysOfWeek: string[];
  yearsList: number[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export function DatePickerModal({
  visible,
  onClose,
  pickerYear,
  pickerMonth,
  calendarMode,
  setCalendarMode,
  setPickerMonth,
  setPickerYear,
  birthdate,
  onSelectDay,
  monthNames,
  daysOfWeek,
  yearsList,
  onPrevMonth,
  onNextMonth,
}: DatePickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>SELECT BIRTHDATE</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </Pressable>
          </View>

          <Text style={styles.modalSubtitle}>
            Tap Month or Year to quickly jump, or select day below
          </Text>

          {/* Calendar Header Bar */}
          <View style={styles.calendarNavRow}>
            <Pressable style={styles.calendarNavBtn} onPress={onPrevMonth}>
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
                  {monthNames[pickerMonth]}
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

            <Pressable style={styles.calendarNavBtn} onPress={onNextMonth}>
              <Ionicons name="chevron-forward" size={18} color="#38BDF8" />
            </Pressable>
          </View>

          {/* View Mode: DAYS */}
          {calendarMode === "DAYS" && (
            <View style={styles.calendarGridContainer}>
              <View style={styles.calendarWeekRow}>
                {daysOfWeek.map((day, idx) => (
                  <Text key={idx} style={styles.calendarWeekText}>
                    {day}
                  </Text>
                ))}
              </View>

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
                      onPress={() => onSelectDay(dayNum)}
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
              {monthNames.map((mName, mIdx) => {
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
              {yearsList.map((yr) => {
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

          <Pressable style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

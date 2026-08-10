import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";

import styles from "./styles/OCRlogging";
import { RawOCRDetectedData } from "./OCRoutput";

// Client State Schema Models
export interface UploadedFileItem {
    upload_id: string;
    file_name: string;
    file_size_bytes: number;
    uploaded_at_relative: string;
    file_type: "PDF" | "CSV" | "JSON" | "IMAGE";
    file_url: string;
}

interface OCRloggingProps {
    onBack?: () => void;
    onUploadSuccess?: (ocrData: RawOCRDetectedData) => void;
}

// Sample Initial Mock Files
// BACKEND CONNECT NOTE: Remove initial mock array when linking to backend api
const INITIAL_MOCK_FILES: UploadedFileItem[] = [
    {
        upload_id: "upl_001",
        file_name: "SEASON_FINALS_2023.CSV",
        file_size_bytes: 1258291,
        uploaded_at_relative: "Uploaded 2h ago",
        file_type: "CSV",
        file_url: "file://mock/SEASON_FINALS_2023.CSV",
    },
    {
        upload_id: "upl_002",
        file_name: "ATHLETE_REPORT_JULY.PDF",
        file_size_bytes: 5033164, // 4.8 MB
        uploaded_at_relative: "Uploaded yesterday",
        file_type: "PDF",
        file_url: "file://mock/ATHLETE_REPORT_JULY.PDF",
    },
    {
        upload_id: "upl_003",
        file_name: "TRAINING_LOG_B.CSV",
        file_size_bytes: 862208, // 842 KB
        uploaded_at_relative: "Uploaded 3 days ago",
        file_type: "CSV",
        file_url: "file://mock/TRAINING_LOG_B.CSV",
    },
];

// Helper to format file size in human readable string
const formatFileSize = (bytes: number): string => {
    if (bytes >= 1048576) {
        return `${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
};

export function OCRlogging({ onBack, onUploadSuccess }: OCRloggingProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 16) + 12;

    // Uploaded Files State
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>(INITIAL_MOCK_FILES);
    const [isProcessingOCR, setIsProcessingOCR] = useState(false);
    const [previewFile, setPreviewFile] = useState<UploadedFileItem | null>(null);
    const [modalMessage, setModalMessage] = useState<string | null>(null);

    // Document Picker Handler
    const handleBrowseFiles = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ["application/pdf", "text/csv", "application/json", "image/*"],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                let fileType: UploadedFileItem["file_type"] = "CSV";
                if (asset.name.toLowerCase().endsWith(".pdf")) fileType = "PDF";
                else if (asset.name.toLowerCase().endsWith(".json")) fileType = "JSON";
                else if (asset.mimeType?.startsWith("image/")) fileType = "IMAGE";

                const newFile: UploadedFileItem = {
                    upload_id: `upl_${Date.now()}`,
                    file_name: asset.name.toUpperCase(),
                    file_size_bytes: asset.size || 1024 * 500,
                    uploaded_at_relative: "Uploaded just now",
                    file_type: fileType,
                    file_url: asset.uri,
                };

                setUploadedFiles((prev) => [newFile, ...prev]);
            }
        } catch (err) {
            setModalMessage("Could not pick document file.");
        }
    }, []);

    // Camera Action Handler
    const handleTakePhoto = useCallback(() => {
        setModalMessage("Camera scanner initialized. Ready to scan physical game scoresheets.");
    }, []);

    // Delete File Handler
    const handleDeleteFile = useCallback((id: string) => {
        setUploadedFiles((prev) => prev.filter((f) => f.upload_id !== id));
    }, []);

    // Preview File Handler
    const handlePreviewFile = useCallback((file: UploadedFileItem) => {
        setPreviewFile(file);
    }, []);

    // Upload & Trigger OCR Handler
    const handleUploadSubmit = useCallback(() => {
        if (uploadedFiles.length === 0) {
            setModalMessage("Please browse or upload at least one PDF, CSV, or image file first.");
            return;
        }

        setIsProcessingOCR(true);

        /* 
         =============================================================================
         [BACKEND API INTEGRATION POINT]:
         Replace this setTimeout simulation with your actual API endpoint call:
         
         const formData = new FormData();
         formData.append('file', { uri: uploadedFiles[0].file_url, name: uploadedFiles[0].file_name });
         const response = await fetch('YOUR_BACKEND_API_URL/ocr/process', {
           method: 'POST',
           body: formData,
         });
         const parsedData: RawOCRDetectedData = await response.json();
         =============================================================================
        */

        setTimeout(() => {
            setIsProcessingOCR(false);

            // Default parsed sample data matching wireframe image_96e088.png
            const parsedSampleData: RawOCRDetectedData = {
                team_name: "CAMARINES SUR PANTHERS",
                sport_type: "BASKETBALL",
                athlete_overview: [
                    { athlete_id: "ath_1", player_name: "MARCUS V. STEPHENS", pts: 24, ast: 4, to: 8 },
                    { athlete_id: "ath_2", player_name: "JAKE L. RODRIGUEZ", pts: 18, ast: 6, to: 2 },
                    { athlete_id: "ath_3", player_name: "CHEN W. ZHAO", pts: 12, ast: 2, to: 0 },
                    { athlete_id: "ath_4", player_name: "TYSON K. REED", pts: 9, ast: 1, to: 3 },
                    { athlete_id: "ath_5", player_name: "OMAR AL-FADIL", pts: 7, ast: 3, to: 1 },
                ],
                expanded_metrics: {
                    shooting_efficiency: {
                        ft_made: 42,
                        ft_attempts: 56,
                        pt2_made: 31,
                        pt2_attempts: 48,
                        pt3_made: 12,
                        pt3_attempts: 29,
                    },
                    possession_errors: {
                        key_drives: 18,
                        assists: 24,
                        turnovers: 12,
                        scv_12s: 3,
                    },
                },
            };

            if (onUploadSuccess) {
                onUploadSuccess(parsedSampleData);
            }
        }, 1000);
    }, [uploadedFiles, onUploadSuccess]);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* TOP HEADER BAR */}
            <View style={[styles.fixedHeader, { paddingTop: headerTopPadding }]}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>UPLOAD STATS</Text>
                    <TouchableOpacity
                        style={styles.closeIconButton}
                        onPress={onBack}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="close" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

      {/* BODY SCROLL CONTENT */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerTopPadding + 54, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
                {/* TITLE BLOCK */}
                <View style={styles.titleBlock}>
                    <Text style={styles.headline}>OCR DOCUMENT PROCESSING</Text>
                    <Text style={styles.subtitle}>
                        Upload your performance metrics for advanced analysis.
                    </Text>
                </View>

                {/* FILE PICKER CARD */}
                <View style={styles.dropzoneCard}>
                    <View style={styles.dropzoneIconBox}>
                        <Ionicons name="close-outline" size={48} color="#FFFFFF" />
                    </View>
                    <Text style={styles.dropzoneTitle}>SELECT PDF OR CSV FILE</Text>
                    <Text style={styles.dropzoneSubtext}>Maximum file size: 25MB</Text>

                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity
                            style={styles.browseButton}
                            onPress={handleBrowseFiles}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.browseButtonText}>BROWSE FILES</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cameraButton}
                            onPress={handleTakePhoto}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.cameraButtonText}>TAKE PHOTO</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* FILES UPLOADED SECTION */}
                <Text style={styles.sectionLabel}>FILES UPLOADED</Text>
                <View style={styles.filesList}>
                    {uploadedFiles.map((file) => (
                        <View key={file.upload_id} style={styles.fileCard}>
                            <View style={styles.fileCardLeft}>
                                <View style={styles.fileBadge}>
                                    <Ionicons
                                        name={
                                            file.file_type === "PDF"
                                                ? "document-text-outline"
                                                : file.file_type === "IMAGE"
                                                    ? "image-outline"
                                                    : "grid-outline"
                                        }
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fileName} numberOfLines={1}>
                                        {file.file_name}
                                    </Text>
                                    <Text style={styles.fileMeta}>
                                        {formatFileSize(file.file_size_bytes)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.fileActions}>
                                <TouchableOpacity
                                    style={styles.iconControlBtn}
                                    onPress={() => handlePreviewFile(file)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.iconControlBtn}
                                    onPress={() => handleDeleteFile(file.upload_id)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* FOOTER METADATA BAR */}
                <View style={styles.metaGrid}>
                    <View style={styles.metaBox}>
                        <Text style={styles.metaLabel}>SUPPORTED</Text>
                        <Text style={styles.metaValue}>CSV, PDF, JSON</Text>
                    </View>
                    <View style={styles.metaBox}>
                        <Text style={styles.metaLabel}>DATE</Text>
                        <Text style={styles.metaValue}>JUNE 11, 2026</Text>
                    </View>
                </View>

                {/* SUBMIT ACTION BUTTON */}
                <TouchableOpacity
                    style={styles.uploadCtaButton}
                    onPress={handleUploadSubmit}
                    disabled={isProcessingOCR}
                    activeOpacity={0.85}
                >
                    {isProcessingOCR ? (
                        <ActivityIndicator color="#070D19" size="small" />
                    ) : (
                        <Text style={styles.uploadCtaText}>UPLOAD</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* CUSTOM PREVIEW / INFO MODAL */}
            <Modal
                visible={Boolean(previewFile || modalMessage)}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setPreviewFile(null);
                    setModalMessage(null);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.previewModalCard}>
                        <View style={styles.previewHeader}>
                            <Text style={styles.previewTitle}>
                                {previewFile ? previewFile.file_name : "OCR UPLOAD PORTAL"}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setPreviewFile(null);
                                    setModalMessage(null);
                                }}
                            >
                                <Ionicons name="close" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.previewBody}>
                            {previewFile ? (
                                <>
                                    <Ionicons name="document-text-outline" size={38} color="#00C8FF" style={{ marginBottom: 8 }} />
                                     <Text style={styles.previewMetaText}>
                                         File Type: {previewFile.file_type}{"\n"}
                                         Storage Size: {formatFileSize(previewFile.file_size_bytes)}
                                     </Text>
                                </>
                            ) : (
                                <Text style={styles.previewMetaText}>{modalMessage}</Text>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.modalCtaButton}
                            onPress={() => {
                                setPreviewFile(null);
                                setModalMessage(null);
                            }}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.modalCtaText}>CLOSE</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default OCRlogging;

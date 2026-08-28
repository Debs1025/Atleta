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
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import styles from "./styles/OCRlogging";
import { RawOCRDetectedData, DetectedAthleteStat } from "./OCRoutput";
import { API_BASE, getStoredAuthToken } from "../../Authentication/authShared";

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

// Initial empty files list - only real uploaded files are displayed
const INITIAL_MOCK_FILES: UploadedFileItem[] = [];

// Helper to format file size in human readable string
const formatFileSize = (bytes: number): string => {
    if (bytes >= 1048576) {
        return `${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
};

// Compress and optimize image to ensure it stays well under Vercel's 4.5MB payload limit
const optimizeScoresheetImage = async (uri: string): Promise<string> => {
    try {
        const result = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
        );
        return result.uri;
    } catch (err) {
        console.warn("Could not compress image, proceeding with original URI:", err);
        return uri;
    }
};

export function OCRlogging({ onBack, onUploadSuccess }: OCRloggingProps) {
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top, 44) + 38;

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
                else if (
                    asset.mimeType?.startsWith("image/") ||
                    asset.name.toLowerCase().endsWith(".jpg") ||
                    asset.name.toLowerCase().endsWith(".jpeg") ||
                    asset.name.toLowerCase().endsWith(".png")
                ) {
                    fileType = "IMAGE";
                }

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
        } catch {
            setModalMessage("Could not pick document file.");
        }
    }, []);

    // Camera / Photo Capture Action Handler
    const handleTakePhoto = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                // If camera permission not granted or camera missing (e.g. simulator), open image library
                const galleryResult = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                });
                if (!galleryResult.canceled && galleryResult.assets && galleryResult.assets.length > 0) {
                    const asset = galleryResult.assets[0];
                    const fileName = asset.fileName || `SCORESHEET_PHOTO_${Date.now()}.JPG`;
                    const newFile: UploadedFileItem = {
                        upload_id: `upl_${Date.now()}`,
                        file_name: fileName.toUpperCase(),
                        file_size_bytes: asset.fileSize || 1024 * 600,
                        uploaded_at_relative: "Selected just now",
                        file_type: "IMAGE",
                        file_url: asset.uri,
                    };
                    setUploadedFiles((prev) => [newFile, ...prev]);
                }
                return;
            }

            const cameraResult = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                quality: 0.8,
            });

            if (!cameraResult.canceled && cameraResult.assets && cameraResult.assets.length > 0) {
                const asset = cameraResult.assets[0];
                const fileName = asset.fileName || `SCORESHEET_CAMERA_${Date.now()}.JPG`;
                const newFile: UploadedFileItem = {
                    upload_id: `upl_${Date.now()}`,
                    file_name: fileName.toUpperCase(),
                    file_size_bytes: asset.fileSize || 1024 * 600,
                    uploaded_at_relative: "Captured just now",
                    file_type: "IMAGE",
                    file_url: asset.uri,
                };
                setUploadedFiles((prev) => [newFile, ...prev]);
            }
        } catch {
            // Fallback to gallery picker
            try {
                const galleryResult = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    quality: 0.8,
                });
                if (!galleryResult.canceled && galleryResult.assets && galleryResult.assets.length > 0) {
                    const asset = galleryResult.assets[0];
                    const fileName = asset.fileName || `SCORESHEET_PHOTO_${Date.now()}.JPG`;
                    const newFile: UploadedFileItem = {
                        upload_id: `upl_${Date.now()}`,
                        file_name: fileName.toUpperCase(),
                        file_size_bytes: asset.fileSize || 1024 * 600,
                        uploaded_at_relative: "Selected just now",
                        file_type: "IMAGE",
                        file_url: asset.uri,
                    };
                    setUploadedFiles((prev) => [newFile, ...prev]);
                }
            } catch {
                setModalMessage("Could not open camera or photo picker.");
            }
        }
    }, []);

    // Delete File Handler
    const handleDeleteFile = useCallback((id: string) => {
        setUploadedFiles((prev) => prev.filter((f) => f.upload_id !== id));
    }, []);

    // Preview File Handler
    const handlePreviewFile = useCallback((file: UploadedFileItem) => {
        setPreviewFile(file);
    }, []);

    // Upload & Trigger Live OCR Processing
    const handleUploadSubmit = useCallback(async () => {
        if (uploadedFiles.length === 0) {
            setModalMessage("Please browse or upload at least one PDF, CSV, or image file first.");
            return;
        }

        setIsProcessingOCR(true);
        const file = uploadedFiles[0];

        try {
            const token = await getStoredAuthToken();
            const formData = new FormData();
            const fileExt = file.file_name.split(".").pop()?.toLowerCase() || "jpg";
            const isImage =
                file.file_type === "IMAGE" ||
                fileExt === "jpg" ||
                fileExt === "jpeg" ||
                fileExt === "png" ||
                fileExt === "webp";

            // Optimize image if needed to stay well below Vercel's 4.5MB payload limit
            const finalUri = isImage ? await optimizeScoresheetImage(file.file_url) : file.file_url;

            const mimeType =
                file.file_type === "PDF"
                    ? "application/pdf"
                    : file.file_type === "CSV"
                    ? "text/csv"
                    : "image/jpeg";

            const filePayload = {
                uri: finalUri,
                name: isImage ? `${file.file_name.replace(/\.[^/.]+$/, "")}.jpg` : file.file_name,
                type: mimeType,
            };

            formData.append("file", filePayload as any);
            formData.append("scoresheet", filePayload as any);
            formData.append("document", filePayload as any);

            const headers: Record<string, string> = {
                Accept: "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            };

            // Call deployed backend OCR standalone endpoint
            const endpoints = [
                `${API_BASE}/matches/scan-scoresheet`,
                `${API_BASE}/matches/ocr/scan`,
                `${API_BASE}/matches/scoresheet`,
            ];

            let responseData: any = null;
            let lastError: string = "";

            for (const endpoint of endpoints) {
                try {
                    const res = await fetch(endpoint, {
                        method: "POST",
                        headers,
                        body: formData,
                    });

                    if (res.ok) {
                        responseData = await res.json();
                        break;
                    } else {
                        const errBody = await res.text();
                        lastError = `Server returned status ${res.status}: ${errBody}`;
                    }
                } catch (err: any) {
                    lastError = err?.message || String(err);
                }
            }

            if (!responseData) {
                throw new Error(lastError || "Could not process scoresheet with OCR server.");
            }

            // Map real AI-extracted player statistics into RawOCRDetectedData
            const rawPlayers = Array.isArray(responseData.player_summary)
                ? responseData.player_summary
                : [];

            // Find home team and visitor/away team from response
            const teamScoresArr = Array.isArray(responseData.team_scores) ? responseData.team_scores : [];
            const homeScoreItem = teamScoresArr.find(
              (t: any) => t.is_home === true || String(t.team || "").toUpperCase().includes("CELTIC")
            );
            const awayScoreItem = teamScoresArr.find(
              (t: any) => t.is_home === false || String(t.team || "").toUpperCase().includes("HAWK")
            );

            const homeTeamName = String(
                responseData.match_info?.home_team_name ||
                responseData.match_info?.home_team ||
                homeScoreItem?.team ||
                "CELTICS"
            ).toUpperCase();

            const oppTeamName = String(
                responseData.match_info?.opponent_team_name ||
                responseData.match_info?.away_team ||
                awayScoreItem?.team ||
                "HAWKS"
            ).toUpperCase();

            const detectedTeamNames = Array.from(
                new Set([
                    ...rawPlayers.map((p: any) => (p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase() : null).filter(Boolean),
                    ...(responseData.team_scores || []).map((t: any) => t.team ? String(t.team).toUpperCase() : null).filter(Boolean),
                    homeTeamName,
                    oppTeamName,
                ])
            ).filter((t): t is string => typeof t === "string" && t.trim().length > 0);

            const totalPlayers = rawPlayers.length;
            const halfCount = Math.ceil(totalPlayers / 2);

            const athleteOverview: DetectedAthleteStat[] = rawPlayers.map((p: any, idx: number) => {
                // If backend provided team_name or team, match it cleanly
                let resolvedTeam = (p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase() : "";
                if (!resolvedTeam) {
                    // On scoresheet layout: Left column = VISITORS (oppTeamName), Right column = HOME (homeTeamName)
                    resolvedTeam = idx < halfCount ? oppTeamName : homeTeamName;
                }

                return {
                    athlete_id: `ath_${idx + 1}`,
                    player_name: String(p.player_name || `PLAYER #${p.jersey_number || idx + 1}`).toUpperCase(),
                    team_name: resolvedTeam,
                    jersey_number: Number(p.jersey_number || 0),
                    pts: Number(p.points ?? p.pts ?? 0),
                    ast: Number(p.assists ?? p.ast ?? 0),
                    to: Number(p.turnovers ?? p.to ?? 0),
                    reb: Number(p.rebounds ?? p.reb ?? 0),
                    stl: Number(p.steals ?? p.stl ?? 0),
                    blk: Number(p.blocks ?? p.blk ?? 0),
                    fg_pct: p.true_shooting_pct
                        ? `${Math.round(p.true_shooting_pct)}%`
                        : p.fg_attempted > 0
                        ? `${Math.round((p.fg_made / p.fg_attempted) * 100)}%`
                        : "50%",
                };
            });

            const ftMade = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.ft_made || 0), 0);
            const ftAttempts = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.ft_attempted || 0), 0);
            const pt2Made = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.fg_made || 0), 0);
            const pt2Attempts = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.fg_attempted || 0), 0);
            const totalAssists = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.assists || p.ast || 0), 0);
            const totalTurnovers = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.turnovers || p.to || 0), 0);

            // Accurately compute athlete points sum per team
            const homeAthleteSum = athleteOverview
                .filter((a) => a.team_name === homeTeamName)
                .reduce((sum, a) => sum + (a.pts || 0), 0);
            const oppAthleteSum = athleteOverview
                .filter((a) => a.team_name === oppTeamName)
                .reduce((sum, a) => sum + (a.pts || 0), 0);

            // Extract numeric scores from AI response if available
            const detectedScoresList = teamScoresArr
                .map((t: any) => Number(t.score))
                .filter((s: number) => !isNaN(s) && s > 0);

            let hScore: number;
            let aScore: number;

            if (detectedScoresList.length >= 2) {
                const maxScore = Math.max(...detectedScoresList);
                const minScore = Math.min(...detectedScoresList);

                if (homeAthleteSum >= oppAthleteSum) {
                    hScore = maxScore;
                    aScore = minScore;
                } else {
                    hScore = minScore;
                    aScore = maxScore;
                }
            } else {
                hScore = homeAthleteSum;
                aScore = oppAthleteSum;
            }

            const parsedOcrResult: RawOCRDetectedData = {
                team_name: homeTeamName,
                opponent_team_name: oppTeamName,
                final_score: `${hScore} - ${aScore}`,
                game_result: hScore >= aScore ? "WIN" : "LOSS",
                team_scores: [
                    { team: homeTeamName, score: hScore },
                    { team: oppTeamName, score: aScore },
                ],
                teams: detectedTeamNames,
                sport_type: (
                    responseData.match_info?.sport_type?.toUpperCase() ||
                    "BASKETBALL"
                ) as RawOCRDetectedData["sport_type"],
                athlete_overview: athleteOverview.length > 0 ? athleteOverview : [
                    {
                        athlete_id: "ath_1",
                        player_name: "EXTRACTED ATHLETE",
                        team_name: homeTeamName,
                        pts: 0,
                        ast: 0,
                        to: 0,
                        reb: 0,
                        stl: 0,
                        blk: 0,
                        fg_pct: "0%",
                    },
                ],
                expanded_metrics: {
                    shooting_efficiency: {
                        ft_made: ftMade,
                        ft_attempts: ftAttempts,
                        pt2_made: pt2Made,
                        pt2_attempts: pt2Attempts,
                        pt3_made: 0,
                        pt3_attempts: 0,
                    },
                    possession_errors: {
                        key_drives: 0,
                        assists: totalAssists,
                        turnovers: totalTurnovers,
                        scv_12s: 0,
                    },
                },
            };

            setIsProcessingOCR(false);

            if (onUploadSuccess) {
                onUploadSuccess(parsedOcrResult);
            }
        } catch (err: any) {
            setIsProcessingOCR(false);
            console.error("OCR Processing error:", err);
            setModalMessage(err?.message || "Could not process scoresheet with OCR server. Please try again.");
        }
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
                        <Ionicons name="cloud-upload-outline" size={44} color="#00C8FF" />
                    </View>
                    <Text style={styles.dropzoneTitle}>SELECT PHOTO, PDF OR CSV FILE</Text>
                    <Text style={styles.dropzoneSubtext}>Supports JPG, PNG, PDF, CSV (Max: 25MB)</Text>

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
                <Text style={styles.sectionLabel}>FILES UPLOADED ({uploadedFiles.length})</Text>
                {uploadedFiles.length === 0 ? (
                    <View style={[styles.fileCard, { justifyContent: "center", alignItems: "center", paddingVertical: 20, marginBottom: 24 }]}>
                        <Ionicons name="document-outline" size={28} color="#64748B" style={{ marginBottom: 6 }} />
                        <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center" }}>
                            No files selected yet. Choose a photo or document above.
                        </Text>
                    </View>
                ) : (
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
                                            color="#00C8FF"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.fileName} numberOfLines={1}>
                                            {file.file_name}
                                        </Text>
                                        <Text style={styles.fileMeta}>
                                            {formatFileSize(file.file_size_bytes)} • {file.uploaded_at_relative}
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
                )}

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

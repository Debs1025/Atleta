import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";


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

    // Document Picker Handler (Supports Multiple Selection)
    const handleBrowseFiles = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                multiple: true,
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newFiles: UploadedFileItem[] = result.assets.map((asset, idx) => {
                    let fileType: UploadedFileItem["file_type"] = "CSV";
                    if (asset.name.toLowerCase().endsWith(".pdf") || asset.mimeType?.includes("pdf")) fileType = "PDF";
                    else if (asset.name.toLowerCase().endsWith(".json") || asset.mimeType?.includes("json")) fileType = "JSON";
                    else if (
                        asset.mimeType?.startsWith("image/") ||
                        asset.name.toLowerCase().endsWith(".jpg") ||
                        asset.name.toLowerCase().endsWith(".jpeg") ||
                        asset.name.toLowerCase().endsWith(".png") ||
                        asset.name.toLowerCase().endsWith(".webp")
                    ) {
                        fileType = "IMAGE";
                    }

                    return {
                        upload_id: `upl_${Date.now()}_${idx}`,
                        file_name: asset.name.toUpperCase(),
                        file_size_bytes: asset.size || 1024 * 500,
                        uploaded_at_relative: "Uploaded just now",
                        file_type: fileType,
                        file_url: asset.uri,
                    };
                });

                setUploadedFiles((prev) => [...newFiles, ...prev]);
            }
        } catch {
            setModalMessage("Could not pick document file(s).");
        }
    }, []);

    // Camera / Photo Capture Action Handler (Supports Multiple Gallery Selection)
    const handleTakePhoto = useCallback(async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
                // If camera permission not granted or camera missing (e.g. simulator), open image library
                const galleryResult = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsMultipleSelection: true,
                    quality: 0.8,
                });
                if (!galleryResult.canceled && galleryResult.assets && galleryResult.assets.length > 0) {
                    const newFiles: UploadedFileItem[] = galleryResult.assets.map((asset, idx) => ({
                        upload_id: `upl_${Date.now()}_${idx}`,
                        file_name: (asset.fileName || `SCORESHEET_PHOTO_${Date.now()}_${idx + 1}.JPG`).toUpperCase(),
                        file_size_bytes: asset.fileSize || 1024 * 600,
                        uploaded_at_relative: "Selected just now",
                        file_type: "IMAGE",
                        file_url: asset.uri,
                    }));
                    setUploadedFiles((prev) => [...newFiles, ...prev]);
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
                    allowsMultipleSelection: true,
                    quality: 0.8,
                });
                if (!galleryResult.canceled && galleryResult.assets && galleryResult.assets.length > 0) {
                    const newFiles: UploadedFileItem[] = galleryResult.assets.map((asset, idx) => ({
                        upload_id: `upl_${Date.now()}_${idx}`,
                        file_name: (asset.fileName || `SCORESHEET_PHOTO_${Date.now()}_${idx + 1}.JPG`).toUpperCase(),
                        file_size_bytes: asset.fileSize || 1024 * 600,
                        uploaded_at_relative: "Selected just now",
                        file_type: "IMAGE",
                        file_url: asset.uri,
                    }));
                    setUploadedFiles((prev) => [...newFiles, ...prev]);
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
        try {
            const token = await getStoredAuthToken();
            let responseData: any = null;

            if (uploadedFiles.length === 1) {
                // Single-file flow (Untouched canonical endpoint)
                const file = uploadedFiles[0];
                const fileExt = file.file_name.split(".").pop()?.toLowerCase() || "jpg";
                const isImage =
                    file.file_type === "IMAGE" ||
                    fileExt === "jpg" ||
                    fileExt === "jpeg" ||
                    fileExt === "png" ||
                    fileExt === "webp";

                const finalUri = isImage ? await optimizeScoresheetImage(file.file_url) : file.file_url;
                const mimeType =
                    file.file_type === "PDF"
                        ? "application/pdf"
                        : file.file_type === "CSV"
                        ? "text/csv"
                        : "image/jpeg";

                const canonicalEndpoint = `${API_BASE}/matches/ocr/scan`;

                if (Platform.OS !== "web" && typeof FileSystem.uploadAsync === "function") {
                    try {
                        const uploadRes = await FileSystem.uploadAsync(canonicalEndpoint, finalUri, {
                            httpMethod: "POST",
                            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                            fieldName: "file",
                            mimeType: mimeType,
                            headers: {
                                Accept: "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                        });

                        if (uploadRes.status >= 200 && uploadRes.status < 300) {
                            responseData = JSON.parse(uploadRes.body);
                        }
                    } catch (uploadErr) {
                        console.warn("FileSystem.uploadAsync attempt failed, falling back:", uploadErr);
                    }
                }

                if (!responseData) {
                    let base64Data: string | null = null;
                    try {
                        base64Data = await FileSystem.readAsStringAsync(finalUri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                    } catch (readErr) {
                        console.warn("Could not read file as Base64 directly:", readErr);
                    }

                    if (base64Data) {
                        const res = await fetch(canonicalEndpoint, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                                base64: base64Data,
                                filename: isImage ? `${file.file_name.replace(/\.[^/.]+$/, "")}.jpg` : file.file_name,
                                mimetype: mimeType,
                            }),
                        });

                        if (res.ok) {
                            responseData = await res.json();
                        }
                    }
                }

                if (!responseData) {
                    const formData = new FormData();
                    const sanitizedUri = Platform.OS === "android" ? finalUri : finalUri.replace("file://", "");
                    const filePayload = {
                        uri: sanitizedUri,
                        name: isImage ? `${file.file_name.replace(/\.[^/.]+$/, "")}.jpg` : file.file_name,
                        type: mimeType,
                    };

                    formData.append("file", filePayload as any);

                    const res = await fetch(canonicalEndpoint, {
                        method: "POST",
                        headers: {
                            Accept: "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: formData,
                    });

                    if (res.ok) {
                        responseData = await res.json();
                    }
                }
            } else {
                // Multi-file flow (Dedicated Multi-Scoresheet AI OCR Compression & Stitching Engine)
                const multiEndpoint = `${API_BASE}/matches/mobile/multi/scan-scoresheet`;
                const formData = new FormData();

                for (let i = 0; i < uploadedFiles.length; i++) {
                    const f = uploadedFiles[i];
                    const fExt = f.file_name.split(".").pop()?.toLowerCase() || "jpg";
                    const isImg = f.file_type === "IMAGE" || ["jpg", "jpeg", "png", "webp"].includes(fExt);
                    const procUri = isImg ? await optimizeScoresheetImage(f.file_url) : f.file_url;
                    const sanitized = Platform.OS === "android" ? procUri : procUri.replace("file://", "");
                    const mime = f.file_type === "PDF" ? "application/pdf" : isImg ? "image/jpeg" : "text/csv";

                    formData.append("files", {
                        uri: sanitized,
                        name: isImg ? `${f.file_name.replace(/\.[^/.]+$/, "")}.jpg` : f.file_name,
                        type: mime,
                    } as any);
                }

                const res = await fetch(multiEndpoint, {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: formData,
                }).catch(() => null);

                if (res && res.ok) {
                    responseData = await res.json();
                } else if (res) {
                    const errTxt = await res.text();
                    console.warn(`Multi-scoresheet endpoint returned ${res.status}:`, errTxt);
                }
            }

            if (!responseData) {
                throw new Error("Could not process scoresheet(s) with OCR server.");
            }

            // Map real AI-extracted player statistics into RawOCRDetectedData
            const rawPlayers = Array.isArray(responseData.player_summary)
                ? responseData.player_summary
                : [];

            // 1. Dynamic Sport Detection from AI response & player attributes with strict signature double-checking
            const rawSport = String(
                responseData.match_info?.sport_type ||
                responseData.sport_type ||
                responseData.sport ||
                ""
            ).toUpperCase();

            let detectedSport = "BASKETBALL";
            if (rawSport.includes("VOLLEY")) {
                detectedSport = "VOLLEYBALL";
            } else if (rawSport.includes("SWIM")) {
                detectedSport = "SWIMMING";
            } else if (rawSport.includes("TRACK") || rawSport.includes("RUN") || rawSport.includes("FIELD") || rawSport.includes("ATHLETIC")) {
                detectedSport = "TRACK AND FIELD";
            } else if (rawSport.includes("BADMINTON")) {
                detectedSport = "BADMINTON";
            } else if (rawSport.includes("PICKLE")) {
                detectedSport = "PICKLEBALL";
            } else if (rawSport.includes("SOCCER") || rawSport.includes("FOOTBALL")) {
                detectedSport = "SOCCER";
            } else if (rawSport.includes("BASE") || rawSport.includes("SOFT")) {
                detectedSport = "BASEBALL";
            } else if (rawSport.length > 0) {
                detectedSport = rawSport;
            }

            // Attribute signature double-check: verify sport against actual parsed metrics
            const hasVballStats = rawPlayers.some((p: any) => Number(p.kills || 0) > 0 || Number(p.digs || 0) > 0 || Number(p.service_aces || 0) > 0 || Number(p.attack_attempts || 0) > 0);
            const hasSwimTimes = rawPlayers.some((p: any) => p.finish_time || p.stroke_count || p.split_time);
            const hasTrackMarks = rawPlayers.some((p: any) => p.distance_m || (p.event && (String(p.event).toLowerCase().includes("m ") || String(p.event).toLowerCase().includes("relay") || String(p.event).toLowerCase().includes("dash"))));
            const hasSoccerStats = rawPlayers.some((p: any) => Number(p.goals || 0) > 0 || Number(p.saves || 0) > 0 || Number(p.tackles || 0) > 0);
            const hasRacketStats = rawPlayers.some((p: any) => Number(p.smash_winners || 0) > 0 || Number(p.net_kills || 0) > 0 || Number(p.service_faults || 0) > 0);
            const hasBaseballStats = rawPlayers.some((p: any) => Number(p.at_bats || 0) > 0 || Number(p.runs || 0) > 0 || Number(p.hits || 0) > 0 || Number(p.innings_pitched || 0) > 0);

            if (hasVballStats) detectedSport = "VOLLEYBALL";
            else if (hasSwimTimes) detectedSport = "SWIMMING";
            else if (hasTrackMarks) detectedSport = "TRACK AND FIELD";
            else if (hasSoccerStats) detectedSport = "SOCCER";
            else if (hasRacketStats) detectedSport = "BADMINTON";
            else if (hasBaseballStats) detectedSport = "BASEBALL";

            // 2. Dynamic Team Names: Extract genuine team names or assign clean dynamic labels
            const teamScoresArr = Array.isArray(responseData.team_scores) ? responseData.team_scores : [];
            const homeScoreItem = teamScoresArr.find((t: any) => t.is_home === true);
            const awayScoreItem = teamScoresArr.find((t: any) => t.is_home === false);

            const isIndividualSport = detectedSport === "SWIMMING" || detectedSport === "TRACK AND FIELD";

            const homeTeamName = String(
                responseData.match_info?.home_team_name ||
                responseData.match_info?.home_team ||
                homeScoreItem?.team ||
                teamScoresArr[0]?.team ||
                rawPlayers[0]?.team_name ||
                (isIndividualSport ? "HEAT / LANE 1" : "TEAM A")
            ).trim().toUpperCase();

            const oppTeamName = String(
                responseData.match_info?.opponent_team_name ||
                responseData.match_info?.away_team ||
                awayScoreItem?.team ||
                teamScoresArr[1]?.team ||
                rawPlayers.find((p: any) => p.team_name && String(p.team_name).toUpperCase() !== homeTeamName)?.team_name ||
                (isIndividualSport ? "HEAT / LANE 2" : "TEAM B")
            ).trim().toUpperCase();

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
                let resolvedTeam = String(p.team_name || p.team || "").trim().toUpperCase();
                if (!resolvedTeam) {
                    resolvedTeam = idx < halfCount ? oppTeamName : homeTeamName;
                }

                const fgMade = Number(p.fg_made ?? p.fgm ?? 0);
                const fgAtt = Number(p.fg_attempted ?? p.fga ?? 0);
                const fgPct = p.true_shooting_pct
                    ? `${Math.round(p.true_shooting_pct)}%`
                    : fgAtt > 0
                    ? `${Math.round((fgMade / fgAtt) * 100)}%`
                    : "0%";

                const kills = Number(p.kills ?? p.kill ?? 0);
                const attErr = Number(p.attack_errors ?? p.att_err ?? p.ae ?? p.e ?? 0);
                const attAtt = Number(p.attack_attempts ?? p.total_attacks ?? p.ta ?? 0);
                const hitPct = attAtt > 0 ? `${Math.round(((kills - attErr) / attAtt) * 100)}%` : (p.hitting_pct ? `${p.hitting_pct}%` : "0%");

                return {
                    ...p,
                    athlete_id: p.athlete_id || `ath_${idx + 1}`,
                    player_name: String(p.player_name || p.name || `ATHLETE #${p.jersey_number || idx + 1}`).toUpperCase(),
                    team_name: resolvedTeam,
                    jersey_number: Number(p.jersey_number || p.number || (idx + 1)),
                    position: p.position || "G",
                    // Basketball
                    pts: Number(p.points ?? p.pts ?? p.score ?? 0),
                    ast: Number(p.assists ?? p.ast ?? 0),
                    to: Number(p.turnovers ?? p.to ?? 0),
                    reb: Number(p.rebounds ?? p.reb ?? 0),
                    stl: Number(p.steals ?? p.stl ?? 0),
                    blk: Number(p.blocks ?? p.blk ?? 0),
                    min: Number(p.minutes ?? p.min ?? 0),
                    fg_pct: fgPct,
                    // Volleyball
                    kills,
                    attack_errors: attErr,
                    attack_attempts: attAtt,
                    hitting_pct: hitPct,
                    block_solos: Number(p.block_solos ?? p.bs ?? 0),
                    block_assists: Number(p.block_assists ?? p.ba ?? 0),
                    block_points: Number(p.block_points ?? p.blocks ?? p.blk ?? p.tb ?? 0),
                    digs: Number(p.digs ?? p.dig ?? p.d ?? 0),
                    service_aces: Number(p.service_aces ?? p.aces ?? p.ace ?? p.sa ?? 0),
                    service_errors: Number(p.service_errors ?? p.serv_err ?? p.se ?? 0),
                    reception_errors: Number(p.reception_errors ?? p.rec_err ?? p.re ?? 0),
                    sets_played: Number(p.sets_played ?? p.sp ?? p.sets ?? 0),
                    // Soccer
                    goals: Number(p.goals ?? p.goal ?? p.g ?? 0),
                    shots: Number(p.shots ?? p.sh ?? 0),
                    shots_on_target: Number(p.shots_on_target ?? p.sog ?? p.sot ?? 0),
                    fouls: Number(p.fouls ?? p.fouls_committed ?? p.fc ?? 0),
                    yellow_cards: Number(p.yellow_cards ?? p.yc ?? 0),
                    red_cards: Number(p.red_cards ?? p.rc ?? 0),
                    saves: Number(p.saves ?? p.save ?? p.sv ?? 0),
                    tackles: Number(p.tackles ?? p.tkl ?? 0),
                    // Timed / Individual (Swimming / Track)
                    time: String(p.finish_time || p.time || ""),
                    finish_time: String(p.finish_time || p.time || ""),
                    split: String(p.split_times || p.split_time || p.split || ""),
                    split_2: String(p.split_2 || ""),
                    event: String(p.event || p.event_name || p.race || ""),
                    event_name: String(p.event || p.event_name || p.race || ""),
                    stroke_count: Number(p.stroke_count || p.strokes || 0),
                    distance_m: Number(p.distance_m || p.distance || 0),
                    pace: String(p.pace || p.avg_pace || ""),
                    reaction_sec: String(p.reaction_sec || p.reaction_time || ""),
                    heat: Number(p.heat || 1),
                    lane: Number(p.lane || 1),
                    rank: Number(p.rank || p.place || idx + 1),
                    // Badminton / Racket
                    smash_winners: Number(p.smash_winners ?? p.smashes ?? 0),
                    net_kills: Number(p.net_kills ?? p.net_shots ?? 0),
                    unforced_errors: Number(p.unforced_errors ?? p.errors ?? 0),
                    service_faults: Number(p.service_faults ?? p.faults ?? 0),
                    service_aces_racket: Number(p.service_aces ?? 0),
                    // Baseball
                    at_bats: Number(p.at_bats ?? p.ab ?? 0),
                    runs: Number(p.runs ?? p.r ?? 0),
                    hits: Number(p.hits ?? p.h ?? 0),
                    rbi: Number(p.rbi ?? 0),
                    home_runs: Number(p.home_runs ?? p.hr ?? 0),
                    walks: Number(p.walks ?? p.bb ?? 0),
                    strikeouts: Number(p.strikeouts ?? p.so ?? p.k ?? 0),
                    innings_pitched: Number(p.innings_pitched ?? p.ip ?? 0),
                    earned_runs: Number(p.earned_runs ?? p.er ?? 0),
                };
            });

            const ftMade = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.ft_made || 0), 0);
            const ftAttempts = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.ft_attempted || 0), 0);
            const pt2Made = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.fg_made || 0), 0);
            const pt2Attempts = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.fg_attempted || 0), 0);
            const pt3Made = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.three_made || 0), 0);
            const pt3Attempts = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.three_attempted || 0), 0);
            const totalAssists = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.assists || p.ast || 0), 0);
            const totalTurnovers = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.turnovers || p.to || 0), 0);

            // Volleyball expanded
            const totalKills = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.kills || 0), 0);
            const totalDigs = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.digs || 0), 0);
            const totalBlocks = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.block_points || p.blocks || 0), 0);
            const totalAces = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.service_aces || 0), 0);
            const totalErrors = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.attack_errors || p.service_errors || 0), 0);

            // Racket expanded
            const totalSmashes = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.smash_winners || 0), 0);
            const totalNetKills = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.net_kills || 0), 0);
            const totalFaults = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.service_faults || 0), 0);

            // Accurately compute dynamic scores per team according to sport
            const isVolleyball = detectedSport === "VOLLEYBALL";
            const isSoccer = detectedSport === "SOCCER";
            const isBaseball = detectedSport.includes("BASE") || detectedSport.includes("SOFT");

            const computeAthleteStatTotal = (teamName: string) => {
                const filtered = athleteOverview.filter(
                    (a) => (a.team_name || "").toUpperCase() === teamName.toUpperCase()
                );
                if (isSoccer) {
                    return filtered.reduce((sum, a) => sum + Number(a.goals || 0), 0);
                }
                if (isBaseball) {
                    return filtered.reduce((sum, a) => sum + Number(a.runs || 0), 0);
                }
                if (isVolleyball) {
                    const sets = filtered.reduce((sum, a) => sum + Number(a.sets_played || 0), 0);
                    const kills = filtered.reduce((sum, a) => sum + Number(a.kills || 0), 0);
                    return sets > 0 ? sets : kills;
                }
                return filtered.reduce((sum, a) => sum + Number(a.pts || 0), 0);
            };

            const homeAthleteSum = computeAthleteStatTotal(homeTeamName);
            const oppAthleteSum = computeAthleteStatTotal(oppTeamName);

            // Match exact team scores from AI response if available
            const homeDirectScoreItem = teamScoresArr.find(
                (t: any) => String(t.team || "").trim().toUpperCase() === homeTeamName.toUpperCase()
            );
            const oppDirectScoreItem = teamScoresArr.find(
                (t: any) => String(t.team || "").trim().toUpperCase() === oppTeamName.toUpperCase()
            );

            let hScore: number;
            let aScore: number;

            if (homeDirectScoreItem && !isNaN(Number(homeDirectScoreItem.score))) {
                hScore = Number(homeDirectScoreItem.score);
            } else {
                hScore = homeAthleteSum;
            }

            if (oppDirectScoreItem && !isNaN(Number(oppDirectScoreItem.score))) {
                aScore = Number(oppDirectScoreItem.score);
            } else if (teamScoresArr.length > 1 && !isNaN(Number(teamScoresArr[1].score))) {
                aScore = Number(teamScoresArr[1].score);
            } else {
                aScore = oppAthleteSum;
            }

            const parsedOcrResult: RawOCRDetectedData = {
                team_name: homeTeamName,
                opponent_team_name: oppTeamName,
                final_score: responseData.match_info?.final_score || `${hScore} - ${aScore}`,
                game_result: hScore >= aScore ? "WIN" : "LOSS",
                team_scores: [
                    { team: homeTeamName, score: hScore },
                    { team: oppTeamName, score: aScore },
                ],
                teams: detectedTeamNames,
                sport_type: detectedSport as any,
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
                        pt3_made: pt3Made,
                        pt3_attempts: pt3Attempts,
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
          { paddingTop: 14, paddingBottom: 40 },
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

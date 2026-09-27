import React, { useState, useCallback, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  Eye,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { Navbar } from '../Components/Navbar';
import { OCROutputView } from './OCROutputView';
import { scanScoresheetOCR } from '../../api/client';
import type { UploadedFileItem, RawOCRDetectedData, DetectedAthleteStat } from '../../api/types';
import { styles } from './styles/OCRLoggingPage';

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

export const OCRLoggingPage: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFileItem | null>(null);
  const [ocrResult, setOcrResult] = useState<RawOCRDetectedData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const newItems: UploadedFileItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let fileType: UploadedFileItem['file_type'] = 'IMAGE';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf' || file.type === 'application/pdf') fileType = 'PDF';
      else if (ext === 'csv' || file.type === 'text/csv') fileType = 'CSV';
      else if (ext === 'json') fileType = 'JSON';

      newItems.push({
        upload_id: `upl_${Date.now()}_${i}`,
        file_name: file.name.toUpperCase(),
        file_size_bytes: file.size,
        uploaded_at_relative: 'Selected just now',
        file_type: fileType,
        file_url: URL.createObjectURL(file),
        raw_file: file,
      });
    }

    setUploadedFiles((prev) => [...newItems, ...prev]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleAddFiles(e.dataTransfer.files);
  };

  const handleProcessOCR = async () => {
    if (uploadedFiles.length === 0) {
      setErrorMessage('Please select or drag a scoresheet file first.');
      return;
    }

    const target = uploadedFiles[0];
    if (!target.raw_file) {
      setErrorMessage('Invalid file handle. Please re-select the file.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Call deployed backend OCR scanner endpoint
      const responseData = await scanScoresheetOCR(target.raw_file);

      const rawPlayers = Array.isArray(responseData.player_summary)
        ? responseData.player_summary
        : [];

      const teamScoresArr = Array.isArray(responseData.team_scores)
        ? responseData.team_scores
        : [];

      const homeScoreItem = teamScoresArr.find((t: any) => t.is_home === true) || teamScoresArr[0];
      const awayScoreItem = teamScoresArr.find((t: any) => t.is_home === false) || (teamScoresArr.length > 1 ? teamScoresArr[1] : undefined);

      const homeTeamName = String(
        responseData.match_info?.home_team_name ||
        responseData.match_info?.home_team ||
        homeScoreItem?.team ||
        'TEAM 1'
      ).toUpperCase();

      const oppTeamName = String(
        responseData.match_info?.opponent_team_name ||
        responseData.match_info?.away_team ||
        awayScoreItem?.team ||
        'TEAM 2'
      ).toUpperCase();

      const detectedTeamNames = Array.from(
        new Set([
          ...rawPlayers.map((p: any) => ((p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase() : null)).filter(Boolean),
          ...(responseData.team_scores || []).map((t: any) => (t.team ? String(t.team).toUpperCase() : null)).filter(Boolean),
          homeTeamName,
          oppTeamName,
        ])
      ).filter((t): t is string => typeof t === 'string' && t.trim().length > 0);

      const totalPlayers = rawPlayers.length;
      const halfCount = Math.ceil(totalPlayers / 2);

      const athleteOverview: DetectedAthleteStat[] = rawPlayers.map((p: any, idx: number) => {
        let resolvedTeam = (p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase() : '';
        if (!resolvedTeam) {
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
          min: Number(p.min ?? p.minutes ?? 0),
          fg_pct: p.true_shooting_pct
            ? `${Math.round(p.true_shooting_pct)}%`
            : p.fg_attempted > 0
              ? `${Math.round((p.fg_made / p.fg_attempted) * 100)}%`
              : '50%',
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
        game_result: hScore >= aScore ? 'WIN' : 'LOSS',
        team_scores: [
          { team: homeTeamName, score: hScore },
          { team: oppTeamName, score: aScore },
        ],
        teams: detectedTeamNames,
        sport_type: (responseData.match_info?.sport_type?.toUpperCase() || 'BASKETBALL') as any,
        athlete_overview: athleteOverview.length > 0 ? athleteOverview : [
          {
            athlete_id: 'ath_1',
            player_name: 'EXTRACTED ATHLETE',
            team_name: homeTeamName,
            pts: 0,
            ast: 0,
            to: 0,
            reb: 0,
            stl: 0,
            blk: 0,
            min: 0,
            fg_pct: '0%',
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

      setOcrResult(parsedOcrResult);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setErrorMessage(err.message || 'AI OCR Vision could not process scoresheet. Please try a clearer picture.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={styles.shell}>
      <Navbar />

      <main style={styles.main}>
        {ocrResult ? (
          <OCROutputView
            rawOCRData={ocrResult}
            onBack={() => setOcrResult(null)}
            onSaveSuccess={() => {
              setOcrResult(null);
              setUploadedFiles([]);
              setSuccessToast('Match and stats saved successfully to database!');
              setTimeout(() => setSuccessToast(null), 4000);
            }}
          />
        ) : (
          <div style={styles.spaceWrapper}>
            {/* Header */}
            <div style={styles.header}>
              <h1 style={styles.title}>
                SCORESHEET OCR LOGGING
              </h1>
              <p style={styles.subtitle}>
                Upload game scoresheets (PNG, JPG, PDF) to automatically extract box scores via Gemini Vision AI
              </p>
            </div>

            {successToast && (
              <div style={styles.toastSuccess}>
                <CheckCircle style={{ width: 16, height: 16, flexShrink: 0, color: '#059669' }} />
                <span>{successToast}</span>
              </div>
            )}

            {errorMessage && (
              <div style={styles.toastError}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, color: '#DC2626' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                ...styles.dropZone,
                ...(isDragging ? styles.dropZoneDragging : {}),
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleAddFiles(e.target.files)}
                accept="image/*,.pdf,.csv,.json"
                style={{ display: 'none' }}
              />
              <div style={styles.dropZoneIconWrap}>
                <UploadCloud style={{ width: 28, height: 28 }} />
              </div>
              <h3 style={styles.dropZoneTitle}>
                DRAG & DROP SCORESHEET HERE OR BROWSE
              </h3>
              <p style={styles.dropZoneDesc}>
                Supports JPG, PNG, WEBP, and PDF scoresheets up to 30MB
              </p>
            </div>

            {/* Uploaded Files Queue */}
            {uploadedFiles.length > 0 && (
              <div style={styles.queueCard}>
                <div style={styles.queueHeader}>
                  <span style={styles.queueTitle}>
                    SELECTED FILES QUEUE ({uploadedFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadedFiles([])}
                    style={styles.clearAllBtn}
                  >
                    Clear All
                  </button>
                </div>

                <div style={styles.fileList}>
                  {uploadedFiles.map((file) => (
                    <div key={file.upload_id} style={styles.fileItem}>
                      <div style={styles.fileItemLeft}>
                        <div style={styles.fileTypeIconWrap}>
                          {file.file_type === 'IMAGE' ? <ImageIcon style={{ width: 20, height: 20 }} /> : <FileText style={{ width: 20, height: 20 }} />}
                        </div>
                        <div style={styles.fileInfoWrap}>
                          <p style={styles.fileName}>{file.file_name}</p>
                          <p style={styles.fileMeta}>
                            {formatFileSize(file.file_size_bytes)} • {file.uploaded_at_relative}
                          </p>
                        </div>
                      </div>

                      <div style={styles.fileItemActions}>
                        {file.file_type === 'IMAGE' && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            style={styles.actionBtn}
                            title="Preview Image"
                          >
                            <Eye style={{ width: 16, height: 16 }} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setUploadedFiles((prev) => prev.filter((f) => f.upload_id !== file.upload_id))}
                          style={styles.removeBtn}
                          title="Remove"
                        >
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Submit OCR Button */}
                <div style={styles.queueFooter}>
                  <button
                    type="button"
                    onClick={handleProcessOCR}
                    disabled={isProcessing}
                    style={{
                      ...styles.submitBtn,
                      ...(isProcessing ? styles.submitBtnDisabled : {}),
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                        <span>PROCESSING WITH GEMINI AI OCR...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles style={{ width: 16, height: 16, color: '#FBBF24' }} />
                        <span>EXTRACT SCORESHEET DATA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Image Preview Modal */}
      {previewFile && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>{previewFile.file_name}</span>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                style={styles.modalCloseBtn}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <img
                src={previewFile.file_url}
                alt="Scoresheet Preview"
                style={styles.modalImg}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRLoggingPage;

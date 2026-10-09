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
import { scanMultipleScoresheets } from '../../api/ocr';
import type { UploadedFileItem, RawOCRDetectedData, DetectedAthleteStat } from '../../api/types';
import { styles } from './styles/OCRLoggingPage';

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

// Standardized mapping for a single scoresheet/match
const mapSingleMatch = (dataObj: any, startingIdx = 0): RawOCRDetectedData => {
  const matchInfo = dataObj.match_info || dataObj;
  const rawSport = String(matchInfo.sport_type || dataObj.sport_type || 'BASKETBALL').toUpperCase();
  const rawPlayers: any[] = Array.isArray(dataObj.player_summary)
    ? dataObj.player_summary
    : Array.isArray(dataObj.parsed_tables?.player_summary)
      ? dataObj.parsed_tables.player_summary
      : [];

  const teamScoresArr: any[] = Array.isArray(dataObj.team_scores)
    ? dataObj.team_scores
    : Array.isArray(dataObj.parsed_tables?.team_scores)
      ? dataObj.parsed_tables.team_scores
      : [];

  const homeScoreItem = teamScoresArr.find((t: any) => t.is_home === true) || teamScoresArr[0];
  const awayScoreItem = teamScoresArr.find((t: any) => t.is_home === false) || (teamScoresArr.length > 1 ? teamScoresArr[1] : undefined);

  const homeTeamName = String(
    matchInfo.home_team_name || matchInfo.home_team || homeScoreItem?.team || 'TEAM 1'
  ).toUpperCase();

  const oppTeamName = String(
    matchInfo.opponent_team_name || matchInfo.away_team || awayScoreItem?.team || 'TEAM 2'
  ).toUpperCase();

  const detectedTeamNames = Array.from(
    new Set([
      ...rawPlayers.map((p: any) => ((p.team_name || p.team) ? String(p.team_name || p.team).toUpperCase() : null)).filter(Boolean),
      ...teamScoresArr.map((t: any) => (t.team ? String(t.team).toUpperCase() : null)).filter(Boolean),
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
      athlete_id: `ath_${startingIdx + idx + 1}`,
      player_name: String(p.player_name || (p.first_name || p.last_name ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : `PLAYER #${p.jersey_number || startingIdx + idx + 1}`)).toUpperCase(),
      team_name: resolvedTeam,
      jersey_number: Number(p.jersey_number || 0),
      position: p.position || 'G',
      // Basketball
      pts: Number(p.points ?? p.pts ?? 0),
      ast: Number(p.assists ?? p.ast ?? 0),
      to: Number(p.turnovers ?? p.to ?? 0),
      reb: Number((p.offensive_rebounds || 0) + (p.defensive_rebounds || 0) || p.rebounds || p.reb || 0),
      stl: Number(p.steals ?? p.stl ?? 0),
      blk: Number(p.blocks ?? p.blk ?? 0),
      min: Number(p.min ?? p.minutes ?? 0),
      fg_pct: p.true_shooting_pct
        ? `${Math.round(p.true_shooting_pct)}%`
        : p.fg_attempted > 0
          ? `${Math.round((p.fg_made / p.fg_attempted) * 100)}%`
          : p.fg_pct || '50%',
      // Volleyball
      kills: Number(p.kills ?? p.kill_points ?? 0),
      attack_errors: Number(p.attack_errors ?? p.att_err ?? 0),
      attack_attempts: Number(p.attack_attempts ?? p.total_attacks ?? 0),
      hitting_pct: p.hitting_pct || p.hit_pct || '0.0%',
      service_aces: Number(p.service_aces ?? p.aces ?? 0),
      digs: Number(p.digs ?? 0),
      block_points: Number(p.block_points ?? p.blocks ?? 0),
      // Soccer
      goals: Number(p.goals ?? 0),
      shots: Number(p.shots ?? 0),
      shots_on_target: Number(p.shots_on_target ?? p.sog ?? 0),
      saves: Number(p.saves ?? 0),
      tackles: Number(p.tackles ?? p.tkl ?? 0),
      // Timed / Individual
      time: p.finish_time || p.time || p.result_time || '',
      finish_time: p.finish_time || p.time || '',
      event: p.event || p.discipline || '',
      split: p.split || p.split_1 || '',
      placement_rank: p.placement_rank || p.rank || '',
    };
  });

  const ftMade = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.ft_made || 0), 0);
  const ftAttempts = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.ft_attempted || 0), 0);
  const pt2Made = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.fg_made || 0), 0);
  const pt2Attempts = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.fg_attempted || 0), 0);
  const totalAssists = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.assists || p.ast || 0), 0);
  const totalTurnovers = rawPlayers.reduce((acc: number, p: any) => acc + Number(p.turnovers || p.to || 0), 0);

  const homeAthleteSum = athleteOverview
    .filter((a) => a.team_name === homeTeamName)
    .reduce((sum, a) => sum + (a.pts || a.kills || a.goals || 0), 0);
  const oppAthleteSum = athleteOverview
    .filter((a) => a.team_name === oppTeamName)
    .reduce((sum, a) => sum + (a.pts || a.kills || a.goals || 0), 0);

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

  return {
    team_name: homeTeamName,
    opponent_team_name: oppTeamName,
    final_score: `${hScore} - ${aScore}`,
    game_result: hScore >= aScore ? 'WIN' : 'LOSS',
    team_scores: [
      { team: homeTeamName, score: hScore },
      { team: oppTeamName, score: aScore },
    ],
    teams: detectedTeamNames,
    sport_type: rawSport,
    athlete_overview: athleteOverview.length > 0 ? athleteOverview : [
      {
        athlete_id: `ath_${startingIdx + 1}`,
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
};

// Helper to test if two scoresheets belong to the same match
const isSameMatch = (m1: any, m2: any): boolean => {
  const s1 = String(m1.sport_category || m1.sport_type || '').trim().toLowerCase();
  const s2 = String(m2.sport_category || m2.sport_type || '').trim().toLowerCase();
  const h1 = String(m1.home_team_name || m1.home_team || m1.team_name || '').trim().toLowerCase();
  const h2 = String(m2.home_team_name || m2.home_team || m2.team_name || '').trim().toLowerCase();
  const o1 = String(m1.opponent_team_name || m1.away_team || '').trim().toLowerCase();
  const o2 = String(m2.opponent_team_name || m2.away_team || '').trim().toLowerCase();

  const sameSport = s1 === s2 || !s1 || !s2;
  const sameHome = h1 === h2 || h1.includes(h2) || h2.includes(h1);
  const sameOpp = !o1 || !o2 || o1 === o2 || o1.includes(o2) || o2.includes(o1);

  return sameSport && sameHome && sameOpp;
};

// Multi-page continuation merging (same match)
const mergeContinuationRosters = (base: RawOCRDetectedData, continuation: RawOCRDetectedData): RawOCRDetectedData => {
  const mergedAthletes = [...base.athlete_overview];

  continuation.athlete_overview.forEach((incoming) => {
    const existingIdx = mergedAthletes.findIndex((existing) => {
      if (incoming.jersey_number && existing.jersey_number && incoming.jersey_number === existing.jersey_number) {
        if (!incoming.team_name || !existing.team_name || incoming.team_name === existing.team_name) return true;
      }
      if (incoming.player_name && existing.player_name && incoming.player_name !== 'EXTRACTED ATHLETE' && incoming.player_name === existing.player_name) {
        return true;
      }
      return false;
    });

    if (existingIdx !== -1) {
      const curr = mergedAthletes[existingIdx];
      mergedAthletes[existingIdx] = {
        ...curr,
        pts: (curr.pts || 0) + (incoming.pts || 0),
        ast: (curr.ast || 0) + (incoming.ast || 0),
        to: (curr.to || 0) + (incoming.to || 0),
        reb: (curr.reb || 0) + (incoming.reb || 0),
        stl: (curr.stl || 0) + (incoming.stl || 0),
        blk: (curr.blk || 0) + (incoming.blk || 0),
        min: (curr.min || 0) + (incoming.min || 0),
        kills: (curr.kills || 0) + (incoming.kills || 0),
        attack_errors: (curr.attack_errors || 0) + (incoming.attack_errors || 0),
        attack_attempts: (curr.attack_attempts || 0) + (incoming.attack_attempts || 0),
        service_aces: (curr.service_aces || 0) + (incoming.service_aces || 0),
        digs: (curr.digs || 0) + (incoming.digs || 0),
        block_points: (curr.block_points || 0) + (incoming.block_points || 0),
        goals: (curr.goals || 0) + (incoming.goals || 0),
        shots: (curr.shots || 0) + (incoming.shots || 0),
        shots_on_target: (curr.shots_on_target || 0) + (incoming.shots_on_target || 0),
        saves: (curr.saves || 0) + (incoming.saves || 0),
        tackles: (curr.tackles || 0) + (incoming.tackles || 0),
      };
    } else {
      mergedAthletes.push({
        ...incoming,
        athlete_id: `ath_${mergedAthletes.length + 1}`,
      });
    }
  });

  const allTeams = Array.from(new Set([...(base.teams || []), ...(continuation.teams || [])]));
  const hSum = mergedAthletes
    .filter((a) => a.team_name === base.team_name)
    .reduce((sum, a) => sum + (a.pts || a.kills || a.goals || 0), 0);
  const aSum = mergedAthletes
    .filter((a) => a.team_name === base.opponent_team_name)
    .reduce((sum, a) => sum + (a.pts || a.kills || a.goals || 0), 0);

  return {
    ...base,
    teams: allTeams,
    athlete_overview: mergedAthletes,
    team_scores: [
      { team: base.team_name || 'HOME TEAM', score: hSum },
      { team: base.opponent_team_name || 'OPPONENT TEAM', score: aSum },
    ],
    final_score: `${hSum} - ${aSum}`,
    game_result: hSum >= aSum ? 'WIN' : 'LOSS',
  };
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
      let parsedOcrResult: RawOCRDetectedData;

      const rawFiles = uploadedFiles.map((f) => f.raw_file).filter((f): f is File => Boolean(f));
      const responseData = uploadedFiles.length > 1
        ? await scanMultipleScoresheets(rawFiles)
        : await scanScoresheetOCR(target.raw_file);

      const matchesArr = Array.isArray(responseData?.matches) ? responseData.matches : [];
      const isSingleMatchMultiPart =
        matchesArr.length > 1 &&
        matchesArr.every((m: any) => isSameMatch(matchesArr[0], m));

      if (responseData?.batch_mode && isSingleMatchMultiPart) {
        // Multi-part sheets of the same match -> consolidate into one match
        let accumulated = mapSingleMatch(matchesArr[0]);
        for (let p = 1; p < matchesArr.length; p++) {
          const pageData = mapSingleMatch(matchesArr[p], accumulated.athlete_overview.length);
          accumulated = mergeContinuationRosters(accumulated, pageData);
        }
        parsedOcrResult = accumulated;
      } else if (responseData?.batch_mode && matchesArr.length > 1) {
        // Genuinely distinct batch matches
        const separatedMatches = matchesArr.map((m: any, idx: number) => mapSingleMatch(m, idx * 50));
        parsedOcrResult = {
          ...separatedMatches[0],
          batch_matches: separatedMatches,
        };
      } else if (Array.isArray(responseData?.pages) && responseData.pages.length > 1) {
        // Multi-page continuation PDF
        let accumulated = mapSingleMatch(responseData.pages[0]);
        for (let p = 1; p < responseData.pages.length; p++) {
          const pageData = mapSingleMatch(responseData.pages[p], accumulated.athlete_overview.length);
          accumulated = mergeContinuationRosters(accumulated, pageData);
        }
        parsedOcrResult = accumulated;
      } else {
        parsedOcrResult = mapSingleMatch(responseData);
      }

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

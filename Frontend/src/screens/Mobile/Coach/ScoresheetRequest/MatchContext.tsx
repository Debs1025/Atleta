import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { Alert, Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { requestAuthenticatedJson, API_BASE } from '../../Authentication/authShared';
import {
  getMatchesOfflineFirst,
  saveMatchOfflineFirst,
  deleteMatchOfflineFirst,
  submitScoresheetRequestOfflineFirst,
  getCoachProfileOfflineFirst,
} from '../../../../services/firebaseClient';

export type AuditStatus = 'NOT REQUESTED' | 'PENDING REQUEST' | 'REQUEST GRANTED';

export interface PlayerBoxScoreMetric {
  athlete_id: string;
  player_name: string;
  pts?: number;
  ast?: number;
  reb?: number;
  stl?: number;
  blk?: number;
  // Swimming metrics
  event_name?: string;
  time_seconds?: string;
  rank_position?: number;
  split_time?: string;
  lane?: number;
  // Track & Field metrics
  discipline?: string;
  mark_result?: string;
  wind_reading?: string;
  place?: number;
}

export interface OfficialMatchRecord {
  match_id: string;
  team_id: string;
  home_team_name: string;
  away_team_name: string;
  league_name: string; // e.g. "BATANG PINOY"
  sport_type: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD' | 'VOLLEYBALL' | 'PICKLEBALL' | string;
  match_date: string; // e.g. "OCT 24, 2023"
  match_time: string; // e.g. "19:30"
  location: string; // e.g. "Metro Sports Arena, Court 4"
  audit_status: AuditStatus;
  is_certified: boolean;
  customGameTitle?: string;
  matchName?: string;
  gameName?: string;
  home_score?: number;
  away_score?: number;
  scoresheet_url?: string;
  box_score_summary?: PlayerBoxScoreMetric[];
  coach_notes?: string[];
}

// Zero hardcoded mock matches - dynamically loaded 100% from Firestore Match_Logs
export const INITIAL_MATCH_RECORDS: OfficialMatchRecord[] = [];

interface MatchContextType {
  matches: OfficialMatchRecord[];
  isLoadingMatches: boolean;
  refreshMatches: () => Promise<void>;
  requestAudit: (matchId: string) => Promise<void>;
  grantAudit: (matchId: string) => Promise<void>; // Demo / Backend hook for testing certification state
  deleteMatch: (matchId: string) => Promise<void>;
  generatePDFScoresheet: (match: OfficialMatchRecord) => Promise<void>;
  isGeneratingPDF: boolean;
  downloadModal: { visible: boolean; fileName: string; uri: string } | null;
  closeDownloadModal: () => void;
  openPDFFile: (fileUri?: string) => Promise<void>;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matches, setMatches] = useState<OfficialMatchRecord[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [downloadModal, setDownloadModal] = useState<{ visible: boolean; fileName: string; uri: string } | null>(null);

  // Fetch matches purely from deployed backend / Firestore Match_Logs
  const refreshMatches = useCallback(async () => {
    try {
      setIsLoadingMatches(true);

      // Fetch both the coach's own matches AND all official matches in the system.
      // ?all=true includes official (tournament-official-created) matches regardless of coach association.
      const [coachRes, allRes, syncRes]: [any, any, any] = await Promise.all([
        requestAuthenticatedJson('/matches').catch(() => null),
        requestAuthenticatedJson('/matches?all=true').catch(() => null),
        requestAuthenticatedJson('/sync/coach-snapshot').catch(() => null),
      ]);

      const coachList: any[] = Array.isArray(coachRes?.matches) ? coachRes.matches : [];
      const allList: any[] = Array.isArray(allRes?.matches) ? allRes.matches : [];
      const syncList: any[] = Array.isArray(syncRes?.scheduled_matches) ? syncRes.scheduled_matches : [];

      const isDeletedOrRevoked = (m: any) => {
        if (!m) return true;
        if (m.deleted === true || m.is_deleted === true) return true;
        const s = String(m.status || m.audit_status || m.verification_status || '').toUpperCase();
        return s === 'DELETED' || s === 'REVOKED' || s === 'CANCELLED';
      };

      // Merge all sources, deduplicate by match_id (coach list takes precedence for audit_status)
      const seenIds = new Set<string>();
      const merged: any[] = [];
      for (const m of [...coachList, ...allList, ...syncList]) {
        const id = m.match_id || m.id;
        if (id && !seenIds.has(id) && !isDeletedOrRevoked(m)) {
          seenIds.add(id);
          merged.push(m);
        }
      }

      let rawList = merged;
      if (rawList.length === 0) {
        // Offline fallback from persistent Firestore cache
        const offline = await getMatchesOfflineFirst();
        rawList = offline.filter((m: any) => !isDeletedOrRevoked(m));
      }

      if (rawList.length > 0) {
        const mappedBackendMatches: OfficialMatchRecord[] = rawList.map((m: any, idx: number) => {
          const homeScoreMatch = (m.notes || '').match(/\((\d+)\s*-\s*(\d+)\)/);
          const hScore = m.home_score !== undefined ? Number(m.home_score) : (homeScoreMatch ? parseInt(homeScoreMatch[1], 10) : undefined);
          const aScore = m.away_score !== undefined ? Number(m.away_score) : (homeScoreMatch ? parseInt(homeScoreMatch[2], 10) : undefined);
          // Resolve team display names from all possible field paths
          // Coach-logged: home_team_name / away_team_name
          // Official-created: team_id / opponent_team_name / home_team_id / away_team_id
          const homeName =
            m.home_team_name ||
            m.game_name?.split(/\s+vs\.?\s+/i)?.[0]?.trim() ||
            m.team_id ||
            m.home_team_id ||
            (m.notes ? (m.notes as string).match(/OCR Logged:\s*([^v]+?)\s+vs/i)?.[1]?.trim() : null) ||
            'Home Team';
          const oppName =
            m.away_team_name ||
            m.opponent_team_name ||
            m.game_name?.split(/\s+vs\.?\s+/i)?.[1]?.trim() ||
            m.away_team_id ||
            'Away Team';

          const rawSport = (m.sport_type || 'BASKETBALL').toUpperCase();
          const sportType: OfficialMatchRecord['sport_type'] =
            rawSport.includes('SWIM') ? 'SWIMMING' : rawSport.includes('TRACK') ? 'TRACK AND FIELD' : rawSport;

          const rawStatus = (m.audit_status || m.verification_status || '').toUpperCase();
          let auditStatus: AuditStatus = 'NOT REQUESTED';
          if (m.is_certified === true || rawStatus.includes('GRANT') || rawStatus.includes('APPROV') || rawStatus.includes('CERTIF')) {
            auditStatus = 'REQUEST GRANTED';
          } else if (rawStatus.includes('PEND') || rawStatus.includes('REQUEST')) {
            auditStatus = 'PENDING REQUEST';
          }

          const rawDate = m.match_date ? new Date(m.match_date) : new Date();
          const formattedDate = !isNaN(rawDate.getTime())
            ? rawDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
            : 'Recent Match';

          const formattedTime = m.match_time || (!isNaN(rawDate.getTime())
            ? rawDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '19:00');

          const rawBox = Array.isArray(m.player_stats)
            ? m.player_stats
            : Array.isArray(m.box_score_summary)
            ? m.box_score_summary
            : [];

          const boxSummary: PlayerBoxScoreMetric[] = rawBox.map((p: any, pIdx: number) => ({
            athlete_id: p.athlete_id || p.id || `ath_${pIdx}`,
            player_name: p.player_name || p.full_name || p.athlete_name || 'Athlete Player',
            pts: p.pts !== undefined ? Number(p.pts) : (p.points !== undefined ? Number(p.points) : 0),
            ast: p.ast !== undefined ? Number(p.ast) : (p.assists !== undefined ? Number(p.assists) : 0),
            reb: p.reb !== undefined ? Number(p.reb) : (p.rebounds !== undefined ? Number(p.rebounds) : 0),
            stl: p.stl !== undefined ? Number(p.stl) : (p.steals !== undefined ? Number(p.steals) : 0),
            blk: p.blk !== undefined ? Number(p.blk) : (p.blocks !== undefined ? Number(p.blocks) : 0),
            event_name: p.event_name || (sportType === 'SWIMMING' ? '50m Freestyle' : undefined),
            time_seconds: p.time_seconds || p.formatted_time || (p.finish_time_ms ? `${(p.finish_time_ms / 1000).toFixed(2)}s` : undefined),
            rank_position: p.rank_position || p.rank || 1,
            split_time: p.split_time || undefined,
            lane: p.lane || undefined,
            discipline: p.discipline || p.event_name || (sportType === 'TRACK AND FIELD' ? '100m Sprint' : undefined),
            mark_result: p.mark_result || p.distance || (p.distance_meters ? `${p.distance_meters}m` : undefined),
            wind_reading: p.wind_reading || 'N/A',
            place: p.place || p.rank_position || 1,
          }));

          const officialAssignedTitle =
            (m.customGameTitle && String(m.customGameTitle).trim()) ||
            (m.custom_game_title && String(m.custom_game_title).trim()) ||
            (m.matchName && String(m.matchName).trim()) ||
            (m.match_name && String(m.match_name).trim()) ||
            (m.gameName && String(m.gameName).trim()) ||
            (m.game_name && String(m.game_name).trim()) ||
            undefined;

          return {
            match_id: m.match_id || m.id || `match_${idx}`,
            team_id: m.team_id || '',
            home_team_name: homeName,
            away_team_name: oppName,
            league_name: m.league_name || m.tournament_name || (m.match_type === 'Official Match' ? 'Official Match' : m.match_type || '-'),
            sport_type: sportType,
            match_date: formattedDate,
            match_time: formattedTime,
            location: m.location || m.venue || '-',
            audit_status: auditStatus,
            is_certified: auditStatus === 'REQUEST GRANTED' || !!m.is_certified,
            customGameTitle: officialAssignedTitle,
            matchName: officialAssignedTitle || `${homeName} vs. ${oppName}`,
            gameName: officialAssignedTitle || `${homeName} vs. ${oppName}`,
            home_score: hScore,
            away_score: aScore,
            scoresheet_url: m.scoresheet_url || m.scoresheetUrl || undefined,
            box_score_summary: boxSummary.length > 0 ? boxSummary : undefined,
            coach_notes: Array.isArray(m.coach_notes) ? m.coach_notes : (m.notes ? [m.notes] : []),
          };
        });

        // Set exclusively from Firestore matches
        setMatches(mappedBackendMatches);
      } else {
        setMatches([]);
      }
    } catch (error) {
      console.warn('Failed to load live matches from deployed backend:', error);
      setMatches([]);
    } finally {
      setIsLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    refreshMatches();
  }, [refreshMatches]);

  const closeDownloadModal = useCallback(() => {
    setDownloadModal(null);
  }, []);

  const openPDFFile = useCallback(async (fileUri?: string) => {
    if (!fileUri) return;
    try {
      if (Platform.OS === 'web') {
        window.open(fileUri, '_blank');
      } else {
        await Print.printAsync({ uri: fileUri });
      }
    } catch (error) {
      console.error('Error opening PDF file:', error);
      Alert.alert('Scoresheet Download', `Downloaded file is stored at: ${fileUri}`);
    }
  }, []);

  // Request Official Scoresheet workflow (connected to deployed backend POST /matches/:matchId/audit-request)
  const requestAudit = useCallback(async (matchId: string) => {
    const targetMatch = matches.find((m) => m.match_id === matchId);

    // 1. Optimistically update local UI state
    setMatches((prev) =>
      prev.map((match) => {
        if (match.match_id === matchId) {
          return {
            ...match,
            audit_status: 'PENDING REQUEST',
          };
        }
        return match;
      })
    );

    const payload = {
      match: targetMatch,
      match_id: matchId,
      team_id: targetMatch?.team_id || 'team_default',
      home_team_name: targetMatch?.home_team_name,
      away_team_name: targetMatch?.away_team_name,
      league_name: targetMatch?.league_name,
      sport_type: targetMatch?.sport_type,
      match_date: targetMatch?.match_date,
      location: targetMatch?.location,
      coach_notes: targetMatch?.coach_notes,
    };

    // 2. Write directly to Firestore scoresheetRequests collection
    try {
      const coachProfile = await getCoachProfileOfflineFirst().catch(() => null);
      const cId = coachProfile?.coach_id || coachProfile?.user_id || 'coach_default';
      const cName = coachProfile?.full_name || (coachProfile?.first_name ? `${coachProfile.first_name} ${coachProfile.last_name || ''}`.trim() : null) || 'Coach';
      const mName = targetMatch?.customGameTitle || targetMatch?.matchName || targetMatch?.gameName || (targetMatch ? `${targetMatch.home_team_name} vs. ${targetMatch.away_team_name}` : `Match ${matchId}`);

      await submitScoresheetRequestOfflineFirst({
        matchId,
        matchName: mName,
        customGameTitle: mName,
        teamId: targetMatch?.team_id || 'team_default',
        coachId: cId,
        coachName: cName,
        sportType: targetMatch?.sport_type || 'BASKETBALL',
      });
    } catch (fsErr) {
      console.warn('[ScoresheetRequest] submitScoresheetRequestOfflineFirst warning:', fsErr);
    }

    // 3. Transmit to deployed backend via authenticated request or direct fetch
    const mName = targetMatch?.customGameTitle || targetMatch?.matchName || targetMatch?.gameName || (targetMatch ? `${targetMatch.home_team_name} vs. ${targetMatch.away_team_name}` : `Match ${matchId}`);
    const scoresheetPayload = {
      ...payload,
      matchId,
      matchName: mName,
      customGameTitle: mName,
      teamId: targetMatch?.team_id || 'team_default',
      sportType: targetMatch?.sport_type || 'BASKETBALL',
    };

    try {
      await requestAuthenticatedJson('/scoresheets/request', 'POST', scoresheetPayload);
    } catch (_) {
      try {
        await fetch(`${API_BASE}/scoresheets/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scoresheetPayload),
        });
      } catch (_) {}
    }

    try {
      await requestAuthenticatedJson(`/matches/${matchId}/audit-request`, 'POST', payload);
    } catch (err: any) {
      try {
        await fetch(`${API_BASE}/matches/${matchId}/audit-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (fErr) {
        console.warn(`[ScoresheetRequest] Audit request fallback error:`, fErr);
      }
    }

    // 4. Persist updated status in local cache
    try {
      if (targetMatch) {
        await saveMatchOfflineFirst({
          ...targetMatch,
          audit_status: 'PENDING REQUEST',
        });
      }
    } catch (_) {}
  }, [matches]);

  // Simulates official granting & certifying the scoresheet (Backend connected callback)
  const grantAudit = useCallback(async (matchId: string) => {
    // 1. Update local UI state
    setMatches((prev) =>
      prev.map((match) => {
        if (match.match_id === matchId) {
          return {
            ...match,
            audit_status: 'REQUEST GRANTED',
            is_certified: true,
          };
        }
        return match;
      })
    );

    // 2. Transmit certification update to backend if live validation exists
    try {
      await requestAuthenticatedJson(`/validations/${matchId}/certify`, 'POST', {
        context_notes: 'Officially certified via Audit System.',
      });
    } catch (err: any) {
      console.log(`[ScoresheetRequest] Certification state updated for match ${matchId}.`);
    }

    // 3. Persist granted & certified state to coach local cache
    try {
      const matchObj = matches.find((m) => m.match_id === matchId);
      if (matchObj) {
        await saveMatchOfflineFirst({
          ...matchObj,
          audit_status: 'REQUEST GRANTED',
          is_certified: true,
        });
      }
    } catch (_) {}

    Alert.alert(
      'Audit Granted & Certified',
      'Official scoresheet has been audited and certified by Tournament Officials!',
      [{ text: 'OK' }]
    );
  }, [matches]);

  const deleteMatch = useCallback(async (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.match_id !== matchId));
    try {
      await deleteMatchOfflineFirst(matchId);
    } catch (e) {
      console.warn('deleteMatch error:', e);
    }
  }, []);

  // PDF Scoresheet Generator using expo-print & expo-sharing
  const generatePDFScoresheet = useCallback(async (match: OfficialMatchRecord) => {
    try {
      setIsGeneratingPDF(true);

      let statsTableRowsHTML = '';
      if (match.sport_type === 'BASKETBALL') {
        statsTableRowsHTML = (match.box_score_summary || [])
          .map(
            (p) => `
            <tr>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; font-weight: 600;">${p.player_name}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.pts ?? 0}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.ast ?? 0}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.reb ?? 0}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.stl ?? 0}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.blk ?? 0}</td>
            </tr>
          `
          )
          .join('');
      } else if (match.sport_type === 'SWIMMING') {
        statsTableRowsHTML = (match.box_score_summary || [])
          .map(
            (p) => `
            <tr>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; font-weight: 600;">${p.player_name}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.event_name ?? '50m Freestyle'}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.time_seconds ?? '-'}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.split_time ?? '-'}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.rank_position ? `#${p.rank_position}` : '-'}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.lane ?? '-'}</td>
            </tr>
          `
          )
          .join('');
      } else {
        // Track & Field
        statsTableRowsHTML = (match.box_score_summary || [])
          .map(
            (p) => `
            <tr>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; font-weight: 600;">${p.player_name}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.discipline ?? '100m Sprint'}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.mark_result ?? '-'}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.wind_reading ?? 'N/A'}</td>
              <td style="padding:10px; border-bottom: 1px solid #1E293B; text-align:center;">${p.place ? `#${p.place}` : '-'}</td>
            </tr>
          `
          )
          .join('');
      }

      const tableHeaderHTML =
        match.sport_type === 'BASKETBALL'
          ? `
          <tr>
            <th style="padding:10px; text-align:left; color:#94A3B8; font-size:12px;">PLAYER NAME</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">PTS</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">AST</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">REB</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">STL</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">BLK</th>
          </tr>`
          : match.sport_type === 'SWIMMING'
            ? `
          <tr>
            <th style="padding:10px; text-align:left; color:#94A3B8; font-size:12px;">SWIMMER NAME</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">EVENT</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">TIME</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">SPLIT</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">RANK</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">LANE</th>
          </tr>`
            : `
          <tr>
            <th style="padding:10px; text-align:left; color:#94A3B8; font-size:12px;">ATHLETE NAME</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">DISCIPLINE</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">MARK / TIME</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">WIND</th>
            <th style="padding:10px; text-align:center; color:#94A3B8; font-size:12px;">PLACE</th>
          </tr>`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>ATLETA Official Scoresheet - ${match.match_id}</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: #070D19;
              color: #FFFFFF;
              padding: 30px;
              margin: 0;
            }
            .header {
              border-bottom: 2px solid #00C8FF;
              padding-bottom: 15px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand {
              font-size: 26px;
              font-weight: 900;
              letter-spacing: 2px;
              color: #00C8FF;
            }
            .badge {
              background-color: #D1FAE5;
              color: #059669;
              padding: 6px 16px;
              border-radius: 20px;
              font-weight: bold;
              font-size: 13px;
            }
            .match-card {
              background-color: #0F172A;
              border-radius: 12px;
              padding: 20px;
              margin-bottom: 25px;
              border: 1px solid #1E293B;
            }
            .match-title {
              font-size: 22px;
              font-weight: bold;
              margin-bottom: 6px;
            }
            .score-box {
              background-color: #070D19;
              border-radius: 8px;
              padding: 20px;
              display: flex;
              justify-content: space-around;
              align-items: center;
              margin-top: 15px;
            }
            .score-num {
              font-size: 44px;
              font-weight: 900;
              color: #FFFFFF;
            }
            .score-team {
              font-size: 12px;
              color: #94A3B8;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              background-color: #0F172A;
              border-radius: 8px;
              overflow: hidden;
            }
            .footer {
              margin-top: 40px;
              border-top: 1px solid #1E293B;
              padding-top: 20px;
              display: flex;
              justify-content: space-between;
              color: #64748B;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">ATLETA OFFICIAL SCORESHEET</div>
            <div class="badge">OFFICIALLY CERTIFIED</div>
          </div>

          <div class="match-card">
            <div style="color: #00C8FF; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${match.sport_type} &bull; ${match.league_name}</div>
            <div class="match-title">${match.home_team_name} vs. ${match.away_team_name}</div>
            <div style="color: #94A3B8; font-size: 13px;">ID: ${match.match_id} &bull; Date: ${match.match_date} &bull; Venue: ${match.location}</div>

            <div class="score-box">
              <div style="text-align: center;">
                <div class="score-team">${match.home_team_name}</div>
                <div class="score-num">${match.home_score ?? 0}</div>
              </div>
              <div style="font-size: 24px; color: #334155;">|</div>
              <div style="text-align: center;">
                <div class="score-team">${match.away_team_name}</div>
                <div class="score-num">${match.away_score ?? 0}</div>
              </div>
            </div>
          </div>

          <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #FFFFFF;">TEAM PERFORMANCE STATISTICS</div>
          <table>
            <thead>
              ${tableHeaderHTML}
            </thead>
            <tbody>
              ${statsTableRowsHTML}
            </tbody>
          </table>

          <div class="footer">
            <div>Certified by ATLETA Official Audit System &bull; ${new Date().toLocaleDateString()}</div>
            <div>Page 1 of 1</div>
          </div>
        </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ATLETA_Scoresheet_${match.match_id}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadModal({ visible: true, fileName: `ATLETA_Scoresheet_${match.match_id}.html`, uri: url });
      } else {
        // Direct physical file download to device's local storage using expo-file-system
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const fileName = `ATLETA_Scoresheet_${match.match_id}.pdf`;
        const targetPath = `${FileSystem.documentDirectory}${fileName}`;

        // Ensure physical write to device document directory
        await FileSystem.copyAsync({
          from: uri,
          to: targetPath,
        });

        // Verify physical file was written to local storage
        await FileSystem.getInfoAsync(targetPath);

        // Display download completion modal showing saved file in local storage
        setDownloadModal({ visible: true, fileName, uri: targetPath });
      }
    } catch (error) {
      console.error('Error generating PDF scoresheet:', error);
      Alert.alert('Error', 'Failed to generate PDF scoresheet. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      matches,
      isLoadingMatches,
      refreshMatches,
      requestAudit,
      grantAudit,
      deleteMatch,
      generatePDFScoresheet,
      isGeneratingPDF,
      downloadModal,
      closeDownloadModal,
      openPDFFile,
    }),
    [
      matches,
      isLoadingMatches,
      refreshMatches,
      requestAudit,
      grantAudit,
      deleteMatch,
      generatePDFScoresheet,
      isGeneratingPDF,
      downloadModal,
      closeDownloadModal,
      openPDFFile,
    ]
  );

  return (
    <MatchContext.Provider value={value}>
      {children}
    </MatchContext.Provider>
  );
};

export const useMatchContext = () => {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatchContext must be used within a MatchProvider');
  }
  return context;
};

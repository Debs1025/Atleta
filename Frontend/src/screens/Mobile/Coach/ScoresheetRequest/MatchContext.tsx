import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Alert, Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';

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
  sport_type: 'BASKETBALL' | 'SWIMMING' | 'TRACK AND FIELD';
  match_date: string; // e.g. "OCT 24, 2023"
  match_time: string; // e.g. "19:30"
  location: string; // e.g. "Metro Sports Arena, Court 4"
  audit_status: AuditStatus;
  is_certified: boolean;
  home_score?: number;
  away_score?: number;
  box_score_summary?: PlayerBoxScoreMetric[];
  coach_notes?: string[];
}

// sample data for testing
export const INITIAL_MATCH_RECORDS: OfficialMatchRecord[] = [
  {
    match_id: 'MATCH213123',
    team_id: 'team_01',
    home_team_name: 'Panthers',
    away_team_name: 'Hawks',
    league_name: 'BATANG PINOY',
    sport_type: 'BASKETBALL',
    match_date: 'Oct 24, 2026',
    match_time: '19:30',
    location: 'Metro Sports Arena, Court 4',
    audit_status: 'NOT REQUESTED',
    is_certified: false,
    home_score: 84,
    away_score: 78,
    box_score_summary: [
      { athlete_id: 'p1', player_name: 'Marcus V. Stephens', pts: 24, ast: 5, reb: 4, stl: 2, blk: 1 },
      { athlete_id: 'p2', player_name: 'Jake L. Rodriguez', pts: 18, ast: 6, reb: 12, stl: 1, blk: 2 },
      { athlete_id: 'p3', player_name: 'Chen W. Zhao', pts: 12, ast: 2, reb: 1, stl: 2, blk: 0 },
      { athlete_id: 'p4', player_name: 'Tyson K. Reed', pts: 10, ast: 1, reb: 7, stl: 1, blk: 0 },
      { athlete_id: 'p5', player_name: 'Omar Al-Fadil', pts: 15, ast: 4, reb: 12, stl: 1, blk: 3 },
    ],
    coach_notes: ['Strong overall transition play.', 'Defensive rebounds dominated in 4th quarter.']
  },
  {
    match_id: 'MATCH213124',
    team_id: 'team_02',
    home_team_name: 'Vipers',
    away_team_name: 'Blue Jays',
    league_name: 'NATIONAL AQUATICS CHAMPIONSHIP',
    sport_type: 'SWIMMING',
    match_date: 'OCT 22, 2023',
    match_time: '14:00',
    location: 'Olympic Field House',
    audit_status: 'PENDING REQUEST',
    is_certified: false,
    home_score: 112,
    away_score: 95,
    box_score_summary: [
      { athlete_id: 'sw1', player_name: 'Diego Cruz', event_name: '50m Freestyle', time_seconds: '22.45s', split_time: '10.90s', rank_position: 1, lane: 4, pts: 10 },
      { athlete_id: 'sw2', player_name: 'Sienna Reyes', event_name: '100m Butterfly', time_seconds: '58.12s', split_time: '27.50s', rank_position: 1, lane: 3, pts: 10 },
      { athlete_id: 'sw3', player_name: 'Lucas Tan', event_name: '200m Backstroke', time_seconds: '1:58.30', split_time: '58.10s', rank_position: 2, lane: 5, pts: 8 },
      { athlete_id: 'sw4', player_name: 'Hannah Vance', event_name: '100m Freestyle', time_seconds: '54.20s', split_time: '26.10s', rank_position: 1, lane: 2, pts: 10 },
    ]
  },
  {
    match_id: 'MATCH213125',
    team_id: 'team_03',
    home_team_name: 'Wolves FC',
    away_team_name: 'Titans',
    league_name: 'PALARONG PAMBANSA',
    sport_type: 'TRACK AND FIELD',
    match_date: 'OCT 20, 2023',
    match_time: '10:30',
    location: 'Community Stadium North',
    audit_status: 'REQUEST GRANTED',
    is_certified: true,
    home_score: 140,
    away_score: 118,
    box_score_summary: [
      { athlete_id: 'tf1', player_name: 'Gabriel Santos', discipline: '100m Sprint', mark_result: '10.42s', wind_reading: '+1.2 m/s', place: 1, pts: 10 },
      { athlete_id: 'tf2', player_name: 'Mia Gonzales', discipline: '400m Hurdles', mark_result: '54.10s', wind_reading: 'N/A', place: 1, pts: 10 },
      { athlete_id: 'tf3', player_name: 'Noah Perez', discipline: 'Long Jump', mark_result: '7.65m', wind_reading: '+0.8 m/s', place: 2, pts: 8 },
      { athlete_id: 'tf4', player_name: 'Chloe Bennett', discipline: '200m Sprint', mark_result: '23.15s', wind_reading: '+0.5 m/s', place: 1, pts: 10 },
    ]
  },
  {
    match_id: 'MATCH213126',
    team_id: 'team_04',
    home_team_name: 'Eagles',
    away_team_name: 'Sharks',
    league_name: 'BATANG PINOY',
    sport_type: 'BASKETBALL',
    match_date: 'OCT 18, 2023',
    match_time: '18:00',
    location: 'Metro Sports Arena, Court 1',
    audit_status: 'NOT REQUESTED',
    is_certified: false,
    home_score: 79,
    away_score: 82,
    box_score_summary: [
      { athlete_id: 'e1', player_name: 'J. Dela Cruz', pts: 20, ast: 7, reb: 3, stl: 1, blk: 0 },
      { athlete_id: 'e2', player_name: 'A. Rivera', pts: 16, ast: 4, reb: 8, stl: 3, blk: 1 },
      { athlete_id: 'e3', player_name: 'M. Santos', pts: 14, ast: 1, reb: 11, stl: 0, blk: 4 },
    ]
  },
  {
    match_id: 'MATCH213127',
    team_id: 'team_05',
    home_team_name: 'Storm',
    away_team_name: 'Rangers',
    league_name: 'BRAA REGIONALS',
    sport_type: 'BASKETBALL',
    match_date: 'OCT 15, 2023',
    match_time: '15:15',
    location: 'Regional Training Center',
    audit_status: 'REQUEST GRANTED',
    is_certified: true,
    home_score: 92,
    away_score: 85,
    box_score_summary: [
      { athlete_id: 'st1', player_name: 'Adrian Reyes', pts: 28, ast: 8, reb: 5, stl: 3, blk: 1 },
      { athlete_id: 'st2', player_name: 'Brandon Lee', pts: 21, ast: 3, reb: 9, stl: 2, blk: 4 },
      { athlete_id: 'st3', player_name: 'Carlos Mendoza', pts: 14, ast: 5, reb: 4, stl: 1, blk: 0 },
      { athlete_id: 'st4', player_name: 'Darius Thorne', pts: 18, ast: 2, reb: 10, stl: 1, blk: 2 },
    ]
  }
];

interface MatchContextType {
  matches: OfficialMatchRecord[];
  requestAudit: (matchId: string) => void;
  grantAudit: (matchId: string) => void; // Demo / Backend hook for testing certification state
  generatePDFScoresheet: (match: OfficialMatchRecord) => Promise<void>;
  isGeneratingPDF: boolean;
  downloadModal: { visible: boolean; fileName: string; uri: string } | null;
  closeDownloadModal: () => void;
  openPDFFile: (fileUri?: string) => Promise<void>;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export const MatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [matches, setMatches] = useState<OfficialMatchRecord[]>(INITIAL_MATCH_RECORDS);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [downloadModal, setDownloadModal] = useState<{ visible: boolean; fileName: string; uri: string } | null>(null);

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
      Alert.alert('Error', 'Unable to open PDF viewer.');
    }
  }, []);

  // Request Official Scoresheet workflow (ready to swap with backend API fetch/POST)
  const requestAudit = useCallback((matchId: string) => {
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
    Alert.alert(
      'Audit Requested',
      'Official scoresheet audit request submitted to Tournament Officials.',
      [{ text: 'OK' }]
    );
  }, []);

  // Simulates official granting & certifying the scoresheet (Backend callback placeholder)
  const grantAudit = useCallback((matchId: string) => {
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
    Alert.alert(
      'Audit Granted & Certified',
      'Official scoresheet has been audited and certified by Tournament Officials!',
      [{ text: 'OK' }]
    );
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
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
        } else {
          Alert.alert('PDF Download', 'Scoresheet generated successfully.');
        }
      } else {
        // Generate PDF file silently to local device storage without printer/sharing dialogs
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const fileName = `ATLETA_Scoresheet_${match.match_id}.pdf`;
        const targetPath = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.copyAsync({
          from: uri,
          to: targetPath,
        });

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
      requestAudit,
      grantAudit,
      generatePDFScoresheet,
      isGeneratingPDF,
      downloadModal,
      closeDownloadModal,
      openPDFFile,
    }),
    [
      matches,
      requestAudit,
      grantAudit,
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

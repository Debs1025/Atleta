import React, { useState, useEffect } from 'react';
import { X, Users } from 'lucide-react';
import type { OfficialScheduleItem } from '../../api/types';
import { extractTeamString, getCoachNameById } from '../../api/client';
import { styles } from './styles/ScheduleMatch';

interface ScheduleMatchProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleItem: OfficialScheduleItem | null;
  selectedDate?: string | null;
}

const resolveTeamNames = (item: any): { home: string; away: string } => {
  if (!item) return { home: 'HOME TEAM', away: 'AWAY TEAM' };
  const raw = item?.raw_match || {};
  const logistics = item?.venue_logistics || {};

  const home =
    extractTeamString(item?.home_team) ||
    extractTeamString(raw.home_team_name) ||
    extractTeamString(raw.home_team) ||
    extractTeamString(logistics.home_team) ||
    extractTeamString(raw.team_id) ||
    extractTeamString(raw.home_team_id) ||
    (Array.isArray(raw.participating_teams) && raw.participating_teams[0] ? extractTeamString(raw.participating_teams[0]) : '') ||
    '';

  const away =
    extractTeamString(item?.away_team) ||
    extractTeamString(raw.opponent_team_name) ||
    extractTeamString(raw.away_team_name) ||
    extractTeamString(raw.away_team) ||
    extractTeamString(logistics.away_team) ||
    extractTeamString(raw.away_team_id) ||
    (Array.isArray(raw.participating_teams) && raw.participating_teams[1] ? extractTeamString(raw.participating_teams[1]) : '') ||
    '';

  const matchClass = item?.match_class || raw?.game_name || raw?.match_type;
  if ((!home || !away) && typeof matchClass === 'string' && (matchClass.includes(' vs. ') || matchClass.includes(' vs '))) {
    const sep = matchClass.includes(' vs. ') ? ' vs. ' : ' vs ';
    const parts = matchClass.split(sep);
    const parsedHome = parts[0]?.trim();
    const parsedAway = parts[1]?.replace(/\([^)]*\)/, '')?.trim();
    return {
      home: home || parsedHome || 'HOME TEAM',
      away: away || parsedAway || 'AWAY TEAM',
    };
  }

  return {
    home: home || 'HOME TEAM',
    away: away || 'AWAY TEAM',
  };
};

export const ScheduleMatch: React.FC<ScheduleMatchProps> = ({
  isOpen,
  onClose,
  scheduleItem,
  selectedDate,
}) => {
  const [displayCoachName, setDisplayCoachName] = useState<string>('No Coach Assigned');

  useEffect(() => {
    if (!scheduleItem) {
      setDisplayCoachName('No Coach Assigned');
      return;
    }

    const rawList = Array.isArray(scheduleItem.assigned_coaches) && scheduleItem.assigned_coaches.length > 0
      ? scheduleItem.assigned_coaches
      : scheduleItem.coaches
      ? (Array.isArray(scheduleItem.coaches) ? scheduleItem.coaches : [scheduleItem.coaches])
      : scheduleItem.coach_name
      ? [scheduleItem.coach_name]
      : (scheduleItem as any)?.raw_match?.assigned_coaches
      ? (scheduleItem as any).raw_match.assigned_coaches
      : (scheduleItem as any)?.raw_match?.coaches
      ? (scheduleItem as any).raw_match.coaches
      : [];

    const candidateCoaches = (Array.isArray(rawList) ? rawList : [rawList])
      .map(String)
      .map((c) => c.trim())
      .filter((c) => {
        if (!c) return false;
        const lower = c.toLowerCase();
        if (lower === 'official assigned' || lower.startsWith('coach off_') || lower.startsWith('off_') || lower.startsWith('official_')) return false;
        return true;
      });

    if (candidateCoaches.length === 0) {
      setDisplayCoachName('No Coach Assigned');
      return;
    }

    let isMounted = true;
    Promise.all(candidateCoaches.map((c) => getCoachNameById(c)))
      .then((names) => {
        if (!isMounted) return;
        const valid = names.map((n) => n.trim()).filter(Boolean);
        if (valid.length > 0) {
          setDisplayCoachName(valid.join(', '));
        } else {
          const fallback = candidateCoaches
            .map((c) => c.replace(/^coach[_\s]*/i, '').trim())
            .filter((c) => !c.toLowerCase().startsWith('off_'))
            .join(', ');
          setDisplayCoachName(fallback || 'No Coach Assigned');
        }
      })
      .catch(() => {
        if (isMounted) setDisplayCoachName('No Coach Assigned');
      });

    return () => {
      isMounted = false;
    };
  }, [scheduleItem]);

  if (!isOpen) return null;

  let dateHeader = 'TODAY';
  try {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        dateHeader = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } else if (scheduleItem?.scheduled_time) {
      const d = new Date(scheduleItem.scheduled_time);
      if (!isNaN(d.getTime())) {
        dateHeader = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
  } catch {}

  let timeStr = 'TBD';
  try {
    if (scheduleItem?.scheduled_time) {
      const d = new Date(scheduleItem.scheduled_time);
      if (!isNaN(d.getTime())) {
        timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }
  } catch {}

  const sport = String(
    scheduleItem?.sport ||
    scheduleItem?.venue_logistics?.sport ||
    'BASKETBALL'
  ).toUpperCase();

  const { home: homeTeam, away: awayTeam } = resolveTeamNames(scheduleItem);

  const homeInitial = homeTeam.trim() ? homeTeam.trim().charAt(0).toUpperCase() : 'H';
  const awayInitial = awayTeam.trim() ? awayTeam.trim().charAt(0).toUpperCase() : 'A';

  const venueLocation = String(
    scheduleItem?.venue ||
    scheduleItem?.venue_logistics?.location ||
    'SPORTS COMPLEX'
  );

  const courtNum = String(
    scheduleItem?.court_number ||
    scheduleItem?.venue_logistics?.court ||
    '1'
  );

  const coachDisplay = displayCoachName;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.drawer}>
        {/* Top Dark Header */}
        <div style={styles.drawerHeader}>
          <div>
            <h2 style={styles.headerTitle}>MATCH DAY DETAILS</h2>
            <p style={styles.headerSubtitle}>{dateHeader}</p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} title="Close">
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Drawer Body Content */}
        <div style={styles.drawerBody}>
          {/* Match Double-Bordered Offset Box */}
          <div style={styles.matchCardWrapper}>
            <div style={styles.timeTag}>{timeStr}</div>

            <div style={styles.matchCardOuter}>
              <div style={styles.sportPill}>{sport}</div>

              <div style={styles.teamList}>
                <div style={styles.teamRow}>
                  <div style={styles.teamLetterBox}>{homeInitial}</div>
                  <span style={styles.teamName}>{homeTeam}</span>
                </div>

                <div style={styles.teamRow}>
                  <div style={styles.teamLetterBox}>{awayInitial}</div>
                  <span style={styles.teamName}>{awayTeam}</span>
                </div>
              </div>

              <div style={styles.dashedDivider} />

              <div style={styles.officialsSection}>
                <span style={styles.officialsLabel}>COACHES:</span>
                <div style={styles.officialsAvatars}>
                  <Users style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B132B', textTransform: 'uppercase' }}>
                    {coachDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Venue Logistics Box */}
          <div style={styles.logisticsBox}>
            <h3 style={styles.logisticsTitle}>VENUE LOGISTICS</h3>
            <div style={styles.logisticsGrid}>
              <div style={styles.logisticsRow}>
                <span style={styles.logisticsKey}>LOCATION</span>
                <span style={styles.logisticsVal}>{venueLocation}</span>
              </div>
              <div style={styles.logisticsRow}>
                <span style={styles.logisticsKey}>SPORT</span>
                <span style={styles.logisticsVal}>{sport}</span>
              </div>
              <div style={styles.logisticsRow}>
                <span style={styles.logisticsKey}>COURT</span>
                <span style={styles.logisticsVal}>{courtNum}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

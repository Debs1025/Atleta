import React from 'react';
import { X, Users } from 'lucide-react';
import type { OfficialScheduleItem } from '../../api/types';
import { styles } from './styles/ScheduleMatch';

interface ScheduleMatchProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleItem: OfficialScheduleItem | null;
  selectedDate?: string | null;
}

export const ScheduleMatch: React.FC<ScheduleMatchProps> = ({
  isOpen,
  onClose,
  scheduleItem,
  selectedDate,
}) => {
  if (!isOpen) return null;
  
  //hardcoded for testing
  let dateHeader = 'OCTOBER 22, 2026';
  try {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        dateHeader = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } else if (scheduleItem?.scheduled_time) {
      const d = new Date(scheduleItem.scheduled_time);
      dateHeader = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  } catch {
    dateHeader = 'OCTOBER 22, 2026';
  }

  let timeStr = '2:00 PM';
  try {
    if (scheduleItem?.scheduled_time) {
      const d = new Date(scheduleItem.scheduled_time);
      if (!isNaN(d.getTime())) {
        timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }
  } catch {
    timeStr = '2:00 PM';
  }

  const sport = String(
    scheduleItem?.sport ||
    scheduleItem?.venue_logistics?.sport ||
    'BASKETBALL'
  ).toUpperCase();

  const homeTeam = String(
    scheduleItem?.home_team ||
    scheduleItem?.venue_logistics?.home_team ||
    'ADNU KNIGHTS'
  );

  const awayTeam = String(
    scheduleItem?.away_team ||
    scheduleItem?.venue_logistics?.away_team ||
    'ADMU EAGLES'
  );

  const homeInitial = homeTeam.trim() ? homeTeam.trim().charAt(0).toUpperCase() : 'A';
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
                <span style={styles.officialsLabel}>OFFICIALS ASSIGNED:</span>
                <div style={styles.officialsAvatars}>
                  <Users style={{ width: 22, height: 22 }} />
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

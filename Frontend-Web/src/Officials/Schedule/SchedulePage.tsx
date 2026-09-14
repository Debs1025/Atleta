import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getMe,
  getOfficialSchedules,
  isMatchCreatedByOfficial,
  extractTeamString,
  getCoachNameById,
} from '../../api/client';
import type { AuthUser, OfficialScheduleItem } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/SchedulePage';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

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

export const SchedulePage: React.FC = () => {
  const navigate = useNavigate();

  // Month navigation initialized to the exact current date of the device
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const [user, setUser] = useState<AuthUser | null>(
    () => getCachedData<AuthUser>('user_me') || getStoredUser()
  );
  const [schedules, setSchedules] = useState<OfficialScheduleItem[]>(
    () => getCachedData<OfficialScheduleItem[]>(`official_schedules_${month}_${year}`) || []
  );

  // Selected date initialized to current date of the device
  const now = new Date();
  const todayFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayFormatted);
  const [selectedMatch, setSelectedMatch] = useState<OfficialScheduleItem | null>(null);
  const [displayCoachName, setDisplayCoachName] = useState<string>('No Coach Assigned');

  useEffect(() => {
    if (!selectedMatch) {
      setDisplayCoachName('No Coach Assigned');
      return;
    }

    const rawList = Array.isArray(selectedMatch.assigned_coaches) && selectedMatch.assigned_coaches.length > 0
      ? selectedMatch.assigned_coaches
      : selectedMatch.coaches
      ? (Array.isArray(selectedMatch.coaches) ? selectedMatch.coaches : [selectedMatch.coaches])
      : selectedMatch.coach_name
      ? [selectedMatch.coach_name]
      : (selectedMatch as any)?.raw_match?.assigned_coaches
      ? (selectedMatch as any).raw_match.assigned_coaches
      : (selectedMatch as any)?.raw_match?.coaches
      ? (selectedMatch as any).raw_match.coaches
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
  }, [selectedMatch]);

  const refreshSchedules = () => {
    getOfficialSchedules(month, year, true).then((res) => {
      const list = res || [];
      setSchedules(list);
      if (list.length > 0) setSelectedMatch(list[list.length - 1]);
    }).catch(() => {});
  };

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }

    Promise.all([
      getMe().then((res) => setUser(res)).catch(() => {}),
      getOfficialSchedules(month, year).then((res) => {
        const list = res || [];
        setSchedules(list);
        // Find if match exists on selected date
        const matchOnDate = list.find((s) => {
          const timeStr = s?.scheduled_time || (s as any)?.raw_match?.match_date || (s as any)?.match_date;
          if (!timeStr) return false;
          return timeStr.startsWith(todayFormatted) || timeStr.includes(todayFormatted);
        });
        if (matchOnDate) {
          setSelectedMatch(matchOnDate);
        } else if (list.length > 0) {
          setSelectedMatch(list[0]);
          const firstTime = list[0].scheduled_time || (list[0] as any).raw_match?.match_date || (list[0] as any).match_date;
          if (firstTime) {
            setSelectedDateStr(firstTime.split('T')[0]);
          }
        }
      }).catch(() => {}),
    ]);
  }, [navigate, month, year, todayFormatted]);

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calendar calculations (Monday start)
  const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const safeSchedules = (Array.isArray(schedules) ? schedules : []).filter((s) => {
    return isMatchCreatedByOfficial(s as any, user);
  });

  const onCellClick = (dayNum: number, matchesForDay: OfficialScheduleItem[]) => {
    const formatted = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    setSelectedDateStr(formatted);
    if (Array.isArray(matchesForDay) && matchesForDay.length > 0) {
      setSelectedMatch(matchesForDay[0]);
    } else {
      setSelectedMatch(null);
    }
  };

  // Safe formatting for details sidebar
  let detailsDateHeader = 'TODAY';
  try {
    if (selectedDateStr) {
      const parts = selectedDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        detailsDateHeader = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
  } catch {
    detailsDateHeader = 'TODAY';
  }

  let detailsTimeStr = 'TBD';
  try {
    if (selectedMatch?.scheduled_time) {
      const d = new Date(selectedMatch.scheduled_time);
      if (!isNaN(d.getTime())) {
        detailsTimeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    }
  } catch {
    detailsTimeStr = 'TBD';
  }

  const detailsSport = String(
    selectedMatch?.sport ||
    selectedMatch?.venue_logistics?.sport ||
    'BASKETBALL'
  ).toUpperCase();

  const { home: detailsHomeTeam, away: detailsAwayTeam } = resolveTeamNames(selectedMatch);

  const homeInitial = detailsHomeTeam.trim() ? detailsHomeTeam.trim().charAt(0).toUpperCase() : 'H';
  const awayInitial = detailsAwayTeam.trim() ? detailsAwayTeam.trim().charAt(0).toUpperCase() : 'A';

  const venueLocation = String(
    selectedMatch?.venue ||
    selectedMatch?.venue_logistics?.location ||
    'MAIN COMPLEX'
  );

  const courtNum = String(
    selectedMatch?.court_number ||
    selectedMatch?.venue_logistics?.court ||
    '1'
  );

  const selectedDayNum = selectedDateStr ? Number(selectedDateStr.split('-')[2]) : null;

  return (
    <div style={styles.shell}>
      {/* Shared Navbar */}
      <Navbar user={user} />

      {/* Main Body */}
      <div style={styles.layoutBody}>
        {/* Shared Sidebar */}
        <Sidebar
          activeTab="SCHEDULES"
          onMatchCreated={refreshSchedules}
        />

        {/* Schedules Content Area */}
        <main style={styles.contentArea}>
          {/* Left Column: Calendar Section */}
          <div style={styles.calendarSection}>
            {/* Header Controls */}
            <div style={styles.headerControlsRow}>
              <h1 style={styles.monthTitle}>{monthName}</h1>
              <div style={styles.stepBtnGroup}>
                <button type="button" onClick={prevMonth} style={styles.stepBtn} title="Previous month">
                  <ChevronLeft style={{ width: 18, height: 18 }} />
                </button>
                <div style={styles.stepDivider} />
                <button type="button" onClick={nextMonth} style={styles.stepBtn} title="Next month">
                  <ChevronRight style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            {/* Calendar Table Grid */}
            <table style={styles.calendarTable}>
              <thead>
                <tr>
                  {DAYS.map((day) => (
                    <th key={day} style={styles.calTh}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(1, Math.ceil(totalCells / 7)) }).map((_, weekIndex) => (
                  <tr key={weekIndex}>
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const cellIndex = weekIndex * 7 + dayIndex;
                      const dayNum = cellIndex - firstDayIndex + 1;
                      const isValidDay = dayNum > 0 && dayNum <= daysInMonth;

                      if (!isValidDay) {
                        return <td key={dayIndex} style={styles.calTdEmpty} />;
                      }

                      // Matches for this day
                      const targetDatePrefix = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const matchesForDay = safeSchedules.filter((s) => {
                        if (!s) return false;
                        const timeStr = s.scheduled_time || (s as any).raw_match?.match_date || (s as any).match_date || '';
                        if (!timeStr) return false;
                        if (timeStr.startsWith(targetDatePrefix) || timeStr.includes(targetDatePrefix)) return true;
                        try {
                          const d = new Date(timeStr);
                          if (isNaN(d.getTime())) return false;
                          return (
                            (d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === dayNum) ||
                            (d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === dayNum)
                          );
                        } catch {
                          return false;
                        }
                      });

                      const isSelected = dayNum === selectedDayNum;

                      return (
                        <td
                          key={dayIndex}
                          onClick={() => onCellClick(dayNum, matchesForDay)}
                          style={{
                            ...styles.calTd,
                            backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                          }}
                        >
                          <div
                            style={{
                              ...styles.dateNum,
                              ...(isSelected ? styles.dateNumActive : {}),
                            }}
                          >
                            {String(dayNum).padStart(2, '0')}
                          </div>

                          <div style={styles.badgeWrap}>
                            {matchesForDay.map((m, idx) => {
                              const sport = String(m?.sport || m?.venue_logistics?.sport || 'BASKETBALL').toUpperCase();
                              const code = sport.includes('SWIM')
                                ? 'SW'
                                : sport.includes('TRACK') || sport.includes('FIELD')
                                ? 'TF'
                                : '';
                              const badgeStyle =
                                code === 'SW'
                                  ? styles.vbBadge
                                  : code === 'TF'
                                  ? styles.fbBadge
                                  : styles.bbBadge;

                              const { home: mHome, away: mAway } = resolveTeamNames(m);
                              const label = mHome && mAway ? `${mHome} vs. ${mAway}` : mHome || mAway || 'Event';

                              return (
                                <div
                                  key={m?.schedule_id || idx}
                                  style={{ ...styles.matchBadge, ...badgeStyle }}
                                >
                                  {code ? <strong>{code} </strong> : null}{label}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Column: Live Match Day Details Column */}
          <div style={styles.detailsSection}>
            <div style={styles.detailsCard}>
              <div style={styles.detailsBanner}>
                <h2 style={styles.detailsTitle}>MATCH DAY DETAILS</h2>
                <p style={styles.detailsDateSub}>{detailsDateHeader}</p>
              </div>

              <div style={styles.detailsBody}>
                {selectedMatch ? (
                  <>
                    {/* Live Match Card */}
                    <div style={styles.matchCardWrapper}>
                      <div style={styles.timeTag}>{detailsTimeStr}</div>

                      <div style={styles.matchCardOuter}>
                        <div style={styles.sportPill}>{detailsSport}</div>

                        <div style={styles.teamList}>
                          <div style={styles.teamRow}>
                            <div style={styles.teamLetterBox}>{homeInitial}</div>
                            <span style={styles.teamName}>{detailsHomeTeam}</span>
                          </div>

                          <div style={styles.teamRow}>
                            <div style={styles.teamLetterBox}>{awayInitial}</div>
                            <span style={styles.teamName}>{detailsAwayTeam}</span>
                          </div>
                        </div>

                        <div style={styles.dashedDivider} />

                        <div style={styles.officialsSection}>
                          <span style={styles.officialsLabel}>COACHES:</span>
                          <div style={styles.officialsAvatars}>
                            <Users style={{ width: 16, height: 16, flexShrink: 0 }} />
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#0B132B', textTransform: 'uppercase' }}>
                              {displayCoachName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Live Venue Logistics Box */}
                    <div style={styles.logisticsBox}>
                      <h3 style={styles.logisticsTitle}>VENUE LOGISTICS</h3>
                      <div style={styles.logisticsGrid}>
                        <div style={styles.logisticsRow}>
                          <span style={styles.logisticsKey}>LOCATION</span>
                          <span style={styles.logisticsVal}>{venueLocation}</span>
                        </div>
                        <div style={styles.logisticsRow}>
                          <span style={styles.logisticsKey}>SPORT</span>
                          <span style={styles.logisticsVal}>{detailsSport}</span>
                        </div>
                        <div style={styles.logisticsRow}>
                          <span style={styles.logisticsKey}>COURT</span>
                          <span style={styles.logisticsVal}>{courtNum}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px' }}>
                    <p style={{ margin: 0, fontWeight: 800, textTransform: 'uppercase', color: '#64748B', fontSize: '12px' }}>
                      No matches scheduled
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.4 }}>
                      Select a date with match badges or click <strong>CREATE MATCH</strong> to add a new game.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

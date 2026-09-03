import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users, Loader2, X } from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getMe,
  getOfficialSchedules,
  createOfficialMatch,
} from '../../api/client';
import type { AuthUser, OfficialScheduleItem } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/SchedulePage';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

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

  // Selected date initialized to today's date on the device
  const now = new Date();
  const todayFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayFormatted);
  const [selectedMatch, setSelectedMatch] = useState<OfficialScheduleItem | null>(null);

  // Create match modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [sportType, setSportType] = useState('BASKETBALL');
  const [homeTeam, setHomeTeam] = useState('');
  const [opponentTeam, setOpponentTeam] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [venue, setVenue] = useState('Sports Complex');
  const [court, setCourt] = useState('1');

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
          if (!s?.scheduled_time) return false;
          return s.scheduled_time.startsWith(todayFormatted);
        });
        if (matchOnDate) {
          setSelectedMatch(matchOnDate);
        } else if (list.length > 0) {
          setSelectedMatch(list[0]);
          if (list[0].scheduled_time) {
            setSelectedDateStr(list[0].scheduled_time.split('T')[0]);
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

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErr(null);
    if (!homeTeam || !opponentTeam || !matchDate) {
      setCreateErr('Please fill in all required match fields.');
      return;
    }

    try {
      setCreating(true);
      await createOfficialMatch({
        sport_type: sportType,
        home_team_name: homeTeam,
        opponent_team_name: opponentTeam,
        match_date: new Date(matchDate).toISOString(),
        location: venue,
        court_number: court,
      });
      setIsCreateModalOpen(false);
      setHomeTeam('');
      setOpponentTeam('');
      setMatchDate('');
      getOfficialSchedules(month, year, true).then((res) => {
        const list = res || [];
        setSchedules(list);
        if (list.length > 0) setSelectedMatch(list[list.length - 1]);
      }).catch(() => {});
    } catch (err: any) {
      setCreateErr(err.message || 'Failed to create match.');
    } finally {
      setCreating(false);
    }
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calendar calculations (Monday start)
  const firstDayIndex = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const safeSchedules = Array.isArray(schedules) ? schedules : [];

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

  const detailsHomeTeam = String(
    selectedMatch?.home_team ||
    selectedMatch?.venue_logistics?.home_team ||
    'HOME TEAM'
  );

  const detailsAwayTeam = String(
    selectedMatch?.away_team ||
    selectedMatch?.venue_logistics?.away_team ||
    'AWAY TEAM'
  );

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
          onCreateMatch={() => setIsCreateModalOpen(true)}
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

                      // Live Matches for this day from Backend API
                      const matchesForDay = safeSchedules.filter((s) => {
                        if (!s || !s.scheduled_time) return false;
                        try {
                          const d = new Date(s.scheduled_time);
                          return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === dayNum;
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
                              const code = sport.startsWith('VOL')
                                ? 'VB'
                                : sport.startsWith('FOOT')
                                ? 'FB'
                                : 'BB';
                              const badgeStyle =
                                code === 'VB'
                                  ? styles.vbBadge
                                  : code === 'FB'
                                  ? styles.fbBadge
                                  : styles.bbBadge;

                              const home = String(m?.home_team || m?.venue_logistics?.home_team || 'Team A');
                              const away = String(m?.away_team || m?.venue_logistics?.away_team || 'Team B');

                              return (
                                <div
                                  key={m?.schedule_id || idx}
                                  style={{ ...styles.matchBadge, ...badgeStyle }}
                                >
                                  <strong>{code}</strong> {home} vs. {away}
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
                          <span style={styles.officialsLabel}>OFFICIALS ASSIGNED:</span>
                          <div style={styles.officialsAvatars}>
                            <Users style={{ width: 22, height: 22 }} />
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

      {/* Create Match Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 19, 43, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #0B132B', width: '92%', maxWidth: '500px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0B132B', margin: 0 }}>CREATE SCHEDULED MATCH</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {createErr && (
              <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', color: '#B91C1C', fontSize: '12px', marginBottom: '14px' }}>
                {createErr}
              </div>
            )}

            <form onSubmit={handleCreateMatch}>
              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>SPORT</label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                >
                  <option value="BASKETBALL">Basketball</option>
                  <option value="VOLLEYBALL">Volleyball</option>
                  <option value="FOOTBALL">Football</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>HOME TEAM</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADNU Knights"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>OPPONENT TEAM</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADMU Eagles"
                  value={opponentTeam}
                  onChange={(e) => setOpponentTeam(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>MATCH DATE & TIME</label>
                <input
                  type="datetime-local"
                  required
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>VENUE</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>COURT</label>
                  <input
                    type="text"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '10px 16px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: '10px 18px', border: 'none', backgroundColor: '#0B132B', color: '#FFFFFF', fontWeight: 800, borderRadius: '4px', cursor: 'pointer' }}
                >
                  {creating ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : 'SAVE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

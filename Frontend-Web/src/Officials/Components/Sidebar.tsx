import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, Calendar, Settings, LogOut, AlertCircle, X, Loader2 } from 'lucide-react';
import { clearAuthSession, createOfficialMatch } from '../../api/client';
import { styles } from './styles/Sidebar';

interface SidebarProps {
  activeTab: 'DASHBOARD' | 'SCHEDULES' | 'SETTINGS';
  onCreateMatch?: () => void;
  onMatchCreated?: () => void;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'DASHBOARD', Icon: LayoutGrid, key: 'DASHBOARD' },
  { to: '/schedules', label: 'SCHEDULES', Icon: Calendar, key: 'SCHEDULES' },
  { to: '/settings', label: 'SETTINGS', Icon: Settings, key: 'SETTINGS' },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onCreateMatch, onMatchCreated }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  // Create match modal state inside Sidebar
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [sportType, setSportType] = useState('BASKETBALL');
  const [homeTeam, setHomeTeam] = useState('');
  const [opponentTeam, setOpponentTeam] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('14:00');
  const [venue, setVenue] = useState('Sports Complex');
  const [court, setCourt] = useState('1');

  const handleOpenCreateMatch = () => {
    if (onCreateMatch) {
      onCreateMatch();
    } else {
      setIsCreateModalOpen(true);
    }
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
      const isoDate = matchTime
        ? new Date(`${matchDate}T${matchTime}:00`).toISOString()
        : new Date(matchDate).toISOString();

      await createOfficialMatch({
        sport_type: sportType,
        home_team_name: homeTeam,
        opponent_team_name: opponentTeam,
        match_date: isoDate,
        location: venue,
        court_number: court,
      });
      setIsCreateModalOpen(false);
      setHomeTeam('');
      setOpponentTeam('');
      setMatchDate('');
      setMatchTime('14:00');
      if (onMatchCreated) onMatchCreated();
    } catch (err: any) {
      setCreateErr(err.message || 'Failed to create match.');
    } finally {
      setCreating(false);
    }
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    clearAuthSession();
    navigate('/login');
  };

  return (
    <>
      <aside style={styles.sidebar}>
        <div style={styles.topSection}>
          <button
            type="button"
            onClick={handleOpenCreateMatch}
            className="btn-primary"
            style={styles.createBtn}
          >
            <Plus style={{ width: 15, height: 15, strokeWidth: 2 }} />
            <span>CREATE MATCH</span>
          </button>

          <nav style={styles.nav}>
            {NAV_ITEMS.map(({ to, label, Icon, key }) => {
              const isActive = activeTab === key;
              const isHovered = hovered === key && !isActive;

              return (
                <Link
                  key={key}
                  to={to}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : isHovered ? styles.navLinkHovered : {}),
                  }}
                >
                  <Icon style={{ width: 16, height: 16, strokeWidth: isActive ? 2.2 : 1.8 }} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => setShowLogoutModal(true)}
          onMouseEnter={() => setHovered('logout')}
          onMouseLeave={() => setHovered(null)}
          style={{
            ...styles.logoutBtn,
            ...(hovered === 'logout' ? styles.logoutBtnHovered : {}),
          }}
        >
          <LogOut style={{ width: 16, height: 16, color: hovered === 'logout' ? '#DC2626' : '#EF4444' }} />
          <span>LOGOUT</span>
        </button>
      </aside>

      {/* Create Match Modal Owned by Sidebar */}
      {isCreateModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeaderRow}>
              <h3 style={styles.modalTitle}>CREATE SCHEDULED MATCH</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={styles.closeBtn}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {createErr && <div style={styles.errorBox}>{createErr}</div>}

            <form onSubmit={handleCreateMatch}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>SPORT</label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value)}
                  style={styles.formInput}
                >
                  <option value="BASKETBALL">Basketball</option>
                  <option value="SWIMMING">Swimming</option>
                  <option value="TRACK AND FIELD">Track and Field</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>HOME TEAM</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADNU Knights"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>OPPONENT TEAM</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADMU Eagles"
                  value={opponentTeam}
                  onChange={(e) => setOpponentTeam(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              {/* Line dividing teams from schedule & logistics */}
              <div style={styles.formDivider} />

              <div style={styles.formGrid}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.formLabel}>MATCH DATE</label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.formLabel}>MATCH TIME</label>
                  <input
                    type="time"
                    required
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.formLabel}>VENUE</label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={styles.formLabel}>COURT / LANE</label>
                  <input
                    type="text"
                    value={court}
                    onChange={(e) => setCourt(e.target.value)}
                    style={styles.formInput}
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={styles.saveBtn}
                >
                  {creating ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : 'SAVE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.logoutCard}>
            <div style={styles.modalHeaderRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: 20, height: 20, color: '#DC2626' }} />
                <h3 style={styles.logoutTitle}>CONFIRM LOGOUT</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={styles.closeBtn}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <p style={styles.logoutDesc}>
              Are you sure you want to log out of your official session? You will need to sign in again to access tournament operations.
            </p>

            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={styles.logoutCancelBtn}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                style={styles.logoutConfirmBtn}
              >
                LOG OUT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

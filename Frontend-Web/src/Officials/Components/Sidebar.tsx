import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, Calendar, Settings, LogOut, AlertCircle, X } from 'lucide-react';
import { clearAuthSession } from '../../api/client';
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

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onCreateMatch }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleOpenCreateMatch = () => {
    if (onCreateMatch) {
      onCreateMatch();
    } else {
      navigate('/create-match');
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

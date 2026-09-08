import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  DraftingCompass,
  Users,
  LogOut,
  AlertCircle,
  X,
} from 'lucide-react';
import { clearAuthSession } from '../../api/client';
import { styles } from './styles/Sidebar';

export type SysAdminTab = 'AUDIT_QUEUE' | 'SPORT_ARCHITECTURE' | 'USER_MANAGEMENT';

interface SidebarProps {
  activeTab?: SysAdminTab;
}

const NAV_ITEMS = [
  { key: 'AUDIT_QUEUE' as SysAdminTab, label: 'AUDIT QUEUE', to: '/admin/dashboard', Icon: ClipboardCheck },
  { key: 'SPORT_ARCHITECTURE' as SysAdminTab, label: 'SPORT ARCHITECTURE', to: '/admin/dashboard', Icon: DraftingCompass },
  { key: 'USER_MANAGEMENT' as SysAdminTab, label: 'USER MANAGEMENT', to: '/admin/dashboard', Icon: Users },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ activeTab = 'AUDIT_QUEUE' }) => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const confirmLogout = () => {
    setShowLogoutModal(false);
    clearAuthSession();
    navigate('/login');
  };

  return (
    <>
      <aside style={styles.sidebar}>
        {/* Navigation Items (Top) */}
        <div style={styles.topSection}>
          <nav style={styles.nav}>
            {NAV_ITEMS.map(({ key, label, to, Icon }) => {
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
                  <Icon style={{ width: 16, height: 16, strokeWidth: isActive ? 2.4 : 1.8 }} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Button (Bottom Left) */}
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
        <div style={styles.modalOverlay} onClick={() => setShowLogoutModal(false)}>
          <div style={styles.logoutCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeaderRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: 18, height: 18, color: '#DC2626' }} />
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
              Are you sure you want to log out of your System Administrator session? You will need to sign in again to access the terminal.
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

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, Calendar, Settings, LogOut, AlertCircle, X } from 'lucide-react';
import { clearAuthSession } from '../../api/client';

interface SidebarProps {
  activeTab: 'DASHBOARD' | 'SCHEDULES' | 'SETTINGS';
  onCreateMatch?: () => void;
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

  const confirmLogout = () => {
    setShowLogoutModal(false);
    clearAuthSession();
    navigate('/login');
  };

  return (
    <>
      <aside
        style={{
          width: '240px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #0B132B',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          boxSizing: 'border-box',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <button
            type="button"
            onClick={onCreateMatch}
            className="btn-primary"
            style={{
              backgroundColor: '#0B132B',
              color: '#FFFFFF',
              padding: '12px 20px',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Plus style={{ width: 15, height: 15, strokeWidth: 2 }} />
            <span>CREATE MATCH</span>
          </button>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textDecoration: 'none',
                    color: isActive ? '#0284C7' : isHovered ? '#0B132B' : '#64748B',
                    backgroundColor: isActive ? '#F0F9FF' : isHovered ? '#F1F5F9' : 'transparent',
                    borderLeft: isActive ? '4px solid #0284C7' : isHovered ? '4px solid #CBD5E1' : '4px solid transparent',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
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
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: hovered === 'logout' ? '#DC2626' : '#EF4444',
            backgroundColor: hovered === 'logout' ? '#FEF2F2' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <LogOut style={{ width: 16, height: 16, color: hovered === 'logout' ? '#DC2626' : '#EF4444' }} />
          <span>LOGOUT</span>
        </button>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 19, 43, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '2px solid #0B132B',
              width: '90%',
              maxWidth: '400px',
              padding: '24px 28px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: 20, height: 20, color: '#DC2626' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0B132B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  CONFIRM LOGOUT
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0 }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 24px 0', lineHeight: 1.5, fontWeight: 500 }}>
              Are you sure you want to log out of your official session? You will need to sign in again to access tournament operations.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                style={{
                  padding: '9px 18px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                style={{
                  padding: '9px 20px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  transition: 'background-color 0.15s ease',
                }}
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

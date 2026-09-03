import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, Calendar, Settings, LogOut } from 'lucide-react';
import { clearAuthSession } from '../../api/client';

interface SidebarProps {
  activeTab: 'DASHBOARD' | 'SCHEDULES' | 'SETTINGS';
  onCreateMatch?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onCreateMatch }) => {
  const navigate = useNavigate();

  const onLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textDecoration: 'none',
    color: isActive ? '#0284C7' : '#64748B',
    backgroundColor: isActive ? '#F0F9FF' : 'transparent',
    borderLeft: isActive ? '4px solid #0284C7' : '4px solid transparent',
    transition: 'all 0.15s ease',
  });

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        boxSizing: 'border-box',
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
            fontWeight: 500,
            letterSpacing: '0.14em',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <Plus style={{ width: 15, height: 15, strokeWidth: 1.8 }} />
          <span>CREATE MATCH</span>
        </button>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link to="/dashboard" style={navItemStyle(activeTab === 'DASHBOARD')}>
            <LayoutGrid style={{ width: 16, height: 16 }} />
            <span>DASHBOARD</span>
          </Link>
          <Link to="/schedules" style={navItemStyle(activeTab === 'SCHEDULES')}>
            <Calendar style={{ width: 16, height: 16 }} />
            <span>SCHEDULES</span>
          </Link>
          <Link to="/settings" style={navItemStyle(activeTab === 'SETTINGS')}>
            <Settings style={{ width: 16, height: 16 }} />
            <span>SETTINGS</span>
          </Link>
        </nav>
      </div>

      <button
        type="button"
        onClick={onLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: '#64748B',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        <LogOut style={{ width: 16, height: 16 }} />
        <span>LOGOUT</span>
      </button>
    </aside>
  );
};

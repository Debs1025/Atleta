import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import type { AuthUser } from '../../api/types';

interface NavbarProps {
  user?: AuthUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const displayName =
    user?.full_name ||
    user?.full_legal_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'ERICK DE BELEN';

  return (
    <header
      style={{
        height: '58px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <Link
        to="/dashboard"
        style={{
          fontSize: '22px',
          fontWeight: '900',
          letterSpacing: '0.25em',
          color: '#0B132B',
          textDecoration: 'none',
        }}
      >
        ATLETA<sup style={{ fontSize: '10px', fontWeight: '800', verticalAlign: 'super', marginLeft: '3px', letterSpacing: '0.05em' }}>WEB</sup>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          type="button"
          title="Notifications"
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#0B132B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
          }}
        >
          <Bell style={{ width: 18, height: 18 }} />
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
            }}
          />
        </button>

        <div style={{ width: '1px', height: '26px', backgroundColor: '#E2E8F0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#94A3B8',
                letterSpacing: '0.12em',
                lineHeight: 1,
              }}
            >
              OFFICIAL
            </span>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: '#0B132B',
                letterSpacing: '0.04em',
                marginTop: '3px',
              }}
            >
              {displayName.toUpperCase()}
            </span>
          </div>

          {/* Tailwind CSS / Heroicons User Circle Icon */}
          <svg
            style={{
              width: '34px',
              height: '34px',
              color: '#0B132B',
              flexShrink: 0,
            }}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        </div>
      </div>
    </header>
  );
};

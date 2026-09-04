import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import type { AuthUser } from '../../api/types';
import { useNotifications } from '../Notification/useNotifications';
import { NotificationFloat } from '../Notification/NotificationFloat';

interface NavbarProps {
  user: AuthUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isBellHovered, setIsBellHovered] = useState(false);
  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    markSingleRead,
  } = useNotifications();

  // Extract official's name from auth user record
  const displayName =
    user?.full_legal_name ||
    user?.full_name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : null) ||
    (user?.email ? user.email.split('@')[0].toUpperCase() : '') ||
    'OFFICIAL';

  return (
    <header
      style={{
        height: '58px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #0B132B',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        boxSizing: 'border-box',
        flexShrink: 0,
        position: 'relative',
        zIndex: 50,
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        {/* Notification Bell Button */}
        <button
          ref={bellButtonRef}
          type="button"
          title="Notifications"
          onClick={() => setIsNotifOpen((prev) => !prev)}
          onMouseEnter={() => setIsBellHovered(true)}
          onMouseLeave={() => setIsBellHovered(false)}
          style={{
            position: 'relative',
            backgroundColor: isBellHovered ? '#F1F5F9' : 'transparent',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            color: isBellHovered ? '#0284C7' : '#0B132B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '6px',
            outline: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <Bell style={{ width: 18, height: 18, pointerEvents: 'none' }} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                pointerEvents: 'none',
              }}
            />
          )}
        </button>

        {/* Floating Notifications Popover */}
        <NotificationFloat
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          triggerRef={bellButtonRef}
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          onMarkAllRead={markAllRead}
          onMarkSingleRead={markSingleRead}
        />

        <div style={{ width: '1px', height: '26px', backgroundColor: '#CBD5E1' }} />

        <Link
          to="/profile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
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

          {/* Official Avatar or Profile Icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              color: '#0B132B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {user?.avatar_url || (user as any)?.profile_image ? (
              <img
                src={user?.avatar_url || (user as any)?.profile_image || ''}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                style={{ width: '28px', height: '28px' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};

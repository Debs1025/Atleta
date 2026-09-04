import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import type { AuthUser } from '../../api/types';
import { useNotifications } from '../Notification/useNotifications';
import { NotificationFloat } from '../Notification/NotificationFloat';
import { styles } from './styles/Navbar';

interface NavbarProps {
  user: AuthUser | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isBellHovered, setIsBellHovered] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);
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
    <header style={styles.header}>
      <Link to="/dashboard" style={styles.logo}>
        ATLETA<sup style={styles.logoSup}>WEB</sup>
      </Link>

      <div style={styles.rightSection}>
        {/* Notification Bell Button */}
        <button
          ref={bellButtonRef}
          type="button"
          title="Notifications"
          onClick={() => setIsNotifOpen((prev) => !prev)}
          onMouseEnter={() => setIsBellHovered(true)}
          onMouseLeave={() => setIsBellHovered(false)}
          style={{
            ...styles.bellBtn,
            ...(isBellHovered ? styles.bellBtnHovered : {}),
          }}
        >
          <Bell style={{ width: 18, height: 18, pointerEvents: 'none' }} />
          {unreadCount > 0 && <span style={styles.bellDot} />}
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

        <div style={styles.divider} />

        <Link
          to="/profile"
          onMouseEnter={() => setIsProfileHovered(true)}
          onMouseLeave={() => setIsProfileHovered(false)}
          style={{
            ...styles.profileLink,
            ...(isProfileHovered ? styles.profileLinkHovered : {}),
          }}
        >
          <div style={styles.profileCol}>
            <span style={styles.profileRole}>OFFICIAL</span>
            <span
              style={{
                ...styles.profileName,
                ...(isProfileHovered ? styles.profileNameHovered : {}),
              }}
            >
              {displayName.toUpperCase()}
            </span>
          </div>

          {/* Official Avatar or Profile Icon */}
          <div
            style={{
              ...styles.avatarWrap,
              ...(isProfileHovered ? styles.avatarWrapHovered : {}),
            }}
          >
            {user?.avatar_url || (user as any)?.profile_image ? (
              <img
                src={user?.avatar_url || (user as any)?.profile_image || ''}
                alt={displayName}
                style={styles.avatarImg}
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                style={styles.avatarIcon}
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

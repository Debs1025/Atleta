import React, { useEffect, useRef, useState } from 'react';
import { BarChart2, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { OfficialNotificationItem } from '../../api/types';
import { styles } from './styles/NotificationFloat';

interface NotificationFloatProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  notifications: OfficialNotificationItem[];
  unreadCount: number;
  loading?: boolean;
  onMarkAllRead: () => void;
  onMarkSingleRead: (id: string) => void;
}

export const NotificationFloat: React.FC<NotificationFloatProps> = ({
  isOpen,
  onClose,
  triggerRef,
  notifications,
  unreadCount,
  loading = false,
  onMarkAllRead,
  onMarkSingleRead,
}) => {
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Animation of opening and closing notification icon
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose();
      }
    };

    if (shouldRender && visible) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [shouldRender, visible, onClose, triggerRef]);

  if (!shouldRender) return null;

  const handleViewAll = () => {
    onClose();
    navigate('/notifications');
  };

  const formatTimestamp = (rawDate: string): string => {
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return '';
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      const secs = String(d.getUTCSeconds()).padStart(2, '0');
      return `${hours}:${mins}:${secs} UTC`;
    } catch {
      return '';
    }
  };

  const transitionStyle: React.CSSProperties = {
    ...styles.popoverShell,
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
    transition: 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    transformOrigin: 'top right',
    pointerEvents: visible ? 'auto' : 'none',
  };

  const unreadNotifications = notifications.filter((item) => !item.is_read);
  const displayCount = unreadCount > 0 ? unreadCount : unreadNotifications.length;

  return (
    <div ref={popoverRef} style={transitionStyle}>
      {/* Popover Header */}
      <div style={styles.popoverHeader}>
        <h3 style={styles.headerTitle}>NOTIFICATIONS ({displayCount})</h3>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="hover-btn-ghost"
          style={styles.markAllBtn}
        >
          MARK ALL AS READ
        </button>
      </div>

      {/* Notification Items List */}
      <div style={styles.itemsList}>
        {(() => {
          const unreadNotifications = notifications.filter((item) => !item.is_read);
          if (loading && unreadNotifications.length === 0) {
            return (
              <div style={{ padding: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', color: '#0B132B' }} />
              </div>
            );
          }
          if (unreadNotifications.length === 0) {
            return <div style={styles.emptyState}>No notifications right now.</div>;
          }
          return unreadNotifications.slice(0, 10).map((item, idx) => {
            const isAudit = item.type === 'AUDIT_REQUEST' || item.title.toLowerCase().includes('audit') || item.title.toLowerCase().includes('stats');
            const pillText = isAudit ? 'AUDIT REQUEST' : 'SCHEDULE UPDATES';
            const isLast = idx === Math.min(unreadNotifications.length, 10) - 1;

            return (
              <div
                key={item.notification_id}
                onClick={() => {
                  onMarkSingleRead(item.notification_id);
                }}
                style={{
                  ...styles.itemRow,
                  ...(isLast ? styles.itemRowNoBorder : {}),
                }}
              >
                {/* Left Icon Badge */}
                {isAudit ? (
                  <div style={styles.badgeAudit}>
                    <BarChart2 style={{ width: 18, height: 18 }} />
                  </div>
                ) : (
                  <div style={styles.badgeSchedule}>
                    <Clock style={{ width: 18, height: 18 }} />
                  </div>
                )}

                {/* Content Area */}
                <div style={styles.itemContent}>
                  <div style={styles.metaRow}>
                    <span style={isAudit ? styles.pillAudit : styles.pillSchedule}>
                      {pillText}
                    </span>
                    <span style={styles.timestamp}>
                      {formatTimestamp(item.created_at)}
                    </span>
                  </div>

                  <h4 style={styles.itemTitle}>{item.title}</h4>
                  {item.message && (
                    <p style={styles.itemSubtext}>{item.message}</p>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Footer CTA Container */}
      <div style={styles.footerContainer}>
        <button
          type="button"
          onClick={handleViewAll}
          className="hover-btn-solid"
          style={styles.footerBtn}
        >
          <span>VIEW ALL NOTIFICATIONS</span>
          <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
};

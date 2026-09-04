import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerUpLeft, ArrowRight, Loader2 } from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getMe,
} from '../../api/client';
import type { AuthUser } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { useNotifications } from './useNotifications';
import { styles } from './styles/NotificationPage';

export const NotificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ALL' | 'AUDIT' | 'SCHEDULE'>('ALL');
  const [user, setUser] = useState<AuthUser | null>(
    () => getCachedData<AuthUser>('user_me') || getStoredUser()
  );

  const {
    notifications,
    loading,
    markAllRead,
    markSingleRead,
    clearHistory,
  } = useNotifications();

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
    getMe().then((res) => setUser(res)).catch(() => {});
  }, [navigate]);

  const formatUtcDateTime = (raw: string): string => {
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return '';
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins} UTC`;
    } catch {
      return '';
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const isAudit = n.type === 'AUDIT_REQUEST' || n.title.toLowerCase().includes('audit') || n.title.toLowerCase().includes('stats');
    if (activeTab === 'AUDIT') return isAudit;
    if (activeTab === 'SCHEDULE') return !isAudit;
    return true;
  });

  return (
    <div style={styles.shell}>
      {/* Shared Navbar */}
      <Navbar user={user} />

      {/* Main Body */}
      <div style={styles.layoutBody}>
        {/* Shared Sidebar */}
        <Sidebar activeTab="DASHBOARD" />

        {/* Content Area */}
        <main style={styles.contentArea}>
          {/* Header Row */}
          <div style={styles.headerRow}>
            <div style={styles.titleGroup}>
              <h1 style={styles.pageTitle}>NOTIFICATION CENTER</h1>
              <p style={styles.pageSubtitle}>
                Comprehensive notification for audit requests, and match timeline updates.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              style={styles.goBackBtn}
            >
              <span>Go Back</span>
              <CornerUpLeft style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Filter Bar & Action Buttons */}
          <div style={styles.filterBar}>
            <div style={styles.tabList}>
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'ALL' ? styles.tabBtnActive : {}),
                }}
              >
                ALL LOGS ({notifications.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('AUDIT')}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'AUDIT' ? styles.tabBtnActive : {}),
                }}
              >
                AUDIT REQUESTS
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SCHEDULE')}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'SCHEDULE' ? styles.tabBtnActive : {}),
                }}
              >
                SCHEDULE UPDATES
              </button>
            </div>

            <div style={styles.actionBtnGroup}>
              <button
                type="button"
                onClick={clearHistory}
                style={styles.outlineBtn}
              >
                CLEAR HISTORY
              </button>
              <button
                type="button"
                onClick={markAllRead}
                style={styles.solidBtn}
              >
                MARK ALL AS READ
              </button>
            </div>
          </div>

          {/* Chronological Feed */}
          {loading && notifications.length === 0 ? (
            <div style={{ padding: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 style={{ width: 28, height: 28, animation: 'spin 1s linear infinite', color: '#0B132B' }} />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={styles.emptyStateWrap}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0B132B' }}>
                NO NOTIFICATION LOGS FOUND
              </h4>
              <p style={{ margin: 0, fontSize: '12px' }}>
                There are currently no active audit requests or match timeline logs for this filter.
              </p>
            </div>
          ) : (
            <div style={styles.feedList}>
              {filteredNotifications.map((notif) => {
                const isAudit =
                  notif.type === 'AUDIT_REQUEST' ||
                  notif.title.toLowerCase().includes('audit') ||
                  notif.title.toLowerCase().includes('stats');

                if (isAudit) {
                  const coachName = notif.requested_by_coach || notif.requested_by || 'N/A';
                  const matchContext = notif.match_context || notif.title || 'GENERAL MATCH AUDIT';
                  const sportDiscipline = notif.sport_discipline || notif.sport || 'GENERAL';

                  return (
                    <div key={notif.notification_id} style={styles.auditCard}>
                      <div style={styles.cardTopLine}>
                        <h3 style={styles.auditCardTitle}>
                          AUDIT REQUEST: {notif.title.toUpperCase()}
                        </h3>
                        <span style={styles.cardTimestamp}>
                          {formatUtcDateTime(notif.created_at)}
                        </span>
                      </div>

                      <div style={styles.auditGrid}>
                        <div style={styles.gridCol}>
                          <span style={styles.gridColLabel}>REQUESTED BY</span>
                          <span style={styles.gridColVal}>{coachName}</span>
                        </div>

                        <div style={styles.gridCol}>
                          <span style={styles.gridColLabel}>MATCH CONTEXT</span>
                          <span style={styles.gridColVal}>{matchContext}</span>
                        </div>

                        <div style={styles.gridCol}>
                          <span style={styles.gridColLabel}>SPORT DISCIPLINE</span>
                          <span style={styles.gridColVal}>{sportDiscipline}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!notif.is_read) markSingleRead(notif.notification_id);
                          navigate('/dashboard');
                        }}
                        style={styles.auditActionBtn}
                      >
                        <span>REVIEW & ATTACH SCORESHEET</span>
                        <ArrowRight style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  );
                }

                // Schedule Updates Card
                return (
                  <div key={notif.notification_id} style={styles.scheduleCard}>
                    <div style={styles.scheduleTopRow}>
                      <h3 style={styles.scheduleHeaderTitle}>
                        <span style={styles.squareBullet} />
                        <span>SCHEDULE UPDATES: {notif.title.toUpperCase()}</span>
                      </h3>
                      <span style={styles.cardTimestamp}>
                        {formatUtcDateTime(notif.created_at)}
                      </span>
                    </div>

                    <div style={styles.scheduleDivider} />

                    <p style={styles.scheduleDescription}>
                      {notif.message || notif.title}
                    </p>

                    <div style={styles.scheduleActionsRow}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!notif.is_read) markSingleRead(notif.notification_id);
                          navigate('/schedules');
                        }}
                        style={styles.viewDetailsLink}
                      >
                        VIEW DETAILS
                      </button>
                      <button
                        type="button"
                        onClick={() => markSingleRead(notif.notification_id)}
                        style={styles.dismissLink}
                      >
                        DISMISS
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

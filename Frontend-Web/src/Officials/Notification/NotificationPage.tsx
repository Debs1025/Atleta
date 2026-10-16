import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CornerUpLeft,
  ArrowRight,
  Loader2,
  Upload,
  CheckCircle2,
  ExternalLink,
  FileText,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getMe,
  fulfillScoresheetRequest,
  rejectScoresheetRequest,
} from '../../api/client';
import type { AuthUser, OfficialNotificationItem } from '../../api/types';
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
    refresh,
    markSingleRead,
  } = useNotifications();

  // File Upload & Request Action States
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [successNotifId, setSuccessNotifId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

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

  const handleFileUpload = async (notif: OfficialNotificationItem, file: File) => {
    const notifId = notif.notification_id;
    const reqId = notif.request_id || notif.reference_id || notifId.replace(/^req_/, '');
    const matchId = notif.match_id || notif.reference_id || reqId;

    try {
      setUploadingId(notifId);
      setUploadError(null);
      setSuccessNotifId(null);

      await fulfillScoresheetRequest(reqId, file, matchId);

      // Record accepted request into local storage activity tracking
      try {
        const rawExisting = localStorage.getItem('atleta_accepted_scoresheet_requests');
        const existing = rawExisting ? JSON.parse(rawExisting) : [];
        const coachName = notif.requested_by_coach || notif.coach_name || 'Assigned Coach';
        const entry = { id: reqId, coachName, timestamp: Date.now() };
        const updated = [entry, ...existing.filter((e: any) => e.id !== reqId)];
        localStorage.setItem('atleta_accepted_scoresheet_requests', JSON.stringify(updated));
      } catch {}

      // Auto-mark notification as read on the official side
      markSingleRead(notifId);
      setSuccessNotifId(notifId);

      // Refresh list to pull updated fulfilled state
      setTimeout(() => {
        refresh();
      }, 500);
    } catch (err: any) {
      console.error('Scoresheet fulfillment failed:', err);
      setUploadError(err?.message || 'Failed to upload and share scoresheet.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleRejectRequest = async (notif: OfficialNotificationItem) => {
    const notifId = notif.notification_id;
    const reqId = notif.request_id || notif.reference_id || notifId.replace(/^req_/, '');
    const coachName = notif.requested_by_coach || notif.coach_name || 'the coach';

    const reason = window.prompt(
      `Please state the reason for rejecting the scoresheet request from ${coachName}:`,
      'Scoresheet request could not be fulfilled at this time.'
    );
    if (reason === null) return; // User cancelled prompt

    try {
      setRejectingId(notifId);
      setUploadError(null);

      await rejectScoresheetRequest(reqId, reason);
      markSingleRead(notifId);

      setTimeout(() => {
        refresh();
      }, 500);
    } catch (err: any) {
      console.error('Scoresheet rejection failed:', err);
      setUploadError(err?.message || 'Failed to reject scoresheet request.');
    } finally {
      setRejectingId(null);
    }
  };

  const filteredNotifications = [...notifications]
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    })
    .filter((n) => {
      const isAudit =
        n.type === 'AUDIT_REQUEST' ||
        n.type === 'SCORESHEET_REQUEST' ||
        n.title.toLowerCase().includes('audit') ||
        n.title.toLowerCase().includes('scoresheet') ||
        n.title.toLowerCase().includes('stats');
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
              <h1 style={styles.pageTitle}>NOTIFICATION</h1>
              <p style={styles.pageSubtitle}>
                Comprehensive notification queue for coach scoresheet requests, audit verifications, and match timeline updates.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="hover-btn-outline"
              style={styles.goBackBtn}
            >
              <span>Go Back</span>
              <CornerUpLeft style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {uploadError && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #EF4444',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#F87171',
              fontSize: '13px',
              fontWeight: 600,
            }}>
              <AlertCircle style={{ width: 18, height: 18, flexShrink: 0 }} />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Filter Bar & Action Buttons */}
          <div style={styles.filterBar}>
            <div style={styles.tabList}>
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`hover-tab-underline ${activeTab === 'ALL' ? 'active' : ''}`}
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
                className={`hover-tab-underline ${activeTab === 'AUDIT' ? 'active' : ''}`}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'AUDIT' ? styles.tabBtnActive : {}),
                }}
              >
                SCORESHEET REQUESTS
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SCHEDULE')}
                className={`hover-tab-underline ${activeTab === 'SCHEDULE' ? 'active' : ''}`}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'SCHEDULE' ? styles.tabBtnActive : {}),
                }}
              >
                SCHEDULE UPDATES
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
                There are currently no active scoresheet requests or match timeline logs for this filter.
              </p>
            </div>
          ) : (
            <div style={styles.feedList}>
              {filteredNotifications.map((notif, idx) => {
                const itemNumber = idx + 1;
                const isAudit =
                  notif.type === 'AUDIT_REQUEST' ||
                  notif.type === 'SCORESHEET_REQUEST' ||
                  notif.title.toLowerCase().includes('audit') ||
                  notif.title.toLowerCase().includes('scoresheet') ||
                  notif.title.toLowerCase().includes('stats');
                const isRead = Boolean(notif.is_read);

                if (isAudit) {
                  const coachName = notif.requested_by_coach || notif.requested_by || 'Assigned Coach';
                  const matchContext = notif.match_context || notif.match_name || notif.title || 'Official Match';
                  const sportDiscipline = notif.sport_discipline || notif.sport || 'GENERAL';
                  const isUploadingThis = uploadingId === notif.notification_id;
                  const isRejectingThis = rejectingId === notif.notification_id;
                  const isFulfilled = notif.status === 'fulfilled' || notif.status === 'accepted' || Boolean(notif.scoresheet_url);
                  const isRejected = notif.status === 'rejected';
                  const isSuccess = successNotifId === notif.notification_id;

                  return (
                    <div
                      key={notif.notification_id}
                      style={{
                        ...styles.auditCard,
                        ...(isRead ? styles.auditCardRead : {}),
                        borderColor: isSuccess ? '#10B981' : isRejected ? '#EF4444' : isRead ? '#E2E8F0' : '#00C8FF',
                        borderWidth: isSuccess || isRejected ? '2px' : '1px',
                      }}
                    >
                      <div style={styles.cardTopLine}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{
                            backgroundColor: '#0B132B',
                            color: '#00C8FF',
                            fontFamily: 'monospace',
                            fontWeight: 900,
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(0, 200, 255, 0.4)',
                          }}>
                            #{itemNumber}
                          </span>
                          <h3 style={isRead ? styles.auditCardTitleRead : styles.auditCardTitle}>
                            SCORESHEET REQUEST: {notif.title.toUpperCase()}
                          </h3>
                          {isFulfilled ? (
                            <span style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#10B981',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #10B981',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <CheckCircle2 style={{ width: 12, height: 12 }} />
                              ACCEPTED & SHARED
                            </span>
                          ) : isRejected ? (
                            <span style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              color: '#EF4444',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #EF4444',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <XCircle style={{ width: 12, height: 12 }} />
                              REJECTED
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: 'rgba(0, 200, 255, 0.15)',
                              color: '#00C8FF',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #00C8FF',
                            }}>
                              PENDING UPLOAD
                            </span>
                          )}
                        </div>
                        <span style={styles.cardTimestamp}>
                          {formatUtcDateTime(notif.created_at)}
                        </span>
                      </div>

                      <div style={styles.auditGrid}>
                        <div style={isRead ? styles.gridColRead : styles.gridCol}>
                          <span style={styles.gridColLabel}>REQUESTED BY</span>
                          <span style={isRead ? styles.gridColValRead : styles.gridColVal}>{coachName}</span>
                        </div>

                        <div style={isRead ? styles.gridColRead : styles.gridCol}>
                          <span style={styles.gridColLabel}>MATCH CONTEXT</span>
                          <span style={isRead ? styles.gridColValRead : styles.gridColVal}>{matchContext}</span>
                        </div>

                        <div style={isRead ? styles.gridColRead : styles.gridCol}>
                          <span style={styles.gridColLabel}>SPORT DISCIPLINE</span>
                          <span style={isRead ? styles.gridColValRead : styles.gridColVal}>{sportDiscipline}</span>
                        </div>
                      </div>

                      {/* Hidden File Input for Direct Scoresheet Upload */}
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        style={{ display: 'none' }}
                        ref={(el) => {
                          fileInputRefs.current[notif.notification_id] = el;
                        }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(notif, file);
                          }
                          e.target.value = '';
                        }}
                      />

                      {/* Actions Row */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {/* Direct Upload & Share Button (Transitions status to Accepted / Fulfilled) */}
                        {!isRejected && (
                          <button
                            type="button"
                            disabled={isUploadingThis || isRejectingThis}
                            onClick={() => {
                              fileInputRefs.current[notif.notification_id]?.click();
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              backgroundColor: isFulfilled ? '#0F172A' : '#00C8FF',
                              color: isFulfilled ? '#94A3B8' : '#080F21',
                              border: isFulfilled ? '1px solid #334155' : 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: (isUploadingThis || isRejectingThis) ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isUploadingThis ? (
                              <>
                                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                                <span>UPLOADING TO STORAGE & SHARING...</span>
                              </>
                            ) : isFulfilled ? (
                              <>
                                <Upload style={{ width: 14, height: 14 }} />
                                <span>REPLACE / RE-UPLOAD SCORESHEET</span>
                              </>
                            ) : (
                              <>
                                <Upload style={{ width: 14, height: 14 }} />
                                <span>UPLOAD & SHARE SCORESHEET</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Rejection Button (for pending requests) */}
                        {!isFulfilled && !isRejected && (
                          <button
                            type="button"
                            disabled={isUploadingThis || isRejectingThis}
                            onClick={() => handleRejectRequest(notif)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: '#EF4444',
                              border: '1px solid #EF4444',
                              padding: '8px 14px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '12px',
                              cursor: (isUploadingThis || isRejectingThis) ? 'not-allowed' : 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isRejectingThis ? (
                              <>
                                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                                <span>REJECTING...</span>
                              </>
                            ) : (
                              <>
                                <XCircle style={{ width: 14, height: 14 }} />
                                <span>REJECT SCORESHEET REQUEST</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* View Shared File Link */}
                        {notif.scoresheet_url && (
                          <a
                            href={notif.scoresheet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#10B981',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              padding: '8px 12px',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            }}
                          >
                            <FileText style={{ width: 14, height: 14 }} />
                            <span>VIEW SHARED SCORESHEET</span>
                            <ExternalLink style={{ width: 12, height: 12 }} />
                          </a>
                        )}

                        {/* Secondary Button to Match Details */}
                        <button
                          type="button"
                          onClick={() => {
                            if (!notif.is_read) markSingleRead(notif.notification_id);
                            const cleanMatchId = (notif.match_id || notif.reference_id || '').replace(/^#/, '');
                            if (cleanMatchId) {
                              navigate(`/matches/${cleanMatchId}/scoresheet`);
                            } else {
                              navigate('/dashboard');
                            }
                          }}
                          className="hover-btn-outline"
                          style={{
                            ...styles.auditActionBtn,
                            ...(isRead ? styles.auditActionBtnRead : {}),
                            padding: '8px 14px',
                            fontSize: '12px',
                          }}
                        >
                          <span>VIEW MATCH IN DASHBOARD</span>
                          <ArrowRight style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  );
                }

                // Schedule Updates Card
                return (
                  <div
                    key={notif.notification_id}
                    style={{
                      ...styles.scheduleCard,
                      ...(isRead ? styles.scheduleCardRead : {}),
                    }}
                  >
                    <div style={styles.scheduleTopRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          backgroundColor: '#0F172A',
                          color: '#94A3B8',
                          fontFamily: 'monospace',
                          fontWeight: 900,
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #334155',
                        }}>
                          #{itemNumber}
                        </span>
                        <h3 style={isRead ? styles.scheduleHeaderTitleRead : styles.scheduleHeaderTitle}>
                          <span style={isRead ? styles.squareBulletRead : styles.squareBullet} />
                          <span>SCHEDULE UPDATES: {notif.title.toUpperCase()}</span>
                        </h3>
                      </div>
                      <span style={styles.cardTimestamp}>
                        {formatUtcDateTime(notif.created_at)}
                      </span>
                    </div>

                    <div style={isRead ? styles.scheduleDividerRead : styles.scheduleDivider} />

                    <p style={isRead ? styles.scheduleDescriptionRead : styles.scheduleDescription}>
                      {notif.message || notif.title}
                    </p>

                    <div style={styles.scheduleActionsRow}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!notif.is_read) markSingleRead(notif.notification_id);
                          navigate('/schedules');
                        }}
                        className="hover-link-accent"
                        style={isRead ? styles.viewDetailsLinkRead : styles.viewDetailsLink}
                      >
                        VIEW DETAILS
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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Undo2,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  FileText,
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
    markAllRead,
    markSingleRead,
    clearHistory,
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

  const formatEtcDateTime = (raw: string): string => {
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return raw || '';
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const mins = String(d.getUTCMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${mins} ETC`;
    } catch {
      return raw || '';
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
    if (reason === null) return;

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
              <h1 style={styles.pageTitle}>NOTIFICATION CENTER</h1>
              <p style={styles.pageSubtitle}>
                Comprehensive notification for audit requests, and match timeline updates.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="hover-btn-outline"
              style={styles.goBackBtn}
            >
              <span>Go Back</span>
              <Undo2 style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {uploadError && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                borderRadius: '4px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#EF4444',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
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
                style={styles.darkActionBtn}
                className="hover-btn-solid"
              >
                CLEAR HISTORY
              </button>
              <button
                type="button"
                onClick={markAllRead}
                style={styles.darkActionBtn}
                className="hover-btn-solid"
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
                  notif.type === 'SCORESHEET_REQUEST' ||
                  notif.title.toLowerCase().includes('audit') ||
                  notif.title.toLowerCase().includes('scoresheet') ||
                  notif.title.toLowerCase().includes('stats');

                if (isAudit) {
                  const coachName = (notif.requested_by_coach || notif.requested_by || 'Coach Sarah Jenkins').toUpperCase();
                  const matchContext = (notif.match_context || notif.match_name || 'ADNU VS. UNC - INTRAMURALS 2026').toUpperCase();
                  const sportDiscipline = (notif.sport_discipline || notif.sport || 'BASKETBALL').toUpperCase();
                  const isUploadingThis = uploadingId === notif.notification_id;
                  const isRejectingThis = rejectingId === notif.notification_id;
                  const isFulfilled = notif.status === 'fulfilled' || notif.status === 'accepted' || Boolean(notif.scoresheet_url);
                  const isRejected = notif.status === 'rejected';

                  // Title formatting
                  let displayAuditTitle = notif.title.toUpperCase();
                  if (!displayAuditTitle.startsWith('AUDIT REQUEST')) {
                    displayAuditTitle = `AUDIT REQUEST: ${displayAuditTitle}`;
                  }

                  return (
                    <div
                      key={notif.notification_id}
                      style={{
                        ...styles.auditCard,
                        borderColor: isRejected ? '#EF4444' : (isFulfilled || successNotifId === notif.notification_id) ? '#10B981' : '#0B132B',
                      }}
                    >
                      {/* Top Line */}
                      <div style={styles.cardTopLine}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={styles.auditCardTitle}>
                            {displayAuditTitle}
                          </h3>
                          {isFulfilled && (
                            <span
                              style={{
                                color: '#10B981',
                                fontSize: '11px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textTransform: 'uppercase',
                              }}
                            >
                              <CheckCircle2 style={{ width: 13, height: 13 }} />
                              ACCEPTED & SHARED
                            </span>
                          )}
                          {isRejected && (
                            <span
                              style={{
                                color: '#EF4444',
                                fontSize: '11px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                textTransform: 'uppercase',
                              }}
                            >
                              <XCircle style={{ width: 13, height: 13 }} />
                              REJECTED
                            </span>
                          )}
                        </div>
                        <span style={styles.cardTimestamp}>
                          {formatEtcDateTime(notif.created_at)}
                        </span>
                      </div>

                      {/* 3-Column Metadata Row with Vertical Dividers */}
                      <div style={styles.auditMetaRow}>
                        <div style={styles.auditMetaCol}>
                          <span style={styles.auditMetaLabel}>REQUESTED BY</span>
                          <span style={styles.auditMetaVal}>{coachName}</span>
                        </div>

                        <div style={styles.auditMetaDivider} />

                        <div style={styles.auditMetaCol}>
                          <span style={styles.auditMetaLabel}>MATCH CONTEXT</span>
                          <span style={styles.auditMetaVal}>{matchContext}</span>
                        </div>

                        <div style={styles.auditMetaDivider} />

                        <div style={styles.auditMetaCol}>
                          <span style={styles.auditMetaLabel}>SPORT DISCIPLINE</span>
                          <span style={styles.auditMetaVal}>{sportDiscipline}</span>
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
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {!isRejected && (
                          <button
                            type="button"
                            disabled={isUploadingThis || isRejectingThis}
                            onClick={() => {
                              fileInputRefs.current[notif.notification_id]?.click();
                            }}
                            style={styles.reviewBtn}
                            className="hover-btn-outline"
                          >
                            {isUploadingThis ? (
                              <>
                                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                                <span>UPLOADING & ATTACHING...</span>
                              </>
                            ) : isFulfilled ? (
                              <>
                                <CheckCircle2 style={{ width: 14, height: 14, color: '#10B981' }} />
                                <span>RE-ATTACH SCORESHEET</span>
                                <Plus style={{ width: 14, height: 14, strokeWidth: 3 }} />
                              </>
                            ) : (
                              <>
                                <span>REVIEW & ATTACH SCORESHEET</span>
                                <Plus style={{ width: 14, height: 14, strokeWidth: 3 }} />
                              </>
                            )}
                          </button>
                        )}

                        {!isFulfilled && !isRejected && (
                          <button
                            type="button"
                            disabled={isUploadingThis || isRejectingThis}
                            onClick={() => handleRejectRequest(notif)}
                            style={styles.rejectBtn}
                            className="hover-btn-outline"
                          >
                            {isRejectingThis ? (
                              <>
                                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                                <span>REJECTING...</span>
                              </>
                            ) : (
                              <>
                                <XCircle style={{ width: 14, height: 14 }} />
                                <span>REJECT REQUEST</span>
                              </>
                            )}
                          </button>
                        )}

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
                              fontSize: '11.5px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              padding: '8px 12px',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              borderRadius: '2px',
                              backgroundColor: 'rgba(16, 185, 129, 0.08)',
                            }}
                          >
                            <FileText style={{ width: 14, height: 14 }} />
                            <span>VIEW ATTACHED SCORESHEET</span>
                            <ExternalLink style={{ width: 12, height: 12 }} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                }

                // Schedule Updates Card
                let displaySchedTitle = notif.title.toUpperCase();
                if (!displaySchedTitle.startsWith('SCHEDULE UPDATES:')) {
                  displaySchedTitle = `SCHEDULE UPDATES: ${displaySchedTitle}`;
                }

                return (
                  <div key={notif.notification_id} style={styles.scheduleCard}>
                    <div style={styles.scheduleTopRow}>
                      <h3 style={styles.scheduleHeaderTitle}>
                        <span style={styles.squareBullet} />
                        <span>{displaySchedTitle}</span>
                      </h3>
                      <span style={styles.cardTimestamp}>
                        {formatEtcDateTime(notif.created_at)}
                      </span>
                    </div>

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

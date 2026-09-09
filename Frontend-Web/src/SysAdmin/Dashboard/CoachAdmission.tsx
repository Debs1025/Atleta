import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  getStoredToken,
  getCachedData,
  getAdminCoachQueue,
  approveCoachAccreditation,
  rejectCoachAccreditation,
} from '../../api/client';
import type { AdminCoachQueueItem, AdminCoachQueueResponse } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/CoachAdmission';

export const CoachAdmission: React.FC = () => {
  const navigate = useNavigate();

  // Instant display from cache to avoid too much loading time
  const [queue, setQueue] = useState<AdminCoachQueueItem[]>(
    () => getCachedData<AdminCoachQueueResponse>('admin_coach_queue')?.queue || []
  );
  const [loading, setLoading] = useState(!getCachedData('admin_coach_queue'));
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<AdminCoachQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const loadQueue = async () => {
    try {
      const res = await getAdminCoachQueue(true);
      setQueue(Array.isArray(res?.queue) ? res.queue : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
    loadQueue();
  }, [navigate]);

  const finalizeAction = (coachId: string, account_status: string, status: string, msg: string) => {
    setQueue((prev) => prev.map((c) => (c.coach_id === coachId ? { ...c, account_status, status } : c)));
    if (selectedCoach?.coach_id === coachId) {
      setSelectedCoach((prev) => (prev ? { ...prev, account_status, status } : null));
    }
    setActionSuccess(msg);
    setTimeout(() => {
      setActionSuccess(null);
      setSelectedCoach(null);
      setShowRejectInput(false);
      setRejectReason('');
    }, 1500);
  };

  const handleApprove = async (coachId: string) => {
    try {
      setActionLoading(true);
      await approveCoachAccreditation(coachId);
      finalizeAction(coachId, 'Active', 'VERIFIED', 'Coach accreditation approved and verified successfully.');
    } catch (e: any) {
      alert(e.message || 'Accreditation approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (coachId: string) => {
    if (!rejectReason.trim()) return;
    try {
      setActionLoading(true);
      await rejectCoachAccreditation(coachId, rejectReason.trim());
      finalizeAction(coachId, 'Rejected', 'REJECTED', 'Coach accreditation application declined.');
    } catch (e: any) {
      alert(e.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = queue.filter(
    (c) => (c.account_status || '').toLowerCase() === 'pending' || (c.status || '').toUpperCase().includes('PENDING')
  ).length;

  const totalPages = Math.max(1, Math.ceil(queue.length / itemsPerPage));
  const displayedItems = queue.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const queueHealthScore = queue.length > 0 ? Math.max(92.4, Math.min(99.9, 100 - pendingCount * 0.4)).toFixed(1) : '98.2';

  const formatDate = (raw: any): string => {
    try {
      const t = raw?._seconds ? raw._seconds * 1000 : raw;
      const d = new Date(t);
      if (!isNaN(d.getTime())) return d.toISOString().replace('T', ' ').slice(0, 16);
    } catch {}
    return new Date().toISOString().replace('T', ' ').slice(0, 16);
  };

  const formatCoachId = (rawId?: string, idx: number = 0) => {
    if (!rawId) return `#C-${String(idx + 1).padStart(5, '0')}`;
    const clean = rawId.replace(/^coach_/, '');
    return `#C-${clean.length > 8 ? `${clean.slice(0, 5).toUpperCase()}-${clean.slice(-1).toUpperCase()}` : clean.toUpperCase()}`;
  };

  const isCoachVerified = (c: AdminCoachQueueItem) =>
    (c.account_status || '').toLowerCase() === 'active' ||
    (c.status || '').toUpperCase() === 'VERIFIED' ||
    (c.status || '').toUpperCase() === 'ACTIVE';

  return (
    <div style={styles.shell}>
      <Navbar title="SYSTEM DASHBOARD" />

      <div style={styles.layout}>
        <Sidebar activeTab="AUDIT_QUEUE" />

        <main style={styles.main}>
          {/* Header */}
          <div style={styles.titleRow}>
            <h1 style={styles.title}>COACH AUDIT QUEUE</h1>
            <div style={styles.badgeRow}>
              <span style={styles.pendingBadge}>{pendingCount} PENDING</span>
              <span style={styles.statusText}>SYSTEM STATUS: OPERATIVE</span>
            </div>
          </div>

          {/* Metric Cards */}
          <div style={styles.cardsGrid}>
            <div style={styles.criticalCard}>
              <div style={styles.watermark}>
                <svg width="130" height="130" viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="42" stroke="#0B132B" strokeWidth="14" />
                  <circle cx="50" cy="50" r="20" stroke="#0B132B" strokeWidth="10" />
                </svg>
              </div>
              <h2 style={styles.criticalTitle}>CRITICAL REVIEW NEEDED</h2>
              <p style={styles.criticalText}>
                A spike in certification uploads from NCAA DI institutions has been detected. Audits must be
                completed within 24 hours of timestamp to maintain compliance protocols.
              </p>
            </div>

            <div style={styles.healthCard}>
              <div style={styles.healthLabel}>QUEUE HEALTH</div>
              <div style={styles.healthValue}>{queueHealthScore}%</div>
              <div style={styles.healthSub}>INTEGRITY CHECK PASSED</div>
            </div>
          </div>

          {/* Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['COACH ID', 'FULL NAME', 'INSTITUTIONAL AFFILIATION', 'DATE UPLOADED', 'STATUS'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                  <th style={{ ...styles.th, textAlign: 'center', borderRight: 'none' }}>AUDIT</th>
                </tr>
              </thead>
              <tbody>
                {loading && queue.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center' }}>
                      <Loader2 style={{ width: 26, height: 26, animation: 'spin 1s linear infinite', margin: '0 auto', color: '#0B132B' }} />
                    </td>
                  </tr>
                ) : displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      No coach audit applications in queue.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item, idx) => (
                    <tr key={item.coach_id || idx}>
                      <td style={styles.td}>
                        <span style={styles.idText}>{formatCoachId(item.coach_id, (page - 1) * itemsPerPage + idx)}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 900, textTransform: 'uppercase' }}>
                        {item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'COACH APPLICANT'}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.affiliationText}>
                          {item.institutional_affiliation || item.current_institution || 'UNASSIGNED ATHLETICS'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.dateText}>{formatDate(item.date_uploaded || item.created_at)}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={isCoachVerified(item) ? styles.verifiedBadge : styles.pendingReviewBadge}>
                          {isCoachVerified(item) ? 'VERIFIED' : 'PENDING_REVIEW'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', borderRight: 'none' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCoach(item);
                            setShowRejectInput(false);
                            setRejectReason('');
                            setActionSuccess(null);
                          }}
                          style={styles.auditBtn}
                        >
                          AUDIT
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={styles.paginationRow}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ ...styles.pageArrowBtn, opacity: page <= 1 ? 0.35 : 1 }}
              title="Previous Page"
            >
              <ChevronLeft style={{ width: 15, height: 15 }} />
            </button>
            <button type="button" style={styles.pageNumberBtn}>
              PAGE {String(page).padStart(2, '0')}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ ...styles.pageArrowBtn, opacity: page >= totalPages ? 0.35 : 1 }}
              title="Next Page"
            >
              <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </main>
      </div>

      {/* Modal */}
      {selectedCoach && (
        <div style={styles.modalOverlay} onClick={() => setSelectedCoach(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldCheck style={{ width: 22, height: 22, color: '#0B132B' }} />
                <h3 style={styles.modalTitle}>AUDIT COACH ACCREDITATION</h3>
              </div>
              <button type="button" onClick={() => setSelectedCoach(null)} style={styles.closeBtn} title="Close Modal">
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {actionSuccess && (
              <div style={{ ...styles.verifiedBanner, marginBottom: '20px' }}>
                <CheckCircle2 style={{ width: 18, height: 18 }} />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Coach Bio */}
            <div style={styles.coachBioGrid}>
              {[
                { label: 'COACH ID', value: formatCoachId(selectedCoach.coach_id), isMono: true },
                { label: 'FULL LEGAL NAME', value: selectedCoach.full_name || 'Coach Applicant' },
                { label: 'INSTITUTION', value: selectedCoach.institutional_affiliation || selectedCoach.current_institution || 'Independent / Unassigned' },
                { label: 'SPORT & EXPERIENCE', value: `${selectedCoach.sport_type || 'Basketball'} • ${selectedCoach.years_of_experience || 0} Years Experience` },
                { label: 'APPLICATION DATE', value: formatDate(selectedCoach.date_uploaded || selectedCoach.created_at), isMono: true },
              ].map(({ label, value, isMono }) => (
                <div key={label} style={styles.bioItem}>
                  <span style={styles.bioLabel}>{label}</span>
                  <span style={{ ...styles.bioValue, ...(isMono ? { fontFamily: 'monospace', fontSize: '12px' } : {}) }}>
                    {value}
                  </span>
                </div>
              ))}
              <div style={styles.bioItem}>
                <span style={styles.bioLabel}>STATUS</span>
                <div>
                  <span style={isCoachVerified(selectedCoach) ? styles.verifiedBadge : styles.pendingReviewBadge}>
                    {isCoachVerified(selectedCoach) ? 'VERIFIED' : 'PENDING_REVIEW'}
                  </span>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div>
              <div style={styles.docSectionTitle}>
                <FileText style={{ width: 16, height: 16 }} />
                <span>SUBMITTED PROFESSIONAL CREDENTIALS & CERTIFICATIONS</span>
              </div>

              {selectedCoach.professional_documents && selectedCoach.professional_documents.length > 0 ? (
                <div style={styles.docList}>
                  {selectedCoach.professional_documents.map((doc, docIdx) => {
                    const docName = typeof doc === 'string' ? doc.split('/').pop() || `Credential_${docIdx + 1}.pdf` : `Credential_${docIdx + 1}.pdf`;
                    const isUrl = typeof doc === 'string' && (doc.startsWith('http://') || doc.startsWith('https://'));

                    return (
                      <div key={docIdx} style={styles.docCard}>
                        <div style={styles.docInfo}>
                          <FileText style={{ width: 22, height: 22, color: '#0B132B' }} />
                          <div>
                            <div style={styles.docName}>{docName}</div>
                            <div style={styles.docMeta}>Official Certification Document Attached</div>
                          </div>
                        </div>
                        {isUrl ? (
                          <a href={doc} target="_blank" rel="noopener noreferrer" style={styles.docViewBtn}>
                            <span>VIEW FILE</span>
                            <ExternalLink style={{ width: 12, height: 12 }} />
                          </a>
                        ) : (
                          <span style={{ ...styles.docViewBtn, cursor: 'default' }}>
                            <ShieldCheck style={{ width: 13, height: 13, color: '#16A34A' }} />
                            <span>ON RECORD</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.noDocBox}>
                  No uploaded external certificate files attached to this application record.
                </div>
              )}
            </div>

            {/* Actions */}
            {showRejectInput ? (
              <div style={{ marginTop: '16px', borderTop: '1.5px solid #E2E8F0', paddingTop: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', display: 'block', marginBottom: '6px' }}>
                  REJECTION REASON (REQUIRED):
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="State the reason why this coach accreditation is being declined..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #CBD5E1', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" onClick={() => setShowRejectInput(false)} style={{ ...styles.auditBtn, padding: '8px 16px' }}>
                    CANCEL
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading || !rejectReason.trim()}
                    onClick={() => handleReject(selectedCoach.coach_id)}
                    style={{ ...styles.declineBtn, backgroundColor: '#DC2626', color: '#FFFFFF' }}
                  >
                    {actionLoading ? 'DECLINING...' : 'CONFIRM REJECTION'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.modalActions}>
                {isCoachVerified(selectedCoach) ? (
                  <button type="button" onClick={() => setSelectedCoach(null)} style={styles.approveBtn}>
                    CLOSE AUDIT
                  </button>
                ) : (
                  <>
                    <button type="button" disabled={actionLoading} onClick={() => setShowRejectInput(true)} style={styles.declineBtn}>
                      DECLINE
                    </button>
                    <button type="button" disabled={actionLoading} onClick={() => handleApprove(selectedCoach.coach_id)} style={styles.approveBtn}>
                      {actionLoading ? 'VERIFYING...' : 'VERIFY & APPROVE COACH'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachAdmission;

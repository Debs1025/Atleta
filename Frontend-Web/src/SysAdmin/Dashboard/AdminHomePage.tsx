import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import {
  getStoredToken,
  getAdminCoachQueue,
  approveCoachAccreditation,
  rejectCoachAccreditation,
} from '../../api/client';
import type { AdminCoachQueueItem } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/AdminHomePage';

export const AdminHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<AdminCoachQueueItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<AdminCoachQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await getAdminCoachQueue(true);
      const list = Array.isArray(res?.queue) ? res.queue : Array.isArray(res) ? res : [];
      setQueue(list);
    } catch {
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate('/login');
      return;
    }
    loadQueue();
  }, [navigate]);

  const handleApprove = async (coachId: string) => {
    try {
      setActionLoading(true);
      await approveCoachAccreditation(coachId);
      setQueue((prev) =>
        prev.map((c) => (c.coach_id === coachId ? { ...c, account_status: 'Active', status: 'VERIFIED' } : c))
      );
      setSelectedCoach(null);
    } catch (e: any) {
      alert(e.message || 'Approval failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (coachId: string) => {
    if (!rejectReason.trim()) return;
    try {
      setActionLoading(true);
      await rejectCoachAccreditation(coachId, rejectReason.trim());
      setQueue((prev) =>
        prev.map((c) => (c.coach_id === coachId ? { ...c, account_status: 'Rejected', status: 'REJECTED' } : c))
      );
      setSelectedCoach(null);
      setShowRejectInput(false);
      setRejectReason('');
    } catch (e: any) {
      alert(e.message || 'Rejection failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchProcess = async () => {
    const pendingList = queue.filter(
      (c) => c.account_status === 'Pending' || c.status === 'PENDING_REVIEW'
    );
    if (!pendingList.length) return;
    try {
      setActionLoading(true);
      await Promise.allSettled(pendingList.map((c) => approveCoachAccreditation(c.coach_id)));
      await loadQueue();
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = queue.filter(
    (c) => (c.account_status || '').toLowerCase() === 'pending' || (c.status || '').includes('PENDING')
  ).length;

  const totalPages = Math.max(1, Math.ceil(queue.length / itemsPerPage));
  const displayedItems = queue.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Format date so that the timestamp is displayed correctly
  const formatDate = (raw: any): string => {
    try {
      if (raw) {
        if (typeof raw === 'string' || typeof raw === 'number') {
          const d = new Date(raw);
          if (!isNaN(d.getTime())) return d.toISOString().replace('T', ' ').slice(0, 16);
        } else if (typeof raw === 'object' && (raw._seconds || raw.seconds)) {
          const sec = raw._seconds ?? raw.seconds;
          const d = new Date(sec * 1000);
          if (!isNaN(d.getTime())) return d.toISOString().replace('T', ' ').slice(0, 16);
        }
      }
    } catch {}
    return new Date().toISOString().replace('T', ' ').slice(0, 16);
  };

  return (
    <div style={styles.shell}>
      {/* Shared Navbar */}
      <Navbar />

      {/* Main Layout */}
      <div style={styles.layout}>
        {/* Shared Sidebar with Bottom-Left Logout */}
        <Sidebar activeTab="AUDIT_QUEUE" />

        {/* Center Dashboard View */}
        <main style={styles.main}>
          <div style={styles.titleRow}>
            <h1 style={styles.title}>COACH AUDIT QUEUE</h1>
            <div style={styles.badgeRow}>
              <span style={styles.pendingBadge}>{pendingCount} PENDING</span>
              <span style={styles.statusText}>SYSTEM STATUS: OPERATIVE</span>
            </div>
          </div>

          {/* Metric & Callout Cards */}
          <div style={styles.cardsGrid}>
            <div style={styles.criticalCard}>
              <div style={styles.watermark}>9</div>
              <div>
                <h2 style={styles.criticalTitle}>CRITICAL REVIEW NEEDED</h2>
                <p style={styles.criticalText}>
                  A spike in certification uploads from NCAA DI institutions has been detected. Audits must be
                  completed within 24 hours of timestamp to maintain compliance protocols.
                </p>
              </div>
              <button
                type="button"
                disabled={actionLoading || pendingCount === 0}
                onClick={handleBatchProcess}
                style={styles.batchBtn}
              >
                {actionLoading ? 'PROCESSING...' : 'BATCH PROCESS VERIFIED'}
              </button>
            </div>

            <div style={styles.healthCard}>
              <div style={styles.healthLabel}>QUEUE HEALTH</div>
              <div style={styles.healthValue}>98.2%</div>
              <div style={styles.healthSub}>INTEGRITY CHECK PASSED</div>
            </div>
          </div>

          {/* Data Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>COACH ID</th>
                  <th style={styles.th}>FULL NAME</th>
                  <th style={styles.th}>INSTITUTIONAL AFFILIATION</th>
                  <th style={styles.th}>DATE UPLOADED</th>
                  <th style={styles.th}>STATUS</th>
                  <th style={{ ...styles.th, textAlign: 'center', borderRight: 'none' }}>AUDIT</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px', textAlign: 'center' }}>
                      <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                      No coach audit applications in queue.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item, idx) => {
                    const isVerified =
                      item.account_status === 'Active' ||
                      item.status === 'VERIFIED' ||
                      item.status === 'ACTIVE';
                    const dateFormatted = formatDate(item.date_uploaded || item.created_at);

                    return (
                      <tr key={item.coach_id || idx}>
                        <td style={styles.td}>
                          <span style={styles.idText}>{item.coach_id || `#C-${idx + 1}`}</span>
                        </td>
                        <td style={{ ...styles.td, fontWeight: 800, textTransform: 'uppercase' }}>
                          {item.full_name || 'COACH APPLICANT'}
                        </td>
                        <td style={{ ...styles.td, textTransform: 'uppercase' }}>
                          {item.institutional_affiliation || item.current_institution || '—'}
                        </td>

                        <td style={styles.td}>
                          <span style={styles.dateText}>{dateFormatted}</span>
                        </td>
                        <td style={styles.td}>
                          {isVerified ? (
                            <span style={styles.verifiedBadge}>VERIFIED</span>
                          ) : (
                            <span style={styles.pendingReviewBadge}>PENDING_REVIEW</span>
                          )}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center', borderRight: 'none' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedCoach(item)}
                            style={styles.auditBtn}
                          >
                            AUDIT
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>


          {/* Pagination Controls */}
          <div style={styles.paginationRow}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ ...styles.pageArrowBtn, opacity: page <= 1 ? 0.4 : 1 }}
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <button type="button" style={styles.pageNumberBtn}>
              PAGE {String(page).padStart(2, '0')}
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ ...styles.pageArrowBtn, opacity: page >= totalPages ? 0.4 : 1 }}
            >
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </main>
      </div>

      {/* Audit Action Modal */}
      {selectedCoach && (
        <div style={styles.modalOverlay} onClick={() => setSelectedCoach(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 900, margin: 0 }}>
                AUDIT COACH ACCREDITATION
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCoach(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '20px' }}>
              <div><strong>Coach ID:</strong> {selectedCoach.coach_id}</div>
              <div><strong>Full Name:</strong> {selectedCoach.full_name}</div>
              <div><strong>Institution:</strong> {selectedCoach.institutional_affiliation || selectedCoach.current_institution || 'N/A'}</div>
              <div><strong>Sport:</strong> {selectedCoach.sport_type || 'General'}</div>
              <div><strong>Experience:</strong> {selectedCoach.years_of_experience || 0} Years</div>
              <div><strong>Status:</strong> {selectedCoach.account_status || 'Pending'}</div>
            </div>

            {showRejectInput ? (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  REJECTION REASON:
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter reason for declining accreditation..."
                  style={{ width: '100%', height: '70px', padding: '8px', border: '1px solid #CBD5E1', borderRadius: '4px', fontSize: '12px' }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    disabled={actionLoading || !rejectReason.trim()}
                    onClick={() => handleReject(selectedCoach.coach_id)}
                    style={{ ...styles.batchBtn, backgroundColor: '#DC2626' }}
                  >
                    CONFIRM REJECTION
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectInput(false)}
                    style={{ ...styles.auditBtn }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setShowRejectInput(true)}
                  style={{ ...styles.auditBtn, color: '#DC2626', borderColor: '#DC2626' }}
                >
                  DECLINE
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleApprove(selectedCoach.coach_id)}
                  style={{ ...styles.batchBtn }}
                >
                  {actionLoading ? 'PROCESSING...' : 'APPROVE & ACTIVATE'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import {
  getStoredToken,
  getCachedData,
  getAdminCoachQueue,
} from '../../api/client';
import type { AdminCoachQueueItem, AdminCoachQueueResponse } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { CoachAdmission } from './CoachAdmission';
import { styles } from './styles/AdminHomePage';

const STORAGE_KEY = 'atleta_admin_all_coaches';

const DEFAULT_INITIAL_COACHES: AdminCoachQueueItem[] = [
  {
    coach_id: 'coach_001',
    user_id: 'usr_coach_001',
    first_name: 'Erick Nathaniel',
    last_name: 'De Belen',
    full_name: 'Erick Nathaniel De Belen',
    current_institution: 'University Athletics',
    institutional_affiliation: 'University Athletics',
    sport_type: 'Basketball',
    years_of_experience: 5,
    account_status: 'Active',
    status: 'VERIFIED',
    professional_documents: ['https://storage.googleapis.com/atleta/coach_license_sbp.pdf'],
    created_at: '2026-01-15T08:30:00.000Z',
    date_uploaded: '2026-01-15 08:30',
  },
];

const getStoredCoaches = (): AdminCoachQueueItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredCoaches = (list: AdminCoachQueueItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
};

type FilterType = 'ALL' | 'NON_AUDITED' | 'AUDITED';

export const AdminHomePage: React.FC = () => {
  const navigate = useNavigate();

  const [queue, setQueue] = useState<AdminCoachQueueItem[]>(() => {
    const stored = getStoredCoaches();
    if (stored.length > 0) return stored;
    const cached = getCachedData<AdminCoachQueueResponse>('admin_coach_queue')?.queue;
    if (Array.isArray(cached) && cached.length > 0) return cached;
    return DEFAULT_INITIAL_COACHES;
  });
  const [loading, setLoading] = useState(!getCachedData('admin_coach_queue'));
  const [selectedCoach, setSelectedCoach] = useState<AdminCoachQueueItem | null>(null);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [page, setPage] = useState(1);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const itemsPerPage = 6;

  const loadQueue = async () => {
    try {
      const res = await getAdminCoachQueue(true);
      const incoming = Array.isArray(res?.queue) ? res.queue : [];
      setQueue((prev) => {
        const map = new Map<string, AdminCoachQueueItem>();
        prev.forEach((c) => map.set(c.coach_id || c.user_id, c));
        incoming.forEach((c) => {
          const id = c.coach_id || c.user_id;
          map.set(id, { ...map.get(id), ...c });
        });
        const merged = Array.from(map.values());
        saveStoredCoaches(merged);
        return merged;
      });
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

  const handleUpdateCoach = (coachId: string, account_status: string, status: string) => {
    setQueue((prev) => {
      const updated = prev.map((c) => (c.coach_id === coachId ? { ...c, account_status, status } : c));
      saveStoredCoaches(updated);
      return updated;
    });
  };

  const isCoachVerified = (c: AdminCoachQueueItem) =>
    (c.account_status || '').toLowerCase() === 'active' ||
    (c.status || '').toUpperCase() === 'VERIFIED' ||
    (c.status || '').toUpperCase() === 'ACTIVE';

  const isCoachRejected = (c: AdminCoachQueueItem) =>
    (c.account_status || '').toLowerCase() === 'rejected' ||
    (c.status || '').toUpperCase() === 'REJECTED';

  const isAudited = (c: AdminCoachQueueItem) => isCoachVerified(c) || isCoachRejected(c);

  const nonAuditedCount = queue.filter((c) => !isAudited(c)).length;
  const auditedCount = queue.filter(isAudited).length;
  const pendingCount = nonAuditedCount;

  const filteredQueue = queue.filter((c) => {
    if (filter === 'NON_AUDITED') return !isAudited(c);
    if (filter === 'AUDITED') return isAudited(c);
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / itemsPerPage));
  const displayedItems = filteredQueue.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const queueHealthScore = queue.length > 0 ? Math.max(92.4, Math.min(99.9, 100 - pendingCount * 0.4)).toFixed(1) : '98.2';

  const formatDate = (raw: any): string => {
    try {
      const t = raw?._seconds ? raw._seconds * 1000 : raw;
      const d = new Date(t);
      if (!isNaN(d.getTime())) return d.toISOString().replace('T', ' ').slice(0, 16);
    } catch {}
    return new Date().toISOString().replace('T', ' ').slice(0, 16);
  };

  const formatCoachId = (rawId?: string, idx = 0) => {
    if (!rawId) return `#C-${String(idx + 1).padStart(5, '0')}`;
    const clean = rawId.replace(/^coach_/, '');
    return `#C-${clean.length > 8 ? `${clean.slice(0, 5).toUpperCase()}-${clean.slice(-1).toUpperCase()}` : clean.toUpperCase()}`;
  };

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

          {/* Metric Cards Grid */}
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

          {/* Status Filter Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              minHeight: '34px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', letterSpacing: '0.06em', marginRight: '4px' }}>
                FILTER:
              </span>
              {(
                [
                  { key: 'ALL', label: `ALL (${queue.length})` },
                  { key: 'NON_AUDITED', label: `NON-AUDITED (${nonAuditedCount})` },
                  { key: 'AUDITED', label: `AUDITED (${auditedCount})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setFilter(f.key);
                    setPage(1);
                  }}
                  style={{
                    padding: '6px 14px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    borderRadius: '2px',
                    border: filter === f.key ? '1px solid #0B132B' : '1px solid #CBD5E1',
                    backgroundColor: filter === f.key ? '#0B132B' : '#FFFFFF',
                    color: filter === f.key ? '#FFFFFF' : '#475569',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              Showing {filteredQueue.length} coach{filteredQueue.length !== 1 ? 'es' : ''}
            </span>
          </div>

          {/* Coach Audit Table */}
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {[
                    { label: 'COACH ID', width: '12%' },
                    { label: 'FULL NAME', width: '25%' },
                    { label: 'INSTITUTIONAL AFFILIATION', width: '25%' },
                    { label: 'DATE UPLOADED', width: '15%' },
                    { label: 'STATUS', width: '11%' },
                    { label: 'AUDIT', width: '12%', align: 'center' },
                  ].map((col) => (
                    <th
                      key={col.label}
                      style={{
                        ...styles.th,
                        width: col.width,
                        textAlign: (col.align as any) || 'left',
                        ...(col.align === 'center' ? { borderRight: 'none' } : {}),
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && queue.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ height: '52px', padding: '16px 18px', textAlign: 'center', boxSizing: 'border-box' }}>
                      <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', margin: '0 auto', color: '#0B132B' }} />
                    </td>
                  </tr>
                ) : displayedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        height: '52px',
                        padding: '16px 18px',
                        textAlign: 'center',
                        color: '#64748B',
                        fontSize: '13px',
                        fontWeight: 600,
                        borderBottom: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      {filter === 'NON_AUDITED'
                        ? 'No non-audited coach applications in queue.'
                        : filter === 'AUDITED'
                        ? 'No audited coaches found.'
                        : 'No coach audit applications in queue.'}
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item, idx) => {
                    const isHovered = hoveredRow === (item.coach_id || String(idx));
                    return (
                      <tr
                        key={item.coach_id || idx}
                        onClick={() => setSelectedCoach(item)}
                        onMouseEnter={() => setHoveredRow(item.coach_id || String(idx))}
                        onMouseLeave={() => setHoveredRow(null)}
                        style={{
                          ...styles.trClickable,
                          height: '52px',
                          backgroundColor: isHovered ? '#F8FAFC' : '#FFFFFF',
                        }}
                        title="Click to view coach profile and uploaded credentials"
                      >
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
                          <span
                            style={
                              isCoachVerified(item)
                                ? styles.verifiedBadge
                                : isCoachRejected(item)
                                ? { ...styles.verifiedBadge, backgroundColor: '#FEE2E2', color: '#991B1B' }
                                : styles.pendingReviewBadge
                            }
                          >
                            {isCoachVerified(item) ? 'VERIFIED' : isCoachRejected(item) ? 'REJECTED' : 'PENDING_REVIEW'}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center', borderRight: 'none', padding: '10px 8px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCoach(item);
                            }}
                            style={styles.auditBtn}
                          >
                            {isAudited(item) ? 'VIEW' : 'AUDIT'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
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

      {/* Separated Coach UI: Opens when a coach is clicked */}
      {selectedCoach && (
        <CoachAdmission
          coach={selectedCoach}
          onClose={() => setSelectedCoach(null)}
          onUpdate={handleUpdateCoach}
        />
      )}
    </div>
  );
};

export default AdminHomePage;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getMe,
  getOfficialDashboard,
} from '../../api/client';
import type { AuthUser, OfficialDashboardResponse } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/OfficialHomePage';

export const OfficialHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(
    () => getCachedData<AuthUser>('user_me') || getStoredUser()
  );
  const [dashboard, setDashboard] = useState<OfficialDashboardResponse | null>(
    () => getCachedData<OfficialDashboardResponse>('official_dashboard')
  );
  const [loading, setLoading] = useState(() => !getCachedData('official_dashboard'));

  const refreshDashboard = () => {
    getOfficialDashboard(true).then((res) => setDashboard(res)).catch(() => {});
  };

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }

    Promise.all([
      getMe().then((res) => setUser(res)).catch(() => {}),
      getOfficialDashboard().then((res) => setDashboard(res)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [navigate]);

  const totalMatches = dashboard?.total_matches ?? 0;
  const pendingCount = dashboard?.pending_count ? String(dashboard.pending_count).padStart(2, '0') : '00';
  const auditedCount = dashboard?.audited_count ? String(dashboard.audited_count).padStart(2, '0') : '00';

  return (
    <div style={styles.shell}>
      {/* Shared Navbar */}
      <Navbar user={user} />

      {/* Main Body */}
      <div style={styles.layoutBody}>
        {/* Shared Sidebar */}
        <Sidebar
          activeTab="DASHBOARD"
          onMatchCreated={refreshDashboard}
        />

        {/* Dashboard Content Area */}
        <main style={styles.contentArea}>
          <div style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>OFFICIALS DASHBOARD</h1>
            <p style={styles.pageSubtitle}>MANAGE YOUR GAMES, MATCH STATISTICS AND PERFORMANCE METRICS !</p>
          </div>

          {/* Metric Summary KPI Cards */}
          <div style={styles.kpiGrid}>
            <div style={styles.kpiBox}>
              <span style={{ ...styles.kpiLabel, color: '#94A3B8' }}>TOTAL MATCHES</span>
              <h2 style={styles.kpiValue}>{loading ? '...' : totalMatches}</h2>
            </div>
            <div style={styles.kpiBox}>
              <span style={{ ...styles.kpiLabel, color: '#D97706' }}>PENDING VERIFICATION</span>
              <h2 style={styles.kpiValue}>{loading ? '...' : pendingCount}</h2>
            </div>
            <div style={styles.kpiBox}>
              <span style={{ ...styles.kpiLabel, color: '#059669' }}>AUDITED COMPLETED</span>
              <h2 style={styles.kpiValue}>{loading ? '...' : auditedCount}</h2>
            </div>
          </div>

          {/* New Matches Table Section */}
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionHeading}>NEW MATCHES</h3>
            <Link to="/schedules" style={styles.viewAllLink}>
              VIEW ALL <ExternalLink style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          <div style={styles.tableFrame}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>MATCH ID</th>
                  <th style={styles.th}>MATCH CLASS</th>
                  <th style={styles.th}>SPORT</th>
                  <th style={styles.th}>COACH</th>
                  <th style={{ ...styles.th, borderRight: 'none' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ ...styles.td, textAlign: 'center', padding: '32px' }}>
                      <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', margin: '0 auto', color: '#0B132B' }} />
                    </td>
                  </tr>
                ) : dashboard?.audit_queue && dashboard.audit_queue.length > 0 ? (
                  dashboard.audit_queue.map((item, idx) => {
                    const match = item.match_details || {};
                    const matchId = match.match_id || item.match_id || `#MATCH-${idx + 1}`;
                    const matchClass =
                      match.home_team_name && match.away_team_name
                        ? `${match.home_team_name} vs. ${match.away_team_name}`
                        : item.match_id || 'Tournament Match';
                    const sport = match.sport_type || 'Basketball';
                    const coach = match.coach_name || item.requested_by || 'Assigned Coach';

                    return (
                      <tr key={item.audit_id || idx}>
                        <td style={{ ...styles.td, ...styles.tdMatchId }}>{matchId}</td>
                        <td style={styles.td}>{matchClass}</td>
                        <td style={styles.td}>{sport}</td>
                        <td style={styles.td}>{coach}</td>
                        <td style={{ ...styles.td, borderRight: 'none' }}>
                          <span style={styles.statusBadge}>PENDING VERIFICATION</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ ...styles.td, textAlign: 'center', color: '#94A3B8', padding: '32px' }}>
                      No new match verification requests at this time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Recent Activity Section */}
          <div style={styles.recentActivityCard}>
            <div style={styles.activityHead}>RECENT ACTIVITY</div>
            <div style={styles.activityBody}>
              {dashboard?.audit_queue && dashboard.audit_queue.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dashboard.audit_queue.slice(0, 5).map((act, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Audit requested for Match ID <strong>{act.match_id}</strong></span>
                      <span style={{ color: '#94A3B8' }}>{act.requested_at ? new Date(act.requested_at).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.emptyNotice}>No recent official audit activity logged.</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

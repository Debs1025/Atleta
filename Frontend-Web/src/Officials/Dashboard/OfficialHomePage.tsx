import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getMe,
  getOfficialDashboard,
  getAllOfficialMatchesMaster,
  getOfficialSettings,
  prefetchAllOfficialAuditMatches,
  prefetchMatchAuditDetail,
  isMatchCreatedByOfficial,
  isMatchLocallyCertified,
} from '../../api/client';
import type { AuthUser, OfficialDashboardResponse, MatchSummaryItem } from '../../api/types';
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
  const [masterMatches, setMasterMatches] = useState<MatchSummaryItem[]>(
    () => getCachedData<MatchSummaryItem[]>('all_official_matches_master') || []
  );
  const [loading, setLoading] = useState(() => !getCachedData('official_dashboard'));

  const refreshDashboard = () => {
    getOfficialDashboard(true).then((res) => setDashboard(res)).catch(() => { });
    getAllOfficialMatchesMaster(true).then((res) => setMasterMatches(res || [])).catch(() => { });
  };

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }

    Promise.all([
      getMe().then((res) => setUser(res)).catch(() => { }),
      getOfficialDashboard().then((res) => setDashboard(res)).catch(() => { }),
      getAllOfficialMatchesMaster().then((res) => setMasterMatches(res || [])).catch(() => { }),
      getOfficialSettings().catch(() => { }),
      prefetchAllOfficialAuditMatches().catch(() => { }),
    ]).finally(() => setLoading(false));
  }, [navigate]);

  // Filter matches specifically created/assigned to current official
  const currentOfficialIds = useMemo(() => new Set(
    [
      user?.uid,
      user?.user_id,
      (user as any)?.official_id,
      user?.uid ? `off_${user.uid.replace(/^off_/, '')}` : null,
      user?.uid ? user.uid.replace(/^off_/, '') : null,
      user?.email,
    ].filter(Boolean) as string[]
  ), [user]);

  const officialMatches = useMemo(() => {
    const list: MatchSummaryItem[] = masterMatches.filter((m) => isMatchCreatedByOfficial(m, user));
    const existingIds = new Set(list.map((m) => m.match_id.replace(/^#/, '')));

    // Also include any items from dashboard.audit_queue if they belong to this official and aren't in masterMatches yet
    (dashboard?.audit_queue || []).forEach((item: any, idx: number) => {
      const match = item.match_details || {};
      const rawId = String(match.match_id || item.match_id || `queue_${idx}`).replace(/^#/, '');
      const fakeSummary: MatchSummaryItem = {
        match_id: `#${rawId}`,
        validation_id: item.audit_id || rawId,
        match_class: match.home_team_name && match.away_team_name ? `${match.home_team_name} vs. ${match.away_team_name}` : 'Tournament Match',
        sport: match.sport_type || 'Basketball',
        coaches: '',
        date_time: match.match_date || item.requested_at || new Date().toISOString(),
        status: 'PENDING',
        raw_match: { ...match, ...item },
      };

      const belongsToMe = isMatchCreatedByOfficial(fakeSummary, user) || (
        (item.requested_by && currentOfficialIds.has(item.requested_by)) ||
        (item.official_id && currentOfficialIds.has(item.official_id))
      );

      if (belongsToMe && !existingIds.has(rawId)) {
        const isAudited = item.status === 'Approved' || item.status === 'Audited' || match.is_certified === true || isMatchLocallyCertified(rawId);
        const assignedCoaches = Array.isArray(match.assigned_coaches) && match.assigned_coaches.length > 0
          ? match.assigned_coaches
          : Array.isArray(match.coaches) && match.coaches.length > 0
            ? match.coaches
            : [];
        const coach = assignedCoaches.length > 0
          ? assignedCoaches.join(', ')
          : match.coach_name
            ? `Coach ${match.coach_name}`
            : item.requested_by && !String(item.requested_by).startsWith('off_') && !String(item.requested_by).includes('@') && String(item.requested_by).length < 25
              ? `Coach ${item.requested_by}`
              : 'Assigned Coach';

        list.push({
          ...fakeSummary,
          coaches: coach,
          status: isAudited ? 'AUDITED' : 'PENDING',
        });
        existingIds.add(rawId);
      }
    });

    // Ensure certified status is accurately reflected for all matches
    list.forEach((m) => {
      const cleanId = m.match_id.replace(/^#/, '');
      if (isMatchLocallyCertified(cleanId)) {
        m.status = 'AUDITED';
      }
    });

    // Sort descending by date/time (newest matches first)
    return list.sort((a, b) => {
      const getT = (m: MatchSummaryItem) => {
        const raw = m.raw_match || {};
        const val = raw.created_at || raw.timestamp || raw.requested_at || raw.match_date;
        return val ? new Date(val).getTime() : 0;
      };
      return getT(b) - getT(a);
    });
  }, [masterMatches, dashboard, user, currentOfficialIds]);

  // Show the last 3 new matches instead of 1 only
  const newMatchesList = useMemo(() => {
    return officialMatches.slice(0, 3);
  }, [officialMatches]);

  const totalMatches = officialMatches.length;
  const pendingCount = String(
    officialMatches.filter((i) => i.status === 'PENDING').length
  ).padStart(2, '0');
  const auditedCount = String(
    officialMatches.filter((i) => i.status === 'AUDITED').length
  ).padStart(2, '0');

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
            <Link
              to="/matches"
              className="hover-view-all"
              style={styles.viewAllLink}
              onMouseEnter={() => prefetchAllOfficialAuditMatches()}
            >
              VIEW ALL <ExternalLink style={{ width: 12, height: 12 }} />
            </Link>
          </div>

          <div style={styles.tableFrame}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>MATCH ID</th>
                  <th style={styles.th}>MATCH NAME</th>
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
                ) : newMatchesList.length > 0 ? (
                  newMatchesList.map((item, idx) => {
                    const lookupId = item.raw_match?.match_id || item.validation_id || item.match_id.replace(/^#/, '');
                    const isAudited = item.status === 'AUDITED' || isMatchLocallyCertified(lookupId);

                    return (
                      <tr
                        key={item.match_id || idx}
                        className="hover-match-row"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => prefetchMatchAuditDetail(lookupId)}
                        onClick={() => navigate(`/matches/${lookupId}`)}
                      >
                        <td style={{ ...styles.td, ...styles.tdMatchId }}>{item.match_id}</td>
                        <td style={styles.td}>{item.match_class}</td>
                        <td style={styles.td}>{item.sport}</td>
                        <td style={styles.td}>{item.coaches || 'Assigned Coach'}</td>
                        <td style={{ ...styles.td, borderRight: 'none' }}>
                          <span style={isAudited ? styles.statusAudited : styles.statusPending}>
                            {isAudited ? 'AUDITED' : 'PENDING'}
                          </span>
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
                  {dashboard.audit_queue.map((act, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '12px',
                        color: '#334155',
                        display: 'flex',
                        justifyContent: 'space-between',
                        paddingBottom: '8px',
                        borderBottom: i < dashboard.audit_queue.length - 1 ? '1px solid #F1F5F9' : 'none',
                      }}
                    >
                      <span>Audit requested for Match ID <strong>{act.match_id}</strong></span>
                      <span style={{ color: '#94A3B8', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                        {act.requested_at ? new Date(act.requested_at).toLocaleDateString() : 'Recent'}
                      </span>
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

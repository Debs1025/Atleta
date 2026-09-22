import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getStoredUser,
  getCachedData,
  getAllOfficialMatchesMaster,
  prefetchMatchAuditDetail,
  isMatchCreatedByOfficial,
  isMatchLocallyCertified,
  getActiveSportsList,
  DEFAULT_FALLBACK_SPORTS,
} from '../../api/client';
import type { MatchSummaryItem, SportConfiguration } from '../../api/types';
import { styles } from './styles/ViewAllMatch';

// Memoized row component to eliminate unnecessary re-renders when switching filters
const MatchRow = React.memo(({ item, onClick }: { item: MatchSummaryItem; onClick: (id: string) => void }) => {
  const rawId = item.match_id.replace(/^#/, '');
  const isAudited = item.status === 'AUDITED' || isMatchLocallyCertified(rawId);

  return (
    <tr
      className="hover-match-row"
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => prefetchMatchAuditDetail(rawId)}
      onClick={() => onClick(item.match_id)}
    >
      <td style={{ ...styles.td, ...styles.tdMatchId }}>{item.match_id}</td>
      <td style={styles.td}>{item.match_class}</td>
      <td style={styles.td}>{item.sport}</td>
      <td style={styles.td}>{item.coaches || 'Official Assigned'}</td>
      <td style={styles.td}>{item.date_time}</td>
      <td style={{ ...styles.td, borderRight: 'none' }}>
        <span style={isAudited ? styles.statusAudited : styles.statusPending}>
          {isAudited ? 'AUDITED' : 'PENDING'}
        </span>
      </td>
    </tr>
  );
});

export const ViewAllMatch: React.FC = () => {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'PROCESSED'>('PENDING');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [activeSports, setActiveSports] = useState<SportConfiguration[]>(DEFAULT_FALLBACK_SPORTS);

  // Master in-memory dataset of all official's matches
  const [allMatches, setAllMatches] = useState<MatchSummaryItem[]>(
    () => getCachedData<MatchSummaryItem[]>('all_official_matches_master') || []
  );
  const [loading, setLoading] = useState(
    () => !getCachedData<MatchSummaryItem[]>('all_official_matches_master')
  );

  useEffect(() => {
    getActiveSportsList().then((sports) => {
      if (sports && sports.length > 0) setActiveSports(sports);
    }).catch(() => { });
  }, []);

  // Fetch / refresh master dataset in background
  useEffect(() => {
    let isMounted = true;
    const cached = getCachedData<MatchSummaryItem[]>('all_official_matches_master');
    if (!cached || cached.length === 0) {
      setLoading(true);
    }

    getAllOfficialMatchesMaster(true)
      .then((data) => {
        if (isMounted && data) {
          setAllMatches(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load official master matches:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const sportsList = useMemo(() => {
    const list = activeSports.map((s) => s.sport_name.toUpperCase());
    return ['ALL SPORTS', ...Array.from(new Set(list))];
  }, [activeSports]);

  // Filter Sports, Pending/Processed, and ONLY matches created by this official user
  const displayedMatches = useMemo(() => {
    return allMatches.filter((item) => {
      // Show only matches created by their own official user
      if (!isMatchCreatedByOfficial(item, user)) return false;

      // Status Filter
      if (activeTab === 'PENDING' && item.status !== 'PENDING') return false;
      if (activeTab === 'PROCESSED' && item.status !== 'AUDITED') return false;

      // Sport Filter
      const normSport = selectedSport.replace('&', 'AND').toUpperCase().trim();
      if (normSport !== 'ALL' && normSport !== 'ALL SPORTS') {
        const itemSport = (item.sport || '').toLowerCase();
        const targetSport = normSport.toLowerCase();
        if (targetSport.includes('basket')) return itemSport.includes('basket');
        if (targetSport.includes('swim')) return itemSport.includes('swim') || itemSport.includes('aquatic');
        if (targetSport.includes('track') || targetSport.includes('field')) return itemSport.includes('track') || itemSport.includes('field') || itemSport.includes('athletic');
        return itemSport.includes(targetSport) || targetSport.includes(itemSport);
      }

      return true;
    });
  }, [allMatches, activeTab, selectedSport, user]);

  const handleRowClick = (matchId: string) => {
    const cleanId = matchId.replace(/^#/, '');
    navigate(`/matches/${cleanId}`);
  };

  return (
    <div style={styles.shell}>
      <main style={styles.contentArea}>
        {/* Header Row */}
        <div style={styles.pageHeaderRow}>
          <h1 style={styles.pageTitle}>ALL MATCHES</h1>
          <Link to="/dashboard" className="hover-back-link" style={styles.backLink}>
            <span>Back to Main Page</span>
            <span>↩</span>
          </Link>
        </div>

        {/* Filter Bar */}
        <div style={styles.filterBar}>
          {/* PENDING vs PROCESSED */}
          <div style={styles.tabGroup}>
            <button
              type="button"
              onClick={() => setActiveTab('PENDING')}
              className={`hover-tab-btn ${activeTab === 'PENDING' ? 'active' : ''}`}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'PENDING' ? styles.tabBtnActive : styles.tabBtnInactive),
                borderRight: '2px solid #0B132B',
              }}
            >
              PENDING AUDITS
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PROCESSED')}
              className={`hover-tab-btn ${activeTab === 'PROCESSED' ? 'active' : ''}`}
              style={{
                ...styles.tabBtn,
                ...(activeTab === 'PROCESSED' ? styles.tabBtnActive : styles.tabBtnInactive),
              }}
            >
              PROCESSED AUDITS
            </button>
          </div>

          {/* Right Sport Filter Segmented Buttons */}
          <div style={styles.sportFilterWrap}>
            <span style={styles.sportFilterLabel}>FILTER SPORT:</span>
            <div style={styles.sportBtnGroup}>
              {sportsList.map((sport, idx) => {
                const normSelected = selectedSport.replace('&', 'AND').toUpperCase().trim();
                const normSport = sport.replace('&', 'AND').toUpperCase().trim();
                const isActive =
                  (sport === 'ALL SPORTS' && (normSelected === 'ALL' || normSelected === 'ALL SPORTS')) ||
                  normSelected === normSport;
                const isLast = idx === sportsList.length - 1;

                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => setSelectedSport(sport === 'ALL SPORTS' ? 'ALL' : sport)}
                    className={`hover-sport-btn ${isActive ? 'active' : ''}`}
                    style={{
                      ...styles.sportBtn,
                      ...(isActive ? styles.sportBtnActive : styles.sportBtnInactive),
                      ...(isLast ? { borderRight: 'none' } : {}),
                    }}
                  >
                    {sport}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Audit Queue Table */}
        <div style={styles.tableFrame}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>MATCH ID</th>
                <th style={styles.th}>MATCH NAME</th>
                <th style={styles.th}>SPORT</th>
                <th style={styles.th}>COACHES (TEAM 1, TEAM 2)</th>
                <th style={styles.th}>DATE / TIME</th>
                <th style={{ ...styles.th, borderRight: 'none' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading && displayedMatches.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skel-${idx}`} style={styles.tr}>
                    <td style={styles.td}><div style={styles.skeletonRow} /></td>
                    <td style={styles.td}><div style={styles.skeletonRow} /></td>
                    <td style={styles.td}><div style={styles.skeletonRow} /></td>
                    <td style={styles.td}><div style={styles.skeletonRow} /></td>
                    <td style={styles.td}><div style={styles.skeletonRow} /></td>
                    <td style={{ ...styles.td, borderRight: 'none' }}><div style={styles.skeletonRow} /></td>
                  </tr>
                ))
              ) : displayedMatches.length > 0 ? (
                displayedMatches.map((item) => (
                  <MatchRow
                    key={item.match_id}
                    item={item}
                    onClick={() => handleRowClick(item.match_id)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={styles.emptyState}>
                    No matches found in the audit queue for the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
export default ViewAllMatch;

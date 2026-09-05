import React, { useState, useEffect, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getStoredToken,
  getAllOfficialMatchesMaster,
  getCachedData,
  prefetchMatchAuditDetail,
} from '../../api/client';
import type { MatchSummaryItem } from '../../api/types';
import { styles } from './styles/ViewAllMatch';

interface MatchRowProps {
  item: MatchSummaryItem;
  onClick: () => void;
}

const MatchRow = memo(({ item, onClick }: MatchRowProps) => {
  const isPending = item.status === 'PENDING';

  return (
    <tr
      style={styles.tr}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
        prefetchMatchAuditDetail(item.match_id);
      }}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
    >
      <td style={{ ...styles.td, ...styles.tdMatchId }}>{item.match_id}</td>
      <td style={{ ...styles.td, ...styles.tdMatchClass }}>{item.match_class}</td>
      <td style={{ ...styles.td, ...styles.tdSport }}>{item.sport}</td>
      <td style={{ ...styles.td, ...styles.tdCoaches }}>{item.coaches}</td>
      <td style={{ ...styles.td, ...styles.tdDateTime }}>{item.date_time}</td>
      <td style={{ ...styles.td, borderRight: 'none' }}>
        <span style={isPending ? styles.statusPending : styles.statusAudited}>
          {item.status}
        </span>
      </td>
    </tr>
  );
});

export const ViewAllMatch: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'PROCESSED'>('PENDING');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

  // Master in-memory dataset of all official's matches
  const [allMatches, setAllMatches] = useState<MatchSummaryItem[]>(
    () => getCachedData<MatchSummaryItem[]>('all_official_matches_master') || []
  );
  const [loading, setLoading] = useState(
    () => !getCachedData<MatchSummaryItem[]>('all_official_matches_master')
  );

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  // Fetch / refresh master dataset in background
  useEffect(() => {
    let isMounted = true;
    const cached = getCachedData<MatchSummaryItem[]>('all_official_matches_master');
    if (!cached || cached.length === 0) {
      setLoading(true);
    }

    getAllOfficialMatchesMaster(false)
      .then((data) => {
        if (isMounted && data && data.length > 0) {
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

  const sportsList = useMemo(
    () => ['ALL SPORTS', 'BASKETBALL', 'TRACK AND FIELD', 'SWIMMING'],
    []
  );

  // 100% Instant in-memory filtering: 0ms latency, zero re-fetching or skeleton flicker
  const displayedMatches = useMemo(() => {
    return allMatches.filter((item) => {
      // 1. Status Filter
      if (activeTab === 'PENDING' && item.status !== 'PENDING') return false;
      if (activeTab === 'PROCESSED' && item.status !== 'AUDITED') return false;

      // 2. Sport Filter
      const normSport = selectedSport.replace('&', 'AND').toUpperCase().trim();
      if (normSport !== 'ALL' && normSport !== 'ALL SPORTS') {
        const itemSport = (item.sport || '').toLowerCase();
        if (normSport.includes('BASKET')) {
          return itemSport.includes('basket');
        }
        if (normSport.includes('SWIM')) {
          return itemSport.includes('swim') || itemSport.includes('aquatic');
        }
        if (normSport.includes('TRACK') || normSport.includes('FIELD')) {
          return itemSport.includes('track') || itemSport.includes('field') || itemSport.includes('athletic');
        }
        return itemSport.includes(normSport.toLowerCase());
      }

      return true;
    });
  }, [allMatches, activeTab, selectedSport]);

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
          <Link to="/dashboard" style={styles.backLink}>
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
                <th style={styles.th}>MATCH CLASS</th>
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

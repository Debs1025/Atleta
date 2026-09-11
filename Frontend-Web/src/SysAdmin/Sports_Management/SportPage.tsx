import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  BarChart3,
  ChevronDown,
  Save,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Calculator,
} from 'lucide-react';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import {
  getStoredToken,
  getCachedData,
  setCachedData,
  getSports,
  createSport,
  updateSport,
} from '../../api/client';
import type {
  SportConfiguration,
  MeasurementCategory,
  DynamicStatRow,
  BackendConfigurableStat,
} from '../../api/types';
import { styles } from './styles/SportPage';

// ─── 3 INITIAL CORE SPORTS PROVIDED BY ATLETA SYSTEM ─────────────────────────
export const INITIAL_DEFAULT_SPORTS: SportConfiguration[] = [
  {
    sport_id: 'sport_basketball_default',
    sport_name: 'BASKETBALL',
    short_identifier: 'BBALL',
    configurable_stats: [
      { stat_name_key: 'points', measurement_category: 'Cumulative Total', label: 'POINTS', formula: 'SUM(POINTS)' },
      { stat_name_key: 'assists', measurement_category: 'Cumulative Total', label: 'ASSISTS', formula: 'SUM(ASSISTS)' },
      { stat_name_key: 'offensive_rebounds', measurement_category: 'Cumulative Total', label: 'OFFENSIVE REBOUNDS' },
      { stat_name_key: 'defensive_rebounds', measurement_category: 'Cumulative Total', label: 'DEFENSIVE REBOUNDS' },
      { stat_name_key: 'steals', measurement_category: 'Count', label: 'STEALS' },
      { stat_name_key: 'blocks', measurement_category: 'Count', label: 'BLOCKS' },
      { stat_name_key: 'fouls', measurement_category: 'Count', label: 'FOULS' },
      { stat_name_key: 'turnovers', measurement_category: 'Count', label: 'TURNOVERS' },
      { stat_name_key: 'fg_percentage', measurement_category: 'Percentage', label: 'FIELD GOAL ACCURACY', formula: '(FG_MADE / FG_ATTEMPTED) * 100' },
      { stat_name_key: 'three_pt_percentage', measurement_category: 'Percentage', label: '3PT ACCURACY', formula: '(3PT_MADE / 3PT_ATTEMPTED) * 100' },
      { stat_name_key: 'ft_percentage', measurement_category: 'Percentage', label: 'FREE THROW ACCURACY', formula: '(FT_MADE / FT_ATTEMPTED) * 100' },
    ],
    scoring_rules: { win_condition: 'HIGHEST_SCORE', period_format: '4_QUARTERS' },
    positions: ['POINT GUARD', 'SHOOTING GUARD', 'SMALL FORWARD', 'POWER FORWARD', 'CENTER'],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    sport_id: 'sport_swimming_default',
    sport_name: 'SWIMMING',
    short_identifier: 'SWIM',
    configurable_stats: [
      { stat_name_key: 'finish_time_ms', measurement_category: 'Time (ms)', label: 'FINISH TIME (MS)', formula: 'SPLIT_1 + SPLIT_2 + SPLIT_3 + SPLIT_4' },
      { stat_name_key: 'distance_meters', measurement_category: 'Distance (m)', label: 'DISTANCE (M)' },
      { stat_name_key: 'split_times_ms', measurement_category: 'Time (ms)', label: 'SPLIT TIME (MS)' },
      { stat_name_key: 'lap_count', measurement_category: 'Count', label: 'LAP COUNT' },
      { stat_name_key: 'stroke_rate', measurement_category: 'Cumulative Total', label: 'STROKE RATE', formula: 'TOTAL_STROKES / (TIME_MS / 60000)' },
    ],
    scoring_rules: { win_condition: 'LOWEST_TIME', lane_assignment: 'SEED_TIME' },
    positions: ['FREESTYLE', 'BACKSTROKE', 'BREASTSTROKE', 'BUTTERFLY', 'INDIVIDUAL MEDLEY', 'RELAY'],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    sport_id: 'sport_track_field_default',
    sport_name: 'TRACK & FIELD',
    short_identifier: 'TF',
    configurable_stats: [
      { stat_name_key: 'finish_time_ms', measurement_category: 'Time (ms)', label: 'FINISH TIME (MS)', formula: 'REACTION_TIME + SPRINT_TIME' },
      { stat_name_key: 'distance_meters', measurement_category: 'Distance (m)', label: 'DISTANCE (M)', formula: 'MAX(ATTEMPT_1, ATTEMPT_2, ATTEMPT_3)' },
      { stat_name_key: 'split_times_ms', measurement_category: 'Time (ms)', label: 'SPLIT TIME (MS)' },
      { stat_name_key: 'attempt_number', measurement_category: 'Count', label: 'ATTEMPT NUMBER' },
      { stat_name_key: 'pace_per_km', measurement_category: 'Time (ms)', label: 'PACE PER KM', formula: 'TIME_MS / (DISTANCE_METERS / 1000)' },
    ],
    scoring_rules: { win_condition: 'EVENT_SPECIFIC (TIME OR DISTANCE)' },
    positions: ['SPRINTER', 'MIDDLE DISTANCE', 'LONG DISTANCE', 'HURDLER', 'JUMPER', 'THROWER'],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

const MEASUREMENT_OPTIONS: MeasurementCategory[] = [
  'CUMULATIVE TOTAL',
  'PERCENTAGE',
  'TIME (MS)',
  'DISTANCE (M)',
  'COUNT',
];

const CATEGORY_UI_TO_BACKEND: Record<MeasurementCategory, 'Cumulative Total' | 'Percentage' | 'Time (ms)' | 'Distance (m)' | 'Count'> = {
  'CUMULATIVE TOTAL': 'Cumulative Total',
  'PERCENTAGE': 'Percentage',
  'TIME (MS)': 'Time (ms)',
  'DISTANCE (M)': 'Distance (m)',
  'COUNT': 'Count',
};

const CATEGORY_BACKEND_TO_UI: Record<string, MeasurementCategory> = {
  'cumulative total': 'CUMULATIVE TOTAL',
  'percentage': 'PERCENTAGE',
  'time (ms)': 'TIME (MS)',
  'distance (m)': 'DISTANCE (M)',
  'count': 'COUNT',
};

export const SportPage: React.FC = () => {
  const navigate = useNavigate();

  // Catalog State with Instant Cache initialization
  const [sports, setSports] = useState<SportConfiguration[]>(() => {
    const cached = getCachedData<SportConfiguration[]>('admin_sports_catalog');
    if (cached && cached.length > 0) return cached;
    return INITIAL_DEFAULT_SPORTS;
  });
  const [loading, setLoading] = useState(!getCachedData('admin_sports_catalog'));
  const [viewMode, setViewMode] = useState<'CATALOG' | 'BUILDER'>('CATALOG');

  // Builder Form State
  const [editingSportId, setEditingSportId] = useState<string | null>(null);
  const [sportName, setSportName] = useState('');
  const [shortId, setShortId] = useState('');
  const [positionsInput, setPositionsInput] = useState('');
  const [winCondition, setWinCondition] = useState('HIGHEST_SCORE');
  const [configurableStats, setConfigurableStats] = useState<DynamicStatRow[]>([
    { id: '1', stat_name_key: 'TOTAL_POINTS', measurement_category: 'CUMULATIVE TOTAL', formula: 'SUM(POINTS)' },
    { id: '2', stat_name_key: 'FIELD_GOAL_ACCURACY', measurement_category: 'PERCENTAGE', formula: '(FG_MADE / FG_ATTEMPTED) * 100' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Background catalog refresh that never flickers or reloads repeatedly
  const loadCatalog = async (forceRefresh = false) => {
    try {
      if (sports.length === 0) {
        setLoading(true);
      }
      const res = await getSports(false, forceRefresh);
      let serverSports = Array.isArray(res?.sports) ? res.sports : [];

      // Merge defaults if missing from server
      const mergedList = [...serverSports];
      for (const init of INITIAL_DEFAULT_SPORTS) {
        if (!mergedList.some((s) => (s.sport_name || '').trim().toLowerCase() === init.sport_name.trim().toLowerCase())) {
          mergedList.push(init);
        }
      }

      setSports(mergedList);
      setCachedData('admin_sports_catalog', mergedList);

      // Auto-sync any missing initial sports in background once
      const isSeeded = getCachedData<boolean>('sports_initial_auto_seeded');
      if (!isSeeded) {
        setCachedData('sports_initial_auto_seeded', true);
        const missingInitial = INITIAL_DEFAULT_SPORTS.filter(
          (init) =>
            !serverSports.some(
              (s) =>
                (s.sport_name || '').trim().toLowerCase() === init.sport_name.trim().toLowerCase() ||
                (s.short_identifier || '').trim().toUpperCase() === init.short_identifier.trim().toUpperCase()
            )
        );
        if (missingInitial.length > 0) {
          for (const missing of missingInitial) {
            createSport({
              sport_name: missing.sport_name,
              short_identifier: missing.short_identifier,
              configurable_stats: missing.configurable_stats,
              positions: missing.positions,
              scoring_rules: missing.scoring_rules,
            }).catch(() => {});
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load sports catalog:', err);
      if (sports.length === 0) {
        setSports(INITIAL_DEFAULT_SPORTS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
    // Only load if not cached or background refresh
    loadCatalog(false);
  }, [navigate]);

  // Open Builder for new sport
  const handleOpenAddSport = () => {
    setEditingSportId(null);
    setSportName('');
    setShortId('');
    setPositionsInput('');
    setWinCondition('HIGHEST_SCORE');
    setConfigurableStats([
      { id: crypto.randomUUID(), stat_name_key: 'TOTAL_POINTS', measurement_category: 'CUMULATIVE TOTAL', formula: 'SUM(POINTS)' },
      { id: crypto.randomUUID(), stat_name_key: 'FIELD_GOAL_ACCURACY', measurement_category: 'PERCENTAGE', formula: '(FG_MADE / FG_ATTEMPTED) * 100' },
    ]);
    setFeedback(null);
    setViewMode('BUILDER');
  };

  // Open Builder to edit existing sport
  const handleEditSport = (sport: SportConfiguration) => {
    setEditingSportId(sport.sport_id);
    setSportName(sport.sport_name.toUpperCase());
    setShortId(sport.short_identifier.toUpperCase());
    setPositionsInput(Array.isArray(sport.positions) ? sport.positions.join(', ') : '');
    setWinCondition(
      typeof sport.scoring_rules?.win_condition === 'string'
        ? (sport.scoring_rules.win_condition as string)
        : 'HIGHEST_SCORE'
    );

    if (sport.configurable_stats && sport.configurable_stats.length > 0) {
      setConfigurableStats(
        sport.configurable_stats.map((s) => ({
          id: crypto.randomUUID(),
          stat_name_key: s.stat_name_key.toUpperCase(),
          measurement_category:
            CATEGORY_BACKEND_TO_UI[(s.measurement_category || '').toLowerCase()] || 'CUMULATIVE TOTAL',
          formula: s.formula || '',
        }))
      );
    } else {
      setConfigurableStats([
        { id: crypto.randomUUID(), stat_name_key: 'TOTAL_POINTS', measurement_category: 'CUMULATIVE TOTAL', formula: '' },
      ]);
    }
    setFeedback(null);
    setViewMode('BUILDER');
  };

  // Dynamic Metric Row Handlers
  const handleAddStatRow = () => {
    setConfigurableStats((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        stat_name_key: '',
        measurement_category: 'CUMULATIVE TOTAL',
        formula: '',
      },
    ]);
  };

  const handleRemoveStatRow = (id: string) => {
    if (configurableStats.length <= 1) {
      alert('At least one configurable stat metric is required.');
      return;
    }
    setConfigurableStats((prev) => prev.filter((r) => r.id !== id));
  };

  const handleStatKeyChange = (id: string, value: string) => {
    setConfigurableStats((prev) =>
      prev.map((r) => (r.id === id ? { ...r, stat_name_key: value.toUpperCase().replace(/\s+/g, '_') } : r))
    );
  };

  const handleStatCategoryChange = (id: string, category: MeasurementCategory) => {
    setConfigurableStats((prev) =>
      prev.map((r) => (r.id === id ? { ...r, measurement_category: category } : r))
    );
  };

  const handleStatFormulaChange = (id: string, formula: string) => {
    setConfigurableStats((prev) =>
      prev.map((r) => (r.id === id ? { ...r, formula } : r))
    );
  };

  // Submit Handler: Saves to Backend and updates mobile/web schema
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedName = sportName.trim().toUpperCase();
    const trimmedShortId = shortId.trim().toUpperCase();

    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Sport name is required.' });
      return;
    }
    if (!trimmedShortId) {
      setFeedback({ type: 'error', message: 'Short identifier is required.' });
      return;
    }

    // Validate metrics & uniqueness
    const seenKeys = new Set<string>();
    for (let i = 0; i < configurableStats.length; i++) {
      const key = configurableStats[i].stat_name_key.trim().toLowerCase();
      if (!key) {
        setFeedback({ type: 'error', message: `Stat Name Key at row ${i + 1} cannot be empty.` });
        return;
      }
      if (seenKeys.has(key)) {
        setFeedback({
          type: 'error',
          message: `Duplicate metric key '${configurableStats[i].stat_name_key}' found. Each metric key must be unique within the sport.`,
        });
        return;
      }
      seenKeys.add(key);
    }

    try {
      setSubmitting(true);

      const formattedStats: BackendConfigurableStat[] = configurableStats.map((row) => {
        const cleanKey = row.stat_name_key.trim().toLowerCase().replace(/[-\s]+/g, '_');
        return {
          stat_name_key: cleanKey,
          measurement_category: CATEGORY_UI_TO_BACKEND[row.measurement_category] || 'Cumulative Total',
          label: row.stat_name_key.trim().toUpperCase(),
          formula: row.formula?.trim() || undefined,
        };
      });

      const stat_schema = configurableStats.reduce((acc, row) => {
        const cleanKey = row.stat_name_key.trim().toLowerCase().replace(/[-\s]+/g, '_');
        if (cleanKey) {
          acc[cleanKey] = {
            measurement_category: CATEGORY_UI_TO_BACKEND[row.measurement_category] || 'Cumulative Total',
            display_label: row.stat_name_key.trim().toUpperCase(),
            formula: row.formula?.trim() || undefined,
          };
        }
        return acc;
      }, {} as Record<string, any>);

      const positions = positionsInput
        .split(',')
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean);

      const payload = {
        sport_name: trimmedName,
        short_identifier: trimmedShortId,
        configurable_stats: formattedStats,
        stat_schema,
        positions,
        scoring_rules: {
          win_condition: winCondition,
        },
      };

      let savedSport: SportConfiguration;
      if (editingSportId) {
        const res = await updateSport(editingSportId, payload);
        savedSport = res?.sport || {
          sport_id: editingSportId,
          ...payload,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setFeedback({ type: 'success', message: `Sport "${trimmedName}" updated with dynamic formulas.` });
      } else {
        const res = await createSport(payload);
        savedSport = res?.sport || {
          sport_id: `sport_${Date.now()}`,
          ...payload,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setFeedback({ type: 'success', message: `Sport "${trimmedName}" created and published to Atleta ecosystem.` });
      }

      // Optimistically update sports list and cache with ZERO reload delay
      setSports((prev) => {
        const exists = prev.some(
          (s) =>
            s.sport_id === savedSport.sport_id ||
            (s.sport_name || '').toUpperCase() === (savedSport.sport_name || '').toUpperCase()
        );
        const updated = exists
          ? prev.map((s) =>
              s.sport_id === savedSport.sport_id ||
              (s.sport_name || '').toUpperCase() === (savedSport.sport_name || '').toUpperCase()
                ? { ...s, ...savedSport }
                : s
            )
          : [...prev, savedSport];
        setCachedData('admin_sports_catalog', updated);
        return updated;
      });

      setTimeout(() => {
        setViewMode('CATALOG');
        setFeedback(null);
      }, 1000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save sport configuration.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.shell}>
      <Navbar title="SYSTEM DASHBOARD" />

      <div style={styles.layout}>
        <Sidebar activeTab="SPORT_MANAGER" />

        <main style={styles.main}>
          {/* View Mode 1: Catalog of All Available Sports */}
          {viewMode === 'CATALOG' ? (
            <div>
              {/* Header */}
              <div style={styles.titleRow}>
                <div>
                  <h1 style={styles.pageTitle}>SPORT CONFIGURATION</h1>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                    CORE DISCIPLINES & DYNAMIC STAT SCHEMAS
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddSport}
                  style={styles.primaryActionBtn}
                >
                  <PlusCircle style={{ width: 16, height: 16 }} />
                  <span>ADD SPORT</span>
                </button>
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '2px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: feedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                    color: feedback.type === 'success' ? '#166534' : '#991B1B',
                  }}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 style={{ width: 18, height: 18 }} />
                  ) : (
                    <AlertCircle style={{ width: 18, height: 18 }} />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Table of Available Sports */}
              <div style={styles.catalogTableBox}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>SPORT NAME</th>
                      <th style={styles.th}>SHORT ID</th>
                      <th style={styles.th}>CONFIGURED STAT METRICS & FORMULAS</th>
                      <th style={{ ...styles.th, textAlign: 'center', borderRight: 'none' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && sports.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '40px', textAlign: 'center' }}>
                          <Loader2
                            style={{
                              width: 24,
                              height: 24,
                              animation: 'spin 1s linear infinite',
                              margin: '0 auto',
                              color: '#0B132B',
                            }}
                          />
                        </td>
                      </tr>
                    ) : (
                      sports.map((sport) => {
                        const hasStats = sport.configurable_stats && sport.configurable_stats.length > 0;
                        return (
                          <tr key={sport.sport_id || sport.short_identifier}>
                            <td style={{ ...styles.td, fontWeight: 900, textTransform: 'uppercase' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{sport.sport_name}</span>
                                {['BASKETBALL', 'SWIMMING', 'TRACK & FIELD'].includes(sport.sport_name.toUpperCase()) && (
                                  <span
                                    style={{
                                      fontSize: '9px',
                                      fontWeight: 800,
                                      padding: '2px 6px',
                                      backgroundColor: '#F1F5F9',
                                      color: '#475569',
                                      borderRadius: '2px',
                                      letterSpacing: '0.04em',
                                    }}
                                  >
                                    CORE
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 800 }}>
                              {sport.short_identifier}
                            </td>
                            <td style={styles.td}>
                              {hasStats ? (
                                <div>
                                  {sport.configurable_stats.slice(0, 4).map((st, i) => (
                                    <span key={i} style={styles.statTag} title={st.formula ? `Formula: ${st.formula}` : undefined}>
                                      {st.stat_name_key.toUpperCase()}
                                    </span>
                                  ))}
                                  {sport.configurable_stats.length > 4 && (
                                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>
                                      +{sport.configurable_stats.length - 4} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#94A3B8', fontSize: '12px' }}>Standard Rules</span>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center', borderRight: 'none' }}>
                              <button
                                type="button"
                                onClick={() => handleEditSport(sport)}
                                style={styles.actionBtnOutline}
                              >
                                EDIT SCHEMA
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* View Mode 2: 1-to-1 Wireframe Dynamic Stat & Formula Builder */
            <div>
              {/* Back to Catalog Breadcrumb */}
              <div style={styles.topNavRow}>
                <button
                  type="button"
                  onClick={() => setViewMode('CATALOG')}
                  style={styles.breadcrumbBtn}
                >
                  <ArrowLeft style={{ width: 14, height: 14 }} />
                  <span>BACK TO ALL SPORTS</span>
                </button>
              </div>

              {/* Huge Bold Title */}
              <div style={styles.titleRow}>
                <div>
                  <h1 style={styles.pageTitle}>SPORT CONFIGURATION</h1>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                    DEFINE SPORT DISCIPLINE, DYNAMIC METRICS & CALCULATION FORMULAS
                  </p>
                </div>
              </div>

              {/* Feedback Banner */}
              {feedback && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '2px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: feedback.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                    color: feedback.type === 'success' ? '#166534' : '#991B1B',
                  }}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 style={{ width: 18, height: 18 }} />
                  ) : (
                    <AlertCircle style={{ width: 18, height: 18 }} />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Two-Column Responsive Workspace Grid */}
              <form onSubmit={handleSubmit}>
                <div style={styles.workspaceGrid}>
                  {/* Left Column: ADD NEW SPORT PANEL */}
                  <div style={styles.leftPanelCard}>
                    <div style={styles.leftPanelHeader}>
                      <PlusCircle style={{ width: 18, height: 18, color: '#0B132B' }} />
                      <span>{editingSportId ? 'EDIT SPORT' : 'ADD NEW SPORT'}</span>
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>SPORT NAME INPUT BOX</label>
                      <input
                        type="text"
                        value={sportName}
                        onChange={(e) => setSportName(e.target.value)}
                        placeholder="E.G. BASKETBALL"
                        style={styles.textInput}
                        required
                      />
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>SHORT IDENTIFIER</label>
                      <input
                        type="text"
                        value={shortId}
                        onChange={(e) => setShortId(e.target.value)}
                        placeholder="BKT_01"
                        maxLength={20}
                        style={styles.textInput}
                        required
                      />
                    </div>

                    <div style={styles.fieldGroup}>
                      <label style={styles.fieldLabel}>POSITIONS (OPTIONAL, COMMA-SEPARATED)</label>
                      <input
                        type="text"
                        value={positionsInput}
                        onChange={(e) => setPositionsInput(e.target.value)}
                        placeholder="E.G. FORWARD, GUARD, CENTER"
                        style={{ ...styles.textInput, fontSize: '11px' }}
                      />
                    </div>

                    <div style={{ ...styles.fieldGroup, marginBottom: 0 }}>
                      <label style={styles.fieldLabel}>WIN CONDITION (SCORING LOGIC)</label>
                      <div style={styles.selectWrapper}>
                        <select
                          value={winCondition}
                          onChange={(e) => setWinCondition(e.target.value)}
                          style={{ ...styles.selectDropdown, fontSize: '11px' }}
                        >
                          <option value="HIGHEST_SCORE">HIGHEST SCORE WINS (E.G. BALL GAMES)</option>
                          <option value="LOWEST_TIME">LOWEST TIME WINS (E.G. RACING, SWIMMING)</option>
                          <option value="EVENT_SPECIFIC">EVENT-SPECIFIC (E.G. TRACK & FIELD)</option>
                        </select>
                        <ChevronDown style={{ ...styles.selectChevron, width: 16, height: 16 }} />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: ADD STATS UTILITY (Dynamic Builder Panel) */}
                  <div style={styles.rightPanelCard}>
                    {/* Top Header Bar */}
                    <div style={styles.rightPanelHeader}>
                      <div style={styles.rightPanelHeaderTitle}>
                        <BarChart3 style={{ width: 18, height: 18, color: '#0B132B' }} />
                        <span>ADD STATS UTILITY & FORMULAS</span>
                      </div>
                    </div>

                    {/* Dynamic Metric Key Cards List */}
                    <div style={styles.metricCardsList}>
                      {configurableStats.map((stat, idx) => (
                        <div key={stat.id || idx} style={styles.metricRowBox}>
                          {configurableStats.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStatRow(stat.id)}
                              style={styles.removeStatBtn}
                              title="Delete Metric"
                            >
                              <Trash2 style={{ width: 16, height: 16, color: '#DC2626' }} />
                            </button>
                          )}

                          <div style={styles.metricFormRow}>
                            {/* Left Field: STAT NAME KEY */}
                            <div>
                              <label style={styles.fieldLabel}>STAT NAME KEY (TEXT)</label>
                              <input
                                type="text"
                                value={stat.stat_name_key}
                                onChange={(e) => handleStatKeyChange(stat.id, e.target.value)}
                                placeholder="TOTAL_POINTS"
                                style={styles.textInput}
                                required
                              />
                            </div>

                            {/* Right Field: MEASUREMENT CATEGORY */}
                            <div>
                              <label style={styles.fieldLabel}>MEASUREMENT CATEGORY</label>
                              <div style={styles.selectWrapper}>
                                <select
                                  value={stat.measurement_category}
                                  onChange={(e) =>
                                    handleStatCategoryChange(stat.id, e.target.value as MeasurementCategory)
                                  }
                                  style={styles.selectDropdown}
                                >
                                  {MEASUREMENT_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown style={{ ...styles.selectChevron, width: 16, height: 16 }} />
                              </div>
                            </div>
                          </div>

                          {/* Formula / Calculation Field */}
                          <div style={{ marginTop: '16px', borderTop: '1px dashed #E2E8F0', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                              <Calculator style={{ width: 13, height: 13, color: '#64748B' }} />
                              <label style={{ ...styles.fieldLabel, margin: 0 }}>
                                CALCULATION FORMULA / STAT RULE (OPTIONAL)
                              </label>
                            </div>
                            <input
                              type="text"
                              value={stat.formula || ''}
                              onChange={(e) => handleStatFormulaChange(stat.id, e.target.value)}
                              placeholder="E.G. (FG_MADE / FG_ATTEMPTED) * 100 OR SPLIT_1 + SPLIT_2"
                              style={{
                                ...styles.textInput,
                                fontSize: '12px',
                                padding: '10px 12px',
                                backgroundColor: '#F8FAFC',
                              }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Add Another Stat Metric Card Button */}
                      <button
                        type="button"
                        onClick={handleAddStatRow}
                        style={styles.addMetricDashedBtn}
                      >
                        <div style={styles.plusSquareIcon}>
                          <Plus style={{ width: 16, height: 16 }} />
                        </div>
                        <span style={styles.addMetricText}>[+] ADD ANOTHER STAT METRIC</span>
                      </button>
                    </div>

                    {/* Panel Footer & Submission Actions */}
                    <div style={styles.panelFooter}>
                      <p style={styles.footerNoticeText}>
                        Ensure all metric keys are unique before finalizing sport. Dynamic formulas automatically distribute across mobile and web live logging.
                      </p>
                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          ...styles.submitBtn,
                          opacity: submitting ? 0.7 : 1,
                        }}
                      >
                        {submitting ? (
                          <>
                            <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                            <span>SAVING SPORT CONFIGURATION...</span>
                          </>
                        ) : (
                          <>
                            <span>FINISH EDITING & SAVE SPORT</span>
                            <Save style={{ width: 16, height: 16 }} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SportPage;

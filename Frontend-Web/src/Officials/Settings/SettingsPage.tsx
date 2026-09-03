import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ExternalLink,
  Shield,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getMe,
  getOfficialSettings,
  updateOfficialSettings,
  createOfficialMatch,
} from '../../api/client';
import type { AuthUser, OfficialSettings } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/SettingsPage';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(
    () => getCachedData<AuthUser>('user_me') || getStoredUser()
  );
  const [settings, setSettings] = useState<OfficialSettings>(
    () =>
      getCachedData<OfficialSettings>('official_settings') || {
        split_screen_defaults: true,
        discrepancy_presets: false,
        match_reminders: false,
      }
  );

  // Create match modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [sportType, setSportType] = useState('BASKETBALL');
  const [homeTeam, setHomeTeam] = useState('');
  const [opponentTeam, setOpponentTeam] = useState('');
  const [matchDate, setMatchDate] = useState('');

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }

    Promise.all([
      getMe().then((res) => setUser(res)).catch(() => {}),
      getOfficialSettings().then((res) => {
        if (res) setSettings(res);
      }).catch(() => {}),
    ]);
  }, [navigate]);

  const toggleSetting = async (key: keyof OfficialSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(updated);
    try {
      await updateOfficialSettings({ [key]: updated[key] });
    } catch {
      setSettings(settings);
    }
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateErr(null);
    if (!homeTeam || !opponentTeam || !matchDate) {
      setCreateErr('Please fill in all required match fields.');
      return;
    }

    try {
      setCreating(true);
      await createOfficialMatch({
        sport_type: sportType,
        home_team_name: homeTeam,
        opponent_team_name: opponentTeam,
        match_date: new Date(matchDate).toISOString(),
      });
      setIsCreateModalOpen(false);
      setHomeTeam('');
      setOpponentTeam('');
      setMatchDate('');
    } catch (err: any) {
      setCreateErr(err.message || 'Failed to create match.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={styles.shell}>
      {/* Shared Navbar */}
      <Navbar user={user} />

      {/* Main Body */}
      <div style={styles.layoutBody}>
        {/* Shared Sidebar */}
        <Sidebar
          activeTab="SETTINGS"
          onCreateMatch={() => setIsCreateModalOpen(true)}
        />

        {/* Settings Content Area */}
        <main style={styles.contentArea}>
          <div style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>TOURNAMENT OFFICIAL SETTINGS</h1>
            <p style={styles.pageSubtitle}>Configure your dashboard and security verification protocols.</p>
          </div>

          {/* Section 1: OFFICIAL IDENTITY & CREDENTIALS */}
          <div style={styles.sectionWrap}>
            <div style={styles.sectionBanner}>OFFICIAL IDENTITY & CREDENTIALS</div>
            <div style={styles.sectionBox}>
              <div style={styles.itemRow}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>AUDIT PROFILE DETAILS</h3>
                  <p style={styles.itemDesc}>Update your certification records and official public profile.</p>
                </div>
                <ChevronRight style={{ width: 18, height: 18, color: '#0B132B' }} />
              </div>

              <div style={{ ...styles.itemRow, ...styles.itemRowNoBorder }}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>ORGANIZATIONAL AFFILIATION</h3>
                  <p style={styles.itemDesc}>Manage links to sanctioned tournament bodies and federations.</p>
                </div>
                <ChevronRight style={{ width: 18, height: 18, color: '#0B132B' }} />
              </div>
            </div>
          </div>

          {/* Section 2: AUDIT & VERIFICATION PREFERENCES */}
          <div style={styles.sectionWrap}>
            <div style={styles.sectionBanner}>AUDIT & VERIFICATION PREFERENCES</div>
            <div style={styles.sectionBox}>
              <div style={styles.itemRow}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>SPLIT-SCREEN LAYOUT DEFAULTS</h3>
                  <p style={styles.itemDesc}>Enable multi-view data grids for real-time match verification.</p>
                </div>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Toggle split screen layout defaults"
                  onClick={() => toggleSetting('split_screen_defaults')}
                  style={{
                    ...styles.switchTrack,
                    ...(settings.split_screen_defaults ? styles.switchTrackActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.switchThumb,
                      ...(settings.split_screen_defaults ? styles.switchThumbActive : {}),
                    }}
                  />
                </button>
              </div>

              <div style={{ ...styles.itemRow, ...styles.itemRowNoBorder }}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>DISCREPANCY PRESETS</h3>
                  <p style={styles.itemDesc}>Set automated flags for data outliers in official scoresheets.</p>
                </div>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Toggle discrepancy presets"
                  onClick={() => toggleSetting('discrepancy_presets')}
                  style={{
                    ...styles.switchTrack,
                    ...(settings.discrepancy_presets ? styles.switchTrackActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.switchThumb,
                      ...(settings.discrepancy_presets ? styles.switchThumbActive : {}),
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: NOTIFICATION CONTROLS */}
          <div style={styles.sectionWrap}>
            <div style={styles.sectionBanner}>NOTIFICATION CONTROLS</div>
            <div style={styles.sectionBox}>
              <div style={{ ...styles.itemRow, ...styles.itemRowNoBorder }}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>MATCH REMINDER</h3>
                  <p style={styles.itemDesc}>Reminds when a match is close.</p>
                </div>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Toggle match reminders"
                  onClick={() => toggleSetting('match_reminders')}
                  style={{
                    ...styles.switchTrack,
                    ...(settings.match_reminders ? styles.switchTrackActive : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.switchThumb,
                      ...(settings.match_reminders ? styles.switchThumbActive : {}),
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: SECURITY & COMPLIANCE */}
          <div style={styles.sectionWrap}>
            <div style={styles.sectionBanner}>SECURITY & COMPLIANCE</div>
            <div style={styles.sectionBox}>
              <a
                href="https://privacy.gov.ph/data-privacy-act/"
                target="_blank"
                rel="noreferrer"
                style={styles.itemRow}
              >
                <div style={styles.itemLeft}>
                  <FileText style={{ width: 18, height: 18, color: '#0B132B' }} />
                  <div style={styles.itemTextWrap}>
                    <h3 style={styles.itemTitle}>DATA PRIVACY ACT (RA 10173) COMPLIANCE</h3>
                    <p style={styles.itemDesc}>Review legal obligations regarding athlete data handling.</p>
                  </div>
                </div>
                <ExternalLink style={{ width: 16, height: 16, color: '#0B132B' }} />
              </a>

              <a
                href="#verification-protocols"
                onClick={(e) => e.preventDefault()}
                style={{ ...styles.itemRow, ...styles.itemRowNoBorder }}
              >
                <div style={styles.itemLeft}>
                  <Shield style={{ width: 18, height: 18, color: '#0B132B' }} />
                  <div style={styles.itemTextWrap}>
                    <h3 style={styles.itemTitle}>TOURNAMENT MATCH VERIFICATION PROTOCOLS</h3>
                    <p style={styles.itemDesc}>Standard Operating Procedures for official verification.</p>
                  </div>
                </div>
                <ExternalLink style={{ width: 16, height: 16, color: '#0B132B' }} />
              </a>
            </div>
          </div>
        </main>
      </div>

      {/* Create Match Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 19, 43, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #0B132B', width: '92%', maxWidth: '500px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0B132B', margin: 0 }}>CREATE MATCH</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {createErr && (
              <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', color: '#B91C1C', fontSize: '12px', marginBottom: '14px' }}>
                {createErr}
              </div>
            )}

            <form onSubmit={handleCreateMatch}>
              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>SPORT</label>
                <select
                  value={sportType}
                  onChange={(e) => setSportType(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                >
                  <option value="BASKETBALL">Basketball</option>
                  <option value="VOLLEYBALL">Volleyball</option>
                  <option value="FOOTBALL">Football</option>
                </select>
              </div>

              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>HOME TEAM</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADNU Knights"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>OPPONENT TEAM</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADMU Eagles"
                  value={opponentTeam}
                  onChange={(e) => setOpponentTeam(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: '#0B132B', textTransform: 'uppercase' }}>MATCH DATE & TIME</label>
                <input
                  type="datetime-local"
                  required
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '4px', padding: '10px 12px', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '10px 16px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontWeight: 700, borderRadius: '4px', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: '10px 18px', border: 'none', backgroundColor: '#0B132B', color: '#FFFFFF', fontWeight: 800, borderRadius: '4px', cursor: 'pointer' }}
                >
                  {creating ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : 'SAVE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

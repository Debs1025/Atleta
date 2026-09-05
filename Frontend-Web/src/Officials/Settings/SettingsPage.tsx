import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ExternalLink,
  Shield,
  FileText,
} from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  getStoredOfficialSettings,
  getMe,
  getOfficialSettings,
  updateOfficialSettings,
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
      getCachedData<OfficialSettings>('official_settings') ||
      getStoredOfficialSettings() || {
        split_screen_defaults: true,
        discrepancy_presets: false,
        match_reminders: false,
      }
  );

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

  return (
    <div style={styles.shell}>
      {/* Shared Navbar */}
      <Navbar user={user} />

      {/* Main Body */}
      <div style={styles.layoutBody}>
        {/* Shared Sidebar */}
        <Sidebar activeTab="SETTINGS" />

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
    </div>
  );
};

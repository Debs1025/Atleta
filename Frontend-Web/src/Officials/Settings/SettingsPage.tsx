import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ExternalLink,
  Shield,
  FileText,
  Bell,
  Sliders,
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
        match_reminders: true,
        audit_notifications: true,
        auto_refresh: false,
      }
  );

  const [savingKey, setSavingKey] = useState<string | null>(null);

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
    setSavingKey(String(key));

    try {
      await updateOfficialSettings({ [key]: updated[key] });
    } catch {
      // Revert if request failed
      setSettings(settings);
    } finally {
      setTimeout(() => setSavingKey(null), 400);
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
            <h1 style={styles.pageTitle}>OFFICIAL SETTINGS</h1>
            <p style={styles.pageSubtitle}>
              Manage your notification reminders, match audit alerts, and compliance standards.
            </p>
          </div>

          {/* Section 1: NOTIFICATIONS & REMINDERS */}
          <div style={styles.sectionWrap}>
            <div style={styles.sectionBanner}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Bell style={{ width: 12, height: 12 }} /> NOTIFICATIONS & REMINDERS
              </span>
            </div>
            <div style={styles.sectionBox}>
              <div style={styles.itemRow}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>GAME SCHEDULE REMINDERS</h3>
                  <p style={styles.itemDesc}>
                    Receive automatic reminder alerts 1 to 3 days before scheduled matches.
                  </p>
                </div>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Toggle game schedule reminders"
                  onClick={() => toggleSetting('match_reminders')}
                  className="hover-switch"
                  style={{
                    ...styles.switchTrack,
                    ...(settings.match_reminders ? styles.switchTrackActive : {}),
                    ...(savingKey === 'match_reminders' ? { opacity: 0.7 } : {}),
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

              <div style={{ ...styles.itemRow, ...styles.itemRowNoBorder }}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>MATCH AUDIT NOTIFICATIONS</h3>
                  <p style={styles.itemDesc}>
                    Get notified immediately when coaches submit new scoresheets for certification.
                  </p>
                </div>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Toggle match audit notifications"
                  onClick={() => toggleSetting('audit_notifications')}
                  className="hover-switch"
                  style={{
                    ...styles.switchTrack,
                    ...(settings.audit_notifications !== false ? styles.switchTrackActive : {}),
                    ...(savingKey === 'audit_notifications' ? { opacity: 0.7 } : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.switchThumb,
                      ...(settings.audit_notifications !== false ? styles.switchThumbActive : {}),
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: MATCH VIEW & AUDIT PREFERENCES */}
          <div style={styles.sectionWrap}>
            <div style={styles.sectionBanner}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Sliders style={{ width: 12, height: 12 }} /> MATCH AUDIT & DISPLAY
              </span>
            </div>
            <div style={styles.sectionBox}>
              <div style={styles.itemRow}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>SCORE DISCREPANCY HIGHLIGHTS</h3>
                  <p style={styles.itemDesc}>
                    Highlight statistical anomalies and boxscore mismatches automatically.
                  </p>
                </div>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Toggle discrepancy presets"
                  onClick={() => toggleSetting('discrepancy_presets')}
                  className="hover-switch"
                  style={{
                    ...styles.switchTrack,
                    ...(settings.discrepancy_presets ? styles.switchTrackActive : {}),
                    ...(savingKey === 'discrepancy_presets' ? { opacity: 0.7 } : {}),
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

              <div style={{ ...styles.itemRow, ...styles.itemRowNoBorder }}>
                <div style={styles.itemTextWrap}>
                  <h3 style={styles.itemTitle}>AUTO-REFRESH MATCH QUEUE</h3>
                  <p style={styles.itemDesc}>
                    Automatically check for updated match statuses and certifications in the background.
                  </p>
                </div>
                <button
                  type="button"
                  tabIndex={0}
                  aria-label="Toggle auto refresh"
                  onClick={() => toggleSetting('auto_refresh')}
                  className="hover-switch"
                  style={{
                    ...styles.switchTrack,
                    ...(settings.auto_refresh ? styles.switchTrackActive : {}),
                    ...(savingKey === 'auto_refresh' ? { opacity: 0.7 } : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.switchThumb,
                      ...(settings.auto_refresh ? styles.switchThumbActive : {}),
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: SECURITY & COMPLIANCE */}
          <div style={styles.sectionWrap}>
            <div style={styles.sectionBanner}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Shield style={{ width: 12, height: 12 }} /> SECURITY & COMPLIANCE
              </span>
            </div>
            <div style={styles.sectionBox}>
              <a
                href="https://privacy.gov.ph/data-privacy-act/"
                target="_blank"
                rel="noreferrer"
                className="hover-settings-row"
                style={styles.itemRow}
              >
                <div style={styles.itemLeft}>
                  <FileText style={{ width: 18, height: 18, color: '#0B132B' }} />
                  <div style={styles.itemTextWrap}>
                    <h3 style={styles.itemTitle}>DATA PRIVACY ACT (RA 10173) COMPLIANCE</h3>
                    <p style={styles.itemDesc}>Review guidelines on handling student-athlete performance data.</p>
                  </div>
                </div>
                <ExternalLink style={{ width: 16, height: 16, color: '#0B132B' }} />
              </a>

              <div
                className="hover-settings-row"
                style={{ ...styles.itemRow, ...styles.itemRowNoBorder }}
                onClick={() => navigate('/profile')}
              >
                <div style={styles.itemLeft}>
                  <Shield style={{ width: 18, height: 18, color: '#0B132B' }} />
                  <div style={styles.itemTextWrap}>
                    <h3 style={styles.itemTitle}>ACCOUNT PASSWORD & SECURITY</h3>
                    <p style={styles.itemDesc}>Manage login password and secure authentication credentials.</p>
                  </div>
                </div>
                <ChevronRight style={{ width: 18, height: 18, color: '#0B132B' }} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;

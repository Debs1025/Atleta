import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, UserCheck, Bell, Sliders, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { getStoredToken, getStoredUser, updateOfficialSettings, getMe } from '../api/client';
import type { AuthUser } from '../api/types';

export const OfficialSettings: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());
  const [splitScreen, setSplitScreen] = useState(true);
  const [discrepancyPresets, setDiscrepancyPresets] = useState(true);
  const [matchReminders, setMatchReminders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      navigate('/login');
      return;
    }
    // Refresh user profile if possible
    getMe()
      .then((profile) => setUser(profile))
      .catch(() => {
        // Keep cached user if offline or error
      });
  }, [navigate]);

  const handleSaveSettings = async () => {
    setFeedback(null);
    try {
      setSaving(true);
      await updateOfficialSettings({
        split_screen_defaults: splitScreen,
        discrepancy_presets: discrepancyPresets,
        match_reminders: matchReminders,
      });
      setFeedback({ type: 'success', message: 'Settings saved successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-[#0B132B]">
          TOURNAMENT OFFICIAL SETTINGS
        </h1>
        <p className="text-xs uppercase tracking-wider text-slate-500 mt-1">
          Manage system preferences, compliance standards, and validation parameters
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-md text-xs flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Official Identity & Credentials */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-4">
            <UserCheck className="w-5 h-5 text-[#0B132B]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B132B]">
              OFFICIAL IDENTITY & CREDENTIALS
            </h2>
          </div>
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 uppercase font-semibold block text-[10px] tracking-wider">
                Full Name
              </span>
              <span className="font-bold text-slate-800 text-sm">
                {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Official User'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block text-[10px] tracking-wider">
                Official Email
              </span>
              <span className="font-medium text-slate-700">{user?.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block text-[10px] tracking-wider">
                Role / Clearance
              </span>
              <span className="inline-block bg-slate-100 text-[#0B132B] font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider mt-1">
                {user?.role || 'Tournament Official'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase font-semibold block text-[10px] tracking-wider">
                Organizational Affiliation
              </span>
              <span className="font-medium text-slate-700">
                {user?.organization || 'Bicol Region Athletic Association (BRAA)'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Audit & Verification Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-4">
            <Sliders className="w-5 h-5 text-[#0B132B]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B132B]">
              AUDIT & VERIFICATION PREFERENCES
            </h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Split-Screen Layout Defaults
                </p>
                <p className="text-[11px] text-slate-500">Enable multi-view data grids for match audits</p>
              </div>
              <input
                type="checkbox"
                checked={splitScreen}
                onChange={(e) => setSplitScreen(e.target.checked)}
                className="w-4 h-4 text-[#0B132B] rounded border-slate-300 accent-[#0B132B] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Discrepancy Presets
                </p>
                <p className="text-[11px] text-slate-500">Automated flags for data outliers and score mismatches</p>
              </div>
              <input
                type="checkbox"
                checked={discrepancyPresets}
                onChange={(e) => setDiscrepancyPresets(e.target.checked)}
                className="w-4 h-4 text-[#0B132B] rounded border-slate-300 accent-[#0B132B] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Notification Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-4">
            <Bell className="w-5 h-5 text-[#0B132B]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B132B]">
              NOTIFICATION CONTROLS
            </h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Match Reminder
                </p>
                <p className="text-[11px] text-slate-500">
                  Receive alerts for upcoming fixture validation queues
                </p>
              </div>
              <input
                type="checkbox"
                checked={matchReminders}
                onChange={(e) => setMatchReminders(e.target.checked)}
                className="w-4 h-4 text-[#0B132B] rounded border-slate-300 accent-[#0B132B] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Security & Compliance */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 mb-4">
            <Shield className="w-5 h-5 text-[#0B132B]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B132B]">
              SECURITY & COMPLIANCE
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            <a
              href="#privacy-act"
              className="flex items-center justify-between p-2.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition"
            >
              <span>Data Privacy Act (RA 10173) Compliance</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <a
              href="#verification-protocols"
              className="flex items-center justify-between p-2.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition"
            >
              <span>Tournament Match Verification Protocols</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-[#0B132B] hover:bg-[#1E293B] text-white px-8 py-3 rounded-md font-bold uppercase tracking-widest text-xs flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-70 shadow-sm"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>SAVING PREFERENCES...</span>
            </>
          ) : (
            <span>SAVE SETTINGS</span>
          )}
        </button>
      </div>
    </div>
  );
};

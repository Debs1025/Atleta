import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Loader2, X, Camera, Trash2 } from 'lucide-react';
import {
  getStoredToken,
  getStoredUser,
  getCachedData,
  setCachedData,
  getMe,
  getOfficialProfileData,
  getOfficialDashboard,
  createOfficialMatch,
} from '../../api/client';
import type { AuthUser, OfficialDashboardResponse } from '../../api/types';
import { Navbar } from '../Components/Navbar';
import { Sidebar } from '../Components/Sidebar';
import { styles } from './styles/ProfilePage';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<AuthUser | null>(
    () => getCachedData<AuthUser>('user_me') || getStoredUser()
  );
  const [profile, setProfile] = useState<any>(
    () => getCachedData<any>('official_profile') || getStoredUser()
  );
  const [dashboard, setDashboard] = useState<OfficialDashboardResponse | null>(
    () => getCachedData<OfficialDashboardResponse>('official_dashboard')
  );

  // Edit profile modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);

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
      getMe().then((res) => {
        if (res) setUser(res);
      }).catch(() => {}),
      getOfficialProfileData().then((res) => {
        if (res) setProfile(res);
      }).catch(() => {}),
      getOfficialDashboard().then((res) => {
        if (res) setDashboard(res);
      }).catch(() => {}),
    ]);
  }, [navigate]);

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

  const handleOpenEditModal = () => {
    setEditName(
      profile?.full_legal_name ||
      user?.full_legal_name ||
      user?.full_name ||
      (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '')
    );
    setEditOrg(profile?.organization_name || user?.organization_name || user?.organization || '');
    setEditPhone(profile?.phone_number || user?.phone_number || '');
    setEditAvatar(profile?.avatar_url || user?.avatar_url || (user as any)?.profile_image || null);
    setIsEditModalOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditModalOpen(false);
    const updatedUser: AuthUser = {
      ...(user || { uid: profile?.official_id || 'OFFICIAL', email: email, role: 'Official' }),
      full_legal_name: editName.trim() || undefined,
      full_name: editName.trim() || undefined,
      phone_number: editPhone.trim() || undefined,
      organization_name: editOrg.trim() || undefined,
      organization: editOrg.trim() || undefined,
      avatar_url: editAvatar || undefined,
      profile_image: editAvatar || undefined,
    };

    setUser(updatedUser);
    setProfile((prev: any) => ({
      ...prev,
      full_legal_name: editName.trim() || undefined,
      full_name: editName.trim() || undefined,
      phone_number: editPhone.trim() || undefined,
      organization_name: editOrg.trim() || undefined,
      organization: editOrg.trim() || undefined,
      avatar_url: editAvatar || undefined,
      profile_image: editAvatar || undefined,
    }));

    setCachedData('user_me', updatedUser);
    setCachedData('official_profile', {
      ...(profile || {}),
      full_legal_name: editName.trim() || undefined,
      full_name: editName.trim() || undefined,
      phone_number: editPhone.trim() || undefined,
      organization_name: editOrg.trim() || undefined,
      organization: editOrg.trim() || undefined,
      avatar_url: editAvatar || undefined,
      profile_image: editAvatar || undefined,
    });

    try {
      const isLocal = !!localStorage.getItem('atleta_official_user');
      if (isLocal) {
        localStorage.setItem('atleta_official_user', JSON.stringify(updatedUser));
      } else {
        sessionStorage.setItem('atleta_official_user', JSON.stringify(updatedUser));
      }
    } catch {}
  };

  const displayName =
    profile?.full_legal_name ||
    user?.full_legal_name ||
    user?.full_name ||
    (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : null) ||
    (user?.email ? user.email.split('@')[0].toUpperCase() : '') ||
    'OFFICIAL';

  const orgAffiliation =
    profile?.organization_name ||
    user?.organization_name ||
    user?.organization ||
    '—';

  const officialId =
    profile?.official_id ||
    (user?.uid ? `UUID-${user.uid}` : '') ||
    '—';

  const auditsCount = dashboard?.audited_count ?? (dashboard?.total_matches ?? 0);

  const formattedActivityDate = profile?.last_activity
    ? new Date(profile.last_activity).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  const email = profile?.email || user?.email || '—';
  const phone = profile?.phone_number || user?.phone_number || '—';
  const avatarUrl = profile?.avatar_url || user?.avatar_url || (user as any)?.profile_image || null;

  return (
    <div style={styles.shell}>
      {/* Shared Navbar */}
      <Navbar user={user} />

      {/* Main Body */}
      <div style={styles.layoutBody}>
        {/* Shared Sidebar */}
        <Sidebar
          activeTab="DASHBOARD"
          onCreateMatch={() => setIsCreateModalOpen(true)}
        />

        {/* Profile Content Area */}
        <main style={styles.contentArea}>
          <div style={styles.profileCardWrapper}>
            {/* Top Section */}
            <div style={styles.topSection}>
              <div style={styles.topLeftGroup}>
                <div style={styles.avatarBox}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User style={{ width: 48, height: 48, strokeWidth: 1.5, color: '#0B132B' }} />
                  )}
                </div>

                <div style={styles.nameDetailsCol}>
                  <h1 style={styles.officialName}>{displayName}</h1>
                  <p style={styles.officialSubtitle}>Registered Tournament Official</p>

                  <div style={styles.affiliationTagBox}>
                    <span style={styles.affiliationLabel}>REGIONAL AFFILIATION</span>
                    <span style={styles.affiliationValue}>{orgAffiliation}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenEditModal}
                style={styles.editProfileBtn}
              >
                EDIT PROFILE
              </button>
            </div>

            <div style={styles.dividerLine} />

            {/* Section 1: OFFICIAL IDENTIFIER */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionBannerDark}>OFFICIAL IDENTIFIER</div>
              <div style={styles.identifierBox}>{officialId}</div>
            </div>

            {/* Section 2: ACCOUNT SUMMARY */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionBannerDark}>ACCOUNT SUMMARY</div>
              <div style={styles.summaryBox}>
                <div style={{ ...styles.summaryRow, ...styles.summaryRowBorder }}>
                  <span style={styles.rowLabel}>TOTAL AUDITS HANDLED</span>
                  <span style={styles.rowValue}>{auditsCount} Matches</span>
                </div>

                <div style={{ ...styles.summaryRow, ...styles.summaryRowBorder }}>
                  <span style={styles.rowLabel}>DATE OF LAST ACTIVITY</span>
                  <span style={styles.rowValue}>{formattedActivityDate}</span>
                </div>

                <div style={styles.summaryRow}>
                  <span style={styles.rowLabel}>ACCOUNT STATUS</span>
                  <span style={styles.rowValue}>Active / Verified Official</span>
                </div>
              </div>
            </div>

            {/* Section 3: CONTACT INFORMATION */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionBannerGray}>CONTACT INFORMATION</div>
              <div style={styles.summaryBox}>
                <div style={{ ...styles.summaryRow, ...styles.summaryRowBorder }}>
                  <span style={styles.rowLabel}>PRIMARY EMAIL</span>
                  <span style={styles.rowValue}>{email}</span>
                </div>

                <div style={styles.summaryRow}>
                  <span style={styles.rowLabel}>CONTACT NUMBER</span>
                  <span style={styles.rowValue}>{phone}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 19, 43, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #0B132B', width: '92%', maxWidth: '480px', padding: '24px 28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: '16px', fontWeight: '800', color: '#0B132B', margin: 0, textTransform: 'uppercase' }}>EDIT OFFICIAL PROFILE</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile}>
              {/* Profile Image Field */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', border: '1.5px solid #0B132B', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', overflow: 'hidden', flexShrink: 0 }}>
                  {editAvatar ? (
                    <img src={editAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User style={{ width: 32, height: 32, color: '#64748B' }} />
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>PROFILE PHOTO</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: '6px 12px', border: '1px solid #0B132B', backgroundColor: '#FFFFFF', color: '#0B132B', fontWeight: 800, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Camera style={{ width: 12, height: 12 }} />
                      UPLOAD PHOTO
                    </button>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar(null)}
                        style={{ padding: '6px 10px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#B91C1C', fontWeight: 700, fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                        REMOVE
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              {/* Official Name Field */}
              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>FULL LEGAL NAME</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Erick Nathaniel S. De Belen"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '2px', padding: '9px 12px', fontSize: '13px', outline: 'none', color: '#0B132B', fontWeight: 600 }}
                />
              </div>

              {/* Regional Affiliation Field */}
              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>REGIONAL AFFILIATION / ORGANIZATION</label>
                <input
                  type="text"
                  placeholder="e.g. Bucal Official / Ateneo De Cubao"
                  value={editOrg}
                  onChange={(e) => setEditOrg(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '2px', padding: '9px 12px', fontSize: '13px', outline: 'none', color: '#0B132B', fontWeight: 600 }}
                />
              </div>

              {/* Contact Number Field */}
              <div style={{ marginBottom: '22px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>CONTACT NUMBER</label>
                <input
                  type="text"
                  placeholder="63"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={{ border: '1px solid #CBD5E1', borderRadius: '2px', padding: '9px 12px', fontSize: '13px', outline: 'none', color: '#0B132B', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ padding: '9px 16px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 20px', border: 'none', backgroundColor: '#0B132B', color: '#FFFFFF', fontWeight: 800, fontSize: '11px', cursor: 'pointer' }}
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Match Modal */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11, 19, 43, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '2px solid #0B132B', width: '92%', maxWidth: '500px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0B132B', margin: 0 }}>CREATE SCHEDULED MATCH</h3>
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

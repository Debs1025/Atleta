import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserCheck, Trophy, LogOut, Award } from 'lucide-react';
import { getStoredToken, getStoredUser, clearAuthSession, getMe } from '../../api/client';
import type { AuthUser } from '../../api/types';
import { styles } from './styles/OfficialHomePage';

export const OfficialHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser());

  useEffect(() => {
    if (!getStoredToken()) {
      navigate('/login');
      return;
    }
    getMe().then((res) => setUser(res)).catch(() => {});
  }, [navigate]);

  const onLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const displayName = user?.full_legal_name || user?.full_name || user?.email || 'Tournament Official';
  const orgName = user?.organization_name || user?.organization || 'Official Body';

  return (
    <div style={styles.container}>
      <header className="resp-header" style={styles.header}>
        <Link to="/dashboard" style={styles.logo}>
          ATLETA<sup style={styles.logoSup}>WEB</sup>
        </Link>
        <nav style={styles.nav}>
          <span style={styles.userBadge}>{user?.email}</span>
          <button onClick={onLogout} className="nav-btn" style={styles.logoutBtn}>
            <LogOut style={{ width: 14, height: 14 }} />
            LOGOUT
          </button>
        </nav>
      </header>

      <main style={styles.main}>
        <div className="resp-card" style={styles.welcomeBox}>
          <h1 style={styles.welcomeTitle}>WELCOME, {displayName.toUpperCase()}</h1>
          <p style={styles.welcomeSub}>
            Tournament Official Operations Dashboard &bull; {orgName}
          </p>
        </div>

        <div className="resp-grid" style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardHead}>
              <UserCheck style={{ width: 18, height: 18 }} />
              <span>Official Credentials</span>
            </div>
            <p style={styles.cardValue}>{displayName}</p>
            <p style={styles.cardLabel}>Email: {user?.email}</p>
            <span style={styles.tag}>{user?.role || 'Official'}</span>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHead}>
              <Trophy style={{ width: 18, height: 18 }} />
              <span>Organization</span>
            </div>
            <p style={styles.cardValue}>{orgName}</p>
            <p style={styles.cardLabel}>Tournament Administration Body</p>
            <span style={styles.tag}>Active Status</span>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHead}>
              <Award style={{ width: 18, height: 18 }} />
              <span>Accreditation</span>
            </div>
            <p style={styles.cardValue}>
              {user?.sport_accreditation?.join(', ') || user?.assigned_sport || 'Basketball'}
            </p>
            <p style={styles.cardLabel}>License: {user?.license_number || 'LIC-2026-001'}</p>
            <span style={styles.tag}>Certified Official</span>
          </div>

          <div style={styles.card}>
            <div style={styles.cardHead}>
              <ShieldCheck style={{ width: 18, height: 18 }} />
              <span>System Security</span>
            </div>
            <p style={styles.cardValue}>Encrypted Terminal</p>
            <p style={styles.cardLabel}>Digital Access & Audit Active</p>
            <span style={styles.tag}>Session Verified</span>
          </div>
        </div>
      </main>

      <footer className="resp-footer" style={styles.footer}>
        <div className="resp-foot-wrap" style={styles.footWrap}>
          <div style={styles.footLogo}>ATLETA</div>
          <div style={styles.copy}>© 2026 ATLETA. ALL RIGHTS RESERVED.</div>
        </div>
      </footer>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  loginOfficial,
  getStoredToken,
  getOfficialSettings,
  getMe,
  getOfficialDashboard,
  prefetchAllOfficialAuditMatches,
} from '../api/client';
import { styles } from './styles/LoginPage';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savePass, setSavePass] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (getStoredToken()) {
      // Eagerly prefetch settings, dashboard, and match queue if session exists
      getOfficialSettings().catch(() => {});
      getMe().catch(() => {});
      prefetchAllOfficialAuditMatches().catch(() => {});
      navigate('/dashboard');
    }
  }, [navigate]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email || !password) return setErr('Please enter both email and password.');

    try {
      setLoading(true);
      await loginOfficial({ email, password, savePassword: savePass });
      // Eagerly prefetch settings, user profile, dashboard, and matches before navigating
      await Promise.allSettled([
        getOfficialSettings(true),
        getMe(true),
        getOfficialDashboard(true),
        prefetchAllOfficialAuditMatches(),
      ]);
      navigate('/dashboard');
    } catch (e: any) {
      const msg = e.message || '';
      if (
        msg.toLowerCase().includes('not found') ||
        msg.toLowerCase().includes('user-not-found')
      ) {
        setErr('Account does not exist.');
      } else {
        setErr(msg || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header className="resp-header" style={styles.header}>
        <Link to="/" style={styles.logo}>
          ATLETA<sup style={styles.logoSup}>WEB</sup>
        </Link>
        <nav style={styles.nav}>
          <Link to="/login" className="nav-link" style={styles.loginLink}>LOGIN</Link>
          <Link to="/register" className="nav-btn" style={styles.regBtn}>REGISTER</Link>
        </nav>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>LOG IN YOUR ACCOUNT</h1>

        <div className="resp-card" style={styles.card}>
          {err && <div style={styles.error}>{err}</div>}

          <form onSubmit={onLogin} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>EMAIL ADDRESS</label>
              <div style={styles.inputWrap}>
                <Mail style={styles.icon} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officials@gmail.com"
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <div style={styles.passLabelRow}>
                <label style={styles.label}>PASSWORD</label>
                <Link to="/forgot-password" className="text-link" style={styles.forgotLink}>FORGOT PASSWORD?</Link>
              </div>
              <div style={styles.inputWrap}>
                <Lock style={styles.icon} />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={styles.passInput}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            <div style={styles.checkRow}>
              <input
                id="savePass"
                type="checkbox"
                checked={savePass}
                onChange={(e) => setSavePass(e.target.checked)}
                style={styles.check}
              />
              <label htmlFor="savePass" style={styles.checkLabel}>SAVE PASSWORD</label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : 'LOGIN →'}
            </button>
          </form>

          <div style={styles.securityBox}>
            <div style={styles.secHeader}>
              <span style={styles.secDot} />
              <span style={styles.secTitle}>ENCRYPTED CONNECTION</span>
            </div>
            <p style={styles.secText}>
              Unauthorized access attempt is a violation of the digital security protocol. All activity is logged and monitored.
            </p>
          </div>
        </div>
      </main>

      <footer className="resp-footer" style={styles.footer}>
        <div className="resp-foot-wrap" style={styles.footWrap}>
          <div style={styles.footLogo}>ATLETA</div>
          <div style={styles.copy}>© 2026 ATLETA. ALL RIGHTS RESERVED.</div>
          <div style={styles.footLinks}>
            <span className="footer-link" style={styles.footLink}>PRIVACY</span>
            <span className="footer-link" style={styles.footLink}>TERMS</span>
            <span className="footer-link" style={styles.footLink}>SUPPORT</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

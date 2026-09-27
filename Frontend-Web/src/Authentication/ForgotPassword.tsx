import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '../api/client';
import { styles } from './styles/ForgotPassword';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!email.trim()) return setErr('Please provide your official email address.');

    try {
      setLoading(true);
      const res = await requestPasswordReset({ email });
      setMsg(res.message || 'Password reset link has been dispatched to your email address.');
    } catch (e: any) {
      setErr(e.message || 'Unable to process password reset request.');
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
        <h1 style={styles.title}>RESET PORTAL PASSWORD</h1>

        <div className="resp-card" style={styles.card}>
          {err && <div style={styles.error}>{err}</div>}

          {msg && (
            <div style={styles.success}>
              <CheckCircle2 style={styles.succIcon} />
              <div>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Check your inbox</p>
                <p style={styles.succText}>{msg}</p>
              </div>
            </div>
          )}

          <form onSubmit={onReset} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>OFFICIAL EMAIL ADDRESS</label>
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

            <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : 'SEND RECOVERY LINK →'}
            </button>
          </form>

          <div style={styles.backRow}>
            <Link to="/login" className="text-link" style={styles.backLink}>
              <ArrowLeft style={{ width: 14, height: 14 }} />
              <span>BACK TO LOGIN</span>
            </Link>
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

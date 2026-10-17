import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { confirmPasswordReset } from '../api/client';
import { styles } from './styles/ForgotPassword';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [succMsg, setSuccMsg] = useState<string>('');

  useEffect(() => {
    if (!tokenFromUrl) {
      setErr('Invalid or missing password recovery token. Please request a new recovery link.');
    }
  }, [tokenFromUrl]);

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!tokenFromUrl) {
      return setErr('Missing recovery token. Please request a new password recovery link.');
    }

    if (password.length < 6) {
      return setErr('Password must be at least 6 characters long.');
    }

    if (password !== confirmPassword) {
      return setErr('Passwords do not match. Please verify both fields.');
    }

    try {
      setLoading(true);
      const res = await confirmPasswordReset({
        token: tokenFromUrl,
        new_password: password,
        email: emailFromUrl || undefined,
      });

      setIsSuccess(true);
      setSuccMsg(res.message || 'Your password has been successfully updated.');
    } catch (e: any) {
      setErr(e.message || 'Unable to update password. The link may have expired.');
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
        <h1 style={styles.title}>SET NEW PASSWORD</h1>

        <div className="resp-card" style={styles.card}>
          {err && (
            <div style={styles.error}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span>{err}</span>
              </div>
            </div>
          )}

          {isSuccess ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', marginBottom: '16px' }}>
                <CheckCircle2 style={{ width: 36, height: 36 }} />
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0B132B', margin: '0 0 8px 0' }}>
                Password Updated!
              </h2>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                {succMsg || 'Your account password has been updated securely. You can now log in with your new credentials.'}
              </p>
              <Link
                to="/login"
                className="btn-primary"
                style={{
                  ...styles.submitBtn,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                LOG IN TO YOUR ACCOUNT →
              </Link>
            </div>
          ) : !tokenFromUrl ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', margin: '0 0 20px 0' }}>
                This password reset link is invalid or expired. Please submit your email again to get a fresh recovery link.
              </p>
              <Link
                to="/forgot-password"
                className="btn-primary"
                style={{
                  ...styles.submitBtn,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                REQUEST NEW LINK →
              </Link>
            </div>
          ) : (
            <form onSubmit={onResetPassword} style={styles.form}>
              {emailFromUrl && (
                <div style={{ fontSize: '12px', color: '#64748B', backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid #E2E8F0', marginBottom: '4px' }}>
                  Resetting password for: <strong style={{ color: '#0B132B' }}>{emailFromUrl}</strong>
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>NEW PASSWORD</label>
                <div style={styles.inputWrap}>
                  <Lock style={styles.icon} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    style={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>CONFIRM NEW PASSWORD</label>
                <div style={styles.inputWrap}>
                  <Lock style={styles.icon} />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    style={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                    tabIndex={-1}
                  >
                    {showConfirmPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
                {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : 'CONFIRM NEW PASSWORD →'}
              </button>
            </form>
          )}

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

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react';
import { registerOfficial } from '../api/client';
import { styles } from './styles/SignupPage';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');
  const [isCustomOrg, setIsCustomOrg] = useState(false);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cert, setCert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const resolvedOrg = org.trim();

    if (!name.trim() || !email.trim() || !resolvedOrg || !pass || !confirm) {
      return setErr('Please fill in all required fields.');
    }
    if (pass.length < 6) return setErr('Password must be at least 6 characters.');
    if (pass !== confirm) return setErr('Passwords do not match.');
    if (!cert) return setErr('You must certify the authorization bylaws.');

    try {
      setLoading(true);
      await registerOfficial({
        full_legal_name: name.trim(),
        organization_name: resolvedOrg,
        email: email.trim(),
        password: pass,
        assigned_sport: 'Tournament Operations',
      });
      navigate('/settings');
    } catch (e: any) {
      setErr(e.message || 'Registration failed.');
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
        <h1 style={styles.title}>CREATE YOUR ACCOUNT</h1>

        <div className="resp-card" style={styles.card}>
          <div style={styles.stepRow}>
            <span style={styles.stepBadge}>STEP 01</span>
            <h2 style={styles.stepTitle}>CREDENTIAL DETAILS</h2>
          </div>

          {err && <div style={styles.error}>{err}</div>}

          <form onSubmit={onRegister} style={styles.form}>
            <div className="resp-grid" style={styles.grid}>
              <div style={styles.field}>
                <label style={styles.label}>FULL LEGAL NAME</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  style={styles.input}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>OFFICIAL EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officials@gmail.com"
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldFull}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ ...styles.label, marginBottom: 0 }}>ORGANIZATION / TOURNAMENT BODY</label>
                  {isCustomOrg && (
                    <button
                      type="button"
                      onClick={() => { setIsCustomOrg(false); setOrg(''); }}
                      style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Choose from list
                    </button>
                  )}
                </div>

                {isCustomOrg ? (
                  <input
                    type="text"
                    required
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    placeholder="Enter organization name"
                    style={styles.input}
                    autoFocus
                  />
                ) : (
                  <div style={styles.selectWrap}>
                    <select
                      required
                      value={org}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setIsCustomOrg(true);
                          setOrg('');
                        } else {
                          setOrg(e.target.value);
                        }
                      }}
                      style={styles.select}
                    >
                      <option value="" disabled>Enter organization name</option>
                      <option value="Bicol Region Athletic Association (BRAA)">Bicol Region Athletic Association (BRAA)</option>
                      <option value="DepEd Palarong Pambansa">DepEd Palarong Pambansa</option>
                      <option value="Naga City Sports League">Naga City Sports League</option>
                      <option value="Philippine Sports Commission (PSC)">Philippine Sports Commission (PSC)</option>
                      <option value="Samahang Basketbol ng Pilipinas (SBP)">Samahang Basketbol ng Pilipinas (SBP)</option>
                      <option value="Philippine Volleyball Federation (PVF)">Philippine Volleyball Federation (PVF)</option>
                      <option value="CUSTOM">+ Add / Input Custom Organization</option>
                    </select>
                    <ChevronDown style={styles.selectIcon} />
                  </div>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>ENTER PASSWORD</label>
                <div style={styles.inputWrap}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
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

              <div style={styles.field}>
                <label style={styles.label}>CONFIRM PASSWORD</label>
                <div style={styles.inputWrap}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••••••"
                    style={styles.passInput}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeBtn}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.certRow}>
              <input
                id="cert"
                type="checkbox"
                required
                checked={cert}
                onChange={(e) => setCert(e.target.checked)}
                style={styles.certCheck}
              />
              <label htmlFor="cert" style={styles.certLabel}>
                I hereby certify that the information provided is accurate and that I am authorized to represent the stated organization. I understand that fraudulent registration is subject to legal action under Atleta administrative bylaws.
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={styles.submitBtn}>
              {loading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : 'COMPLETE REGISTRATION'}
            </button>
          </form>
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

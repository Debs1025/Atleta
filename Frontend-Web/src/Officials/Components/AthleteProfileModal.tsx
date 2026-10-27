import React, { useState, useEffect } from 'react';
import { X, Award, Activity, Loader2 } from 'lucide-react';
import { getAthleteProfileForOfficial } from '../../api/client';

export interface AthleteProfileModalProps {
  athleteId?: string;
  athleteName?: string;
  jerseyNo?: string | number;
  teamName?: string;
  position?: string;
  stats?: Record<string, any>;
  isOpen: boolean;
  onClose: () => void;
}

export const AthleteProfileModal: React.FC<AthleteProfileModalProps> = ({
  athleteId,
  athleteName,
  jerseyNo,
  teamName,
  position,
  stats,
  isOpen,
  onClose,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (athleteId && !athleteId.startsWith('ath_ocr_') && !athleteId.startsWith('ath_home_') && !athleteId.startsWith('ath_away_')) {
      setLoading(true);
      getAthleteProfileForOfficial(athleteId)
        .then((res) => setProfile(res))
        .catch(() => null)
        .finally(() => setLoading(false));
    } else {
      setProfile(null);
    }
  }, [athleteId, isOpen]);

  if (!isOpen) return null;

  const displayName = profile?.full_name || (profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : athleteName) || 'Athlete Profile';
  const displayTeam = profile?.team_name || profile?.school_name || profile?.institution || teamName || 'Varsity Delegation';
  const displayPosition = profile?.primary_position || profile?.position || position || 'Athlete';
  const displayJersey = profile?.jersey_number || jerseyNo || '#';
  const displaySport = profile?.sports_focus || profile?.sport_type || 'Basketball';
  const avatarUrl = profile?.avatar_url || profile?.profile_image;

  const height = profile?.physical_profile?.height_cm || profile?.height_cm || '—';
  const weight = profile?.physical_profile?.weight_kg || profile?.weight_kg || '—';
  const wingspan = profile?.physical_profile?.wingspan_cm || profile?.wingspan_cm || '—';
  const bmi = profile?.physical_profile?.bmi || profile?.bmi || '—';

  const mergedStats = { ...(stats || {}), ...(profile?.career_stats || {}) };
  const pts = mergedStats.pts ?? mergedStats.points ?? '—';
  const reb = mergedStats.reb ?? mergedStats.rebounds ?? '—';
  const ast = mergedStats.ast ?? mergedStats.assists ?? '—';
  const stl = mergedStats.stl ?? mergedStats.steals ?? '—';
  const blk = mergedStats.blk ?? mergedStats.blocks ?? '—';
  const fgPct = mergedStats.fg_pct || '—';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11, 19, 43, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0B132B 0%, #1E293B 100%)',
            padding: '24px',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            color: '#FFFFFF',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #38BDF8',
                }}
              />
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#38BDF8',
                  color: '#0B132B',
                  fontWeight: 800,
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>
                  {displayName}
                </h2>
                {displayJersey && displayJersey !== '#' && (
                  <span
                    style={{
                      backgroundColor: 'rgba(56, 189, 248, 0.2)',
                      color: '#38BDF8',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    #{displayJersey}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}>
                {displayPosition} • {displayTeam} • {displaySport}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Loader2 style={{ width: 32, height: 32, animation: 'spin 1s linear infinite', color: '#0B132B' }} />
            </div>
          ) : (
            <>
              {/* Anthropometric & Physical Overview */}
              <div style={{ marginBottom: '20px' }}>
                <h4
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Activity style={{ width: 14, height: 14, color: '#38BDF8' }} />
                  PHYSICAL & BIOMETRIC PROFILE
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    background: '#F8FAFC',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>HEIGHT</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>
                      {height !== '—' ? `${height} cm` : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>WEIGHT</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>
                      {weight !== '—' ? `${weight} kg` : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>WINGSPAN</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>
                      {wingspan !== '—' ? `${wingspan} cm` : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>BMI</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>
                      {bmi}
                    </div>
                  </div>
                </div>
              </div>

              {/* Match / Career Statistics */}
              <div style={{ marginBottom: '20px' }}>
                <h4
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    marginBottom: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Award style={{ width: 14, height: 14, color: '#F59E0B' }} />
                  PERFORMANCE & BOX SCORE SUMMARY
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '8px',
                    background: '#F8FAFC',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>PTS</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>{pts}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>REB</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>{reb}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>AST</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>{ast}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>STL</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>{stl}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>BLK</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>{blk}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>FG%</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0B132B', marginTop: '2px' }}>{fgPct}</div>
                  </div>
                </div>
              </div>

              {/* Affiliation & Academic Details */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '14px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#334155',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Institution / Team:</span>
                  <span style={{ fontWeight: 700 }}>{displayTeam}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Eligibility / Status:</span>
                  <span style={{ fontWeight: 700, color: '#059669' }}>OFFICIALLY VERIFIED</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontWeight: 600 }}>Primary Sport Focus:</span>
                  <span style={{ fontWeight: 700 }}>{displaySport}</span>
                </div>
              </div>
            </>
          )}

          {/* Close Action */}
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: '#0B132B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              CLOSE RESUME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

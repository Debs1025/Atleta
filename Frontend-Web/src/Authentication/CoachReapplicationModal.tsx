import React, { useState } from 'react';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { resubmitCoachCredentials } from '../api/client';

export interface CoachReapplicationModalProps {
  coachEmail?: string;
  userId?: string;
  coachId?: string;
  rejectionReason?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CoachReapplicationModal: React.FC<CoachReapplicationModalProps> = ({
  coachEmail = '',
  userId = '',
  coachId = '',
  rejectionReason = '',
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState(coachEmail);
  const [docUrl, setDocUrl] = useState('');
  const [docList, setDocList] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddUrl = () => {
    if (!docUrl.trim()) return;
    setDocList((prev) => Array.from(new Set([...prev, docUrl.trim()])));
    setDocUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const names = Array.from(files).map((f) => f.name);
    setDocList((prev) => Array.from(new Set([...prev, ...names])));
  };

  const handleRemoveDoc = (index: number) => {
    setDocList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const effectiveDocs = [...docList];
    if (docUrl.trim() && !effectiveDocs.includes(docUrl.trim())) {
      effectiveDocs.push(docUrl.trim());
    }

    if (effectiveDocs.length === 0) {
      setError('Please attach or provide at least one replacement credential document.');
      return;
    }

    try {
      setLoading(true);
      await resubmitCoachCredentials({
        email: email.trim(),
        user_id: userId,
        coach_id: coachId,
        documents: effectiveDocs,
        professional_documents: effectiveDocs,
        notes: notes.trim(),
      });

      setSuccessMsg('Replacement credentials submitted successfully. Your account status has been reset to Pending admin review.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit updated credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(11, 19, 43, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '4px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#0B132B',
            color: '#FFFFFF',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert style={{ width: 22, height: 22, color: '#F59E0B' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, letterSpacing: '0.06em' }}>
              COACH ACCREDITATION RE-APPLICATION
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        <div style={{ padding: '20px', maxHeight: '80vh', overflowY: 'auto' }}>
          {/* Rejection Notice Banner */}
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #FCA5A5',
              borderRadius: '3px',
              padding: '14px 16px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', fontWeight: 900, fontSize: '12px', marginBottom: '4px' }}>
              <AlertCircle style={{ width: 16, height: 16 }} />
              APPLICATION DECLINED: CREDENTIAL RESUBMISSION REQUIRED
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#7F1D1D', lineHeight: 1.5 }}>
              {rejectionReason
                ? `Decline reason: "${rejectionReason}". `
                : 'Your previous credential documents could not be verified. '}
              Your user account record is intact. Please upload valid replacement certifications below to reset your application for administrator re-evaluation.
            </p>
          </div>

          {/* Success Banner */}
          {successMsg && (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '3px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#166534',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 style={{ width: 18, height: 18 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                borderRadius: '3px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#991B1B',
                fontSize: '12px',
                fontWeight: 700,
                marginBottom: '16px',
              }}
            >
              <AlertCircle style={{ width: 18, height: 18 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Coach Email */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: '#0B132B', marginBottom: '6px', letterSpacing: '0.05em' }}>
                COACH ACCOUNT EMAIL:
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@institution.edu"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '2px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Document Resubmission */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: '#0B132B', marginBottom: '6px', letterSpacing: '0.05em' }}>
                REPLACEMENT CREDENTIAL DOCUMENTS & CERTIFICATES:
              </label>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={docUrl}
                  onChange={(e) => setDocUrl(e.target.value)}
                  placeholder="Paste URL to new certification PDF or image..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '2px',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddUrl}
                  style={{
                    padding: '8px 14px',
                    backgroundColor: '#0B132B',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '2px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ADD URL
                </button>
              </div>

              {/* File upload option */}
              <div
                style={{
                  border: '1.5px dashed #CBD5E1',
                  borderRadius: '3px',
                  padding: '12px',
                  textAlign: 'center',
                  backgroundColor: '#F8FAFC',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                />
                <Upload style={{ width: 20, height: 20, color: '#64748B', margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0B132B' }}>
                  Click or drag new certification files (PDF, JPG, PNG)
                </div>
              </div>

              {/* Added Documents List */}
              {docList.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {docList.map((d, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        backgroundColor: '#F1F5F9',
                        borderRadius: '2px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <FileText style={{ width: 14, height: 14, color: '#0B132B', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: '#0B132B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {d}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional Resubmission Notes */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 900, color: '#0B132B', marginBottom: '6px', letterSpacing: '0.05em' }}>
                CLARIFICATION NOTES FOR SYSTEM ADMIN (OPTIONAL):
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Explain the changes in credentials, new license numbers, or accreditation details..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '2px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 18px',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  backgroundColor: '#0B132B',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading && <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                <span>{loading ? 'SUBMITTING...' : 'SUBMIT RE-APPLICATION'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CoachReapplicationModal;

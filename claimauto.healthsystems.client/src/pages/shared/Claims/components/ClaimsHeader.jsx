// src/pages/shared/Claims/components/ClaimsHeader.jsx
import { Alert } from 'react-bootstrap';

export default function ClaimsHeader({
  isAdmin,
  isStaff,
  isHospital,
  isPolicyholder,
  successMsg,
  onSubmitClick,        // Hospital — submit new claim
  // onReimbursementClick prop removed — Reimbursement claim type no longer exists.
}) {
  const subtitle = isAdmin || isStaff
    ? 'All insurance claims across all providers and members'
    : isHospital
    ? 'Claims submitted by your facility'
    : 'Your insurance claims and coverage history';

  return (
    <>
      {/* ── Gradient banner ─────────────────────────────────────── */}
      <div
        className="mb-4 position-relative overflow-hidden"
        style={{
          borderRadius: 18,
          background:   'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding:      '20px 24px',
          boxShadow:    '0 8px 32px rgba(102,126,234,0.32)',
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', pointerEvents: 'none',
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          top: -70, right: -30,
        }} />
        <div style={{
          position: 'absolute', pointerEvents: 'none',
          width: 110, height: 110, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          bottom: -40, left: '40%',
        }} />

        <div
          className="d-flex align-items-center justify-content-between flex-wrap gap-3"
          style={{ position: 'relative' }}
        >
          {/* Left: icon + title + subtitle */}
          <div className="d-flex align-items-center gap-3">
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background:     'rgba(255,255,255,0.18)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              boxShadow:      '0 4px 12px rgba(0,0,0,0.15)',
              backdropFilter: 'blur(8px)',
              flexShrink: 0,
            }}>
              <i className="bi bi-file-medical-fill"
                style={{ fontSize: '1.35rem', color: 'white' }}></i>
            </div>
            <div>
              <h4 className="fw-bold mb-0"
                style={{ color: 'white', letterSpacing: '-0.3px' }}>
                Claims
              </h4>
              <div style={{
                fontSize:  '0.78rem',
                color:     'rgba(255,255,255,0.7)',
                marginTop: 2,
              }}>
                {subtitle}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          {(isHospital || isPolicyholder) && (
            <div className="d-flex gap-2">
              {isHospital && (
                <button
                  onClick={onSubmitClick}
                  style={{
                    padding:        '8px 18px',
                    borderRadius:   10,
                    border:         '1.5px solid rgba(255,255,255,0.35)',
                    background:     'rgba(255,255,255,0.18)',
                    color:          'white',
                    fontSize:       '0.82rem',
                    fontWeight:     700,
                    cursor:         'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    gap:            7,
                    backdropFilter: 'blur(8px)',
                    transition:     'background 0.15s',
                    whiteSpace:     'nowrap',
                    boxShadow:      '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
                >
                  <i className="bi bi-file-plus-fill" style={{ fontSize: '0.85rem' }}></i>
                  Submit Claim
                </button>
              )}

              {/* Policyholder "Request Reimbursement" button removed —
                  Reimbursement claim type no longer exists. */}
            </div>
          )}
        </div>
      </div>

      {/* ── Success alert ────────────────────────────────────────── */}
      {successMsg && (
        <Alert
          variant="success"
          className="d-flex align-items-center rounded-3 py-2 mb-3"
        >
          <i className="bi bi-check-circle-fill me-2"></i>
          {successMsg}
        </Alert>
      )}
    </>
  );
}

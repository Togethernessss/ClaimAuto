// src/pages/shared/Policies/components/PoliciesHeader.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Redesigned gradient banner header for the Policies page.
// Props unchanged from original — all parent wiring remains intact.
// ─────────────────────────────────────────────────────────────────────────────

export default function PoliciesHeader({
  isAdmin,        // boolean — show/hide the Create button
  isHospital,     // boolean — adjust subtitle text
  successMsg,     // string | null — green success message
  onCreateClick,  // function — opens the create modal
}) {
  return (
    <>
      {/* ── Gradient banner ──────────────────────────────────────────────── */}
      <div
        className="rounded-4 p-4 mb-4"
        style={{
          background:  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow:   '0 4px 20px rgba(118, 75, 162, 0.25)',
        }}
      >
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">

          {/* Icon + title + subtitle */}
          <div className="d-flex align-items-center gap-3">
            <div style={{
              background:    'rgba(255,255,255,0.18)',
              borderRadius:  14,
              padding:       '10px 12px',
              display:       'flex',
              alignItems:    'center',
              justifyContent:'center',
              backdropFilter:'blur(4px)',
              flexShrink:    0,
            }}>
              <i className="bi bi-shield-check text-white" style={{ fontSize: 28 }}></i>
            </div>
            <div>
              <h4 className="fw-bold text-white mb-0" style={{ letterSpacing: '-0.3px' }}>
                Insurance Policies
              </h4>
              <div className="text-white mt-1" style={{ opacity: 0.78, fontSize: '0.82rem' }}>
                {isHospital
                  ? 'Active plans available for claim submission'
                  : 'Manage insurance plans — coverage, deductibles, and effective dates'}
              </div>
            </div>
          </div>

          {/* Create button — Admin only */}
          {isAdmin && (
            <button
              onClick={onCreateClick}
              style={{
                background:    'rgba(255,255,255,0.18)',
                border:        '1.5px solid rgba(255,255,255,0.5)',
                color:         'white',
                borderRadius:  24,
                fontWeight:    600,
                fontSize:      '0.88rem',
                padding:       '9px 22px',
                cursor:        'pointer',
                backdropFilter:'blur(4px)',
                transition:    'background 0.15s, border-color 0.15s',
                display:       'flex',
                alignItems:    'center',
                gap:           6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background   = 'rgba(255,255,255,0.30)';
                e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.80)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background   = 'rgba(255,255,255,0.18)';
                e.currentTarget.style.borderColor  = 'rgba(255,255,255,0.50)';
              }}
            >
              <i className="bi bi-plus-lg" style={{ fontSize: '0.85rem' }}></i>
              New Policy
            </button>
          )}

        </div>
      </div>

      {/* ── Success message ───────────────────────────────────────────────── */}
      {successMsg && (
        <div
          className="rounded-3 px-3 py-2 mb-3 d-flex align-items-center gap-2"
          style={{ background: '#d1fae5', border: '1px solid #a7f3d0' }}
        >
          <i className="bi bi-check-circle-fill flex-shrink-0" style={{ color: '#065f46' }}></i>
          <span style={{ fontSize: '0.85rem', color: '#065f46', fontWeight: 500 }}>
            {successMsg}
          </span>
        </div>
      )}
    </>
  );
}

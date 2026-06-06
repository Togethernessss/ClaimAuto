// src/pages/shared/Fraud/components/FraudHeader.jsx

export default function FraudHeader({ onScoreClaim, onOpenCase, successMsg, errorMsg }) {
  return (
    <>
      <div
        className="mb-4 position-relative overflow-hidden"
        style={{
          borderRadius: 18,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '22px 28px',
          boxShadow: '0 8px 32px rgba(102,126,234,0.35)',
        }}
      >
        {/* Decorative orbs */}
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -70, right: -40, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', bottom: -50, left: '38%', pointerEvents: 'none' }} />

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ position: 'relative' }}>
          <div className="d-flex align-items-center gap-3">
            {/* Frosted-glass icon box */}
            <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)' }}>
              <i className="bi bi-shield-exclamation" style={{ fontSize: '1.4rem', color: 'white' }}></i>
            </div>
            <div>
              <h4 className="fw-bold mb-0" style={{ color: 'white', letterSpacing: '-0.3px' }}>Fraud Detection</h4>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
                Score claims for fraud risk, investigate cases, and resolve outcomes
              </div>
            </div>
          </div>

          {/* Two frosted-glass action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {/* Open Case — danger-tinted frosted glass */}
            <button
              onClick={onOpenCase}
              style={{ padding: '8px 20px', borderRadius: 10, border: '1.5px solid rgba(255,160,160,0.55)', background: 'rgba(255,100,100,0.22)', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, backdropFilter: 'blur(8px)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,100,100,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,100,100,0.22)')}
            >
              <i className="bi bi-folder-plus"></i>Open Case
            </button>

            {/* Score a Claim — white frosted glass */}
            <button
              onClick={onScoreClaim}
              style={{ padding: '8px 20px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.18)', color: 'white', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, backdropFilter: 'blur(8px)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
            >
              <i className="bi bi-speedometer2"></i>Score a Claim
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: '0.85rem', color: '#065f46', fontWeight: 500 }}>
          <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i>{successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: '0.85rem', color: '#991b1b', fontWeight: 500 }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444' }}></i>{errorMsg}
        </div>
      )}
    </>
  );
}

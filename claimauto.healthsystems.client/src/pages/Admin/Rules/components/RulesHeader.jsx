// src/pages/Admin/Rules/components/RulesHeader.jsx

export default function RulesHeader({ successMsg, onCreateClick }) {
  return (
    <div style={{ marginBottom: 0 }}>

      {/* ── Gradient Banner ──────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 18,
          padding: '28px 32px',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 130, height: 130, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, right: 80,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', pointerEvents: 'none',
        }} />

        <div
          className="d-flex align-items-center justify-content-between flex-wrap gap-3"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {/* Icon + text */}
          <div className="d-flex align-items-center gap-3">
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="bi bi-cpu" style={{ fontSize: 24, color: '#fff' }}></i>
            </div>
            <div>
              <h3 className="fw-bold mb-0" style={{ color: '#fff', lineHeight: 1.2 }}>
                Rules Engine
              </h3>
              <small style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13 }}>
                Manage adjudication rules — Draft → Active → Inactive
              </small>
            </div>
          </div>

          {/* New Rule frosted-glass button */}
          <button
            onClick={onCreateClick}
            style={{
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.35)',
              borderRadius: 12,
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              padding: '9px 22px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.28)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          >
            <i className="bi bi-plus-lg"></i>
            New Rule
          </button>
        </div>
      </div>

      {/* ── Inline success toast ─────────────────────────────────── */}
      {successMsg && (
        <div style={{
          marginBottom: 16,
          padding: '10px 16px',
          borderRadius: 10,
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <i className="bi bi-check-circle-fill" style={{ color: '#16a34a' }}></i>
          {successMsg}
        </div>
      )}
    </div>
  );
}

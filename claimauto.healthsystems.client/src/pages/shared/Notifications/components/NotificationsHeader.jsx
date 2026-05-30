// src/pages/shared/Notifications/components/NotificationsHeader.jsx
export default function NotificationsHeader({
  unreadCount,
  successMsg,
  errorMsg,
  onMarkAllRead,
  onDeleteAll,
}) {
  return (
    <>
      {/* ── Gradient Banner ─────────────────────────────────────────── */}
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

        <div
          className="d-flex align-items-center justify-content-between flex-wrap gap-3"
          style={{ position: 'relative' }}
        >
          {/* Left: icon + title */}
          <div className="d-flex align-items-center gap-3">
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)',
              position: 'relative',
            }}>
              <i className="bi bi-bell-fill" style={{ fontSize: '1.4rem', color: 'white' }}></i>
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#ef4444', border: '2px solid rgba(255,255,255,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 800, color: 'white',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>
            <div>
              <h4 className="fw-bold mb-0" style={{ color: 'white', letterSpacing: '-0.3px' }}>
                Notifications
              </h4>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>
                {unreadCount > 0 ? (
                  <><strong style={{ color: 'rgba(255,255,255,0.95)' }}>{unreadCount}</strong> unread notification{unreadCount !== 1 ? 's' : ''}</>
                ) : (
                  'All caught up! You have no unread notifications.'
                )}
              </div>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="d-flex gap-2 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                style={{
                  padding: '7px 16px', borderRadius: 10,
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  background: 'rgba(255,255,255,0.18)', color: 'white',
                  fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                  backdropFilter: 'blur(8px)', transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
              >
                <i className="bi bi-check2-all"></i>Mark all read
              </button>
            )}
            <button
              onClick={onDeleteAll}
              style={{
                padding: '7px 16px', borderRadius: 10,
                border: '1.5px solid rgba(255,100,100,0.5)',
                background: 'rgba(239,68,68,0.2)', color: 'white',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(8px)', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
            >
              <i className="bi bi-trash3"></i>Delete all
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast messages ──────────────────────────────────────────── */}
      {successMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#d1fae5', border: '1px solid #6ee7b7',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: '0.85rem', color: '#065f46', fontWeight: 500,
        }}>
          <i className="bi bi-check-circle-fill" style={{ color: '#10b981' }}></i>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: '0.85rem', color: '#991b1b', fontWeight: 500,
        }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color: '#ef4444' }}></i>
          {errorMsg}
        </div>
      )}
    </>
  );
}

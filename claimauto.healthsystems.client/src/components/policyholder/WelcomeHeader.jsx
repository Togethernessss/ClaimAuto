import { useNavigate } from 'react-router-dom';

export default function WelcomeHeader({ user, pendingClaims, unreadCount }) {
  const navigate  = useNavigate();
  const firstName = user?.name?.split(' ')[0] || 'Member';

  // Time-of-day greeting — logic unchanged
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
                'Good evening';
  const greetingEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

  // Friendly short org name — strips "Insurance" / "General Insurance" / "Healthcare"
  const shortOrgName = user?.organizationName
    ?.replace(/\s+(General\s+)?Insurance$/i, '')
    .replace(/\s+Healthcare$/i, '')
    .trim();

  const brandColor = user?.organizationBrandColor || '#4f46e5';

  return (
    <div
      className="mb-4 p-4 position-relative overflow-hidden"
      style={{
        borderRadius: 18,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        boxShadow: '0 8px 32px rgba(102,126,234,0.40)',
      }}
    >
      {/* Decorative background orbs */}
      <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -80, right: -60, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -50, left: '35%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: '20%', left: -20, pointerEvents: 'none' }} />

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Left: avatar + greeting ──────────────────────────────── */}
        <div className="d-flex align-items-center gap-3">
          <div
            onClick={() => navigate('/profile')}
            title="View profile"
            className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
            style={{
              width: 54, height: 54,
              background: user?.profilePhoto
                ? 'transparent'
                : 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.25)',
              fontSize: '1.4rem',
              backdropFilter: user?.profilePhoto ? 'none' : 'blur(10px)',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt="Profile"
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover', display: 'block',
                }}
              />
            ) : (
              firstName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: 2 }}>
              {greetingEmoji} {greeting}
            </div>
            <div className="fw-bold" style={{ fontSize: '1.35rem', lineHeight: 1.2 }}>
              {firstName}
            </div>
            {shortOrgName && (
              <div style={{ fontSize: '0.75rem', opacity: 0.65, marginTop: 2 }}>
                {shortOrgName} Health Portal
              </div>
            )}
          </div>
        </div>

        {/* ── Right: status pills + action buttons ─────────────────── */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          {pendingClaims > 0 && (
            <div
              className="px-3 py-1 rounded-pill small fw-semibold"
              style={{
                background: 'rgba(251,191,36,0.18)',
                border: '1px solid rgba(251,191,36,0.35)',
                color: '#fde68a',
              }}
            >
              <i className="bi bi-clock-fill me-1"></i>
              {pendingClaims} In Progress
            </div>
          )}
          {unreadCount > 0 && (
            <div
              className="px-3 py-1 rounded-pill small fw-semibold"
              style={{
                background: 'rgba(239,68,68,0.18)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#fca5a5',
              }}
            >
              <i className="bi bi-bell-fill me-1"></i>
              {unreadCount} Unread
            </div>
          )}
          {pendingClaims === 0 && unreadCount === 0 && (
            <div
              className="px-3 py-1 rounded-pill small fw-semibold"
              style={{
                background: 'rgba(16,185,129,0.18)',
                border: '1px solid rgba(16,185,129,0.35)',
                color: '#6ee7b7',
              }}
            >
              <i className="bi bi-check-circle-fill me-1"></i>
              All up to date
            </div>
          )}
          <button
            className="btn btn-sm rounded-pill"
            style={{
              background: 'rgba(255,255,255,0.14)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(10px)',
              fontSize: '0.82rem',
            }}
            onClick={() => navigate('/policyholder/notifications')}
          >
            <i className="bi bi-bell me-1"></i> Notifications
          </button>
          <button
            className="btn btn-sm rounded-circle"
            style={{
              width: 34, height: 34, padding: 0,
              background: 'rgba(255,255,255,0.10)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            <i className="bi bi-arrow-clockwise" style={{ fontSize: '0.9rem' }}></i>
          </button>
        </div>
      </div>
    </div>
  );
}

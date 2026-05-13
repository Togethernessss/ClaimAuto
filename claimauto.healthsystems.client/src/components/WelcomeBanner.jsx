import { Button } from 'react-bootstrap';
import { useAuth } from '../security/AuthContext';

// ─── Reusable Welcome Banner ──────────────────────────────────────────────
//
// Side Avatar style — used on every dashboard for consistency.
// Purple gradient background matches the project theme.
//
// PROPS:
//   - emoji        (optional) — appears after the name (e.g. "👑", "🏥", "👋")
//   - actions      (optional) — array of button configs:
//                  [{ label, icon, variant, onClick }]
//   - showLocation (optional) — show location in meta row (default: false)
//
// USAGE:
//   <WelcomeBanner
//     emoji="👑"
//     actions={[
//       { label: 'Manage Users', icon: 'bi-people', variant: 'outline-light',
//         onClick: () => navigate('/members') },
//       { label: 'Audit Logs', icon: 'bi-journal-text', variant: 'light',
//         onClick: () => navigate('/audit-logs') },
//     ]}
//   />

export default function WelcomeBanner({
  emoji = '',
  actions = [],
  showLocation = false,
}) {
  const { user } = useAuth();

  // ── Compute initials from user name (e.g. "Aayush Gupta" → "AG") ────────
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // ── Time-based greeting ─────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingIcon =
    hour < 12 ? 'bi-sunrise' : hour < 17 ? 'bi-sun' : 'bi-moon-stars';
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // ── Role-specific colored badge ─────────────────────────────────────────
  const roleColors = {
    Admin: { bg: '#fee2e2', text: '#dc2626', icon: 'bi-shield-lock-fill' },
    InsuranceStaff: { bg: '#fef3c7', text: '#d97706', icon: 'bi-person-workspace' },
    Hospital: { bg: '#dbeafe', text: '#2563eb', icon: 'bi-hospital' },
    Policyholder: { bg: '#d1fae5', text: '#059669', icon: 'bi-person-badge' },
  };
  const roleStyle = roleColors[user?.role] || { bg: '#e5e7eb', text: '#475569', icon: 'bi-person' };

  // ── Last login string (mock until you wire to real lastLoginAt) ─────────
  // TODO: replace with user.lastLoginAt from backend if available
  const lastLogin = 'Today, 9:42 AM';

  return (
    <div
      className="p-4 p-md-5 rounded-3 mb-4 shadow-sm d-flex align-items-center flex-wrap gap-3"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      {/* ── Avatar with initials ─────────────────────────────────────────── */}
      <div
        className="d-flex align-items-center justify-content-center flex-shrink-0 fw-bold text-white"
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          fontSize: 28,
          letterSpacing: 1,
        }}
      >
        {getInitials(user?.name)}
      </div>

      {/* ── Info block (greeting + name + meta row) ──────────────────────── */}
      <div className="flex-grow-1 text-white" style={{ minWidth: 220 }}>
        {/* Greeting line */}
        <div
          className="text-uppercase fw-semibold mb-1"
          style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.85 }}
        >
          <i className={`${greetingIcon} me-1`}></i>
          {greeting} · {weekday}
        </div>

        {/* Name */}
        <h2 className="fw-bold mb-2" style={{ fontSize: 26 }}>
          {user?.name} {emoji}
        </h2>

        {/* Meta row — role badge + last login sit right next to each other */}
        <div className="d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: 13 }}>
          {/* Role pill */}
          <span
            className="d-inline-flex align-items-center gap-1 fw-semibold"
            style={{
              background: roleStyle.bg,
              color: roleStyle.text,
              padding: '2px 10px',
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <i className={roleStyle.icon}></i> {user?.role}
          </span>

        </div>
      </div>

      {/* ── Action buttons (right side) ──────────────────────────────────── */}
      {actions.length > 0 && (
        <div className="d-flex gap-2 flex-wrap">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || 'light'}
              size="sm"
              onClick={action.onClick}
              className="fw-semibold"
            >
              {action.icon && <i className={`${action.icon} me-1`}></i>}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

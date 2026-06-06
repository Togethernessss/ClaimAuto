import { Button } from 'react-bootstrap';
import { useAuth } from '../security/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_SHORTCUTS = {
  Admin: [
    { label: 'Enroll Member',    icon: 'bi-person-plus',
      path: '/admin/members' },
    { label: 'Fraud Cases', icon: 'bi-shield-exclamation',
      path: '/admin/fraud' },
    { label: 'Reports',     icon: 'bi-graph-up',
      path: '/admin/reports' },
    { label: 'Audit Logs',  icon: 'bi-journal-text',
      path: '/admin/audit-logs' },
  ],
  InsuranceStaff: [
    { label: 'Claims Queue', icon: 'bi-files',
      path: '/staff/claims' },
    { label: 'My Tasks',     icon: 'bi-list-check',
      path: '/staff/tasks' },
    { label: 'Adjudication', icon: 'bi-check2-square',
      path: '/staff/adjudication' },
    { label: 'Payments',     icon: 'bi-credit-card',
      path: '/staff/payments' },
  ],
  Hospital: [
    { label: 'New Claim',   icon: 'bi-file-plus',
      path: '/hospital/claims' },
    { label: 'My Policies', icon: 'bi-shield-check',
      path: '/hospital/policies' },
    { label: 'Members',     icon: 'bi-people',
      path: '/hospital/members' },
    { label: 'Remittance',  icon: 'bi-receipt',
      path: '/hospital/remittance' },
  ],
  Policyholder: [
    { label: 'File a Claim',  icon: 'bi-file-invoice',
      path: '/policyholder/claims' },
    { label: 'My Policy',     icon: 'bi-heart-pulse',
      path: '/policyholder/policies' },
    { label: 'Claim History', icon: 'bi-clock-history',
      path: '/policyholder/claims' },
    { label: 'My Appeals',    icon: 'bi-megaphone',
      path: '/policyholder/appeals' },
  ],
};

export default function WelcomeBanner({ emoji = '', actions = [] }) {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  // Source of truth: user.profilePhoto from AuthContext (backend-persisted).
  // localStorage is just a fast-paint cache fallback for the very first render.
  const storageKey = user?.userID
    ? `profilePhoto_${user.userID}` : null;

  const photo =
    user?.profilePhoto
      ?? (storageKey ? localStorage.getItem(storageKey) : null)
      ?? null;

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1)
      return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning'
    : hour < 17 ? 'Good afternoon'
    : 'Good evening';
  const greetingIcon =
    hour < 12 ? 'bi-sunrise'
    : hour < 17 ? 'bi-sun'
    : 'bi-moon-stars';
  const weekday = new Date().toLocaleDateString('en-US',
    { weekday: 'long' });

  const roleColors = {
    Admin:          { bg: '#fee2e2', text: '#dc2626',
      icon: 'bi-shield-lock-fill' },
    InsuranceStaff: { bg: '#fef3c7', text: '#d97706',
      icon: 'bi-person-workspace' },
    Hospital:       { bg: '#dbeafe', text: '#2563eb',
      icon: 'bi-hospital' },
    Policyholder:   { bg: '#d1fae5', text: '#059669',
      icon: 'bi-person-badge' },
  };
  const roleStyle =
    roleColors[user?.role] ||
    { bg: '#e5e7eb', text: '#475569', icon: 'bi-person' };

  const shortcuts = ROLE_SHORTCUTS[user?.role] || [];

  return (
    <div
      className="d-flex align-items-center flex-wrap gap-3
        shadow-sm rounded-3"
      style={{
        background:
          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '24px 28px',
        margin: '8px 16px 24px 16px',
      }}
    >
      {/* ── Avatar ───────────────────────────────────────────── */}
      <div
        onClick={() => navigate('/profile')}
        title="View profile"
        style={{
          width: 80, height: 80,
          borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.6)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          flexShrink: 0,
          cursor: 'pointer',
          background: photo
            ? 'transparent'
            : 'rgba(255,255,255,0.2)',
          backdropFilter: photo ? 'none' : 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow =
            '0 6px 20px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow =
            '0 4px 16px rgba(0,0,0,0.2)';
        }}
      >
        {photo ? (
          <img
            src={photo}
            alt={user?.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span style={{
            color: 'white',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 1,
          }}>
            {getInitials(user?.name)}
          </span>
        )}
      </div>

      {/* ── Identity block ────────────────────────────────────── */}
      <div className="flex-grow-1 text-white"
        style={{ minWidth: 220 }}>
        <div
          className="text-uppercase fw-semibold mb-1"
          style={{
            fontSize: 11,
            letterSpacing: 0.5,
            opacity: 0.85,
          }}
        >
          <i className={`${greetingIcon} me-1`}></i>
          {greeting} · {weekday}
        </div>
        <h2 className="fw-bold mb-2" style={{ fontSize: 26 }}>
          {user?.name} {emoji}
        </h2>
        <span
          className="d-inline-flex align-items-center gap-1
            fw-semibold"
          style={{
            background: roleStyle.bg,
            color: roleStyle.text,
            padding: '2px 10px',
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <i className={roleStyle.icon}></i>{' '}
          {user?.role === 'InsuranceStaff'
            ? 'Staff' : user?.role}
        </span>
      </div>

      {/* ── Shortcuts grid ────────────────────────────────────── */}
      {shortcuts.length > 0 && (
        <>
          <div style={{
            width: 1,
            alignSelf: 'stretch',
            background: 'rgba(255,255,255,0.2)',
            margin: '0 8px',
          }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            minWidth: 220,
          }}>
            {shortcuts.map((s) => (
              <button
                key={s.path}
                onClick={() => navigate(s.path)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 500,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) =>
                  e.currentTarget.style.background =
                    'rgba(255,255,255,0.25)'}
                onMouseLeave={(e) =>
                  e.currentTarget.style.background =
                    'rgba(255,255,255,0.15)'}
              >
                <i className={s.icon}
                  style={{ fontSize: 15 }}></i>
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Action buttons ────────────────────────────────────── */}
      {actions.length > 0 && (
        <div className="d-flex gap-2 flex-wrap me-3">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || 'light'}
              size="sm"
              onClick={action.onClick}
              className="fw-semibold"
            >
              {action.icon && (
                <i className={`${action.icon} me-1`}></i>
              )}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
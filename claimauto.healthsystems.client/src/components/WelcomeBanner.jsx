import { Button } from 'react-bootstrap';
import { useAuth } from '../security/AuthContext';

export default function WelcomeBanner({ emoji = '', actions = [] }) {
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingIcon =
    hour < 12 ? 'bi-sunrise' : hour < 17 ? 'bi-sun' : 'bi-moon-stars';
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const roleColors = {
    Admin: { bg: '#fee2e2', text: '#dc2626', icon: 'bi-shield-lock-fill' },
    InsuranceStaff: { bg: '#fef3c7', text: '#d97706', icon: 'bi-person-workspace' },
    Hospital: { bg: '#dbeafe', text: '#2563eb', icon: 'bi-hospital' },
    Policyholder: { bg: '#d1fae5', text: '#059669', icon: 'bi-person-badge' },
  };
  const roleStyle = roleColors[user?.role] || { bg: '#e5e7eb', text: '#475569', icon: 'bi-person' };

  return (
    <div
      className="d-flex align-items-center flex-wrap gap-3 shadow-sm rounded-3"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '32px 28px',
        margin: '1px 16px 24px 16px',
      }}
    >
      {/* Avatar */}
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

      {/* Info block */}
      <div className="flex-grow-1 text-white" style={{ minWidth: 220 }}>
        <div
          className="text-uppercase fw-semibold mb-1"
          style={{ fontSize: 11, letterSpacing: 0.5, opacity: 0.85 }}
        >
          <i className={`${greetingIcon} me-1`}></i>
          {greeting} · {weekday}
        </div>
        <h2 className="fw-bold mb-2" style={{ fontSize: 26 }}>
          {user?.name} {emoji}
        </h2>
        <div className="d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: 13 }}>
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

      {/* Action buttons */}
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
              {action.icon && <i className={`${action.icon} me-1`}></i>}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
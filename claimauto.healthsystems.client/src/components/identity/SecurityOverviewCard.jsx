import { Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export default function SecurityOverviewCard({ user }) {
  const navigate = useNavigate();
  if (!user) return null;

  // ── Security score (based on what we know from the user object) ──
  // Base 50 + 40 for MFA + 10 for not needing a forced password change
  let score = 50;
  if (user.mfaEnabled)            score += 40;
  if (!user.mustChangePassword)   score += 10;

  const scoreColor =
    score >= 90 ? '#10b981' :   // green
    score >= 70 ? '#f59e0b' :   // amber
                  '#ef4444';    // red

  const scoreLabel =
    score >= 90 ? 'Excellent' :
    score >= 70 ? 'Good' :
                  'Needs Attention';

  // ── Three security checks ──────────────────────────────────────
  const checks = [
    {
      icon:  'bi-shield-lock-fill',
      label: 'Two-Factor Authentication',
      ok:    !!user.mfaEnabled,
      good:  'MFA is enabled and protecting your account',
      bad:   'MFA is not set up — your account is less secure',
    },
    {
      icon:  'bi-key-fill',
      label: 'Password',
      ok:    !user.mustChangePassword,
      good:  'Password is current and secure',
      bad:   'Password change is required',
    },
    {
      icon:  'bi-person-check-fill',
      label: 'Account Standing',
      ok:    user.status === 'Active',
      good:  'Account is active and in good standing',
      bad:   'Account is currently inactive',
    },
  ];

  // ── Role-specific quick-access links (2 per role) ──────────────
  const quickLinks = ({
    Admin:          [
      { icon: 'bi-people-fill',       label: 'Manage Users',  path: '/admin/users' },
      { icon: 'bi-journal-text',      label: 'Audit Logs',    path: '/admin/audit-logs' },
    ],
    InsuranceStaff: [
      { icon: 'bi-file-earmark-text', label: 'View Claims',   path: '/staff/claims' },
      { icon: 'bi-calculator',        label: 'Adjudication',  path: '/staff/adjudication' },
    ],
    Hospital:       [
      { icon: 'bi-file-plus-fill',    label: 'Submit Claim',  path: '/hospital/claims' },
      { icon: 'bi-bell-fill',         label: 'Notifications', path: '/hospital/notifications' },
    ],
    Policyholder:   [
      { icon: 'bi-file-earmark-text', label: 'My Claims',     path: '/policyholder/claims' },
      { icon: 'bi-card-text',         label: 'My Policies',   path: '/policyholder/policies' },
    ],
  })[user.role] ?? [];

  return (
    <Card
      className="border-0"
      style={{ boxShadow: '0 4px 24px rgba(102,126,234,0.08)', borderRadius: 16 }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <Card.Header
        className="border-0 py-3 px-4"
        style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <h6 className="mb-0 fw-bold" style={{ color: '#4c1d95' }}>
          <i className="bi bi-shield-check me-2" style={{ color: '#7c3aed' }}></i>
          Security Overview
        </h6>
      </Card.Header>

      <Card.Body className="px-4 py-3">

        {/* ── Score ring ─────────────────────────────────────────── */}
        <div
          className="d-flex align-items-center gap-3 p-3 rounded-3 mb-3"
          style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
        >
          {/* SVG circular progress ring */}
          <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
            <svg
              viewBox="0 0 36 36"
              style={{ width: 56, height: 56, transform: 'rotate(-90deg)' }}
            >
              {/* Track */}
              <circle
                cx="18" cy="18" r="15.9"
                fill="none" stroke="#e5e7eb" strokeWidth="3"
              />
              {/* Progress */}
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke={scoreColor}
                strokeWidth="3"
                strokeDasharray={`${score} 100`}
                strokeLinecap="round"
              />
            </svg>
            {/* Score number in centre */}
            <span
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: 13, fontWeight: 700, color: scoreColor,
              }}
            >
              {score}
            </span>
          </div>

          <div>
            <div className="fw-bold mb-1" style={{ color: '#1e1b4b', fontSize: 14 }}>
              Security Score
            </div>
            <Badge
              className="rounded-pill"
              style={{ background: scoreColor, fontSize: 11, padding: '4px 10px' }}
            >
              {scoreLabel}
            </Badge>
          </div>
        </div>

        {/* ── Three status checks ────────────────────────────────── */}
        <div className="d-flex flex-column gap-2 mb-3">
          {checks.map((c) => (
            <div
              key={c.label}
              className="d-flex align-items-center gap-2 px-3 py-2 rounded-3"
              style={{
                background: c.ok ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${c.ok ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {/* Icon box */}
              <div
                style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: c.ok ? '#dcfce7' : '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i
                  className={`bi ${c.icon}`}
                  style={{ fontSize: 13, color: c.ok ? '#16a34a' : '#dc2626' }}
                ></i>
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 11, color: c.ok ? '#16a34a' : '#dc2626', marginTop: 1 }}>
                  <i
                    className={`bi ${c.ok ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'} me-1`}
                  ></i>
                  {c.ok ? c.good : c.bad}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick-access links ─────────────────────────────────── */}
        {quickLinks.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid #f3f4f6', marginBottom: 12 }} />
            <div
              style={{
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#9ca3af', marginBottom: 8,
              }}
            >
              Quick Access
            </div>

            <div className="d-flex gap-2">
              {quickLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  style={{
                    flex: 1,
                    padding: '10px 6px',
                    borderRadius: 10,
                    border: '1.5px solid #ede9fe',
                    background: '#faf5ff',
                    color: '#7c3aed',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    e.currentTarget.style.color        = 'white';
                    e.currentTarget.style.borderColor  = 'transparent';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background  = '#faf5ff';
                    e.currentTarget.style.color       = '#7c3aed';
                    e.currentTarget.style.borderColor = '#ede9fe';
                  }}
                >
                  <i className={`bi ${link.icon}`} style={{ fontSize: 18 }}></i>
                  <span>{link.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
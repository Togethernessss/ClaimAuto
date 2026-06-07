import { useNavigate } from 'react-router-dom';
import { Card, Button } from 'react-bootstrap';
import { findRejectedClaims } from '../../data/policyholderDashboardData';
import { useAuth } from '../../security/AuthContext';

export default function QuickActionsPanel({ claims, activeAppeal }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Multi-tenant: use the user's organization support email if available,
  // otherwise fall back to a generic platform contact.
  const supportEmail = user?.organizationSupportEmail || 'support@claimauto.com';
  const supportSubject = user?.organizationName
    ? `${user.organizationName} — Policyholder Support Request`
    : 'Policyholder Support Request';

  const rejected = findRejectedClaims(claims);
  const canFileAppeal = rejected.length > 0 && !activeAppeal;
  // Backend rule: only one active appeal at a time per policyholder

  const handleFileAppeal = () => {
    if (canFileAppeal) {
      const claim = rejected[0];
      navigate(`/policyholder/appeals?action=new&claim=${claim.claimID}`);
    }
  };

  const handleContactSupport = () => {
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}`;
  };

  const actions = [
    {
      icon: 'bi-scales', title: 'File New Appeal',
      desc: activeAppeal
        ? 'You already have an active appeal'
        : canFileAppeal
          ? `Contest CLM-${rejected[0].claimID}`
          : 'No rejected claims to appeal',
      color: '#c0392b', bg: '#ffebee',
      disabled: !canFileAppeal,
      action: handleFileAppeal,
    },
    {
      icon: 'bi-file-text', title: 'View Policy Document',
      desc: 'Terms, conditions, exclusions',
      color: '#6a1b9a', bg: '#f3e5f5',
      action: () => navigate('/policyholder/policies'),
    },
    {
      icon: 'bi-headset', title: 'Contact Support',
      desc: '24/7 helpline available',
      color: '#2e7d32', bg: '#d1f2eb',
      action: handleContactSupport,
    },
  ];

  return (
    <Card className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
      <Card.Header className="bg-white border-bottom py-3">
        <div className="fw-bold d-flex align-items-center">
          <i className="bi bi-lightning-fill text-warning me-2 fs-5"></i>
          <span>Quick Actions</span>
        </div>
      </Card.Header>
      <Card.Body className="p-2">
        {actions.map((a) => (
          <Button
            key={a.title}
            variant="link"
            disabled={a.disabled}
            className="w-100 text-start text-decoration-none text-dark p-2 rounded mb-1"
            style={{ transition: 'background .15s' }}
            onMouseEnter={(e) => !a.disabled && (e.currentTarget.style.background = '#f8f9fa')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={a.action}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 d-flex align-items-center justify-content-center"
                style={{ width: 44, height: 44, backgroundColor: a.bg, opacity: a.disabled ? 0.4 : 1 }}
              >
                <i className={a.icon} style={{ fontSize: '1.15rem', color: a.color }}></i>
              </div>
              <div style={{ opacity: a.disabled ? 0.5 : 1 }} className="flex-grow-1">
                <div className="fw-semibold small">{a.title}</div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>{a.desc}</div>
              </div>
              {!a.disabled && <i className="bi bi-chevron-right text-muted"></i>}
            </div>
          </Button>
        ))}
      </Card.Body>
    </Card>
  );
}
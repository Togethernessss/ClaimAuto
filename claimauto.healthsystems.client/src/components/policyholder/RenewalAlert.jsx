import { Alert, Button } from 'react-bootstrap';
import { daysUntil, formatDate } from '../../data/policyholderDashboardData';

export default function RenewalAlert({ policy }) {
  if (!policy) return null;

  const days = daysUntil(policy.effectiveTo);
  if (days === null || days > 90 || days < 0) return null;

  const variant = days <= 30 ? 'danger' : 'warning';
  const icon = days <= 30 ? '🔴' : '🟡';

  return (
    <Alert variant={variant} className="d-flex align-items-center mb-3 shadow-sm" style={{ borderRadius: 10 }}>
      <span className="me-3 fs-4">{icon}</span>
      <div className="flex-grow-1">
        <strong>Policy Renewal Approaching</strong>
        <div className="small">
          Your <b>{policy.planName}</b> expires in <b>{days} days</b> ({formatDate(policy.effectiveTo)}).
          Contact support to renew before expiration.
        </div>
      </div>
      <Button
        variant={variant}
        size="sm"
        className="rounded-pill fw-semibold"
        onClick={() => window.location.href = 'mailto:support@claimauto.com?subject=Policy Renewal Request'}
      >
        <i className="bi bi-envelope me-1"></i> Contact Support
      </Button>
    </Alert>
  );
}
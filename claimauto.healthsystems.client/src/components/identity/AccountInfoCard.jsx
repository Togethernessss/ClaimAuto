import { Card } from 'react-bootstrap';

/**
 * Small read-only card showing account metadata.
 * Sits below the MfaCard in the security column of the Profile page.
 *
 * Props:
 *   user — current user object from AuthContext
 */
export default function AccountInfoCard({ user }) {
  if (!user) return null;

  // Format the joined date — show "May 14, 2026"
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white border-0 py-3">
        <h6 className="mb-0 fw-semibold">
          <i className="bi bi-info-circle text-primary me-2"></i>
          Account Information
        </h6>
      </Card.Header>

      <Card.Body>
        <Row label="User ID" icon="bi-hash" value={`#${user.userID}`} />
        <Row label="Account Created" icon="bi-calendar3" value={joined} />
        <Row
          label="Account Status"
          icon="bi-check-circle"
          value={user.status === 'Active' ? 'Active' : user.status}
        />
      </Card.Body>
    </Card>
  );
}

/**
 * Tiny helper for one label/value row.
 */
function Row({ label, icon, value }) {
  return (
    <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
      <div className="small text-muted">
        <i className={`${icon} me-1`}></i>
        {label}
      </div>
      <div className="small fw-semibold">{value}</div>
    </div>
  );
}
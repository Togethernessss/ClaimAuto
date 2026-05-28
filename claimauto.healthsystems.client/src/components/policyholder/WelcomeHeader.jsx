import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';

export default function WelcomeHeader({ user, pendingClaims, unreadCount }) {
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] || 'Member';

  // Time-of-day greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
                'Good evening';

  // Friendly short name — strips "Insurance" / "General Insurance" / "Healthcare"
  // so we say "Star Health" not "Star Health Insurance" in the greeting.
  const shortOrgName = user?.organizationName
    ?.replace(/\s+(General\s+)?Insurance$/i, '')
    .replace(/\s+Healthcare$/i, '')
    .trim();

  return (
    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div>
        <h4 className="fw-bold mb-1">{greeting}, {firstName} 👋</h4>
        <p className="text-muted small mb-0">
          {shortOrgName && (
            <>
              Welcome to your{' '}
              <b style={{ color: user.organizationBrandColor || '#4f46e5' }}>
                {shortOrgName}
              </b>{' '}
              portal ·{' '}
            </>
          )}
          {pendingClaims > 0
            ? <>You have <b>{pendingClaims}</b> claim{pendingClaims !== 1 ? 's' : ''} in progress</>
            : 'All your claims are up to date'}
          {unreadCount > 0 && (
            <> · <b className="text-danger">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</b></>
          )}
        </p>
      </div>

      <div className="d-flex gap-2">
        <Button
          variant="outline-primary"
          size="sm"
          className="rounded-pill"
          onClick={() => navigate('/policyholder/notifications')}
        >
          <i className="bi bi-bell me-1"></i> Notifications
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-pill"
          onClick={() => window.location.reload()}
        >
          <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </Button>
      </div>
    </div>
  );
}
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Card } from 'react-bootstrap';
import { useAuth } from '../security/AuthContext';
import { getDashboardPath } from '../security/permissions';

/**
 * Friendly 403 page. Rendered inside AppLayout (because role-gated routes
 * live inside <RequireAuth><AppLayout/></RequireAuth>), so the sidebar
 * stays visible — the user can navigate elsewhere without going back.
 *
 * Shows:
 *   - Which URL was blocked (useful for debugging / support)
 *   - Who they're signed in as (in case they expected a different role)
 *   - "Back to Dashboard" — happy path
 *   - "Sign in as someone else" — for shared workstations (mirrors Sidebar logout → '/')
 */
export default function AccessDenied() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const attemptedPath = location.pathname;

  const handleSignInAsOther = () => {
    logout();
    navigate('/');   // matches Sidebar.jsx logout behavior
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '70vh', padding: 24 }}
    >
      <Card className="shadow-sm border-0" style={{ maxWidth: 520, width: '100%' }}>
        <Card.Body className="text-center p-5">
          {/* Icon badge */}
          <div
            className="d-inline-flex align-items-center justify-content-center mb-4"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
            }}
          >
            <i className="bi bi-shield-lock-fill" style={{ fontSize: 40 }}></i>
          </div>

          <h3 className="fw-bold mb-2">Access Denied</h3>

          <p className="text-muted mb-1">
            You don't have permission to view{' '}
            <code className="text-danger">{attemptedPath}</code>.
          </p>

          {user && (
            <p className="text-muted small mb-4">
              You're signed in as <b>{user.name}</b> ({user.role}). If you believe
              this is an error, contact your administrator.
            </p>
          )}

          {/* Actions */}
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <Button
              variant="primary"
              onClick={() => navigate(getDashboardPath(user?.role))}
              className="fw-semibold"
            >
              <i className="bi bi-house-door me-1"></i> Back to Dashboard
            </Button>
            <Button
              variant="outline-secondary"
              onClick={handleSignInAsOther}
              className="fw-semibold"
            >
              <i className="bi bi-box-arrow-right me-1"></i> Sign in as someone else
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
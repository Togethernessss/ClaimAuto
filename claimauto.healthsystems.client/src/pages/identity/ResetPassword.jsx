import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { resetPassword, validateResetToken } from '../../services/identity/authService';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tokenChecking, setTokenChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Validate the token as soon as the page loads
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setTokenValid(false);
        setTokenChecking(false);
        return;
      }
      try {
        await validateResetToken(token);
        if (!cancelled) setTokenValid(true);
      } catch {
        if (!cancelled) setTokenValid(false);
      } finally {
        if (!cancelled) setTokenChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data || 'Password reset failed.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="card shadow-lg border-0" style={{ width: '100%', maxWidth: 460 }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-shield-lock-fill text-primary" style={{ fontSize: '3rem' }}></i>
            <h3 className="fw-bold mt-2 mb-1">Choose a new password</h3>
            <p className="text-muted small mb-0">
              Your new password must meet the strength policy.
            </p>
          </div>

          {tokenChecking ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="small text-muted mt-2 mb-0">Validating link...</p>
            </div>
          ) : !tokenValid ? (
            <>
              <Alert variant="danger">
                <i className="bi bi-x-octagon-fill me-2"></i>
                This reset link is invalid or has expired.
              </Alert>
              <div className="text-center">
                <Link to="/forgot-password" className="small fw-semibold text-decoration-none">
                  Request a new link
                </Link>
              </div>
            </>
          ) : success ? (
            <Alert variant="success">
              <i className="bi bi-check-circle-fill me-2"></i>
              Password reset successful. Redirecting to sign in...
            </Alert>
          ) : (
            <>
              {error && (
                <Alert variant="danger" className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>{error}</div>
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">
                    <i className="bi bi-key me-1"></i> New password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <Form.Text className="text-muted">
                    Min 8 chars, with upper, lower, digit, and special character.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-semibold">
                    <i className="bi bi-key-fill me-1"></i> Confirm password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100 py-2 fw-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-1"></i> Reset password
                    </>
                  )}
                </Button>
              </Form>
            </>
          )}

          <div className="text-center mt-4">
            <Link to="/login" className="small fw-semibold text-decoration-none">
              <i className="bi bi-arrow-left me-1"></i> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
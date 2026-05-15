import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../security/AuthContext';
import { getDashboardPath } from '../../security/permissions';
import { login as loginApi } from '../../services/identity/authService';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginApi(email, password);

      if (data.requiresMFA) {
        navigate('/verify-mfa', { state: { mfaToken: data.mfaToken } });
      } else {
        login(data.token, data.user);
        if (data.user.mustChangePassword) {
          navigate('/force-change-password', { replace: true });
        } else {
          navigate(getDashboardPath(data.user.role), { replace: true });
        }
      }
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data || 'Login failed.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="card shadow-lg border-0" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-shield-lock-fill text-primary" style={{ fontSize: '3rem' }}></i>
            <h3 className="fw-bold mt-2 mb-1">ClaimAuto</h3>
            <p className="text-muted small mb-0">Sign in to your account</p>
          </div>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{error}</div>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                <i className="bi bi-envelope me-1"></i> Email
              </Form.Label>
              <Form.Control
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="small fw-semibold">
                <i className="bi bi-key me-1"></i> Password
              </Form.Label>
              <Form.Control
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
                  Signing in...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-1"></i> Sign In
                </>
              )}
            </Button>
          </Form>

          <div className="text-center mt-4">
            <span className="text-muted small">New here? </span>
            <Link to="/register" className="small fw-semibold text-decoration-none">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
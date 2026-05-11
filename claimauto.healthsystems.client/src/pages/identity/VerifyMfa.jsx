import { useState, useEffect } from 'react';                  // ← add useEffect
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../security/AuthContext';
import { getDashboardPath } from '../../security/permissions';
import { verifyMfa } from '../../services/identity/authService';

export default function VerifyMfa() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const mfaToken = location.state?.mfaToken;

  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ FIXED — run redirect AFTER render, not during
  useEffect(() => {
    if (!mfaToken) {
      navigate('/login', { replace: true });
    }
  }, [mfaToken, navigate]);

  if (!mfaToken) return null;     // just render nothing while redirect happens

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await verifyMfa(mfaToken, code);
      login(data.token, data.user);
      navigate(getDashboardPath(data.user.role));
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data || 'Verification failed.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of return JSX stays exactly the same
  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="card shadow-lg border-0" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-shield-check text-success" style={{ fontSize: '3rem' }}></i>
            <h3 className="fw-bold mt-2 mb-1">Verify MFA</h3>
            <p className="text-muted small mb-0">
              Enter the 6-digit code from your Authenticator app
            </p>
          </div>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{error}</div>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-semibold">
                <i className="bi bi-123 me-1"></i> Verification Code
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="text-center fs-4"
                style={{ letterSpacing: '0.5rem', fontWeight: 600 }}
                required
              />
            </Form.Group>

            <Button
              type="submit"
              variant="success"
              className="w-100 py-2 fw-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check me-1"></i> Verify
                </>
              )}
            </Button>
          </Form>

          <div className="text-center mt-4">
            <span
              className="text-muted small"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/login')}
            >
              <i className="bi bi-arrow-left me-1"></i> Back to login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
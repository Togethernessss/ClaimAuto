import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { requestPasswordReset } from '../../services/identity/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data || 'Something went wrong.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Something went wrong.');
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
            <i className="bi bi-envelope-arrow-up-fill text-primary" style={{ fontSize: '3rem' }}></i>
            <h3 className="fw-bold mt-2 mb-1">Forgot password?</h3>
            <p className="text-muted small mb-0">
              Enter your account email and we'll send you a reset link.
            </p>
          </div>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{error}</div>
            </Alert>
          )}

          {submitted ? (
            <Alert variant="success">
              <i className="bi bi-check-circle-fill me-2"></i>
              If that email is registered, a reset link has been sent. The link expires in 30 minutes.
            </Alert>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-4">
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

              <Button
                type="submit"
                variant="primary"
                className="w-100 py-2 fw-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-1"></i> Send reset link
                  </>
                )}
              </Button>
            </Form>
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
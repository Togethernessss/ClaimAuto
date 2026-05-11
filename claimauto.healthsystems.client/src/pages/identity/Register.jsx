import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { register } from '../../services/identity/authService';
import { CreateUserDto } from '../../models/identity/CreateUserDto';

export default function Register() {
  const [form, setForm] = useState(new CreateUserDto({ role: 'Policyholder' }));
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await register(form);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data || 'Registration failed.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 py-4"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="card shadow-lg border-0" style={{ width: '100%', maxWidth: 540 }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-person-plus-fill text-primary" style={{ fontSize: '3rem' }}></i>
            <h3 className="fw-bold mt-2 mb-1">Create Account</h3>
            <p className="text-muted small mb-0">Join ClaimAuto Health Systems</p>
          </div>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{error}</div>
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="d-flex align-items-center">
              <i className="bi bi-check-circle-fill me-2"></i>
              <div>{success}</div>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                <i className="bi bi-person me-1"></i> Full Name
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange('name')}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                <i className="bi bi-envelope me-1"></i> Email
              </Form.Label>
              <Form.Control
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange('email')}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                <i className="bi bi-key me-1"></i> Password
              </Form.Label>
              <Form.Control
                type="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={handleChange('password')}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                <i className="bi bi-people me-1"></i> Role
              </Form.Label>
              <Form.Select value={form.role} onChange={handleChange('role')} required>
                <option value="Admin">Admin</option>
                <option value="InsuranceStaff">Insurance Staff</option>
                <option value="Hospital">Hospital</option>
                <option value="Policyholder">Policyholder</option>
              </Form.Select>
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">
                    <i className="bi bi-telephone me-1"></i> Phone
                  </Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="9000000000"
                    value={form.phone}
                    onChange={handleChange('phone')}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold">
                    <i className="bi bi-building me-1"></i> Department
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Optional"
                    value={form.department}
                    onChange={handleChange('department')}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Button
              type="submit"
              variant="primary"
              className="w-100 py-2 fw-semibold mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Creating account...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle me-1"></i> Create Account
                </>
              )}
            </Button>
          </Form>

          <div className="text-center mt-4">
            <span className="text-muted small">Already have an account? </span>
            <Link to="/login" className="small fw-semibold text-decoration-none">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
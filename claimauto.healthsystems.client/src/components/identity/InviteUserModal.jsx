import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import { inviteUser } from '../../services/identity/authService';
import { useAuth } from '../../security/AuthContext';

export default function InviteUserModal({ show, onClose, onInvited }) {
  const { user } = useAuth();
  const orgName   = user?.organizationName;
  const brandColor = user?.organizationBrandColor || '#6c757d';

  // ── Form fields ────────────────────────────────────────────────────
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [role,       setRole]       = useState('InsuranceStaff');
  const [phone,      setPhone]      = useState('');
  const [department, setDepartment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(false);

  // ── Email validation state ─────────────────────────────────────────
  const [emailError,   setEmailError]   = useState(null);
  const [emailTouched, setEmailTouched] = useState(false);

  // ── Phone validation state ─────────────────────────────────────────
  const [phoneError,   setPhoneError]   = useState(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // ── Reset everything when modal opens ─────────────────────────────
  useEffect(() => {
    if (show) {
      setName(''); setEmail(''); setRole('InsuranceStaff');
      setPhone(''); setDepartment('');
      setError(null); setSuccess(false); setSubmitting(false);
      setEmailError(null); setEmailTouched(false);
      setPhoneError(null); setPhoneTouched(false);
    }
  }, [show]);

  // ── Email validation ──────────────────────────────────────────────
  const validateEmail = (value) => {
    const v = value.trim();
    if (!v) return 'Email address is required.';
    if (v.length > 254) return 'Email address is too long (max 254 characters).';
    if (v.includes(' ')) return 'Email address must not contain spaces.';

    const atIndex = v.indexOf('@');
    if (atIndex === -1) return 'Must include an "@" symbol.';
    if (v.lastIndexOf('@') !== atIndex) return 'Must have exactly one "@" symbol.';

    const local  = v.slice(0, atIndex);
    const domain = v.slice(atIndex + 1);

    if (!local)              return 'Please enter the part before "@".';
    if (local.length > 64)   return 'Part before "@" is too long (max 64 chars).';
    if (!domain)             return 'Please enter the domain after "@".';
    if (!domain.includes('.')) return 'Domain must include a "." (e.g. gmail.com).';

    const parts = domain.split('.');
    if (parts.some((p) => p === '')) return 'Domain cannot have consecutive or trailing dots.';

    const tld = parts[parts.length - 1];
    if (tld.length < 2) return 'Domain extension must be at least 2 characters.';

    return null;
  };

  // ── Phone validation ──────────────────────────────────────────────
  // Optional field — empty is always valid.
  const validatePhone = (value) => {
    const digits = value.replace(/[\s\-().+]/g, '');
    if (digits === '') return null;
    if (!/^\d+$/.test(digits)) return 'Must contain only digits.';
    if (digits.length !== 10)  return `Must be exactly 10 digits (you entered ${digits.length}).`;
    if (!/^[6-9]/.test(digits)) return 'Must start with 6, 7, 8, or 9.';
    return null;
  };

  // ── Handlers ──────────────────────────────────────────────────────
  const handleEmailChange = (e) => {
    const raw = e.target.value;
    setEmail(raw);
    if (emailTouched) setEmailError(validateEmail(raw));
  };
  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(email));
  };

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    setPhone(raw);
    if (phoneTouched) setPhoneError(validatePhone(raw));
  };
  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    setPhoneError(validatePhone(phone));
  };

  // ── Submit guard ──────────────────────────────────────────────────
  // Button is only active when name + email are filled and both fields are valid.
  const emailOk = !validateEmail(email);
  const phoneOk = !validatePhone(phone);
  const canSubmit = name.trim() && emailOk && phoneOk && role && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Force-touch both fields so inline errors appear even if user never blurred.
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    setEmailTouched(true);  setEmailError(emailErr);
    setPhoneTouched(true);  setPhoneError(phoneErr);

    if (!name.trim()) { setError('Full name is required.'); return; }
    if (emailErr)     { setError('Please enter a valid email address.'); return; }
    if (phoneErr)     { setError('Please fix the phone number before sending.'); return; }

    setError(null);
    setSubmitting(true);
    try {
      await inviteUser({ name, email, role, phone: phone || null, department: department || null });
      setSuccess(true);
      if (onInvited) onInvited();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || 'Failed to send invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-envelope-plus text-primary me-2"></i>
          Invite New User
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* ── Org context strip ──────────────────────────────────────── */}
        {orgName && (
          <div
            className="d-flex align-items-center gap-2 mb-3 p-2 rounded"
            style={{ background: `${brandColor}15`, border: `1px solid ${brandColor}40` }}
          >
            <span
              className="rounded-circle d-inline-block flex-shrink-0"
              style={{ width: 10, height: 10, background: brandColor }}
            />
            <small className="text-muted">
              Inviting to <strong style={{ color: brandColor }}>{orgName}</strong>
            </small>
          </div>
        )}

        {success && (
          <Alert variant="success" className="d-flex align-items-center">
            <i className="bi bi-check-circle-fill me-2"></i>
            Invitation sent! User will receive an email with their temp password.
          </Alert>
        )}
        {error && (
          <Alert variant="danger" className="d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{typeof error === 'string' ? error : 'Failed to send invitation.'}</div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit} noValidate>

          {/* ── Full Name ──────────────────────────────────────────── */}
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Full Name *</Form.Label>
            <Form.Control
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              required
            />
          </Form.Group>

          {/* ── Email ─────────────────────────────────────────────── */}
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              Email * <span style={{ color: '#ef4444' }}>*</span>
            </Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
              maxLength={254}
              placeholder="jane@example.com"
              isInvalid={emailTouched && !!emailError}
              isValid={emailTouched && !emailError}
              required
            />
            <Form.Control.Feedback type="invalid">{emailError}</Form.Control.Feedback>
            <Form.Control.Feedback type="valid">Looks good!</Form.Control.Feedback>
          </Form.Group>

          {/* ── Role ──────────────────────────────────────────────── */}
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Role *</Form.Label>
            <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Admin">Admin</option>
              <option value="InsuranceStaff">Insurance Staff</option>
              <option value="Hospital">Hospital</option>
              <option value="Policyholder">Policyholder</option>
            </Form.Select>
          </Form.Group>

          {/* ── Phone + Department ────────────────────────────────── */}
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">
                  Phone <span className="text-muted fw-normal">(optional)</span>
                </Form.Label>
                <InputGroup>
                  <InputGroup.Text
                    style={{
                      background: '#f8fafc',
                      borderRight: 'none',
                      color: '#6b7280',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    +91
                  </InputGroup.Text>
                  <Form.Control
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    maxLength={15}
                    placeholder="98765 43210"
                    isInvalid={phoneTouched && !!phoneError}
                    isValid={phoneTouched && !phoneError && phone.trim() !== ''}
                    style={{ borderLeft: 'none' }}
                  />
                  <Form.Control.Feedback type="invalid">{phoneError}</Form.Control.Feedback>
                  <Form.Control.Feedback type="valid">Looks good!</Form.Control.Feedback>
                </InputGroup>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 3 }}>
                  <i className="bi bi-info-circle me-1"></i>
                  10-digit Indian mobile number starting with 6–9
                </div>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Department</Form.Label>
                <Form.Control
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Optional"
                />
              </Form.Group>
            </Col>
          </Row>

          <Alert variant="info" className="small mb-0">
            <i className="bi bi-info-circle me-2"></i>
            A temporary password will be emailed to the user. They will be required to change it on first login.
          </Alert>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting
            ? (<><Spinner animation="border" size="sm" className="me-1" /> Sending...</>)
            : (<><i className="bi bi-send me-1"></i> Send Invitation</>)}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

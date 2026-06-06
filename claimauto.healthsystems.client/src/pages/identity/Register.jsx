import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Alert, Spinner, Row, Col, InputGroup } from 'react-bootstrap';
import { register } from '../../services/identity/authService';
import { getAllOrganizations } from '../../services/organizations/organizationService';
import { CreateUserDto } from '../../models/identity/CreateUserDto';

export default function Register() {
  const navigate = useNavigate();

  // ── Form state ────────────────────────────────────────────────────
  const [form, setForm] = useState(new CreateUserDto({ role: 'Policyholder' }));
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Phone validation state ─────────────────────────────────────────
  const [phoneError, setPhoneError] = useState(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // ── Email validation state ─────────────────────────────────────────
  const [emailError, setEmailError] = useState(null);
  const [emailTouched, setEmailTouched] = useState(false);

  // ── Organizations state ───────────────────────────────────────────
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgsError, setOrgsError] = useState(null);

  // ── Live password strength checks ─────────────────────────────────
  const pw = form.password;
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw),
  };
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const passwordValid = passedChecks === 5;
  const strengthLabel =
    passedChecks <= 2 ? 'Weak' :
    passedChecks <= 4 ? 'Medium' : 'Strong';
  const strengthColor =
    passedChecks <= 2 ? '#ef4444' :
    passedChecks <= 4 ? '#f59e0b' : '#10b981';

  // ── Load organizations on mount ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const orgs = await getAllOrganizations();
        if (cancelled) return;
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setForm((prev) => ({ ...prev, organizationId: orgs[0].organizationID }));
        }
      } catch {
        if (!cancelled) setOrgsError('Unable to load insurance providers. Please refresh.');
      } finally {
        if (!cancelled) setLoadingOrgs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Phone validation ──────────────────────────────────────────────
  // Returns an error string if invalid, null if valid.
  // Empty value is always valid (field is optional).
  const validatePhone = (value) => {
    const digits = value.replace(/[\s\-().+]/g, '');
    if (digits === '') return null;
    if (!/^\d+$/.test(digits)) return 'Phone number must contain only digits.';
    if (digits.length !== 10) return `Must be exactly 10 digits (you entered ${digits.length}).`;
    if (!/^[6-9]/.test(digits)) return 'Must start with 6, 7, 8, or 9.';
    return null;
  };

  const phoneIsValid = phoneError === null;

  // ── Email validation ──────────────────────────────────────────────
  // Required field. Returns an error string if invalid, null if valid.
  const validateEmail = (value) => {
    const v = value.trim();
    if (!v) return 'Email address is required.';
    if (v.length > 254) return 'Email address is too long (max 254 characters).';
    if (v.includes(' ')) return 'Email address must not contain spaces.';

    const atIndex = v.indexOf('@');
    if (atIndex === -1) return 'Email address must include an "@" symbol.';
    if (v.lastIndexOf('@') !== atIndex) return 'Email address must have exactly one "@" symbol.';

    const local = v.slice(0, atIndex);
    const domain = v.slice(atIndex + 1);

    if (!local) return 'Please enter the part before "@".';
    if (local.length > 64) return 'The part before "@" is too long (max 64 characters).';
    if (!domain) return 'Please enter the domain after "@".';
    if (!domain.includes('.')) return 'Email domain must include a "." (e.g., gmail.com).';

    const parts = domain.split('.');
    if (parts.some((p) => p === '')) return 'Email domain cannot have consecutive or trailing dots.';

    const tld = parts[parts.length - 1];
    if (tld.length < 2) return 'Domain extension must be at least 2 characters (e.g., .com, .in).';

    return null;
  };

  // ── Handlers ──────────────────────────────────────────────────────
  const handleChange = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    setForm({ ...form, phone: raw });
    if (phoneTouched) setPhoneError(validatePhone(raw));
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    setPhoneError(validatePhone(form.phone));
  };

  const handleEmailChange = (e) => {
    const raw = e.target.value;
    setForm({ ...form, email: raw });
    if (emailTouched) setEmailError(validateEmail(raw));
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailError(validateEmail(form.email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.organizationId) {
      setError('Please select an insurance provider.');
      return;
    }
    // Force-touch email so the inline error becomes visible.
    const emailValidationError = validateEmail(form.email);
    setEmailTouched(true);
    setEmailError(emailValidationError);
    if (emailValidationError) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!passwordValid) {
      setError('Your password does not meet all the requirements.');
      return;
    }
    // Force-touch the phone field so the inline error becomes visible.
    const phoneValidationError = validatePhone(form.phone);
    setPhoneTouched(true);
    setPhoneError(phoneValidationError);
    if (phoneValidationError) {
      setError('Please fix the phone number before submitting.');
      return;
    }
    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
      setSuccess('Account created! Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1600);
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data || 'Registration failed.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const formReady =
    !submitting &&
    !loadingOrgs &&
    passwordValid &&
    termsAccepted &&
    form.organizationId &&
    phoneIsValid &&
    !validateEmail(form.email);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Row className="g-0" style={{ minHeight: '100vh' }}>

        {/* ═══════════════════════════════════════════════════════════
            LEFT PANEL — Brand & Marketing (desktop only)
            ═══════════════════════════════════════════════════════════ */}
        <Col
          lg={5}
          className="d-none d-lg-flex flex-column justify-content-between p-5 text-white position-relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)',
          }}
        >
          {/* Decorative circles */}
          <div
            className="position-absolute"
            style={{
              width: 400, height: 400, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              top: -100, right: -100,
            }}
          />
          <div
            className="position-absolute"
            style={{
              width: 300, height: 300, borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
              bottom: -80, left: -80,
            }}
          />

          {/* Logo */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="d-flex align-items-center gap-2 mb-1">
              <i className="bi bi-heart-pulse-fill fs-2"></i>
              <h2 className="fw-bold mb-0">ClaimAuto</h2>
            </div>
            <p className="opacity-75 small mb-0">Health Systems</p>
          </div>

          {/* Hero + value props */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 className="display-5 fw-bold mb-3" style={{ lineHeight: 1.15 }}>
              Health insurance,<br />made simple.
            </h1>
            <p className="opacity-90 mb-4" style={{ fontSize: '1.05rem' }}>
              Manage your policy, file claims, and track your family's coverage —
              all in one secure platform.
            </p>

            <ul className="list-unstyled mb-0">
              {[
                { icon: 'bi-shield-lock-fill', title: 'Bank-grade encryption', desc: 'Your data is protected with AES-256 end-to-end' },
                { icon: 'bi-lightning-charge-fill', title: 'Fast claim processing', desc: 'Most claims approved within 3–5 business days' },
                { icon: 'bi-people-fill', title: 'Family coverage', desc: 'Track up to 8 family members from one account' },
                { icon: 'bi-headset', title: '24/7 customer support', desc: 'Reach a real person anytime via chat or phone' },
              ].map((v) => (
                <li key={v.title} className="d-flex align-items-start gap-3 mb-3">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)' }}
                  >
                    <i className={`${v.icon}`} style={{ fontSize: '1rem' }}></i>
                  </div>
                  <div>
                    <div className="fw-semibold">{v.title}</div>
                    <div className="opacity-75 small">{v.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust footer */}
          <div
            className="d-flex flex-wrap gap-3 small pt-3"
            style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.15)' }}
          >
            <div className="d-flex align-items-center gap-1 opacity-75">
              <i className="bi bi-patch-check-fill"></i> ISO 27001
            </div>
            <div className="d-flex align-items-center gap-1 opacity-75">
              <i className="bi bi-shield-check"></i> HIPAA-compliant
            </div>
            <div className="d-flex align-items-center gap-1 opacity-75">
              <i className="bi bi-award-fill"></i> IRDAI Approved
            </div>
          </div>
        </Col>

        {/* ═══════════════════════════════════════════════════════════
            RIGHT PANEL — Registration Form
            ═══════════════════════════════════════════════════════════ */}
        <Col lg={7} className="d-flex align-items-center justify-content-center p-3 p-md-5">
          <div className="w-100" style={{ maxWidth: 580 }}>

            {/* Mobile-only mini logo */}
            <div className="d-lg-none text-center mb-4">
              <h3 className="fw-bold mb-0" style={{ color: '#4f46e5' }}>
                <i className="bi bi-heart-pulse-fill me-2"></i>ClaimAuto
              </h3>
              <p className="text-muted small mb-0">Health Systems</p>
            </div>

            {/* Page header */}
            <div className="mb-4">
              <h2 className="fw-bold mb-2" style={{ fontSize: '1.75rem' }}>
                Create your account
              </h2>
              <p className="text-muted mb-0">
                Already have one?{' '}
                <Link to="/login" className="fw-semibold text-decoration-none" style={{ color: '#4f46e5' }}>
                  Sign in
                </Link>
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <Alert variant="danger" className="d-flex align-items-start py-2 rounded-3">
                <i className="bi bi-exclamation-circle-fill me-2 mt-1"></i>
                <div className="small">{error}</div>
              </Alert>
            )}
            {success && (
              <Alert variant="success" className="d-flex align-items-start py-2 rounded-3">
                <i className="bi bi-check-circle-fill me-2 mt-1"></i>
                <div className="small">{success}</div>
              </Alert>
            )}

            <Form onSubmit={handleSubmit} noValidate>

              {/* ── SECTION 1: Insurance Provider ─────────────────── */}
              <SectionHeader number={1} title="Choose your insurance provider" />

              {loadingOrgs && (
                <div className="text-center py-4 border rounded-3 bg-light">
                  <Spinner animation="border" size="sm" />
                  <div className="small text-muted mt-2">Loading providers...</div>
                </div>
              )}

              {orgsError && (
                <Alert variant="warning" className="small py-2">
                  <i className="bi bi-exclamation-circle me-2"></i>{orgsError}
                </Alert>
              )}

              {!loadingOrgs && !orgsError && (
                <Row className="g-2 mb-1">
                  {organizations.map((org) => {
                    const isSelected = form.organizationId === org.organizationID;
                    const brand = org.brandColor || '#6b7280';
                    return (
                      <Col xs={12} sm={4} key={org.organizationID}>
                        <div
                          onClick={() => setForm({ ...form, organizationId: org.organizationID })}
                          className="h-100 p-3 d-flex flex-column align-items-center text-center position-relative"
                          style={{
                            cursor: 'pointer',
                            borderRadius: 12,
                            border: `2px solid ${isSelected ? brand : '#e5e7eb'}`,
                            background: isSelected ? `${brand}10` : 'white',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.borderColor = '#9ca3af';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          {isSelected && (
                            <div
                              className="position-absolute rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                top: 8, right: 8, width: 22, height: 22,
                                background: brand, color: 'white', fontSize: '0.75rem',
                              }}
                            >
                              <i className="bi bi-check-lg"></i>
                            </div>
                          )}
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold mb-2"
                            style={{
                              width: 48, height: 48,
                              background: brand, color: 'white', fontSize: '1.3rem',
                            }}
                          >
                            {org.name.charAt(0)}
                          </div>
                          <div className="fw-semibold" style={{ fontSize: '0.85rem', lineHeight: 1.25 }}>
                            {org.name}
                          </div>
                          <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                            {org.shortCode}
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              )}

              <div className="d-flex align-items-start gap-2 text-muted mb-4 mt-2" style={{ fontSize: '0.78rem' }}>
                <i className="bi bi-info-circle"></i>
                <span>
                  Signing up as an <strong>Individual Policyholder</strong>.
                  Hospital staff, insurance employees, or admins — please ask your
                  organization for an invitation.
                </span>
              </div>

              {/* ── SECTION 2: Your information ────────────────────── */}
              <SectionHeader number={2} title="Your information" />

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">Full name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                  size="lg"
                  style={{ fontSize: '0.95rem' }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">
                  Email address <span style={{ color: '#ef4444' }}>*</span>
                </Form.Label>
                <Form.Control
                  type="email"
                  placeholder="jane@example.com"
                  value={form.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  maxLength={254}
                  isInvalid={emailTouched && !!emailError}
                  isValid={emailTouched && !emailError}
                  size="lg"
                  style={{ fontSize: '0.95rem' }}
                />
                <Form.Control.Feedback type="invalid">
                  {emailError}
                </Form.Control.Feedback>
                <Form.Control.Feedback type="valid">
                  Looks good!
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-semibold text-secondary">
                  Phone number <span className="text-muted fw-normal">(optional)</span>
                </Form.Label>
                <InputGroup size="lg">
                  <InputGroup.Text
                    style={{
                      background: '#f8fafc',
                      borderRight: 'none',
                      color: '#6b7280',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                    }}
                  >
                    +91
                  </InputGroup.Text>
                  <Form.Control
                    type="tel"
                    placeholder="98765 43210"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    onBlur={handlePhoneBlur}
                    maxLength={15}
                    isInvalid={phoneTouched && !!phoneError}
                    isValid={phoneTouched && !phoneError && form.phone.trim() !== ''}
                    size="lg"
                    style={{ fontSize: '0.95rem', borderLeft: 'none' }}
                  />
                  <Form.Control.Feedback type="invalid">
                    {phoneError}
                  </Form.Control.Feedback>
                  <Form.Control.Feedback type="valid">
                    Looks good!
                  </Form.Control.Feedback>
                </InputGroup>
                <div className="d-flex align-items-center gap-1 mt-1" style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  <i className="bi bi-info-circle"></i>
                  10-digit Indian mobile number starting with 6–9
                </div>
              </Form.Group>

              {/* ── SECTION 3: Account security ────────────────────── */}
              <SectionHeader number={3} title="Account security" />

              <Form.Group className="mb-2">
                <Form.Label className="small fw-semibold text-secondary">Password</Form.Label>
                <InputGroup size="lg">
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={handleChange('password')}
                    required
                    autoComplete="new-password"
                    style={{ fontSize: '0.95rem' }}
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                  </Button>
                </InputGroup>
              </Form.Group>

              {/* Password strength meter + checklist */}
              {pw.length > 0 && (
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div className="flex-grow-1 rounded-pill" style={{ height: 5, background: '#e5e7eb' }}>
                      <div
                        className="rounded-pill h-100"
                        style={{
                          width: `${(passedChecks / 5) * 100}%`,
                          background: strengthColor,
                          transition: 'all 0.2s',
                        }}
                      />
                    </div>
                    <small className="fw-semibold" style={{ color: strengthColor, minWidth: 55, textAlign: 'right' }}>
                      {strengthLabel}
                    </small>
                  </div>

                  <Row className="g-1" style={{ fontSize: '0.75rem' }}>
                    {[
                      { ok: checks.length, label: '8+ characters' },
                      { ok: checks.upper, label: 'Uppercase letter' },
                      { ok: checks.lower, label: 'Lowercase letter' },
                      { ok: checks.digit, label: 'A number' },
                      { ok: checks.special, label: 'Special character' },
                    ].map((rule) => (
                      <Col xs={6} key={rule.label}>
                        <div className={rule.ok ? 'text-success' : 'text-muted'}>
                          <i className={`bi bi-${rule.ok ? 'check-circle-fill' : 'circle'} me-1`}></i>
                          {rule.label}
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              {/* Terms checkbox */}
              <Form.Group className="mb-4">
                <Form.Check
                  type="checkbox"
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  label={
                    <span className="small text-muted">
                      I agree to the{' '}
                      <a href="#terms" className="fw-semibold text-decoration-none" style={{ color: '#4f46e5' }}>
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#privacy" className="fw-semibold text-decoration-none" style={{ color: '#4f46e5' }}>
                        Privacy Policy
                      </a>
                      . I understand that my health information will be handled
                      according to HIPAA regulations.
                    </span>
                  }
                />
              </Form.Group>

              {/* Submit button */}
              <Button
                type="submit"
                size="lg"
                disabled={!formReady}
                className="w-100 fw-semibold py-2 border-0"
                style={{
                  background: formReady
                    ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    : '#cbd5e1',
                  fontSize: '0.95rem',
                  transition: 'opacity 0.2s',
                }}
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creating your account...
                  </>
                ) : (
                  <>
                    Create account
                    <i className="bi bi-arrow-right ms-2"></i>
                  </>
                )}
              </Button>

              {/* Mobile trust footer */}
              <div className="d-lg-none d-flex justify-content-center gap-3 text-muted mt-4" style={{ fontSize: '0.72rem' }}>
                <div><i className="bi bi-lock-fill me-1"></i>ISO 27001</div>
                <div><i className="bi bi-shield-check me-1"></i>HIPAA</div>
                <div><i className="bi bi-award-fill me-1"></i>IRDAI</div>
              </div>

            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Reusable numbered section header (1, 2, 3 badges)
// ─────────────────────────────────────────────────────────────────
function SectionHeader({ number, title }) {
  return (
    <div className="d-flex align-items-center mb-3">
      <div
        className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0 me-2"
        style={{
          width: 26, height: 26,
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: 'white', fontSize: '0.8rem',
        }}
      >
        {number}
      </div>
      <h6 className="fw-bold mb-0" style={{ fontSize: '0.95rem' }}>
        {title}
      </h6>
    </div>
  );
}
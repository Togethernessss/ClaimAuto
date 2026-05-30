import { useState } from 'react';
import { Card, Row, Col, Badge, Button, Form, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { updateUser } from '../../services/identity/userService';
import { UpdateUserDto } from '../../models/identity/UpdateUserDto';
import { useAuth } from '../../security/AuthContext';

export default function ProfileInfoCard({ user }) {
  const { login, token } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });

  // ── Phone validation state ────────────────────────────────────
  const [phoneError,   setPhoneError]   = useState(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const validatePhone = (value) => {
    if (!value || value.trim() === '') return null; // optional field
    const stripped = value.replace(/[\s\-().+]/g, '');
    if (!/^\d+$/.test(stripped))  return 'Phone number must contain digits only.';
    if (stripped.length !== 10)   return 'Phone number must be exactly 10 digits.';
    if (!/^[6-9]/.test(stripped)) return 'Indian mobile numbers must start with 6, 7, 8, or 9.';
    return null;
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, phone: value }));
    if (phoneTouched) setPhoneError(validatePhone(value));
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    setPhoneError(validatePhone(form.phone));
  };

  if (!user) return null;

  const roleBadgeBg = {
    Admin: 'danger',
    InsuranceStaff: 'warning',
    Hospital: 'info',
    Policyholder: 'success',
  }[user.role] || 'secondary';

  // ── Same logic as before ──────────────────────────────────────
  const handleEdit = () => {
    setForm({ name: user.name || '', phone: user.phone || '', department: user.department || '' });
    setError(null);
    setSuccess(null);
    setPhoneError(null);
    setPhoneTouched(false);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
    setPhoneError(null);
    setPhoneTouched(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Force-touch phone validation before sending to API
    const phoneErr = validatePhone(form.phone);
    setPhoneTouched(true);
    setPhoneError(phoneErr);
    if (phoneErr) return; // block save with inline error shown

    setError(null); setSuccess(null); setSaving(true);
    try {
      const dto = new UpdateUserDto({
        name: form.name.trim() || null,
        phone: form.phone.trim() || null,
        department: form.department.trim() || null,
      });
      await updateUser(user.userID, dto);
      login(token, {
        ...user,
        name: dto.name ?? user.name,
        phone: dto.phone ?? user.phone,
        department: dto.department ?? user.department,
      });
      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch (err) {
      const apiMsg = err.response?.data?.message || err.response?.data || 'Failed to update profile.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    // AFTER
    <Card
      className="border-0"
      style={{ boxShadow: '0 4px 24px rgba(102,126,234,0.08)', borderRadius: 16 }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <Card.Header
        className="border-0 py-3 px-4 d-flex justify-content-between align-items-center"
        style={{
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderRadius: '16px 16px 0 0',
        }}
      >
        <div>
          <h6 className="mb-0 fw-bold" style={{ color: '#4c1d95' }}>
            <i className="bi bi-person-vcard me-2" style={{ color: '#7c3aed' }}></i>
            Profile Information
          </h6>
          <small style={{ color: '#7c3aed', opacity: 0.7 }}>
            {editing ? 'Make your changes, then click Save.' : 'Your personal account details'}
          </small>
        </div>

        {!editing ? (
          <Button
            size="sm"
            onClick={handleEdit}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none', borderRadius: 8, fontSize: 13,
            }}
          >
            <i className="bi bi-pencil-fill me-1"></i> Edit Profile
          </Button>
        ) : (
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="sm" onClick={handleCancel} disabled={saving}
              style={{ borderRadius: 8, fontSize: 13 }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none', borderRadius: 8, fontSize: 13,
              }}>
              {saving
                ? <><Spinner animation="border" size="sm" className="me-1" />Saving...</>
                : <><i className="bi bi-check2 me-1"></i>Save Changes</>
              }
            </Button>
          </div>
        )}
      </Card.Header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <Card.Body className="px-4 py-4">
        {error && (
          <Alert variant="danger" className="d-flex align-items-center rounded-3 py-2 mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="d-flex align-items-center rounded-3 py-2 mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>
            <div>{success}</div>
          </Alert>
        )}

        <Form onSubmit={handleSave}>
          <Row className="g-3">

            {/* Full Name — editable */}
            <Col md={6}>
              <FieldBox icon="bi-person-fill" label="Full Name" editing={editing}>
                {editing ? (
                  <Form.Control type="text" value={form.name} required
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={saving} className="rounded-3 border-0 bg-transparent p-0"
                    style={{ outline: 'none', boxShadow: 'none', fontSize: 14, color: '#1e1b4b', fontWeight: 600 }}
                  />
                ) : (
                  <span style={{ color: '#1e1b4b', fontWeight: 600, fontSize: 14 }}>{user.name}</span>
                )}
              </FieldBox>
            </Col>

            {/* Email — read-only */}
            <Col md={6}>
              <FieldBox icon="bi-envelope-fill" label="Email Address" readOnly>
                <span style={{ color: '#1e1b4b', fontWeight: 600, fontSize: 14 }}>{user.email}</span>
              </FieldBox>
            </Col>

            {/* Role — read-only */}
            <Col md={6}>
              <FieldBox icon="bi-shield-fill-check" label="Role" readOnly>
                <Badge bg={roleBadgeBg} className="rounded-pill px-3 py-2" style={{ fontSize: 12 }}>
                  {user.role}
                </Badge>
              </FieldBox>
            </Col>

            {/* Phone — editable with Indian mobile validation */}
            <Col md={6}>
              <FieldBox icon="bi-telephone-fill" label="Phone Number" editing={editing}>
                {editing ? (
                  <>
                    <InputGroup size="sm">
                      <InputGroup.Text
                        style={{
                          background: '#f3e8ff',
                          color: '#7c3aed',
                          border: `1px solid ${phoneTouched && phoneError ? '#dc2626' : '#a78bfa'}`,
                          borderRight: 'none',
                          fontSize: 13,
                          fontWeight: 700,
                          borderRadius: '6px 0 0 6px',
                        }}
                      >
                        +91
                      </InputGroup.Text>
                      <Form.Control
                        type="tel"
                        placeholder="9876543210"
                        value={form.phone}
                        onChange={handlePhoneChange}
                        onBlur={handlePhoneBlur}
                        maxLength={15}
                        disabled={saving}
                        isInvalid={phoneTouched && !!phoneError}
                        isValid={phoneTouched && !phoneError && !!form.phone}
                        style={{
                          fontSize: 13,
                          color: '#1e1b4b',
                          fontWeight: 600,
                          borderRadius: '0 6px 6px 0',
                        }}
                      />
                    </InputGroup>
                    {/* Inline error */}
                    {phoneTouched && phoneError && (
                      <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 5 }}>
                        <i className="bi bi-exclamation-circle-fill me-1"></i>
                        {phoneError}
                      </div>
                    )}
                    {/* Inline success */}
                    {phoneTouched && !phoneError && form.phone && (
                      <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: 5 }}>
                        <i className="bi bi-check-circle-fill me-1"></i>
                        Valid Indian mobile number
                      </div>
                    )}
                    {/* Hint for empty (optional) */}
                    {!form.phone && (
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 4 }}>
                        Optional — 10 digits, starting with 6–9
                      </div>
                    )}
                  </>
                ) : (
                  <span style={{ color: user.phone ? '#1e1b4b' : '#9ca3af', fontWeight: 600, fontSize: 14 }}>
                    {user.phone || '—'}
                  </span>
                )}
              </FieldBox>
            </Col>

            {/* Department — editable */}
            <Col md={6}>
              <FieldBox icon="bi-building-fill" label="Department" editing={editing}>
                {editing ? (
                  <Form.Control type="text" placeholder="Optional" value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    disabled={saving} className="rounded-3 border-0 bg-transparent p-0"
                    style={{ outline: 'none', boxShadow: 'none', fontSize: 14, color: '#1e1b4b', fontWeight: 600 }}
                  />
                ) : (
                  <span style={{ color: user.department ? '#1e1b4b' : '#9ca3af', fontWeight: 600, fontSize: 14 }}>
                    {user.department || '—'}
                  </span>
                )}
              </FieldBox>
            </Col>

            {/* Account Status — read-only */}
            <Col md={6}>
              <FieldBox icon="bi-toggles2" label="Account Status" readOnly>
                <Badge
                  className="rounded-pill px-3 py-2"
                  style={{ background: user.status === 'Active' ? '#10b981' : '#6b7280', fontSize: 12 }}
                >
                  <i className={`bi ${user.status === 'Active' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} me-1`}></i>
                  {user.status}
                </Badge>
              </FieldBox>
            </Col>

          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

// ── Local helper: styled box for each field ───────────────────────
function FieldBox({ icon, label, readOnly = false, editing = false, children }) {
  return (
    <div
      className="p-3 rounded-3 h-100"
      style={{
        background: editing && !readOnly ? '#faf5ff' : '#f9fafb',
        border: `1.5px solid ${editing && !readOnly ? '#a78bfa' : '#e5e7eb'}`,
        transition: 'border-color 0.2s, background 0.2s',
        minHeight: 72,
      }}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <small
          className="text-uppercase fw-bold d-flex align-items-center gap-1"
          style={{ color: '#7c3aed', fontSize: 10, letterSpacing: '0.05em' }}
        >
          <i className={`bi ${icon}`}></i>
          {label}
        </small>
        {readOnly && (
          <span
            className="badge rounded-pill"
            style={{ background: '#f3f4f6', color: '#9ca3af', fontSize: 9, padding: '2px 6px' }}
          >
            read-only
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
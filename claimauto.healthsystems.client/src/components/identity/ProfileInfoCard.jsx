import { useState } from 'react';
import { Card, Row, Col, Badge, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { updateUser } from '../../services/identity/userService';
import { UpdateUserDto } from '../../models/identity/UpdateUserDto';
import { useAuth } from '../../security/AuthContext';

/**
 * Profile info card with read-mode + edit-mode.
 *
 * Editable fields:  name, phone, department
 * Read-only fields: email, role, status (Admin-managed)
 *
 * On save:
 *   - PUT /api/users/{id} with UpdateUserDto
 *   - Update AuthContext (which writes to localStorage)
 *   - Drop back into read mode
 *
 * Props:
 *   user — current user object from useAuth()
 */
export default function ProfileInfoCard({ user }) {
  const { login, token } = useAuth();   // we'll re-store user with login(token, updatedUser)

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form state — pre-populated from the user object when entering edit mode
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });

  if (!user) return null;

  const roleBadgeBg = {
    Admin: 'danger',
    InsuranceStaff: 'warning',
    Hospital: 'info',
    Policyholder: 'success',
  }[user.role] || 'secondary';

  const handleEdit = () => {
    // Reset form to current values when entering edit mode
    setForm({
      name: user.name || '',
      phone: user.phone || '',
      department: user.department || '',
    });
    setError(null);
    setSuccess(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const dto = new UpdateUserDto({
        name: form.name.trim() || null,
        phone: form.phone.trim() || null,
        department: form.department.trim() || null,
      });

      await updateUser(user.userID, dto);

      // Push the updated values into AuthContext so navbar, sidebar, etc. see them.
      // Spreading user first preserves email, role, mfaEnabled, etc.
      const updatedUser = {
        ...user,
        name: dto.name ?? user.name,
        phone: dto.phone ?? user.phone,
        department: dto.department ?? user.department,
      };
      login(token, updatedUser);

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
    <Card className="border-0 shadow-sm">
      <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
        <div>
          <h6 className="mb-0 fw-semibold">
            <i className="bi bi-person-vcard text-primary me-2"></i>
            Profile Information
          </h6>
          <small className="text-muted">
            {editing
              ? 'Make your changes, then click Save.'
              : 'Your account details.'}
          </small>
        </div>

        {/* Edit / Save / Cancel buttons */}
        {!editing ? (
          <Button variant="outline-primary" size="sm" onClick={handleEdit}>
            <i className="bi bi-pencil me-1"></i> Edit
          </Button>
        ) : (
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check2 me-1"></i> Save
                </>
              )}
            </Button>
          </div>
        )}
      </Card.Header>

      <Card.Body>
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

        <Form onSubmit={handleSave}>
          <Row className="g-3">
            {/* Name — editable */}
            <Col md={6}>
              <FieldLabel icon="bi-person" label="Full Name" />
              {editing ? (
                <Form.Control
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={saving}
                  required
                />
              ) : (
                <div className="fs-6">{user.name}</div>
              )}
            </Col>

            {/* Email — read only */}
            <Col md={6}>
              <FieldLabel icon="bi-envelope" label="Email Address" readOnly />
              <div className="fs-6">{user.email}</div>
            </Col>

            {/* Role — read only */}
            <Col md={6}>
              <FieldLabel icon="bi-shield-check" label="Role" readOnly />
              <Badge bg={roleBadgeBg}>{user.role}</Badge>
            </Col>

            {/* Phone — editable */}
            <Col md={6}>
              <FieldLabel icon="bi-telephone" label="Phone" />
              {editing ? (
                <Form.Control
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={saving}
                />
              ) : (
                <div className="fs-6">{user.phone || '—'}</div>
              )}
            </Col>

            {/* Department — editable */}
            <Col md={6}>
              <FieldLabel icon="bi-building" label="Department" />
              {editing ? (
                <Form.Control
                  type="text"
                  placeholder="Optional"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  disabled={saving}
                />
              ) : (
                <div className="fs-6">{user.department || '—'}</div>
              )}
            </Col>

            {/* Status — read only */}
            <Col md={6}>
              <FieldLabel icon="bi-toggle-on" label="Account Status" readOnly />
              <Badge bg={user.status === 'Active' ? 'success' : 'secondary'}>
                {user.status}
              </Badge>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
}

/**
 * Tiny helper for the label row above each field.
 */
function FieldLabel({ icon, label, readOnly = false }) {
  return (
    <div className="small text-muted text-uppercase fw-bold mb-1">
      <i className={`${icon} me-1`}></i>
      {label}
      {readOnly && (
        <span className="ms-2 text-muted" style={{ fontSize: 10, fontWeight: 'normal', textTransform: 'none' }}>
          (read-only)
        </span>
      )}
    </div>
  );
}
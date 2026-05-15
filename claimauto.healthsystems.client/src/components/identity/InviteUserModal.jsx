import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { inviteUser } from '../../services/identity/authService';

export default function InviteUserModal({ show, onClose, onInvited }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('InsuranceStaff');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (show) {
      setName(''); setEmail(''); setRole('InsuranceStaff');
      setPhone(''); setDepartment('');
      setError(null); setSuccess(false); setSubmitting(false);
    }
  }, [show]);

  const canSubmit = name.trim() && email.trim() && role && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
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

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Full Name *</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Email *</Form.Label>
            <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" required />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Role *</Form.Label>
            <Form.Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Admin">Admin</option>
              <option value="InsuranceStaff">Insurance Staff</option>
              <option value="Hospital">Hospital</option>
              <option value="Policyholder">Policyholder</option>
            </Form.Select>
          </Form.Group>

          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Phone</Form.Label>
                <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold">Department</Form.Label>
                <Form.Control value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Optional" />
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
          {submitting ? (<><Spinner animation="border" size="sm" className="me-1" /> Sending...</>) : (<><i className="bi bi-send me-1"></i> Send Invitation</>)}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
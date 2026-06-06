import {
  Modal, Form, Button, Alert, Spinner, Row, Col,
} from 'react-bootstrap';
import { formatDate } from '../utils/memberHelpers';

export default function EditModal({
  show,
  loading,
  error,
  form,
  member,       // original member being edited
  onHide,
  onFieldChange,
  onSubmit,
}) {
  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static" scrollable>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-pencil text-warning me-2"></i>
          Edit Member
        </Modal.Title>
      </Modal.Header>

      {member && (
        <Form onSubmit={onSubmit}>
          <Modal.Body className="pt-3" style={{ overflowY: 'auto', maxHeight: '65vh' }}>

            {/* Locked fields banner */}
            <Alert variant="info" className="py-2 small mb-3">
              <i className="bi bi-lock-fill me-2"></i>
              <strong>Policy</strong> ({member.policyName}),{' '}
              <strong>DOB</strong> ({formatDate(member.dob)}) and{' '}
              <strong>Gender</strong> ({member.gender}) are locked.
            </Alert>

            {error && (
              <Alert variant="danger" className="d-flex align-items-center py-2">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </Alert>
            )}

            <Row className="g-3">

              {/* Name */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Full Name</Form.Label>
                  <Form.Control
                    value={form.name}
                    onChange={onFieldChange('name')}
                    required
                    minLength={2}
                  />
                </Form.Group>
              </Col>

              {/* Status */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Status</Form.Label>
                  <Form.Select
                    value={form.status}
                    onChange={onFieldChange('status')}
                  >
                    <option value="">— no change —</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              {/* Coverage End */}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Coverage End</Form.Label>
                  <Form.Control
                    type="date"
                    value={form.coverageEnd}
                    onChange={onFieldChange('coverageEnd')}
                    min={member?.coverageStart
                      ? member.coverageStart.split('T')[0]
                      : undefined}
                    max={member?.policyEffectiveTo
                      ? member.policyEffectiveTo.split('T')[0]
                      : undefined}
                  />
                  <Form.Text className="text-muted">
                    Leave blank for open-ended coverage.
                    {member?.policyEffectiveTo && (
                      ` Cannot exceed policy end (${member.policyEffectiveTo.split('T')[0]}).`
                    )}
                  </Form.Text>
                </Form.Group>
              </Col>

              {/* Contact Info */}
              <Col md={6}>
                <Form.Group>
                    <Form.Label className="small fw-semibold">Phone</Form.Label>
                    <Form.Control
                    type="tel"
                    placeholder="e.g. 9000000000"
                    value={form.contactPhone}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      onFieldChange('contactPhone')({ target: { value: digits } });
                    }}
                    maxLength={10}
                    />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                    <Form.Label className="small fw-semibold">Email</Form.Label>
                    <Form.Control
                    type="email"
                    placeholder="e.g. member@example.com"
                    value={form.contactEmail}
                    onChange={onFieldChange('contactEmail')}
                    />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                    <Form.Label className="small fw-semibold">Address</Form.Label>
                    <Form.Control
                    placeholder="e.g. 123 MG Road, Mumbai"
                    value={form.contactAddress}
                    onChange={onFieldChange('contactAddress')}
                    />
                </Form.Group>
              </Col>

            </Row>
          </Modal.Body>

          <Modal.Footer className="border-0">
            <Button variant="light" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="warning"
              className="px-4 fw-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check2-circle me-2"></i>
                  Save Changes
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      )}
    </Modal>
  );
}
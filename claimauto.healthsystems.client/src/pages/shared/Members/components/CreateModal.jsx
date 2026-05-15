import {
  Modal, Form, Button, Alert, Spinner, Row, Col,
} from 'react-bootstrap';

export default function CreateModal({
  show,
  loading,
  error,
  form,
  policies,       // array of active policies for dropdown
  onHide,
  onFieldChange,
  onSubmit,
}) {
  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-person-plus text-primary me-2"></i>
          Enroll New Member
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={onSubmit}>
        <Modal.Body className="pt-3" style={{ overflowY: 'auto', maxHeight: '65vh' }}>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          <Row className="g-3">

            {/* Policy dropdown */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Policy <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.policyID}
                  onChange={onFieldChange('policyID')}
                  required
                >
                  <option value="">— Select a policy —</option>
                  {policies.map((p) => (
                    <option key={p.policyID} value={p.policyID}>
                      {p.planName} ({p.planCode})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Cannot be changed after enrollment.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Full Name */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Full Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="e.g. Arjun Sharma"
                  value={form.name}
                  onChange={onFieldChange('name')}
                  required
                />
              </Form.Group>
            </Col>

            {/* Member Number */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Member Number <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="e.g. MEM-2025-001"
                  value={form.memberNumber}
                  onChange={onFieldChange('memberNumber')}
                  required
                />
                <Form.Text className="text-muted">
                  Unique identifier. Cannot be changed after enrollment.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Date of Birth */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Date of Birth <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.dob}
                  onChange={onFieldChange('dob')}
                  required
                />
                <Form.Text className="text-muted">
                  Cannot be changed after enrollment.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Gender */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Gender <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.gender}
                  onChange={onFieldChange('gender')}
                  required
                >
                  <option value="">— Select gender —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Cannot be changed after enrollment.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Coverage Start */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Coverage Start <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.coverageStart}
                  onChange={onFieldChange('coverageStart')}
                  required
                />
              </Form.Group>
            </Col>

            {/* Coverage End */}
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Coverage End
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.coverageEnd}
                  onChange={onFieldChange('coverageEnd')}
                />
                <Form.Text className="text-muted">
                  Leave blank for open-ended coverage.
                </Form.Text>
              </Form.Group>
            </Col>

            {/* Contact Info — normal fields, JSON built automatically */}
            <Col md={6}>
            <Form.Group>
                <Form.Label className="small fw-semibold">
                Phone
                </Form.Label>
                <Form.Control
                type="tel"
                placeholder="e.g. 9000000000"
                value={form.contactPhone}
                onChange={onFieldChange('contactPhone')}
                />
            </Form.Group>
            </Col>

            <Col md={6}>
            <Form.Group>
                <Form.Label className="small fw-semibold">
                Email
                </Form.Label>
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
                <Form.Label className="small fw-semibold">
                Address
                </Form.Label>
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
            variant="primary"
            className="px-4 fw-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Enrolling...
              </>
            ) : (
              <>
                <i className="bi bi-person-check me-2"></i>
                Enroll Member
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
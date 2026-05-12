import {
  Modal, Form, Button, Alert, Spinner, Row, Col,
} from 'react-bootstrap';
import { formatDate } from '../utils/policyHelpers';

export default function EditModal({
  show,
  loading,
  error,
  form,
  policy,         // the original policy being edited (for locked field display)
  onHide,
  onFieldChange,
  onSubmit,
}) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      backdrop="static"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-pencil text-warning me-2"></i>
          Edit Policy
        </Modal.Title>
      </Modal.Header>

      {/* Only render form when we have a policy to edit */}
      {policy && (
        <Form onSubmit={onSubmit}>
          <Modal.Body className="pt-3">

            {/* Locked fields info */}
            <Alert variant="info" className="py-2 small mb-3">
              <i className="bi bi-lock-fill me-2"></i>
              <strong>Plan Code</strong> ({policy.planCode}) and{' '}
              <strong>Effective From</strong> (
              {formatDate(policy.effectiveFrom)}) are locked.
            </Alert>

            {error && (
              <Alert
                variant="danger"
                className="d-flex align-items-center py-2"
              >
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </Alert>
            )}

            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Plan Name
                  </Form.Label>
                  <Form.Control
                    value={form.planName}
                    onChange={onFieldChange('planName')}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Status
                  </Form.Label>
                  <Form.Select
                    value={form.status}
                    onChange={onFieldChange('status')}
                  >
                    <option value="">— no change —</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Expired">Expired</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Deductible (₹)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.deductibleAmount}
                    onChange={onFieldChange('deductibleAmount')}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    OOP Max (₹)
                  </Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.outOfPocketMax}
                    onChange={onFieldChange('outOfPocketMax')}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Effective To
                  </Form.Label>
                  <Form.Control
                    type="date"
                    value={form.effectiveTo}
                    onChange={onFieldChange('effectiveTo')}
                  />
                  <Form.Text className="text-muted">
                    Leave blank for auto-renewing.
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">
                    Coverage Rules (JSON)
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={form.coverageRulesJSON}
                    onChange={onFieldChange('coverageRulesJSON')}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                </Form.Group>
              </Col>
            </Row>

          </Modal.Body>

          <Modal.Footer className="border-0">
            <Button
              variant="light"
              onClick={onHide}
              disabled={loading}
            >
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
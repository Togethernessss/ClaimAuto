import {
  Modal, Form, Button, Alert, Spinner, Row, Col,
} from 'react-bootstrap';

export default function CreateModal({
  show,         // boolean — is modal open
  loading,      // boolean — is submit in progress
  error,        // string | null
  form,         // CreatePolicyDto object
  onHide,       // function — close modal
  onFieldChange,// function(field) returns onChange handler
  onSubmit,     // function(e) — form submit
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
          <i className="bi bi-plus-circle text-primary me-2"></i>
          Create New Policy
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={onSubmit}>
        <Modal.Body className="pt-3">

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
                  Plan Code <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="e.g. FAMILY-GOLD-2025"
                  value={form.planCode}
                  onChange={onFieldChange('planCode')}
                  required
                />
                <Form.Text className="text-muted">
                  Unique. Cannot be changed after creation.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Plan Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  placeholder="e.g. Family Gold Health Plan"
                  value={form.planName}
                  onChange={onFieldChange('planName')}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Deductible Amount (₹)
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5000"
                  value={form.deductibleAmount}
                  onChange={onFieldChange('deductibleAmount')}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Out-of-Pocket Max (₹)
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 100000"
                  value={form.outOfPocketMax}
                  onChange={onFieldChange('outOfPocketMax')}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Effective From <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.effectiveFrom}
                  onChange={onFieldChange('effectiveFrom')}
                  required
                />
                <Form.Text className="text-muted">
                  Cannot be changed after creation.
                </Form.Text>
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
                  Leave blank for auto-renewing plans.
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
                  placeholder='{"coveredServices":["inpatient","outpatient","pharmacy"]}'
                  value={form.coverageRulesJSON}
                  onChange={onFieldChange('coverageRulesJSON')}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <Form.Text className="text-muted">Optional.</Form.Text>
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
            variant="primary"
            className="px-4 fw-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Creating...
              </>
            ) : (
              <>
                <i className="bi bi-check2-circle me-2"></i>
                Create Policy
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
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
      scrollable
      style={{ '--bs-modal-height': '90vh' }}
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-plus-circle text-primary me-2"></i>
          Create New Policy
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={onSubmit}>
        <Modal.Body className="pt-3" style={{ overflowY: 'auto', maxHeight: '65vh' }}>

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
                  Sum Insured (₹) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 500000"
                  value={form.sumInsured}
                  onChange={onFieldChange('sumInsured')}
                  required
                />
                <Form.Text className="text-muted">
                  Maximum total the insurer pays in a policy year.
                </Form.Text>
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
                  Effective From <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.effectiveFrom}
                  onChange={onFieldChange('effectiveFrom')}
                  min={new Date().toISOString().split('T')[0]}
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
                  min={form.effectiveFrom || undefined}
                />
                <Form.Text className="text-muted">
                  Leave blank for auto-renewing plans.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Covered Services
                </Form.Label>
                <div className="d-flex flex-wrap gap-3 mt-1">
                  {['Inpatient', 'Outpatient', 'Pharmacy', 'Emergency'].map((service) => (
                    <Form.Check
                      key={service}
                      type="checkbox"
                      id={`service-${service}`}
                      label={service}
                      checked={
                        (() => {
                          try {
                            const parsed = JSON.parse(form.coverageRulesJSON || '{}');
                            return (parsed.coveredServices || [])
                              .map(s => s.toLowerCase())
                              .includes(service.toLowerCase());
                          } catch { return false; }
                        })()
                      }
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(form.coverageRulesJSON || '{}');
                          const services = parsed.coveredServices || [];
                          const updated = e.target.checked
                            ? [...services, service.toLowerCase()]
                            : services.filter(s =>
                                s.toLowerCase() !== service.toLowerCase());
                          onFieldChange('coverageRulesJSON')({
                            target: {
                              value: JSON.stringify({ coveredServices: updated })
                            }
                          });
                        } catch {
                          onFieldChange('coverageRulesJSON')({
                            target: {
                              value: JSON.stringify({
                                coveredServices: [service.toLowerCase()]
                              })
                            }
                          });
                        }
                      }}
                    />
                  ))}
                </div>
                <Form.Text className="text-muted">
                  Select the services covered under this policy.
                </Form.Text>
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
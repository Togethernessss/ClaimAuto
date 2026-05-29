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
      scrollable
      style={{ '--bs-modal-height': '90vh' }}
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-pencil text-warning me-2"></i>
          Edit Policy
        </Modal.Title>
      </Modal.Header>

      {/* Only render form when we have a policy to edit */}
      {policy && (
        <>
          {/* ── EXPIRED POLICY — locked state ──────────────────────────── */}
          {policy.status === 'Expired' ? (
            <Modal.Body className="pt-3" style={{ overflowY: 'auto', maxHeight: '65vh' }}>
              <div className="text-center py-4">
                <div
                  className="rounded-circle d-inline-flex align-items-center 
                              justify-content-center mb-3"
                  style={{
                    width: 64,
                    height: 64,
                    background: '#f5f5f5',
                    border: '2px solid #bdbdbd',
                  }}
                >
                  <i
                    className="bi bi-lock-fill"
                    style={{ fontSize: '1.8rem', color: '#9e9e9e' }}
                  ></i>
                </div>
                <h6 className="fw-bold text-muted mb-2">
                  Policy Locked — Expired
                </h6>
                <p className="text-muted small mb-0" style={{ maxWidth: 320, margin: '0 auto' }}>
                  <strong>{policy.planName}</strong> expired on{' '}
                  <strong>{formatDate(policy.effectiveTo)}</strong>.
                  Expired policies are permanent and cannot be modified
                  or reactivated.
                </p>
              </div>
            </Modal.Body>
          ) : (
            /* ── NORMAL EDIT FORM ────────────────────────────────────────── */
            <Form onSubmit={onSubmit}>
              <Modal.Body className="pt-3" style={{ overflowY: 'auto', maxHeight: '60vh' }} >
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
                        {/* Expired NOT listed — use Deactivate button instead */}
                      </Form.Select>
                      <Form.Text className="text-muted">
                        To permanently expire this policy, use the
                        Deactivate button on the policies list.
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold">
                        Sum Insured (₹)
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 500000"
                        value={form.sumInsured}
                        onChange={onFieldChange('sumInsured')}
                      />
                      <Form.Text className="text-muted">
                        Maximum total the insurer pays in a policy year.
                      </Form.Text>
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
                        Effective To
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={form.effectiveTo}
                        onChange={onFieldChange('effectiveTo')}
                        min={policy?.effectiveFrom
                          ? policy.effectiveFrom.split('T')[0]
                          : undefined}
                      />
                      <Form.Text className="text-muted">
                        Leave blank for auto-renewing.
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold">
                        Covered Services
                      </Form.Label>
                      <div className="d-flex flex-wrap gap-3 mt-1">
                        {['Inpatient', 'Outpatient', 'Pharmacy', 'Emergency'].map((service) => {
                          // Check if this service is currently selected
                          let isChecked = false;
                          try {
                            const parsed = JSON.parse(form.coverageRulesJSON || '{}');
                            isChecked = (parsed.coveredServices || [])
                              .map(s => s.toLowerCase())
                              .includes(service.toLowerCase());
                          } catch { isChecked = false; }

                          return (
                            <Form.Check
                              key={service}
                              type="checkbox"
                              id={`edit-service-${service}`}
                              label={service}
                              checked={isChecked}
                              onChange={(e) => {
                                try {
                                  const parsed   = JSON.parse(form.coverageRulesJSON || '{}');
                                  const services = parsed.coveredServices || [];
                                  const updated  = e.target.checked
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
                          );
                        })}
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
        </>
      )}
    </Modal>
  );
}
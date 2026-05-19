import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { fileAppeal } from '../../services/appeals/appealService';
import { CreateAppealDto } from '../../models/appeals/CreateAppealDto';

export default function FileAppealModal({ show, onClose, onSuccess, defaultClaimId }) {
  const [form, setForm]       = useState(new CreateAppealDto());
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setForm(new CreateAppealDto({ claimID: defaultClaimId || 0 }));
      setError(null);
    }
  }, [show, defaultClaimId]);

  const handleField = (field) => (e) =>
    setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        claimID:       Number(form.claimID),
        reason:        form.reason.trim(),
        documentsJSON: form.documentsJSON || null,
      };
      const created = await fileAppeal(payload);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to file appeal.';
      setError(typeof msg === 'string' ? msg : 'Failed to file appeal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static" size="lg">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-journal-plus text-primary me-2"></i> File New Appeal
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="pt-3">
          {error && (
            <Alert variant="danger" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          <Alert variant="info" className="small py-2 mb-3">
            <i className="bi bi-info-circle me-2"></i>
            Appeals can only be filed for <strong>Rejected</strong> or <strong>Adjudicated</strong> claims.
            Only one active appeal allowed per claim.
          </Alert>

          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Claim ID <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  placeholder="e.g. 9041"
                  value={form.claimID || ''}
                  onChange={handleField('claimID')}
                  required
                  disabled={!!defaultClaimId}
                />
                <Form.Text className="text-muted">
                  The claim you're contesting
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Reason for Appeal <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  placeholder="Explain why you believe the original decision was incorrect. Be specific..."
                  value={form.reason}
                  onChange={handleField('reason')}
                  required
                  minLength={20}
                />
                <Form.Text className="text-muted">
                  Minimum 20 characters. Be clear and reference policy clauses if relevant.
                </Form.Text>
              </Form.Group>
            </Col>

            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">
                  Supporting Documents (JSON)
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder='{"files":["doctor-letter.pdf","second-opinion.pdf"]}'
                  value={form.documentsJSON}
                  onChange={handleField('documentsJSON')}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <Form.Text className="text-muted">
                  Optional. List supporting document URLs/IDs.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button variant="light" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" className="px-4 fw-semibold" disabled={loading}>
            {loading ? (
              <><Spinner animation="border" size="sm" className="me-2" /> Filing...</>
            ) : (
              <><i className="bi bi-check2-circle me-2"></i> File Appeal</>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
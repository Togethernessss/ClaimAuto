import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { decideAppeal } from '../../services/appeals/appealService';

export default function DecideAppealModal({ show, onClose, onSuccess, appeal }) {
  const [outcome, setOutcome] = useState('');
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      setOutcome('');
      setError(null);
    }
  }, [show]);

  if (!appeal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await decideAppeal(appeal.appealID, { outcome });
      onSuccess?.(appeal.appealID, outcome);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to decide appeal.';
      setError(typeof msg === 'string' ? msg : 'Failed to decide appeal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-gavel text-warning me-2"></i> Decide Appeal
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="pt-3">
          <Alert variant="info" className="small py-2 mb-3">
            <strong>Appeal APP-{appeal.appealID}</strong> · Claim CLM-{appeal.claimID}<br />
            <strong>Filed by:</strong> {appeal.filedByName}<br />
            <strong>Reason:</strong> <em>{appeal.reason}</em>
          </Alert>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              Outcome <span className="text-danger">*</span>
            </Form.Label>

            <Row className="g-2">
              {[
                { val: 'Overturned',      icon: 'bi-check-circle',   color: 'success', desc: 'Original decision was wrong. Claim reset.' },
                { val: 'Upheld',          icon: 'bi-x-circle',       color: 'danger',  desc: 'Original rejection stands.' },
                { val: 'PartiallyUpheld', icon: 'bi-dash-circle',    color: 'warning', desc: 'Partial reconsideration.' },
              ].map((opt) => (
                <Col md={4} key={opt.val}>
                  <Form.Check
                    type="radio"
                    id={`outcome-${opt.val}`}
                    name="outcome"
                    value={opt.val}
                    checked={outcome === opt.val}
                    onChange={(e) => setOutcome(e.target.value)}
                    label={
                      <div className={`text-${opt.color}`}>
                        <i className={`${opt.icon} me-1`}></i>
                        <strong>{opt.val}</strong>
                        <div className="small text-muted">{opt.desc}</div>
                      </div>
                    }
                  />
                </Col>
              ))}
            </Row>
          </Form.Group>

          {outcome === 'Overturned' && (
            <Alert variant="warning" className="small py-2 mb-0">
              <i className="bi bi-info-circle me-2"></i>
              The linked claim CLM-{appeal.claimID} will be reset to <strong>Submitted</strong> status.
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button variant="light" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="warning" className="px-4 fw-semibold" disabled={loading || !outcome}>
            {loading ? (
              <><Spinner animation="border" size="sm" className="me-2" /> Submitting...</>
            ) : (
              <><i className="bi bi-check2-circle me-2"></i> Submit Decision</>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
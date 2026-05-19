// src/pages/shared/Claims/components/UpdateStatusModal.jsx
// Staff / Admin updates claim status and priority.
import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import {
  CLAIM_STATUSES, CLAIM_PRIORITIES,
  statusVariant, statusLabel, priorityVariant, priorityTextColor,
  formatCurrency, formatDate,
} from '../utils/claimHelpers';

export default function UpdateStatusModal({
  show,
  loading,
  error,
  claim,      // the claim being updated
  onHide,
  onSubmit,   // ({ status, priority }) => void
}) {
  const [status,   setStatus]   = useState('');
  const [priority, setPriority] = useState('');

  useEffect(() => {
    if (show && claim) {
      setStatus(claim.status   ?? '');
      setPriority(claim.priority ?? '');
    }
  }, [show, claim]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      status:   status   || null,
      priority: priority || null,
    });
  };

  if (!claim) return null;

  const statusChanged   = status   !== (claim.status   ?? '');
  const priorityChanged = priority !== (claim.priority ?? '');
  const hasChanges      = statusChanged || priorityChanged;

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-pencil-square text-warning me-2"></i>
          Update Claim
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="pt-2">

          {/* Claim summary card */}
          <div
            className="rounded-3 p-3 mb-3"
            style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}
          >
            <div className="d-flex justify-content-between align-items-start mb-1">
              <span className="fw-bold font-monospace">CLM-{claim.claimID}</span>
              <Badge bg={statusVariant(claim.status)} className="px-2 py-1">
                {statusLabel(claim.status)}
              </Badge>
            </div>
            <div className="small text-muted">
              <span className="me-3"><i className="bi bi-person me-1"></i>{claim.memberName}</span>
              <span className="me-3"><i className="bi bi-hospital me-1"></i>{claim.providerName}</span>
              <span><i className="bi bi-calendar me-1"></i>{formatDate(claim.submittedAt)}</span>
            </div>
            <div className="small fw-semibold mt-1">
              {formatCurrency(claim.totalBilledAmount)}
              <span className="text-muted fw-normal ms-2">· {claim.claimType}</span>
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="d-flex align-items-center py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </Alert>
          )}

          <Row className="g-3">
            {/* Status */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Status</Form.Label>
                <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {CLAIM_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === 'UnderReview' ? 'Under Review' : s}
                    </option>
                  ))}
                </Form.Select>
                {statusChanged && (
                  <Form.Text className="text-primary">
                    <i className="bi bi-arrow-right me-1"></i>
                    Changing from <strong>{statusLabel(claim.status)}</strong> to{' '}
                    <strong>{statusLabel(status)}</strong>
                  </Form.Text>
                )}

                {/* Validated warning — auto-adjudication trigger */}
                {status === 'Validated' && (
                  <Alert variant="warning" className="small py-2 mt-2 mb-0">
                    <i className="bi bi-lightning-fill me-2"></i>
                    <strong>Auto-Adjudication will trigger immediately.</strong>
                    <div className="mt-1" style={{ fontSize: 11 }}>
                      The engine will evaluate this claim against all active rules.
                      If the amount exceeds ₹5,00,000 it will be routed to the
                      manual review queue instead.
                    </div>
                  </Alert>
                )}
              </Form.Group>
            </Col>

            {/* Priority */}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="small fw-semibold">Priority</Form.Label>
                <Form.Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {CLAIM_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Form.Select>
                {priorityChanged && (
                  <Form.Text className="text-primary">
                    <i className="bi bi-arrow-right me-1"></i>
                    Changing from <strong>{claim.priority}</strong> to{' '}
                    <strong>{priority}</strong>
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          {/* Status transition guidance */}
          <div className="mt-3 small text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Flow: Submitted → Under Review →{' '}
            <span style={{ color: '#e65100', fontWeight: 600 }}>Validated</span>
            {' '}→ <span style={{ color: '#764ba2' }}>Auto-Adjudicated</span>
            {' '}→ Approved / Rejected → Paid
            <div className="mt-1">
              Setting <strong>Validated</strong> triggers the adjudication engine automatically.
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="border-0">
          <Button variant="light" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="warning"
            className="px-4 fw-semibold"
            disabled={loading || !hasChanges}
          >
            {loading ? (
              <><Spinner animation="border" size="sm" className="me-2" />Saving...</>
            ) : (
              <><i className="bi bi-check2-circle me-2"></i>Save Changes</>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

// src/pages/shared/Claims/components/UpdateStatusModal.jsx
import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import {
  CLAIM_PRIORITIES,
  statusVariant, statusLabel, formatCurrency, formatDate,
} from '../utils/claimHelpers';
import { useAuth } from '../../../../security/AuthContext';

export default function UpdateStatusModal({
  show,
  loading,
  error,
  claim,
  onHide,
  onSubmit,
}) {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'Admin';

  const [priority,      setPriority]      = useState('Normal');
  const [adminOverride, setAdminOverride] = useState(false);

  useEffect(() => {
    if (show && claim) {
      setPriority(claim.priority ?? 'Normal');
      setAdminOverride(false);
    }
  }, [show, claim]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      priority: priority || null,
      status:   isAdmin && adminOverride ? 'Rejected' : null,
    });
  };

  if (!claim) return null;

  const priorityChanged = priority !== (claim.priority ?? 'Normal');
  const hasChanges      = priorityChanged || (isAdmin && adminOverride);

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

          {/* Claim summary */}
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

          {/* Priority — all staff */}
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Priority</Form.Label>
            <Form.Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {CLAIM_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Form.Select>
            {priorityChanged && (
              <Form.Text className="text-primary">
                <i className="bi bi-arrow-right me-1"></i>
                Changing from <strong>{claim.priority}</strong> to <strong>{priority}</strong>
              </Form.Text>
            )}
          </Form.Group>

          {/* Admin override — Admin only */}
          {isAdmin && (
            <div className="mb-2">
              <Form.Check
                type="checkbox"
                id="admin-reject-override"
                label={
                  <span className="small">
                    <strong>Admin Override:</strong> Force-reject this claim
                  </span>
                }
                checked={adminOverride}
                onChange={(e) => setAdminOverride(e.target.checked)}
              />
              {adminOverride && (
                <Alert variant="danger" className="small py-2 mt-2 mb-0">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  This will immediately set the claim to <strong>Rejected</strong>.
                  Use only in exceptional circumstances where automated processing cannot apply.
                </Alert>
              )}
            </div>
          )}

          {/* Info note */}
          <Alert variant="light" className="small mt-3 mb-0 py-2"
            style={{ border: '1px solid #e9ecef' }}>
            <i className="bi bi-info-circle me-1 text-muted"></i>
            <span className="text-muted">
              <strong>Status is set automatically.</strong> Fraud screening and
              adjudication run on submission. Use this form to update{' '}
              <strong>priority</strong> only.
            </span>
          </Alert>

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

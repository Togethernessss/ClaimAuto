// src/pages/shared/Claims/components/DeleteClaimModal.jsx
// Admin permanently deletes a Rejected claim.
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import { formatCurrency, formatDate } from '../utils/claimHelpers';

export default function DeleteClaimModal({
  show,
  loading,
  error,
  claim,
  onHide,
  onConfirm,
}) {
  if (!claim) return null;

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-danger">
          <i className="bi bi-trash3 me-2"></i>
          Delete Claim
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="mb-2">
          Are you sure you want to permanently delete{' '}
          <strong className="font-monospace">CLM-{claim.claimID}</strong>?
        </p>

        {/* Claim summary */}
        <div
          className="rounded-3 p-3 mb-3"
          style={{ background: '#fff5f5', border: '1px solid #ffcdd2' }}
        >
          <div className="small">
            <div className="mb-1">
              <span className="text-muted">Member: </span>
              <strong>{claim.memberName}</strong>
            </div>
            <div className="mb-1">
              <span className="text-muted">Provider: </span>
              <strong>{claim.providerName}</strong>
            </div>
            <div className="mb-1">
              <span className="text-muted">Amount: </span>
              <strong>{formatCurrency(claim.totalBilledAmount)}</strong>
            </div>
            <div>
              <span className="text-muted">Submitted: </span>
              <strong>{formatDate(claim.submittedAt)}</strong>
            </div>
          </div>
        </div>

        <Alert variant="warning" className="small py-2">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          This is a <strong>permanent deletion</strong>. All claim lines and
          documents attached to this claim will also be removed. This cannot be undone.
        </Alert>

        {error && (
          <Alert variant="danger" className="small py-2 mb-0">
            <i className="bi bi-x-circle me-2"></i>
            {error}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0">
        <Button variant="light" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          className="px-4 fw-semibold"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <><Spinner animation="border" size="sm" className="me-2" />Deleting...</>
          ) : (
            <><i className="bi bi-trash3 me-2"></i>Yes, Delete</>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

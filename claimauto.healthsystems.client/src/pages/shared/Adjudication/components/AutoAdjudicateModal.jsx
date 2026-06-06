// src/pages/shared/Adjudication/components/AutoAdjudicateModal.jsx
import { Modal, Alert, Spinner } from 'react-bootstrap';
import { formatCurrency, claimTypeStyle } from '../utils/adjudicationHelpers';

export default function AutoAdjudicateModal({
  show,
  loading,
  error,
  claim,
  onHide,
  onConfirm,
}) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-lightning-fill text-primary me-2"></i>
          Auto Adjudicate Claim
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {claim && (
          <>
            <p className="text-muted small mb-3">
              The adjudication engine will evaluate this claim against all active rules
              in priority order. The decision will be instant.
            </p>

            {/* Claim summary */}
            <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa', fontSize: 13 }}>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Claim</span>
                <span className="fw-semibold font-monospace">CLM-{claim.claimID}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Member</span>
                <span className="fw-semibold">{claim.memberName}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Provider</span>
                <span className="fw-semibold">{claim.providerName}</span>
              </div>
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Policy</span>
                <span className="fw-semibold">{claim.policyName}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Billed Amount</span>
                <span className="fw-bold" style={{ color: '#764ba2' }}>
                  {formatCurrency(claim.totalBilledAmount)}
                </span>
              </div>
            </div>

            <Alert variant="info" className="small py-2">
              <i className="bi bi-info-circle me-2"></i>
              If the amount exceeds ₹5,00,000, the claim will be routed to
              <strong> manual review</strong> instead of auto-approved.
            </Alert>
          </>
        )}

        {error && (
          <Alert variant="danger" className="small py-2 mt-2">
            <i className="bi bi-x-circle me-2"></i>{error}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0">
        <button className="btn btn-light" onClick={onHide} disabled={loading}>Cancel</button>
        <button
          className="btn fw-semibold text-white px-4"
          onClick={onConfirm}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none', borderRadius: 8,
          }}
        >
          {loading
            ? <><Spinner animation="border" size="sm" className="me-2" />Running Engine...</>
            : <><i className="bi bi-lightning-fill me-2"></i>Run Auto Adjudication</>}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

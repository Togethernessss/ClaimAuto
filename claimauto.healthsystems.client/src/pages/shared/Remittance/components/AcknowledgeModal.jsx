import { Modal, Alert, Spinner } from 'react-bootstrap';
import {
  formatRemittanceId, formatPaymentId,
  formatCurrency, formatDate,
} from '../utils/remittanceHelpers';

export default function AcknowledgeModal({
  show,
  loading,
  error,
  remittance,
  onHide,
  onConfirm,
}) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold" style={{ fontSize: 16 }}>
          <i className="bi bi-check-circle me-2 text-success"></i>
          Acknowledge Remittance
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {remittance && (
          <>
            <p className="text-muted small mb-3">
              By acknowledging this remittance you confirm that your hospital
              has received the payment from the insurer. This action cannot be undone.
            </p>

            <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa', fontSize: 13 }}>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Remittance ID</span>
                <span className="fw-semibold font-monospace">
                  {formatRemittanceId(remittance.remittanceID)}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Payment ID</span>
                <span className="fw-semibold font-monospace">
                  {formatPaymentId(remittance.paymentID)}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Amount</span>
                <span className="fw-semibold" style={{ color: '#764ba2' }}>
                  {formatCurrency(remittance.amount)}
                </span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Claim</span>
                <span className="fw-semibold font-monospace">
                  Claim #{remittance.claimID}
                </span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Sent on</span>
                <span className="fw-semibold">
                  {formatDate(remittance.sentToProviderAt)}
                </span>
              </div>
            </div>

            <Alert variant="info" className="small py-2">
              <i className="bi bi-info-circle me-2"></i>
              This will mark the remittance as <strong>Acknowledged</strong> and
              close the payment loop with the insurer.
            </Alert>
          </>
        )}

        {error && (
          <Alert variant="danger" className="py-2 small">
            <i className="bi bi-x-circle me-2"></i>
            {error}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0">
        <button className="btn btn-light btn-sm" onClick={onHide} disabled={loading}>
          Cancel
        </button>
        <button
          className="btn btn-sm fw-semibold text-white"
          onClick={onConfirm}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none', borderRadius: 8, padding: '6px 20px',
          }}
        >
          {loading
            ? <><Spinner animation="border" size="sm" className="me-2" />Acknowledging...</>
            : <><i className="bi bi-check2 me-1"></i>Confirm Acknowledgement</>}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
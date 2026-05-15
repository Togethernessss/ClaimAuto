import { Modal, Alert, Spinner } from 'react-bootstrap';
import { formatPaymentId, formatCurrency } from '../utils/paymentHelpers';

export default function ResumeConfirmModal({
  show,
  loading,
  error,
  payment,
  onHide,
  onConfirm,
}) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-success">
          <i className="bi bi-play-circle me-2"></i>
          Resume Payment
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {payment && (
          <>
            <p className="mb-2">
              Resume{' '}
              <strong>{formatPaymentId(payment.paymentID)}</strong>{' '}
              back to <strong>Pending</strong> status?
            </p>
            <div className="mb-3 p-3 rounded" style={{ background: '#f8f9fa', fontSize: 13 }}>
              <div><span className="text-muted">Payee:</span> <strong>{payment.payeeName}</strong></div>
              <div><span className="text-muted">Amount:</span> <strong>{formatCurrency(payment.amount)}</strong></div>
              <div><span className="text-muted">Current Status:</span> <strong className="text-danger">On Hold</strong></div>
            </div>
            <Alert variant="info" className="small py-2">
              <i className="bi bi-info-circle me-2"></i>
              Payment will return to <strong>Pending</strong> and can be authorized again.
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
        <button className="btn btn-light" onClick={onHide} disabled={loading}>
          Cancel
        </button>
        <button
          className="btn btn-success fw-semibold px-4"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading
            ? <><Spinner animation="border" size="sm" className="me-2" />Resuming...</>
            : <><i className="bi bi-play-circle me-2"></i>Yes, Resume Payment</>}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
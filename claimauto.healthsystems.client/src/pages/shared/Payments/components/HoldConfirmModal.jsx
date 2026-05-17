import { Modal, Alert, Spinner } from 'react-bootstrap';
import { formatPaymentId, formatCurrency } from '../utils/paymentHelpers';

export default function HoldConfirmModal({
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
        <Modal.Title className="fw-bold text-danger">
          <i className="bi bi-pause-circle me-2"></i>
          Hold Payment
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {payment && (
          <>
            <p className="mb-2">
              Are you sure you want to place{' '}
              <strong>{formatPaymentId(payment.paymentID)}</strong>{' '}
              on hold?
            </p>
            <div className="mb-3 p-3 rounded" style={{ background: '#f8f9fa', fontSize: 13 }}>
              <div><span className="text-muted">Payee:</span> <strong>{payment.payeeName}</strong></div>
              <div><span className="text-muted">Amount:</span> <strong>{formatCurrency(payment.amount)}</strong></div>
              <div><span className="text-muted">Status:</span> <strong>{payment.status}</strong></div>
            </div>
            <Alert variant="warning" className="small py-2">
              <i className="bi bi-info-circle me-2"></i>
              This will prevent further processing. The payment can be reviewed and actioned later.
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
          className="btn btn-danger fw-semibold px-4"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading
            ? <><Spinner animation="border" size="sm" className="me-2" />Holding...</>
            : <><i className="bi bi-pause-circle me-2"></i>Yes, Hold Payment</>}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
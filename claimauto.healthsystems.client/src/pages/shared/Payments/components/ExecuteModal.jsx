import { Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { formatPaymentId } from '../utils/paymentHelpers';

export default function ExecuteModal({
  show,
  loading,
  error,
  paymentId,
  referenceNumber,
  onReferenceChange,
  onHide,
  onConfirm,
}) {
  const isValid = referenceNumber.trim().length > 0;

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-send text-success me-2"></i>
          Execute Payment {formatPaymentId(paymentId)}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="text-muted small mb-3">
          Enter the bank or transfer reference number to confirm
          this payment has been executed.
        </p>

        <Form.Group>
          <Form.Label className="fw-semibold small">
            Reference Number <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g. NEFT/2026/123456"
            value={referenceNumber}
            onChange={(e) => onReferenceChange(e.target.value)}
            style={{ borderRadius: 8 }}
          />
          <Form.Text className="text-muted">
            Bank transfer or NEFT/RTGS reference number.
          </Form.Text>
        </Form.Group>

        {error && (
          <Alert variant="danger" className="py-2 small mt-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0">
        <button
          className="btn btn-light"
          onClick={onHide}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          className="btn fw-semibold text-white"
          onClick={onConfirm}
          disabled={loading || !isValid}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: 8,
            padding: '6px 20px',
            opacity: isValid ? 1 : 0.45,
            cursor: isValid ? 'pointer' : 'not-allowed',
            transition: 'opacity 0.2s',
          }}
        >
          {loading
            ? <><Spinner animation="border" size="sm" className="me-2" />Executing...</>
            : <><i className="bi bi-send me-1"></i>Confirm Execute</>}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
import { useState } from 'react';
import { Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { formatPaymentId } from '../utils/paymentHelpers';

// ── Valid reference number formats ────────────────────────────
// NEFT/20260518/HDFC000123
// RTGS/20260518/ICICI000456
// IMPS/20260518/428512345678
// UPI/20260518/TXN8823671234
const REFERENCE_REGEX = /^[A-Z]+\/\d{8}\/[A-Z0-9]+$/;

const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // "20260526"

const FORMATS = [
  { type: 'NEFT', example: `NEFT/${todayStr}/HDFC000123`   },
  { type: 'RTGS', example: `RTGS/${todayStr}/ICICI000456`  },
  { type: 'IMPS', example: `IMPS/${todayStr}/428512345678` },
  { type: 'UPI',  example: `UPI/${todayStr}/TXN8823671234` },
];

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
  const [touched, setTouched] = useState(false);

  const isEmpty   = referenceNumber.trim().length === 0;
  const isValid   = REFERENCE_REGEX.test(referenceNumber.trim());
  const showError = touched && !isEmpty && !isValid;
  const canSubmit = !isEmpty && isValid;

  function handleHide() {
    setTouched(false);
    onHide();
  }

  function handleConfirm() {
    setTouched(true);
    if (!canSubmit) return;
    onConfirm();
  }

  return (
    <Modal show={show} onHide={handleHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-send text-success me-2"></i>
          Execute Payment {formatPaymentId(paymentId)}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="text-muted small mb-3">
          Enter the bank reference number received after transferring
          the funds. This is used to track and verify the payment.
        </p>

        <Form.Group>
          <Form.Label className="fw-semibold small">
            Bank Reference Number <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            placeholder={`e.g. NEFT/${todayStr}/HDFC000123`}
            value={referenceNumber}
            onChange={(e) => {
              onReferenceChange(e.target.value.toUpperCase());
              setTouched(true);
            }}
            isValid={touched && isValid}
            isInvalid={showError}
            style={{ borderRadius: 8, fontFamily: 'monospace' }}
          />

          {/* Valid state */}
          {touched && isValid && (
            <Form.Control.Feedback type="valid">
              Valid reference number format ✓
            </Form.Control.Feedback>
          )}

          {/* Invalid state */}
          {showError && (
            <Form.Control.Feedback type="invalid">
              Invalid format. Use: PREFIX/YYYYMMDD/IDENTIFIER
            </Form.Control.Feedback>
          )}
        </Form.Group>

        {/* Format examples */}
        <div style={{
          marginTop: 12,
          background: '#f8f9fa',
          borderRadius: 8,
          padding: '10px 12px',
        }}>
          <p style={{
            fontSize: 11,
            fontWeight: 500,
            color: '#6c757d',
            margin: '0 0 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Accepted formats
          </p>
          {FORMATS.map((f) => (
            <div
              key={f.type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                background: '#e3f2fd',
                color: '#1565c0',
                padding: '1px 6px',
                borderRadius: 4,
                minWidth: 36,
                textAlign: 'center',
              }}>
                {f.type}
              </span>
              <span style={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#495057',
              }}>
                {f.example}
              </span>
              {/* Quick fill button */}
              <span
                style={{
                  fontSize: 10,
                  color: '#667eea',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
                onClick={() => {
                  onReferenceChange(f.example);
                  setTouched(true);
                }}
              >
                Use
              </span>
            </div>
          ))}
        </div>

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
          onClick={handleHide}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          className="btn fw-semibold text-white"
          onClick={handleConfirm}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: 8,
            padding: '6px 20px',
            opacity: canSubmit ? 1 : 0.45,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
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
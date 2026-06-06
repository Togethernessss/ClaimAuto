import { useState } from 'react';
import { Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { formatPaymentId } from '../utils/paymentHelpers';

const todayStr = new Date()
  .toISOString().slice(0, 10).replace(/-/g, '');

const FORMATS = [
  { type: 'NEFT', example: `NEFT/${todayStr}/HDFC000123`   },
  { type: 'RTGS', example: `RTGS/${todayStr}/ICICI000456`  },
  { type: 'IMPS', example: `IMPS/${todayStr}/428512345678` },
  { type: 'UPI',  example: `UPI/${todayStr}/TXN8823671234` },
];

// ── Validates format AND date 
function isValidReference(ref) {
  // Step 1 — check overall format
  if (!/^[A-Z]+\/\d{8}\/[A-Z0-9]+$/.test(ref.trim())) {
    return false;
  }

  // Step 2 — extract and validate date part YYYYMMDD
  const datePart = ref.trim().split('/')[1];
  const year  = parseInt(datePart.slice(0, 4));
  const month = parseInt(datePart.slice(4, 6));
  const day   = parseInt(datePart.slice(6, 8));

  // Basic range checks
  if (month < 1 || month > 12) return false;
  if (day   < 1 || day   > 31) return false;

  // Strict check — catches Feb 30, Apr 31 etc
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year    ||
    date.getMonth()    !== month - 1 ||
    date.getDate()     !== day
  ) return false;

  // Step 3 — date cannot be in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) return false;

  return true;
}

// ── Human-readable error for invalid date 
function getDateError(ref) {
  if (!/^[A-Z]+\/\d{8}\/[A-Z0-9]+$/.test(ref.trim())) {
    return 'Invalid format. Use: PREFIX/YYYYMMDD/IDENTIFIER';
  }

  const datePart = ref.trim().split('/')[1];
  const year  = parseInt(datePart.slice(0, 4));
  const month = parseInt(datePart.slice(4, 6));
  const day   = parseInt(datePart.slice(6, 8));

  if (month < 1 || month > 12)
    return `Invalid month "${month}" — must be 01–12.`;

  if (day < 1 || day > 31)
    return `Invalid day "${day}" — must be 01–31.`;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year    ||
    date.getMonth()    !== month - 1 ||
    date.getDate()     !== day
  ) {
    return `Invalid date — ${year}-${String(month).padStart(2,'0')} does not have day ${day}.`;
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today)
    return 'Date cannot be in the future.';

  return 'Invalid reference number format.';
}

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
  const isValid   = isValidReference(referenceNumber);
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
    <Modal
      show={show}
      onHide={handleHide}
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          <i className="bi bi-send text-success me-2"></i>
          Execute Payment {formatPaymentId(paymentId)}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <p className="text-muted small mb-3">
          Enter the bank reference number received after
          transferring the funds. This is used to track
          and verify the payment.
        </p>

        <Form.Group>
          <Form.Label className="fw-semibold small">
            Bank Reference Number{' '}
            <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            placeholder={`e.g. NEFT/${todayStr}/HDFC000123`}
            value={referenceNumber}
            onChange={(e) => {
              onReferenceChange(
                e.target.value.toUpperCase()
              );
              setTouched(true);
            }}
            isValid={touched && isValid}
            isInvalid={showError}
            style={{
              borderRadius: 8,
              fontFamily:   'monospace',
            }}
          />

          {/* Valid state */}
          {touched && isValid && (
            <Form.Control.Feedback type="valid">
              Valid reference number format ✓
            </Form.Control.Feedback>
          )}

          {/* Invalid state — specific error message */}
          {showError && (
            <Form.Control.Feedback type="invalid">
              {getDateError(referenceNumber)}
            </Form.Control.Feedback>
          )}
        </Form.Group>

        {/* Format examples */}
        <div style={{
          marginTop:    12,
          background:   '#f8f9fa',
          borderRadius: 8,
          padding:      '10px 12px',
        }}>
          <p style={{
            fontSize:      11,
            fontWeight:    500,
            color:         '#6c757d',
            margin:        '0 0 6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Accepted formats
          </p>
          {FORMATS.map((f) => (
            <div
              key={f.type}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         8,
                marginBottom: 4,
              }}
            >
              <span style={{
                fontSize:   10,
                fontWeight: 600,
                background: '#e3f2fd',
                color:      '#1565c0',
                padding:    '1px 6px',
                borderRadius: 4,
                minWidth:   36,
                textAlign:  'center',
              }}>
                {f.type}
              </span>
              <span style={{
                fontSize:   11,
                fontFamily: 'monospace',
                color:      '#495057',
              }}>
                {f.example}
              </span>
              <span
                style={{
                  fontSize:   10,
                  color:      '#667eea',
                  cursor:     'pointer',
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
          <Alert
            variant="danger"
            className="py-2 small mt-3"
          >
            <i className="bi bi-exclamation-triangle-fill me-2">
            </i>
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
            background:
              'linear-gradient(135deg,' +
              '#667eea 0%, #764ba2 100%)',
            border:      'none',
            borderRadius: 8,
            padding:     '6px 20px',
            opacity:     canSubmit ? 1 : 0.45,
            cursor:      canSubmit ? 'pointer' : 'not-allowed',
            transition:  'opacity 0.2s',
          }}
        >
          {loading ? (
            <>
              <Spinner
                animation="border"
                size="sm"
                className="me-2"
              />
              Executing...
            </>
          ) : (
            <>
              <i className="bi bi-send me-1"></i>
              Confirm Execute
            </>
          )}
        </button>
      </Modal.Footer>
    </Modal>
  );
}
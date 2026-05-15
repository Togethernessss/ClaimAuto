import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { setupMfa, confirmMfa } from '../../services/identity/authService';
import { useAuth } from '../../security/AuthContext';

/**
 * Modal flow to enable MFA on the current user's account.
 *
 * Stages:
 *   1. Click "Enable MFA" in MfaCard → this modal opens → calls /api/auth/mfa/setup
 *   2. Backend returns { secretKey, qrCodeUri } → display QR + manual entry key
 *   3. User scans QR in Microsoft Authenticator
 *   4. User types 6-digit code → we POST to /api/auth/mfa/confirm
 *   5. On success: update user.mfaEnabled = true in AuthContext, close modal
 *
 * Props:
 *   show    — boolean, controlled by parent
 *   onClose — () => void, called when user dismisses
 */
export default function MfaSetupModal({ show, onClose }) {
  const { user, token, login } = useAuth();

  // Setup data returned by the backend
  const [secretKey, setSecretKey] = useState(null);
  const [qrCodeUri, setQrCodeUri] = useState(null);

  // UI state
  const [code, setCode] = useState('');
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // ── When the modal opens, fetch the QR setup data ────────────
  useEffect(() => {
    if (!show) return;

    // Reset state every time we open
    setSecretKey(null);
    setQrCodeUri(null);
    setCode('');
    setError(null);

    let cancelled = false;

    (async () => {
      setLoadingSetup(true);
      try {
        const data = await setupMfa();
        if (cancelled) return;
        setSecretKey(data.secretKey);
        setQrCodeUri(data.qrCodeUri);
      } catch (err) {
        const apiMsg =
          err.response?.data?.message ||
          err.response?.data ||
          'Could not start MFA setup.';
        if (!cancelled) {
          setError(typeof apiMsg === 'string' ? apiMsg : 'Could not start MFA setup.');
        }
      } finally {
        if (!cancelled) setLoadingSetup(false);
      }
    })();

    // Cleanup if user closes the modal mid-fetch
    return () => {
      cancelled = true;
    };
  }, [show]);

  // ── User submits the 6-digit code to confirm setup ───────────
  const handleConfirm = async (e) => {
    e.preventDefault();
    setError(null);
    setConfirming(true);

    try {
      await confirmMfa(code);

      // Push updated user (mfaEnabled = true) into AuthContext + localStorage
      const updatedUser = { ...user, mfaEnabled: true };
      login(token, updatedUser);

      // Close the modal — parent's MfaCard will re-render with new state
      onClose();
    } catch (err) {
      const apiMsg =
        err.response?.data?.message ||
        err.response?.data ||
        'Invalid code. Try again.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Invalid code. Try again.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-shield-plus text-primary me-2"></i>
          Enable Multi-Factor Authentication
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* ── Loading state — fetching QR from backend ───────── */}
        {loadingSetup && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="text-muted small mt-3">Generating your secure setup...</div>
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────── */}
        {error && !loadingSetup && (
          <Alert variant="danger" className="d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
          </Alert>
        )}

        {/* ── Setup ready — show QR + instructions + form ────── */}
        {!loadingSetup && qrCodeUri && (
          <>
            {/* Step 1 — Install + scan */}
            <div className="mb-4">
              <div className="small text-muted text-uppercase fw-bold mb-2">
                <span className="badge bg-primary me-2">1</span>
                Scan with Authenticator
              </div>
              <p className="small mb-3">
                Open <strong>Microsoft Authenticator</strong>, <strong>Google Authenticator</strong>,
                or any TOTP app, add a new account, and scan this QR code:
              </p>
              <div className="text-center p-3 border rounded bg-white">
                <QRCodeSVG value={qrCodeUri} size={200} level="M" includeMargin />
              </div>
            </div>

            {/* Manual entry fallback */}
            <div className="mb-4">
              <div className="small text-muted text-uppercase fw-bold mb-2">
                Can't scan? Enter this key manually:
              </div>
              <code className="d-block p-2 bg-light border rounded small">
                {secretKey}
              </code>
            </div>

            {/* Step 2 — Confirm */}
            <Form onSubmit={handleConfirm}>
              <div className="small text-muted text-uppercase fw-bold mb-2">
                <span className="badge bg-primary me-2">2</span>
                Confirm with a code
              </div>
              <Form.Group>
                <Form.Label className="small">
                  Enter the 6-digit code shown in your Authenticator app
                </Form.Label>
                <Form.Control
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center fs-4"
                  style={{ letterSpacing: '0.5rem', fontWeight: 600 }}
                  disabled={confirming}
                  required
                />
              </Form.Group>
            </Form>
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={confirming}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={loadingSetup || confirming || code.length !== 6}
        >
          {confirming ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Verifying...
            </>
          ) : (
            <>
              <i className="bi bi-check2-circle me-1"></i> Enable MFA
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
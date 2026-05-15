import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { disableMfa } from '../../services/identity/authService';
import { useAuth } from '../../security/AuthContext';

/**
 * Modal flow to disable MFA on the current user's account.
 *
 * SECURITY: disabling MFA requires a fresh TOTP code from the Authenticator app —
 * just being logged in is not enough. This prevents a stolen session token alone
 * from turning off the second factor.
 *
 * Stages:
 *   1. User clicks "Disable MFA" → modal opens
 *   2. User opens Authenticator, types current 6-digit code
 *   3. We POST to /api/auth/mfa/disable
 *   4. Backend verifies the TOTP, clears the secret, sets MFAEnabled = false
 *   5. We update AuthContext + close modal
 *
 * Props:
 *   show    — boolean, controlled by parent
 *   onClose — () => void, called when user dismisses
 */
export default function MfaDisableModal({ show, onClose }) {
  const { user, token, login } = useAuth();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset state every time the modal opens — no stale code or error from last attempt
  useEffect(() => {
    if (show) {
      setCode('');
      setError(null);
    }
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await disableMfa(code);

      // Push updated user (mfaEnabled = false) into AuthContext + localStorage
      const updatedUser = { ...user, mfaEnabled: false };
      login(token, updatedUser);

      onClose();
    } catch (err) {
      const apiMsg =
        err.response?.data?.message ||
        err.response?.data ||
        'Invalid code. Cannot disable MFA.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Invalid code. Cannot disable MFA.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-shield-slash text-danger me-2"></i>
          Disable Multi-Factor Authentication
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Strong warning */}
        <Alert variant="warning" className="d-flex align-items-start small">
          <i className="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
          <div>
            <strong>This will weaken your account security.</strong>
            <div className="mt-1">
              After disabling, your account will rely on just your password for login.
              We strongly recommend keeping MFA enabled.
            </div>
          </div>
        </Alert>

        {error && (
          <Alert variant="danger" className="d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group>
            <Form.Label className="small fw-semibold">
              <i className="bi bi-shield-lock me-1"></i>
              Confirm with a code from your Authenticator app
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
              disabled={submitting}
              autoFocus
              required
            />
            <Form.Text className="text-muted">
              We need to confirm you have access to the Authenticator app before disabling.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleSubmit}
          disabled={submitting || code.length !== 6}
        >
          {submitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Disabling...
            </>
          ) : (
            <>
              <i className="bi bi-shield-slash me-1"></i> Disable MFA
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { changePassword } from '../../services/identity/authService';

/**
 * Modal for changing the logged-in user's password.
 *
 * Production-quality UX:
 *   - Real-time rule checklist (green ✓ / gray ○) as user types the new password
 *   - "Show/hide" toggle on each password field
 *   - Confirm-new-password field with mismatch warning
 *   - Submit button stays disabled until all rules pass + confirm matches
 *   - On success: success alert + auto-close after 1.5s
 *
 * Security:
 *   - Backend requires current password (proves the caller knows it,
 *     defeats stolen-session attacks even though token is valid)
 *
 * Props:
 *   show    — boolean, controlled by parent
 *   onClose — () => void, called when user cancels or after success
 */
export default function ChangePasswordModal({ show, onClose }) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ── Reset everything when the modal opens ──────────────────
  useEffect(() => {
    if (show) {
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      setError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [show]);

  // ── Rule checklist — mirrors the backend's PasswordPolicy ──
  const rules = [
    { id: 'length',   label: 'At least 8 characters',           test: (p) => p.length >= 8 },
    { id: 'upper',    label: 'One uppercase letter (A-Z)',      test: (p) => /[A-Z]/.test(p) },
    { id: 'lower',    label: 'One lowercase letter (a-z)',      test: (p) => /[a-z]/.test(p) },
    { id: 'digit',    label: 'One digit (0-9)',                 test: (p) => /\d/.test(p) },
    { id: 'special',  label: 'One special character (!@#$ etc.)', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ];

  const allRulesPass = rules.every((r) => r.test(newPwd));
  const passwordsMatch = newPwd.length > 0 && newPwd === confirmPwd;
  const newDiffersFromCurrent = currentPwd.length > 0 && newPwd !== currentPwd;

  const canSubmit =
    currentPwd.length > 0 &&
    allRulesPass &&
    passwordsMatch &&
    newDiffersFromCurrent &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSubmitting(true);

    try {
      await changePassword(currentPwd, newPwd);
      setSuccess(true);
      // Auto-close after a short delay so user can read the success message
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      const apiMsg =
        err.response?.data?.message ||
        err.response?.data ||
        'Could not change password. Please try again.';
      setError(typeof apiMsg === 'string' ? apiMsg : 'Could not change password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static" size="md">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-key text-primary me-2"></i>
          Change Password
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {success && (
          <Alert variant="success" className="d-flex align-items-center">
            <i className="bi bi-check-circle-fill me-2"></i>
            <div>Password changed successfully.</div>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="d-flex align-items-center">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{error}</div>
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* ── Current password ──────────────────────────── */}
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              <i className="bi bi-lock me-1"></i> Current Password
            </Form.Label>
            <InputGroup>
              <Form.Control
                type={showCurrent ? 'text' : 'password'}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter your current password"
                disabled={submitting || success}
                autoFocus
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
              >
                <i className={`bi ${showCurrent ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </Button>
            </InputGroup>
          </Form.Group>

          {/* ── New password ──────────────────────────────── */}
          <Form.Group className="mb-2">
            <Form.Label className="small fw-semibold">
              <i className="bi bi-key me-1"></i> New Password
            </Form.Label>
            <InputGroup>
              <Form.Control
                type={showNew ? 'text' : 'password'}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Choose a strong new password"
                disabled={submitting || success}
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
              >
                <i className={`bi ${showNew ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </Button>
            </InputGroup>
          </Form.Group>

          {/* ── Rule checklist ────────────────────────────── */}
          <ul className="list-unstyled small mb-3" style={{ paddingLeft: 4 }}>
            {rules.map((rule) => {
              const passed = rule.test(newPwd);
              return (
                <li
                  key={rule.id}
                  className={`d-flex align-items-center ${passed ? 'text-success' : 'text-muted'}`}
                >
                  <i
                    className={`bi ${passed ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}
                    style={{ fontSize: 12 }}
                  ></i>
                  {rule.label}
                </li>
              );
            })}
          </ul>

          {/* ── Confirm new password ──────────────────────── */}
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">
              <i className="bi bi-check2-square me-1"></i> Confirm New Password
            </Form.Label>
            <InputGroup >
              <Form.Control
                type={showConfirm ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Re-type your new password"
                disabled={submitting || success}
                isInvalid={confirmPwd.length > 0 && !passwordsMatch}
                isValid={confirmPwd.length > 0 && passwordsMatch}
                required
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                <i className={`bi ${showConfirm ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </Button>
              <Form.Control.Feedback type="invalid">
                Passwords don't match.
              </Form.Control.Feedback>
              <Form.Control.Feedback type="valid">
                Passwords match.
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>

          {/* ── Same-as-current warning ───────────────────── */}
          {newPwd.length > 0 && !newDiffersFromCurrent && (
            <Alert variant="warning" className="small d-flex align-items-center py-2 mb-0">
              <i className="bi bi-exclamation-circle me-2"></i>
              New password must be different from your current password.
            </Alert>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Updating...
            </>
          ) : (
            <>
              <i className="bi bi-check2 me-1"></i> Change Password
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
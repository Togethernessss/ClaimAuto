import { useState } from 'react';
import { Card, Button } from 'react-bootstrap';
import ChangePasswordModal from './ChangePasswordModal';

/**
 * Small card on the Profile page that lets a user change their password.
 * Self-contained — opens its own modal.
 */
export default function ChangePasswordCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 py-3">
          <h6 className="mb-0 fw-semibold">
            <i className="bi bi-key text-primary me-2"></i>
            Password
          </h6>
          <small className="text-muted">
            Change your account password
          </small>
        </Card.Header>

        <Card.Body>
          <p className="small text-muted mb-3">
            Pick a strong password you don't use anywhere else.
            We recommend a password manager.
          </p>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            <i className="bi bi-pencil-square me-1"></i> Change Password
          </Button>
        </Card.Body>
      </Card>

      <ChangePasswordModal
        show={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
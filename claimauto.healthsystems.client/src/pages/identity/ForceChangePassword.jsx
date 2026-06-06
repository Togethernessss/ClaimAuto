import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Alert } from 'react-bootstrap';
import { useAuth } from '../../security/AuthContext';
import ChangePasswordModal from '../../components/identity/ChangePasswordModal';
import { getDashboardPath } from '../../security/permissions';

export default function ForceChangePassword() {
  const { user, login, token } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true);

  const handleClose = () => {
    // After successful change, clear the flag locally and go to dashboard
    const updatedUser = { ...user, mustChangePassword: false };
    login(token, updatedUser);
    navigate(getDashboardPath(user.role), { replace: true });
  };

  return (
    <Container className="py-5">
      <Card className="mx-auto" style={{ maxWidth: 560 }}>
        <Card.Body className="text-center p-4">
          <i className="bi bi-shield-lock text-warning" style={{ fontSize: '3rem' }}></i>
          <h3 className="mt-3">Password Change Required</h3>
          <Alert variant="warning" className="mt-3 mb-0">
            You logged in with a temporary password. Please change it before continuing.
          </Alert>
        </Card.Body>
      </Card>
      <ChangePasswordModal show={showModal} onClose={handleClose} />
    </Container>
  );
}
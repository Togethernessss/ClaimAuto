import { useState } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import { withdrawAppeal } from '../../services/appeals/appealService';

export default function WithdrawConfirmModal({ show, onClose, onSuccess, appeal }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  if (!appeal) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await withdrawAppeal(appeal.appealID);
      onSuccess?.(appeal.appealID);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Failed to withdraw.';
      setError(typeof msg === 'string' ? msg : 'Failed to withdraw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} backdrop="static" centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-danger">
          <i className="bi bi-exclamation-triangle me-2"></i> Withdraw Appeal
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Are you sure you want to withdraw <strong>APP-{appeal.appealID}</strong>?
        </p>
        <Alert variant="warning" className="small py-2 mb-0">
          <i className="bi bi-info-circle me-2"></i>
          This cannot be undone. The original claim's status will remain unchanged.
        </Alert>
        {error && (
          <Alert variant="danger" className="small py-2 mt-3 mb-0">
            <i className="bi bi-x-circle me-2"></i>
            {error}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0">
        <Button variant="light" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="danger" className="px-4 fw-semibold" onClick={handleConfirm} disabled={loading}>
          {loading ? (
            <><Spinner animation="border" size="sm" className="me-2" /> Withdrawing...</>
          ) : (
            <><i className="bi bi-x-circle me-2"></i> Yes, Withdraw</>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
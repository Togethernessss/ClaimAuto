import { Modal, Button, Alert, Spinner } from 'react-bootstrap';

export default function DeactivateModal({
  show,
  loading,
  error,
  policy,       // the policy being deactivated
  onHide,
  onConfirm,
}) {
  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      centered
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Deactivate Policy
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {policy && (
          <>
            <p className="mb-2">
              Are you sure you want to deactivate{' '}
              <strong>{policy.planName}</strong>{' '}
              <span className="text-muted font-monospace small">
                ({policy.planCode})
              </span>
              ?
            </p>
            <Alert variant="warning" className="small py-2">
              <i className="bi bi-info-circle me-2"></i>
              This sets the policy to <strong>Expired</strong>. The record
              is never deleted. This will fail if there are active members
              enrolled.
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
        <Button
          variant="light"
          onClick={onHide}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          className="px-4 fw-semibold"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Deactivating...
            </>
          ) : (
            <>
              <i className="bi bi-x-circle me-2"></i>
              Yes, Deactivate
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
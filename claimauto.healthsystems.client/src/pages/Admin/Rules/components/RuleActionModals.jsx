// src/pages/Admin/Rules/components/RuleActionModals.jsx
// Three lightweight confirm modals: Activate, Deactivate, Delete
import { Modal, Alert, Spinner } from 'react-bootstrap';

// ── ACTIVATE MODAL ────────────────────────────────────────────────────────────
export function ActivateRuleModal({ show, loading, error, rule, onHide, onConfirm }) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold" style={{ color: '#085041' }}>
          <i className="bi bi-check-circle me-2"></i>
          Activate Rule
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {rule && (
          <>
            <p className="mb-2">
              Activate <strong>{rule.name}</strong>?
            </p>
            <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa', fontSize: 13 }}>
              <div><span className="text-muted">Type:</span> <strong>{rule.ruleType}</strong></div>
              <div><span className="text-muted">Priority:</span> <strong>{rule.priority}</strong></div>
              <div><span className="text-muted">Version:</span> <strong>v{rule.version}</strong></div>
            </div>
            <Alert variant="success" className="small py-2">
              <i className="bi bi-info-circle me-2"></i>
              The adjudication engine will immediately start using this rule
              on all new auto-adjudication requests.
            </Alert>
          </>
        )}
        {error && (
          <Alert variant="danger" className="small py-2">
            <i className="bi bi-x-circle me-2"></i>{error}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0">
        <button className="btn btn-light" onClick={onHide} disabled={loading}>Cancel</button>
        <button
          className="btn btn-success fw-semibold px-4"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading
            ? <><Spinner animation="border" size="sm" className="me-2" />Activating...</>
            : <><i className="bi bi-check-circle me-2"></i>Yes, Activate</>}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

// ── DEACTIVATE MODAL ──────────────────────────────────────────────────────────
export function DeactivateRuleModal({ show, loading, error, rule, onHide, onConfirm }) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-warning">
          <i className="bi bi-pause-circle me-2"></i>
          Deactivate Rule
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {rule && (
          <>
            <p className="mb-2">
              Deactivate <strong>{rule.name}</strong>?
            </p>
            <div className="p-3 rounded mb-3" style={{ background: '#f8f9fa', fontSize: 13 }}>
              <div><span className="text-muted">Type:</span> <strong>{rule.ruleType}</strong></div>
              <div><span className="text-muted">Priority:</span> <strong>{rule.priority}</strong></div>
            </div>
            <Alert variant="warning" className="small py-2">
              <i className="bi bi-exclamation-triangle me-2"></i>
              The adjudication engine will stop using this rule immediately.
              Existing adjudication records are not affected.
              You can re-activate it at any time.
            </Alert>
          </>
        )}
        {error && (
          <Alert variant="danger" className="small py-2">
            <i className="bi bi-x-circle me-2"></i>{error}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0">
        <button className="btn btn-light" onClick={onHide} disabled={loading}>Cancel</button>
        <button
          className="btn btn-warning fw-semibold px-4"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading
            ? <><Spinner animation="border" size="sm" className="me-2" />Deactivating...</>
            : <><i className="bi bi-pause-circle me-2"></i>Yes, Deactivate</>}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

// ── DELETE MODAL ──────────────────────────────────────────────────────────────
export function DeleteRuleModal({ show, loading, error, rule, onHide, onConfirm }) {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold text-danger">
          <i className="bi bi-trash3 me-2"></i>
          Delete Rule
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {rule && (
          <>
            <p className="mb-2">
              Permanently delete <strong>{rule.name}</strong>?
            </p>
            <div className="p-3 rounded mb-3" style={{ background: '#fff5f5', border: '1px solid #ffcdd2', fontSize: 13 }}>
              <div><span className="text-muted">Type:</span> <strong>{rule.ruleType}</strong></div>
              <div><span className="text-muted">Priority:</span> <strong>{rule.priority}</strong></div>
              <div><span className="text-muted">Status:</span> <strong className="text-warning">Draft</strong></div>
            </div>
            <Alert variant="danger" className="small py-2">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              This is permanent and cannot be undone.
              Only Draft rules (never activated) can be deleted.
            </Alert>
          </>
        )}
        {error && (
          <Alert variant="danger" className="small py-2">
            <i className="bi bi-x-circle me-2"></i>{error}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0">
        <button className="btn btn-light" onClick={onHide} disabled={loading}>Cancel</button>
        <button
          className="btn btn-danger fw-semibold px-4"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading
            ? <><Spinner animation="border" size="sm" className="me-2" />Deleting...</>
            : <><i className="bi bi-trash3 me-2"></i>Yes, Delete</>}
        </button>
      </Modal.Footer>
    </Modal>
  );
}

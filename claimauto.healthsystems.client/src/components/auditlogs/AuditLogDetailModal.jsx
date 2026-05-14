import { Modal, Button, Badge } from 'react-bootstrap';
import ActionBadge from './ActionBadge';

// Props:
//   show    — boolean
//   log     — AuditLogDto instance (or null when closed)
//   onClose — () => void
export default function AuditLogDetailModal({ show, log, onClose }) {
  if (!log) return null;

  const details = log.parsedDetails;

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title>
          <i className="bi bi-journal-text text-primary me-2"></i>
          Audit Log <span className="text-muted small">#{log.auditID}</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* ── Metadata grid (2 columns) ──────────────────────── */}
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <small className="text-muted text-uppercase fw-bold d-block">When</small>
            <div>
              <i className="bi bi-clock-history text-muted me-1"></i>
              {log.absoluteTime}
            </div>
            <small className="text-muted">{log.relativeTime}</small>
          </div>

          <div className="col-md-6">
            <small className="text-muted text-uppercase fw-bold d-block">Who</small>
            <div>
              <i className="bi bi-person-circle text-muted me-1"></i>
              {log.userName}
              {log.userID && (
                <Badge bg="light" text="dark" className="ms-2">
                  User #{log.userID}
                </Badge>
              )}
            </div>
          </div>

          <div className="col-md-6">
            <small className="text-muted text-uppercase fw-bold d-block">Action</small>
            <ActionBadge log={log} />
          </div>

          <div className="col-md-6">
            <small className="text-muted text-uppercase fw-bold d-block">Resource</small>
            <div>{log.resourceLabel}</div>
          </div>
        </div>

        {/* ── Details JSON section ───────────────────────────── */}
        <div>
          <small className="text-muted text-uppercase fw-bold d-block mb-2">
            <i className="bi bi-code-square me-1"></i>
            Details
          </small>

          {details ? (
            <pre
              className="bg-dark text-light p-3 rounded mb-0"
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                fontSize: '0.85rem',
                fontFamily: '"Courier New", monospace',
              }}
            >
              {JSON.stringify(details, null, 2)}
            </pre>
          ) : (
            <div className="text-muted small fst-italic">
              <i className="bi bi-dash-circle me-1"></i>
              No details recorded for this entry.
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
import { Modal, Button, Badge } from 'react-bootstrap';
import ActionBadge from './ActionBadge';

function formatLabel(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPrimitive(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function renderDetailValue(value, depth = 0) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Empty list</span>;
    }

    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {value.map((item, index) => (
          <div
            key={`${depth}-${index}`}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#f8fafc',
              padding: 10,
            }}
          >
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
              Item {index + 1}
            </div>
            {renderDetailValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Empty object</span>;
    }

    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {entries.map(([key, child]) => (
          <div
            key={`${depth}-${key}`}
            style={{
              display: 'grid',
              gridTemplateColumns: depth > 1 ? '1fr' : '180px minmax(0,1fr)',
              gap: depth > 1 ? 4 : 12,
              alignItems: 'start',
              borderBottom: '1px solid #eef2f7',
              paddingBottom: 8,
            }}
          >
            <div style={{
              color: '#475569',
              fontSize: 12,
              fontWeight: 800,
              overflowWrap: 'anywhere',
            }}>
              {formatLabel(key)}
            </div>
            <div style={{ minWidth: 0 }}>{renderDetailValue(child, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <span style={{
      display: 'inline-flex',
      maxWidth: '100%',
      overflowWrap: 'anywhere',
      background: '#f8fafc',
      border: '1px solid #e5e7eb',
      borderRadius: 6,
      padding: '4px 8px',
      color: '#111827',
      fontFamily: 'monospace',
      fontSize: 12,
    }}>
      {formatPrimitive(value)}
    </span>
  );
}

function buildDownloadPayload(log) {
  return {
    auditID: log.auditID,
    userID: log.userID,
    userName: log.userName,
    action: log.action,
    resourceType: log.resourceType,
    resourceID: log.resourceID,
    resourceLabel: log.resourceLabel,
    details: log.parsedDetails,
    detailsJSON: log.detailsJSON,
    timestamp: log.timestamp?.toISOString?.() ?? null,
    absoluteTime: log.absoluteTime,
  };
}

function downloadLog(log) {
  const blob = new Blob([JSON.stringify(buildDownloadPayload(log), null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ClaimAuto-AuditLog-${log.auditID}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
}

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

        <div>
          <small className="text-muted text-uppercase fw-bold d-block mb-2">
            <i className="bi bi-code-square me-1"></i>
            Details
          </small>

          {details ? (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#ffffff',
              overflow: 'hidden',
            }}>
              <div style={{ padding: 14 }}>
                {renderDetailValue(details)}
              </div>

              <details style={{ borderTop: '1px solid #eef2f7', background: '#f8fafc' }}>
                <summary style={{
                  cursor: 'pointer',
                  padding: '10px 14px',
                  fontSize: 12,
                  color: '#475569',
                  fontWeight: 800,
                }}>
                  Raw JSON
                </summary>
                <pre
                  className="mb-0"
                  style={{
                    maxHeight: 220,
                    overflowY: 'auto',
                    fontSize: '0.78rem',
                    fontFamily: '"Courier New", monospace',
                    padding: 14,
                    background: '#111827',
                    color: '#f8fafc',
                  }}
                >
                  {JSON.stringify(details, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="text-muted small fst-italic">
              <i className="bi bi-dash-circle me-1"></i>
              No details recorded for this entry.
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-primary" onClick={() => downloadLog(log)}>
          <i className="bi bi-download me-1"></i>
          Download JSON
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

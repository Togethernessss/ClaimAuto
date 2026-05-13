import { Table, Spinner, Alert, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ActionBadge from './ActionBadge';

// Props:
//   logs       — array of AuditLogDto instances
//   loading    — boolean
//   error      — string or null
//   onViewLog  — (log) => void, called when user clicks "View" on a row
export default function AuditLogTable({ logs, loading, error, onViewLog }) {
  // ── State #1: loading ──────────────────────────────
  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="text-muted mt-3 mb-0">Loading audit logs...</p>
      </div>
    );
  }

  // ── State #2: error ────────────────────────────────
  if (error) {
    return (
      <Alert variant="danger" className="d-flex align-items-center m-3">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        <div>{error}</div>
      </Alert>
    );
  }

  // ── State #3: empty ────────────────────────────────
  if (!logs || logs.length === 0) {
    return (
      <div className="text-center p-5">
        <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
        <p className="text-muted mt-2 mb-0">No audit logs found.</p>
      </div>
    );
  }

  // ── State #4: data ─────────────────────────────────
  return (
    <Table hover responsive className="align-middle mb-0">
      <thead className="table-light">
        <tr>
          <th style={{ width: '80px' }}>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Each audit entry's own primary key</Tooltip>}
            >
              <span>Log ID <i className="bi bi-info-circle text-muted small"></i></span>
            </OverlayTrigger>
          </th>
          <th style={{ width: '180px' }}>Timestamp</th>
          <th style={{ width: '200px' }}>User</th>
          <th style={{ width: '180px' }}>Action</th>
          <th>Resource</th>
          <th style={{ width: '90px' }}>Details</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.auditID}>
            <td className="text-muted small">#{log.auditID}</td>

            {/* Timestamp: relative time as main label, absolute on tooltip */}
            <td>
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>{log.absoluteTime}</Tooltip>}
              >
                <span className="small">
                  <i className="bi bi-clock-history me-1 text-muted"></i>
                  {log.relativeTime}
                </span>
              </OverlayTrigger>
            </td>

            <td>
              <i className="bi bi-person-circle me-1 text-muted"></i>
              {log.userName}
              {log.userID && (
                <span className="text-muted small ms-1">#{log.userID}</span>
              )}
            </td>

            <td>
              <ActionBadge log={log} />
            </td>

            <td className="small">{log.resourceLabel}</td>

            <td>
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => onViewLog && onViewLog(log)}
                title="View details"
              >
                <i className="bi bi-eye"></i> View
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
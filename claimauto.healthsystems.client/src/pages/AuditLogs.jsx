import { Container, Card } from 'react-bootstrap';

export default function AuditLogs() {
  return (
    <Container fluid>
      <div className="d-flex align-items-center mb-4">
        <i className="bi bi-journal-text fs-2 text-primary me-3"></i>
        <div>
          <h3 className="fw-bold mb-0">Audit Logs</h3>
          <small className="text-muted">Admin-only — full activity trail</small>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-5 text-center">
          <i className="bi bi-tools text-muted" style={{ fontSize: '4rem' }}></i>
          <h5 className="fw-bold mt-3">Module under construction</h5>
          <p className="text-muted mb-0">
            This page will list every action recorded by{' '}
            <code>AuditLogRepository</code>. We'll wire it up in the next session.
          </p>
        </Card.Body>
      </Card>
    </Container>
  );
}
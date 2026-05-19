import { useNavigate } from 'react-router-dom';
import { Card, Table, Button, Spinner, Alert } from 'react-bootstrap';
import AppealStatusBadge from './AppealStatusBadge';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
}

export default function AppealsTable({
  appeals, loading, error,
  isStaff, currentUserName,
  onWithdraw, onDecide, onReload,
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="mt-2 text-muted small">Loading appeals...</div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body>
          <Alert variant="danger" className="d-flex align-items-center mb-0">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {error}
            <Button variant="link" size="sm" className="ms-auto p-0" onClick={onReload}>
              Retry
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (appeals.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <i className="bi bi-inbox" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
          <div className="fw-semibold text-muted mt-3">No appeals found</div>
          <small className="text-muted">Appeals filed will appear here</small>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <tr>
                <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">Appeal ID</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Claim</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Filed By</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Filed On</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Reason</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase">Status</th>
                <th className="py-3 text-muted small fw-semibold text-uppercase text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appeals.map((a) => {
                const isOwner = a.filedByName === currentUserName;
                const canWithdraw = isOwner && ['Filed', 'UnderReview'].includes(a.status);
                const canDecide   = isStaff && ['Filed', 'UnderReview'].includes(a.status);

                return (
                  <tr key={a.appealID} style={{ cursor: 'pointer' }}>
                    <td className="ps-4 py-3 fw-semibold font-monospace" onClick={() => navigate(`/appeals/${a.appealID}`)}>
                      APP-{a.appealID}
                    </td>
                    <td className="py-3 font-monospace" onClick={() => navigate(`/appeals/${a.appealID}`)}>
                      CLM-{a.claimID}
                    </td>
                    <td className="py-3" onClick={() => navigate(`/appeals/${a.appealID}`)}>
                      {a.filedByName}
                    </td>
                    <td className="py-3 small" onClick={() => navigate(`/appeals/${a.appealID}`)}>
                      {formatDate(a.filedAt)}
                    </td>
                    <td className="py-3 small text-muted" style={{ maxWidth: 250 }} onClick={() => navigate(`/appeals/${a.appealID}`)}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {a.reason}
                      </span>
                    </td>
                    <td className="py-3" onClick={() => navigate(`/appeals/${a.appealID}`)}>
                      <AppealStatusBadge status={a.status} outcome={a.outcome} />
                    </td>
                    <td className="py-3 pe-4 text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2 rounded-pill"
                        onClick={(e) => { e.stopPropagation(); navigate(`/appeals/${a.appealID}`); }}
                      >
                        <i className="bi bi-eye me-1"></i> View
                      </Button>
                      {canDecide && (
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="me-2 rounded-pill"
                          onClick={(e) => { e.stopPropagation(); onDecide(a); }}
                        >
                          <i className="bi bi-gavel me-1"></i> Decide
                        </Button>
                      )}
                      {canWithdraw && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-pill"
                          onClick={(e) => { e.stopPropagation(); onWithdraw(a); }}
                        >
                          <i className="bi bi-x-circle me-1"></i> Withdraw
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
}
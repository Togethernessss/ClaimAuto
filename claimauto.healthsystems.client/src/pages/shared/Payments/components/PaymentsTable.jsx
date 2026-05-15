import { Card, Table, Button, Alert, Spinner } from 'react-bootstrap';
import { formatCurrency, formatDate, formatPaymentId, statusStyle } from '../utils/paymentHelpers';

function StatusBadge({ status, referenceNumber }) {
  const s = statusStyle(status);
  return (
    <div>
      <span style={{
        background: s.bg, color: s.text,
        padding: '3px 10px', borderRadius: 6,
        fontSize: 12, fontWeight: 600,
      }}>
        {status === 'OnHold' ? 'On Hold' : status}
      </span>
      {status === 'Executed' && referenceNumber && (
        <div className="text-muted font-monospace mt-1" style={{ fontSize: 10 }}>
          Ref: {referenceNumber}
        </div>
      )}
    </div>
  );
}

export default function PaymentsTable({
  payments,
  loading,
  error,
  actionLoading,
  onRetry,
  onAuthorize,
  onOpenExecute,
  onOpenHold,
  onOpenResume,
}) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">

        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2 text-muted small">Loading payments...</div>
          </div>
        )}

        {!loading && error && (
          <div className="p-4">
            <Alert variant="danger" className="d-flex align-items-center mb-0">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <Button variant="link" size="sm" className="ms-auto p-0 text-danger" onClick={onRetry}>
                <i className="bi bi-arrow-clockwise me-1"></i> Retry
              </Button>
            </Alert>
          </div>
        )}

        {!loading && !error && payments.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-credit-card" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
            <div className="fw-semibold text-muted mt-3">No payments found</div>
            <div className="small text-muted mt-1">
              Payments are created after claim adjudication.
            </div>
          </div>
        )}

        {!loading && !error && payments.length > 0 && (
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <tr>
                  <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">Payment</th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">Claim</th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">Payee</th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">Amount</th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">Method</th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">Scheduled</th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">Status</th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.paymentID}>

                    <td className="ps-4 py-3">
                      <div className="fw-semibold font-monospace" style={{ fontSize: 13 }}>
                        {formatPaymentId(p.paymentID)}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {formatDate(p.createdAt)}
                      </div>
                    </td>

                    <td className="py-3">
                      <span className="font-monospace text-muted" style={{ fontSize: 12 }}>
                        Claim #{p.claimID}
                      </span>
                    </td>

                    <td className="py-3">
                      <div className="fw-semibold" style={{ fontSize: 13 }}>{p.payeeName}</div>
                    </td>

                    <td className="py-3">
                      <div className="fw-semibold">{formatCurrency(p.amount)}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{p.currency}</div>
                    </td>

                    <td className="py-3">
                      <span style={{
                        background: '#f3f0ff', color: '#764ba2',
                        padding: '2px 8px', borderRadius: 4,
                        fontSize: 12, fontWeight: 500,
                      }}>
                        {p.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3 text-muted" style={{ fontSize: 12 }}>
                      {formatDate(p.scheduledAt)}
                    </td>

                    <td className="py-3">
                      <StatusBadge status={p.status} referenceNumber={p.referenceNumber} />
                    </td>

                    <td className="py-3 pe-4">
                      <div className="d-flex flex-column align-items-end gap-1">

                        {p.status === 'Pending' && (
                          <Button size="sm"
                            disabled={actionLoading === p.paymentID}
                            onClick={() => onAuthorize(p.paymentID)}
                            style={{
                              width: 110, borderRadius: 6, fontWeight: 600, fontSize: '0.78rem',
                              background: '#e8f0fe', border: '1.5px solid #4285f4', color: '#1a56db',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 5, padding: '5px 0',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#4285f4'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#e8f0fe'; e.currentTarget.style.color = '#1a56db'; }}
                          >
                            {actionLoading === p.paymentID
                              ? <Spinner animation="border" size="sm" />
                              : <><i className="bi bi-check2 me-1"></i>Authorize</>}
                          </Button>
                        )}

                        {p.status === 'Authorized' && (
                          <Button size="sm"
                            disabled={actionLoading === p.paymentID}
                            onClick={() => onOpenExecute(p.paymentID)}
                            style={{
                              width: 110, borderRadius: 6, fontWeight: 600, fontSize: '0.78rem',
                              background: '#d1e7dd', border: '1.5px solid #0a3622', color: '#0a3622',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 5, padding: '5px 0',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#0a3622'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#d1e7dd'; e.currentTarget.style.color = '#0a3622'; }}
                          >
                            <i className="bi bi-send me-1"></i>Execute
                          </Button>
                        )}

                        {(p.status === 'Pending' || p.status === 'Authorized') && (
                          <Button size="sm"
                            disabled={actionLoading === p.paymentID}
                            onClick={() => onOpenHold(p)}
                            style={{
                              width: 110, borderRadius: 6, fontWeight: 600, fontSize: '0.78rem',
                              background: '#fdecea', border: '1.5px solid #e53935', color: '#b71c1c',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 5, padding: '5px 0',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#e53935'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fdecea'; e.currentTarget.style.color = '#b71c1c'; }}
                          >
                            <i className="bi bi-pause-circle me-1"></i>Hold
                          </Button>
                        )}

                        {p.status === 'OnHold' && (
                          <Button size="sm"
                            disabled={actionLoading === p.paymentID}
                            onClick={() => onOpenResume(p)}
                            style={{
                              width: 110, borderRadius: 6, fontWeight: 600, fontSize: '0.78rem',
                              background: '#d1f2eb', border: '1.5px solid #1b5e20', color: '#1b5e20',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              gap: 5, padding: '5px 0',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#1b5e20'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#d1f2eb'; e.currentTarget.style.color = '#1b5e20'; }}
                          >
                            <i className="bi bi-play-circle me-1"></i>Resume
                          </Button>
                        )}

                        {p.status === 'Executed' && (
                          <span style={{ fontSize: '0.78rem', color: '#9e9e9e', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="bi bi-check-circle-fill text-success"></i> Completed
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

      </Card.Body>
    </Card>
  );
}
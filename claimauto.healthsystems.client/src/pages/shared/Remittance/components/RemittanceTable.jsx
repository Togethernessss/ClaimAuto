import { Card, Table, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';
import {
  formatCurrency, formatDate,
  formatRemittanceId, formatPaymentId, statusStyle,
} from '../utils/remittanceHelpers';
import { downloadRemittancePdf } from '../../../../services/payments/remittanceService';

function StatusBadge({ status }) {
  const s = statusStyle(status);
  return (
    <span style={{
      background: s.bg, color: s.text,
      padding: '3px 10px', borderRadius: 6,
      fontSize: 12, fontWeight: 600,
    }}>
      {status}
    </span>
  );
}

export default function RemittanceTable({
  remittances,
  loading,
  error,
  actionLoading,
  onRetry,
  onOpenAcknowledge,
}) {
  const { user } = useAuth();
  const isHospital = canAccess(user?.role, ['Hospital']);

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-0">

        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2 text-muted small">Loading remittances...</div>
          </div>
        )}

        {!loading && error && (
          <div className="p-4">
            <Alert variant="danger" className="d-flex align-items-center mb-0">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
              <Button
                variant="link" size="sm"
                className="ms-auto p-0 text-danger"
                onClick={onRetry}
              >
                <i className="bi bi-arrow-clockwise me-1"></i> Retry
              </Button>
            </Alert>
          </div>
        )}

        {!loading && !error && remittances.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-receipt"
              style={{ fontSize: 48, color: '#dfe4ea' }}></i>
            <div className="fw-semibold text-muted mt-3">
              No remittances found
            </div>
            <div className="small text-muted mt-1">
              Remittances are generated automatically when payments are created.
            </div>
          </div>
        )}

        {!loading && !error && remittances.length > 0 && (
          <div className="table-responsive">
            <Table hover className="mb-0 align-middle">
              <thead style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6',
              }}>
                <tr>
                  <th className="ps-4 py-3 text-muted small fw-semibold text-uppercase">
                    Rem ID
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Pay ID
                  </th>
                  {!isHospital && (
                    <th className="py-3 text-muted small fw-semibold text-uppercase">
                      Payee
                    </th>
                  )}
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Claim
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Amount
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Generated
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Sent on
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase">
                    Status
                  </th>
                  <th className="py-3 text-muted small fw-semibold text-uppercase text-end pe-4">
                    {isHospital ? 'Action' : 'File'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {remittances.map((r) => (
                  <tr
                    key={r.remittanceID}
                    style={{
                      background: r.status === 'Sent' && isHospital
                        ? '#fffbf0' : 'white',
                    }}
                  >
                    <td className="ps-4 py-3">
                      <span className="font-monospace fw-semibold"
                        style={{ fontSize: 13 }}>
                        {formatRemittanceId(r.remittanceID)}
                      </span>
                    </td>

                    <td className="py-3">
                      <span className="font-monospace text-muted"
                        style={{ fontSize: 12 }}>
                        {formatPaymentId(r.paymentID)}
                      </span>
                    </td>

                    {!isHospital && (
                      <td className="py-3">
                        <div className="fw-semibold" style={{ fontSize: 13 }}>
                          {r.payeeName}
                        </div>
                      </td>
                    )}

                    <td className="py-3">
                      <span className="font-monospace text-muted"
                        style={{ fontSize: 12 }}>
                        Claim #{r.claimID}
                      </span>
                    </td>

                    <td className="py-3">
                      <div className="fw-semibold">
                        {formatCurrency(r.amount)}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11 }}>
                        {r.currency}
                      </div>
                    </td>

                    <td className="py-3 text-muted" style={{ fontSize: 12 }}>
                      {formatDate(r.generatedAt)}
                    </td>

                    <td className="py-3 text-muted" style={{ fontSize: 12 }}>
                      {formatDate(r.sentToProviderAt)}
                    </td>

                    <td className="py-3">
                      <StatusBadge status={r.status} />
                    </td>

                    <td className="py-3 pe-4">
                      <div className="d-flex flex-column align-items-end gap-1">

                        {/* Hospital — Acknowledge button */}
                        {isHospital && r.status === 'Sent' && (
                          <Button
                            size="sm"
                            disabled={actionLoading === r.paymentID}
                            onClick={() => onOpenAcknowledge(r)}
                            style={{
                              width: 120, borderRadius: 6,
                              fontWeight: 600, fontSize: '0.78rem',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              border: 'none', color: 'white',
                              display: 'flex', alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5, padding: '5px 0',
                            }}
                          >
                            {actionLoading === r.paymentID
                              ? <Spinner animation="border" size="sm" />
                              : <><i className="bi bi-check2 me-1"></i>Acknowledge</>}
                          </Button>
                        )}

                        {/* Hospital — Download PDF */}
                        {isHospital && r.hasPDF && (
                          <button
                            onClick={() => downloadRemittancePdf(r.paymentID)}
                            style={{
                              fontSize: 11, color: '#667eea',
                              background: 'none', border: 'none',
                              padding: 0, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <i className="bi bi-file-earmark-pdf me-1"></i>
                            Download PDF
                          </button>
                        )}

                        {/* Hospital — Already acknowledged, no PDF */}
                        {isHospital && r.status === 'Acknowledged' && !r.hasPDF && (
                          <span style={{
                            fontSize: '0.78rem', color: '#085041',
                            fontStyle: 'italic',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <i className="bi bi-check-circle-fill text-success"></i>
                            Confirmed
                          </span>
                        )}

                        {/* Hospital — Generated, not yet sent */}
                        {isHospital && r.status === 'Generated' && (
                          <span style={{
                            fontSize: '0.78rem', color: '#9e9e9e',
                            fontStyle: 'italic',
                          }}>
                            Awaiting payment
                          </span>
                        )}

                        {/* Admin/Staff — Download PDF */}
                        {!isHospital && r.hasPDF && (
                          <button
                            onClick={() => downloadRemittancePdf(r.paymentID)}
                            style={{
                              fontSize: 12, color: '#667eea',
                              background: 'none', border: 'none',
                              padding: 0, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <i className="bi bi-file-earmark-pdf me-1"></i>
                            Download
                          </button>
                        )}

                        {/* Admin/Staff — No PDF yet */}
                        {!isHospital && !r.hasPDF && (
                          <span style={{ fontSize: 12, color: '#9e9e9e' }}>
                            No file
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
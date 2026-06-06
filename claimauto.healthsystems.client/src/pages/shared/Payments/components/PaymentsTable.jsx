import { Button, Alert, Spinner } from 'react-bootstrap';
import { formatCurrency, formatDate, formatPaymentId, statusStyle } from '../utils/paymentHelpers';

function StatusBadge({ status, referenceNumber }) {
  const s = statusStyle(status);
  return (
    <div>
      <span style={{
        background: s.bg,
        color: s.text,
        padding: '5px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 26,
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

function DetailBlock({ label, children, align = 'left' }) {
  return (
    <div style={{ minWidth: 0, textAlign: align }}>
      <div style={{
        color: '#94a3b8',
        fontSize: 10,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0,
        marginBottom: 5,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ActionButton({ children, variant, disabled, onClick }) {
  const palette = {
    authorize: { bg: '#e8f0fe', border: '#4285f4', text: '#1a56db' },
    execute: { bg: '#d1e7dd', border: '#0a7a43', text: '#0a3622' },
    hold: { bg: '#fdecea', border: '#e53935', text: '#b71c1c' },
    resume: { bg: '#d1f2eb', border: '#138a72', text: '#115e59' },
  }[variant];

  return (
    <Button
      size="sm"
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 112,
        borderRadius: 8,
        fontWeight: 700,
        fontSize: '0.78rem',
        background: palette.bg,
        border: `1.5px solid ${palette.border}`,
        color: palette.text,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '6px 10px',
      }}
    >
      {children}
    </Button>
  );
}

function PaymentActions({
  payment,
  actionLoading,
  onAuthorize,
  onOpenExecute,
  onOpenHold,
  onOpenResume,
}) {
  const isBusy = actionLoading === payment.paymentID;

  return (
    <div className="d-flex flex-wrap justify-content-end gap-2">
      {payment.status === 'Pending' && (
        <ActionButton
          variant="authorize"
          disabled={isBusy}
          onClick={() => onAuthorize(payment.paymentID)}
        >
          {isBusy ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <>
              <i className="bi bi-check2"></i>
              Authorize
            </>
          )}
        </ActionButton>
      )}

      {payment.status === 'Authorized' && (
        <ActionButton
          variant="execute"
          disabled={isBusy}
          onClick={() => onOpenExecute(payment.paymentID)}
        >
          <i className="bi bi-send"></i>
          Execute
        </ActionButton>
      )}

      {(payment.status === 'Pending' || payment.status === 'Authorized') && (
        <ActionButton
          variant="hold"
          disabled={isBusy}
          onClick={() => onOpenHold(payment)}
        >
          <i className="bi bi-pause-circle"></i>
          Hold
        </ActionButton>
      )}

      {payment.status === 'OnHold' && (
        <ActionButton
          variant="resume"
          disabled={isBusy}
          onClick={() => onOpenResume(payment)}
        >
          <i className="bi bi-play-circle"></i>
          Resume
        </ActionButton>
      )}

      {payment.status === 'Executed' && (
        <span style={{
          fontSize: '0.78rem',
          color: '#64748b',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 32,
        }}>
          <i className="bi bi-check-circle-fill text-success"></i>
          Completed
        </span>
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
  if (loading) {
    return (
      <div className="text-center py-5 bg-white" style={{ borderRadius: 8 }}>
        <Spinner animation="border" variant="primary" />
        <div className="mt-2 text-muted small">Loading payments...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4" style={{ borderRadius: 8 }}>
        <Alert variant="danger" className="d-flex align-items-center mb-0">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
          <Button variant="link" size="sm" className="ms-auto p-0 text-danger" onClick={onRetry}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-5 bg-white" style={{ borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <i className="bi bi-credit-card" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
        <div className="fw-semibold text-muted mt-3">No payments found</div>
        <div className="small text-muted mt-1">
          Payments are created after claim adjudication.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 8,
      border: '1px solid #e5e7eb',
      boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 18px',
        borderBottom: '1px solid #eef2f7',
        background: '#fbfdff',
      }}>
        <div>
          <div style={{ fontWeight: 800, color: '#1f2937', fontSize: 15 }}>
            Payment Queue
          </div>
          <div style={{ color: '#64748b', fontSize: 12 }}>
            {payments.length} payment{payments.length !== 1 ? 's' : ''} in this view
          </div>
        </div>
        <span style={{
          background: '#eef2ff',
          color: '#4338ca',
          borderRadius: 999,
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 800,
        }}>
          Latest first
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 980 }}>
          {payments.map((p, idx) => (
            <div
              key={p.paymentID}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.15fr 1.15fr 0.95fr 0.9fr 0.9fr 1.25fr',
                gap: 18,
                alignItems: 'center',
                padding: '16px 18px',
                borderTop: idx === 0 ? 'none' : '1px solid #f1f5f9',
                background: idx % 2 === 0 ? '#ffffff' : '#fbfdff',
              }}
            >
              <DetailBlock label="Payment">
                <div className="font-monospace" style={{ fontWeight: 800, color: '#111827', fontSize: 14 }}>
                  {formatPaymentId(p.paymentID)}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  {formatDate(p.createdAt)}
                </div>
              </DetailBlock>

              <DetailBlock label="Payee">
                <div style={{ fontWeight: 800, color: '#111827', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.payeeName}
                </div>
                <div className="font-monospace" style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  Claim #{p.claimID}
                </div>
              </DetailBlock>

              <DetailBlock label="Amount">
                <div style={{ fontWeight: 800, color: '#111827', fontSize: 15 }}>
                  {formatCurrency(p.amount)}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                  {p.currency}
                </div>
              </DetailBlock>

              <DetailBlock label="Method">
                <span style={{
                  background: '#f3f0ff',
                  color: '#764ba2',
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  display: 'inline-flex',
                }}>
                  {p.paymentMethod}
                </span>
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 7 }}>
                  {formatDate(p.scheduledAt)}
                </div>
              </DetailBlock>

              <DetailBlock label="Status">
                <StatusBadge status={p.status} referenceNumber={p.referenceNumber} />
              </DetailBlock>

              <DetailBlock label="Actions" align="right">
                <PaymentActions
                  payment={p}
                  actionLoading={actionLoading}
                  onAuthorize={onAuthorize}
                  onOpenExecute={onOpenExecute}
                  onOpenHold={onOpenHold}
                  onOpenResume={onOpenResume}
                />
              </DetailBlock>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

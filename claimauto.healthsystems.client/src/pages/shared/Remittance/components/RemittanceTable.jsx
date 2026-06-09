import { Spinner } from 'react-bootstrap';
import { useAuth } from '../../../../security/AuthContext';
import { canAccess } from '../../../../security/permissions';
import {
  formatCurrency, formatDate,
  formatRemittanceId, formatPaymentId, statusStyle,
} from '../utils/remittanceHelpers';
import { downloadRemittancePdf } from '../../../../services/payments/remittanceService';

function StatusPill({ status }) {
  const s = statusStyle(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.text,
      padding: '3px 10px', borderRadius: 999,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.text, opacity: 0.7, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function ActionBtn({ label, icon, bg, color, border, hoverBg, onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '5px 12px', borderRadius: 8, border,
        background: disabled ? '#f3f4f6' : bg,
        color: disabled ? '#9ca3af' : color,
        fontWeight: 700, fontSize: '0.73rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = hoverBg;
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.borderColor = hoverBg;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = disabled ? '#f3f4f6' : bg;
        e.currentTarget.style.color = disabled ? '#9ca3af' : color;
        e.currentTarget.style.borderColor = border.replace('1.5px solid ', '');
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children || (<><i className={`bi ${icon}`} style={{ fontSize: '0.68rem' }}></i>{label}</>)}
    </button>
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
  const { user }    = useAuth();
  const isHospital  = canAccess(user?.role, ['Hospital']);

  // Grid columns differ for Hospital (no Payee column)
  const GRID = isHospital
    ? '120px 110px 110px 130px 100px 110px 110px 170px'
    : '120px 110px 150px 110px 130px 100px 110px 170px';

  const HEADERS = isHospital
    ? ['Rem ID', 'Pay ID', 'Claim', 'Amount', 'Generated', 'Sent On', 'Status', 'Actions']
    : ['Rem ID', 'Pay ID', 'Payee', 'Claim', 'Amount', 'Generated', 'Sent On', 'Status', 'Actions'];

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <Spinner animation="border" variant="light" size="sm" />
      </div>
      <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading remittances…</div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#fff5f5', border: '1px solid #fca5a5',
      borderRadius: 14, padding: '16px 20px',
    }}>
      <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626', fontSize: 18, flexShrink: 0 }}></i>
      <div style={{ flex: 1, color: '#dc2626', fontSize: '0.85rem' }}>{error}</div>
      <button onClick={onRetry} style={{
        background: '#fee2e2', border: '1px solid #fca5a5',
        color: '#dc2626', borderRadius: 20, padding: '5px 14px',
        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
      }}>
        <i className="bi bi-arrow-clockwise me-1"></i>Retry
      </button>
    </div>
  );

  // ── Empty ────────────────────────────────────────────────────────────────
  if (remittances.length === 0) return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      padding: '56px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 68, height: 68, borderRadius: '50%',
        background: 'linear-gradient(135deg, #f3f0ff, #faf5ff)',
        border: '2px solid #ede9fe',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <i className="bi bi-receipt" style={{ fontSize: '1.8rem', color: '#7c3aed' }}></i>
      </div>
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>No remittances found</div>
      <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
        Remittances are generated automatically when payments are executed.
      </div>
    </div>
  );

  // ── Table ─────────────────────────────────────────────────────────────────
  // All columns are fixed-pixel widths so the Actions header never gets clipped.
  // Using 1fr for the last column caused it to collapse to ~0 when the fixed
  // columns already exceeded the minWidth constraint.
  const gridCols = isHospital
    ? '120px 110px 110px 130px 100px 110px 110px 120px'
    : '120px 110px 150px 110px 130px 100px 110px 110px 120px';

  const headers = isHospital
    ? ['Rem ID', 'Pay ID', 'Claim', 'Amount', 'Generated', 'Sent On', 'Status', 'Actions']
    : ['Rem ID', 'Pay ID', 'Payee', 'Claim', 'Amount', 'Generated', 'Sent On', 'Status', 'Actions'];

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(102,126,234,0.10)',
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>

        {/* ── Gradient header ─────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '11px 18px', minWidth: 'max-content',
        }}>
          {headers.map((h, i) => (
            <div key={h} style={{
              fontSize: '0.69rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.6px', textTransform: 'uppercase',
              textAlign: i === headers.length - 1 ? 'right' : 'left',
            }}>{h}</div>
          ))}
        </div>

        {/* ── Data rows ───────────────────────────────────── */}
        {remittances.map((r, idx) => {
          const isLast     = idx === remittances.length - 1;
          const highlight  = r.status === 'Sent' && isHospital;

          return (
            <div
              key={r.remittanceID}
              style={{
                display: 'grid', gridTemplateColumns: gridCols,
                padding: '13px 18px', minWidth: 'max-content',
                alignItems: 'center',
                background: highlight ? '#fffbf0' : 'transparent',
                borderBottom: isLast ? 'none' : '1px solid #f3f0ff',
                borderLeft: highlight ? '3px solid #f59e0b' : '3px solid transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { if (!highlight) e.currentTarget.style.background = '#faf9ff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = highlight ? '#fffbf0' : 'transparent'; }}
            >
              {/* Rem ID */}
              <div>
                <span style={{
                  fontFamily: 'monospace', fontWeight: 700,
                  fontSize: '0.83rem', color: '#1e1b4b',
                }}>{formatRemittanceId(r.remittanceID)}</span>
              </div>

              {/* Pay ID */}
              <div>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.77rem',
                  color: '#6b7280', background: '#f3f4f6',
                  padding: '2px 7px', borderRadius: 5,
                }}>{formatPaymentId(r.paymentID)}</span>
              </div>

              {/* Payee — Admin/Staff only */}
              {!isHospital && (
                <div style={{ fontWeight: 600, fontSize: '0.83rem', color: '#374151' }}>
                  {r.payeeName}
                </div>
              )}

              {/* Claim */}
              <div>
                <span style={{
                  fontFamily: 'monospace', fontSize: '0.77rem', color: '#7c3aed',
                  background: '#f5f3ff', padding: '2px 7px', borderRadius: 5,
                }}>CLM-{r.claimID}</span>
              </div>

              {/* Amount */}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e1b4b' }}>
                  {formatCurrency(r.amount)}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{r.currency}</div>
              </div>

              {/* Generated */}
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                <i className="bi bi-calendar3 me-1" style={{ fontSize: 9, color: '#9ca3af' }}></i>
                {formatDate(r.generatedAt)}
              </div>

              {/* Sent On */}
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                {r.sentToProviderAt
                  ? <><i className="bi bi-send me-1" style={{ fontSize: 9, color: '#9ca3af' }}></i>{formatDate(r.sentToProviderAt)}</>
                  : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>—</span>}
              </div>

              {/* Status */}
              <div><StatusPill status={r.status} /></div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>

                {/* ── Hospital actions ─────────────────────── */}
                {isHospital && (
                  <>
                    {r.status === 'Sent' && (
                      <ActionBtn
                        label="Acknowledge"
                        icon="bi-check2"
                        bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        color="white"
                        border="1.5px solid #667eea"
                        hoverBg="#4f46e5"
                        disabled={actionLoading === r.paymentID}
                        onClick={() => onOpenAcknowledge(r)}
                      >
                        {actionLoading === r.paymentID
                          ? <Spinner animation="border" size="sm" style={{ width: 13, height: 13 }} />
                          : <><i className="bi bi-check2" style={{ fontSize: '0.68rem' }}></i>Acknowledge</>}
                      </ActionBtn>
                    )}

                    {r.status === 'Acknowledged' && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: '0.75rem', color: '#059669', fontWeight: 600,
                        background: '#d1fae5', padding: '4px 10px',
                        borderRadius: 999, whiteSpace: 'nowrap',
                      }}>
                        <i className="bi bi-check-circle-fill" style={{ fontSize: 10 }}></i>
                        Confirmed
                      </span>
                    )}

                    {(r.status === 'Sent' || r.status === 'Acknowledged') && r.hasPDF && (
                      <ActionBtn
                        label="PDF"
                        icon="bi-file-earmark-pdf-fill"
                        bg="#f0fdf4" color="#15803d"
                        border="1.5px solid #86efac"
                        hoverBg="#16a34a"
                        onClick={() => downloadRemittancePdf(r.paymentID)}
                      />
                    )}
                  </>
                )}

                {/* ── Admin / Staff actions ────────────────── */}
                {!isHospital && (
                  r.hasPDF ? (
                    <ActionBtn
                      label="PDF"
                      icon="bi-file-earmark-pdf-fill"
                      bg="#f0fdf4" color="#15803d"
                      border="1.5px solid #86efac"
                      hoverBg="#16a34a"
                      onClick={() => downloadRemittancePdf(r.paymentID)}
                    />
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#d1d5db', fontStyle: 'italic' }}>No file</span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 18px', borderTop: '1px solid #f3f0ff', background: '#faf9ff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {remittances.length} remittance{remittances.length !== 1 ? 's' : ''}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
          <i className="bi bi-clock-history me-1"></i>Sorted by newest first
        </span>
      </div>
    </div>
  );
}

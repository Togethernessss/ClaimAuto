import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../data/policyholderDashboardData';

/**
 * Recent payments card.
 * Props unchanged: { payments }
 * Navigate logic unchanged.
 */
export default function RecentPaymentsCard({ payments }) {
  const navigate = useNavigate();
  const recent   = payments.slice(0, 3);

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        className="d-flex align-items-center justify-content-between px-4 py-3"
        style={{ borderBottom: '1px solid #f1f5f9' }}
      >
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="bi bi-credit-card-fill text-white" style={{ fontSize: '0.9rem' }}></i>
          </div>
          <span className="fw-bold" style={{ color: '#1e293b', fontSize: '0.97rem' }}>Recent Payments</span>
        </div>
        <button
          className="btn btn-sm rounded-pill"
          style={{ background: '#ecfdf5', color: '#065f46', border: 'none', fontWeight: 600, fontSize: '0.8rem', padding: '5px 14px' }}
          onClick={() => navigate('/policyholder/claims')}
        >
          View All <i className="bi bi-arrow-right ms-1"></i>
        </button>
      </div>

      {/* ── Empty state ──────────────────────────────────────────── */}
      {recent.length === 0 ? (
        <div className="text-center py-4 px-3">
          <div style={{ fontSize: 34, marginBottom: 8 }}>💳</div>
          <div className="fw-semibold small" style={{ color: '#94a3b8' }}>No payments yet</div>
        </div>
      ) : (
        <div>
          {recent.map((p, idx) => {
            const isPaid = p.status === 'Paid';
            return (
              <div
                key={p.paymentID}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 20px',
                  borderBottom: idx < recent.length - 1 ? '1px solid #f8fafc' : 'none',
                  gap: 12,
                }}
              >
                {/* Icon + details */}
                <div className="d-flex align-items-center gap-3">
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: isPaid ? '#ecfdf5' : '#fffbeb',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <i
                      className={`bi ${isPaid ? 'bi-check-circle-fill' : 'bi-hourglass-split'}`}
                      style={{ color: isPaid ? '#10b981' : '#f59e0b', fontSize: '1rem' }}
                    ></i>
                  </div>
                  <div>
                    <div className="fw-semibold" style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                      PAY-{p.paymentID}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      CLM-{p.claimID} · {formatDate(p.paidAt)} · {p.mode}
                    </div>
                  </div>
                </div>

                {/* Amount + status */}
                <div className="text-end" style={{ flexShrink: 0 }}>
                  <div className="fw-bold" style={{ color: '#10b981', fontSize: '0.95rem', marginBottom: 3 }}>
                    {formatCurrency(p.amount)}
                  </div>
                  <span
                    style={{
                      fontSize: '0.62rem', fontWeight: 700,
                      padding: '2px 8px', borderRadius: 20,
                      background: isPaid ? '#ecfdf5' : '#fffbeb',
                      color:      isPaid ? '#065f46' : '#92400e',
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { Row, Col } from 'react-bootstrap';
import { formatDate, formatCompactCurrency } from '../../data/policyholderDashboardData';

/**
 * Policy Hero Card — top-of-dashboard summary of the Policyholder's plan.
 * Props unchanged: { policy, memberCount }
 */
export default function PolicyOverviewCard({ policy, memberCount }) {
  if (!policy) return null;

  // Status colour — logic unchanged
  const statusGlow =
    policy.status === 'Active'    ? '#10b981' :
    policy.status === 'Expired'   ? '#ef4444' :
    policy.status === 'Suspended' ? '#f59e0b' :
                                    '#6b7280';

  return (
    <div
      className="mb-3 position-relative overflow-hidden"
      style={{
        borderRadius: 18,
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)',
        padding: '28px 24px',
        color: 'white',
        boxShadow: '0 10px 40px rgba(15,12,41,0.45)',
      }}
    >
      {/* Background radial glow orbs */}
      <div style={{ position: 'absolute', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 70%)', top: -120, right: -60, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)', bottom: -80, left: -20, pointerEvents: 'none' }} />

      {/* ── Header row ─────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-start mb-4" style={{ position: 'relative' }}>
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(99,102,241,0.22)',
              border: '1px solid rgba(99,102,241,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <i className="bi bi-shield-check" style={{ color: '#a5b4fc', fontSize: '1.1rem' }}></i>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', opacity: 0.55, letterSpacing: '1.8px', textTransform: 'uppercase', marginBottom: 3 }}>
              Active Policy
            </div>
            <h5 className="fw-bold mb-0" style={{ fontSize: '1.05rem', lineHeight: 1.25 }}>{policy.planName}</h5>
            <code style={{ fontSize: '0.68rem', opacity: 0.45, letterSpacing: '1px' }}>{policy.planCode}</code>
          </div>
        </div>

        {/* Status pill */}
        <div
          className="px-3 py-1 rounded-pill fw-bold"
          style={{
            background: `${statusGlow}22`,
            border: `1px solid ${statusGlow}55`,
            color: statusGlow,
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusGlow, display: 'inline-block', flexShrink: 0 }} />
          {policy.status}
        </div>
      </div>

      {/* ── Coverage hero number ────────────────────────────────────── */}
      <div
        className="text-center mb-4 py-4"
        style={{
          borderRadius: 14,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: '0.65rem', opacity: 0.5, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 6 }}>
          Total Annual Coverage
        </div>
        <div
          style={{
            fontSize: '2.6rem',
            fontWeight: 900,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #a5b4fc 0%, #c4b5fd 50%, #f9a8d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px',
          }}
        >
          {formatCompactCurrency(policy.coverageAmount)}
        </div>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────── */}
      <Row className="g-2" style={{ position: 'relative' }}>
        {[
          { icon: 'bi-cash-coin',       label: 'Deductible',   value: formatCompactCurrency(policy.deductibleAmount) },
          { icon: 'bi-calendar-range',  label: 'Valid From',   value: formatDate(policy.effectiveFrom) },
          { icon: 'bi-calendar-check',  label: 'Valid Until',  value: formatDate(policy.effectiveTo) },
          { icon: 'bi-people-fill',     label: 'Members',      value: `${memberCount} enrolled` },
        ].map((item) => (
          <Col xs={6} md={3} key={item.label}>
            <div
              className="text-center p-2 rounded-3"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <div style={{ fontSize: '0.62rem', opacity: 0.5, marginBottom: 4, letterSpacing: '0.5px' }}>
                <i className={`bi ${item.icon} me-1`}></i>{item.label}
              </div>
              <div className="fw-semibold" style={{ fontSize: '0.82rem' }}>{item.value}</div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
}

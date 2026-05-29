import { useNavigate } from 'react-router-dom';
import { Row, Col } from 'react-bootstrap';

/**
 * Claim stats row — 4 gradient tiles.
 * Props unchanged: { claims }
 * Navigate logic unchanged.
 */
export default function ClaimStatsRow({ claims }) {
  const navigate = useNavigate();

  // Calculations — unchanged
  const total    = claims.length;
  const approved = claims.filter((c) => ['Approved', 'Paid'].includes(c.status)).length;
  const pending  = claims.filter((c) => ['Pending', 'UnderReview', 'Submitted'].includes(c.status)).length;
  const rejected = claims.filter((c) => c.status === 'Rejected').length;

  const stats = [
    {
      label: 'Total Claims',
      val: total,
      icon: 'bi-folder2-open',
      accent: '#667eea',
      iconBg: '#ede9fe',
      iconColor: '#5b21b6',
      filter: '',
    },
    {
      label: 'Approved / Paid',
      val: approved,
      icon: 'bi-check-circle-fill',
      accent: '#10b981',
      iconBg: '#d1fae5',
      iconColor: '#065f46',
      filter: 'approved',
    },
    {
      label: 'In Progress',
      val: pending,
      icon: 'bi-hourglass-split',
      accent: '#f59e0b',
      iconBg: '#fef3c7',
      iconColor: '#92400e',
      filter: 'pending',
    },
    {
      label: 'Rejected',
      val: rejected,
      icon: 'bi-x-circle-fill',
      accent: '#ef4444',
      iconBg: '#fee2e2',
      iconColor: '#991b1b',
      filter: 'rejected',
    },
  ];

  return (
    <Row className="g-3 mb-4">
      {stats.map((s) => (
        <Col xs={6} lg={3} key={s.label}>
          <div
            onClick={() => navigate(`/policyholder/claims${s.filter ? `?status=${s.filter}` : ''}`)}
            style={{
              cursor: 'pointer',
              borderRadius: 16,
              background: 'white',
              padding: '20px 20px 16px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
              borderLeft: `4px solid ${s.accent}`,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              userSelect: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 28px rgba(0,0,0,0.12)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)';
            }}
          >
            {/* Icon + label row */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#64748b' }}>
                {s.label}
              </div>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: s.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <i className={`bi ${s.icon}`} style={{ color: s.iconColor, fontSize: '1rem' }}></i>
              </div>
            </div>

            {/* Count */}
            <div style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, color: s.accent, letterSpacing: '-1px' }}>
              {s.val}
            </div>

            {/* Footer link */}
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              View details <i className="bi bi-arrow-right" style={{ fontSize: '0.65rem', color: s.accent }}></i>
            </div>
          </div>
        </Col>
      ))}
    </Row>
  );
}

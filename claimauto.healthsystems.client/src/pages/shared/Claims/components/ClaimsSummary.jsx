// src/pages/shared/Claims/components/ClaimsSummary.jsx
import { Card } from 'react-bootstrap';
import { formatCurrency } from '../utils/claimHelpers';

const STAT_CARDS = [
  { key: 'total',      label: 'Total Claims',   icon: 'bi-folder2',            bg: '#e3f2fd', color: '#1565c0' },
  { key: 'submitted',  label: 'Submitted',       icon: 'bi-clock',              bg: '#f3e5f5', color: '#6a1b9a' },
  { key: 'underReview',label: 'Under Review',    icon: 'bi-eye',                bg: '#fff3e0', color: '#e65100' },
  { key: 'approved',   label: 'Approved / Paid', icon: 'bi-check-circle-fill',  bg: '#d1f2eb', color: '#2e7d32' },
  { key: 'rejected',   label: 'Rejected',        icon: 'bi-x-circle-fill',      bg: '#ffebee', color: '#c62828' },
];

export default function ClaimsSummary({ claims }) {
  const totalAmount = claims.reduce((s, c) => s + (c.totalBilledAmount ?? 0), 0);

  const values = {
    total:       claims.length,
    submitted:   claims.filter((c) => c.status === 'Submitted').length,
    underReview: claims.filter((c) => ['UnderReview', 'Adjudicated'].includes(c.status)).length,
    approved:    claims.filter((c) => ['Approved', 'Paid'].includes(c.status)).length,
    rejected:    claims.filter((c) => c.status === 'Rejected').length,
  };

  return (
    <div className="mb-4">
      {/* Stat cards */}
      <div className="d-flex gap-3 flex-wrap mb-3">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="flex-grow-1" style={{ minWidth: 120, flex: '1 1 0' }}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 38, height: 38, backgroundColor: card.bg }}
                >
                  <i className={card.icon} style={{ color: card.color, fontSize: '1rem' }}></i>
                </div>
                <div>
                  <div className="fw-bold mb-0 lh-1" style={{ fontSize: '1.1rem' }}>
                    {values[card.key]}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>{card.label}</div>
                </div>
              </Card.Body>
            </Card>
          </div>
        ))}

        {/* Total billed amount */}
        <div className="flex-grow-1" style={{ minWidth: 140, flex: '1 1 0' }}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 38, height: 38, backgroundColor: '#e8f5e9' }}
              >
                <i className="bi-cash-coin" style={{ color: '#2e7d32', fontSize: '1rem' }}></i>
              </div>
              <div>
                <div className="fw-bold mb-0 lh-1" style={{ fontSize: '1rem' }}>
                  {formatCurrency(totalAmount)}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Total Billed</div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
}

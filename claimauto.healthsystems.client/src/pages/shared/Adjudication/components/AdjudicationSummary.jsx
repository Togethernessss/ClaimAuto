// src/pages/shared/Adjudication/components/AdjudicationSummary.jsx
import { Card } from 'react-bootstrap';
import { formatCurrency } from '../utils/adjudicationHelpers';

const STAT_CARDS = [
  { key: 'pending',     label: 'Pending Review', icon: 'bi-hourglass-split',   bg: '#fff3e0', color: '#e65100' },
  { key: 'adjudicated', label: 'Adjudicated',    icon: 'bi-check2-square',     bg: '#d1f2eb', color: '#085041' },
  { key: 'approved',    label: 'Approved',       icon: 'bi-check-circle-fill', bg: '#e8f5e9', color: '#2e7d32' },
  { key: 'rejected',    label: 'Rejected',       icon: 'bi-x-circle-fill',     bg: '#fdecea', color: '#b71c1c' },
  { key: 'totalBilled', label: 'Total Billed',   icon: 'bi-currency-rupee',    bg: '#f3e5f5', color: '#6a1b9a' },
];

export default function AdjudicationSummary({ claims }) {
  const totalBilled = claims.reduce((s, c) => s + (c.totalBilledAmount ?? 0), 0);

  const values = {
    pending:     claims.filter(c => ['Submitted', 'UnderReview'].includes(c.status)).length,
    adjudicated: claims.filter(c => c.status === 'Adjudicated').length,
    approved:    claims.filter(c => c.status === 'Approved').length,
    rejected:    claims.filter(c => c.status === 'Rejected').length,
    totalBilled: formatCurrency(totalBilled),
  };

  return (
    <div className="d-flex gap-3 mb-4 flex-wrap">
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
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {card.label}
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      ))}
    </div>
  );
}

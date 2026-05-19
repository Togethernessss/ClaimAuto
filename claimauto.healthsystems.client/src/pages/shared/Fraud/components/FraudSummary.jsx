// src/pages/shared/Fraud/components/FraudSummary.jsx
import { Card } from 'react-bootstrap';

// Defined outside component — same pattern as PoliciesSummary
const STAT_CARDS = [
  { key: 'open',          label: 'Open',               icon: 'bi-folder2-open',       bg: '#fdecea', color: '#b71c1c' },
  { key: 'investigating', label: 'Under Investigation', icon: 'bi-search',             bg: '#fff8e1', color: '#f57f17' },
  { key: 'escalated',     label: 'Escalated',           icon: 'bi-arrow-up-circle-fill', bg: '#f3e5f5', color: '#6a1b9a' },
  { key: 'resolved',      label: 'Resolved',            icon: 'bi-check-circle-fill',  bg: '#e8f5e9', color: '#2e7d32' },
];

export default function FraudSummary({ cases }) {
  const values = {
    open:          cases.filter(c => c.status === 'Open').length,
    investigating: cases.filter(c => c.status === 'UnderInvestigation').length,
    escalated:     cases.filter(c => c.status === 'Escalated').length,
    resolved:      cases.filter(c => c.status === 'Resolved').length,
  };

  return (
    <div className="d-flex gap-3 mb-4 flex-wrap">
      {STAT_CARDS.map((card) => (
        <div
          key={card.key}
          className="flex-grow-1"
          style={{ minWidth: 130, flex: '1 1 0' }}
        >
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 38, height: 38, backgroundColor: card.bg }}
              >
                <i
                  className={card.icon}
                  style={{ color: card.color, fontSize: '1rem' }}
                ></i>
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

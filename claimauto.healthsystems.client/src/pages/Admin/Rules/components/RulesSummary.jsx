// src/pages/Admin/Rules/components/RulesSummary.jsx
import { Card } from 'react-bootstrap';

const STAT_CARDS = [
  { key: 'total',    label: 'Total Rules',  icon: 'bi-gear',              bg: '#e3f2fd', color: '#1565c0' },
  { key: 'active',   label: 'Active',       icon: 'bi-check-circle-fill', bg: '#d1f2eb', color: '#085041' },
  { key: 'draft',    label: 'Draft',        icon: 'bi-pencil-fill',       bg: '#fff3e0', color: '#e65100' },
  { key: 'inactive', label: 'Inactive',     icon: 'bi-pause-circle-fill', bg: '#f5f5f5', color: '#757575' },
];

export default function RulesSummary({ rules }) {
  const values = {
    total:    rules.length,
    active:   rules.filter((r) => r.status === 'Active').length,
    draft:    rules.filter((r) => r.status === 'Draft').length,
    inactive: rules.filter((r) => r.status === 'Inactive').length,
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
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>{card.label}</div>
              </div>
            </Card.Body>
          </Card>
        </div>
      ))}
    </div>
  );
}

import { Row, Col, Card } from 'react-bootstrap';

// The 4 summary stat cards at the top of the page.
// Total Policies | Active | Expired | Total Enrolled Members
// Hidden for Hospital role.

// Card definitions — defined outside component so they're not recreated
const STAT_CARDS = [
  {
    key:   'total',
    label: 'Total Policies',
    icon:  'bi-shield-check',
    bg:    '#e3f2fd',
    color: '#1565c0',
  },
  {
    key:   'active',
    label: 'Active',
    icon:  'bi-check-circle',
    bg:    '#d1f2eb',
    color: '#2e7d32',
  },
  {
    key:   'expired',
    label: 'Expired',
    icon:  'bi-calendar-x',
    bg:    '#f5f5f5',
    color: '#757575',
  },
  {
    key:   'suspended',
    label: 'Suspended',
    icon:  'bi-pause-circle',
    bg:    '#fff8e1',
    color: '#f9a825',
  },

  {
    key:   'enrolled',
    label: 'Total Enrolled',
    icon:  'bi-people-fill',
    bg:    '#fff3e0',
    color: '#e65100',
  },
];

export default function PoliciesSummary({ policies }) {
  // Calculate values from the policies array
  const values = {
    total:     policies.length,
    active:    policies.filter((p) => p.status === 'Active').length,
    expired:   policies.filter((p) => p.status === 'Expired').length,
    suspended: policies.filter((p) => p.status === 'Suspended').length,
    enrolled:  policies.reduce((sum, p) => sum + (p.memberCount ?? 0), 0),
  };

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div className="d-flex gap-3 mb-4" style={{ minWidth: 'fit-content' }}>
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="flex-grow-1"
            style={{ minWidth: 120, flex: '1 1 0' }}
          >
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="d-flex align-items-center gap-2 py-3 px-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 38, height: 38, backgroundColor: card.bg }}
                >
                  <i
                    className={`${card.icon}`}
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
    </div>
  );
}
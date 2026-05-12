import { Row, Col, Card } from 'react-bootstrap';

// ─────────────────────────────────────────────────────────────────────────────
// WHAT IS THIS?
// The 4 summary stat cards at the top of the page.
// Total Policies | Active | Expired | Total Enrolled Members
// Hidden for Hospital role.
// ─────────────────────────────────────────────────────────────────────────────

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
    total:    policies.length,
    active:   policies.filter((p) => p.status === 'Active').length,
    expired:  policies.filter((p) => p.status === 'Expired').length,
    enrolled: policies.reduce((sum, p) => sum + (p.memberCount ?? 0), 0),
  };

  return (
    <Row className="g-3 mb-4">
      {STAT_CARDS.map((card) => (
        <Col xs={6} lg={3} key={card.key}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              {/* Icon circle */}
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 44, height: 44, backgroundColor: card.bg }}
              >
                <i
                  className={`${card.icon} fs-5`}
                  style={{ color: card.color }}
                ></i>
              </div>
              {/* Value + label */}
              <div>
                <div className="fw-bold fs-5 mb-0 lh-1">
                  {values[card.key]}
                </div>
                <div className="text-muted small">{card.label}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
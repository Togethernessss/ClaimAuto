import { Card } from 'react-bootstrap';

const STAT_CARDS = [
  {
    key:   'total',
    label: 'Total Members',
    icon:  'bi-people-fill',
    bg:    '#e3f2fd',
    color: '#1565c0',
  },
  {
    key:   'active',
    label: 'Active',
    icon:  'bi-person-check-fill',
    bg:    '#d1f2eb',
    color: '#2e7d32',
  },
  {
    key:   'inactive',
    label: 'Inactive',
    icon:  'bi-person-dash-fill',
    bg:    '#f5f5f5',
    color: '#757575',
  },
  {
    key:   'suspended',
    label: 'Suspended',
    icon:  'bi-person-x-fill',
    bg:    '#fff8e1',
    color: '#f9a825',
  },
  {
    key:   'policies',
    label: 'Policies Used',
    icon:  'bi-shield-check',
    bg:    '#f3e5f5',
    color: '#6a1b9a',
  },
];

export default function MembersSummary({ members }) {
  // Count unique policyIDs across all members
  const uniquePolicies = new Set(members.map((m) => m.policyID)).size;

  const values = {
    total:    members.length,
    active:   members.filter((m) => m.status === 'Active').length,
    inactive: members.filter((m) => m.status === 'Inactive').length,
    suspended:members.filter((m) => m.status === 'Suspended').length,
    policies: uniquePolicies,
  };

  return (
    <div className="d-flex gap-3 mb-4 flex-wrap">
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
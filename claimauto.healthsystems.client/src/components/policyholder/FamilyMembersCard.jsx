import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from 'react-bootstrap';
import { calculateClaimsCountByMember, calculateAge } from '../../data/policyholderDashboardData';

export default function FamilyMembersCard({ members, claims }) {
  const navigate = useNavigate();

  return (
    <Card className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
      <Card.Header className="bg-white border-bottom d-flex align-items-center justify-content-between py-3">
        <div className="fw-bold d-flex align-items-center">
          <i className="bi bi-people-fill text-success me-2 fs-5"></i>
          <span>Family Members ({members.length})</span>
        </div>
        <Button
          size="sm"
          variant="outline-primary"
          className="rounded-pill"
          onClick={() => navigate('/policyholder/claims')}
        >
          View All <i className="bi bi-arrow-right ms-1"></i>
        </Button>
      </Card.Header>

      <Card.Body className="p-0">
        {members.map((m, idx) => {
          const claimsCount = calculateClaimsCountByMember(claims, m.memberID);
          const age = calculateAge(m.dob);
          return (
            <div
              key={m.memberID}
              className={`d-flex align-items-center justify-content-between p-3 ${idx !== members.length - 1 ? 'border-bottom' : ''}`}
              style={{ borderColor: '#f0f3f9' }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: 42, height: 42,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff', fontWeight: 700, fontSize: '1rem',
                  }}
                >
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="fw-semibold">{m.name}</div>
                  <div className="text-muted small">
                    {m.relation} {age != null && `· ${age} yrs`} · <b>{claimsCount}</b> claim{claimsCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              {m.eligible ? (
                <Badge bg="success" pill>
                  <i className="bi bi-check-circle me-1"></i> Eligible
                </Badge>
              ) : (
                <Badge bg="warning" pill>
                  <i className="bi bi-exclamation-circle me-1"></i> Review
                </Badge>
              )}
            </div>
          );
        })}
      </Card.Body>
    </Card>
  );
}
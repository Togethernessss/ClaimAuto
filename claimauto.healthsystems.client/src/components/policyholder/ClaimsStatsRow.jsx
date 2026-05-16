import { useNavigate } from 'react-router-dom';
import { Row, Col, Card } from 'react-bootstrap';

export default function ClaimStatsRow({ claims }) {
  const navigate = useNavigate();

  const total    = claims.length;
  const approved = claims.filter((c) => ['Approved', 'Paid'].includes(c.status)).length;
  const pending  = claims.filter((c) => ['Pending', 'UnderReview', 'Submitted'].includes(c.status)).length;
  const rejected = claims.filter((c) => c.status === 'Rejected').length;

  const stats = [
    { label: 'Total Claims',  val: total,    icon: 'bi-folder2',           bg: '#e3f2fd', color: '#1565c0', filter: '' },
    { label: 'Approved/Paid', val: approved, icon: 'bi-check-circle-fill', bg: '#d1f2eb', color: '#2e7d32', filter: 'approved' },
    { label: 'In Progress',   val: pending,  icon: 'bi-clock-fill',        bg: '#fff3e0', color: '#e65100', filter: 'pending' },
    { label: 'Rejected',      val: rejected, icon: 'bi-x-circle-fill',     bg: '#ffebee', color: '#c0392b', filter: 'rejected' },
  ];

  return (
    <Row className="g-3 mb-4">
      {stats.map((s) => (
        <Col xs={6} lg={3} key={s.label}>
          <Card
            className="border-0 shadow-sm h-100"
            style={{ cursor: 'pointer', transition: 'all .2s', borderRadius: 12 }}
            onClick={() => navigate(`/policyholder/claims${s.filter ? `?status=${s.filter}` : ''}`)}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
          >
            <Card.Body className="d-flex align-items-center gap-3 py-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 52, height: 52, backgroundColor: s.bg }}
              >
                <i className={`${s.icon} fs-4`} style={{ color: s.color }}></i>
              </div>
              <div>
                <div className="fw-bold mb-0 lh-1" style={{ fontSize: '1.6rem', color: s.color }}>{s.val}</div>
                <div className="text-muted small mt-1">{s.label}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
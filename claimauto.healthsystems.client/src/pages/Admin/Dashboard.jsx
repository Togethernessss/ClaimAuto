import { useEffect }              from 'react';
import { checkExpiredPolicies }   from '../../services/policies/policyService';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';
import WelcomeBanner from '../../components/WelcomeBanner';

// Admin dashboard — system-wide view for users with role = "Admin".
// Uses the reusable WelcomeBanner component for consistency.

// ─── Reusable circular KPI ring (native SVG) ─────────────────────────────
function CircularKPI({ value, unit, label, target, status, color, percent = 0 }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <Card className="border-0 shadow-sm h-100 text-center">
      <Card.Body>
        <div className="position-relative mx-auto mb-3" style={{ width: 120, height: 120 }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f3f5" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="position-absolute top-50 start-50 translate-middle">
            <div className="fs-4 fw-bold text-muted">{value}</div>
            <small className="text-muted">{unit}</small>
          </div>
        </div>

        <div className="fw-semibold mb-1">{label}</div>
        <small className="text-muted d-block mb-2">{target}</small>
        <Badge bg="light" text="dark" className="text-uppercase" style={{ fontSize: 9 }}>
          {status}
        </Badge>
      </Card.Body>
    </Card>
  );
}

// ─── Main Admin Dashboard ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');

  // ── AUTO-EXPIRE OVERDUE POLICIES ──────────────────────────────────────────
  // Runs silently once when Admin opens the dashboard.
  // Finds any Active policies whose EffectiveTo date has passed,
  // marks them Expired, and creates a Notification for Admin.
  // No loading state — runs in background, fails silently.
  useEffect(() => {
    checkExpiredPolicies()
      .then((result) => {
        if (result?.expired > 0) {
          console.log(
            `[ClaimAuto] Auto-expired ${result.expired} ` +
            `${result.expired === 1 ? 'policy' : 'policies'}: ` +
            `${result.message}`
          );
          // Admin will see the notification in their Notifications page
          // No popup needed — non-intrusive background job
        }
      })
      .catch(() => {
        // Silently ignore — don't break the dashboard for this
      });
  }, []); // ← empty array = runs ONCE when dashboard first loads
  // ─────────────────────────────────────────────────────────────────────────
  // TODO: wire to real APIs when ready
  //   stats → GET /api/users, /api/claims, /api/payments, /api/fraud
  //   kpis  → GET /api/reports/kpis

  return (
    <Container fluid>

      {/* ── Reusable Welcome Banner ─────────────────────────────────────── */}
      <WelcomeBanner
        emoji="👑"
        actions={[
          {
            label: 'Manage Users',
            icon: 'bi-people',
            variant: 'outline-light',
            onClick: () => navigate('/members'),
          },
          {
            label: 'Audit Logs',
            icon: 'bi-journal-text',
            variant: 'light',
            onClick: () => navigate('/audit-logs'),
          },
        ]}
      />

      {/* ── Priority Action Bar (system alerts) ─────────────────────────── */}
      <Card className="border-0 shadow-sm mb-4 border-start border-danger border-4">
        <Card.Body className="d-flex align-items-center flex-wrap gap-3 py-3">
          <div
            className="rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center"
            style={{ width: 38, height: 38, flexShrink: 0 }}
          >
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          </div>
          <div className="flex-grow-1" style={{ minWidth: 220 }}>
            <div className="fw-semibold">No system alerts right now</div>
            <small className="text-muted">
              Failed jobs, security warnings, and critical errors will appear here.
            </small>
          </div>
          <button
            className="btn btn-sm text-white fw-semibold"
            onClick={() => navigate('/audit-logs')}
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
          >
            <i className="bi bi-list-stars me-1"></i> View System Logs
          </button>
        </Card.Body>
      </Card>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100 border-top border-primary border-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-uppercase text-muted small fw-semibold mb-1">Total Users</div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">
                    <i className="bi bi-person-plus me-1"></i> No data yet
                  </div>
                </div>
                <div
                  className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10"
                  style={{ width: 42, height: 42 }}
                >
                  <i className="bi bi-people text-primary fs-5"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100 border-top border-success border-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-uppercase text-muted small fw-semibold mb-1">Active Claims</div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">
                    <i className="bi bi-clock me-1"></i> Awaiting data
                  </div>
                </div>
                <div
                  className="rounded d-flex align-items-center justify-content-center bg-success bg-opacity-10"
                  style={{ width: 42, height: 42 }}
                >
                  <i className="bi bi-file-earmark-text text-success fs-5"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100 border-top border-warning border-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-uppercase text-muted small fw-semibold mb-1">Monthly Revenue</div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">
                    <i className="bi bi-graph-up me-1"></i> Awaiting data
                  </div>
                </div>
                <div
                  className="rounded d-flex align-items-center justify-content-center bg-warning bg-opacity-10"
                  style={{ width: 42, height: 42 }}
                >
                  <i className="bi bi-cash-coin text-warning fs-5"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100 border-top border-danger border-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-uppercase text-muted small fw-semibold mb-1">Open Fraud Cases</div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">
                    <i className="bi bi-shield me-1"></i> No open cases
                  </div>
                </div>
                <div
                  className="rounded d-flex align-items-center justify-content-center bg-danger bg-opacity-10"
                  style={{ width: 42, height: 42 }}
                >
                  <i className="bi bi-shield-exclamation text-danger fs-5"></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── KPI Section (circular rings) ────────────────────────────────── */}
      <div className="d-flex align-items-center mb-3">
        <h5 className="fw-bold mb-0 me-2">System Performance Metrics</h5>
        <Badge bg="success" pill className="text-uppercase" style={{ fontSize: 10 }}>
          ● Live
        </Badge>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <CircularKPI value="—" unit="%" label="Auto-Adjudication" target="Target: ≥ 80%"
                       status="No data" color="#764ba2" percent={0} />
        </Col>
        <Col md={6} lg={3}>
          <CircularKPI value="—" unit="hrs" label="Average TAT" target="Target: ≤ 4 hrs"
                       status="No data" color="#0d6efd" percent={0} />
        </Col>
        <Col md={6} lg={3}>
          <CircularKPI value="—" unit="%" label="Denial Rate" target="Target: < 10%"
                       status="No data" color="#f59e0b" percent={0} />
        </Col>
        <Col md={6} lg={3}>
          <CircularKPI value="—" unit="%" label="Fraud Flag Rate" target="Target: < 5%"
                       status="No data" color="#dc3545" percent={0} />
        </Col>
      </Row>

      {/* ── Activity + Approvals panels ─────────────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-activity text-primary me-2"></i>
                Recent System Activity
              </h6>
              <small className="text-muted">Live audit trail · latest events first</small>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-5">
                <i className="bi bi-clock-history" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
                <div className="fw-semibold text-muted mt-3">No activity yet</div>
                <div className="small text-muted mt-1">
                  System events will appear here in real time.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-check2-circle text-success me-2"></i>
                Pending Approvals
              </h6>
              <small className="text-muted">Items needing admin attention</small>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-5">
                <i className="bi bi-inbox" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
                <div className="fw-semibold text-muted mt-3">All clear!</div>
                <div className="small text-muted mt-1">
                  Approval requests will appear here.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Quick Access (from permissions.js) ──────────────────────────── */}
      <h5 className="fw-semibold mb-3">Quick Access</h5>
      <Row className="g-3">
        {myMenu.map((item) => (
          <Col md={4} lg={3} key={item.key}>
            <Card
              className="border-0 shadow-sm h-100"
              role="button"
              onClick={() => navigate(item.path)}
              style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <Card.Body className="text-center">
                <div
                  className="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center"
                  style={{ width: 50, height: 50, backgroundColor: '#e3f2fd' }}
                >
                  <i className={`${item.icon} text-primary fs-4`}></i>
                </div>
                <div className="fw-semibold">{item.label}</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

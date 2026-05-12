import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';

// Staff dashboard — shown after login for users with role = "InsuranceStaff".
// Built with pure Bootstrap components + a small reusable CircularKPI helper
// that uses native SVG (no chart library, no custom CSS classes).
// Quick Access pulls from permissions.js — single source of truth.

// ─── Reusable circular KPI ring (native SVG, no extra CSS classes) ─────
// Pass `percent` (0-100) once you wire up real data. Empty state = 0.
function CircularKPI({ value, unit, label, target, status, color, percent = 0 }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <Card className="border-0 shadow-sm h-100 text-center">
      <Card.Body>
        {/* SVG ring */}
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
          {/* Center value */}
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

// ─── Main Staff Dashboard ─────────────────────────────────────────────
export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Pull this role's menu (minus Dashboard itself) for Quick Access
  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingIcon = hour < 12 ? 'bi-sunrise' : hour < 17 ? 'bi-sun' : 'bi-moon-stars';
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // TODO: wire to real APIs when ready
  //   stats        → GET /api/claims, /api/tasks?assignedTo=me, /api/payments, /api/fraud
  //   kpis         → GET /api/reports/kpis (pass `percent` prop to each CircularKPI)
  //   activity     → GET /api/audit-logs (latest N)
  //   tasks        → GET /api/tasks?assignedTo=me

  return (
    <Container fluid>

      {/* ── Welcome banner with action buttons ──────────────────────────── */}
      <div
        className="text-white p-4 p-md-5 rounded-3 mb-4 shadow-sm d-flex justify-content-between align-items-center flex-wrap gap-3"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <div>
          <Badge bg="light" text="dark" className="mb-2 fw-semibold text-uppercase">
            <i className={`${greetingIcon} me-1`}></i> {greeting} · {weekday}
          </Badge>
          <h2 className="fw-bold mb-2">Welcome back, {user?.name}! 👋</h2>
          <p className="mb-0 opacity-75">
            You're logged in as <strong>{user?.role}</strong>. Here's your daily workflow.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-light" size="sm" onClick={() => navigate('/tasks')}>
            <i className="bi bi-list-check me-1"></i> My Tasks
          </Button>
          <Button variant="light" size="sm" onClick={() => navigate('/claims')}>
            <i className="bi bi-file-medical me-1"></i> Open Claims Queue
          </Button>
        </div>
      </div>

      {/* ── Priority Action Bar (urgent items call-out) ─────────────────── */}
      <Card className="border-0 shadow-sm mb-4 border-start border-danger border-4">
        <Card.Body className="d-flex align-items-center flex-wrap gap-3 py-3">
          <div
            className="rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center"
            style={{ width: 38, height: 38, flexShrink: 0 }}
          >
            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
          </div>
          <div className="flex-grow-1" style={{ minWidth: 220 }}>
            <div className="fw-semibold">No urgent actions right now</div>
            <small className="text-muted">
              High-priority items (fraud alerts, pending authorizations) will appear here.
            </small>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/tasks')}
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
          >
            <i className="bi bi-list-stars me-1"></i> View All Priority Tasks
          </Button>
        </Card.Body>
      </Card>

      {/* ── Stat Cards (colorful top borders) ───────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <Card className="border-0 shadow-sm h-100 border-top border-primary border-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="text-uppercase text-muted small fw-semibold mb-1">
                    Claims Pending
                  </div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">
                    <i className="bi bi-clock me-1"></i> No data yet
                  </div>
                </div>
                <div
                  className="rounded d-flex align-items-center justify-content-center bg-primary bg-opacity-10"
                  style={{ width: 42, height: 42 }}
                >
                  <i className="bi bi-file-earmark-text text-primary fs-5"></i>
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
                  <div className="text-uppercase text-muted small fw-semibold mb-1">
                    My Tasks Today
                  </div>
                  <div className="fs-3 fw-bold text-muted">—</div>
                  <div className="small text-muted">
                    <i className="bi bi-check-circle me-1"></i> No tasks assigned
                  </div>
                </div>
                <div
                  className="rounded d-flex align-items-center justify-content-center bg-success bg-opacity-10"
                  style={{ width: 42, height: 42 }}
                >
                  <i className="bi bi-list-check text-success fs-5"></i>
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
                  <div className="text-uppercase text-muted small fw-semibold mb-1">
                    Disbursed This Month
                  </div>
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
                  <div className="text-uppercase text-muted small fw-semibold mb-1">
                    Fraud Cases Open
                  </div>
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
        <h5 className="fw-bold mb-0 me-2">Key Performance Metrics</h5>
        <Badge bg="success" pill className="text-uppercase" style={{ fontSize: 10 }}>
          ● Live
        </Badge>
      </div>

      <Row className="g-3 mb-4">
        <Col md={6} lg={3}>
          <CircularKPI
            value="—"
            unit="%"
            label="Auto-Adjudication"
            target="Target: ≥ 80%"
            status="No data"
            color="#764ba2"
            percent={0}
          />
        </Col>
        <Col md={6} lg={3}>
          <CircularKPI
            value="—"
            unit="hrs"
            label="Average TAT"
            target="Target: ≤ 4 hrs"
            status="No data"
            color="#0d6efd"
            percent={0}
          />
        </Col>
        <Col md={6} lg={3}>
          <CircularKPI
            value="—"
            unit="%"
            label="Denial Rate"
            target="Target: < 10%"
            status="No data"
            color="#f59e0b"
            percent={0}
          />
        </Col>
        <Col md={6} lg={3}>
          <CircularKPI
            value="—"
            unit="%"
            label="Fraud Flag Rate"
            target="Target: < 5%"
            status="No data"
            color="#dc3545"
            percent={0}
          />
        </Col>
      </Row>

      {/* ── Claims Queue + My Tasks panels ─────────────────────────────── */}
      <Row className="g-3 mb-4">
        <Col lg={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-file-earmark-text text-primary me-2"></i>
                Claims Awaiting Review
              </h6>
              <small className="text-muted">Pending your decision · sorted by priority</small>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-5">
                <i className="bi bi-inbox" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
                <div className="fw-semibold text-muted mt-3">No claims to review</div>
                <div className="small text-muted mt-1">
                  High-priority claims will appear here first.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 py-3">
              <h6 className="mb-0 fw-semibold">
                <i className="bi bi-list-check text-success me-2"></i>
                My Tasks
              </h6>
              <small className="text-muted">Assigned to you</small>
            </Card.Header>
            <Card.Body>
              <div className="text-center py-5">
                <i className="bi bi-check-circle" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
                <div className="fw-semibold text-muted mt-3">All caught up!</div>
                <div className="small text-muted mt-1">
                  Tasks assigned to you will appear here.
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ── Quick Access (pulled from permissions.js) ───────────────────── */}
      {/* Same source the sidebar uses. Add a menu item there → it appears here. */}
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

import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';
import WelcomeBanner from '../../components/WelcomeBanner';
import StatCard from '../../components/dashboard/StatCard';
import CircularKPI from '../../components/dashboard/CircularKPI';
import PriorityActionBar from '../../components/dashboard/PriorityActionBar';
import DashboardPanel from '../../components/dashboard/DashboardPanel';
import EmptyStatePanel from '../../components/dashboard/EmptyStatePanel';
import SectionHeader from '../../components/dashboard/SectionHeader';
import QuickAccessGrid from '../../components/dashboard/QuickAccessGrid';

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');

  return (
    <Container fluid className="p-0">

      {/* ── Welcome Banner ──────────────────────────────────── */}
      <WelcomeBanner
        emoji="👋"
        actions={[
          {
            label: 'My Tasks',
            icon: 'bi-list-check',
            variant: 'outline-light',
            onClick: () => navigate('/tasks'),
          },
          {
            label: 'Open Claims Queue',
            icon: 'bi-file-medical',
            variant: 'light',
            onClick: () => navigate('/claims'),
          },
        ]}
      />

      <div className="px-4 pb-4">

        {/* ── Priority Action Bar ──────────────────────────── */}
        <PriorityActionBar
          accentColor="danger"
          icon="bi-exclamation-triangle-fill"
          title="No urgent actions right now"
          description="High-priority items (fraud alerts, pending authorizations) will appear here."
          buttonLabel="View All Priority Tasks"
          buttonIcon="bi-list-stars"
          onButtonClick={() => navigate('/tasks')}
        />

        {/* ── Stat Cards ───────────────────────────────────── */}
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <StatCard
              label="Claims Pending"
              value="—"
              icon="bi-file-earmark-text"
              borderColor="primary"
              footerIcon="bi-clock"
              footerText="No data yet"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="My Tasks"
              value="—"
              icon="bi-list-check"
              borderColor="success"
              footerIcon="bi-clipboard-check"
              footerText="No tasks assigned"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Fraud Alerts"
              value="—"
              icon="bi-shield-exclamation"
              borderColor="warning"
              footerIcon="bi-shield"
              footerText="No active alerts"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Appeals Open"
              value="—"
              icon="bi-megaphone"
              borderColor="danger"
              footerIcon="bi-megaphone-fill"
              footerText="No appeals"
            />
          </Col>
        </Row>

        {/* ── KPI Section ──────────────────────────────────── */}
        <SectionHeader title="My Performance Metrics" live />

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

        {/* ── Claims Queue + My Tasks panels ───────────────── */}
        <Row className="g-3 mb-4">

          <Col lg={7}>
            <DashboardPanel
              icon="bi-file-earmark-text"
              iconColor="primary"
              title="Claims Awaiting Review"
              subtitle="Pending your decision · sorted by priority"
            >
              <EmptyStatePanel
                icon="bi-inbox"
                title="No claims to review"
                description="High-priority claims will appear here first."
              />
            </DashboardPanel>
          </Col>

          <Col lg={5}>
            <DashboardPanel
              icon="bi-list-check"
              iconColor="success"
              title="My Tasks"
              subtitle="Assigned to you"
            >
              <EmptyStatePanel
                icon="bi-check-circle"
                title="All caught up!"
                description="Tasks assigned to you will appear here."
              />
            </DashboardPanel>
          </Col>

        </Row>

        {/* ── Quick Access ─────────────────────────────────── */}
        <h5 className="fw-semibold mb-3">Quick Access</h5>
        <QuickAccessGrid
          items={myMenu}
          onItemClick={(item) => navigate(item.path)}
        />

      </div>
    </Container>
  );
}
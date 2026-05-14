import { useState } from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import InviteUserModal from '../../components/identity/InviteUserModal';
import { getMenuForRole } from '../../security/permissions';
import WelcomeBanner from '../../components/WelcomeBanner';
import StatCard from '../../components/dashboard/StatCard';
import CircularKPI from '../../components/dashboard/CircularKPI';
import PriorityActionBar from '../../components/dashboard/PriorityActionBar';
import DashboardPanel from '../../components/dashboard/DashboardPanel';
import EmptyStatePanel from '../../components/dashboard/EmptyStatePanel';
import SectionHeader from '../../components/dashboard/SectionHeader';
import QuickAccessGrid from '../../components/dashboard/QuickAccessGrid';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);

  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');
  return (
    <Container fluid className="p-0">

      {/* ── Welcome Banner — full width ──────────────────────────────────── */}
      <WelcomeBanner
        emoji="👑"
                actions={[
          {
            label: 'Invite User',
            icon: 'bi-envelope-plus',
            variant: 'light',
            onClick: () => setShowInvite(true),
          },
          {
            label: 'Manage Users',
            icon: 'bi-people',
            variant: 'outline-light',
            onClick: () => navigate('/members'),
          },
          {
            label: 'Audit Logs',
            icon: 'bi-journal-text',
            variant: 'outline-light',
            onClick: () => navigate('/audit-logs'),
          },
        ]}
      />

      {/* ── All content below banner gets padding ────────────────────────── */}
      <div className="px-4 pb-4">

        {/* ── Priority Action Bar ────────────────────────────────────────── */}
        <PriorityActionBar
          accentColor="danger"
          icon="bi-exclamation-triangle-fill"
          title="No system alerts right now"
          description="Failed jobs, security warnings, and critical errors will appear here."
          buttonLabel="View System Logs"
          buttonIcon="bi-list-stars"
          onButtonClick={() => navigate('/audit-logs')}
        />
        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <StatCard
              label="Total Users"
              value="—"
              icon="bi-people"
              borderColor="primary"
              footerIcon="bi-person-plus"
              footerText="No data yet"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Active Claims"
              value="—"
              icon="bi-file-earmark-text"
              borderColor="success"
              footerIcon="bi-clock"
              footerText="Awaiting data"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Monthly Revenue"
              value="—"
              icon="bi-cash-coin"
              borderColor="warning"
              footerIcon="bi-graph-up"
              footerText="Awaiting data"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Open Fraud Cases"
              value="—"
              icon="bi-shield-exclamation"
              borderColor="danger"
              footerIcon="bi-shield"
              footerText="No open cases"
            />
          </Col>
        </Row>

        {/* ── KPI Section ────────────────────────────────────────────────── */}
        <SectionHeader title="System Performance Metrics" live />

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

        {/* ── Activity + Approvals panels ────────────────────────────────── */}
        <Row className="g-3 mb-4">
          <Col lg={7}>
            <DashboardPanel
              icon="bi-activity"
              iconColor="primary"
              title="Recent System Activity"
              subtitle="Live audit trail · latest events first"
            >
              <EmptyStatePanel
                icon="bi-clock-history"
                title="No activity yet"
                description="System events will appear here in real time."
              />
            </DashboardPanel>
          </Col>

          <Col lg={5}>
            <DashboardPanel
              icon="bi-check2-circle"
              iconColor="success"
              title="Pending Approvals"
              subtitle="Items needing admin attention"
            >
              <EmptyStatePanel
                icon="bi-inbox"
                title="All clear!"
                description="Approval requests will appear here."
              />
            </DashboardPanel>
          </Col>
        </Row>

        {/*Quick Access*/}
        <h5 className="fw-semibold mb-3">Quick Access</h5>
        
                <QuickAccessGrid
          items={myMenu}
          onItemClick={(item) => navigate(item.path)}
        />
      </div>

      {/* ── Invite User Modal (controlled by WelcomeBanner button) ── */}
      <InviteUserModal
        show={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </Container>
  );
}
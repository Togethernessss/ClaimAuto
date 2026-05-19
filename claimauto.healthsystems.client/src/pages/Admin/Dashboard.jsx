import { useState, useEffect } from 'react';
import { checkExpiredPolicies } from '../../services/policies/policyService';
import { Container, Row, Col } from 'react-bootstrap';
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
import { checkExpiredMembers } from '../../services/members/memberService';
import { getAllKPIs } from '../../services/reports/reportService';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);

  const myMenu = getMenuForRole(user.role)
    .filter((m) => m.key !== 'dashboard');

  const [kpis,        setKpis]        = useState([]);
  const [kpisLoading, setKpisLoading] = useState(true);

  useEffect(() => {
    checkExpiredPolicies()
      .then((r) => {
        if (r?.expired > 0)
          console.log(
            `[ClaimAuto] Auto-expired ${r.expired} ` +
            `${r.expired === 1 ? 'policy' : 'policies'}: ` +
            `${r.message}`
          );
      })
      .catch(() => {});

    checkExpiredMembers()
      .then((r) => {
        if (r?.expired > 0)
          console.log(
            `[ClaimAuto] Auto-expired ${r.expired} ` +
            `${r.expired === 1 ? 'member' : 'members'}.`
          );
      })
      .catch(() => {});

    getAllKPIs()
      .then((data) => setKpis(data))
      .catch(() => setKpis([]))
      .finally(() => setKpisLoading(false));
  }, []);

  function getKPI(name) {
    return kpis.find(k => k.name === name);
  }

  // ── Percent — always raw value capped at 100 ──────────────────
  function getPercent(kpi) {
    if (!kpi || kpi.currentValue === 0) return 0;
    return Math.min(Math.round(kpi.currentValue), 100);
  }

  // ── Status ────────────────────────────────────────────────────
  function getStatus(kpi, invertLower = false) {
    if (!kpi || kpi.currentValue === 0) return 'No data';
    if (invertLower) {
      return kpi.currentValue <= kpi.target
        ? 'On target' : 'Below target';
    }
    return kpi.currentValue >= kpi.target
      ? 'On target' : 'Below target';
  }

  // ── Color — blue if on target, red if not ────────────────────
  function getColor(kpi, invertLower = false) {
    if (!kpi || kpi.currentValue === 0) return '#9e9e9e';
    if (invertLower) {
      return kpi.currentValue <= kpi.target
        ? '#0d6efd' : '#ef4444';
    }
    return kpi.currentValue >= kpi.target
      ? '#0d6efd' : '#ef4444';
  }

  const adjKPI    = getKPI('Auto-Adjudication Rate');
  const tatKPI    = getKPI('Average TAT');
  const denialKPI = getKPI('Denial Rate');
  const fraudKPI  = getKPI('Fraud Flag Rate');

  return (
    <Container fluid className="p-0">

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

      <div className="px-4 pb-4">

        <PriorityActionBar
          accentColor="danger"
          icon="bi-exclamation-triangle-fill"
          title="No system alerts right now"
          description="Failed jobs, security warnings, and critical errors will appear here."
          buttonLabel="View System Logs"
          buttonIcon="bi-list-stars"
          onButtonClick={() => navigate('/audit-logs')}
        />

        {/* ── Stat Cards ─────────────────────────────────────── */}
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

        {/* ── KPI Section ────────────────────────────────────── */}
        <SectionHeader title="System Performance Metrics" live />

        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' :
                adjKPI ? `${adjKPI.currentValue}` : '—'}
              unit="%"
              label="Auto-Adjudication"
              target="Target: ≥ 80%"
              status={kpisLoading ? 'Loading…' :
                getStatus(adjKPI)}
              color={kpisLoading ? '#9e9e9e' :
                getColor(adjKPI)}
              percent={kpisLoading ? 0 :
                getPercent(adjKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' :
                tatKPI ? `${tatKPI.currentValue}` : '—'}
              unit="hrs"
              label="Average TAT"
              target="Target: ≤ 4 hrs"
              status={kpisLoading ? 'Loading…' :
                getStatus(tatKPI, true)}
              color={kpisLoading ? '#9e9e9e' :
                getColor(tatKPI, true)}
              percent={kpisLoading ? 0 :
                getPercent(tatKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' :
                denialKPI ? `${denialKPI.currentValue}` : '—'}
              unit="%"
              label="Denial Rate"
              target="Target: < 10%"
              status={kpisLoading ? 'Loading…' :
                getStatus(denialKPI, true)}
              color={kpisLoading ? '#9e9e9e' :
                getColor(denialKPI, true)}
              percent={kpisLoading ? 0 :
                getPercent(denialKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' :
                fraudKPI ? `${fraudKPI.currentValue}` : '—'}
              unit="%"
              label="Fraud Flag Rate"
              target="Target: < 5%"
              status={kpisLoading ? 'Loading…' :
                getStatus(fraudKPI, true)}
              color={kpisLoading ? '#9e9e9e' :
                getColor(fraudKPI, true)}
              percent={kpisLoading ? 0 :
                getPercent(fraudKPI)}
            />
          </Col>
        </Row>

        {/* ── Activity + Approvals ────────────────────────────── */}
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

        <h5 className="fw-semibold mb-3">Quick Access</h5>
        <QuickAccessGrid
          items={myMenu}
          onItemClick={(item) => navigate(item.path)}
        />
      </div>

      <InviteUserModal
        show={showInvite}
        onClose={() => setShowInvite(false)}
      />
    </Container>
  );
}
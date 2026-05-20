import { useState, useEffect } from 'react';
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
import { getAllKPIs } from '../../services/reports/reportService';
import { getAllClaims } from '../../services/claims/claimService';
import { getAllTasks } from '../../services/tasks/taskService';
import { getAllFraudCases } from '../../services/fraud/fraudService';
import { getAllAppeals } from '../../services/appeals/appealService';

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const myMenu = getMenuForRole(user.role)
    .filter((m) => m.key !== 'dashboard');

  const [kpis,        setKpis]        = useState([]);
  const [kpisLoading, setKpisLoading] = useState(true);

  const [pendingClaims, setPendingClaims] = useState(null);
  const [myTasks,       setMyTasks]       = useState(null);
  const [fraudAlerts,   setFraudAlerts]   = useState(null);
  const [openAppeals,   setOpenAppeals]   = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(true);

  useEffect(() => {
    getAllKPIs()
      .then((data) => setKpis(data))
      .catch(() => setKpis([]))
      .finally(() => setKpisLoading(false));

    Promise.allSettled([
      getAllClaims('Submitted'),
      getAllTasks(null, 'Pending'),
      getAllFraudCases('Open'),
      getAllAppeals(),
    ]).then(([claimsRes, tasksRes, fraudRes, appealsRes]) => {
      if (claimsRes.status === 'fulfilled')
        setPendingClaims(claimsRes.value.length);

      if (tasksRes.status === 'fulfilled')
        setMyTasks(tasksRes.value.length);

      if (fraudRes.status === 'fulfilled')
        setFraudAlerts(fraudRes.value.length);

      if (appealsRes.status === 'fulfilled')
        setOpenAppeals(
          appealsRes.value.filter(
            a => a.status === 'Filed' ||
                 a.status === 'UnderReview'
          ).length
        );

      setStatsLoading(false);
    });
  }, []);

  function getKPI(name) {
    return kpis.find(k => k.name === name);
  }

  function getPercent(kpi) {
    if (!kpi || kpi.currentValue === 0) return 0;
    return Math.min(Math.round(kpi.currentValue), 100);
  }

  function getStatus(kpi, invertLower = false) {
    if (!kpi || kpi.currentValue === 0) return 'No data';
    if (invertLower)
      return kpi.currentValue <= kpi.target
        ? 'On target' : 'Below target';
    return kpi.currentValue >= kpi.target
      ? 'On target' : 'Below target';
  }

  function getColor(kpi, invertLower = false) {
    if (!kpi || kpi.currentValue === 0) return '#9e9e9e';
    if (invertLower)
      return kpi.currentValue <= kpi.target
        ? '#0d6efd' : '#ef4444';
    return kpi.currentValue >= kpi.target
      ? '#0d6efd' : '#ef4444';
  }

  const adjKPI    = getKPI('Auto-Adjudication Rate');
  const tatKPI    = getKPI('Average TAT');
  const denialKPI = getKPI('Denial Rate');
  const fraudKPI  = getKPI('Fraud Flag Rate');

  return (
    <Container fluid className="p-0">

      <WelcomeBanner emoji="👋" />

      <div className="px-4 pb-4">

        {/* ── Priority Action Bar — only when fraud alerts exist ── */}
        {!statsLoading && fraudAlerts > 0 && (
          <PriorityActionBar
            accentColor="danger"
            icon="bi-shield-exclamation"
            title={`${fraudAlerts} fraud alert${fraudAlerts > 1 ? 's' : ''} need investigation`}
            description="High-risk claims have been flagged and require your review."
            buttonLabel="View Fraud Cases"
            buttonIcon="bi-shield-exclamation"
            onButtonClick={() => navigate('/fraud')}
          />
        )}

        {/* ── Stat Cards ─────────────────────────────────────── */}
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <StatCard
              label="Claims Pending"
              value={statsLoading ? '…' : pendingClaims ?? '—'}
              icon="bi-file-earmark-text"
              borderColor="primary"
              footerIcon="bi-clock"
              footerText={statsLoading ? 'Loading…' :
                pendingClaims === 0
                  ? 'No pending claims'
                  : `${pendingClaims} awaiting review`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="My Tasks"
              value={statsLoading ? '…' : myTasks ?? '—'}
              icon="bi-list-check"
              borderColor="success"
              footerIcon="bi-clipboard-check"
              footerText={statsLoading ? 'Loading…' :
                myTasks === 0
                  ? 'All caught up!'
                  : `${myTasks} task${myTasks !== 1 ? 's' : ''} pending`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Fraud Alerts"
              value={statsLoading ? '…' : fraudAlerts ?? '—'}
              icon="bi-shield-exclamation"
              borderColor="warning"
              footerIcon="bi-shield"
              footerText={statsLoading ? 'Loading…' :
                fraudAlerts === 0
                  ? 'No active alerts'
                  : `${fraudAlerts} case${fraudAlerts !== 1 ? 's' : ''} open`}
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Appeals Open"
              value={statsLoading ? '…' : openAppeals ?? '—'}
              icon="bi-megaphone"
              borderColor="danger"
              footerIcon="bi-megaphone-fill"
              footerText={statsLoading ? 'Loading…' :
                openAppeals === 0
                  ? 'No open appeals'
                  : `${openAppeals} appeal${openAppeals !== 1 ? 's' : ''} open`}
            />
          </Col>
        </Row>

        {/* ── KPI Section ────────────────────────────────────── */}
        <SectionHeader title="My Performance Metrics" live />

        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' :
                adjKPI ? `${adjKPI.currentValue}` : '—'}
              unit="%"
              label="Auto-Adjudication"
              target="Target: ≥ 80%"
              status={kpisLoading ? 'Loading…' : getStatus(adjKPI)}
              color={kpisLoading ? '#9e9e9e' : getColor(adjKPI)}
              percent={kpisLoading ? 0 : getPercent(adjKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' :
                tatKPI ? `${tatKPI.currentValue}` : '—'}
              unit="hrs"
              label="Average TAT"
              target="Target: ≤ 4 hrs"
              status={kpisLoading ? 'Loading…' : getStatus(tatKPI, true)}
              color={kpisLoading ? '#9e9e9e' : getColor(tatKPI, true)}
              percent={kpisLoading ? 0 : getPercent(tatKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' :
                denialKPI ? `${denialKPI.currentValue}` : '—'}
              unit="%"
              label="Denial Rate"
              target="Target: < 10%"
              status={kpisLoading ? 'Loading…' : getStatus(denialKPI, true)}
              color={kpisLoading ? '#9e9e9e' : getColor(denialKPI, true)}
              percent={kpisLoading ? 0 : getPercent(denialKPI)}
            />
          </Col>
          <Col md={6} lg={3}>
            <CircularKPI
              value={kpisLoading ? '…' :
                fraudKPI ? `${fraudKPI.currentValue}` : '—'}
              unit="%"
              label="Fraud Flag Rate"
              target="Target: < 5%"
              status={kpisLoading ? 'Loading…' : getStatus(fraudKPI, true)}
              color={kpisLoading ? '#9e9e9e' : getColor(fraudKPI, true)}
              percent={kpisLoading ? 0 : getPercent(fraudKPI)}
            />
          </Col>
        </Row>

        {/* ── Claims Queue + Tasks ────────────────────────────── */}
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

        <h5 className="fw-semibold mb-3">Quick Access</h5>
        <QuickAccessGrid
          items={myMenu}
          onItemClick={(item) => navigate(item.path)}
        />

      </div>
    </Container>
  );
}
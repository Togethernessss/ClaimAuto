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

export default function StaffDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const myMenu = getMenuForRole(user.role)
    .filter((m) => m.key !== 'dashboard');

  const [kpis,        setKpis]        = useState([]);
  const [kpisLoading, setKpisLoading] = useState(true);

  useEffect(() => {
    getAllKPIs()
      .then((data) => setKpis(data))
      .catch(() => setKpis([]))
      .finally(() => setKpisLoading(false));
  }, []);

  function getKPI(name) {
    return kpis.find(k => k.name === name);
  }

  // ── Percent — raw value for auto-adj, inverted for others ────
  function getPercent(kpi, invertLower = false) {
    if (!kpi || kpi.currentValue === 0) return 0;
    if (invertLower) {
      return Math.min(Math.round(
        (kpi.target / kpi.currentValue) * 100), 100);
    }
    return Math.min(Math.round(kpi.currentValue), 100);
  }

  // ── Status — on target or below target ───────────────────────
  function getStatus(kpi, invertLower = false) {
    if (!kpi || kpi.currentValue === 0) return 'No data';
    if (invertLower) {
      return kpi.currentValue <= kpi.target
        ? 'On target' : 'Below target';
    }
    return kpi.currentValue >= kpi.target
      ? 'On target' : 'Below target';
  }

  // ── Color — blue if on target, red if below ──────────────────
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

      <WelcomeBanner emoji="👋" />

      <div className="px-4 pb-4">

        {false && (
          <PriorityActionBar
            accentColor="danger"
            icon="bi-exclamation-triangle-fill"
            title="No urgent actions right now"
            description="High-priority items will appear here."
            buttonLabel="View All Priority Tasks"
            buttonIcon="bi-list-stars"
            onButtonClick={() => navigate('/tasks')}
          />
        )}

        {/* ── Stat Cards ─────────────────────────────────────── */}
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
                getPercent(tatKPI, true)}
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
                getPercent(denialKPI, true)}
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
                getPercent(fraudKPI, true)}
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
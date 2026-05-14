import { Container, Row, Col, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';
import { useState, useEffect } from 'react';
import { getActivePolicies } from '../../services/policies/policyService';
import WelcomeBanner from '../../components/WelcomeBanner';
import StatCard from '../../components/dashboard/StatCard';
import PriorityActionBar from '../../components/dashboard/PriorityActionBar';
import DashboardPanel from '../../components/dashboard/DashboardPanel';
import EmptyStatePanel from '../../components/dashboard/EmptyStatePanel';
import QuickAccessGrid from '../../components/dashboard/QuickAccessGrid';

export default function HospitalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');

  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesError, setPoliciesError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getActivePolicies();
        setPolicies(data);
      } catch (err) {
        setPoliciesError('Could not load policies.');
      } finally {
        setPoliciesLoading(false);
      }
    }
    load();
  }, []);

  return (
    <Container fluid className="p-0">

      {/*Welcome Banner*/}
      <WelcomeBanner
        emoji="🏥"
        actions={[
          {
            label: 'Bulk Upload',
            icon: 'bi-upload',
            variant: 'outline-light',
            onClick: () => navigate('/claims/bulk-upload'),
          },
          {
            label: 'New Claim',
            icon: 'bi-plus-lg',
            variant: 'light',
            onClick: () => navigate('/claims/submit'),
          },
        ]}
      />

      <div className="px-4 pb-4">

        {/*Priority Action Bar*/}
        <PriorityActionBar
          accentColor="warning"
          icon="bi-cash-stack"
          title="No pending remittances"
          description="When the insurer sends a payment, it'll appear here for you to acknowledge."
          buttonLabel="View Remittance History"
          buttonIcon="bi-list-stars"
          onButtonClick={() => navigate('/remittance')}
        />

        {/*Stat Card*/}
        <Row className="g-3 mb-4">
          <Col md={6} lg={3}>
            <StatCard
              label="Claims This Month"
              value="—"
              icon="bi-file-earmark-text"
              borderColor="primary"
              footerIcon="bi-clock"
              footerText="No data yet"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Approved"
              value="—"
              icon="bi-check2-circle"
              borderColor="success"
              footerIcon="bi-check"
              footerText="Awaiting data"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Pending"
              value="—"
              icon="bi-hourglass-split"
              borderColor="warning"
              footerIcon="bi-hourglass"
              footerText="Awaiting data"
            />
          </Col>
          <Col md={6} lg={3}>
            <StatCard
              label="Denied"
              value="—"
              icon="bi-x-circle"
              borderColor="danger"
              footerIcon="bi-shield"
              footerText="No denied claims"
            />
          </Col>
        </Row>

        {/*Middle row: 3 panels */}
        <Row className="g-3 mb-4">

          {/* Active Policies — real data */}
          <Col lg={4}>
            <DashboardPanel
              icon="bi-shield-check"
              iconColor="primary"
              title="Active Policies"
              subtitle="Available for new claims"
            >
              {policiesLoading ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : policiesError ? (
                <div className="small text-danger">{policiesError}</div>
              ) : policies.length === 0 ? (
                <EmptyStatePanel
                  icon="bi-shield-slash"
                  title="No active policies"
                  description="When admins create policies you'll see them here."
                />
              ) : (
                <ul className="list-unstyled mb-0">
                  {policies.map((p) => (
                    <li key={p.policyID} className="py-2 border-bottom small">
                      <div className="fw-semibold">{p.planName}</div>
                      <div className="text-muted">{p.planCode}</div>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </Col>

          {/* Remittances to Acknowledge — empty state only */}
          <Col lg={4}>
            <DashboardPanel
              icon="bi-cash-stack"
              iconColor="success"
              title="Remittances to Acknowledge"
              subtitle="Confirm receipt to close the loop with insurer"
            >
              <EmptyStatePanel
                icon="bi-inbox"
                title="No pending remittances"
                description="When the insurer sends a payment, it will appear here."
              />
            </DashboardPanel>
          </Col>

          {/* Recent Submissions — empty state with CTA button */}
          <Col lg={4}>
            <DashboardPanel
              icon="bi-list-ul"
              iconColor="primary"
              title="Recent Submissions"
              subtitle="Your latest claims"
            >
              <div className="text-center py-5">
                <i className="bi bi-file-earmark-plus" style={{ fontSize: 48, color: '#dfe4ea' }}></i>
                <div className="fw-semibold text-muted mt-3">No claims submitted yet</div>
                <div className="small text-muted mt-1 mb-3">
                  Click "New Claim" to file your first claim.
                </div>
                <Button size="sm" variant="primary" onClick={() => navigate('/claims/submit')}>
                  <i className="bi bi-plus-lg me-1"></i> Submit a Claim
                </Button>
              </div>
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
    </Container>
  );
}
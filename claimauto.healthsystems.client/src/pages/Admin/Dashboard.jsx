import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../security/AuthContext';
import { getMenuForRole } from '../../security/permissions';

// what whole code doing below is creating a dashboard page for the user after they log in. It uses React Bootstrap for styling and layout. The dashboard welcomes the user by name and shows their role, along with quick access cards for the modules they have permission to access based on their role. Each card is clickable and navigates the user to the corresponding module page when clicked.
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const myMenu = getMenuForRole(user.role).filter((m) => m.key !== 'dashboard');

  return (
    <Container fluid>
      {/* Welcome banner */}
      <div
        className="text-white p-4 p-md-5 rounded-3 mb-4 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <h2 className="fw-bold mb-2">Welcome back, {user?.name}! 👋</h2>
        <p className="mb-0 opacity-75">
          You're logged in as <strong>{user?.role}</strong>. You have access to{' '}
          <strong>{myMenu.length}</strong> module{myMenu.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Role-specific quick-action cards */}
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